import { dbHelpers } from '../../../lib/db';

export default async function handler(req, res) {
  try {
    let userId;
    if (req.method === 'POST') {
      if (typeof req.body === 'string') {
        try {
          const parsed = JSON.parse(req.body);
          userId = parsed.userId;
        } catch (e) {
          userId = req.body;
        }
      } else {
        userId = req.body?.userId;
      }
    }

    if (userId) {
      await dbHelpers.logoutUser(userId);
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Logout API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
