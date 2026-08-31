import { dbHelpers } from '../../../lib/db';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const tasks = await dbHelpers.getTasks(req.query);
      return res.status(200).json(tasks);
    }

    if (req.method === 'POST') {
      const taskData = req.body || {};
      const newTask = await dbHelpers.createTask(taskData);
      
      await dbHelpers.logActivity(
        taskData.created_by || 'usr_shyamsundar',
        taskData.creator_name || 'Team Member',
        'task_create',
        `Created "${newTask.title}" assigned to ${newTask.assignee_name}`,
        newTask.id
      );

      return res.status(201).json({ success: true, task: newTask });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Tasks API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
