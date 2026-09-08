const { dbHelpers } = require('../../../lib/db');

/**
 * Register EOD & Daily Reading Real-time Handlers
 */
function registerEodHandlers(io, socket) {
  // EOD Submit
  socket.on('eod:submit', async (reportData, callback) => {
    try {
      const now = new Date();
      const isAfter615 = now.getHours() > 18 || (now.getHours() === 18 && now.getMinutes() >= 15);
      const isCeo = reportData.user_id === 'usr_aakash' || (reportData.user_name && reportData.user_name.toLowerCase().includes('aakash'));

      if (!isAfter615 && !isCeo && !reportData.is_ceo_override) {
        const err = 'EOD Checkout is strictly restricted before 6:15 PM IST. Please submit your EOD report after shift conclusion at 6:15 PM.';
        if (typeof callback === 'function') {
          return callback({ success: false, error: err });
        }
        return;
      }

      const eodReport = await dbHelpers.createEodReport(reportData);

      const pendingCount = (reportData.pending_tasks || []).length;
      const completedCount = (reportData.completed_tasks || []).length;

      await dbHelpers.logActivity(
        reportData.user_id,
        reportData.user_name,
        'eod_submit',
        `Submitted EOD Checkout: ${completedCount} completed, ${pendingCount} pending task(s)`
      );

      const [eodReports, users, overview, activityLogs] = await Promise.all([
        dbHelpers.getEodReports(),
        dbHelpers.getUsers(),
        dbHelpers.getCompanyOverview(),
        dbHelpers.getActivityLogs(25)
      ]);

      const payload = {
        report: eodReport,
        eodReports,
        users,
        overview,
        activityLogs
      };

      io.emit('eod:submitted', payload);

      if (typeof callback === 'function') {
        callback({ success: true, report: eodReport });
      }
    } catch (err) {
      console.error('Error submitting EOD:', err);
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });
}

module.exports = { registerEodHandlers };
