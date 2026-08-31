import { dbHelpers } from '../../lib/db';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const limit = parseInt(req.query.limit || '30', 10);
      const logs = await dbHelpers.getActivityLogs(limit);
      return res.status(200).json(logs);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Activity logs API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
