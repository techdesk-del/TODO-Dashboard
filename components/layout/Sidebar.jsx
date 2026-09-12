import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  LogOut, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  BookOpen,
  AlertCircle,
  X
} from 'lucide-react';
import { sounds } from '@/lib/audio';
import { checkEodAllowed } from '@/lib/timeUtils';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  users = [], 
  tasks = [],
  currentUser, 
  selectedMemberFilter, 
  setSelectedMemberFilter,
  onLogout,
  mobileOpen = false,
  onCloseMobile = () => {}
}) {
  // EXECUTIVE ACCESS: Exclusively for Aakash Das (Admin)
  const isExecutive = currentUser?.role?.toLowerCase() === 'admin' ||
                      currentUser?.id === 'usr_aakash' || 
                      currentUser?.name?.toLowerCase().includes('aakash');

  // EOD live countdown status
  const [eodStatus, setEodStatus] = useState(() => checkEodAllowed());

  useEffect(() => {
    setEodStatus(checkEodAllowed());
    const interval = setInterval(() => {
      setEodStatus(checkEodAllowed());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Compute Personal Workload & Reading Metrics for the logged-in user
  const userTasks = useMemo(() => {
    if (!tasks || !currentUser) return [];
    return tasks.filter(t => t.assigned_to === currentUser.id);
  }, [tasks, currentUser]);

  const stats = useMemo(() => {
    const total = userTasks.length;
    const completed = userTasks.filter(t => t.status === 'completed').length;
    const pending = userTasks.filter(t => t.status !== 'completed').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = userTasks.filter(t => {
      if (t.status === 'completed' || !t.due_date) return false;
      return new Date(t.due_date).getTime() < new Date(todayStr).getTime();
    }).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Find active book task
    const bookTask = userTasks.find(t => t.is_book_reading);
    let activeBook = null;
    if (bookTask) {
      if (Array.isArray(bookTask.books_list) && bookTask.books_list.length > 0) {
        activeBook = bookTask.books_list.find(b => b.status !== 'completed') || bookTask.books_list[0];
      } else {
        activeBook = {
          title: bookTask.title,
          pages_read: Number(bookTask.book_stats?.total_pages_read) || 0,
          total_pages: Number(bookTask.book_stats?.total_pages) || 0
        };
      }
    }

    return { total, completed, pending, overdue, percent, activeBook };
  }, [userTasks]);

  const renderSidebarContent = (isMobile = false) => (
    <>
      {/* Brand Header with Exact UrbanGaon Logo */}
      <div className={`p-4 border-b border-slate-100 flex items-center ${isMobile ? 'justify-between' : 'justify-center'}`}>
        <img 
          src="/urbangaon-logo.jpg" 
          alt="UrbanGaon — a perfect balance" 
          className="h-10 w-auto object-contain max-w-[200px]"
        />
        {isMobile && (
          <button
            onClick={() => { sounds.playClick(); onCloseMobile(); }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shrink-0"
            title="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Menu & Productive Widgets */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 touch-scroll">
        
        {/* Main Links */}
        <div className="space-y-1">
          <button
            onClick={() => { 
              sounds.playClick(); 
              setActiveTab('workspace'); 
              setSelectedMemberFilter(currentUser?.id || 'all'); 
              if (isMobile) onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'workspace' && selectedMemberFilter === currentUser?.id
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4" />
              <span>My Private Tasks</span>
            </div>
            {stats.pending > 0 && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                activeTab === 'workspace' && selectedMemberFilter === currentUser?.id
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-200/80 text-slate-700'
              }`}>
                {stats.pending}
              </span>
            )}
          </button>

          {/* All Company Tasks Board (Visible ONLY to Executive / Aakash Das) */}
          {isExecutive && (
            <button
              onClick={() => { 
                sounds.playClick(); 
                setActiveTab('workspace'); 
                setSelectedMemberFilter('all'); 
                if (isMobile) onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'workspace' && selectedMemberFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>All Company Tasks</span>
            </button>
          )}

          {/* Executive Overview (Visible ONLY to Executive / Aakash Das) */}
          {isExecutive && (
            <button
              onClick={() => { 
                sounds.playClick(); 
                setActiveTab('ceo'); 
                if (isMobile) onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ceo'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Executive Overview</span>
            </button>
          )}
        </div>

        {/* Personal Sprint Progress & Workload Analytics */}
        <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sprint Progress</span>
            </span>
            <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200/60">
              {stats.percent}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-blue-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${stats.percent}%` }}
            />
          </div>
        </div>

        {/* Daily Reading & Development Tracker */}
        {stats.activeBook && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-blue-50/40 border border-indigo-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5 truncate">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">Daily Reading</span>
              </span>
              <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded-full border border-indigo-200 shrink-0">
                Active
              </span>
            </div>
            <div className="text-xs font-bold text-slate-900 truncate" title={stats.activeBook.title}>
              {stats.activeBook.title}
            </div>
            {stats.activeBook.total_pages > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                  <span>Reading Goal</span>
                  <span className="font-bold text-slate-700">
                    {stats.activeBook.pages_read || 0} / {stats.activeBook.total_pages} pgs
                  </span>
                </div>
                <div className="w-full bg-indigo-200/60 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${Math.min(100, Math.round(((stats.activeBook.pages_read || 0) / stats.activeBook.total_pages) * 100))}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Office Shift & EOD Policy Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50/25 to-indigo-50/30 border border-slate-200/90 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Shift & EOD Policy</span>
            </span>
            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border ${
              eodStatus.isAllowed
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-amber-100 text-amber-900 border-amber-200'
            }`}>
              {eodStatus.isAllowed ? 'Ready' : 'In Progress'}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px] text-slate-600 font-medium">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Daily Shift:</span>
              <span className="font-bold text-slate-800">9:30 AM – 6:30 PM</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">EOD Checkout:</span>
              <span className="font-bold text-slate-800">Opens at 6:15 PM</span>
            </div>
          </div>

          <div className="pt-1 border-t border-slate-200/70">
            <div className={`p-2 rounded-xl text-[10.5px] font-bold flex items-center justify-center gap-1.5 ${
              eodStatus.isAllowed
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs'
            }`}>
              {eodStatus.isAllowed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>EOD Checkout is Open Now</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Opens in {eodStatus.formattedRemaining}</span>
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Single Consolidated User Profile Footer with Sign Out */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between gap-2">
        <div 
          onClick={() => {
            sounds.playClick();
            if (currentUser?.id) setSelectedMemberFilter(currentUser.id);
            setActiveTab('workspace');
            if (isMobile) onCloseMobile();
          }}
          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
          title="Click to view your private tasks"
        >
          <div className="relative shrink-0">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-xs"
              style={{ backgroundColor: currentUser?.color || '#2563eb' }}
            >
              {currentUser?.avatar || '??'}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-slate-900 text-xs truncate group-hover:text-blue-700 transition-colors" title={currentUser?.name}>
              {currentUser?.name}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200 uppercase">
                {currentUser?.role || 'Member'}
              </span>
              <span className="text-[9.5px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => { sounds.playClick(); onLogout(); }}
          title="Sign out from this account"
          className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer border border-transparent hover:border-rose-200"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (lg and above) */}
      <aside className="hidden lg:flex w-60 xl:w-64 bg-white border-r border-slate-200 flex-col h-screen sticky top-0 shrink-0 z-30 select-none">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile & Tablet Slide-over Drawer (< lg) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop Blur Overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => { sounds.playClick(); onCloseMobile(); }}
          />
          
          {/* Slide-out Drawer Panel */}
          <aside className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-slate-200 flex flex-col h-full shadow-2xl animate-drawer-in select-none">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
