const { Server } = require('socket.io');
const { dbHelpers } = require('../../lib/db');
const { registerPresenceHandlers } = require('./handlers/presenceHandler');
const { registerTaskHandlers } = require('./handlers/taskHandler');
const { registerEodHandlers } = require('./handlers/eodHandler');

/**
 * Initialize and attach Socket.IO server to HTTP server
 */
function initializeSocketServer(httpServer) {
  const io = new Server(httpServer, {
    pingTimeout: 20000,
    pingInterval: 10000,
    maxHttpBufferSize: 1e6,
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', async (socket) => {
    // Send initial snapshot on connect
    try {
      const [users, tasks, overview, activityLogs, eodReports] = await Promise.all([
        dbHelpers.getUsers(),
        dbHelpers.getTasks(),
        dbHelpers.getCompanyOverview(),
        dbHelpers.getActivityLogs(25),
        dbHelpers.getEodReports()
      ]);

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

    // Register modular domain handlers
    registerPresenceHandlers(io, socket);
    registerTaskHandlers(io, socket);
    registerEodHandlers(io, socket);
  });

  return io;
}

module.exports = { initializeSocketServer };
