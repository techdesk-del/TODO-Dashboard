import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Flame, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Users,
  Filter
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
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day and total days in current month
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    sounds.playClick();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    sounds.playClick();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    sounds.playClick();
    setCurrentDate(new Date());
  };

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

  const todayStr = new Date().toISOString().split('T')[0];

  // Calendar cells generation (prev month trailing days + current month + next month)
  const calendarCells = [];

  // Trailing days from previous month
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const dateStr = new Date(year, month - 1, day).toISOString().split('T')[0];
    calendarCells.push({ day, isCurrentMonth: false, dateStr });
  }

  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ day: d, isCurrentMonth: true, dateStr });
  }

  // Remaining cells to fill grid (up to 35 or 42 cells)
  const remaining = (7 - (calendarCells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const dateStr = new Date(year, month + 1, d).toISOString().split('T')[0];
    calendarCells.push({ day: d, isCurrentMonth: false, dateStr });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 animate-fade-in w-full">
      
      {/* Calendar Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              {monthNames[month]} {year}
            </h3>
            <p className="text-xs text-slate-500">
              Visual Sprint & Task Due Dates Roadmap
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
          >
            Today
          </button>
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-50 text-slate-600 transition-colors border-l border-slate-200 cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

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
          const isToday = cell.dateStr === todayStr;
          const dayTasks = baseTasks.filter(t => t.due_date === cell.dateStr);

          return (
            <div
              key={idx}
              className={`min-h-[115px] rounded-xl p-2 border transition-all flex flex-col justify-between ${
                !cell.isCurrentMonth
                  ? 'bg-slate-50/50 border-slate-100 text-slate-300 opacity-60'
                  : isToday
                  ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-400'
                  : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              {/* Day Number Row */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${
                  isToday 
                    ? 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs' 
                    : cell.isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                }`}>
                  {cell.day}
                </span>

                {cell.isCurrentMonth && (
                  <button
                    onClick={() => { sounds.playClick(); openNewTaskModal('todo'); }}
                    title={`Add task for ${cell.dateStr}`}
                    className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-blue-600 transition-opacity cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
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
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 line-through opacity-75'
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
                        {isOverdue && <Flame className="w-2.5 h-2.5 text-rose-600" />}
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
