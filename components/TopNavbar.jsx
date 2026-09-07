import React, { useState, useEffect } from 'react';
import { 
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
import { sounds } from '../lib/audio';
import { checkEodAllowed } from '../lib/timeUtils';

export default function TopNavbar({ 
  totalTasks, 
  currentUser, 
  openNewTaskModal, 
  openEODModal, 
  eodSubmittedToday, 
  searchQuery, 
  setSearchQuery,
  viewMode,
  setViewMode
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
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 sticky top-0 z-40 flex items-center justify-between gap-4 sm:gap-8 shadow-xs select-none">
      
      {/* Left: View Mode Switch & Fixed-Width Search Bar */}
      <div className="flex items-center gap-3 shrink-0">
        
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
              <span className="hidden sm:inline">Task Board</span>
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
              <span className="hidden sm:inline">Calendar</span>
            </button>
          </div>
        )}

        {/* Global Search Bar (Dedicated, Non-Collapsing Width) */}
        <div className="relative w-52 sm:w-64 md:w-72 lg:w-80 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks, members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-12 py-1.5 text-xs font-medium rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
          />
          <span className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 text-[9.5px] font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded bg-white font-mono pointer-events-none">
            ⌘K
          </span>
        </div>

      </div>

      {/* Right: Actions, Live Badge & Notification Center (Pushed to the right with ml-auto) */}
      <div className="flex items-center gap-2.5 shrink-0 ml-auto">
        
        {/* + EOD Checkout (Protected by 6:15 PM Rule) */}
        <button
          onClick={() => { sounds.playClick(); openEODModal(); }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap ${
            eodSubmittedToday
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : !eodStatus.isAllowed
              ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-none'
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
          <span>
            {eodSubmittedToday 
              ? '✓ EOD Logged' 
              : !eodStatus.isAllowed 
              ? `EOD at 6:15 PM (${eodStatus.formattedRemaining})` 
              : '+ EOD Checkout'}
          </span>
        </button>

        {/* + New Task */}
        <button
          onClick={() => { sounds.playClick(); openNewTaskModal(); }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Task</span>
        </button>

        {/* Live Pulse Indicator Badge */}
        <div 
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold shrink-0"
          title="Connected: Real-Time Sync Active"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="hidden 2xl:inline">Real-Time Sync</span>
        </div>

        {/* Locked Logged-in User Badge */}
        <div 
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 shrink-0"
          title={`Authenticated as ${currentUser?.name} (${isAakash ? 'Admin' : 'Member'})`}
        >
          <div 
            className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] text-white shadow-xs shrink-0"
            style={{ backgroundColor: currentUser?.color || '#2563eb' }}
          >
            {currentUser?.avatar || '??'}
          </div>
          <span className="text-xs font-bold text-slate-800 hidden 2xl:inline max-w-[100px] truncate">
            {currentUser?.name}
          </span>
          {currentUser?.role && (
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold border shrink-0 hidden 2xl:inline uppercase ${
              currentUser.role.toLowerCase() === 'ceo' 
                ? 'bg-amber-100 text-amber-900 border-amber-300' 
                : currentUser.role.toLowerCase() === 'admin'
                ? 'bg-blue-100 text-blue-900 border-blue-300'
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
