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
  ChevronDown,
  ChevronUp,
  BookOpen,
  Clock,
  Table as TableIcon,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Sparkles,
  Calendar,
  X,
  MessageSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';
import DailyReadingModal from './DailyReadingModal';
import TaskRemarkModal from './TaskRemarkModal';
import { sounds } from '../lib/audio';

export default function KanbanBoard({ 
  tasks, 
  users, 
  currentUser, 
  onStatusChange, 
  onEditTask, 
  onDeleteTask,
  onLogDailyReading,
  onSaveRemark,
  onDeleteRemark,
  openNewTaskModal, 
  searchQuery, 
  selectedMemberFilter, 
  setSelectedMemberFilter 
}) {
  const [activeDailyTask, setActiveDailyTask] = useState(null);
  const [activeRemarkTask, setActiveRemarkTask] = useState(null);
  const [activeRemarkCandidateTasks, setActiveRemarkCandidateTasks] = useState([]);
  const [bookToFinish, setBookToFinish] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('all');
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
      const inProgressTasks = userTasks.filter(t => (t.status === 'in_progress' || t.status === 'review') && !t.is_book_reading);
      const blockedTasks = userTasks.filter(t => t.status === 'blocked');
      const regularCompletedTasks = userTasks.filter(t => t.status === 'completed' && !t.is_book_reading);
      const bookTask = userTasks.find(t => t.is_book_reading);

      // Extract all books (both In Progress and Completed) from bookTask
      let inProgressBooks = [];
      let completedBooks = [];
      if (bookTask) {
        if (Array.isArray(bookTask.books_list) && bookTask.books_list.length > 0) {
          inProgressBooks = bookTask.books_list.filter(b => b.status !== 'completed');
          completedBooks = bookTask.books_list.filter(b => b.status === 'completed');
        } else {
          if (bookTask.status === 'completed') {
            completedBooks = [{
              id: 'bk_' + bookTask.id,
              title: bookTask.title,
              author: bookTask.description,
              total_pages: Number(bookTask.book_stats?.total_pages) || 0,
              pages_read: Number(bookTask.book_stats?.total_pages_read) || Number(bookTask.book_stats?.total_pages) || 0,
              status: 'completed'
            }];
          } else {
            inProgressBooks = [{
              id: 'bk_' + bookTask.id,
              title: bookTask.title,
              author: bookTask.description,
              total_pages: Number(bookTask.book_stats?.total_pages) || 0,
              pages_read: Number(bookTask.book_stats?.total_pages_read) || 0,
              status: 'in_progress'
            }];
          }
        }
      }

      const totalPages = userTasks.reduce((acc, t) => acc + (Number(t.book_stats?.total_pages) || 0), 0);
      const pagesRead = userTasks.reduce((acc, t) => acc + (Number(t.book_stats?.total_pages_read) || 0), 0);

      const totalItemsCount = userTasks.filter(t => !t.is_book_reading).length + (bookTask?.books_list?.length || (bookTask ? 1 : 0));
      const totalCompletedCount = regularCompletedTasks.length + completedBooks.length;

      return {
        user,
        total: totalItemsCount,
        totalCompletedCount,
        todoTasks,
        inProgressTasks,
        blockedTasks,
        regularCompletedTasks,
        completedBooks,
        inProgressBooks,
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
        /* EXCEL SPREADSHEET 4-STATUS MATRIX (To Do, In Progress, Blocked, Completed Columns) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full space-y-4 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
              {/* Excel Table Header */}
              <thead>
                <tr className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-12 border-r border-slate-700/60">#</th>
                  <th className="py-3 px-4 border-r border-slate-700/60 min-w-[190px]">Candidate / Team Member</th>
                  <th className="py-3 px-4 border-r border-slate-700/60 min-w-[220px] bg-slate-800/80">📝 To Do</th>
                  <th className="py-3 px-4 border-r border-slate-700/60 min-w-[260px] bg-blue-950/60">📖 In Progress</th>
                  <th className="py-3 px-4 border-r border-slate-700/60 min-w-[270px] bg-indigo-950/70">💬 Remarks & Info</th>
                  <th className="py-3 px-4 border-r border-slate-700/60 min-w-[140px]">Workload & Pages</th>
                  <th className="py-3 px-4 border-r border-slate-700/60 min-w-[180px] bg-rose-950/50">🚫 Blocked</th>
                  <th className="py-3 px-4 min-w-[220px] bg-emerald-950/60">✅ Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/90 bg-white">
                {memberMatrixData.map((member, idx) => {
                  const user = member.user;
                  const candidateTasks = [
                    ...member.todoTasks,
                    ...member.inProgressTasks,
                    ...member.blockedTasks,
                    ...member.regularCompletedTasks,
                    ...(member.bookTask ? [member.bookTask] : [])
                  ];
                  const completedCount = member.totalCompletedCount ?? ((member.regularCompletedTasks?.length || 0) + (member.completedBooks?.length || 0));
                  const completionRate = member.total > 0 ? Math.round((completedCount / member.total) * 100) : 0;

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

                      {/* 2. Candidate / Team Member Profile + Quick + Add Task Action at Front */}
                      <td className="py-4 px-4 border-r border-slate-200 align-top whitespace-nowrap space-y-2.5">
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
                            <div className="mt-0.5 flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <span className="text-[9.5px] text-slate-500 font-semibold capitalize">{user.status}</span>
                            </div>
                          </div>
                        </div>

                        {/* Starting Quick Actions: + Add Task & Manage Books for this specific candidate */}
                        <div className="space-y-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              sounds.playClick();
                              openNewTaskModal('todo', user.id);
                            }}
                            className="w-full py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
                            title={`Add task for ${user.name}`}
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span>+ Add Task</span>
                          </button>

                          {member.bookTask ? (
                            <button
                              type="button"
                              onClick={() => {
                                sounds.playClick();
                                onEditTask(member.bookTask);
                              }}
                              className="w-full py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 active:scale-98 font-black text-[10.5px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                              title="Manage individual books, authors, dates, & reading list"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Manage Books ({member.bookTask.books_list?.length || 1})</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                sounds.playClick();
                                openNewTaskModal('in_progress', user.id);
                              }}
                              className="w-full py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 active:scale-98 font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                              title="Assign a book reading task"
                            >
                              <BookOpen className="w-3 h-3 text-slate-500" />
                              <span>+ Add Book</span>
                            </button>
                          )}
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

                                {/* Remark Preview */}
                                {(t.latest_remark || t.remarks?.[0]?.text) && (
                                  <div
                                    onClick={() => { sounds.playClick(); setActiveRemarkTask(t); setActiveRemarkCandidateTasks(candidateTasks); }}
                                    className="p-1.5 rounded-lg bg-indigo-50/70 hover:bg-indigo-50 border border-indigo-100/80 text-[9.5px] text-indigo-950 flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Click to view/add remarks"
                                  >
                                    <MessageSquare className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                    <span className="truncate italic">"{t.latest_remark || t.remarks?.[0]?.text}"</span>
                                    {t.remarks?.length > 1 && (
                                      <span className="px-1 rounded bg-indigo-200/70 text-[8px] font-black text-indigo-900 shrink-0">
                                        +{t.remarks.length - 1}
                                      </span>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[9.5px]">
                                  <div className="flex items-center gap-1 text-slate-400">
                                    <span>{t.due_date ? `📅 ${t.due_date.split('-').slice(1).join('/')}` : 'No date'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => { sounds.playClick(); setActiveRemarkTask(t); setActiveRemarkCandidateTasks(candidateTasks); }}
                                      className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                                        t.remarks?.length > 0
                                          ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                                          : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                                      }`}
                                      title={t.remarks?.length > 0 ? `${t.remarks.length} remark(s)` : 'Add Remark'}
                                    >
                                      <MessageSquare className="w-2.5 h-2.5 text-indigo-600" />
                                      <span>{t.remarks?.length > 0 ? t.remarks.length : 'Remark'}</span>
                                    </button>
                                    <button
                                      onClick={() => { sounds.playClick(); onEditTask(t); }}
                                      className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5"
                                      title="Edit Task"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => { sounds.playClick(); onStatusChange(t.id, 'in_progress'); }}
                                      className="text-blue-600 font-bold hover:underline cursor-pointer"
                                    >
                                      Start →
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* 4. IN PROGRESS COLUMN */}
                      <td className="py-3 px-3.5 border-r border-slate-200 align-top bg-blue-50/15">
                        {member.inProgressTasks.length === 0 && (!member.bookTask || member.inProgressBooks.length === 0) ? (
                          <div className="py-2 text-center text-slate-400 italic text-[10.5px]">
                            — None active —
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {/* Regular In-Progress Tasks */}
                            {member.inProgressTasks.map((t, tIdx) => (
                              <div key={t.id} className="p-2.5 rounded-xl bg-white border border-blue-200 shadow-2xs space-y-1.5">
                                <div className="flex items-start justify-between gap-1">
                                  <span className="font-bold text-slate-900 leading-tight">
                                    <strong className="text-blue-600 font-extrabold">{tIdx + 1}.</strong> {t.title}
                                  </span>
                                  <span className="text-[8.5px] font-extrabold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 shrink-0">
                                    In Progress
                                  </span>
                                </div>
                                {t.description && (
                                  <p className="text-[10px] text-slate-500 line-clamp-1">{t.description}</p>
                                )}

                                {/* Remark Preview */}
                                {(t.latest_remark || t.remarks?.[0]?.text) && (
                                  <div
                                    onClick={() => { sounds.playClick(); setActiveRemarkTask(t); setActiveRemarkCandidateTasks(candidateTasks); }}
                                    className="p-1.5 rounded-lg bg-indigo-50/70 hover:bg-indigo-50 border border-indigo-100/80 text-[9.5px] text-indigo-950 flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Click to view/add remarks"
                                  >
                                    <MessageSquare className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                    <span className="truncate italic">"{t.latest_remark || t.remarks?.[0]?.text}"</span>
                                    {t.remarks?.length > 1 && (
                                      <span className="px-1 rounded bg-indigo-200/70 text-[8px] font-black text-indigo-900 shrink-0">
                                        +{t.remarks.length - 1}
                                      </span>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[9.5px]">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => { sounds.playClick(); setActiveRemarkTask(t); setActiveRemarkCandidateTasks(candidateTasks); }}
                                      className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                                        t.remarks?.length > 0
                                          ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                                          : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                                      }`}
                                      title={t.remarks?.length > 0 ? `${t.remarks.length} remark(s)` : 'Add Remark'}
                                    >
                                      <MessageSquare className="w-2.5 h-2.5 text-indigo-600" />
                                      <span>{t.remarks?.length > 0 ? t.remarks.length : 'Remark'}</span>
                                    </button>
                                    <button
                                      onClick={() => { sounds.playClick(); onEditTask(t); }}
                                      className="p-0.5 rounded text-slate-400 hover:text-blue-600 cursor-pointer"
                                      title="Edit Task"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <span className="text-slate-400">{t.due_date ? `Due ${t.due_date.split('-').slice(1).join('/')}` : ''}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      sounds.playComplete();
                                      confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
                                      onStatusChange(t.id, 'completed');
                                    }}
                                    className="text-emerald-700 font-extrabold hover:underline cursor-pointer"
                                  >
                                    Finish ✓
                                  </button>
                                </div>
                              </div>
                            ))}

                            {/* Book Reading Tracker in In-Progress */}
                            {member.bookTask && member.inProgressBooks.length > 0 && (() => {
                              const t = member.bookTask;
                              const stats = t.book_stats || {};
                              const readP = Number(stats.total_pages_read) || 0;
                              const totalP = Number(stats.total_pages) || 0;
                              const pct = totalP > 0 ? Math.min(100, Math.round((readP / totalP) * 100)) : 0;

                              return (
                                <div key={t.id} className="p-2.5 rounded-xl bg-white border border-indigo-200 shadow-2xs space-y-2">
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="font-bold text-indigo-950 leading-tight flex items-center gap-1">
                                      <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                      <span>Active Reading ({member.inProgressBooks.length} Books)</span>
                                    </span>
                                    <span className="text-[8.5px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 shrink-0">
                                      Reading
                                    </span>
                                  </div>

                                  {/* Multi-Book In-Progress list */}
                                  <div className="space-y-1 pt-0.5">
                                    {member.inProgressBooks.map((b, bIdx) => (
                                      <div key={b.id || bIdx} className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[9.5px] flex items-center justify-between gap-1">
                                        <span className="truncate font-semibold text-slate-800">
                                          #{bIdx + 1} {b.title} {b.author ? `(${b.author})` : ''}
                                        </span>
                                        <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black shrink-0 bg-blue-100 text-blue-800">
                                          {b.pages_read || 0}/{b.total_pages || 0} pgs
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Progress bar for book reading */}
                                  {totalP > 0 && (
                                    <div className="space-y-0.5 pt-0.5">
                                      <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-600">
                                        <span>{readP}/{totalP} pgs</span>
                                        <span className="text-indigo-600 font-black">{pct}%</span>
                                      </div>
                                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/60">
                                        <div className="h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
                                      </div>
                                    </div>
                                  )}

                                  {/* Action Buttons */}
                                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[9.5px] gap-1 flex-wrap">
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => { sounds.playClick(); setActiveDailyTask(t); }}
                                        className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                      >
                                        <Sparkles className="w-2.5 h-2.5" /> Log Pages
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => { sounds.playClick(); onEditTask(t); }}
                                        className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                        title="Manage books, add new book, change status"
                                      >
                                        <Edit2 className="w-2.5 h-2.5 text-slate-500" /> Manage Books
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        sounds.playClick();
                                        setBookToFinish(t);
                                      }}
                                      className="text-emerald-700 font-extrabold hover:underline cursor-pointer"
                                    >
                                      Finish ✓
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </td>

                      {/* 5. REMARKS & INFORMATION COLUMN (DIRECT OUTSIDE TABLE DISPLAY) */}
                      <td className="py-3 px-3.5 border-r border-slate-200 align-top bg-indigo-50/15 min-w-[270px]">
                        {(() => {
                          const candidateTasks = [
                            ...member.todoTasks,
                            ...member.inProgressTasks,
                            ...member.blockedTasks,
                            ...member.regularCompletedTasks,
                            ...(member.bookTask ? [member.bookTask] : [])
                          ];
                          const tasksWithRemarks = candidateTasks.filter(t => (t.remarks && t.remarks.length > 0) || t.latest_remark);

                          return (
                            <div className="space-y-2">
                              {/* Header inside cell with Quick + Add Remark */}
                              <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-indigo-200/80">
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3 text-indigo-600" />
                                  <span>Remarks ({tasksWithRemarks.length})</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    sounds.playClick();
                                    const target = member.todoTasks[0] || member.inProgressTasks[0] || member.blockedTasks[0] || candidateTasks[0];
                                    if (target) {
                                      setActiveRemarkTask(target);
                                      setActiveRemarkCandidateTasks(candidateTasks);
                                    }
                                  }}
                                  className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9.5px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                                  title={`Add remark for ${user.name}'s task`}
                                >
                                  <Plus className="w-3 h-3 stroke-[3]" />
                                  <span>Add Remark</span>
                                </button>
                              </div>

                              {/* Remarks Cards List */}
                              {tasksWithRemarks.length === 0 ? (
                                <div className="py-3 text-center text-slate-400 italic text-[10.5px]">
                                  — No task remarks yet —
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  {tasksWithRemarks.map(t => {
                                    const latest = t.latest_remark || t.remarks?.[0]?.text;
                                    const author = t.remarks?.[0]?.author_name || 'Team';
                                    const count = t.remarks?.length || 1;

                                    return (
                                      <div
                                        key={t.id}
                                        onClick={() => {
                                          sounds.playClick();
                                          setActiveRemarkTask(t);
                                          setActiveRemarkCandidateTasks(candidateTasks);
                                        }}
                                        className="p-2 rounded-xl bg-white border border-indigo-200/90 hover:border-indigo-400 shadow-2xs space-y-1 cursor-pointer transition-all hover:shadow-xs group"
                                        title="Click to view full remark timeline or add update"
                                      >
                                        <div className="flex items-center justify-between gap-1 text-[10px]">
                                          <span className="font-extrabold text-indigo-950 truncate flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                            <span className="truncate">{t.title}</span>
                                          </span>
                                          <span className="text-[8.5px] font-black px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 shrink-0">
                                            💬 {count}
                                          </span>
                                        </div>
                                        <p className="text-[10.5px] text-slate-700 leading-snug line-clamp-2 italic font-medium pl-2 border-l-2 border-indigo-400">
                                          "{latest}"
                                        </p>
                                        <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                                          <span className="font-semibold text-indigo-700">{author}</span>
                                          <span className="text-indigo-600 font-bold group-hover:underline">View / Add →</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* 6. Workload Summary & Pages Read */}
                      <td className="py-4 px-4 border-r border-slate-200 align-top whitespace-nowrap space-y-1.5">
                        <div className="text-[11px] font-extrabold text-slate-800">
                          {member.totalCompletedCount}/{member.total} Tasks Done ({completionRate}%)
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

                      {/* 6. BLOCKED COLUMN (Placed at End) */}
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

                                {/* Remark Preview */}
                                {(t.latest_remark || t.remarks?.[0]?.text) && (
                                  <div
                                    onClick={() => { sounds.playClick(); setActiveRemarkTask(t); setActiveRemarkCandidateTasks(candidateTasks); }}
                                    className="p-1.5 rounded-lg bg-rose-50/80 hover:bg-rose-100/70 border border-rose-200 text-[9.5px] text-rose-950 flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Click to view/add blocker remark"
                                  >
                                    <MessageSquare className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                                    <span className="truncate italic font-medium">"{t.latest_remark || t.remarks?.[0]?.text}"</span>
                                    {t.remarks?.length > 1 && (
                                      <span className="px-1 rounded bg-rose-200 text-[8px] font-black text-rose-900 shrink-0">
                                        +{t.remarks.length - 1}
                                      </span>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[9.5px]">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => { sounds.playClick(); setActiveRemarkTask(t); setActiveRemarkCandidateTasks(candidateTasks); }}
                                      className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                                        t.remarks?.length > 0
                                          ? 'bg-rose-50 text-rose-800 font-bold border border-rose-200'
                                          : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'
                                      }`}
                                      title={t.remarks?.length > 0 ? `${t.remarks.length} remark(s)` : 'Add Blocker Remark'}
                                    >
                                      <MessageSquare className="w-2.5 h-2.5 text-rose-600" />
                                      <span>{t.remarks?.length > 0 ? t.remarks.length : 'Remark'}</span>
                                    </button>
                                    <button
                                      onClick={() => { sounds.playClick(); onEditTask(t); }}
                                      className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5"
                                      title="Edit Task"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => { sounds.playTrash(); onDeleteTask(t.id); }}
                                      className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
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

                      {/* 7. COMPLETED COLUMN (Lists Regular Completed Tasks + ALL Completed Books) */}
                      <td className="py-3 px-3.5 align-top bg-emerald-50/15">
                        {member.regularCompletedTasks.length === 0 && member.completedBooks.length === 0 ? (
                          <div className="py-2 text-center text-slate-400 italic text-[10.5px]">
                            — 0 finished —
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {/* Regular Finished Tasks */}
                            {member.regularCompletedTasks.map((t, tIdx) => (
                              <div key={t.id} className="p-1.5 rounded-lg bg-white border border-emerald-200 shadow-2xs space-y-1 text-[10px]">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-semibold text-slate-700 line-through truncate">
                                    {tIdx + 1}. {t.title}
                                  </span>
                                  <span className="text-[8px] font-black px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                                    ✓ Done
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[9px] pt-0.5 text-slate-400">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => { sounds.playClick(); setActiveRemarkTask(t); setActiveRemarkCandidateTasks(candidateTasks); }}
                                      className={`inline-flex items-center gap-0.5 text-[8.5px] px-1 py-0.2 rounded cursor-pointer ${
                                        t.remarks?.length > 0 ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:text-indigo-600'
                                      }`}
                                      title="Remarks"
                                    >
                                      <MessageSquare className="w-2.5 h-2.5" />
                                      {t.remarks?.length > 0 && <span>{t.remarks.length}</span>}
                                    </button>
                                    <button
                                      onClick={() => { sounds.playClick(); onEditTask(t); }}
                                      className="hover:text-blue-600 cursor-pointer"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      onClick={() => { sounds.playTrash(); onDeleteTask(t.id); }}
                                      className="hover:text-rose-600 cursor-pointer"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => { sounds.playClick(); onStatusChange(t.id, 'in_progress'); }}
                                    className="text-slate-500 hover:text-blue-600 font-medium hover:underline cursor-pointer"
                                    title="Reopen task"
                                  >
                                    ↺ Reopen
                                  </button>
                                </div>
                              </div>
                            ))}

                            {/* ALL Completed Books (Book 1, Book 2, etc.) */}
                            {member.completedBooks.map((b, bIdx) => (
                              <div 
                                key={b.id || bIdx} 
                                className="p-1.5 rounded-lg bg-emerald-50/80 border border-emerald-300/80 shadow-2xs space-y-1 text-[10px]"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-emerald-950 truncate">
                                    {member.regularCompletedTasks.length + bIdx + 1}. 📚 {b.title || 'Book'}
                                  </span>
                                  <span className="text-[8px] font-black px-1 py-0.2 rounded bg-emerald-200/90 text-emerald-900 shrink-0">
                                    ✓ Completed
                                  </span>
                                </div>
                                {b.author && (
                                  <div className="text-[9px] text-emerald-800 font-medium truncate">
                                    ✍️ {b.author}
                                  </div>
                                )}
                                <div className="flex items-center justify-between text-[9px] pt-0.5 text-emerald-700 font-semibold">
                                  <span>📖 {b.pages_read || b.total_pages || 0}/{b.total_pages || 0} pages</span>
                                  {b.presented && (
                                    <span className="text-[8.5px] px-1 py-0.2 rounded bg-purple-100 text-purple-800 font-bold">
                                      🎤 Presented
                                    </span>
                                  )}
                                </div>
                                {member.bookTask && (
                                  <div className="flex items-center justify-between text-[9px] pt-0.5 border-t border-emerald-200/70 text-slate-400">
                                    <button
                                      onClick={() => { sounds.playClick(); onEditTask(member.bookTask); }}
                                      className="text-emerald-800 hover:text-emerald-950 font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                                      title="Manage this book"
                                    >
                                      <Edit2 className="w-2.5 h-2.5" /> Manage
                                    </button>
                                    <button
                                      onClick={() => { sounds.playClick(); onEditTask(member.bookTask); }}
                                      className="text-slate-500 hover:text-blue-700 font-medium hover:underline cursor-pointer"
                                      title="Update book status"
                                    >
                                      Edit Status
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Remark Modal */}
      {activeRemarkTask && (
        <TaskRemarkModal
          isOpen={Boolean(activeRemarkTask)}
          onClose={() => {
            setActiveRemarkTask(null);
            setActiveRemarkCandidateTasks([]);
          }}
          task={tasks.find(t => t.id === activeRemarkTask.id) || activeRemarkTask}
          candidateTasks={activeRemarkCandidateTasks}
          allTasks={tasks}
          currentUser={currentUser}
          onSaveRemark={onSaveRemark}
          onDeleteRemark={onDeleteRemark}
        />
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

      {/* Book Reading Finish Confirmation Modal */}
      {bookToFinish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4 animate-slide-up">
            
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-xl shadow-2xs">
                  📖
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Book Reading Confirmation
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Confirm before marking as completed
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBookToFinish(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Question Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-slate-50 border border-indigo-100/80 space-y-2.5">
              <p className="text-sm font-bold text-slate-800">
                Have you completely finished reading this book?
              </p>
              
              {/* Book Details */}
              <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-1.5">
                <div className="font-extrabold text-slate-900 text-xs">
                  {bookToFinish.title}
                </div>
                {bookToFinish.description && (
                  <div className="text-[11px] text-slate-500 font-medium">
                    ✍️ {bookToFinish.description}
                  </div>
                )}
                {bookToFinish.book_stats && (
                  <div className="flex items-center justify-between text-[10.5px] font-bold text-indigo-700 pt-1 border-t border-slate-100">
                    <span>Pages Read: {bookToFinish.book_stats.total_pages_read || 0} / {bookToFinish.book_stats.total_pages || 0}</span>
                    <span>{bookToFinish.book_stats.total_pages > 0 ? Math.min(100, Math.round(((bookToFinish.book_stats.total_pages_read || 0) / bookToFinish.book_stats.total_pages) * 100)) : 100}%</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-600">
                • If <strong>YES</strong>, click <strong>"Yes, Mark as Completed"</strong>.<br/>
                • If <strong>NO</strong>, click <strong>"Update Pages / Edit Details"</strong> to log remaining pages or update info.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const task = bookToFinish;
                  setBookToFinish(null);
                  sounds.playClick();
                  onEditTask(task);
                }}
                className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer shadow-2xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Update Pages / Edit</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const taskId = bookToFinish.id;
                  setBookToFinish(null);
                  sounds.playComplete();
                  confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
                  onStatusChange(taskId, 'completed');
                }}
                className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all active:scale-98 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Yes, Finished!</span>
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setBookToFinish(null)}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
