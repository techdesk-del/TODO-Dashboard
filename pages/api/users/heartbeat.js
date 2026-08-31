import { dbHelpers } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await dbHelpers.heartbeat(userId);
    return res.status(200).json({ success: true, timestamp: Date.now() });
  } catch (error) {
    console.error('Heartbeat API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
