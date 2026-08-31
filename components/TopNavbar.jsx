import React from 'react';
import { 
  Search, 
  Plus, 
  Bell, 
  FolderGit2,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { sounds } from '../lib/audio';

export default function TopNavbar({ 
  totalTasks, 
  currentUser, 
  openNewTaskModal, 
  openEODModal, 
  eodSubmittedToday,
  searchQuery,
  setSearchQuery
}) {
  const isAakash = currentUser?.id === 'usr_aakash' || currentUser?.name?.toLowerCase().includes('aakash');

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-20 flex items-center justify-between gap-4 shadow-sm">
      
      {/* Left: Tasks Count & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        
        {/* Count Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shrink-0">
          <FolderGit2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Tasks: {totalTasks}</span>
        </div>

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

      {/* Right: Actions, Live Badge & Locked User Identity */}
      <div className="flex items-center gap-3">
        
        {/* + EOD Checkout (Green Pill Button) */}
        <button
          onClick={() => { sounds.playClick(); openEODModal(); }}
          className={`hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 ${
            eodSubmittedToday
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          <span>{eodSubmittedToday ? '✓ EOD Logged' : '+ EOD Checkout'}</span>
        </button>

        {/* + New Task (Blue Pill Button) */}
        <button
          onClick={() => { sounds.playClick(); openNewTaskModal(); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Task</span>
        </button>

        {/* Live Pulse Indicator Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-Time Sync</span>
        </div>

        {/* Locked Logged-in User Badge (No Direct Switch Dropdown) */}
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

        {/* Notification Bell */}
        <button 
          onClick={() => { sounds.playClick(); }}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600" />
        </button>

      </div>

    </header>
  );
}
