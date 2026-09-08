const { socketState } = require('../state');
const { dbHelpers } = require('../../../lib/db');

/**
 * Broadcast online presence updates to all clients
 */
async function broadcastPresence(io) {
  try {
    const activeUserIds = socketState.getActiveUserIds();
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

function queueBroadcastPresence(io) {
  socketState.debouncePresence(() => broadcastPresence(io), 300);
}

/**
 * Register Presence & Session lifecycle events
 */
function registerPresenceHandlers(io, socket) {
  // Handle user authentication/presence announcement
  socket.on('user:join', async (userData) => {
    if (!userData || !userData.id) return;
    socketState.set(socket.id, userData.id);
    queueBroadcastPresence(io);

    try {
      const [tasks, overview] = await Promise.all([
        dbHelpers.getTasks(),
        dbHelpers.getCompanyOverview()
      ]);
      socket.emit('sync:initial', { tasks, overview });
    } catch (e) {
      console.error('user:join sync error:', e);
    }
  });

  // Handle user logout
  socket.on('user:logout', async (userId) => {
    socketState.delete(socket.id);
    queueBroadcastPresence(io);
  });

  // Handle heartbeat ping
  socket.on('user:ping', async (userId) => {
    if (userId) {
      socketState.set(socket.id, userId);
      queueBroadcastPresence(io);
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    socketState.delete(socket.id);
    queueBroadcastPresence(io);
  });
}

module.exports = {
  broadcastPresence,
  queueBroadcastPresence,
  registerPresenceHandlers
};
