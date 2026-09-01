import React, { useState, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Users, 
  CheckCircle2, 
  Layers, 
  Filter, 
  Lock, 
  ShieldCheck, 
  ArrowLeft,
  Crown,
  Flame,
  ArrowUpDown
} from 'lucide-react';
import TaskCard from './TaskCard';
import { sounds } from '../lib/audio';

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'text-slate-800', bg: 'bg-slate-50 border-slate-200', countBg: 'bg-slate-200 text-slate-700', dropBg: 'bg-blue-50/70 border-blue-400 border-dashed' },
  { id: 'in_progress', title: 'In Progress', color: 'text-blue-800', bg: 'bg-blue-50/30 border-blue-200/80', countBg: 'bg-blue-100 text-blue-700', dropBg: 'bg-blue-100/70 border-blue-500 border-dashed' },
  { id: 'blocked', title: 'Blocked', color: 'text-rose-800', bg: 'bg-rose-50/30 border-rose-200/80', countBg: 'bg-rose-100 text-rose-700', dropBg: 'bg-rose-100/70 border-rose-500 border-dashed' },
  { id: 'completed', title: 'Completed', color: 'text-emerald-800', bg: 'bg-emerald-50/30 border-emerald-200/80', countBg: 'bg-emerald-100 text-emerald-700', dropBg: 'bg-emerald-100/70 border-emerald-500 border-dashed' }
];

