import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Clock, 
  LogOut, 
  Plus, 
  LayoutDashboard, 
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import { sounds } from '../lib/audio';

export default function Header({ 
  currentUser, 
  setCurrentUser, 
  users, 
  socketConnected, 
  openNewTaskModal, 
  openEODModal,
  activeTab,
  setActiveTab,
  eodSubmittedToday
}) {
  const [time, setTime] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSwitchUser = (user) => {
    sounds.playClick();
    setCurrentUser(user);
    setUserDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 lg:px-8 py-3.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left: Brand & Main Navigation Tabs */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              ✓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-slate-900 tracking-tight">
                  Team Task Manager
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Real-Time
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Collaborative Task Management & End-of-Day Reporting
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => { sounds.playClick(); setActiveTab('workspace'); }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'workspace' 
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Task Board
            </button>
            <button
              onClick={() => { sounds.playClick(); setActiveTab('ceo'); }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ceo' 
                  ? 'bg-white text-amber-700 shadow-sm border border-slate-200' 
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Executive Overview
            </button>
          </div>
        </div>

        {/* Right: Actions, Member Switcher & EOD Button */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          
          {/* Add Task Button */}
          <button
            onClick={() => { sounds.playClick(); openNewTaskModal(); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Task</span>
          </button>

          {/* EOD Punch-Out Button */}
          <button
            onClick={() => { sounds.playClick(); openEODModal(); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border shadow-sm active:scale-95 ${
              eodSubmittedToday 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' 
                : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>{eodSubmittedToday ? 'EOD Submitted ✓' : 'EOD Checkout (Punch Out)'}</span>
          </button>

          {/* Member Profile Switcher (Clean Names Only) */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all text-left"
            >
              <div 
                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-sm"
                style={{ backgroundColor: currentUser?.color || '#4f46e5' }}
              >
                {currentUser?.avatar || '??'}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-slate-800">
                  {currentUser?.name}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {/* Switch Member Dropdown */}
            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-fade-in">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Switch Member</p>
                </div>
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {users.map((u) => {
                    const isSelected = u.id === currentUser?.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleSwitchUser(u)}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                          isSelected ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold' : 'hover:bg-slate-50 text-slate-700 font-medium'
                        }`}
                      >
                        <div 
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: u.color }}
                        >
                          {u.avatar}
                        </div>
                        <span className="text-xs truncate flex-1">{u.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex sm:hidden items-center justify-center gap-2 mt-2 pt-2 border-t border-slate-100">
        <button
          onClick={() => { sounds.playClick(); setActiveTab('workspace'); }}
          className={`flex-1 py-1.5 text-center rounded-lg text-xs font-semibold ${
            activeTab === 'workspace' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Task Board
        </button>
        <button
          onClick={() => { sounds.playClick(); setActiveTab('ceo'); }}
          className={`flex-1 py-1.5 text-center rounded-lg text-xs font-semibold ${
            activeTab === 'ceo' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Executive Overview
        </button>
      </div>
    </header>
  );
}
