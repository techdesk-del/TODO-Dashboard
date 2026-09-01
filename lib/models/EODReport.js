const mongoose = require('mongoose');

const EODReportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  user_id: { type: String, required: true, index: true },
  user_name: { type: String, required: true },
  user_role: { type: String, default: 'member' },
  department: { type: String, default: 'Engineering' },
  report_date: { type: String, required: true, index: true },
  completed_tasks: { type: Array, default: [] },
  pending_tasks: { type: Array, default: [] },
  blockers: { type: String, default: 'None' },
  tomorrow_plan: { type: String, default: '' },
  day_rating: { type: Number, default: 5 },
  hours_worked: { type: Number, default: 8.0 },
  submitted_at: { type: Date, default: Date.now }
}, {
  timestamps: true
});

EODReportSchema.index({ report_date: -1, user_id: 1 });

module.exports = mongoose.models.EODReport || mongoose.model('EODReport', EODReportSchema);
