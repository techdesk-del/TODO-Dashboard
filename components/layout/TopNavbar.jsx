import React, { useState, useEffect } from 'react';
import { 
  Menu,
  Search, 
  Plus, 
  FolderGit2, 
  ShieldCheck, 
  UserCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  Lock
} from 'lucide-react';
import { sounds } from '@/lib/audio';
import { checkEodAllowed } from '@/lib/timeUtils';

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
  onOpenMobileSidebar
}) {
  const [eodStatus, setEodStatus] = useState(() => checkEodAllowed());

  useEffect(() => {
    setEodStatus(checkEodAllowed());
    const interval = setInterval(() => {
      setEodStatus(checkEodAllowed());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const isAakash = currentUser?.id === 'usr_aakash' || currentUser?.name?.toLowerCase().includes('aakash');

  return (
    <header className="glass-header sticky top-0 z-40 h-14 px-3 sm:px-5 lg:px-6 flex items-center justify-between gap-2 sm:gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] select-none">
      
      {/* Left: Hamburger (Mobile), Logo (Mobile), View Mode Switch & Responsive Search */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        
        {/* Mobile Hamburger Drawer Trigger (< lg) */}
        {onOpenMobileSidebar && (
          <button
            onClick={() => { sounds.playClick(); onOpenMobileSidebar(); }}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition-all cursor-pointer shrink-0"
            title="Open Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* Small Screen Brand Logo (shown only when persistent sidebar is hidden) */}
        <div className="lg:hidden flex items-center shrink-0 mr-0.5">
          <img 
            src="/urbangaon-logo.jpg" 
            alt="UrbanGaon" 
            className="h-7 w-auto object-contain max-w-[105px] hidden xs:block"
          />
        </div>

        {/* View Mode Toggle: [ Task Board | 📅 Sprint Calendar ] */}
        {setViewMode && (
          <div className="flex items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80 shrink-0">
            <button
              onClick={() => { sounds.playClick(); setViewMode('kanban'); }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Task Board"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Task Board</span>
            </button>

            <button
              onClick={() => { sounds.playClick(); setViewMode('calendar'); }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Sprint Calendar"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline">Calendar</span>
            </button>
          </div>
        )}

        {/* Responsive Global Search Bar */}
        <div className="relative w-28 sm:w-44 md:w-56 lg:w-72 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2 sm:pr-8 py-1.5 text-xs font-medium rounded-xl bg-slate-100/80 border border-slate-200/80 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 focus:bg-white transition-all shadow-2xs"
          />
          <span className="hidden md:inline-block absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded bg-white pointer-events-none shadow-2xs">
            ⌘K
          </span>
        </div>

      </div>

      {/* Right: EOD Checkout Action & Profile Badges */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        
        {/* + EOD Checkout (Adaptive text for mobile & desktop) */}
        <button
          onClick={() => { sounds.playClick(); openEODModal(); }}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap ${
            eodSubmittedToday
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
              : !eodStatus.isAllowed
              ? 'bg-amber-50/90 hover:bg-amber-100/80 text-amber-900 border border-amber-200/90 shadow-none'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20'
          }`}
          title={
            eodSubmittedToday
              ? "Today's EOD Report Logged"
              : !eodStatus.isAllowed
              ? `EOD Checkout unlocks at 6:15 PM (${eodStatus.formattedRemaining} left)`
              : "Submit End of Day Checkout"
          }
        >
          {eodSubmittedToday ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          ) : !eodStatus.isAllowed ? (
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          ) : (
            <Clock className="w-3.5 h-3.5 shrink-0" />
          )}
          
          {/* Text adapts smoothly: short on phone, complete on tablet/desktop */}
          <span className="inline sm:hidden">
            {eodSubmittedToday 
              ? '✓ EOD' 
              : !eodStatus.isAllowed 
              ? '6:15 PM' 
              : '+ EOD'}
          </span>
          <span className="hidden sm:inline">
            {eodSubmittedToday 
              ? '✓ EOD Logged' 
              : !eodStatus.isAllowed 
              ? `EOD at 6:15 PM (${eodStatus.formattedRemaining})` 
              : '+ EOD Checkout'}
          </span>
        </button>

        {/* Live Pulse Indicator Badge (hidden on mobile to prevent overcrowding) */}
        <div 
          className="hidden md:flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-800 text-[11px] font-bold shrink-0"
          title="Connected: Real-Time Sync Active"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="hidden xl:inline">Real-Time Sync</span>
        </div>

        {/* Logged-in User Badge */}
        <div 
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200/80 shrink-0"
          title={`Authenticated as ${currentUser?.name} (${isAakash ? 'Admin' : 'Member'})`}
        >
          <div 
            className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] text-white shadow-2xs shrink-0 ring-1 ring-white"
            style={{ backgroundColor: currentUser?.color || '#4f46e5' }}
          >
            {currentUser?.avatar || '??'}
          </div>
          <span className="text-xs font-bold text-slate-800 hidden xl:inline max-w-[90px] truncate">
            {currentUser?.name}
          </span>
          {currentUser?.role && (
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold border shrink-0 hidden 2xl:inline uppercase ${
              currentUser.role.toLowerCase() === 'ceo' 
                ? 'bg-amber-100 text-amber-900 border-amber-300' 
                : currentUser.role.toLowerCase() === 'admin'
                ? 'bg-indigo-100 text-indigo-900 border-indigo-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              {currentUser.role}
            </span>
          )}
        </div>

      </div>

    </header>
  );
}
