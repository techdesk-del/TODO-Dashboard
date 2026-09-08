const { dbHelpers } = require('../../../lib/db');

/**
 * Register Real-Time Task Event Handlers
 */
function registerTaskHandlers(io, socket) {
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

      const [tasks, overview, activityLogs] = await Promise.all([
        dbHelpers.getTasks(),
        dbHelpers.getCompanyOverview(),
        dbHelpers.getActivityLogs(25)
      ]);

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

      const [tasks, overview, activityLogs] = await Promise.all([
        dbHelpers.getTasks(),
        dbHelpers.getCompanyOverview(),
        dbHelpers.getActivityLogs(25)
      ]);

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

      const [tasks, overview, activityLogs] = await Promise.all([
        dbHelpers.getTasks(),
        dbHelpers.getCompanyOverview(),
        dbHelpers.getActivityLogs(25)
      ]);

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

      const [tasks, overview, activityLogs] = await Promise.all([
        dbHelpers.getTasks(),
        dbHelpers.getCompanyOverview(),
        dbHelpers.getActivityLogs(25)
      ]);

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
      const [tasks, overview, activityLogs] = await Promise.all([
        dbHelpers.getTasks(),
        dbHelpers.getCompanyOverview(),
        dbHelpers.getActivityLogs(25)
      ]);

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

      const [tasks, overview, activityLogs] = await Promise.all([
        dbHelpers.getTasks(),
        dbHelpers.getCompanyOverview(),
        dbHelpers.getActivityLogs(25)
      ]);

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
}

module.exports = { registerTaskHandlers };
