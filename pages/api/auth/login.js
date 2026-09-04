import { dbHelpers } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { userId, pin } = req.body || {};
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const result = await dbHelpers.verifyPin(userId, pin, clientIp);
    if (result.success) {
      return res.status(200).json(result);
    } else if (result.rateLimited) {
      res.setHeader('Retry-After', String(result.remainingSec || 60));
      return res.status(429).json(result);
    } else {
      return res.status(401).json(result);
    }
  } catch (error) {
    console.error('Login API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
