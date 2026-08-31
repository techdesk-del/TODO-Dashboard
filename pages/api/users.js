import { dbHelpers } from '../../lib/db';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const users = await dbHelpers.getUsers();
      return res.status(200).json(users);
    }

    if (req.method === 'POST') {
      const { activeUserIds } = req.body || {};
      const users = await dbHelpers.syncOnlinePresence(activeUserIds || []);
      return res.status(200).json({ success: true, users });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
