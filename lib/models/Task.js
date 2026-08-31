const mongoose = require('mongoose');

const SubtaskSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  completed: { type: Boolean, default: false }
}, { _id: false });

const TaskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['todo', 'in_progress', 'review', 'blocked', 'completed'], 
    default: 'todo',
    index: true 
  },
  priority: { 
    type: String, 
    enum: ['urgent', 'high', 'medium', 'low'], 
    default: 'medium' 
  },
  assigned_to: { type: String, required: true, index: true },
  created_by: { type: String, default: 'usr_shyamsundar' },
  due_date: { type: String },
  tags: { type: [String], default: [] },
  subtasks: { type: [SubtaskSchema], default: [] },
  estimated_hours: { type: Number, default: 2 },
  logged_hours: { type: Number, default: 0 },
  completed_at: { type: Date, default: null }
}, {
  timestamps: true
});

module.exports = mongoose.models.Task || mongoose.model('Task', TaskSchema);
