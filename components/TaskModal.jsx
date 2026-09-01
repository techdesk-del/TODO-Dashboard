import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Calendar, 
  User, 
  Save,
  BookOpen
} from 'lucide-react';
import { sounds } from '../lib/audio';

export default function TaskModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialTask = null, 
  defaultStatus = 'todo',
  users = [],
  currentUser 
}) {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  
  // Book Reading Stats State
  const [isBookReading, setIsBookReading] = useState(false);
  const [totalBooks, setTotalBooks] = useState(0);
  const [completedBooks, setCompletedBooks] = useState(0);
  const [inProgressBooks, setInProgressBooks] = useState(0);
  const [booksPresented, setBooksPresented] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalPagesRead, setTotalPagesRead] = useState(0);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || '');
      setAssignedTo(initialTask.assigned_to || (users[0]?.id || ''));
      setStatus(initialTask.status || 'todo');
      setPriority(initialTask.priority || 'medium');
      setDueDate(initialTask.due_date || new Date().toISOString().split('T')[0]);
      
      setIsBookReading(Boolean(initialTask.is_book_reading));
      setTotalBooks(initialTask.book_stats?.total_books ?? 0);
      setCompletedBooks(initialTask.book_stats?.completed ?? 0);
      setInProgressBooks(initialTask.book_stats?.in_progress ?? 0);
      setBooksPresented(initialTask.book_stats?.books_presented ?? 0);
      setTotalPages(initialTask.book_stats?.total_pages ?? 0);
      setTotalPagesRead(initialTask.book_stats?.total_pages_read ?? 0);
    } else {
      setTitle('');
      setDescription('');
      setAssignedTo(currentUser?.id || users[0]?.id || '');
      setStatus(defaultStatus || 'todo');
      setPriority('medium');
      setDueDate(new Date().toISOString().split('T')[0]);
      
      setIsBookReading(false);
      setTotalBooks(0);
      setCompletedBooks(0);
      setInProgressBooks(0);
      setBooksPresented(0);
      setTotalPages(0);
      setTotalPagesRead(0);
    }
  }, [initialTask, defaultStatus, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    sounds.playClick();
    onSave({
      id: initialTask?.id,
      title: title.trim(),
      description: description.trim(),
      assigned_to: assignedTo,
      created_by: initialTask?.created_by || currentUser?.id || 'usr_ceo',
      status,
      priority,
      due_date: dueDate,
      tags: initialTask?.tags || (isBookReading ? ['BookReading', 'Knowledge'] : ['Sprint']),
      subtasks: initialTask?.subtasks || [],
      estimated_hours: initialTask?.estimated_hours || 2,
      is_book_reading: isBookReading,
      book_stats: {
        total_books: Number(totalBooks) || 0,
        completed: Number(completedBooks) || 0,
        in_progress: Number(inProgressBooks) || 0,
        books_presented: Number(booksPresented) || 0,
        total_pages: Number(totalPages) || 0,
        total_pages_read: Number(totalPagesRead) || 0
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg my-6 bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 animate-slide-up">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {isBookReading && <BookOpen className="w-4 h-4 text-indigo-600" />}
              {initialTask ? (isBookReading ? 'Edit Book Reading' : 'Edit Task') : (isBookReading ? 'New Book Reading Tracker' : 'Create New Task')}
            </h3>
            <p className="text-xs text-slate-500">
              Changes sync in real time across all team member screens
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              {isBookReading ? 'Book Title' : 'Task Title'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={isBookReading ? "Enter book title (e.g. Atomic Habits, The Lean Startup...)" : "e.g. Deploy Redis cluster, Finalize landing page UX..."}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl clean-input font-medium"
            />
          </div>

          {/* Description / Book Author */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              {isBookReading ? 'Book Author / Creator' : 'Description / Notes (Optional)'}
            </label>
            {isBookReading ? (
              <input
                type="text"
                placeholder="e.g. James Clear, Morgan Housel, Peter Thiel..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl clean-input font-medium"
              />
            ) : (
              <textarea
                rows={2}
                placeholder="Provide specifications or instructions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl clean-input resize-none"
              />
            )}
          </div>

          {/* Assignee & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Assignee
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl clean-input cursor-pointer font-medium"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl clean-input cursor-pointer font-medium"
              >
                <option value="urgent">🚨 Urgent</option>
                <option value="high">⚡ High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Status & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl clean-input cursor-pointer font-medium"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Target Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl clean-input cursor-pointer"
              />
            </div>
          </div>

          {/* Book Reading Tracker Switch & 5-Column Metric Controls */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 mb-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isBookReading}
                  onChange={(e) => setIsBookReading(e.target.checked)}
                  className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  Book Reading & Learning Tracker Task
                </span>
              </label>
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                5 Team Columns
              </span>
            </div>

            {isBookReading && (
              <div className="p-3 bg-white border border-indigo-200 rounded-xl space-y-3 shadow-inner">
                <div className="flex items-center justify-between border-b border-indigo-50 pb-2">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-900">
                    Book Reading Metrics & Stats
                  </h4>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Updates live on team dashboard
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {/* 1. Total Books */}
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                      1. Total Books
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={totalBooks}
                      onChange={(e) => setTotalBooks(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg clean-input font-bold text-slate-800"
                    />
                  </div>

                  {/* 2. Completed */}
                  <div>
                    <label className="text-[10.5px] font-bold text-emerald-700 block mb-1">
                      2. Completed
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={completedBooks}
                      onChange={(e) => setCompletedBooks(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg clean-input font-bold text-emerald-800 bg-emerald-50/30 border-emerald-200"
                    />
                  </div>

                  {/* 3. In Progress */}
                  <div>
                    <label className="text-[10.5px] font-bold text-blue-700 block mb-1">
                      3. In Progress
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={inProgressBooks}
                      onChange={(e) => setInProgressBooks(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg clean-input font-bold text-blue-800 bg-blue-50/30 border-blue-200"
                    />
                  </div>

                  {/* 4. Books Presented */}
                  <div>
                    <label className="text-[10.5px] font-bold text-purple-700 block mb-1">
                      4. Books Presented
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={booksPresented}
                      onChange={(e) => setBooksPresented(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg clean-input font-bold text-purple-800 bg-purple-50/30 border-purple-200"
                    />
                  </div>

                  {/* 5. Total Pages */}
                  <div>
                    <label className="text-[10.5px] font-bold text-amber-700 block mb-1">
                      5. Total Pages
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={totalPages}
                      onChange={(e) => setTotalPages(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg clean-input font-bold text-amber-900 bg-amber-50/30 border-amber-200"
                    />
                  </div>

                  {/* 6. Total Pages Read */}
                  <div>
                    <label className="text-[10.5px] font-bold text-teal-700 block mb-1">
                      6. Total Pages Read
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={totalPagesRead}
                      onChange={(e) => setTotalPagesRead(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg clean-input font-bold text-teal-900 bg-teal-50/30 border-teal-200"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{initialTask ? 'Update Task' : 'Save Task'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
