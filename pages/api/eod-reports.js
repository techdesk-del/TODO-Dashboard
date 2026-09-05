import { dbHelpers } from '../../lib/db';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const reports = await dbHelpers.getEodReports(req.query);
      return res.status(200).json(reports);
    }

    if (req.method === 'POST') {
      const reportData = req.body || {};

      const now = new Date();
      const isAfter630 = now.getHours() > 18 || (now.getHours() === 18 && now.getMinutes() >= 30);
      const isCeo = reportData.user_id === 'usr_aakash' || (reportData.user_name && reportData.user_name.toLowerCase().includes('aakash'));

      if (!isAfter630 && !isCeo && !reportData.is_ceo_override) {
        return res.status(403).json({
          error: 'EOD Checkout is strictly restricted before 6:30 PM IST. Please submit your EOD report after shift conclusion at 6:30 PM.'
        });
      }

      const newReport = await dbHelpers.createEodReport(reportData);

      const pendingCount = (reportData.pending_tasks || []).length;
      const completedCount = (reportData.completed_tasks || []).length;

      await dbHelpers.logActivity(
        reportData.user_id,
        reportData.user_name,
        'eod_submit',
        `Submitted EOD Checkout: ${completedCount} completed, ${pendingCount} pending task(s)`
      );

      return res.status(201).json({ success: true, report: newReport });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('EOD Reports API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
