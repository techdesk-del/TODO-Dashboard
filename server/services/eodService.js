const { dbHelpers } = require('../../lib/db');

const eodService = {
  getEodReports: (query) => dbHelpers.getEodReports(query),
  createEodReport: (reportData) => dbHelpers.createEodReport(reportData)
};

module.exports = { eodService };
