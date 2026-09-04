const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const zlib = require('zlib');
const { dbHelpers } = require('./lib/db');

// Global Enterprise Process Crash Guards
process.on('uncaughtException', (err) => {
  console.error('🛡️ [SERVER CRASH GUARD] Uncaught Exception caught safely:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🛡️ [SERVER CRASH GUARD] Unhandled Rejection caught safely:', reason);
});

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Connect to MongoDB
  await dbHelpers.connect();

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname, query } = parsedUrl;

      // Baseline Enterprise Security Headers on all HTTP responses
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

      // High-Performance Stream Gzip Compressor for JSON Responses
      const sendJsonResponse = (statusCode, data) => {
        const payloadStr = JSON.stringify(data);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.statusCode = statusCode;

        const acceptEncoding = req.headers['accept-encoding'] || '';
        if (acceptEncoding.includes('gzip') && payloadStr.length > 1024) {
          try {
            const compressed = zlib.gzipSync(Buffer.from(payloadStr));
            res.setHeader('Content-Encoding', 'gzip');
            res.setHeader('Vary', 'Accept-Encoding');
            res.end(compressed);
            return;
          } catch (e) {}
        }
        res.end(payloadStr);
      };

      // Protected JSON Body Parser with 1MB Payload DOS Shield
      const parseBody = () => new Promise((resolve) => {
        let body = '';
        let totalBytes = 0;
        const MAX_BYTES = 1024 * 1024; // 1 MB limit

        req.on('data', chunk => {
          totalBytes += chunk.length;
          if (totalBytes > MAX_BYTES) {
            req.destroy();
            res.statusCode = 413;
            res.end(JSON.stringify({ error: 'Payload exceeds 1MB limit' }));
            return;
          }
          body += chunk;
        });

        req.on('end', () => {
          try {
            resolve(JSON.parse(body || '{}'));
          } catch (e) {
            resolve({});
          }
        });
      });

      // Auth: Login Endpoint with Sliding-Window Rate Limiting
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
        const { userId, pin } = await parseBody();
        const result = await dbHelpers.verifyPin(userId, pin, clientIp);
        if (result.success) {
          sendJsonResponse(200, result);
        } else if (result.rateLimited) {
          res.setHeader('Retry-After', String(result.remainingSec || 60));
          sendJsonResponse(429, result);
        } else {
          sendJsonResponse(401, result);
        }
        return;
      }

      // Direct High-Speed Gzip-Compressed REST endpoints
      if (pathname === '/api/users' && req.method === 'GET') {
        const users = await dbHelpers.getUsers();
        sendJsonResponse(200, users);
        return;
      }
      if (pathname === '/api/tasks' && req.method === 'GET') {
        const tasks = await dbHelpers.getTasks(query);
        sendJsonResponse(200, tasks);
        return;
      }
      if (pathname === '/api/overview' && req.method === 'GET') {
        const overview = await dbHelpers.getCompanyOverview();
        sendJsonResponse(200, overview);
        return;
      }
      if (pathname === '/api/eod-reports' && req.method === 'GET') {
        const reports = await dbHelpers.getEodReports(query);
        sendJsonResponse(200, reports);
        return;
      }
      if (pathname === '/api/activity' && req.method === 'GET') {
        const logs = await dbHelpers.getActivityLogs();
        sendJsonResponse(200, logs);
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Attach Socket.IO with Concurrency Hardening
  const io = new Server(server, {
    pingTimeout: 20000,
    pingInterval: 10000,
    maxHttpBufferSize: 1e6,
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Track connected sockets: socket.id -> userId
  const socketUserMap = new Map();
  let presenceDebounceTimer = null;

  async function broadcastPresence() {
    try {
      const activeUserIds = Array.from(new Set(Array.from(socketUserMap.values()).filter(Boolean)));
      const updatedUsers = await dbHelpers.syncOnlinePresence(activeUserIds);
      const overview = await dbHelpers.getCompanyOverview();
      const activityLogs = await dbHelpers.getActivityLogs(25);

      io.emit('presence:updated', {
        users: updatedUsers,
        activeUserIds,
        overview,
        activityLogs
      });
    } catch (e) {
      console.error('Error broadcasting presence:', e);
    }
  }

  function queueBroadcastPresence() {
    if (presenceDebounceTimer) return;
    presenceDebounceTimer = setTimeout(async () => {
      presenceDebounceTimer = null;
      await broadcastPresence();
    }, 300);
  }

  io.on('connection', async (socket) => {
    // Send initial snapshot on connect
    try {
      const users = await dbHelpers.getUsers();
      const tasks = await dbHelpers.getTasks();
      const overview = await dbHelpers.getCompanyOverview();
      const activityLogs = await dbHelpers.getActivityLogs(25);
      const eodReports = await dbHelpers.getEodReports();

      socket.emit('sync:initial', {
        users,
        tasks,
        overview,
        activityLogs,
        eodReports
      });
    } catch (e) {
      console.error('Socket initial sync error:', e);
    }

    // Handle user authentication/presence announce
    socket.on('user:join', async (userData) => {
      if (!userData || !userData.id) return;
      socketUserMap.set(socket.id, userData.id);
      queueBroadcastPresence();
    });

    // Handle user logout
    socket.on('user:logout', async (userId) => {
      socketUserMap.delete(socket.id);
      queueBroadcastPresence();
    });

    // Handle heartbeat
    socket.on('user:ping', async (userId) => {
      if (userId) {
        socketUserMap.set(socket.id, userId);
        queueBroadcastPresence();
      }
    });

    // Create Task
    socket.on('task:create', async (taskData, callback) => {
      try {
        const createdTask = await dbHelpers.createTask(taskData);
        await dbHelpers.logActivity(
          taskData.created_by || 'usr_shyamsundar',
          taskData.creator_name || 'Team Member',
          'task_create',
          `Created "${createdTask.title}" assigned to ${createdTask.assignee_name}`,
          createdTask.id
        );

        const tasks = await dbHelpers.getTasks();
        const overview = await dbHelpers.getCompanyOverview();
        const activityLogs = await dbHelpers.getActivityLogs(25);

        const payload = {
          task: createdTask,
          tasks,
          overview,
          activityLogs
        };

        io.emit('task:created', payload);

        if (typeof callback === 'function') {
          callback({ success: true, task: createdTask });
        }
      } catch (err) {
        console.error('Error creating task:', err);
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // Update Task
    socket.on('task:update', async ({ id, updates, user }, callback) => {
      try {
        const updatedTask = await dbHelpers.updateTask(id, updates);
        if (!updatedTask) {
          if (typeof callback === 'function') callback({ success: false, error: 'Task not found' });
          return;
        }

        let actionDesc = `Updated task "${updatedTask.title}"`;
        if (updates.status) {
          actionDesc = `Moved "${updatedTask.title}" to ${updates.status.toUpperCase()}`;
        }

        await dbHelpers.logActivity(
          user?.id || 'usr_unknown',
          user?.name || 'Team Member',
          updates.status === 'completed' ? 'task_complete' : 'task_update',
          actionDesc,
          id
        );

        const tasks = await dbHelpers.getTasks();
        const overview = await dbHelpers.getCompanyOverview();
        const activityLogs = await dbHelpers.getActivityLogs(25);

        const payload = {
          task: updatedTask,
          tasks,
          overview,
          activityLogs
        };

        io.emit('task:updated', payload);

        if (typeof callback === 'function') {
          callback({ success: true, task: updatedTask });
        }
      } catch (err) {
        console.error('Error updating task:', err);
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // Add Remark to Task
    socket.on('task:add_remark', async ({ taskId, remark, user }, callback) => {
      try {
        const updatedTask = await dbHelpers.addRemark(taskId, remark, user);
        if (!updatedTask) {
          if (typeof callback === 'function') callback({ success: false, error: 'Failed to add remark' });
          return;
        }

        const tasks = await dbHelpers.getTasks();
        const overview = await dbHelpers.getCompanyOverview();
        const activityLogs = await dbHelpers.getActivityLogs(25);

        const payload = {
          task: updatedTask,
          tasks,
          overview,
          activityLogs,
          newRemark: updatedTask.remarks?.[0] || null
        };

        io.emit('task:updated', payload);
        io.emit('task:remark_added', { taskId, task: updatedTask, remark: updatedTask.remarks?.[0] });

        if (typeof callback === 'function') {
          callback({ success: true, task: updatedTask });
        }
      } catch (err) {
        console.error('Error adding remark:', err);
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // Delete Remark from Task
    socket.on('task:delete_remark', async ({ taskId, remarkId, user }, callback) => {
      try {
        const updatedTask = await dbHelpers.deleteRemark(taskId, remarkId, user);
        if (!updatedTask) {
          if (typeof callback === 'function') callback({ success: false, error: 'Failed to delete remark' });
          return;
        }

        const tasks = await dbHelpers.getTasks();
        const overview = await dbHelpers.getCompanyOverview();
        const activityLogs = await dbHelpers.getActivityLogs(25);

        const payload = {
          task: updatedTask,
          tasks,
          overview,
          activityLogs,
          deletedRemarkId: remarkId
        };

        io.emit('task:updated', payload);
        io.emit('task:remark_deleted', { taskId, remarkId, task: updatedTask });

        if (typeof callback === 'function') {
          callback({ success: true, task: updatedTask });
        }
      } catch (err) {
        console.error('Error deleting remark:', err);
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // Log Daily Reading Check-in
    socket.on('task:log_reading', async ({ taskId, logData, user }, callback) => {
      try {
        const updatedTask = await dbHelpers.logDailyReading(taskId, logData, user);
        const tasks = await dbHelpers.getTasks();
        const overview = await dbHelpers.getCompanyOverview();
        const activityLogs = await dbHelpers.getActivityLogs(25);

        const payload = {
          task: updatedTask,
          tasks,
          overview,
          activityLogs
        };

        io.emit('task:updated', payload);

        if (typeof callback === 'function') {
          callback({ success: true, task: updatedTask });
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // Delete Task
    socket.on('task:delete', async ({ id, user }, callback) => {
      try {
        const task = await dbHelpers.getTaskById(id);
        const taskTitle = task ? task.title : id;
        await dbHelpers.deleteTask(id);

        await dbHelpers.logActivity(
          user?.id || 'usr_unknown',
          user?.name || 'Team Member',
          'task_delete',
          `Deleted task "${taskTitle}"`,
          id
        );

        const tasks = await dbHelpers.getTasks();
        const overview = await dbHelpers.getCompanyOverview();
        const activityLogs = await dbHelpers.getActivityLogs(25);

        const payload = {
          deletedId: id,
          tasks,
          overview,
          activityLogs
        };

        io.emit('task:deleted', payload);

        if (typeof callback === 'function') {
          callback({ success: true });
        }
      } catch (err) {
        console.error('Error deleting task:', err);
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // EOD Submit
    socket.on('eod:submit', async (reportData, callback) => {
      try {
        const eodReport = await dbHelpers.createEodReport(reportData);
        
        const pendingCount = (reportData.pending_tasks || []).length;
        const completedCount = (reportData.completed_tasks || []).length;

        await dbHelpers.logActivity(
          reportData.user_id,
          reportData.user_name,
          'eod_submit',
          `Submitted EOD Checkout: ${completedCount} completed, ${pendingCount} pending task(s)`
        );

        const eodReports = await dbHelpers.getEodReports();
        const users = await dbHelpers.getUsers();
        const overview = await dbHelpers.getCompanyOverview();
        const activityLogs = await dbHelpers.getActivityLogs(25);

        const payload = {
          report: eodReport,
          eodReports,
          users,
          overview,
          activityLogs
        };

        io.emit('eod:submitted', payload);

        if (typeof callback === 'function') {
          callback({ success: true, report: eodReport });
        }
      } catch (err) {
        console.error('Error submitting EOD:', err);
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      socketUserMap.delete(socket.id);
      await broadcastPresence();
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> 🚀 UrbanGaon Team Dashboard running on http://${hostname}:${port}`);
    console.log(`> 🍃 MongoDB Layer & Real-Time Socket.IO Hub is Active`);
  });
});
