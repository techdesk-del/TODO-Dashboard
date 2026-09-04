import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Calendar, 
  User, 
  Save,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { sounds } from '../lib/audio';

export default function TaskModal({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  initialTask = null, 
  defaultStatus = 'todo',
  users = [],
  currentUser 
}) {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [remarkText, setRemarkText] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  // Book Reading Stats State
  const [isBookReading, setIsBookReading] = useState(false);
  const [booksList, setBooksList] = useState([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [completedBooks, setCompletedBooks] = useState(0);
  const [inProgressBooks, setInProgressBooks] = useState(0);
  const [booksPresented, setBooksPresented] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalPagesRead, setTotalPagesRead] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || '');
      setAssignedTo(initialTask.assigned_to || (users[0]?.id || ''));
      setStatus(initialTask.status || 'todo');
      setPriority(initialTask.priority || 'medium');
      setStartDate(initialTask.start_date || today);
      setDueDate(initialTask.due_date || today);
      
      const isBook = Boolean(initialTask.is_book_reading);
      setIsBookReading(isBook);

      let initialBooks = Array.isArray(initialTask.books_list) && initialTask.books_list.length > 0 
        ? initialTask.books_list 
        : [];

      if (isBook && initialBooks.length === 0) {
        initialBooks = [{
          id: 'bk_' + Date.now().toString(36) + '1',
          title: initialTask.title !== '📖 Book Reading' ? initialTask.title : '',
          author: initialTask.description || '',
          status: 'in_progress',
          start_date: initialTask.start_date || today,
          target_date: initialTask.due_date || '',
          total_pages: Number(initialTask.book_stats?.total_pages) || 0,
          pages_read: Number(initialTask.book_stats?.total_pages_read) || 0,
          presented: Number(initialTask.book_stats?.books_presented) > 0,
          notes: ''
        }];
      }

      setBooksList(initialBooks);
      setTotalBooks(initialTask.book_stats?.total_books ?? (initialBooks.length || 0));
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
      setStartDate(today);
      setDueDate(today);
      
      setIsBookReading(false);
      setBooksList([]);
      setTotalBooks(0);
      setCompletedBooks(0);
      setInProgressBooks(0);
      setBooksPresented(0);
      setTotalPages(0);
      setTotalPagesRead(0);
    }
  }, [initialTask, defaultStatus, isOpen]);

  // Handle book item changes
  const handleAddBook = () => {
    sounds.playClick();
    const today = new Date().toISOString().split('T')[0];
    const newBook = {
      id: 'bk_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 3),
      title: '',
      author: '',
      status: 'in_progress',
      start_date: today,
      target_date: '',
      total_pages: 0,
      pages_read: 0,
      presented: false,
      notes: ''
    };
    const updated = [...booksList, newBook];
    setBooksList(updated);
    recalculateBookStats(updated);
  };

  const handleUpdateBook = (index, field, value) => {
    const updated = [...booksList];
    updated[index] = { ...updated[index], [field]: value };
    setBooksList(updated);
    recalculateBookStats(updated);

    // Auto sync primary title & author with first in-progress book
    const active = updated.find(b => b.status === 'in_progress') || updated[0];
    if (active && active.title) {
      setTitle(active.title);
      setDescription(active.author || '');
    }
  };

  const handleRemoveBook = (index) => {
    sounds.playClick();
    const updated = booksList.filter((_, i) => i !== index);
    setBooksList(updated);
    recalculateBookStats(updated);
  };

  const recalculateBookStats = (list) => {
    const total = list.length;
    const completed = list.filter(b => b.status === 'completed').length;
    const inProg = list.filter(b => b.status === 'in_progress' || b.status !== 'completed').length;
    const pres = list.filter(b => b.presented || b.status === 'presented').length;
    const pages = list.reduce((sum, b) => sum + (Number(b.total_pages) || 0), 0);
    const pagesR = list.reduce((sum, b) => sum + (Number(b.pages_read) || 0), 0);

    setTotalBooks(total);
    setCompletedBooks(completed);
    setInProgressBooks(inProg);
    setBooksPresented(pres);
    setTotalPages(pages);
    setTotalPagesRead(pagesR);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() && !isBookReading) return;

    sounds.playClick();
    const activeBook = booksList.find(b => b.status === 'reading') || booksList[0];
    const finalTitle = isBookReading 
      ? (activeBook?.title || title.trim() || '📖 Book Reading')
      : title.trim();
    const finalDesc = isBookReading 
      ? (activeBook?.author || description.trim() || '')
      : description.trim();

    let updatedRemarks = Array.isArray(initialTask?.remarks) ? [...initialTask.remarks] : [];
    if (initialTask && remarkText.trim()) {
      updatedRemarks.unshift({
        id: 'rem_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
        text: remarkText.trim(),
        author_id: currentUser?.id || 'usr_unknown',
        author_name: currentUser?.name || 'Team Member',
        author_avatar: currentUser?.avatar || '??',
        author_color: currentUser?.color || '#6366f1',
        created_at: new Date()
      });
    }

    onSave({
      id: initialTask?.id,
      title: finalTitle,
      description: finalDesc,
      assigned_to: assignedTo,
      created_by: initialTask?.created_by || currentUser?.id || 'usr_ceo',
      status,
      priority,
      start_date: startDate,
      due_date: dueDate,
      tags: initialTask?.tags || (isBookReading ? ['BookReading', 'Knowledge'] : ['Sprint']),
      subtasks: initialTask?.subtasks || [],
      estimated_hours: initialTask?.estimated_hours || 2,
      is_book_reading: isBookReading,
      books_list: booksList,
      initial_remark: !initialTask && remarkText.trim() ? remarkText.trim() : undefined,
      remarks: initialTask ? updatedRemarks : undefined,
      latest_remark: remarkText.trim() || initialTask?.latest_remark || '',
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
          
          {/* If NOT book reading, render normal Task Title & Description */}
          {!isBookReading ? (
            <>
              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deploy Redis cluster, Finalize landing page UX..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl clean-input font-medium"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide specifications or instructions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl clean-input resize-none"
                />
              </div>

              {/* Remarks & Task Information */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{initialTask ? 'Task Remarks & Information Log' : 'Initial Remark / Status Note (Optional)'}</span>
                  </label>
                  {initialTask?.remarks?.length > 0 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-indigo-100 text-indigo-800">
                      {initialTask.remarks.length} remark{initialTask.remarks.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* History of existing remarks if editing */}
                {initialTask?.remarks?.length > 0 && (
                  <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                    {initialTask.remarks.map((rem, rIdx) => (
                      <div key={rem.id || rIdx} className="p-2 bg-white rounded-lg border border-slate-200/90 text-[10.5px] space-y-0.5 shadow-2xs">
                        <div className="flex items-center justify-between text-[9.5px] text-slate-500 font-semibold">
                          <span className="text-indigo-700 font-bold">{rem.author_name}</span>
                          <span>{new Date(rem.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <p className="text-slate-800 leading-snug">{rem.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  placeholder={initialTask ? "Enter a new remark or status update..." : "e.g. Waiting on client approval, API PR link..."}
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg clean-input font-medium bg-white"
                />
              </div>
            </>
          ) : (
            /* Multi-Book Library Section (Book 1, Book 2, Book 3...) */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    My Books Library ({booksList.length} {booksList.length === 1 ? 'Book' : 'Books'})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Add Book 1, Book 2, etc. Each book has its own author, status, and pages.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddBook}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Book</span>
                </button>
              </div>

              {/* List of Individual Book Cards */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {booksList.map((book, idx) => {
                  const bookPages = Number(book.total_pages) || 0;
                  const bookRead = Number(book.pages_read) || 0;
                  const bookPct = bookPages > 0 ? Math.min(100, Math.round((bookRead / bookPages) * 100)) : 0;

                  return (
                    <div 
                      key={book.id || idx}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5 shadow-2xs relative group"
                    >
                      {/* Book Card Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 flex items-center gap-1">
                          📖 Book #{idx + 1}
                        </span>

                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(book.presented)}
                              onChange={(e) => handleUpdateBook(idx, 'presented', e.target.checked)}
                              className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>Presented (🎤)</span>
                          </label>

                          {booksList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBook(idx)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Remove this book"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title & Author Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Book Title <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Atomic Habits, Lean Startup..."
                            value={book.title || ''}
                            onChange={(e) => handleUpdateBook(idx, 'title', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg clean-input font-bold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Author / Creator
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. James Clear, Eric Ries..."
                            value={book.author || ''}
                            onChange={(e) => handleUpdateBook(idx, 'author', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg clean-input font-medium text-slate-700"
                          />
                        </div>
                      </div>

                      {/* Status, Pages & Progress */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Reading Status
                          </label>
                          <select
                            value={book.status === 'completed' ? 'completed' : 'in_progress'}
                            onChange={(e) => handleUpdateBook(idx, 'status', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg clean-input font-bold cursor-pointer"
                          >
                            <option value="in_progress">📖 In Progress</option>
                            <option value="completed">✅ Completed</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Total Pages
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="320"
                            value={book.total_pages ?? ''}
                            onChange={(e) => handleUpdateBook(idx, 'total_pages', Number(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg clean-input font-bold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Pages Read
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="180"
                            value={book.pages_read ?? ''}
                            onChange={(e) => handleUpdateBook(idx, 'pages_read', Number(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg clean-input font-bold text-indigo-700 bg-indigo-50/40"
                          />
                        </div>
                      </div>

                      {/* Book Reading Dates */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={book.start_date || ''}
                            onChange={(e) => handleUpdateBook(idx, 'start_date', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg clean-input font-medium cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Target End Date
                          </label>
                          <input
                            type="date"
                            value={book.target_date || ''}
                            onChange={(e) => handleUpdateBook(idx, 'target_date', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg clean-input font-medium cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Mini Book Progress Bar */}
                      {bookPages > 0 && (
                        <div className="pt-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-1">
                            <span>Book Progress: {bookRead} / {bookPages} pages</span>
                            <span className="font-bold text-indigo-600">{bookPct}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${bookPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Live Cumulative Summary Banner */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-900">
                    ⚡ Total Reading Stats (Auto-Calculated)
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700">
                    {totalBooks} Books • {totalPagesRead}/{totalPages} Total Pages
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center text-[10px]">
                  <div className="p-1.5 bg-white rounded-lg border border-indigo-100 font-bold text-slate-800">
                    <span className="block text-[9px] text-slate-400">Total Books</span>
                    {totalBooks}
                  </div>
                  <div className="p-1.5 bg-white rounded-lg border border-emerald-100 font-bold text-emerald-700">
                    <span className="block text-[9px] text-emerald-500">Completed</span>
                    {completedBooks}
                  </div>
                  <div className="p-1.5 bg-white rounded-lg border border-blue-100 font-bold text-blue-700">
                    <span className="block text-[9px] text-blue-500">In Progress</span>
                    {inProgressBooks}
                  </div>
                  <div className="p-1.5 bg-white rounded-lg border border-purple-100 font-bold text-purple-700">
                    <span className="block text-[9px] text-purple-500">Presented</span>
                    {booksPresented}
                  </div>
                  <div className="p-1.5 bg-white rounded-lg border border-amber-100 font-bold text-amber-800">
                    <span className="block text-[9px] text-amber-500">Total Pages</span>
                    {totalPages}
                  </div>
                  <div className="p-1.5 bg-white rounded-lg border border-teal-100 font-bold text-teal-800">
                    <span className="block text-[9px] text-teal-500">Pages Read</span>
                    {totalPagesRead}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assignee, Priority, Status & Dates (Only for regular tasks - books have individual controls) */}
          {!isBookReading && (
            <>
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

              {/* Status, Start Date & Target End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl clean-input cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Target End Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl clean-input cursor-pointer"
                  />
                </div>
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5">
            {initialTask?.id && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete "${initialTask.title || 'this task'}"?`)) {
                    sounds.playTrash();
                    onDelete(initialTask.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
                title="Delete this task completely"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Delete Task</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{initialTask?.id ? 'Save Changes' : 'Create Task'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
