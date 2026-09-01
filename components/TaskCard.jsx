import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Trash2,
  Edit2,
  CheckSquare,
  Clock,
  GripVertical,
  Flame,
  Calendar,
  ChevronDown,
  ChevronUp,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../lib/audio';

export default function TaskCard({ 
  task, 
  onStatusChange, 
  onEditTask, 
  onDeleteTask 
}) {
  const [showSubtasks, setShowSubtasks] = useState(false);
  const isCompleted = task.status === 'completed';
  const isBlocked = task.status === 'blocked';

  // Deadline & Overdue Intelligence Calculation
  const todayStr = new Date().toISOString().split('T')[0];
  let deadlineInfo = null;

  if (task.due_date) {
    const today = new Date(todayStr).getTime();
    const due = new Date(task.due_date).getTime();
    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0 && !isCompleted) {
      deadlineInfo = {
        type: 'overdue',
        text: `Overdue by ${Math.abs(diffDays)}d`,
        icon: <Flame className="w-3 h-3 text-rose-600" />,
        className: 'bg-rose-50 text-rose-700 border border-rose-300 font-extrabold animate-pulse'
      };
    } else if (diffDays === 0 && !isCompleted) {
      deadlineInfo = {
        type: 'today',
        text: 'Due Today',
        icon: <Clock className="w-3 h-3 text-amber-600" />,
        className: 'bg-amber-50 text-amber-800 border border-amber-300 font-bold'
      };
    } else if (diffDays === 1 && !isCompleted) {
      deadlineInfo = {
        type: 'tomorrow',
        text: 'Due Tomorrow',
        icon: <Calendar className="w-3 h-3 text-blue-600" />,
        className: 'bg-blue-50 text-blue-700 border border-blue-200 font-medium'
      };
    } else if (diffDays > 1 && !isCompleted) {
      deadlineInfo = {
        type: 'future',
        text: `Due in ${diffDays}d`,
        icon: <Calendar className="w-3 h-3 text-slate-500" />,
        className: 'bg-slate-50 text-slate-600 border border-slate-200'
      };
    }
  }

  const triggerConfetti = (e) => {
    try {
      const rect = e.target.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { x, y },
        colors: ['#2563eb', '#10b981', '#f59e0b', '#ec4899']
      });
    } catch (err) {}
  };

  const handleToggleComplete = (e) => {
    e.stopPropagation();
    if (!isCompleted) {
      sounds.playComplete();
      triggerConfetti(e);
      onStatusChange(task.id, 'completed');
    } else {
      sounds.playClick();
      onStatusChange(task.id, 'todo');
    }
  };

  // Drag start handler for native smooth HTML5 Drag-and-Drop
  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    sounds.playClick();
  };

  const priorityStyles = {
    urgent: 'border-l-rose-500 bg-rose-50/20',
    high: 'border-l-amber-500 bg-amber-50/20',
    medium: 'border-l-blue-500 bg-blue-50/10',
    low: 'border-l-slate-400 bg-slate-50/30'
  };

  const subtasksList = Array.isArray(task.subtasks) ? task.subtasks : [];
  const completedSubtasks = subtasksList.filter(s => s.completed).length;

  return (
    <div 
      draggable={true}
      onDragStart={handleDragStart}
      className={`group relative rounded-2xl clean-card p-3.5 transition-all duration-200 border border-slate-200 border-l-4 flex flex-col justify-between shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing select-none ${
        priorityStyles[task.priority] || 'border-l-blue-500'
      } ${isCompleted ? 'opacity-70 bg-slate-50' : 'bg-white'} ${
        deadlineInfo?.type === 'overdue' ? 'ring-1 ring-rose-400 shadow-rose-100' : ''
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-1.5 h-6 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
          
          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center h-5 ${
            task.priority === 'urgent' ? 'badge-urgent' :
            task.priority === 'high' ? 'badge-high' :
            task.priority === 'medium' ? 'badge-medium' : 'badge-low'
          }`}>
            {task.priority}
          </span>

          {deadlineInfo && (
            <span className={`text-[10px] px-2 py-0.5 rounded-md inline-flex items-center gap-1 h-5 ${deadlineInfo.className}`}>
              {deadlineInfo.icon}
              <span>{deadlineInfo.text}</span>
            </span>
          )}

          {isBlocked && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1 h-5">
              <AlertCircle className="w-3 h-3 text-rose-600" /> Blocked
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEditTask(task)}
            title="Edit Task"
            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => { sounds.playClick(); onDeleteTask(task.id); }}
            title="Delete Task"
            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Task Content Area */}
      <div className="flex-1 flex flex-col justify-start mb-2.5">
        <div className="flex items-start gap-2.5">
          <button
            onClick={handleToggleComplete}
            title={isCompleted ? "Mark as Incomplete" : "Mark as Completed"}
            className={`w-5 h-5 min-w-[20px] max-w-[20px] rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
              isCompleted 
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs' 
                : 'border-slate-300 hover:border-blue-500 text-transparent hover:text-blue-400 bg-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
          </button>

          <div className="flex-1 min-w-0">
            {task.is_book_reading && (
              <span className="text-[9.5px] font-extrabold uppercase tracking-wide text-indigo-600 mb-0.5 flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-indigo-600" /> Book Title:
              </span>
            )}
            <h4 className={`text-xs font-bold leading-snug break-words ${
              isCompleted ? 'line-through text-slate-400 font-normal' : 'text-slate-900'
            }`}>
              {task.title}
            </h4>
            {task.description && (
              <p className={`text-[11px] mt-1 line-clamp-2 leading-relaxed break-words ${
                task.is_book_reading ? 'text-indigo-700 font-semibold' : 'text-slate-500'
              }`}>
                {task.is_book_reading ? `✍️ Author: ${task.description}` : task.description}
              </p>
            )}
          </div>
        </div>

        {/* Tags (Only for regular tasks) */}
        {!task.is_book_reading && Array.isArray(task.tags) && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.tags.map((tag, idx) => (
              <span 
                key={idx} 
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Book Reading Executive Showcase & Metrics Grid */}
        {task.is_book_reading && (() => {
          const stats = task.book_stats || {};
          const readPages = Number(stats.total_pages_read) || 0;
          const totalPages = Number(stats.total_pages) || 0;
          const pagesPercent = totalPages > 0 ? Math.min(100, Math.round((readPages / totalPages) * 100)) : 0;
          const booksDone = Number(stats.completed) || 0;
          const booksTotal = Number(stats.total_books) || 0;
          const booksPercent = booksTotal > 0 ? Math.min(100, Math.round((booksDone / booksTotal) * 100)) : 0;

          return (
            <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-slate-50 to-purple-50/60 border border-indigo-200/80 shadow-2xs space-y-3">
              
              {/* Reading Progress Bar Section */}
              <div className="bg-white/95 p-2.5 rounded-xl border border-indigo-100 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    Reading Progress
                  </span>
                  <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60">
                    {pagesPercent}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(pagesPercent, totalPages > 0 ? 3 : 0)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-0.5">
                  <span>📄 <strong>{readPages}</strong> of {totalPages || '—'} pages</span>
                  <span>📚 <strong>{booksDone}</strong> of {booksTotal || '—'} books</span>
                </div>
              </div>

              {/* 4 Clean Executive Metric Tiles (2x2 Grid with full readability) */}
              <div className="grid grid-cols-2 gap-2">
                {/* 1. Total Books */}
                <div className="bg-white/95 rounded-xl p-2 border border-indigo-100 shadow-2xs flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 block">Total Books</span>
                    <span className="text-sm font-black text-slate-900 mt-0.5 block">{stats.total_books ?? 0}</span>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                    📚
                  </div>
                </div>

                {/* 2. In Progress */}
                <div className="bg-white/95 rounded-xl p-2 border border-blue-100 shadow-2xs flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-blue-700 block">In Progress</span>
                    <span className="text-sm font-black text-blue-800 mt-0.5 block">{stats.in_progress ?? 0}</span>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                    📖
                  </div>
                </div>

                {/* 3. Completed */}
                <div className="bg-white/95 rounded-xl p-2 border border-emerald-100 shadow-2xs flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-emerald-700 block">Completed</span>
                    <span className="text-sm font-black text-emerald-800 mt-0.5 block">{stats.completed ?? 0}</span>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                    ✅
                  </div>
                </div>

                {/* 4. Books Presented */}
                <div className="bg-white/95 rounded-xl p-2 border border-purple-100 shadow-2xs flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-purple-700 block">Presented</span>
                    <span className="text-sm font-black text-purple-800 mt-0.5 block">{stats.books_presented ?? 0}</span>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0">
                    🎤
                  </div>
                </div>
              </div>

              {/* Quick Update Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTask(task);
                }}
                className="w-full py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-[11px] font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>Update Reading Stats</span>
              </button>

            </div>
          );
        })()}

        {/* Subtasks Progress Bar & Expandable List */}
        {!task.is_book_reading && subtasksList.length > 0 && (
          <div className="mt-2.5 bg-slate-50/80 rounded-xl p-2 border border-slate-200 text-xs text-slate-600">
            <div 
              onClick={() => setShowSubtasks(!showSubtasks)}
              className="flex items-center justify-between mb-1.5 text-[10px] cursor-pointer hover:text-slate-900"
            >
              <span className="flex items-center gap-1 font-bold text-slate-700">
                <CheckSquare className="w-3 h-3 text-blue-600" />
                Subtasks ({completedSubtasks}/{subtasksList.length})
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                {Math.round((completedSubtasks / subtasksList.length) * 100)}%
                {showSubtasks ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </span>
            </div>
            
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${(completedSubtasks / subtasksList.length) * 100}%` }}
              />
            </div>

            {/* Expanded micro checklist */}
            {showSubtasks && (
              <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                {subtasksList.map((sub, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px]">
                    <input 
                      type="checkbox" 
                      checked={sub.completed} 
                      onChange={() => {
                        sounds.playClick();
                        const updatedSubtasks = [...subtasksList];
                        updatedSubtasks[idx].completed = !updatedSubtasks[idx].completed;
                        onEditTask({ ...task, subtasks: updatedSubtasks }, true);
                      }}
                      className="rounded border-slate-300 text-blue-600 cursor-pointer"
                    />
                    <span className={sub.completed ? 'line-through text-slate-400' : 'text-slate-700'}>
                      {sub.title || sub.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Row */}
      <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between gap-2 h-7">
        
        {/* Assignee */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div 
            className="w-5 h-5 min-w-[20px] rounded-md flex items-center justify-center text-[9px] font-extrabold text-white shadow-xs shrink-0"
            style={{ backgroundColor: task.assignee_color || '#2563eb' }}
          >
            {task.assignee_avatar || '??'}
          </div>
          <span className="text-[11px] text-slate-700 font-bold truncate max-w-[110px]" title={task.assignee_name}>
            {task.assignee_name}
          </span>
        </div>

        {/* Status Dropdown */}
        <select
          value={task.status}
          onChange={(e) => {
            sounds.playClick();
            onStatusChange(task.id, e.target.value);
          }}
          className="h-6 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg px-2 py-0.5 focus:outline-none focus:border-blue-500 cursor-pointer shrink-0 transition-colors"
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="completed">Completed</option>
        </select>
      </div>

    </div>
  );
}
