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
  BookOpen,
  Sparkles,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../lib/audio';
import DailyReadingModal from './DailyReadingModal';

export default function TaskCard({ 
  task, 
  itemNumber,
  onStatusChange, 
  onEditTask, 
  onDeleteTask,
  onLogDailyReading
}) {
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [isDailyLogOpen, setIsDailyLogOpen] = useState(false);
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
          
          {itemNumber && (
            <span className="w-5 h-5 rounded-md bg-slate-100 border border-slate-300/80 font-black text-slate-700 flex items-center justify-center text-[10px] shrink-0 shadow-2xs">
              {itemNumber}
            </span>
          )}

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

        {/* Task Title & Details */}
        <div className="flex items-start gap-2 pt-0.5">
          <button 
            onClick={handleToggleComplete}
            className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
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
                <BookOpen className="w-3 h-3 text-indigo-600" /> Book Reading Library
              </span>
            )}
            <h4 className={`text-xs font-bold leading-snug break-words ${
              isCompleted ? 'line-through text-slate-400 font-normal' : 'text-slate-900'
            }`}>
              {task.title}
            </h4>
            {task.description && !task.is_book_reading && (
              <p className="text-[11px] mt-1 line-clamp-2 leading-relaxed text-slate-500 break-words">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Tags (Only for regular tasks) */}
        {!task.is_book_reading && Array.isArray(task.tags) && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
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

        {/* Book Reading Clean Point-by-Point Section */}
        {task.is_book_reading && (() => {
          const stats = task.book_stats || {};
          const readPages = Number(stats.total_pages_read) || 0;
          const totalPages = Number(stats.total_pages) || 0;
          const pagesPercent = totalPages > 0 ? Math.min(100, Math.round((readPages / totalPages) * 100)) : 0;
          const booksList = Array.isArray(task.books_list) && task.books_list.length > 0 
            ? task.books_list 
            : [{ title: task.title, author: task.description, total_pages: totalPages, pages_read: readPages, status: task.status }];

          return (
            <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-indigo-100 space-y-2 text-xs">
              
              {/* Point 1, Point 2 Book List */}
              <div className="space-y-1.5">
                {booksList.map((b, i) => {
                  const bP = Number(b.total_pages) || 0;
                  const bR = Number(b.pages_read) || 0;
                  const pct = bP > 0 ? Math.min(100, Math.round((bR / bP) * 100)) : 0;
                  const isDone = b.status === 'completed';

                  return (
                    <div key={b.id || i} className="p-2 rounded-lg bg-white border border-slate-200/90 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span className="font-bold text-slate-900 truncate flex items-center gap-1">
                          <span className="text-indigo-600 font-black">{i + 1}.</span> {b.title || 'Untitled Book'}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold shrink-0 ${
                          isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {isDone ? 'Completed' : 'In Progress'}
                        </span>
                      </div>

                      {b.author && (
                        <div className="text-[10px] text-slate-500 truncate">
                          ✍️ {b.author}
                        </div>
                      )}

                      {/* Progress Bar for Book */}
                      {bP > 0 && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/60">
                            <div 
                              className={`h-full rounded-full ${isDone ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[9.5px] font-bold text-slate-600 shrink-0">
                            {bR}/{bP} pgs ({pct}%)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Cumulative Progress & Manage Button Bar */}
              <div className="pt-1 flex items-center justify-between text-[10px] border-t border-slate-200/80">
                <span className="font-extrabold text-indigo-950">
                  Total: {readPages}/{totalPages || '—'} pgs ({pagesPercent}%)
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                  className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 transition-colors cursor-pointer"
                >
                  Manage Books ({booksList.length})
                </button>
              </div>

              {/* Daily Log Button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsDailyLogOpen(true); }}
                className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10.5px] flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-98 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Log Today's Reading
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
          value={task.status === 'completed' ? 'completed' : (task.is_book_reading ? 'in_progress' : task.status)}
          onChange={(e) => {
            sounds.playClick();
            onStatusChange(task.id, e.target.value);
          }}
          className="h-6 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg px-2 py-0.5 focus:outline-none focus:border-blue-500 cursor-pointer shrink-0 transition-colors"
        >
          {task.is_book_reading ? (
            <>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </>
          ) : (
            <>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </>
          )}
        </select>
      </div>

      {/* Daily Reading Log Modal */}
      {task.is_book_reading && (
        <DailyReadingModal
          isOpen={isDailyLogOpen}
          onClose={() => setIsDailyLogOpen(false)}
          task={task}
          onLogSaved={onLogDailyReading}
        />
      )}

    </div>
  );
}
