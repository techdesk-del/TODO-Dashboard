const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { dbHelpers } = require('./lib/db');
const { applySecurityHeaders } = require('./server/middleware/security');
const { sendJsonResponse } = require('./server/middleware/compression');
const { parseBody } = require('./server/middleware/bodyParser');
const { initializeSocketServer } = require('./server/socket');

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
  // Connect to Database
  await dbHelpers.connect();

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname, query } = parsedUrl;

      // Apply Enterprise Security Headers
      applySecurityHeaders(res);

      // Fast-path Login with Instant Snapshot Bundling & Rate Limiting
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
        const { userId, pin } = await parseBody(req);
        const result = await dbHelpers.verifyPin(userId, pin, clientIp);

        if (result.success) {
          try {
            const [tasks, overview, users, eodReports] = await Promise.all([
              dbHelpers.getTasks(),
              dbHelpers.getCompanyOverview(),
              dbHelpers.getUsers(),
              dbHelpers.getEodReports()
            ]);
            sendJsonResponse(req, res, 200, {
              ...result,
              tasks,
              overview,
              users,
              eodReports
            });
          } catch (fetchErr) {
            sendJsonResponse(req, res, 200, result);
          }
        } else if (result.rateLimited) {
          res.setHeader('Retry-After', String(result.remainingSec || 60));
          sendJsonResponse(req, res, 429, result);
        } else {
          sendJsonResponse(req, res, 401, result);
        }
        return;
      }

      // Fast-path Gzip-Compressed REST API Endpoints
      if (pathname === '/api/users' && req.method === 'GET') {
        const users = await dbHelpers.getUsers();
        sendJsonResponse(req, res, 200, users);
        return;
      }
      if (pathname === '/api/tasks' && req.method === 'GET') {
        const tasks = await dbHelpers.getTasks(query);
        sendJsonResponse(req, res, 200, tasks);
        return;
      }
      if (pathname === '/api/overview' && req.method === 'GET') {
        const overview = await dbHelpers.getCompanyOverview();
        sendJsonResponse(req, res, 200, overview);
        return;
      }
      if (pathname === '/api/eod-reports' && req.method === 'GET') {
        const reports = await dbHelpers.getEodReports(query);
        sendJsonResponse(req, res, 200, reports);
        return;
      }
      if (pathname === '/api/activity' && req.method === 'GET') {
        const logs = await dbHelpers.getActivityLogs();
        sendJsonResponse(req, res, 200, logs);
        return;
      }

      // Delegate all other routes and static assets to Next.js
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Attach Real-Time Socket.IO Hub
  initializeSocketServer(server);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ [PORT CONFLICT] Port ${port} is already in use by another process.`);
      console.error(`👉 Run this PowerShell command to free up port ${port}:`);
      console.error(`   Get-NetTCPConnection -LocalPort ${port} -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }\n`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  server.listen(port, () => {
    console.log(`> 🚀 UrbanGaon Team Dashboard running on http://${hostname}:${port}`);
    console.log(`> 🍃 MongoDB Layer & Real-Time Socket.IO Hub is Active`);
  });
});
