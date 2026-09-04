import { dbHelpers } from '../../../lib/db';

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const task = await dbHelpers.getTaskById(id);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      return res.status(200).json(task);
    }

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const { action, reading_log, remark, updates, user } = req.body || {};

      if (action === 'add_remark' || remark) {
        const remarkData = remark || req.body;
        const updatedTask = await dbHelpers.addRemark(id, remarkData, user);
        if (!updatedTask) return res.status(404).json({ error: 'Task not found or remark empty' });
        return res.status(200).json({ success: true, task: updatedTask });
      }

      if (action === 'delete_remark') {
        const { remarkId } = req.body || {};
        const updatedTask = await dbHelpers.deleteRemark(id, remarkId, user);
        if (!updatedTask) return res.status(404).json({ error: 'Task or remark not found' });
        return res.status(200).json({ success: true, task: updatedTask });
      }

      if (action === 'log_daily_reading' || reading_log) {
        const logData = reading_log || req.body;
        const updatedTask = await dbHelpers.logDailyReading(id, logData, user);
        if (!updatedTask) return res.status(404).json({ error: 'Task not found' });
        return res.status(200).json({ success: true, task: updatedTask });
      }

      const updatedTask = await dbHelpers.updateTask(id, updates || {});
      if (!updatedTask) return res.status(404).json({ error: 'Task not found' });

      let actionDesc = `Updated task "${updatedTask.title}"`;
      if (updates?.status) {
        actionDesc = `Moved "${updatedTask.title}" to ${updates.status.toUpperCase()}`;
      }

      await dbHelpers.logActivity(
        user?.id || 'usr_unknown',
        user?.name || 'Team Member',
        updates?.status === 'completed' ? 'task_complete' : 'task_update',
        actionDesc,
        id
      );

      return res.status(200).json({ success: true, task: updatedTask });
    }

    if (req.method === 'DELETE') {
      const { user } = req.body || {};
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

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Task detail API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