export default function KanbanBoard({ 
  tasks, 
  users, 
  currentUser, 
  onStatusChange, 
  onEditTask, 
  onDeleteTask,
  onLogDailyReading,
  openNewTaskModal, 
  searchQuery, 
  selectedMemberFilter, 
  setSelectedMemberFilter 
}) {
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dragOverCol, setDragOverCol] = useState(null);
  const todayStr = new Date().toISOString().split('T')[0];

  const isAakash = currentUser?.id === 'usr_aakash' || currentUser?.name?.toLowerCase().includes('aakash');
  const selectedMemberObj = users.find(u => u.id === selectedMemberFilter);
  
  // Privacy Check
  const isAccessDenied = !isAakash && selectedMemberFilter && selectedMemberFilter !== 'all' && selectedMemberFilter !== currentUser?.id;

  // Memoized Base & Filtered Task Pool
  const filteredTasks = useMemo(() => {
    let base = [];
    if (isAakash) {
      if (selectedMemberFilter && selectedMemberFilter !== 'all') {
        base = tasks.filter(t => t.assigned_to === selectedMemberFilter);
      } else {
        base = tasks;
      }
    } else {
      base = tasks.filter(t => t.assigned_to === currentUser?.id);
    }

    const query = (searchQuery || '').toLowerCase();
    const result = base.filter(task => {
      const matchesSearch = 
        !query ||
        task.title?.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query)) ||
        (task.assignee_name && task.assignee_name.toLowerCase().includes(query)) ||
        (task.tags && task.tags.some(t => t.toLowerCase().includes(query)));

      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });

    const priorityWeights = { urgent: 4, high: 3, medium: 2, low: 1 };
    const now = new Date(todayStr).getTime();

    return result.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;

      const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity;

      const aIsOverdue = aDue < now;
      const bIsOverdue = bDue < now;

      if (aIsOverdue && !bIsOverdue) return -1;
      if (!aIsOverdue && bIsOverdue) return 1;

      const weightDiff = (priorityWeights[b.priority] || 2) - (priorityWeights[a.priority] || 2);
      if (weightDiff !== 0) return weightDiff;

      return aDue - bDue;
    });
  }, [tasks, selectedMemberFilter, isAakash, currentUser?.id, searchQuery, priorityFilter]);

  // Drag and Drop Drop Handler
  const handleDrop = (e, colId) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      sounds.playClick();
      onStatusChange(taskId, colId);
    }
  };

  // When normal members tap on someone else -> Show Privacy Lock Screen
  if (isAccessDenied && selectedMemberObj) {
    const isTargetOnline = selectedMemberObj.status === 'online';
    const isTargetClockedOut = selectedMemberObj.status === 'logged_out';

    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center shadow-sm space-y-6 max-w-2xl mx-auto my-6 animate-fade-in">
        <div className="relative inline-block">
          <div 
            className="w-20 h-20 rounded-3xl flex items-center justify-center font-extrabold text-white text-2xl shadow-lg mx-auto"
            style={{ backgroundColor: selectedMemberObj.color || '#2563eb' }}
          >
            {selectedMemberObj.avatar}
          </div>
          <span 
            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
              isTargetOnline ? 'bg-emerald-500 animate-pulse' : isTargetClockedOut ? 'bg-amber-400' : 'bg-slate-300'
            }`}
            title={isTargetOnline ? '🟢 Active Now' : isTargetClockedOut ? '🏠 Clocked Out' : '⚪ Offline'}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <h3 className="text-lg font-extrabold text-slate-900">
              {selectedMemberObj.name}
            </h3>
            {isTargetOnline ? (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Now
              </span>
            ) : isTargetClockedOut ? (
              <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                Away / Clocked Out
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                Offline
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Official Email: <strong className="text-slate-700">{selectedMemberObj.email}</strong>
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start sm:items-center gap-3 text-left max-w-lg mx-auto">
          <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-900">Private Task Workspace</h5>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Task lists assigned to <strong>{selectedMemberObj.name}</strong> are strictly confidential to them and executive leadership.
            </p>
          </div>
        </div>

        <div>
          <button
            onClick={() => {
              sounds.playClick();
              setSelectedMemberFilter(currentUser?.id || 'all');
            }}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to My Tasks</span>
          </button>
        </div>
      </div>
    );
  }

  // Header Title
  let boardTitle = 'My Tasks';
  if (isAakash) {
    if (selectedMemberObj && selectedMemberObj.id !== currentUser?.id) {
      boardTitle = `${selectedMemberObj.name}'s Tasks (Executive Control)`;
    } else if (selectedMemberFilter === 'all') {
      boardTitle = 'All Company Tasks (Full Workspace)';
    } else {
      boardTitle = 'My Personal Tasks (Aakash Das)';
    }
  } else {
    boardTitle = `My Tasks (${currentUser?.name})`;
  }

  const overdueCount = filteredTasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date).getTime() < new Date(todayStr).getTime()).length;

  return (
    <div className="space-y-4 w-full">
      
      {/* Subheader / Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Active Filter Title */}
        <div className="flex items-center gap-2 flex-wrap">
          {isAakash ? (
            <Crown className="w-4 h-4 text-amber-500" />
          ) : (
            <Layers className="w-4 h-4 text-blue-600" />
          )}
          <h2 className="text-sm font-bold text-slate-800">
            {boardTitle}
          </h2>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {filteredTasks.length} tasks
          </span>
          {overdueCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-extrabold border border-rose-200 flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-600" /> {overdueCount} Overdue
            </span>
          )}
          {isAakash && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-extrabold border border-amber-200">
              Admin Mode
            </span>
          )}
        </div>

        {/* Priority Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Priority:
          </span>
          {['all', 'urgent', 'high', 'medium', 'low'].map((p) => (
            <button
              key={p}
              onClick={() => { sounds.playClick(); setPriorityFilter(p); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                priorityFilter === p
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold shadow-sm">
            ✨
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isAakash && selectedMemberObj ? `No Tasks Found for ${selectedMemberObj.name}` : 'No Tasks in this Workspace'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Create a new task and assign it to {selectedMemberObj ? selectedMemberObj.name : 'any team member'}.
            </p>
          </div>
          <button
            onClick={() => { sounds.playClick(); openNewTaskModal('todo'); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      ) : (
        /* 4 Drag-and-Drop Kanban Columns */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start w-full">
          {COLUMNS.map(col => {
            const colTasks = filteredTasks.filter(t => {
              if (col.id === 'todo') return t.status === 'todo';
              if (col.id === 'in_progress') return t.status === 'in_progress' || t.status === 'review';
              if (col.id === 'blocked') return t.status === 'blocked';
              if (col.id === 'completed') return t.status === 'completed';
              return false;
            });

            const isHovered = dragOverCol === col.id;

            return (
              <div 
                key={col.id}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`rounded-2xl border p-3.5 min-h-[500px] flex flex-col transition-all duration-200 ${
                  isHovered ? col.dropBg + ' ring-2 ring-blue-400 scale-[1.01]' : col.bg
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200/80">
                  <h3 className={`text-xs font-extrabold tracking-tight ${col.color}`}>
                    {col.title}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${col.countBg}`}>
                      {colTasks.length}
                    </span>
                    <button
                      onClick={() => { sounds.playClick(); openNewTaskModal(col.id === 'completed' ? 'todo' : col.id); }}
                      title={`Add task to ${col.title}`}
                      className="p-1 rounded-md hover:bg-white text-slate-600 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tasks List Drop Area */}
                <div className="flex-1 space-y-3">
                  {colTasks.length === 0 ? (
                    <div className={`h-32 flex flex-col items-center justify-center text-center p-3 border border-dashed rounded-xl transition-colors ${
                      isHovered ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 bg-white/50'
                    }`}>
                      <p className="text-xs text-slate-400 font-medium">
                        {isHovered ? 'Drop task here' : 'No tasks in this lane'}
                      </p>
                      {!isHovered && (
                        <button
                          onClick={() => openNewTaskModal(col.id === 'completed' ? 'todo' : col.id)}
                          className="mt-1 text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Task
                        </button>
                      )}
                    </div>
                  ) : (
                    colTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={onStatusChange}
                        onEditTask={onEditTask}
                        onDeleteTask={onDeleteTask}
                        onLogDailyReading={onLogDailyReading}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
