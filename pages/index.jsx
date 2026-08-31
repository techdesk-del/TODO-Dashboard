import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import KanbanBoard from '../components/KanbanBoard';
import CEODashboard from '../components/CEODashboard';
import TaskModal from '../components/TaskModal';
import EODCheckoutModal from '../components/EODCheckoutModal';
import LiveActivityFeed from '../components/LiveActivityFeed';
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
  const [activityLogs, setActivityLogs] = useState([]);
  const [eodReports, setEodReports] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);

  // Layout & Filters
  const [activeTab, setActiveTab] = useState('workspace'); // 'workspace' | 'ceo'
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [defaultTaskStatus, setDefaultTaskStatus] = useState('todo');
  const [eodModalOpen, setEodModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const socketRef = useRef(null);

  // Toast helper
  const showToast = (title, message, type = 'info') => {
    setToastMessage({ title, message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Check saved login session in localStorage
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser && savedUser.id) {
          setCurrentUser(savedUser);
        }
      }
    } catch (e) {}
    setIsAuthReady(true);
  }, []);

  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Initial snapshot from server
    socket.on('sync:initial', (data) => {
      if (data.users && data.users.length > 0) {
        setUsers(data.users);
      }
      if (data.tasks) setTasks(data.tasks);
      if (data.overview) setOverview(data.overview);
      if (data.activityLogs) setActivityLogs(data.activityLogs);
      if (data.eodReports) setEodReports(data.eodReports);
    });

    // Real-time Event: Task Created
    socket.on('task:created', ({ task, tasks, overview, activityLogs }) => {
      setTasks(tasks);
      setOverview(overview);
      if (activityLogs) setActivityLogs(activityLogs);
      showToast('⚡ Task Created', `"${task.title}" assigned to ${task.assignee_name}`, 'success');
      sounds.playClick();
    });

    // Real-time Event: Task Updated
    socket.on('task:updated', ({ task, tasks, overview, activityLogs }) => {
      setTasks(tasks);
      setOverview(overview);
      if (activityLogs) setActivityLogs(activityLogs);
      if (task.status === 'completed') {
        showToast('🎉 Task Completed', `"${task.title}" marked as completed!`, 'success');
      }
    });

    // Real-time Event: Task Deleted
    socket.on('task:deleted', ({ tasks, overview, activityLogs }) => {
      setTasks(tasks);
      setOverview(overview);
      if (activityLogs) setActivityLogs(activityLogs);
    });

    // Real-time Event: EOD Submitted
    socket.on('eod:submitted', ({ report, eodReports, users, overview, activityLogs }) => {
      setEodReports(eodReports);
      setUsers(users);
      setOverview(overview);
      if (activityLogs) setActivityLogs(activityLogs);
      showToast(
        '📋 EOD Report Submitted', 
        `${report.user_name} submitted daily checkout report.`,
        'eod'
      );
    });

    // Real-time Event: Live Presence Updated
    socket.on('presence:updated', ({ users, overview, activityLogs }) => {
      setUsers(users);
      if (overview) setOverview(overview);
      if (activityLogs) setActivityLogs(activityLogs);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Announce User Join whenever currentUser is authenticated
  useEffect(() => {
    if (socketRef.current && currentUser) {
      socketRef.current.emit('user:join', currentUser);
    }
  }, [currentUser?.id]);

  // Periodic heartbeat for presence
  useEffect(() => {
    const interval = setInterval(() => {
      if (socketRef.current && currentUser) {
        socketRef.current.emit('user:ping', currentUser.id);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Login Success Handler
  const handleLoginSuccess = (authenticatedUser) => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authenticatedUser));
    } catch (e) {}
    setCurrentUser(authenticatedUser);
    setSelectedMemberFilter(authenticatedUser.id);
    if (socketRef.current) {
      socketRef.current.emit('user:join', authenticatedUser);
    }
  };

  // Sign out Handler
  const handleLogout = () => {
    if (socketRef.current && currentUser) {
      socketRef.current.emit('user:logout', currentUser.id);
    }
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {}
    setCurrentUser(null);
    setActiveTab('workspace');
    setSelectedMemberFilter('all');
  };

  // Task Actions
  const handleStatusChange = (taskId, newStatus) => {
    if (!socketRef.current) return;
    socketRef.current.emit('task:update', {
      id: taskId,
      updates: { status: newStatus },
      user: currentUser
    });
  };

  const handleSaveTask = (taskData) => {
    if (!socketRef.current) return;

    if (taskData.id) {
      socketRef.current.emit('task:update', {
        id: taskData.id,
        updates: taskData,
        user: currentUser
      });
    } else {
      socketRef.current.emit('task:create', {
        ...taskData,
        creator_name: currentUser?.name || 'Admin'
      });
    }
  };

  const handleDeleteTask = (taskId) => {
    if (!socketRef.current) return;
    if (confirm('Are you sure you want to delete this task?')) {
      socketRef.current.emit('task:delete', {
        id: taskId,
        user: currentUser
      });
    }
  };

  const handleOpenNewTaskModal = (defaultStatus = 'todo') => {
    setEditingTask(null);
    setDefaultTaskStatus(defaultStatus);
    setTaskModalOpen(true);
  };

  const handleOpenEditTaskModal = (task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleSubmitEOD = (reportData) => {
    if (!socketRef.current) return;
    socketRef.current.emit('eod:submit', reportData);
  };

  // If Auth check still initializing or user not logged in, show AuthScreen
  if (!isAuthReady || !currentUser) {
    return (
      <AuthScreen 
        users={users.length > 0 ? users : [
          { id: 'usr_aakash', name: 'Aakash Das', color: '#6366f1', avatar: 'AD', email: 'aakash.das@company.io' },
          { id: 'usr_shyamsundar', name: 'Shyamsundar Varma', color: '#f59e0b', avatar: 'SV', email: 'shyamsundar@company.io' },
          { id: 'usr_yudhister', name: 'Yudhister Tiwari', color: '#10b981', avatar: 'YT', email: 'yudhister.t@company.io' },
          { id: 'usr_rekha', name: 'Dr Rekha Pareek', color: '#a855f7', avatar: 'RP', email: 'rekha.pareek@company.io' },
          { id: 'usr_sanjay', name: 'Sanjay', color: '#06b6d4', avatar: 'SJ', email: 'sanjay@company.io' },
          { id: 'usr_ayaz', name: 'Ayaz', color: '#ec4899', avatar: 'AY', email: 'ayaz@company.io' },
          { id: 'usr_utkarsh', name: 'Utkarsh', color: '#3b82f6', avatar: 'UT', email: 'utkarsh@company.io' },
          { id: 'usr_pratap', name: 'Pratap', color: '#14b8a6', avatar: 'PR', email: 'pratap@company.io' },
          { id: 'usr_varun', name: 'Varun Mudgal', color: '#f97316', avatar: 'VM', email: 'varun.mudgal@company.io' }
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
      
      {/* Left Sidebar with Auth Lockdown */}
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
        
        {/* Top Navbar with Locked Profile */}
        <TopNavbar
          totalTasks={tasks.length}
          currentUser={currentUser}
          openNewTaskModal={handleOpenNewTaskModal}
          openEODModal={() => setEodModalOpen(true)}
          eodSubmittedToday={eodSubmittedToday}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
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
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm shrink-0 text-sm"
                style={{ backgroundColor: currentUser?.color || '#2563eb' }}
              >
                {currentUser?.avatar || '??'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Welcome, {currentUser?.name}
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-blue-600" />
                    Authenticated Session
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  My Tasks: <strong className="text-emerald-600">{myCompletedCount} Done</strong> • <strong className="text-amber-600">{myPendingCount} Pending</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!eodSubmittedToday ? (
                <button
                  onClick={() => { sounds.playClick(); setEodModalOpen(true); }}
                  className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Clock Out & Submit EOD Report</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Today's EOD Report Submitted ✓</span>
                </div>
              )}
            </div>
          </div>

          {/* View Tab 1: Task Board Workspace */}
          {activeTab === 'workspace' && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
              
              {/* Kanban Swimlanes (3 Cols) */}
              <div className="xl:col-span-3 w-full">
                <KanbanBoard
                  tasks={tasks}
                  users={users}
                  currentUser={currentUser}
                  onStatusChange={handleStatusChange}
                  onEditTask={handleOpenEditTaskModal}
                  onDeleteTask={handleDeleteTask}
                  openNewTaskModal={handleOpenNewTaskModal}
                  searchQuery={searchQuery}
                  selectedMemberFilter={selectedMemberFilter}
                  setSelectedMemberFilter={setSelectedMemberFilter}
                />
              </div>

              {/* Sidebar Feed (1 Col) */}
              <div className="space-y-4 w-full">
                <LiveActivityFeed activityLogs={activityLogs} />
              </div>

            </div>
          )}

          {/* View Tab 2: Executive Overview (Only for Leadership) */}
          {activeTab === 'ceo' && (
            <CEODashboard
              overview={overview}
              tasks={tasks}
              users={users}
              eodReports={eodReports}
              onSelectMemberFilter={(memberId) => {
                setSelectedMemberFilter(memberId);
                setActiveTab('workspace');
              }}
              openNewTaskModal={() => handleOpenNewTaskModal()}
            />
          )}

        </main>

        {/* Clean Footer */}
        <footer className="border-t border-slate-200 py-3.5 px-6 text-center text-xs text-slate-500 bg-white mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© 2026 UrbanGaon • Secure Enterprise Workspace</p>
            <span className="text-emerald-600 font-semibold flex items-center gap-1.5 justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Protected by Session Lock & MongoDB Atlas
            </span>
          </div>
        </footer>

      </div>

      {/* Task Create / Edit Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
        initialTask={editingTask}
        defaultStatus={defaultTaskStatus}
        users={users}
        currentUser={currentUser}
      />

      {/* EOD Checkout Modal (Locked to Current Authenticated Member) */}
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
