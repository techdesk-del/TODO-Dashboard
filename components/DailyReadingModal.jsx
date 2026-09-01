import React, { useState } from 'react';
import { X, BookOpen, Calendar, CheckCircle2, Flame, Sparkles, Clock, History } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../lib/audio';

export default function DailyReadingModal({
  isOpen,
  onClose,
  task,
  currentUser,
  onLogSaved
}) {
  if (!isOpen || !task) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const [logDate, setLogDate] = useState(todayStr);
  const [pagesReadToday, setPagesReadToday] = useState('');
  const [takeaways, setTakeaways] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('log'); // 'log' | 'history'

  const readingLogs = Array.isArray(task.reading_logs) ? task.reading_logs : [];
  const currentTotal = Number(task.book_stats?.total_pages_read) || 0;
  const bookTotalPages = Number(task.book_stats?.total_pages) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pages = Number(pagesReadToday);
    if (!pages || pages <= 0) return;

    setIsSubmitting(true);
    sounds.playComplete();

    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6']
      });

      if (onLogSaved) {
        await onLogSaved(task.id, {
          date: logDate,
          pages_read: pages,
          takeaways: takeaways.trim()
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to log daily reading:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md my-6 bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4 animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold shadow-2xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">
                Daily Reading Log
              </h3>
              <p className="text-[11px] text-slate-500 truncate max-w-[240px]" title={task.title}>
                {task.title || 'Book Reading'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100/80 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'log'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Log Today's Pages
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            History ({readingLogs.length})
          </button>
        </div>

        {/* Tab 1: Log Entry Form */}
        {activeTab === 'log' && (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {/* Quick Overview Pill */}
            <div className="p-3 bg-gradient-to-r from-indigo-50/70 via-blue-50/60 to-purple-50/50 border border-indigo-100 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Current Progress</span>
                <span className="text-xs font-black text-indigo-950 mt-0.5">
                  {currentTotal} {bookTotalPages ? `/ ${bookTotalPages}` : ''} pages read
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 bg-indigo-600 text-white rounded-lg shadow-2xs">
                {bookTotalPages > 0 ? `${Math.round((currentTotal / bookTotalPages) * 100)}% Done` : '🔥 Streak Active'}
              </span>
            </div>

            {/* Date Input */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Reading Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl clean-input font-medium"
                />
              </div>
            </div>

            {/* Pages Read Today Input */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Pages Read Today <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 15, 25, 40..."
                value={pagesReadToday}
                onChange={(e) => setPagesReadToday(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm font-black rounded-xl clean-input text-indigo-900 border-indigo-200 focus:border-indigo-500"
              />
              {/* Quick Increment Buttons */}
              <div className="flex gap-1.5 mt-1.5">
                {[10, 20, 30, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPagesReadToday(num.toString())}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
                  >
                    +{num} pages
                  </button>
                ))}
              </div>
            </div>

            {/* Notes / Takeaways */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Key Insights / Takeaways (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="What did you learn or find interesting today?..."
                value={takeaways}
                onChange={(e) => setTakeaways(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl clean-input resize-none font-medium"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !pagesReadToday}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : 'Save Daily Log'}</span>
              </button>
            </div>

          </form>
        )}

        {/* Tab 2: History View */}
        {activeTab === 'history' && (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {readingLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No daily logs recorded yet. Log your first reading today!
              </div>
            ) : (
              readingLogs.map((log, idx) => (
                <div 
                  key={log.id || idx}
                  className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col gap-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      {log.date}
                    </span>
                    <span className="font-black text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                      +{log.pages_read} pages
                    </span>
                  </div>
                  {log.takeaways && (
                    <p className="text-[11px] text-slate-600 bg-white p-1.5 rounded-lg border border-slate-100 italic">
                      "{log.takeaways}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
