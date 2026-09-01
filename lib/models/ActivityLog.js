const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
  action_type: { type: String, required: true },
  description: { type: String, required: true },
  task_id: { type: String, default: null },
  created_at: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true
});

ActivityLogSchema.index({ created_at: -1 });

module.exports = mongoose.models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema);
