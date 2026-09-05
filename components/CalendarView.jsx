import React from 'react';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  CheckCircle2
} from 'lucide-react';
import { sounds } from '../lib/audio';

export default function CalendarView({ 
  tasks, 
  users, 
  currentUser, 
  selectedMemberFilter, 
  openNewTaskModal, 
  onEditTask 
}) {
  // Always locked to the current live active month (e.g. September now, automatically October when October arrives)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // First day and total days in current month
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Filter tasks based on member selection
  const isAakash = currentUser?.id === 'usr_aakash' || currentUser?.name?.toLowerCase().includes('aakash');
  let baseTasks = [];
  if (isAakash) {
    if (selectedMemberFilter && selectedMemberFilter !== 'all') {
      baseTasks = tasks.filter(t => t.assigned_to === selectedMemberFilter);
    } else {
      baseTasks = tasks;
    }
  } else {
    baseTasks = tasks.filter(t => t.assigned_to === currentUser?.id);
  }

  // Timezone-safe local date string (YYYY-MM-DD)
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Calendar cells generation: ONLY dates of current active month!
  const calendarCells = [];

  // Empty placeholder cells before the 1st of the current month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push({ day: null, isCurrentMonth: false, dateStr: null });
  }

  // Days of current month only
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ day: d, isCurrentMonth: true, dateStr });
  }

  // Trailing empty placeholder cells to complete the 7-day grid row
  const remaining = (7 - (calendarCells.length % 7)) % 7;
  for (let d = 0; d < remaining; d++) {
    calendarCells.push({ day: null, isCurrentMonth: false, dateStr: null });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 animate-fade-in w-full">
      
      {/* Calendar Header - Always Fixed to Current Month */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                {monthNames[month]} {year}
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Current Active Month
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Current sprint schedule & task roadmap ({monthNames[month]} {year})
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { sounds.playClick(); openNewTaskModal('todo'); }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Day of Week Headers */}
      <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 uppercase tracking-wider pb-1">
        <span className="text-rose-500">Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* Monthly Grid */}
      <div className="grid grid-cols-7 gap-1.5 border-t border-slate-100 pt-2">
        {calendarCells.map((cell, idx) => {
          // If cell is empty (before 1st or after last day), render blank slot
          if (!cell.day) {
            return (
              <div
                key={idx}
                className="min-h-[115px] rounded-xl p-2 border border-slate-100 bg-slate-50/25"
              />
            );
          }

          const isToday = cell.dateStr === todayStr;
          const dayTasks = baseTasks.filter(t => t.due_date === cell.dateStr);

          return (
            <div
              key={idx}
              className={`min-h-[115px] rounded-xl p-2 border transition-all flex flex-col justify-between ${
                isToday
                  ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-400'
                  : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              {/* Day Number Row */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${
                  isToday 
                    ? 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs' 
                    : 'text-slate-800'
                }`}>
                  {cell.day}
                </span>

                <button
                  onClick={() => { sounds.playClick(); openNewTaskModal('todo'); }}
                  title={`Add task for ${cell.dateStr}`}
                  className="opacity-0 hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-blue-600 transition-opacity cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Tasks Pills List for Day */}
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[85px] pr-0.5">
                {dayTasks.map(task => {
                  const isCompleted = task.status === 'completed';
                  const isOverdue = !isCompleted && task.due_date && new Date(task.due_date).getTime() < new Date(todayStr).getTime();

                  return (
                    <div
                      key={task.id}
                      onClick={() => { sounds.playClick(); onEditTask(task); }}
                      title={`${task.title} (${task.assignee_name}) - Click to Edit`}
                      className={`px-1.5 py-1 rounded-md text-[10px] font-bold border truncate transition-all cursor-pointer flex items-center justify-between gap-1 shadow-2xs ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold'
                          : isOverdue
                          ? 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-300'
                          : task.priority === 'urgent'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : task.priority === 'high'
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      <span className="truncate">{task.title}</span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {isCompleted && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />}
                        <span 
                          className="w-3.5 h-3.5 rounded-full text-[8px] flex items-center justify-center text-white font-extrabold"
                          style={{ backgroundColor: task.assignee_color || '#2563eb' }}
                        >
                          {task.assignee_avatar || '?'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
