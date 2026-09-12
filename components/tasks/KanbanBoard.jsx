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
  MessageSquare,
  Play
} from 'lucide-react';
import confetti from 'canvas-confetti';
import DailyReadingModal from '@/components/modals/DailyReadingModal';
import TaskRemarkModal from './TaskRemarkModal';
import { sounds } from '@/lib/audio';
const formatFriendlyDate = (dateStr, includeYear = true) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
      if (!isNaN(day) && monthIdx >= 0 && monthIdx < 12) {
        return includeYear ? `${day} ${months[monthIdx]} ${year}` : `${day} ${months[monthIdx]}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
      return includeYear ? `${day} ${months[d.getMonth()]} ${d.getFullYear()}` : `${day} ${months[d.getMonth()]}`;
    }
  } catch (e) {}
  return dateStr;
};

const formatDateRange = (startDate, dueDate) => {
  if (startDate && dueDate) {
    if (startDate === dueDate) return formatFriendlyDate(dueDate, false);
    const startYear = startDate.split('T')[0].split('-')[0];
    const dueYear = dueDate.split('T')[0].split('-')[0];
    if (startYear === dueYear) {
      return `${formatFriendlyDate(startDate, false)} - ${formatFriendlyDate(dueDate, false)}`;
    }
    return `${formatFriendlyDate(startDate, false)} - ${formatFriendlyDate(dueDate)}`;
  }
  if (dueDate) return formatFriendlyDate(dueDate, false);
  if (startDate) return `From ${formatFriendlyDate(startDate, false)}`;
  return '';
};

/**
 * Groups tasks chronologically by date (due_date preferred, then start_date, then 'no_date')
 */
const groupTasksByDate = (taskList, todayDateStr, isCompleted = false) => {
  if (!Array.isArray(taskList) || taskList.length === 0) return [];

  const groupsMap = {};
  const noDateTasks = [];

  taskList.forEach(t => {
    const rawDate = t.due_date || t.start_date;
    if (!rawDate) {
      noDateTasks.push(t);
      return;
    }

    const dateKey = String(rawDate).split('T')[0];
    if (!groupsMap[dateKey]) {
      groupsMap[dateKey] = [];
    }
    groupsMap[dateKey].push(t);
  });

  const sortedKeys = Object.keys(groupsMap).sort((a, b) => {
    const timeA = new Date(a).getTime();
    const timeB = new Date(b).getTime();
    if (isNaN(timeA)) return 1;
    if (isNaN(timeB)) return -1;
    return timeA - timeB;
  });

  const today = todayDateStr || new Date().toISOString().split('T')[0];
  const todayTime = new Date(today).getTime();

  const result = sortedKeys.map(key => {
    const groupTasks = groupsMap[key];
    const keyTime = new Date(key).getTime();

    let relativeStatus = 'upcoming';
    let relativeLabel = '';

    if (!isNaN(keyTime) && !isNaN(todayTime)) {
      const diffDays = Math.round((keyTime - todayTime) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        relativeStatus = 'today';
        relativeLabel = 'Today';
      } else if (diffDays === -1) {
        relativeStatus = isCompleted ? 'delivered' : 'past';
        relativeLabel = 'Yesterday';
      } else if (diffDays < -1) {
        relativeStatus = isCompleted ? 'delivered' : 'past';
        relativeLabel = isCompleted ? 'Delivered' : 'Overdue';
      } else if (diffDays === 1) {
        relativeStatus = 'tomorrow';
        relativeLabel = 'Tomorrow';
      } else {
        relativeStatus = 'upcoming';
      }
    }

    const friendlyDate = formatFriendlyDate(key, false);

    return {
      dateKey: key,
      label: friendlyDate || key,
      relativeLabel,
      relativeStatus,
      tasks: groupTasks
    };
  });

  if (noDateTasks.length > 0) {
    result.push({
      dateKey: 'no_date',
      label: 'No Due Date',
      relativeLabel: 'Flexible',
      relativeStatus: 'no_date',
      tasks: noDateTasks
    });
  }

  return result;
};

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
  setSelectedMemberFilter,
  statusFilter: externalStatusFilter,
  onStatusFilterChange
}) {
  const [activeDailyTask, setActiveDailyTask] = useState(null);
  const [activeRemarkTask, setActiveRemarkTask] = useState(null);
  const [activeRemarkCandidateTasks, setActiveRemarkCandidateTasks] = useState([]);
  const [bookToFinish, setBookToFinish] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [internalStatusFilter, setInternalStatusFilter] = useState('all');
  const [groupByDate, setGroupByDate] = useState(true);
  const todayStr = new Date().toISOString().split('T')[0];

  const statusFilter = externalStatusFilter !== undefined ? externalStatusFilter : internalStatusFilter;
  const setStatusFilter = (newFilter) => {
    setInternalStatusFilter(newFilter);
    if (onStatusFilterChange) onStatusFilterChange(newFilter);
  };

  const isAakash = currentUser?.id === 'usr_aakash' ||
                   currentUser?.name?.toLowerCase().includes('aakash');
  const selectedMemberObj = users.find(u => u.id === selectedMemberFilter);
  
  // Privacy Check
  const isAccessDenied = !isAakash && selectedMemberFilter && selectedMemberFilter !== 'all' && selectedMemberFilter !== currentUser?.id;

  // Base Task Pool for the selected member context (unfiltered by status/priority/search)
  const baseTasks = useMemo(() => {
    if (isAakash) {
      if (selectedMemberFilter && selectedMemberFilter !== 'all') {
        return tasks.filter(t => t.assigned_to === selectedMemberFilter);
      }
      return tasks;
    }
    return tasks.filter(t => t.assigned_to === currentUser?.id);
  }, [tasks, isAakash, selectedMemberFilter, currentUser?.id]);

  const baseOverdueCount = useMemo(() => {
    const now = new Date(todayStr).getTime();
    return baseTasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date).getTime() < now).length;
  }, [baseTasks, todayStr]);

  const basePendingCount = useMemo(() => {
    return baseTasks.filter(t => t.status !== 'completed').length;
  }, [baseTasks]);

  const baseCompletedCount = useMemo(() => {
    return baseTasks.filter(t => t.status === 'completed').length;
  }, [baseTasks]);

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
    const now = new Date(todayStr).getTime();

    const result = base.filter(task => {
      const matchesSearch = 
        !query ||
        task.title?.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query)) ||
        (task.assignee_name && task.assignee_name.toLowerCase().includes(query)) ||
        (task.tags && task.tags.some(t => t.toLowerCase().includes(query)));

      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

      const isTaskCompleted = task.status === 'completed';
      const isTaskOverdue = !isTaskCompleted && task.due_date && new Date(task.due_date).getTime() < now;

      let matchesStatus = true;
      if (statusFilter === 'pending') {
        matchesStatus = !isTaskCompleted;
      } else if (statusFilter === 'overdue') {
        matchesStatus = isTaskOverdue;
      } else if (statusFilter === 'completed') {
        matchesStatus = isTaskCompleted;
      }

      return matchesSearch && matchesPriority && matchesStatus;
    });

    const priorityWeights = { urgent: 4, high: 3, medium: 2, low: 1 };

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
  }, [tasks, selectedMemberFilter, isAakash, currentUser?.id, searchQuery, priorityFilter, statusFilter, todayStr]);

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

      // Filter books based on active statusFilter
      if (statusFilter === 'pending') {
        completedBooks = [];
      } else if (statusFilter === 'completed') {
        inProgressBooks = [];
      } else if (statusFilter === 'overdue') {
        const isBookOverdue = bookTask && bookTask.due_date && new Date(bookTask.due_date).getTime() < new Date(todayStr).getTime() && bookTask.status !== 'completed';
        if (!isBookOverdue) {
          inProgressBooks = [];
          completedBooks = [];
        } else {
          completedBooks = [];
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
    }).filter(m => {
      if (statusFilter !== 'all') {
        return m.total > 0;
      }
      return m.total > 0 || (isAakash && (!selectedMemberFilter || selectedMemberFilter === 'all' || selectedMemberFilter === m.user.id));
    });
  }, [users, filteredTasks, isAakash, selectedMemberFilter, currentUser?.id, statusFilter, todayStr]);

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

  return (
    <div className="space-y-4 w-full">
      
      {/* Subheader / Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Left: Title + 1-Click Status Filter Tabs */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {isAakash ? (
              <Crown className="w-4 h-4 text-amber-500 shrink-0" />
            ) : (
              <Layers className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <h2 className="text-sm font-bold text-slate-800 whitespace-nowrap">
              {boardTitle}
            </h2>
            {isAakash && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-extrabold border border-amber-200 shrink-0">
                Admin Mode
              </span>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Interactive 1-Click Status Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 flex-wrap">
            <button
              onClick={() => {
                sounds.playClick();
                setStatusFilter('all');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>All Tasks</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${statusFilter === 'all' ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/70 text-slate-600'}`}>
                {baseTasks.length}
              </span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-800 bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200/60'
              }`}
              title="Click to view pending tasks"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'pending' ? 'bg-white' : 'bg-amber-500 animate-pulse'}`} />
              <span>Pending</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {basePendingCount}
              </span>
            </button>

            {baseOverdueCount > 0 && (
              <button
                onClick={() => {
                  sounds.playClick();
                  setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'overdue'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/60'
                }`}
                title="Click to view overdue tasks"
              >
                <Flame className={`w-3.5 h-3.5 ${statusFilter === 'overdue' ? 'text-white' : 'text-rose-600'}`} />
                <span>Overdue</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${statusFilter === 'overdue' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'}`}>
                  {baseOverdueCount}
                </span>
              </button>
            )}

            <button
              onClick={() => {
                sounds.playClick();
                setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100/80 border border-emerald-200/60'
              }`}
              title="Click to view completed tasks"
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${statusFilter === 'completed' ? 'text-white' : 'text-emerald-600'}`} />
              <span>Done</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${statusFilter === 'completed' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                {baseCompletedCount}
              </span>
            </button>
          </div>
        </div>

        {/* Right Controls: Date Grouping & Priority Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Sections Toggle Button */}
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setGroupByDate(prev => !prev);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs active:scale-95 ${
              groupByDate
                ? 'bg-blue-50 text-blue-700 border-blue-200/90 shadow-xs'
                : 'bg-slate-100/90 text-slate-500 border-slate-200/80 hover:bg-slate-200/80'
            }`}
            title="Toggle Date-wise Section Grouping inside columns"
          >
            <Calendar className={`w-3.5 h-3.5 ${groupByDate ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>Date Sections: {groupByDate ? 'ON' : 'OFF'}</span>
          </button>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Priority:
            </span>
            {['all', 'urgent', 'high', 'medium', 'low'].map((p) => {
              const dotColors = {
                urgent: 'text-rose-500',
                high: 'text-amber-500',
                medium: 'text-indigo-500',
                low: 'text-slate-400'
              };
              return (
                <button
                  key={p}
                  onClick={() => { sounds.playClick(); setPriorityFilter(p); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer flex items-center gap-1 ${
                    priorityFilter === p
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p !== 'all' && <span className={priorityFilter === p ? 'text-white' : dotColors[p]}>●</span>}
                  <span>{p}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Active Filter Notification Banner */}
      {statusFilter !== 'all' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-blue-900 animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold flex items-center gap-1.5">
              {statusFilter === 'pending' && <Clock className="w-4 h-4 text-amber-600" />}
              {statusFilter === 'overdue' && <Flame className="w-4 h-4 text-rose-600" />}
              {statusFilter === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              Showing {statusFilter === 'overdue' ? '🔥 Overdue Tasks Only' : statusFilter === 'pending' ? '⏳ Pending / In-Progress Tasks Only' : '✓ Completed Tasks Only'}
            </span>
            <span className="text-blue-700 bg-white/90 px-2 py-0.5 rounded-md font-semibold border border-blue-100">
              {filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'} found
            </span>
          </div>
          <button
            onClick={() => { sounds.playClick(); setStatusFilter('all'); }}
            className="font-bold text-blue-700 hover:text-blue-950 hover:underline flex items-center gap-1 text-xs cursor-pointer bg-white/60 hover:bg-white px-2.5 py-1 rounded-lg transition-all"
          >
            Show All Tasks ✕
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold shadow-sm">
            ✨
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {statusFilter !== 'all' 
                ? `No ${statusFilter === 'overdue' ? 'Overdue' : statusFilter === 'pending' ? 'Pending' : 'Completed'} Tasks Found`
                : (isAakash && selectedMemberObj ? `No Tasks Found for ${selectedMemberObj.name}` : 'No Tasks in this Workspace')
              }
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {statusFilter !== 'all'
                ? `There are currently no tasks matching the ${statusFilter} filter.`
                : `Create a new task and assign it to ${selectedMemberObj ? selectedMemberObj.name : 'any team member'}.`
              }
            </p>
          </div>
          {statusFilter !== 'all' ? (
            <button
              onClick={() => { sounds.playClick(); setStatusFilter('all'); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <span>Show All Tasks</span>
            </button>
          ) : (
            <button
              onClick={() => { sounds.playClick(); openNewTaskModal('todo'); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          )}
        </div>
      ) : (
        /* EXCEL SPREADSHEET 4-STATUS MATRIX (To Do, In Progress, Blocked, Completed Columns) */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm w-full overflow-hidden">
          <table className="w-full table-fixed text-left text-xs border-collapse">
            <colgroup>
              <col style={{ width: '3%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '20.5%' }} />
              <col style={{ width: '21.5%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>
            {/* Executive Table Header - Anchored at the top of the table */}
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[10.5px]">
                <th style={{ width: '3%' }} className="py-2.5 px-1 text-center border-r border-slate-800 border-b-2 border-b-slate-700 bg-slate-900 font-semibold text-slate-400">
                  #
                </th>
                <th style={{ width: '14%' }} className="py-2.5 px-2 border-r border-slate-800 border-b-2 border-b-slate-500 bg-slate-900">
                  <div className="flex items-center gap-1.5 text-slate-200">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Candidate / Member</span>
                  </div>
                </th>
                <th style={{ width: '20.5%' }} className="py-2.5 px-2 border-r border-slate-800 border-b-2 border-b-slate-400 bg-slate-900">
                  <div className="flex items-center gap-1.5 text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-slate-400 ring-2 ring-slate-400/30 shrink-0" />
                    <span>To Do</span>
                  </div>
                </th>
                <th style={{ width: '21.5%' }} className="py-2.5 px-2 border-r border-slate-800 border-b-2 border-b-blue-500 bg-slate-900">
                  <div className="flex items-center gap-1.5 text-blue-300">
                    <span className="w-2 h-2 rounded-full bg-blue-400 ring-2 ring-blue-400/30 animate-pulse shrink-0" />
                    <span>In Progress</span>
                  </div>
                </th>
                <th style={{ width: '12%' }} className="py-2.5 px-1.5 border-r border-slate-800 border-b-2 border-b-indigo-500 bg-slate-900 text-center">
                  <div className="flex items-center justify-center gap-1 text-indigo-300">
                    <Layers className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span>Workload</span>
                  </div>
                </th>
                <th style={{ width: '13%' }} className="py-2.5 px-2 border-r border-slate-800 border-b-2 border-b-rose-500 bg-slate-900">
                  <div className="flex items-center gap-1.5 text-rose-300">
                    <span className="w-2 h-2 rounded-full bg-rose-400 ring-2 ring-rose-400/30 shrink-0" />
                    <span>Blocked</span>
                  </div>
                </th>
                <th style={{ width: '16%' }} className="py-2.5 px-2 border-b-2 border-slate-800 border-b-emerald-500 bg-slate-900">
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30 shrink-0" />
                    <span>Completed</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
                {memberMatrixData.map((member, idx) => {
                  const user = member.user;
                  const isLastRow = idx === memberMatrixData.length - 1;
                  const borderBottomClass = isLastRow ? '' : 'border-b border-slate-200/80';
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
                      className="hover:brightness-[0.98] transition-all"
                    >
                      {/* 1. Row # */}
                      <td className={`py-2 px-1 text-center font-semibold text-slate-400 border-r border-slate-200/70 bg-gradient-to-b from-slate-100/90 to-slate-50/60 align-top ${borderBottomClass}`}>
                        {idx + 1}
                      </td>

                      {/* 2. Candidate / Team Member Profile + Quick Action Buttons */}
                      <td className={`py-2 px-2 border-r border-slate-200/70 align-top bg-gradient-to-b from-slate-100/70 via-slate-50/40 to-slate-100/30 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] ${borderBottomClass}`}>
                        <div className="h-full min-h-[110px] flex flex-col justify-between space-y-2 p-2 rounded-xl bg-white/85 backdrop-blur-xs border border-slate-200/80 shadow-2xs min-w-0 overflow-hidden">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="relative shrink-0">
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shadow-xs"
                                  style={{ backgroundColor: user.color || '#2563eb' }}
                                >
                                  {user.avatar || '??'}
                                </div>
                                <span 
                                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                    user.status === 'online' ? 'bg-emerald-500 shadow-xs' : 'bg-slate-300'
                                  }`}
                                  title={user.status === 'online' ? 'Online' : 'Offline'}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-slate-900 text-[11.5px] leading-snug truncate" title={user.name}>
                                  {user.name}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded capitalize">
                                    {user.role}
                                  </span>
                                  <span className={`text-[8.5px] font-medium ${user.status === 'online' ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                                    {user.status === 'online' ? 'Active' : 'Offline'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex flex-col gap-1 pt-0.5 w-full">
                              <button
                                type="button"
                                onClick={() => {
                                  sounds.playClick();
                                  openNewTaskModal('todo', user.id);
                                }}
                                className="w-full py-1 px-2 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-[10px] flex items-center justify-center gap-1 shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
                                title={`Add task for ${user.name}`}
                              >
                                <Plus className="w-3 h-3 stroke-[2.5] shrink-0" />
                                <span>Add Task</span>
                              </button>

                              {member.bookTask ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    sounds.playClick();
                                    onEditTask(member.bookTask);
                                  }}
                                  className="w-full py-1 px-2 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/90 active:scale-95 font-semibold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                                  title="Manage books"
                                >
                                  <BookOpen className="w-3 h-3 text-indigo-600 shrink-0" />
                                  <span>Books ({member.bookTask.books_list?.length || 1})</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    sounds.playClick();
                                    openNewTaskModal('in_progress', user.id);
                                  }}
                                  className="w-full py-1 px-2 rounded-md bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80 active:scale-95 font-semibold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                                  title="Assign a book reading task"
                                >
                                  <BookOpen className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span>+ Book</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Stat Pill */}
                          <div className="pt-1.5 border-t border-slate-200/60 mt-auto space-y-0.5">
                            <div className="px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200/70 flex items-center justify-between text-[9px]">
                              <span className="text-slate-500 font-medium">Sprint Total</span>
                              <span className="font-bold text-slate-800 bg-white px-1 py-0.2 rounded shadow-2xs border border-slate-200/60">{member.total} tasks</span>
                            </div>
                            <div className="text-[8px] text-slate-400 font-medium text-center">
                              {completedCount} of {member.total} done ({completionRate}%)
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. TO DO COLUMN */}
                      <td className={`py-2 px-2 border-r border-slate-200/70 align-top bg-gradient-to-b from-slate-100/70 via-slate-50/40 to-slate-100/30 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] ${borderBottomClass}`}>
                        {member.todoTasks.length === 0 ? (
                          <div className="h-full min-h-[140px] flex flex-col items-center justify-center p-3 rounded-xl bg-white/80 backdrop-blur-xs border border-dashed border-slate-300 text-center space-y-1 shadow-2xs transition-all">
                            <div className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center text-xs shadow-2xs font-bold">
                              📝
                            </div>
                            <span className="font-bold text-slate-700 text-xs">No tasks queued</span>
                            <span className="text-[9px] text-slate-400 font-medium">All caught up</span>
                          </div>
                        ) : (
                          <div className="w-full h-full min-h-[110px] space-y-1.5 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              {/* Track Header */}
                              <div className="flex items-center justify-between text-[9.5px] text-slate-700 font-semibold px-0.5 pb-0.5 border-b border-slate-200/70">
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  <span>To Do Queue</span>
                                </span>
                                <span className="text-[8.5px] font-semibold text-slate-500 bg-white border border-slate-200 px-1 py-0.2 rounded shadow-2xs">
                                  {member.todoTasks.length} {member.todoTasks.length === 1 ? 'task' : 'tasks'}
                                </span>
                              </div>

                              {/* Stacked Cards with Date Sections */}
                              <div className="flex flex-col gap-2 w-full min-w-0">
                                {(() => {
                                  const todoGroups = groupByDate
                                    ? groupTasksByDate(member.todoTasks, todayStr)
                                    : [{ dateKey: 'all', tasks: member.todoTasks }];

                                  return todoGroups.map(group => (
                                    <div key={group.dateKey} className="space-y-1 w-full min-w-0">
                                      {group.dateKey !== 'all' && (
                                        <div className="flex items-center justify-between px-1.5 py-0.5 rounded-md bg-slate-100/90 border border-slate-200/90 text-[8.5px] font-semibold text-slate-700">
                                          <span className="flex items-center gap-1 min-w-0">
                                            <Calendar className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                                            <span className="truncate font-bold text-slate-800">{group.label}</span>
                                            {group.relativeLabel && (
                                              <span className={`text-[7px] px-1 py-0.1 rounded font-bold uppercase shrink-0 ${
                                                group.relativeStatus === 'today' ? 'bg-blue-100 text-blue-800' :
                                                group.relativeStatus === 'past' ? 'bg-rose-100 text-rose-800' :
                                                'bg-slate-200/80 text-slate-600'
                                              }`}>
                                                {group.relativeLabel}
                                              </span>
                                            )}
                                          </span>
                                          <span className="text-[7.5px] font-bold text-slate-500 bg-white border border-slate-200 px-1 py-0.1 rounded shrink-0 shadow-2xs">
                                            {group.tasks.length}
                                          </span>
                                        </div>
                                      )}

                                      <div className="flex flex-col gap-1.5 w-full min-w-0">
                                        {group.tasks.map((t, tIdx) => (
                                          <div 
                                            key={t.id} 
                                            className="w-full p-2 rounded-lg bg-white border border-slate-200/80 border-l-2 border-l-slate-300 hover:border-l-blue-500 shadow-2xs hover:shadow-xs space-y-1 flex flex-col justify-between transition-all overflow-hidden min-w-0"
                                          >
                                            <div className="min-w-0">
                                              <div className="flex items-start justify-between gap-1.5 min-w-0">
                                                <span className="font-semibold text-slate-800 leading-tight text-[11px] min-w-0 flex-1 break-words line-clamp-2" title={t.title}>
                                                  <span className="text-slate-400 font-semibold text-[10px] mr-1 shrink-0">#{tIdx + 1}</span>
                                                  <span className="break-words">{t.title}</span>
                                                </span>
                                                <span className={`text-[8px] font-semibold px-1 py-0.2 rounded uppercase shrink-0 shadow-2xs whitespace-nowrap ${
                                                  t.priority === 'urgent' ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80' :
                                                  t.priority === 'high' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80' :
                                                  t.priority === 'medium' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/80' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'
                                                }`}>
                                                  {t.priority || 'normal'}
                                                </span>
                                              </div>
                                              {t.description && (
                                                <p className="text-[9.5px] text-slate-500 line-clamp-2 mt-0.5 break-words" title={t.description}>{t.description}</p>
                                              )}

                                              {/* Remark Preview */}
                                              {(t.latest_remark || t.remarks?.[0]?.text) && (
                                                <div
                                                  onClick={() => { sounds.playClick(); setActiveRemarkTask(t); setActiveRemarkCandidateTasks(candidateTasks); }}
                                                  className="mt-1 p-1 rounded-md bg-indigo-50/60 hover:bg-indigo-50 border border-indigo-100/80 text-[9px] text-indigo-950 flex items-center gap-1 cursor-pointer transition-colors"
                                                  title="Click to view/add remarks"
                                                >
                                                  <MessageSquare className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                                  <span className="truncate italic">"{t.latest_remark || t.remarks?.[0]?.text}"</span>
                                                  {t.remarks?.length > 1 && (
                                                    <span className="px-1 rounded bg-indigo-200/70 text-[7.5px] font-bold text-indigo-900 shrink-0">
                                                      +{t.remarks.length - 1}
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between pt-1 border-t border-slate-100 text-[8.5px] gap-1">
                                              <div className="flex items-center gap-1 text-slate-400 shrink-0">
                                                <span>{formatDateRange(t.start_date, t.due_date) ? `📅 ${formatDateRange(t.start_date, t.due_date)}` : 'No date'}</span>
                                              </div>
                                              <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={() => { sounds.playClick(); setActiveRemarkTask(t); setActiveRemarkCandidateTasks(candidateTasks); }}
                                                  className={`inline-flex items-center gap-0.5 text-[8px] px-1 py-0.2 rounded cursor-pointer transition-colors ${
                                                    t.remarks?.length > 0
                                                      ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                                                      : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                                                  }`}
                                                  title={t.remarks?.length > 0 ? `${t.remarks.length} remark(s)` : 'Add Remark'}
                                                >
                                                  <MessageSquare className="w-2.5 h-2.5 text-indigo-600" />
                                                  <span>{t.remarks?.length > 0 ? t.remarks.length : 'Remark'}</span>
                                                </button>
                                                <button
                                                  onClick={() => { sounds.playClick(); onEditTask(t); }}
                                                  className="text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded p-0.5 cursor-pointer transition-colors"
                                                  title="Edit Task"
                                                >
                                                  <Edit2 className="w-2.5 h-2.5" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    if (sounds.playTrash) sounds.playTrash();
                                                    else sounds.playClick();
                                                    onDeleteTask(t.id);
                                                  }}
                                                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded p-0.5 cursor-pointer transition-colors"
                                                  title="Delete Task"
                                                >
                                                  <Trash2 className="w-2.5 h-2.5" />
                                                </button>
                                                <button
                                                  onClick={() => { sounds.playClick(); onStatusChange(t.id, 'in_progress'); }}
                                                  className="text-blue-600 font-bold hover:underline cursor-pointer ml-0.5 text-[8.5px]"
                                                >
                                                  Start →
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ));
                                })()}
                              </div>
                            </div>

                            {/* Minimalist Quick Add Slot */}
                            <button
                              type="button"
                              onClick={() => { sounds.playClick(); openNewTaskModal('todo', user.id); }}
                              className="w-full mt-1.5 py-1 px-2 rounded-md border border-dashed border-slate-300/80 hover:border-blue-400 hover:bg-white text-slate-400 hover:text-blue-600 font-semibold text-[9px] flex items-center justify-center gap-1 transition-all cursor-pointer opacity-75 hover:opacity-100"
                              title={`Add task for ${user.name}`}
                            >
                              <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
                              <span>+ Add Task</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 4. IN PROGRESS COLUMN */}
                      <td className={`py-2 px-2 border-r border-slate-200/70 align-top bg-gradient-to-b from-blue-50/50 via-blue-50/20 to-slate-50/30 bg-[radial-gradient(#bfdbfe_1px,transparent_1px)] [background-size:16px_16px] ${borderBottomClass}`}>
                        {member.inProgressTasks.length === 0 && (!member.bookTask || member.inProgressBooks.length === 0) ? (
                          <div className="h-full min-h-[140px] flex flex-col items-center justify-center p-3 rounded-xl bg-white/80 backdrop-blur-xs border border-dashed border-blue-200 text-center space-y-1 shadow-2xs transition-all">
                            <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center text-xs shadow-2xs font-bold">
                              ⚡
                            </div>
                            <span className="font-bold text-slate-700 text-xs">No active tasks</span>
                            <span className="text-[9px] text-slate-400 font-medium">Ready for next assignment</span>
                            <button
                              type="button"
                              onClick={() => { sounds.playClick(); openNewTaskModal('in_progress', user.id); }}
                              className="mt-1 py-1 px-2.5 rounded-lg border border-dashed border-blue-300 hover:border-blue-500 bg-white hover:bg-blue-50 text-blue-700 font-bold text-[9px] flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                            >
                              <Play className="w-2.5 h-2.5 fill-blue-600 text-blue-600" />
                              <span>+ Start Task</span>
                            </button>
                          </div>
                        ) : (
                          <div className="w-full h-full min-h-[110px] space-y-1.5 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              {/* Track Sub-header */}
                              <div className="flex items-center justify-between text-[9px] text-blue-900 font-semibold px-0.5 pb-0.5 border-b border-blue-100">
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                  <span className="text-[9px] font-semibold text-slate-500">In Execution</span>
                                </span>
                                <span className="text-[8.5px] font-bold text-blue-700 bg-white border border-blue-200/70 px-1 py-0.2 rounded shadow-2xs">
                                  {member.inProgressTasks.length + (member.bookTask && member.inProgressBooks.length > 0 ? 1 : 0)}
                                </span>
                              </div>

                              {/* Stacked Cards with Date Sections */}
                              <div className="flex flex-col gap-2 w-full min-w-0">
                                {(() => {
                                  const inProgressGroups = groupByDate
                                    ? groupTasksByDate(member.inProgressTasks, todayStr)
                                    : [{ dateKey: 'all', tasks: member.inProgressTasks }];

                                  return inProgressGroups.map(group => (
                                    <div key={group.dateKey} className="space-y-1 w-full min-w-0">
                                      {group.dateKey !== 'all' && (
                                        <div className="flex items-center justify-between px-1.5 py-0.5 rounded-md bg-blue-50/80 border border-blue-200/80 text-[8.5px] font-semibold text-blue-900">
                                          <span className="flex items-center gap-1 min-w-0">
                                            <Calendar className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                            <span className="truncate font-bold text-blue-950">{group.label}</span>
                                            {group.relativeLabel && (
                                              <span className={`text-[7px] px-1 py-0.1 rounded font-bold uppercase shrink-0 ${
                                                group.relativeStatus === 'today' ? 'bg-blue-200/80 text-blue-900' :
                                                group.relativeStatus === 'past' ? 'bg-rose-100 text-rose-800' :
                                                'bg-blue-100/80 text-blue-700'
                                              }`}>
                                                {group.relativeLabel}
                                              </span>
                                            )}
                                          </span>
                                          <span className="text-[7.5px] font-bold text-blue-700 bg-white border border-blue-200/80 px-1 py-0.1 rounded shrink-0 shadow-2xs">
                                            {group.tasks.length}
                                          </span>
                                        </div>
                                      )}

                                      <div className="flex flex-col gap-1.5 w-full min-w-0">
                                        {group.tasks.map((t, tIdx) => {
                                          const latestRemarkObj = Array.isArray(t.remarks) && t.remarks.length > 0
                                            ? t.remarks[0]
                                            : (t.latest_remark ? { text: t.latest_remark, author_name: 'Team Member' } : null);
                                          const remarksCount = Array.isArray(t.remarks) && t.remarks.length > 0 
                                            ? t.remarks.length 
                                            : (t.latest_remark ? 1 : 0);

                                          return (
                                            <div 
                                              key={t.id} 
                                              className="w-full p-2 rounded-lg bg-white border border-slate-200/80 border-l-2 border-l-blue-500 hover:border-blue-300 shadow-2xs space-y-1 flex flex-col justify-between transition-all overflow-hidden min-w-0"
                                            >
                                              <div className="min-w-0">
                                                <div className="flex items-start justify-between gap-1.5 min-w-0">
                                                  <span className="font-semibold text-slate-900 leading-snug text-[11px] flex items-start gap-1 min-w-0 flex-1 break-words line-clamp-2" title={t.title}>
                                                    <span className="text-[10px] text-blue-600 font-semibold shrink-0 mt-0.5">#{tIdx + 1}</span>
                                                    <span className="break-words">{t.title}</span>
                                                  </span>
                                                  <span className={`text-[8px] font-semibold px-1 py-0.2 rounded uppercase shrink-0 whitespace-nowrap ${
                                                    t.priority === 'urgent' ? 'bg-rose-50 text-rose-700 border border-rose-200/70' :
                                                    t.priority === 'high' ? 'bg-amber-50 text-amber-700 border border-amber-200/70' :
                                                    t.priority === 'medium' ? 'bg-blue-50 text-blue-700 border border-blue-200/70' : 'bg-slate-50 text-slate-600 border border-slate-200/70'
                                                  }`}>
                                                    {t.priority || 'Normal'}
                                                  </span>
                                                </div>
                                                {t.description && (
                                                  <p className="text-[9.5px] text-slate-500 line-clamp-2 mt-0.5 pl-3 break-words" title={t.description}>
                                                    {t.description}
                                                  </p>
                                                )}

                                                {/* Remark Snippet */}
                                                {latestRemarkObj && (
                                                  <div
                                                    onClick={() => { sounds.playClick(); setActiveRemarkTask(t); setActiveRemarkCandidateTasks(candidateTasks); }}
                                                    className="mt-1 p-1 rounded-md bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/70 hover:border-indigo-200 cursor-pointer transition-all space-y-0.5 group"
                                                    title="Click to view remark log"
                                                  >
                                                    <div className="flex items-center justify-between text-[8px] font-semibold text-slate-600 group-hover:text-indigo-900">
                                                      <span className="truncate max-w-[120px] flex items-center gap-1">
                                                        <MessageSquare className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                                        {latestRemarkObj.author_name || 'Remark'}
                                                      </span>
                                                      <span className="text-[7.5px] font-bold px-1 rounded bg-indigo-100/80 text-indigo-800">
                                                        💬 {remarksCount}
                                                      </span>
                                                    </div>
                                                    <p className="text-[8.5px] text-slate-600 leading-snug line-clamp-2 italic pl-1 border-l-2 border-indigo-400">
                                                      "{latestRemarkObj.text}"
                                                    </p>
                                                  </div>
                                                )}
                                              </div>

                                              {/* Action Micro-bar */}
                                              <div className="flex flex-wrap items-center justify-between pt-1 border-t border-slate-100 text-[8.5px] gap-1 w-full">
                                                <div className="flex items-center gap-1 min-w-0 flex-1">
                                                  <button
                                                    type="button"
                                                    onClick={() => { sounds.playClick(); setActiveRemarkTask(t); setActiveRemarkCandidateTasks(candidateTasks); }}
                                                    className={`inline-flex items-center gap-0.5 text-[8px] px-1 py-0.2 rounded cursor-pointer transition-colors shrink-0 ${
                                                      remarksCount > 0
                                                        ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/80'
                                                        : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'
                                                    }`}
                                                    title={remarksCount > 0 ? `${remarksCount} remark(s)` : 'Add Remark'}
                                                  >
                                                    <MessageSquare className="w-2 h-2 text-indigo-500 shrink-0" />
                                                    <span>{remarksCount > 0 ? remarksCount : 'Remark'}</span>
                                                  </button>
                                                  {(t.due_date || t.start_date) && (
                                                    <span 
                                                      className="text-[8px] text-slate-400 font-medium truncate"
                                                      title={t.start_date && t.due_date ? `${formatFriendlyDate(t.start_date)} to ${formatFriendlyDate(t.due_date)}` : (t.due_date ? `Due ${formatFriendlyDate(t.due_date)}` : `From ${formatFriendlyDate(t.start_date)}`)}
                                                    >
                                                      📅 {formatDateRange(t.start_date, t.due_date)}
                                                    </span>
                                                  )}
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    sounds.playClick();
                                                    onEditTask(t);
                                                  }}
                                                  className="inline-flex items-center gap-1 text-[8.5px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50/90 hover:bg-blue-100 border border-blue-200/80 px-1.5 py-0.5 rounded cursor-pointer transition-all shadow-2xs active:scale-95 shrink-0 ml-auto"
                                                  title="Update Task Details"
                                                >
                                                  <Edit2 className="w-2 h-2 text-blue-600 shrink-0" />
                                                  <span>Update</span>
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ));
                                })()}
                              </div>

                                {/* Book Reading Tracker in In-Progress */}
                                {member.bookTask && member.inProgressBooks.length > 0 && (() => {
                                  const t = member.bookTask;
                                  const stats = t.book_stats || {};
                                  const readP = Number(stats.total_pages_read) || 0;
                                  const totalP = Number(stats.total_pages) || 0;
                                  const pct = totalP > 0 ? Math.min(100, Math.round((readP / totalP) * 100)) : 0;

                                  return (
                                    <div 
                                      key={t.id} 
                                      className="w-full p-2 rounded-lg bg-white border border-slate-200/80 border-l-2 border-l-indigo-500 hover:border-indigo-300 shadow-2xs space-y-1 flex flex-col justify-between transition-all"
                                    >
                                      <div>
                                        <div className="flex items-start justify-between gap-1">
                                          <span className="font-semibold text-indigo-950 leading-snug flex items-center gap-1 text-[11px]">
                                            <BookOpen className="w-3 h-3 text-indigo-600 shrink-0" />
                                            <span>Active Reading ({member.inProgressBooks.length})</span>
                                          </span>
                                          <span className="text-[8px] font-semibold px-1 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/70 shrink-0">
                                            Reading
                                          </span>
                                        </div>

                                        {/* Multi-Book In-Progress list */}
                                        <div className="space-y-0.5 pt-1 max-h-[80px] overflow-y-auto no-scrollbar pr-0.5">
                                          {member.inProgressBooks.map((b, bIdx) => (
                                            <div key={b.id || bIdx} className="p-1 rounded bg-slate-50 border border-slate-200/70 text-[9px] flex items-center justify-between gap-1">
                                              <span className="truncate font-medium text-slate-800 max-w-[130px]" title={b.title}>
                                                <span className="text-[8.5px] text-indigo-600 font-semibold mr-1">#{bIdx + 1}</span>
                                                {b.title}
                                              </span>
                                              <span className="px-1 py-0.2 rounded text-[8px] font-semibold shrink-0 bg-blue-50 text-blue-700 border border-blue-200/60">
                                                {b.pages_read || 0}/{b.total_pages || 0} pgs
                                              </span>
                                            </div>
                                          ))}
                                        </div>

                                        {/* Progress bar for book reading */}
                                        {totalP > 0 && (
                                          <div className="space-y-0.5 pt-1">
                                            <div className="flex items-center justify-between text-[8.5px] font-medium text-slate-600">
                                              <span>{readP}/{totalP} pgs</span>
                                              <span className="text-indigo-600 font-bold">{pct}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden border border-slate-200/60">
                                              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: `${pct}%` }} />
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[8.5px] gap-1 flex-wrap">
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => { sounds.playClick(); setActiveDailyTask(t); }}
                                            className="px-1 py-0.2 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200/70 inline-flex items-center gap-0.5 cursor-pointer shadow-2xs text-[8px]"
                                          >
                                            <Sparkles className="w-2 h-2" /> Log
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => { sounds.playClick(); onEditTask(t); }}
                                            className="px-1 py-0.2 rounded bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 inline-flex items-center gap-0.5 cursor-pointer shadow-2xs text-[8px]"
                                            title="Manage books"
                                          >
                                            <Edit2 className="w-2 h-2 text-slate-500" /> Books
                                          </button>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            sounds.playClick();
                                            setBookToFinish(t);
                                          }}
                                          className="text-emerald-700 font-bold hover:underline cursor-pointer text-[8.5px]"
                                        >
                                          Finish ✓
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                            {/* Minimalist Quick Add Slot */}
                            <button
                              type="button"
                              onClick={() => { sounds.playClick(); openNewTaskModal('in_progress', user.id); }}
                              className="w-full mt-1.5 py-1 px-2 rounded-md border border-dashed border-blue-300/80 hover:border-blue-500 hover:bg-white text-blue-600 font-semibold text-[9px] flex items-center justify-center gap-1 transition-all cursor-pointer opacity-75 hover:opacity-100"
                              title="Assign an in-progress task"
                            >
                              <Play className="w-2 h-2 fill-blue-600 text-blue-600" />
                              <span>+ Start Task</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 5. Workload Summary & KPI */}
                      <td className={`py-2 px-1.5 border-r border-slate-200/70 align-top bg-gradient-to-b from-indigo-50/50 via-indigo-50/20 to-slate-50/30 bg-[radial-gradient(#e0e7ff_1px,transparent_1px)] [background-size:16px_16px] ${borderBottomClass}`}>
                        <div className="h-full min-h-[110px] flex flex-col justify-between p-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs space-y-1.5 min-w-0 overflow-hidden">
                          <div>
                            <div className="flex items-center justify-between pb-1 border-b border-slate-100 min-w-0">
                              <span className="text-[8.5px] font-semibold text-slate-400 uppercase tracking-wide truncate">Velocity</span>
                              <span className={`text-[8.5px] font-bold px-1 py-0.2 rounded shrink-0 ${
                                completionRate >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                                completionRate >= 40 ? 'bg-blue-50 text-blue-700 border border-blue-200/60' :
                                'bg-slate-50 text-slate-600 border border-slate-200/60'
                              }`}>
                                {completionRate}%
                              </span>
                            </div>

                            <div className="mt-1.5 space-y-1 min-w-0">
                              <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-800 min-w-0">
                                <span className="truncate">Delivered</span>
                                <span className="text-slate-900 font-bold shrink-0">{member.totalCompletedCount} <span className="text-slate-400 font-normal text-[9px]">/ {member.total}</span></span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/50">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                                  style={{ width: `${completionRate}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1 pt-1 border-t border-slate-100 min-w-0">
                            {member.totalPages > 0 && (
                              <div className="text-[8px] font-medium text-indigo-900 bg-indigo-50/80 px-1 py-0.5 rounded border border-indigo-100/70 truncate flex items-center justify-between min-w-0">
                                <span className="truncate">📖 Reading</span>
                                <span className="font-bold shrink-0 ml-1">{member.pagesRead}/{member.totalPages} pgs</span>
                              </div>
                            )}
                            <div className="flex items-center justify-center gap-1 text-[8px] text-slate-500 font-medium truncate">
                              <span className="text-emerald-700 font-semibold shrink-0">{completedCount} done</span>
                              <span className="text-slate-300 shrink-0">•</span>
                              <span className="text-slate-500 shrink-0">{member.total - completedCount} open</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 6. BLOCKED COLUMN */}
                      <td className={`py-2 px-2 border-r border-slate-200/70 align-top bg-gradient-to-b from-rose-50/50 via-rose-50/20 to-slate-50/30 bg-[radial-gradient(#fecdd3_1px,transparent_1px)] [background-size:16px_16px] ${borderBottomClass}`}>
                        {member.blockedTasks.length === 0 ? (
                          <div className="h-full min-h-[140px] flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/80 backdrop-blur-xs border border-dashed border-emerald-200 text-center space-y-1 shadow-2xs transition-all min-w-0 overflow-hidden">
                            <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center text-xs shadow-2xs font-bold shrink-0">
                              ✓
                            </div>
                            <span className="font-bold text-emerald-950 text-xs truncate max-w-full">Pipeline Clear</span>
                            <span className="text-[9px] text-slate-400 font-medium truncate max-w-full">Zero blockers</span>
                          </div>
                        ) : (
                          <div className="w-full h-full min-h-[110px] space-y-1.5 flex flex-col justify-between min-w-0">
                            <div className="space-y-1.5 min-w-0">
                              {/* Track Sub-header */}
                              <div className="flex items-center justify-between text-[9px] text-rose-950 font-semibold px-0.5 pb-0.5 border-b border-rose-100 min-w-0">
                                <span className="flex items-center gap-1 min-w-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                  <span className="text-[9px] font-semibold text-slate-500 truncate">Attention Needed</span>
                                </span>
                                <span className="text-[8.5px] font-bold text-rose-700 bg-white border border-rose-200/80 px-1 py-0.2 rounded shadow-2xs shrink-0">
                                  {member.blockedTasks.length}
                                </span>
                              </div>

                              {/* Stacked Cards with Date Sections */}
                              <div className="flex flex-col gap-2 w-full min-w-0">
                                {(() => {
                                  const blockedGroups = groupByDate
                                    ? groupTasksByDate(member.blockedTasks, todayStr)
                                    : [{ dateKey: 'all', tasks: member.blockedTasks }];

                                  return blockedGroups.map(group => (
                                    <div key={group.dateKey} className="space-y-1 w-full min-w-0">
                                      {group.dateKey !== 'all' && (
                                        <div className="flex items-center justify-between px-1.5 py-0.5 rounded-md bg-rose-50/80 border border-rose-200/80 text-[8.5px] font-semibold text-rose-900">
                                          <span className="flex items-center gap-1 min-w-0">
                                            <Calendar className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                                            <span className="truncate font-bold text-rose-950">{group.label}</span>
                                            {group.relativeLabel && (
                                              <span className={`text-[7px] px-1 py-0.1 rounded font-bold uppercase shrink-0 ${
                                                group.relativeStatus === 'today' ? 'bg-blue-100 text-blue-800' :
                                                group.relativeStatus === 'past' ? 'bg-rose-200/80 text-rose-900' :
                                                'bg-rose-100/80 text-rose-700'
                                              }`}>
                                                {group.relativeLabel}
                                              </span>
                                            )}
                                          </span>
                                          <span className="text-[7.5px] font-bold text-rose-700 bg-white border border-rose-200/80 px-1 py-0.1 rounded shrink-0 shadow-2xs">
                                            {group.tasks.length}
                                          </span>
                                        </div>
                                      )}

                                      <div className="flex flex-col gap-1.5 w-full min-w-0">
                                        {group.tasks.map((t, tIdx) => (
                                          <div 
                                            key={t.id} 
                                            className="w-full p-2 rounded-lg bg-white border border-slate-200/80 border-l-2 border-l-rose-500 hover:border-rose-300 shadow-2xs space-y-1 flex flex-col justify-between transition-all overflow-hidden min-w-0"
                                          >
                                            <div className="min-w-0">
                                              <div className="flex items-start justify-between gap-1 min-w-0">
                                                <span className="font-semibold text-slate-900 leading-snug text-[11px] flex items-start gap-1 min-w-0 flex-1 break-words line-clamp-2" title={t.title}>
                                                  <span className="text-[10px] text-rose-600 font-semibold shrink-0 mt-0.5">#{tIdx + 1}</span>
                                                  <span className="break-words">{t.title}</span>
                                                </span>
                                                <span className="text-[8px] font-semibold px-1 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200/70 shrink-0 uppercase whitespace-nowrap">
                                                  Blocked
                                                </span>
                                              </div>
                                              <p className="text-[9.5px] text-rose-700 line-clamp-2 mt-0.5 pl-3 font-medium break-words">{t.description || 'Action required'}</p>

                                              {/* Remark Preview */}
                                              {(t.latest_remark || t.remarks?.[0]?.text) && (
                                                <div
                                                  onClick={() => { sounds.playClick(); setActiveRemarkTask(t); setActiveRemarkCandidateTasks(candidateTasks); }}
                                                  className="mt-1 p-1 rounded-md bg-rose-50/60 hover:bg-rose-100/60 border border-rose-200/70 text-[8.5px] text-rose-950 flex items-center gap-1 cursor-pointer transition-colors min-w-0"
                                                  title="Click to view blocker remark"
                                                >
                                                  <MessageSquare className="w-2 h-2 text-rose-600 shrink-0" />
                                                  <span className="truncate italic font-medium">"{t.latest_remark || t.remarks?.[0]?.text}"</span>
                                                  {t.remarks?.length > 1 && (
                                                    <span className="px-1 rounded bg-rose-200/80 text-[7.5px] font-bold text-rose-900 shrink-0">
                                                      +{t.remarks.length - 1}
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between pt-1 border-t border-slate-100 text-[8.5px] gap-1 min-w-0">
                                              <div className="flex items-center gap-1 shrink-0 min-w-0">
                                                <button
                                                  type="button"
                                                  onClick={() => { sounds.playClick(); setActiveRemarkTask(t); setActiveRemarkCandidateTasks(candidateTasks); }}
                                                  className={`inline-flex items-center gap-0.5 text-[8px] px-1 py-0.2 rounded cursor-pointer transition-colors shrink-0 ${
                                                    t.remarks?.length > 0
                                                      ? 'bg-rose-50 text-rose-800 font-semibold border border-rose-200/80'
                                                      : 'text-slate-400 hover:text-rose-600 hover:bg-slate-50'
                                                  }`}
                                                  title={t.remarks?.length > 0 ? `${t.remarks.length} remark(s)` : 'Add Blocker Remark'}
                                                >
                                                  <MessageSquare className="w-2 h-2 text-rose-600" />
                                                  <span>{t.remarks?.length > 0 ? t.remarks.length : 'Remark'}</span>
                                                </button>
                                                {(t.due_date || t.start_date) && (
                                                  <span className="text-[8px] text-slate-400 font-medium truncate max-w-[80px]" title={formatDateRange(t.start_date, t.due_date)}>
                                                    📅 {formatDateRange(t.start_date, t.due_date)}
                                                  </span>
                                                )}
                                                <button
                                                  onClick={() => { sounds.playClick(); onEditTask(t); }}
                                                  className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5 shrink-0"
                                                  title="Edit Task"
                                                >
                                                  <Edit2 className="w-2 h-2" />
                                                </button>
                                                <button
                                                  onClick={() => { sounds.playTrash(); onDeleteTask(t.id); }}
                                                  className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5 shrink-0"
                                                  title="Delete"
                                                >
                                                  <Trash2 className="w-2 h-2" />
                                                </button>
                                              </div>
                                              <button
                                                onClick={() => { sounds.playClick(); onStatusChange(t.id, 'in_progress'); }}
                                                className="text-[8.5px] text-blue-600 font-semibold hover:underline cursor-pointer shrink-0 ml-auto"
                                              >
                                                Unblock →
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ));
                                })()}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 7. COMPLETED COLUMN */}
                      <td className={`py-2 px-2 align-top bg-gradient-to-b from-emerald-50/50 via-emerald-50/20 to-slate-50/30 bg-[radial-gradient(#a7f3d0_1px,transparent_1px)] [background-size:16px_16px] ${borderBottomClass}`}>
                        {member.regularCompletedTasks.length === 0 && member.completedBooks.length === 0 ? (
                          <div className="h-full min-h-[140px] flex flex-col items-center justify-center p-3 rounded-xl bg-white/80 backdrop-blur-xs border border-dashed border-slate-200 text-center space-y-1 shadow-2xs transition-all min-w-0 overflow-hidden">
                            <div className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center text-xs shadow-2xs">
                              ⏳
                            </div>
                            <span className="font-bold text-slate-600 text-xs">0 Completed</span>
                            <span className="text-[9px] text-slate-400 font-medium">Tasks in progress</span>
                          </div>
                        ) : (
                          <div className="w-full h-full min-h-[110px] space-y-1.5 flex flex-col justify-between min-w-0">
                            <div className="space-y-1.5 min-w-0">
                              {/* Track Sub-header */}
                              <div className="flex items-center justify-between text-[9px] text-emerald-950 font-semibold px-0.5 pb-0.5 border-b border-emerald-100 min-w-0">
                                <span className="flex items-center gap-1 min-w-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 shrink-0" />
                                  <span className="truncate">Delivered</span>
                                </span>
                                <span className="text-[8.5px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-200/60 font-semibold shrink-0">
                                  {member.regularCompletedTasks.length + member.completedBooks.length}
                                </span>
                              </div>

                              {/* Regular Finished Tasks with Date Grouping */}
                              {(() => {
                                const completedGroups = groupTasksByDate(member.regularCompletedTasks, todayStr, true);
                                return completedGroups.map(group => (
                                  <div key={group.dateKey} className="space-y-1">
                                    {groupByDate && (
                                      <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-emerald-100/70 border border-emerald-200/60 text-[8px] font-bold text-emerald-950 min-w-0">
                                        <span className="flex items-center gap-1 truncate">
                                          <Calendar className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
                                          <span className="truncate">{group.label}</span>
                                        </span>
                                        <span className="bg-white/90 text-emerald-950 px-1 py-0.2 rounded text-[7.5px] font-semibold border border-emerald-200 shrink-0">
                                          {group.tasks.length}
                                        </span>
                                      </div>
                                    )}
                                    <div className="space-y-1">
                                      {group.tasks.map((t, idx) => (
                                        <div
                                          key={t.id || idx}
                                          className="w-full p-2 rounded-lg bg-white border border-slate-200/80 border-l-2 border-l-emerald-500 shadow-2xs space-y-1 flex flex-col justify-between transition-all min-w-0 overflow-hidden"
                                        >
                                          <div className="space-y-0.5 min-w-0">
                                            <div className="flex items-start justify-between gap-1.5 min-w-0">
                                              <span
                                                onClick={() => { sounds.playClick(); onEditTask(t); }}
                                                className="font-medium text-slate-800 text-[11px] line-clamp-2 hover:text-emerald-700 cursor-pointer flex-1 break-words min-w-0 leading-tight"
                                                title={t.title}
                                              >
                                                <span className="text-[9.5px] text-emerald-700 font-semibold mr-1 shrink-0">#{idx + 1}</span>
                                                {t.title}
                                              </span>
                                              <span className="text-[8px] font-semibold px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/70 shrink-0 whitespace-nowrap">
                                                ✓ Done
                                              </span>
                                            </div>

                                            {/* Remark / Notes Display */}
                                            {t.remark && (
                                              <div 
                                                onClick={() => {
                                                  sounds.playClick();
                                                  setActiveRemarkTask(t);
                                                }}
                                                className="mt-0.5 px-1.5 py-0.5 rounded bg-emerald-50/80 border border-emerald-200/60 text-[8px] text-emerald-800 line-clamp-2 cursor-pointer hover:bg-emerald-100/70 transition-colors"
                                                title={`Remarks: ${t.remark} (Click to view full notes)`}
                                              >
                                                <span className="font-semibold text-emerald-900">Notes:</span> {t.remark}
                                              </div>
                                            )}

                                            <div className="flex items-center gap-1 text-[8.5px] text-slate-400 font-medium truncate pt-0.5">
                                              <span>{t.completed_at ? `Done: ${formatFriendlyDate(t.completed_at)}` : (t.updated_at ? `Done: ${formatFriendlyDate(t.updated_at)}` : 'Completed')}</span>
                                            </div>
                                          </div>

                                          <div className="flex flex-wrap items-center justify-between text-[8.5px] pt-1 border-t border-slate-100 text-slate-400 gap-1 min-w-0">
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <button
                                                onClick={() => {
                                                  sounds.playClick();
                                                  setActiveRemarkTask(t);
                                                }}
                                                className="text-emerald-800 hover:text-emerald-950 font-semibold hover:underline cursor-pointer inline-flex items-center gap-0.5"
                                                title="View or edit notes/remarks"
                                              >
                                                <MessageSquare className="w-2 h-2" /> Remarks
                                              </button>
                                              <button
                                                onClick={() => {
                                                  sounds.playClick();
                                                  onDeleteTask(t.id);
                                                }}
                                                className="text-slate-300 hover:text-red-500 cursor-pointer transition-colors p-0.5"
                                                title="Delete completed task"
                                              >
                                                <Trash2 className="w-2 h-2" />
                                              </button>
                                            </div>
                                            <button
                                              onClick={() => { sounds.playClick(); onStatusChange(t.id, 'in_progress'); }}
                                              className="text-[8.5px] text-slate-500 hover:text-blue-600 font-medium hover:underline cursor-pointer shrink-0 ml-auto"
                                            >
                                              Reopen ↺
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ));
                              })()}

                              {/* Completed Books */}
                                {member.completedBooks.map((b, bIdx) => (
                                  <div 
                                    key={b.id || bIdx} 
                                    className="w-full p-2 rounded-lg bg-white border border-slate-200/80 border-l-2 border-l-emerald-500 shadow-2xs space-y-1 flex flex-col justify-between transition-all min-w-0 overflow-hidden"
                                  >
                                    <div className="space-y-0.5 min-w-0">
                                      <div className="flex items-start justify-between gap-1.5 min-w-0">
                                        <span className="font-semibold text-slate-800 text-[11px] line-clamp-1 flex items-center gap-1 min-w-0 flex-1 break-words" title={b.title}>
                                          <BookOpen className="w-3 h-3 text-emerald-600 shrink-0" />
                                          <span className="text-[9.5px] text-emerald-700 font-semibold mr-1 shrink-0">#{bIdx + 1}</span>
                                          <span className="truncate">{b.title}</span>
                                        </span>
                                        <span className="text-[8px] font-semibold px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/70 shrink-0 whitespace-nowrap">
                                          Finished
                                        </span>
                                      </div>
                                      <div className="text-[8.5px] text-slate-500 font-medium truncate">
                                        Author: {b.author || 'N/A'} • {b.total_pages || 0} pgs
                                      </div>
                                      <div className="flex items-center gap-1 flex-wrap">
                                        {b.completion_date && (
                                          <span className="text-[8px] text-emerald-700 font-medium truncate">
                                            Completed: {formatFriendlyDate(b.completion_date)}
                                          </span>
                                        )}
                                        {b.presented && (
                                          <span className="text-[7.5px] px-1 py-0.2 rounded bg-purple-100 text-purple-800 font-semibold shrink-0">
                                            🎤 Presented
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {member.bookTask && (
                                      <div className="flex flex-wrap items-center justify-between text-[8.5px] pt-1 border-t border-slate-100 text-slate-400 gap-1 min-w-0">
                                        <button
                                          onClick={() => { sounds.playClick(); onEditTask(member.bookTask); }}
                                          className="text-emerald-800 hover:text-emerald-950 font-semibold hover:underline cursor-pointer inline-flex items-center gap-0.5"
                                          title="Manage this book"
                                        >
                                          <Edit2 className="w-2 h-2" /> Manage
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

                              {/* Completed Bottom Velocity Pill */}
                              <div className="mt-1.5 py-1 px-1.5 rounded-md bg-emerald-50 border border-emerald-200/70 text-[8.5px] font-semibold text-emerald-800 flex items-center justify-between shadow-2xs min-w-0">
                                <span className="flex items-center gap-1 min-w-0">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                  <span className="truncate">Velocity</span>
                                </span>
                                <span className="font-bold text-emerald-700 bg-white px-1 py-0.2 rounded border border-emerald-200/60 shadow-2xs shrink-0 whitespace-nowrap">
                                  {completionRate}% Delivered
                                </span>
                              </div>
                            </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
