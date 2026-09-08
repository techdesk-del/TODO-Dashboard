const { dbHelpers } = require('../../lib/db');

const taskService = {
  getTasks: (query) => dbHelpers.getTasks(query),
  getTaskById: (id) => dbHelpers.getTaskById(id),
  createTask: (taskData) => dbHelpers.createTask(taskData),
  updateTask: (id, updates) => dbHelpers.updateTask(id, updates),
  deleteTask: (id) => dbHelpers.deleteTask(id),
  addRemark: (taskId, remark, user) => dbHelpers.addRemark(taskId, remark, user),
  deleteRemark: (taskId, remarkId, user) => dbHelpers.deleteRemark(taskId, remarkId, user),
  logDailyReading: (taskId, logData, user) => dbHelpers.logDailyReading(taskId, logData, user)
};

module.exports = { taskService };
