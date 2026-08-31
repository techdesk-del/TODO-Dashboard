import React, { useState } from 'react';
import { 
  FileText, 
  Calendar, 
  Users, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Star, 
  ChevronRight,
  TrendingUp,
  Download
} from 'lucide-react';
import { sounds } from '../lib/audio';

export default function EODReportsHub({ eodReports, users }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);

  const filteredReports = eodReports.filter(report => {
    const matchesUser = selectedUser === 'all' || report.user_id === selectedUser;
    const matchesSearch = 
      report.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.report_date.includes(searchQuery) ||
      (report.blockers && report.blockers.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (report.tomorrow_plan && report.tomorrow_plan.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesUser && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Persistent Archive
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Total Reports: {eodReports.length}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-2">
            Team End-of-Day (EOD) Reports Hub (घर जाने के टाइम का डेटा)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete central audit trail of all employee daily checkouts, pending tasks reasons, and tomorrow's sprint plans.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs rounded-xl glass-input w-48 md:w-60"
            />
          </div>

          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="bg-surface-card border border-surface-border text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
          >
            <option value="all">All Team Members</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports Grid / Cards */}
      {filteredReports.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No EOD reports match your filter</h3>
          <p className="text-xs text-slate-500">Reports submitted during checkout will appear here in real-time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => {
            const completedCount = report.completed_tasks?.length || 0;
            const pendingCount = report.pending_tasks?.length || 0;

            return (
              <div
                key={report.id}
                onClick={() => { sounds.playClick(); setSelectedReport(report); }}
                className="glass-card rounded-2xl border border-surface-border p-5 cursor-pointer hover:border-indigo-500/50 flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top: Member Info & Date */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {report.user_name}
                      </h4>
                      <p className="text-xs text-slate-400">{report.department}</p>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-surface border border-surface-border text-slate-300">
                      📅 {report.report_date}
                    </span>
                  </div>

                  {/* Task counts pill */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-surface/60 border border-surface-border/50 text-xs mb-3">
                    <div className="text-emerald-400 font-medium">
                      ✓ {completedCount} Done
                    </div>
                    <div className="text-amber-400 font-medium">
                      ⏳ {pendingCount} Pending
                    </div>
                  </div>

                  {/* Blocker Snippet */}
                  {report.blockers && report.blockers !== 'None' && (
                    <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs mb-2">
                      <span className="text-rose-400 font-bold block text-[10px] uppercase">Blocker Mentioned:</span>
                      <p className="text-slate-300 text-[11px] line-clamp-2 mt-0.5">{report.blockers}</p>
                    </div>
                  )}

                  {/* Tomorrow Plan Snippet */}
                  {report.tomorrow_plan && (
                    <div className="p-2.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs">
                      <span className="text-indigo-400 font-bold block text-[10px] uppercase">Tomorrow's Focus:</span>
                      <p className="text-slate-300 text-[11px] line-clamp-2 mt-0.5">{report.tomorrow_plan}</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-surface-border/60 text-xs">
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    ⭐ {report.day_rating}/5
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    ⏱️ {report.hours_worked} hrs
                  </span>
                  <span className="text-indigo-400 font-medium text-xs flex items-center gap-1">
                    Details <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-[#111827] border border-surface-border rounded-3xl shadow-2xl p-6 space-y-5 animate-slide-up max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-surface-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  EOD Checkout Report: {selectedReport.user_name}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedReport.department} • Date: {selectedReport.report_date} • Submitted at {new Date(selectedReport.submitted_at).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Quick KPI Banner */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-surface/80 border border-surface-border">
              <div>
                <span className="text-[11px] text-slate-400 block">Completed Today</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">{selectedReport.completed_tasks?.length || 0} tasks</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Pending Rollover</span>
                <span className="text-lg font-bold text-amber-400 font-mono">{selectedReport.pending_tasks?.length || 0} tasks</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Productivity Rating</span>
                <span className="text-lg font-bold text-amber-400 font-mono">⭐ {selectedReport.day_rating}/5</span>
              </div>
            </div>

            {/* Tasks Completed */}
            <div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                Completed Tasks
              </h4>
              <div className="space-y-1.5">
                {(selectedReport.completed_tasks || []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No tasks completed today.</p>
                ) : (
                  selectedReport.completed_tasks.map((t, i) => (
                    <div key={i} className="text-xs p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-slate-200">
                      ✓ {t.title}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pending Tasks with detailed reasons */}
            <div>
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                Pending Tasks & Reasons (कल का प्लान)
              </h4>
              <div className="space-y-2">
                {(selectedReport.pending_tasks || []).length === 0 ? (
                  <p className="text-xs text-emerald-400 font-medium">All tasks were completed before logout!</p>
                ) : (
                  selectedReport.pending_tasks.map((t, i) => (
                    <div key={i} className="p-3 rounded-2xl bg-surface-card border border-surface-border space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">{t.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold uppercase">
                          {t.priority || 'pending'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        <span className="text-amber-400 font-semibold">Reason:</span> {t.reason}
                      </p>
                      <p className="text-xs text-slate-300">
                        <span className="text-indigo-400 font-semibold">Tomorrow's Plan:</span> {t.plan_for_tomorrow}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Blockers & Plan */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-surface-card border border-surface-border text-xs">
                <span className="font-bold text-rose-400 block mb-1">Roadblocks & Blockers:</span>
                <p className="text-slate-300">{selectedReport.blockers || 'None.'}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-surface-card border border-surface-border text-xs">
                <span className="font-bold text-indigo-400 block mb-1">Tomorrow's Primary Deliverable:</span>
                <p className="text-slate-300">{selectedReport.tomorrow_plan || 'Continue sprint deliverables.'}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
