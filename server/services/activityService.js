const { dbHelpers } = require('../../lib/db');

const activityService = {
  getActivityLogs: (limit) => dbHelpers.getActivityLogs(limit),
  logActivity: (userId, userName, action, details, taskId) =>
    dbHelpers.logActivity(userId, userName, action, details, taskId)
};

module.exports = { activityService };
