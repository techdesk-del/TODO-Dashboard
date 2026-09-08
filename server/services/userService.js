const { dbHelpers } = require('../../lib/db');

const userService = {
  getUsers: () => dbHelpers.getUsers(),
  getUserById: (id) => dbHelpers.getUserById(id),
  verifyPin: (userId, pin, ip) => dbHelpers.verifyPin(userId, pin, ip),
  syncOnlinePresence: (activeUserIds) => dbHelpers.syncOnlinePresence(activeUserIds),
  logoutUser: (userId) => dbHelpers.logoutUser(userId),
  updateHeartbeat: (userId) => dbHelpers.updateHeartbeat(userId)
};

module.exports = { userService };
