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
  ArrowUpDown,
  LayoutList,
  Columns,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Clock,
  Table as TableIcon,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Sparkles,
  Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';
import TaskCard from './TaskCard';
import DailyReadingModal from './DailyReadingModal';
import { sounds } from '../lib/audio';

const COLUMNS = [
  { id: 'todo', title: 'To Do', icon: Layers, color: 'text-slate-800', bg: 'bg-slate-50/70 border-slate-200', countBg: 'bg-slate-200 text-slate-700 border border-slate-300', dropBg: 'bg-blue-50/70 border-blue-400 border-dashed' },
  { id: 'in_progress', title: 'In Progress', icon: Clock, color: 'text-blue-800', bg: 'bg-blue-50/30 border-blue-200/80', countBg: 'bg-blue-100 text-blue-800 border border-blue-200', dropBg: 'bg-blue-100/70 border-blue-500 border-dashed' },
  { id: 'blocked', title: 'Blocked', icon: Flame, color: 'text-rose-800', bg: 'bg-rose-50/30 border-rose-200/80', countBg: 'bg-rose-100 text-rose-800 border border-rose-200', dropBg: 'bg-rose-100/70 border-rose-500 border-dashed' },
  { id: 'completed', title: 'Completed', icon: CheckCircle2, color: 'text-emerald-800', bg: 'bg-emerald-50/30 border-emerald-200/80', countBg: 'bg-emerald-100 text-emerald-800 border border-emerald-200', dropBg: 'bg-emerald-100/70 border-emerald-500 border-dashed' }
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
  const [viewMode, setViewMode] = useState('table'); // 'table' (Excel matrix) | 'columns'
  const [activeDailyTask, setActiveDailyTask] = useState(null);
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

  // Group Tasks by Team Member for 4-Status Excel Matrix
  const memberMatrixData = useMemo(() => {
    const targetUsers = isAakash
      ? (selectedMemberFilter && selectedMemberFilter !== 'all' ? users.filter(u => u.id === selectedMemberFilter) : users)
      : users.filter(u => u.id === currentUser?.id);

    return targetUsers.map(user => {
      const userTasks = filteredTasks.filter(t => t.assigned_to === user.id);
      const todoTasks = userTasks.filter(t => t.status === 'todo');
      const inProgressTasks = userTasks.filter(t => t.status === 'in_progress' || t.status === 'review');
      const blockedTasks = userTasks.filter(t => t.status === 'blocked');
      const completedTasks = userTasks.filter(t => t.status === 'completed');
      const bookTask = userTasks.find(t => t.is_book_reading);

      const totalPages = userTasks.reduce((acc, t) => acc + (Number(t.book_stats?.total_pages) || 0), 0);
      const pagesRead = userTasks.reduce((acc, t) => acc + (Number(t.book_stats?.total_pages_read) || 0), 0);

      return {
        user,
        total: userTasks.length,
        todoTasks,
        inProgressTasks,
        blockedTasks,
        completedTasks,
        bookTask,
        totalPages,
        pagesRead
      };
    }).filter(m => m.total > 0 || (isAakash && (!selectedMemberFilter || selectedMemberFilter === 'all' || selectedMemberFilter === m.user.id)));
  }, [users, filteredTasks, isAakash, selectedMemberFilter, currentUser?.id]);

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

        {/* Right Controls: Priority Filters & View Switcher */}
        <div className="flex items-center gap-3 flex-wrap">
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

          {/* View Mode Switcher: Excel Table vs Kanban Columns */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              onClick={() => { sounds.playClick(); setViewMode('table'); }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Excel Spreadsheet Matrix View (Horizontal rows)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel Matrix</span>
            </button>
            <button
              onClick={() => { sounds.playClick(); setViewMode('columns'); }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'columns'
                  ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="4-Column Kanban View"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>
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
      ) : viewMode === 'table' ? (
        /* EXCEL SPREADSHEET 4-STATUS MATRIX (To Do, In Progress, Blocked, Completed Columns) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full space-y-4 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
              {/* Excel Table Header */}
              <thead>
                <tr className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-12 border-r border-slate-700/60">#</th>
                  <th className="py-3 px-4 border-r border-slate-700/60 min-w-[160px]">Team Member</th>
                  <th className="py-3 px-4 border-r border-slate-700/60 min-w-[220px] bg-slate-800/80">📝 To Do</th>
                  <th className="py-3 px-4 border-r border-slate-700/60 min-w-[260px] bg-blue-950/60">📖 In Progress</th>
                  <th className="py-3 px-4 border-r border-slate-700/60 min-w-[180px] bg-rose-950/50">🚫 Blocked</th>
                  <th className="py-3 px-4 border-r border-slate-700/60 min-w-[220px] bg-emerald-950/60">✅ Completed</th>
                  <th className="py-3 px-4 border-r border-slate-700/60 min-w-[140px]">Workload & Pages</th>
                  <th className="py-3 px-4 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/90 bg-white">
                {memberMatrixData.map((member, idx) => {
                  const user = member.user;
                  const completionRate = member.total > 0 ? Math.round((member.completedTasks.length / member.total) * 100) : 0;

                  return (
                    <tr 
                      key={user.id}
                      className={`hover:bg-indigo-50/20 transition-colors ${
                        idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                      }`}
                    >
                      {/* 1. Row # */}
                      <td className="py-4 px-3 text-center font-extrabold text-slate-500 border-r border-slate-200 bg-slate-50/60 align-top">
                        {idx + 1}
                      </td>

                      {/* 2. Team Member Profile */}
                      <td className="py-4 px-4 border-r border-slate-200 align-top whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-2xs shrink-0"
                            style={{ backgroundColor: user.color || '#2563eb' }}
                          >
                            {user.avatar || '??'}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 leading-snug">{user.name}</div>
                            <div className="text-[10.5px] text-slate-400 font-medium">{user.role}</div>
                            <div className="mt-1 flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <span className="text-[9.5px] text-slate-500 font-semibold capitalize">{user.status}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. TO DO COLUMN */}
                      <td className="py-3 px-3.5 border-r border-slate-200 align-top bg-slate-50/30">
                        {member.todoTasks.length === 0 ? (
                          <div className="py-2 text-center text-slate-400 italic text-[10.5px]">
                            — No To Do tasks —
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {member.todoTasks.map((t, tIdx) => (
                              <div key={t.id} className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
                                <div className="flex items-start justify-between gap-1">
                                  <span className="font-bold text-slate-900 leading-tight">
                                    <strong className="text-slate-500 font-extrabold">{tIdx + 1}.</strong> {t.title}
                                  </span>
                                  <span className={`text-[8.5px] font-extrabold px-1.5 py-0.2 rounded uppercase shrink-0 ${
                                    t.priority === 'urgent' ? 'bg-rose-100 text-rose-800' :
                                    t.priority === 'high' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {t.priority}
                                  </span>
                                </div>
                                {t.description && (
                                  <p className="text-[10px] text-slate-500 line-clamp-1">{t.description}</p>
                                )}
                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[9.5px]">
                                  <span className="text-slate-400">{t.due_date ? `📅 ${t.due_date.split('-').slice(1).join('/')}` : 'No date'}</span>
                                  <button
                                    onClick={() => { sounds.playClick(); onStatusChange(t.id, 'in_progress'); }}
                                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                                  >
                                    Start →
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* 4. IN PROGRESS COLUMN */}
                      <td className="py-3 px-3.5 border-r border-slate-200 align-top bg-blue-50/15">
                        {member.inProgressTasks.length === 0 ? (
                          <div className="py-2 text-center text-slate-400 italic text-[10.5px]">
                            — None active —
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {member.inProgressTasks.map((t, tIdx) => {
                              const stats = t.book_stats || {};
                              const readP = Number(stats.total_pages_read) || 0;
                              const totalP = Number(stats.total_pages) || 0;
                              const pct = totalP > 0 ? Math.min(100, Math.round((readP / totalP) * 100)) : 0;
                              const booksList = Array.isArray(t.books_list) && t.books_list.length > 0 ? t.books_list : [];

                              return (
                                <div key={t.id} className="p-2 rounded-xl bg-white border border-blue-200/80 shadow-2xs space-y-1.5">
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="font-bold text-slate-900 leading-tight">
                                      <strong className="text-blue-600 font-extrabold">{tIdx + 1}.</strong> {t.title}
                                    </span>
                                    <span className="text-[8.5px] font-extrabold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 shrink-0">
                                      In Progress
                                    </span>
                                  </div>

                                  {/* Multi-Book list */}
                                  {t.is_book_reading && booksList.length > 0 && (
                                    <div className="space-y-1 pt-0.5">
                                      {booksList.map((b, bIdx) => (
                                        <div key={b.id || bIdx} className="p-1 rounded bg-slate-50 border border-slate-200/70 text-[9.5px] flex items-center justify-between gap-1">
                                          <span className="truncate font-semibold text-slate-800">
                                            #{bIdx + 1} {b.title} {b.author ? `(${b.author})` : ''}
                                          </span>
                                          <span className={`px-1 py-0.2 rounded text-[8px] font-extrabold shrink-0 ${
                                            b.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                          }`}>
                                            {b.status === 'completed' ? 'Done' : `${b.pages_read || 0}/${b.total_pages || 0}`}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Progress bar for book reading */}
                                  {t.is_book_reading && totalP > 0 && (
                                    <div className="space-y-0.5 pt-0.5">
                                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-600">
                                        <span>{readP}/{totalP} pgs</span>
                                        <span className="text-indigo-600">{pct}%</span>
                                      </div>
                                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/60">
                                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
                                      </div>
                                    </div>
                                  )}

                                  {/* Quick Log Pages button */}
                                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[9.5px]">
                                    {t.is_book_reading ? (
                                      <button
                                        onClick={() => { sounds.playClick(); setActiveDailyTask(t); }}
                                        className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <Sparkles className="w-2.5 h-2.5" /> Log Pages
                                      </button>
                                    ) : (
                                      <span className="text-slate-400">{t.due_date ? `Due ${t.due_date.split('-').slice(1).join('/')}` : ''}</span>
                                    )}
                                    <button
                                      onClick={() => {
                                        sounds.playComplete();
                                        confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
                                        onStatusChange(t.id, 'completed');
                                      }}
                                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                                    >
                                      Finish ✓
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* 5. BLOCKED COLUMN */}
                      <td className="py-3 px-3.5 border-r border-slate-200 align-top bg-rose-50/15">
                        {member.blockedTasks.length === 0 ? (
                          <div className="py-2 text-center text-slate-400 italic text-[10.5px]">
                            — None —
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {member.blockedTasks.map((t, tIdx) => (
                              <div key={t.id} className="p-2 rounded-xl bg-white border border-rose-200 shadow-2xs space-y-1">
                                <div className="flex items-start justify-between gap-1">
                                  <span className="font-bold text-slate-900 leading-tight">
                                    <strong className="text-rose-600 font-extrabold">{tIdx + 1}.</strong> {t.title}
                                  </span>
                                  <span className="text-[8.5px] font-black px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 shrink-0">
                                    Blocked
                                  </span>
                                </div>
                                <p className="text-[10px] text-rose-700 line-clamp-1">{t.description || 'Action required'}</p>
                                <div className="pt-1 text-right">
                                  <button
                                    onClick={() => { sounds.playClick(); onStatusChange(t.id, 'in_progress'); }}
                                    className="text-[9.5px] text-blue-600 font-bold hover:underline cursor-pointer"
                                  >
                                    Unblock →
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* 6. COMPLETED COLUMN */}
                      <td className="py-3 px-3.5 border-r border-slate-200 align-top bg-emerald-50/15">
                        {member.completedTasks.length === 0 ? (
                          <div className="py-2 text-center text-slate-400 italic text-[10.5px]">
                            — 0 finished —
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {member.completedTasks.map((t, tIdx) => (
                              <div key={t.id} className="p-1.5 rounded-lg bg-white border border-emerald-200 shadow-2xs space-y-0.5 text-[10px]">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-semibold text-slate-700 line-through truncate">
                                    {tIdx + 1}. {t.title}
                                  </span>
                                  <span className="text-[8px] font-black px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                                    ✓ Done
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* 7. Workload Summary & Pages Read */}
                      <td className="py-4 px-4 border-r border-slate-200 align-top whitespace-nowrap space-y-1.5">
                        <div className="text-[11px] font-extrabold text-slate-800">
                          {member.completedTasks.length}/{member.total} Tasks Done ({completionRate}%)
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                        {member.totalPages > 0 && (
                          <div className="text-[10px] text-indigo-900 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            📖 {member.pagesRead}/{member.totalPages} pages read
                          </div>
                        )}
                      </td>

                      {/* 8. Actions */}
                      <td className="py-4 px-4 text-center align-top whitespace-nowrap">
                        <div className="flex flex-col gap-1.5 items-center">
                          <button
                            onClick={() => { sounds.playClick(); openNewTaskModal('todo'); }}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                            title="Add Task for Member"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Task</span>
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 4 DRAG-AND-DROP VERTICAL KANBAN COLUMNS */
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
                className={`rounded-2xl border p-3.5 min-h-[160px] flex flex-col transition-all duration-200 shadow-2xs ${
                  isHovered ? col.dropBg + ' ring-2 ring-blue-400 scale-[1.01]' : col.bg
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200/80">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      col.id === 'completed' ? 'bg-emerald-500' :
                      col.id === 'in_progress' ? 'bg-blue-500' :
                      col.id === 'blocked' ? 'bg-rose-500' : 'bg-slate-400'
                    }`} />
                    <h3 className={`text-xs font-extrabold tracking-tight ${col.color}`}>
                      {col.title}
                    </h3>
                  </div>
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

                {/* Tasks List Drop Area (Point 1, Point 2 order) */}
                <div className="flex-1 space-y-3">
                  {colTasks.length === 0 ? (
                    <div className={`py-4 flex flex-col items-center justify-center text-center p-3 border border-dashed rounded-xl transition-colors ${
                      isHovered ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300/80 bg-white/50'
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
                    colTasks.map((task, idx) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        itemNumber={idx + 1}
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

      {/* Daily Reading Log Modal for Table View */}
      {activeDailyTask && (
        <DailyReadingModal
          isOpen={Boolean(activeDailyTask)}
          onClose={() => setActiveDailyTask(null)}
          task={activeDailyTask}
          onLogSaved={onLogDailyReading}
        />
      )}

    </div>
  );
}
