import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Trash2,
  Edit2,
  CheckSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../lib/audio';

export default function TaskCard({ 
  task, 
  onStatusChange, 
  onEditTask, 
  onDeleteTask 
}) {
  const isCompleted = task.status === 'completed';
  const isBlocked = task.status === 'blocked';

  const triggerConfetti = (e) => {
    try {
      const rect = e.target.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { x, y },
        colors: ['#4f46e5', '#10b981', '#f59e0b', '#ec4899']
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

  const priorityStyles = {
    urgent: 'border-l-rose-500 bg-rose-50/40',
    high: 'border-l-amber-500 bg-amber-50/40',
    medium: 'border-l-indigo-500 bg-indigo-50/20',
    low: 'border-l-slate-400 bg-slate-50/40'
  };

  const subtasksList = Array.isArray(task.subtasks) ? task.subtasks : [];
  const completedSubtasks = subtasksList.filter(s => s.completed).length;

  return (
    <div 
      className={`group relative rounded-xl clean-card p-4 transition-all duration-200 border-l-4 flex flex-col justify-between min-h-[170px] ${
        priorityStyles[task.priority] || 'border-l-indigo-500'
      } ${isCompleted ? 'opacity-70 bg-slate-50' : 'bg-white'}`}
    >
      {/* Top Bar: Fixed Height & Perfectly Aligned */}
      <div className="flex items-center justify-between gap-2 h-6 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center h-5 ${
            task.priority === 'urgent' ? 'badge-urgent' :
            task.priority === 'high' ? 'badge-high' :
            task.priority === 'medium' ? 'badge-medium' : 'badge-low'
          }`}>
            {task.priority}
          </span>

          {isBlocked && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1 h-5">
              <AlertCircle className="w-3 h-3 text-rose-600" /> Blocked
            </span>
          )}
        </div>

        {/* Action icons - Fixed position */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEditTask(task)}
            title="Edit Task"
            className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-all"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { sounds.playClick(); onDeleteTask(task.id); }}
            title="Delete Task"
            className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Task Content Area */}
      <div className="flex-1 flex flex-col justify-start mb-3">
        <div className="flex items-start gap-2.5">
          {/* Checkbox - Fixed width & stable position */}
          <button
            onClick={handleToggleComplete}
            title={isCompleted ? "Mark as Incomplete" : "Mark as Completed"}
            className={`w-5 h-5 min-w-[20px] max-w-[20px] rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
              isCompleted 
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' 
                : 'border-slate-300 hover:border-indigo-500 text-transparent hover:text-indigo-400 bg-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
          </button>

          <div className="flex-1 min-w-0">
            <h4 className={`text-xs font-bold leading-snug break-words ${
              isCompleted ? 'line-through text-slate-400 font-normal' : 'text-slate-800'
            }`}>
              {task.title}
            </h4>
            {task.description && (
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed break-words">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Tags */}
        {Array.isArray(task.tags) && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {task.tags.map((tag, idx) => (
              <span 
                key={idx} 
                className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Subtasks Progress */}
        {subtasksList.length > 0 && (
          <div className="mt-2.5 bg-slate-50 rounded-lg p-2 border border-slate-200 text-xs text-slate-600">
            <div className="flex items-center justify-between mb-1 text-[10px]">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <CheckSquare className="w-3 h-3 text-indigo-600" />
                Subtasks
              </span>
              <span className="font-bold text-slate-700">{completedSubtasks}/{subtasksList.length}</span>
            </div>
            <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${(completedSubtasks / subtasksList.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer: Firmly Anchored Bottom Row with Fixed Height */}
      <div className="mt-auto pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 h-8">
        
        {/* Assignee */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div 
            className="w-5 h-5 min-w-[20px] rounded-md flex items-center justify-center text-[9px] font-bold text-white shadow-sm shrink-0"
            style={{ backgroundColor: task.assignee_color || '#4f46e5' }}
          >
            {task.assignee_avatar || '??'}
          </div>
          <span className="text-[11px] text-slate-700 font-semibold truncate max-w-[100px]">
            {task.assignee_name}
          </span>
        </div>

        {/* Status Dropdown - Fixed Height & No Jumping */}
        <select
          value={task.status}
          onChange={(e) => {
            sounds.playClick();
            onStatusChange(task.id, e.target.value);
          }}
          className="h-7 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg px-2 py-0.5 focus:outline-none focus:border-indigo-500 cursor-pointer shrink-0 transition-colors"
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
