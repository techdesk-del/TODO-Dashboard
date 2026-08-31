import { dbHelpers } from '../../lib/db';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const overview = await dbHelpers.getCompanyOverview();
      return res.status(200).json(overview);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Overview API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
