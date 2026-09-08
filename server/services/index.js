const { userService } = require('./userService');
const { taskService } = require('./taskService');
const { eodService } = require('./eodService');
const { analyticsService } = require('./analyticsService');
const { activityService } = require('./activityService');

module.exports = {
  userService,
  taskService,
  eodService,
  analyticsService,
  activityService
};
