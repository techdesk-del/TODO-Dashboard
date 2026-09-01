const mongoose = require('mongoose');

const SubtaskSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  completed: { type: Boolean, default: false }
}, { _id: false });

const DailyReadingLogSchema = new mongoose.Schema({
  id: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  pages_read: { type: Number, default: 0 },
  takeaways: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
}, { _id: false });

const BookItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  author: { type: String, default: '' },
  status: { type: String, enum: ['in_progress', 'completed', 'reading'], default: 'in_progress' },
  total_pages: { type: Number, default: 0 },
  pages_read: { type: Number, default: 0 },
  presented: { type: Boolean, default: false },
  notes: { type: String, default: '' }
}, { _id: false });

const BookStatsSchema = new mongoose.Schema({
  total_books: { type: Number, default: 0 },
  completed: { type: Number, default: 0 },
  in_progress: { type: Number, default: 0 },
  books_presented: { type: Number, default: 0 },
  total_pages: { type: Number, default: 0 },
  total_pages_read: { type: Number, default: 0 }
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
  completed_at: { type: Date, default: null },
  is_book_reading: { type: Boolean, default: false },
  book_stats: { 
    type: BookStatsSchema, 
    default: () => ({ total_books: 0, completed: 0, in_progress: 0, books_presented: 0, total_pages: 0, total_pages_read: 0 }) 
  },
  books_list: {
    type: [BookItemSchema],
    default: []
  },
  reading_logs: {
    type: [DailyReadingLogSchema],
    default: []
  }
}, {
  timestamps: true
});

TaskSchema.index({ assigned_to: 1, status: 1 });
TaskSchema.index({ status: 1, priority: 1 });
TaskSchema.index({ is_book_reading: 1, assigned_to: 1 });

module.exports = mongoose.models.Task || mongoose.model('Task', TaskSchema);
