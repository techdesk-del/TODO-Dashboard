import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import KanbanBoard from '../components/KanbanBoard';
import CalendarView from '../components/CalendarView';
import CEODashboard from '../components/CEODashboard';
import TaskModal from '../components/TaskModal';
import EODCheckoutModal from '../components/EODCheckoutModal';
import AuthScreen from '../components/AuthScreen';
import { sounds } from '../lib/audio';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Lock 
} from 'lucide-react';

const AUTH_STORAGE_KEY = 'urbangaon_auth_user_v1';

export default function Home() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [overview, setOverview] = useState(null);
  const [eodReports, setEodReports] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);

  // Layout, View Mode & Filters
  const [activeTab, setActiveTab] = useState('workspace'); // 'workspace' | 'ceo'
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'calendar' (Point 3)
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications State (Point 4)
  const [notifications, setNotifications] = useState([
    {
      id: 'notif_welcome',
      title: 'Welcome to UrbanGaon 2.0',
      message: 'Real-Time Multi-PC Cloud Heartbeat Mesh and Sprint Calendar active.',
      time: 'Just now',
      type: 'general',
      read: false
    }
  ]);

  // Modals
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [defaultTaskStatus, setDefaultTaskStatus] = useState('todo');
  const [eodModalOpen, setEodModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const socketRef = useRef(null);

  const addNotification = (title, message, type = 'general') => {
    const newNotif = {
      id: 'notif_' + Date.now().toString(36),
      title,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
      read: false
    };
    setNotifications(prev => [newNotif, ...prev.slice(0, 20)]);
  };

  const showToast = (title, message, type = 'info') => {
    setToastMessage({ title, message, type });
    addNotification(title, message, type === 'success' ? 'task_completed' : 'task_assigned');
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Fetch full data snapshot via REST API
  const refreshData = async () => {
    try {
      const [uRes, tRes, oRes, eRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/tasks'),
        fetch('/api/overview'),
        fetch('/api/eod-reports')
      ]);

      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(uData);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTasks(tData);
      }
      if (oRes.ok) {
        const oData = await oRes.json();
        setOverview(oData);
      }
      if (eRes.ok) {
        const eData = await eRes.json();
        setEodReports(eData);
      }
    } catch (err) {
      console.warn('REST Refresh error:', err);
    }
  };

  // Check saved login session in localStorage
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser && savedUser.id) {
          setCurrentUser(savedUser);
          setSelectedMemberFilter(savedUser.id);
        }
      }
    } catch (e) {}
    setIsAuthReady(true);
    refreshData();
  }, []);

  // Heartbeat Mesh: Keep current user status 'online' in Cloud Database
  useEffect(() => {
    if (!currentUser?.id) return;

    const sendHeartbeat = () => {
      if (document.hidden) return;
      fetch('/api/users/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      }).catch(() => {});
    };

    sendHeartbeat();
    const hbInterval = setInterval(sendHeartbeat, 15000);

    const handleUnload = () => {
      if (currentUser?.id) {
        const payload = JSON.stringify({ userId: currentUser.id });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/users/logout', payload);
        } else {
          fetch('/api/users/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true
          }).catch(() => {});
        }
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      clearInterval(hbInterval);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [currentUser?.id]);

  // Intelligent Multi-PC Auto Sync with Socket-Aware Backoff (60s when Socket connected, 10s fallback)
  useEffect(() => {
    const intervalMs = socketConnected ? 60000 : 10000;
    const syncInterval = setInterval(() => {
      if (!document.hidden) {
        refreshData();
      }
    }, intervalMs);
    return () => clearInterval(syncInterval);
  }, [socketConnected]);

  // Socket.IO Real-Time Engine (WebSocket preferred for 0ms latency)
  useEffect(() => {
    let socket;
    try {
      socket = io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000
      });
      socketRef.current = socket;

      socket.on('connect', () => setSocketConnected(true));
      socket.on('disconnect', () => setSocketConnected(false));
      socket.on('connect_error', () => setSocketConnected(false));

      socket.on('sync:initial', (data) => {
        if (data.users && data.users.length > 0) setUsers(data.users);
        if (data.tasks) setTasks(data.tasks);
        if (data.overview) setOverview(data.overview);
        if (data.eodReports) setEodReports(data.eodReports);
      });

      socket.on('task:created', ({ task, tasks: newTasks, overview: newOverview }) => {
        if (newTasks) setTasks(newTasks);
        if (newOverview) setOverview(newOverview);
        showToast('⚡ Task Created', `"${task.title}" assigned to ${task.assignee_name}`, 'success');
        sounds.playClick();
      });

      socket.on('task:updated', ({ task, tasks: newTasks, overview: newOverview }) => {
        if (newTasks) setTasks(newTasks);
        if (newOverview) setOverview(newOverview);
        if (task.status === 'completed') {
          showToast('🎉 Task Completed', `"${task.title}" marked as completed!`, 'success');
        }
      });

      socket.on('task:deleted', ({ tasks: newTasks, overview: newOverview }) => {
        if (newTasks) setTasks(newTasks);
        if (newOverview) setOverview(newOverview);
      });

      socket.on('task:remark_added', ({ taskId, task, remark }) => {
        if (task) {
          setTasks(prev => prev.map(t => t.id === taskId ? task : t));
          showToast('💬 New Remark Added', `"${remark?.author_name || 'Team member'}": ${remark?.text ? (remark.text.length > 40 ? remark.text.substring(0, 40) + '...' : remark.text) : 'Added note'}`, 'info');
        }
      });

      socket.on('task:remark_deleted', ({ taskId, remarkId, task }) => {
        if (task) {
          setTasks(prev => prev.map(t => t.id === taskId ? task : t));
        } else {
          setTasks(prev => prev.map(t => {
            if (t.id === taskId) {
              const filtered = (t.remarks || []).filter(r => r.id !== remarkId && r._id !== remarkId && String(r._id) !== String(remarkId));
              return {
                ...t,
                remarks: filtered,
                latest_remark: filtered.length > 0 ? filtered[0].text : ''
              };
            }
            return t;
          }));
        }
      });

      socket.on('eod:submitted', ({ report, eodReports: newReports, users: newUsers, overview: newOverview }) => {
        if (newReports) setEodReports(newReports);
        if (newUsers) setUsers(newUsers);
        if (newOverview) setOverview(newOverview);
        showToast('📋 EOD Report Submitted', `${report.user_name} submitted daily checkout report.`, 'eod');
      });

      socket.on('presence:updated', ({ users: newUsers, overview: newOverview }) => {
        if (newUsers) setUsers(newUsers);
        if (newOverview) setOverview(newOverview);
      });
    } catch (e) {}

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  // Login Success Handler
  const handleLoginSuccess = (authenticatedUser) => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authenticatedUser));
    } catch (e) {}
    setCurrentUser(authenticatedUser);
    setSelectedMemberFilter(authenticatedUser.id);
    refreshData();
    if (socketRef.current) {
      socketRef.current.emit('user:join', authenticatedUser);
    }
  };

  // Sign out Handler
  const handleLogout = async () => {
    if (currentUser?.id) {
      fetch('/api/users/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      }).catch(() => {});
    }
    if (socketRef.current && currentUser) {
      socketRef.current.emit('user:logout', currentUser.id);
    }
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {}
    setCurrentUser(null);
    setActiveTab('workspace');
    setSelectedMemberFilter('all');
    refreshData();
  };

  // Task Actions
  const handleStatusChange = async (taskId, newStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    if (socketRef.current && socketConnected) {
      socketRef.current.emit('task:update', {
        id: taskId,
        updates: { status: newStatus },
        user: currentUser
      });
    }

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: { status: newStatus }, user: currentUser })
      });
      refreshData();
    } catch (e) {}
  };

  const handleSaveTask = async (taskData) => {
    if (taskData.id) {
      if (socketRef.current && socketConnected) {
        socketRef.current.emit('task:update', {
          id: taskData.id,
          updates: taskData,
          user: currentUser
        });
      }
      try {
        await fetch(`/api/tasks/${taskData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: taskData, user: currentUser })
        });
        refreshData();
      } catch (e) {}
    } else {
      if (socketRef.current && socketConnected) {
        socketRef.current.emit('task:create', {
          ...taskData,
          creator_name: currentUser?.name || 'Admin'
        });
      }
      try {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...taskData, creator_name: currentUser?.name || 'Admin' })
        });
        refreshData();
      } catch (e) {}
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (confirm('Are you sure you want to delete this task?')) {
      setTasks(prev => prev.filter(t => t.id !== taskId));

      if (socketRef.current && socketConnected) {
        socketRef.current.emit('task:delete', {
          id: taskId,
          user: currentUser
        });
      }
      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: currentUser })
        });
        refreshData();
      } catch (e) {}
    }
  };

  const handleLogDailyReading = async (taskId, logData) => {
    // 1. Optimistic Real-time UI update
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const currentLogs = Array.isArray(t.reading_logs) ? [...t.reading_logs] : [];
        const logEntry = {
          id: 'log_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 3),
          date: logData.date,
          pages_read: Number(logData.pages_read) || 0,
          takeaways: logData.takeaways || '',
          created_at: new Date().toISOString()
        };
        const existingIndex = currentLogs.findIndex(l => l.date === logEntry.date);
        if (existingIndex >= 0) {
          currentLogs[existingIndex] = logEntry;
        } else {
          currentLogs.unshift(logEntry);
        }

        const totalRead = currentLogs.reduce((acc, l) => acc + (Number(l.pages_read) || 0), 0);
        return {
          ...t,
          reading_logs: currentLogs,
          book_stats: {
            ...(t.book_stats || {}),
            total_pages_read: totalRead
          }
        };
      }
      return t;
    }));

    showToast('📖 Reading Logged', `Recorded +${logData.pages_read} pages for ${logData.date}.`, 'success');

    // 2. Real-time Multi-Device Broadcast & Persistence via Socket.IO
    if (socketRef.current && socketConnected) {
      socketRef.current.emit('task:log_reading', {
        taskId,
        logData,
        user: currentUser
      });
    } else {
      // 3. Fallback: Persistent REST & MongoDB Atlas sync when offline
      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'log_daily_reading',
            reading_log: logData,
            user: currentUser
          })
        });
        refreshData();
      } catch (e) {
        console.error('Failed to sync daily reading log:', e);
      }
    }
  };

  const handleSaveRemark = async (taskId, remarkText) => {
    if (!remarkText || !remarkText.trim()) return;

    // 1. Optimistic Real-time UI update
    const newRemark = {
      id: 'rem_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      text: remarkText.trim(),
      author_id: currentUser?.id || 'usr_unknown',
      author_name: currentUser?.name || 'Team Member',
      author_avatar: currentUser?.avatar || currentUser?.name?.substring(0, 2).toUpperCase() || '??',
      author_color: currentUser?.color || '#6366f1',
      created_at: new Date().toISOString()
    };

    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const currentRemarks = Array.isArray(t.remarks) ? [...t.remarks] : [];
        currentRemarks.unshift(newRemark);
        return {
          ...t,
          remarks: currentRemarks,
          latest_remark: newRemark.text
        };
      }
      return t;
    }));

    showToast('💬 Remark Added', `Remark posted to task successfully`, 'info');

    // 2. Primary: Broadcast & persist via Socket.IO (single trigger)
    if (socketRef.current && socketConnected) {
      socketRef.current.emit('task:add_remark', {
        taskId,
        remark: newRemark,
        user: currentUser
      });
    } else {
      // 3. Fallback: REST API when socket is disconnected
      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add_remark',
            remark: newRemark,
            user: currentUser
          })
        });
        refreshData();
      } catch (e) {
        console.error('Error adding remark:', e);
      }
    }
  };

  const handleDeleteRemark = async (taskId, remarkId) => {
    sounds.playTrash();

    // 1. Optimistic UI update
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const filtered = (t.remarks || []).filter(r => r.id !== remarkId && r._id !== remarkId && String(r._id) !== String(remarkId));
        return {
          ...t,
          remarks: filtered,
          latest_remark: filtered.length > 0 ? filtered[0].text : ''
        };
      }
      return t;
    }));

    showToast('🗑️ Remark Removed', `Remark deleted from task`, 'info');

    // 2. Primary: Broadcast & delete via Socket.IO (single trigger)
    if (socketRef.current && socketConnected) {
      socketRef.current.emit('task:delete_remark', {
        taskId,
        remarkId,
        user: currentUser
      });
    } else {
      // 3. Fallback: REST API when socket is disconnected
      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete_remark',
            remarkId,
            user: currentUser
          })
        });
        refreshData();
      } catch (e) {
        console.error('Error deleting remark:', e);
      }
    }
  };

  const handleOpenNewTaskModal = (defaultStatus = 'todo', defaultAssignee = null) => {
    if (defaultAssignee) {
      setEditingTask({ assigned_to: defaultAssignee, status: defaultStatus });
    } else {
      setEditingTask(null);
    }
    setDefaultTaskStatus(defaultStatus);
    setTaskModalOpen(true);
  };

  const handleOpenEditTaskModal = (task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleSubmitEOD = async (reportData) => {
    if (socketRef.current && socketConnected) {
      socketRef.current.emit('eod:submit', reportData);
    }
    try {
      await fetch('/api/eod-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      refreshData();
    } catch (e) {}
  };

  if (!isAuthReady || !currentUser) {
    return (
      <AuthScreen 
        users={users.length > 0 ? users : [
          { id: 'usr_aakash', name: 'Aakash Das', color: '#6366f1', avatar: 'AD', email: 'aakash.das@urbangaon.com' },
          { id: 'usr_shyamsundar', name: 'Shyamsundar Varma', color: '#f59e0b', avatar: 'SV', email: 'shyamsundar@urbangaon.com' },
          { id: 'usr_yudhister', name: 'Yudhister Tiwari', color: '#10b981', avatar: 'YT', email: 'yudhister.t@urbangaon.com' },
          { id: 'usr_rekha', name: 'Dr Rekha Pareek', color: '#a855f7', avatar: 'RP', email: 'rekha.pareek@urbangaon.com' },
          { id: 'usr_sanjay', name: 'Sanjay', color: '#06b6d4', avatar: 'SJ', email: 'sanjay@urbangaon.com' },
          { id: 'usr_ayaz', name: 'Ayaz', color: '#ec4899', avatar: 'AY', email: 'ayaz@urbangaon.com' },
          { id: 'usr_utkarsh', name: 'Utkarsh', color: '#3b82f6', avatar: 'UT', email: 'utkarsh@urbangaon.com' },
          { id: 'usr_pratap', name: 'Pratap', color: '#14b8a6', avatar: 'PR', email: 'pratap@urbangaon.com' },
          { id: 'usr_varun', name: 'Varun Mudgal', color: '#f97316', avatar: 'VM', email: 'varun.mudgal@urbangaon.com' }
        ]} 
        onLoginSuccess={handleLoginSuccess} 
      />
    );
  }

  const todayDateStr = new Date().toISOString().split('T')[0];
  const eodSubmittedToday = (eodReports || []).some(r => r.user_id === currentUser?.id && r.report_date === todayDateStr);

  const currentUserTasks = (tasks || []).filter(t => t.assigned_to === currentUser?.id);
  const myCompletedCount = currentUserTasks.filter(t => t.status === 'completed').length;
  const myPendingCount = currentUserTasks.filter(t => t.status !== 'completed').length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans w-full">
      
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        users={users}
        currentUser={currentUser}
        selectedMemberFilter={selectedMemberFilter}
        setSelectedMemberFilter={setSelectedMemberFilter}
        onLogout={handleLogout}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* Top Navbar with Notification Center & Sprint Calendar Toggle */}
        <TopNavbar
          totalTasks={tasks.length}
          currentUser={currentUser}
          openNewTaskModal={handleOpenNewTaskModal}
          openEODModal={() => setEodModalOpen(true)}
          eodSubmittedToday={eodSubmittedToday}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          viewMode={viewMode}
          setViewMode={setViewMode}
          notifications={notifications}
          setNotifications={setNotifications}
        />

        {/* Real-time Toast Notification */}
        {toastMessage && (
          <div className="fixed top-16 right-6 z-50 animate-slide-up max-w-sm">
            <div className="p-3.5 rounded-2xl border shadow-xl bg-white border-slate-200 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900">{toastMessage.title}</h5>
                <p className="text-[11px] text-slate-600 mt-0.5">{toastMessage.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* Welcome & Workload Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div 
                className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm shrink-0 text-sm"
                style={{ backgroundColor: currentUser?.color || '#2563eb' }}
              >
                {currentUser?.avatar || '??'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-extrabold text-slate-900 truncate">
                    Welcome, {currentUser?.name}
                  </h2>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 flex items-center gap-1 shrink-0">
                    <ShieldCheck className="w-3 h-3 text-blue-600 shrink-0" />
                    Authenticated Session
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  My Tasks: <strong className="text-emerald-600">{myCompletedCount} Done</strong> • <strong className="text-amber-600">{myPendingCount} Pending</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
              {!eodSubmittedToday ? (
                <button
                  onClick={() => { sounds.playClick(); setEodModalOpen(true); }}
                  className="text-xs font-bold px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-xs hover:border-amber-400 transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
                >
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Clock Out & Submit EOD Report</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-300 shadow-xs shrink-0 whitespace-nowrap">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Today's EOD Report Submitted ✓</span>
                </div>
              )}
            </div>
          </div>

          {/* View Tab 1: Task Board Workspace (Kanban or Sprint Calendar) */}
          {activeTab === 'workspace' && (
            <div className="w-full">
              {viewMode === 'kanban' ? (
                <KanbanBoard
                  tasks={tasks}
                  users={users}
                  currentUser={currentUser}
                  onStatusChange={handleStatusChange}
                  onEditTask={handleOpenEditTaskModal}
                  onDeleteTask={handleDeleteTask}
                  onLogDailyReading={handleLogDailyReading}
                  onSaveRemark={handleSaveRemark}
                  onDeleteRemark={handleDeleteRemark}
                  openNewTaskModal={handleOpenNewTaskModal}
                  searchQuery={searchQuery}
                  selectedMemberFilter={selectedMemberFilter}
                  setSelectedMemberFilter={setSelectedMemberFilter}
                />
              ) : (
                <CalendarView
                  tasks={tasks}
                  users={users}
                  currentUser={currentUser}
                  selectedMemberFilter={selectedMemberFilter}
                  openNewTaskModal={handleOpenNewTaskModal}
                  onEditTask={handleOpenEditTaskModal}
                />
              )}
            </div>
          )}

          {/* View Tab 2: Executive Overview (Restricted EXCLUSIVELY to Aakash Das) */}
          {activeTab === 'ceo' && (currentUser?.id === 'usr_aakash' || currentUser?.name?.toLowerCase().includes('aakash')) && (
            <CEODashboard
              overview={overview}
              tasks={tasks}
              users={users}
              currentUser={currentUser}
              eodReports={eodReports}
              onStatusChange={handleStatusChange}
              onEditTask={handleOpenEditTaskModal}
              onDeleteTask={handleDeleteTask}
              onSaveRemark={handleSaveRemark}
              onDeleteRemark={handleDeleteRemark}
              onSelectMemberFilter={(memberId) => {
                setSelectedMemberFilter(memberId);
                setActiveTab('workspace');
              }}
              openNewTaskModal={handleOpenNewTaskModal}
            />
          )}

        </main>

        {/* Clean Footer */}
        <footer className="border-t border-slate-200 py-3.5 px-6 text-center text-xs text-slate-500 bg-white mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© 2026 UrbanGaon • Secure Enterprise Workspace</p>
            <span className="text-emerald-600 font-semibold flex items-center gap-1.5 justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Real-Time Multi-PC Cloud Mesh Connected
            </span>
          </div>
        </footer>

      </div>

      {/* Task Create / Edit Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        initialTask={editingTask}
        defaultStatus={defaultTaskStatus}
        users={users}
        currentUser={currentUser}
      />

      {/* EOD Checkout Modal */}
      <EODCheckoutModal
        isOpen={eodModalOpen}
        onClose={() => setEodModalOpen(false)}
        currentUser={currentUser}
        userTasks={currentUserTasks}
        onSubmitEOD={handleSubmitEOD}
      />

    </div>
  );
}
