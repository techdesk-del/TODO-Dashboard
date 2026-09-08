const { dbHelpers } = require('../../lib/db');

const analyticsService = {
  getCompanyOverview: () => dbHelpers.getCompanyOverview()
};

module.exports = { analyticsService };
