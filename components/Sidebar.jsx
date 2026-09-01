import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  ChevronRight, 
  Lock
} from 'lucide-react';
import { sounds } from '../lib/audio';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  users, 
  currentUser, 
  selectedMemberFilter, 
  setSelectedMemberFilter, 
  onLogout 
}) {
  // EXCLUSIVE ACCESS: Only Aakash Das has Executive Overview access
  const isAakash = currentUser?.id === 'usr_aakash' || currentUser?.name?.toLowerCase().includes('aakash');
  const onlineCount = users.filter(u => u.status === 'online').length;

  const handleSelectMember = (userId) => {
    sounds.playClick();
    if (selectedMemberFilter === userId) {
      setSelectedMemberFilter('all');
    } else {
      setSelectedMemberFilter(userId);
      setActiveTab('workspace');
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 shrink-0 z-30 select-none">
      
      {/* Brand Header with Exact UrbanGaon Logo */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-center">
        <img 
          src="/urbangaon-logo.jpg" 
          alt="UrbanGaon — a perfect balance" 
          className="h-10 w-auto object-contain max-w-[210px]"
        />
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        
        {/* Main Links */}
        <div className="space-y-1">
          <button
            onClick={() => { sounds.playClick(); setActiveTab('workspace'); setSelectedMemberFilter(currentUser?.id || 'all'); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'workspace' && selectedMemberFilter === currentUser?.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>My Private Tasks</span>
          </button>

          {/* All Company Tasks Board (Exclusive to Aakash Das) */}
          {isAakash && (
            <button
              onClick={() => { sounds.playClick(); setActiveTab('workspace'); setSelectedMemberFilter('all'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'workspace' && selectedMemberFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>All Company Tasks</span>
            </button>
          )}

          {/* Executive Overview (Restricted EXCLUSIVELY to Aakash Das) */}
          {isAakash ? (
            <button
              onClick={() => { sounds.playClick(); setActiveTab('ceo'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'ceo'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <span>Executive Overview</span>
            </button>
          ) : (
            <div 
              title="Restricted Exclusively to Aakash Das"
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 opacity-60 cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4" />
                <span>Executive Overview</span>
              </div>
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            </div>
          )}
        </div>

        {/* Team Presence Section */}
        <div>
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Team Presence ({onlineCount}/{users.length} Active)
            </span>
            {selectedMemberFilter !== currentUser?.id && selectedMemberFilter !== 'all' && (
              <button
                onClick={() => { sounds.playClick(); setSelectedMemberFilter(currentUser?.id || 'all'); }}
                className="text-[10px] text-blue-600 hover:underline font-bold"
              >
                Back to Me
              </button>
            )}
          </div>

          <div className="space-y-1">
            {users.map((u) => {
              const isSelected = selectedMemberFilter === u.id;
              const isOnline = u.status === 'online';
              const isClockedOut = u.status === 'logged_out';
              const isMe = u.id === currentUser?.id;

              return (
                <button
                  key={u.id}
                  onClick={() => handleSelectMember(u.id)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-all text-left group ${
                    isSelected
                      ? 'bg-blue-50 text-blue-800 font-bold border border-blue-200'
                      : isMe 
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span 
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isOnline 
                          ? 'bg-emerald-500 ring-2 ring-emerald-200 animate-pulse' 
                          : isClockedOut 
                          ? 'bg-amber-400' 
                          : 'bg-slate-300'
                      }`}
                      title={isOnline ? '🟢 Active Now' : isClockedOut ? '🏠 Clocked Out' : '⚪ Offline'}
                    />
                    <span className="truncate">{u.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isMe && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-extrabold">
                        You
                      </span>
                    )}
                    {isOnline ? (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                        Active
                      </span>
                    ) : isClockedOut ? (
                      <span className="text-[9px] font-medium text-amber-700 bg-amber-50 px-1 rounded">
                        Away
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Settings */}
        <div className="pt-2 border-t border-slate-100 space-y-1">
          <button
            onClick={() => { sounds.playClick(); }}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>

      </div>

      {/* User Footer with Sign Out */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div 
            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] text-white shadow-sm shrink-0"
            style={{ backgroundColor: currentUser?.color || '#2563eb' }}
          >
            {currentUser?.avatar || '??'}
          </div>
          <span className="text-xs font-bold text-slate-800 truncate" title={currentUser?.name}>
            {currentUser?.name}
          </span>
        </div>

        <button
          onClick={() => { sounds.playClick(); onLogout(); }}
          title="Sign out from this account"
          className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>

    </aside>
  );
}
