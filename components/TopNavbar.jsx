import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Bell, 
  FolderGit2, 
  ShieldCheck, 
  UserCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  X,
  CheckCheck
} from 'lucide-react';
import { sounds } from '../lib/audio';

export default function TopNavbar({ 
  totalTasks, 
  currentUser, 
  openNewTaskModal, 
  openEODModal, 
  eodSubmittedToday, 
  searchQuery, 
  setSearchQuery,
  viewMode,
  setViewMode,
  notifications = [],
  setNotifications
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  const isAakash = currentUser?.id === 'usr_aakash' || currentUser?.name?.toLowerCase().includes('aakash');

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = (notifications || []).filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    sounds.playClick();
    if (setNotifications) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const handleClearAll = () => {
    sounds.playClick();
    if (setNotifications) {
      setNotifications([]);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-40 flex items-center justify-between gap-4 shadow-sm select-none">
      
      {/* Left: Tasks Count, View Mode Switch & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-2xl">
        
        {/* Count Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shrink-0">
          <FolderGit2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Tasks: {totalTasks}</span>
        </div>

        {/* View Mode Toggle: [ Kanban Board | 📅 Sprint Calendar ] */}
        {setViewMode && (
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => { sounds.playClick(); setViewMode('kanban'); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Kanban</span>
            </button>

            <button
              onClick={() => { sounds.playClick(); setViewMode('calendar'); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Calendar</span>
            </button>
          </div>
        )}

        {/* Global Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks, tags, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-12 py-2 text-xs font-medium rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
          <span className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded bg-white font-mono">
            ⌘K
          </span>
        </div>

      </div>

      {/* Right: Actions, Live Badge & Notification Center */}
      <div className="flex items-center gap-3">
        
        {/* + EOD Checkout */}
        <button
          onClick={() => { sounds.playClick(); openEODModal(); }}
          className={`hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer ${
            eodSubmittedToday
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          <span>{eodSubmittedToday ? '✓ EOD Logged' : '+ EOD Checkout'}</span>
        </button>

        {/* + New Task */}
        <button
          onClick={() => { sounds.playClick(); openNewTaskModal(); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Task</span>
        </button>

        {/* Live Pulse Indicator Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-Time Sync</span>
        </div>

        {/* Locked Logged-in User Badge */}
        <div 
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200"
          title={`Authenticated as ${currentUser?.name}`}
        >
          <div 
            className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] text-white shadow-sm"
            style={{ backgroundColor: currentUser?.color || '#2563eb' }}
          >
            {currentUser?.avatar || '??'}
          </div>
          <span className="text-xs font-bold text-slate-800 hidden sm:inline-block max-w-[120px] truncate">
            {currentUser?.name}
          </span>
          {isAakash && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-extrabold border border-amber-200">
              Admin
            </span>
          )}
        </div>

        {/* Interactive Notification Bell & Drawer (Point 4) */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => { sounds.playClick(); setShowNotifications(!showNotifications); }}
            className={`p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all relative cursor-pointer ${
              showNotifications ? 'bg-slate-100 text-blue-600' : ''
            }`}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Drawer */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-4 space-y-3 animate-scale-up">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-slate-900">
                    Notifications
                  </h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-blue-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Notification List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(!notifications || notifications.length === 0) ? (
                  <div className="py-8 text-center text-slate-400 space-y-1">
                    <Sparkles className="w-6 h-6 text-slate-300 mx-auto" />
                    <p className="text-xs font-medium">All caught up!</p>
                    <p className="text-[10px] text-slate-400">
                      Task assignments and checkout alerts will show up here.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all text-xs ${
                        !n.read 
                          ? 'bg-blue-50/50 border-blue-200/80 shadow-2xs' 
                          : 'bg-slate-50 border-slate-100 opacity-80'
                      }`}
                    >
                      <div className="mt-0.5 p-1 rounded-lg bg-white border border-slate-200 shrink-0">
                        {n.type === 'task_assigned' ? <Plus className="w-3.5 h-3.5 text-blue-600" /> :
                         n.type === 'task_completed' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> :
                         n.type === 'eod_submitted' ? <Clock className="w-3.5 h-3.5 text-purple-600" /> :
                         <Bell className="w-3.5 h-3.5 text-slate-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h5 className="font-bold text-slate-900 text-[11px] truncate">
                            {n.title}
                          </h5>
                          <span className="text-[9px] text-slate-400 shrink-0 font-mono">
                            {n.time || 'Just now'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {notifications && notifications.length > 0 && (
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px]">
                  <span className="text-slate-400">Real-Time Notification Feed</span>
                  <button
                    onClick={handleClearAll}
                    className="text-rose-600 hover:underline font-bold cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              )}

            </div>
          )}
        </div>

      </div>

    </header>
  );
}
