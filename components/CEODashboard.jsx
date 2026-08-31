import React, { useState } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Eye, 
  Download,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { sounds } from '../lib/audio';

export default function CEODashboard({ 
  overview, 
  tasks, 
  users, 
  eodReports, 
  onSelectMemberFilter,
  openNewTaskModal 
}) {
  const [activeReportModal, setActiveReportModal] = useState(null);

  const stats = overview?.tasks || {
    total: 0,
    completed: 0,
    in_progress: 0,
    todo: 0,
    blocked: 0,
    completion_rate: 0
  };

  const userStats = overview?.users || {
    total: 0,
    online: 0,
    checked_out: 0
  };

  const memberList = overview?.memberBreakdown || [];

  // Export report to CSV
  const handleExportCSV = () => {
    sounds.playClick();
    const rows = [
      ['Member Name', 'Department', 'Role', 'Status', 'Total Tasks', 'Completed Tasks', 'Pending Tasks', 'EOD Submitted'],
      ...memberList.map(m => [
        m.name,
        m.department,
        m.role,
        m.status,
        m.total_tasks,
        m.completed_tasks,
        m.pending_tasks,
        m.has_submitted_eod ? 'YES' : 'NO'
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Company_Workforce_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Banner */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
              👑 CEO & Executive Command Center
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Workforce Overview & Daily EOD Reports
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time visibility into team attendance, active sprint workload, and daily checkout submissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export CSV Report
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Total Members */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Total Team Members</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{userStats.total}</span>
            <span className="text-xs font-semibold text-emerald-600">({userStats.online} online)</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {userStats.checked_out} checked out (EOD)
          </span>
        </div>

        {/* Total Tasks */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Total Sprint Tasks</span>
          <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
          <span className="text-[11px] text-slate-400 mt-1 block">Active across team</span>
        </div>

        {/* Completed */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <span className="text-xs font-semibold text-emerald-800 block mb-1">Completed Tasks</span>
          <span className="text-2xl font-bold text-emerald-600">{stats.completed}</span>
          <span className="text-[11px] text-emerald-700 mt-1 block">
            {stats.completion_rate}% completion rate
          </span>
        </div>

        {/* Pending */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm">
          <span className="text-xs font-semibold text-amber-800 block mb-1">Pending Backlog</span>
          <span className="text-2xl font-bold text-amber-600">{stats.todo + stats.in_progress}</span>
          <span className="text-[11px] text-amber-700 mt-1 block">
            {stats.blocked > 0 ? `${stats.blocked} blocked` : 'In progress'}
          </span>
        </div>

      </div>

      {/* Main Table: All Members Work Status */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            Team Member Attendance & EOD Submission Status
          </h3>
          <span className="text-xs text-slate-500 font-medium">Real-Time Data</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Member Name</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Presence Status</th>
                <th className="p-3.5 text-center">Completed Tasks</th>
                <th className="p-3.5 text-center">Pending Tasks</th>
                <th className="p-3.5">EOD Daily Report</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {memberList.map((m) => {
                const isOnline = m.status === 'online';
                const isCheckedOut = m.status === 'logged_out';

                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 flex items-center gap-2.5">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-sm"
                        style={{ backgroundColor: m.color || '#4f46e5' }}
                      >
                        {m.avatar}
                      </div>
                      <span className="font-bold text-slate-900">{m.name}</span>
                    </td>

                    <td className="p-3.5 text-slate-600">{m.department}</td>

                    <td className="p-3.5">
                      {isCheckedOut ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          Checked Out (EOD)
                        </span>
                      ) : isOnline ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                          Away
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-center font-bold text-emerald-600">
                      {m.completed_tasks} done
                    </td>

                    <td className="p-3.5 text-center font-bold text-amber-600">
                      {m.pending_tasks} pending
                    </td>

                    <td className="p-3.5">
                      {m.has_submitted_eod ? (
                        <button
                          onClick={() => { sounds.playClick(); setActiveReportModal(m.eod_report); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-semibold text-xs transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          View EOD Report
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs italic">
                          Not submitted yet
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => {
                          sounds.playClick();
                          onSelectMemberFilter(m.id);
                        }}
                        className="px-2.5 py-1 rounded-lg text-indigo-600 hover:bg-indigo-50 font-semibold text-xs transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Filter Tasks
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for viewing single EOD report */}
      {activeReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 space-y-4 animate-slide-up">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  EOD Checkout Report: {activeReportModal.user_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {activeReportModal.department} • Date: {activeReportModal.report_date}
                </p>
              </div>
              <button
                onClick={() => setActiveReportModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Completed */}
            <div>
              <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1.5">
                Completed Tasks ({activeReportModal.completed_tasks?.length || 0})
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {(activeReportModal.completed_tasks || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">None.</p>
                ) : (
                  activeReportModal.completed_tasks.map((t, idx) => (
                    <div key={idx} className="text-xs p-2 rounded-lg bg-emerald-50 text-emerald-900 font-medium">
                      ✓ {t.title}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pending with Reasons */}
            <div>
              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1.5">
                Pending Tasks & Reasons ({activeReportModal.pending_tasks?.length || 0})
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {(activeReportModal.pending_tasks || []).length === 0 ? (
                  <p className="text-xs text-emerald-700 font-semibold">All tasks were completed!</p>
                ) : (
                  activeReportModal.pending_tasks.map((t, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                      <p className="text-xs font-bold text-slate-800">{t.title}</p>
                      <p className="text-xs text-slate-600"><strong>Reason:</strong> {t.reason}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Blockers */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 block mb-0.5">Blockers / Roadblocks:</span>
              <p className="text-slate-600">{activeReportModal.blockers || 'None reported.'}</p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setActiveReportModal(null)}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
