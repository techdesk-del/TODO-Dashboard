const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  avatar: { type: String, default: '??' },
  color: { type: String, default: '#2563eb' },
  role: { type: String, enum: ['ceo', 'admin', 'member'], default: 'member' },
  pin: { type: String, default: '1234' },
  status: { type: String, enum: ['online', 'offline', 'logged_out'], default: 'offline' },
  last_active: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
