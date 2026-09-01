import React, { useState } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Eye, 
  Download,
  CheckCircle,
  FileSpreadsheet,
  FileText
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
  const [isExportingPDF, setIsExportingPDF] = useState(false);

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

  const getCleanRole = (role) => {
    if (!role) return 'Member';
    const lower = role.toLowerCase();
    if (lower === 'ceo' || lower === 'admin') return 'Admin';
    return 'Member';
  };

  // Export report to CSV (No Department, No CEO tag)
  const handleExportCSV = () => {
    sounds.playClick();
    const rows = [
      ['Member Name', 'Role', 'Status', 'Total Tasks', 'Completed Tasks', 'Pending Tasks', 'EOD Submitted'],
      ...memberList.map(m => [
        m.name,
        getCleanRole(m.role),
        m.status === 'online' ? 'Online' : m.status === 'logged_out' ? 'Clocked Out' : 'Offline',
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
    link.setAttribute("download", `UrbanGaon_Workforce_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export professional PDF report (No Department, No CEO tag)
  const handleExportPDF = async () => {
    sounds.playClick();
    setIsExportingPDF(true);
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Corporate Blue Header Banner
      doc.setFillColor(37, 99, 235); // #2563eb
      doc.rect(0, 0, 210, 28, 'F');

      // Title & Subtitle
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('UrbanGaon — Team Workforce & Performance Report', 14, 12);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}  |  UrbanGaon Enterprise Workspace`, 14, 20);

      // KPI Summary Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 34, 182, 22, 3, 3, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Team Members: ${userStats.total}   (Online: ${userStats.online}  |  Clocked Out: ${userStats.checked_out})`, 20, 43);
      doc.text(`Total Company Tasks: ${stats.total}   |   Completed: ${stats.completed} (${stats.completion_rate}%)   |   Pending: ${stats.total - stats.completed}`, 20, 50);

      // Table of Team Breakdown (No Department Column)
      const tableHeaders = [['#', 'Member Name', 'Role', 'Live Status', 'Completed', 'Pending', 'EOD Status']];
      const tableData = memberList.map((m, idx) => [
        idx + 1,
        m.name,
        getCleanRole(m.role),
        m.status === 'online' ? 'Online' : m.status === 'logged_out' ? 'Clocked Out' : 'Offline',
        m.completed_tasks,
        m.pending_tasks,
        m.has_submitted_eod ? 'Submitted (✓)' : 'Pending'
      ]);

      autoTable(doc, {
        head: tableHeaders,
        body: tableData,
        startY: 62,
        theme: 'striped',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8.5
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        styles: {
          cellPadding: 3.5,
          halign: 'left'
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          3: { fontStyle: 'bold' },
          4: { halign: 'center' },
          5: { halign: 'center' },
          6: { fontStyle: 'bold' }
        }
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`UrbanGaon Workspace Report • Page ${i} of ${pageCount}`, 14, 287);
      }

      const todayStr = new Date().toISOString().split('T')[0];
      doc.save(`UrbanGaon_Workforce_Report_${todayStr}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Could not generate PDF. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Banner */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
              Workforce Command Center
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Workforce Overview & Daily EOD Reports
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time visibility into team attendance, active workload, and daily checkout submissions.
          </p>
        </div>

        {/* Export Buttons: PDF + CSV */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>{isExportingPDF ? 'Generating PDF...' : 'Export PDF Report'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
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

        {/* Completion Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Completion Rate</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">{stats.completion_rate}%</span>
            <span className="text-xs font-semibold text-slate-500">({stats.completed}/{stats.total})</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {stats.in_progress} in progress
          </span>
        </div>

        {/* Blocked Tasks */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Blocked Tasks</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${stats.blocked > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {stats.blocked}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Requires attention
          </span>
        </div>

        {/* EOD Checkouts */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Today's EOD Checkouts</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-600">
              {memberList.filter(m => m.has_submitted_eod).length}/{userStats.total}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Team members clocked out
          </span>
        </div>

      </div>

      {/* Team Performance & Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Team Workload & Daily EOD Attendance
          </h3>
          <span className="text-xs text-slate-500">
            Click any member to open their task board
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Live Status</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-center">Completed</th>
                <th className="py-3 px-4 text-center">Pending</th>
                <th className="py-3 px-4">EOD Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memberList.map((member) => (
                <tr 
                  key={member.id}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-xs shrink-0 text-xs"
                        style={{ backgroundColor: member.color || '#2563eb' }}
                      >
                        {member.avatar}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{member.name}</span>
                        <span className="text-[11px] text-slate-400">{member.email}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {member.status === 'online' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online Now
                      </span>
                    ) : member.status === 'logged_out' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        Clocked Out 🏠
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        Offline
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-slate-600 font-medium capitalize">
                    {getCleanRole(member.role)}
                  </td>

                  <td className="py-3 px-4 text-center font-bold text-emerald-600">
                    {member.completed_tasks}
                  </td>

                  <td className="py-3 px-4 text-center font-bold text-amber-600">
                    {member.pending_tasks}
                  </td>

                  <td className="py-3 px-4">
                    {member.has_submitted_eod ? (
                      <button
                        onClick={() => { sounds.playClick(); setActiveReportModal(member.eod_report); }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>View EOD Report</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        Not submitted yet
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onSelectMemberFilter(member.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition-all cursor-pointer text-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Open Board</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EOD Report View Modal */}
      {activeReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {activeReportModal.user_name}'s EOD Report
                </h4>
                <p className="text-xs text-slate-500">
                  Submitted on {activeReportModal.report_date} at {new Date(activeReportModal.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-purple-100 text-purple-800 font-bold rounded-lg">
                Rating: {activeReportModal.day_rating}/5 ⭐
              </span>
            </div>

            <div className="space-y-3 text-xs max-h-96 overflow-y-auto pr-1">
              <div>
                <h5 className="font-bold text-slate-700 mb-1">Hours Logged:</h5>
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {activeReportModal.hours_worked} hours
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-700 mb-1">Completed Today ({activeReportModal.completed_tasks?.length || 0}):</h5>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  {(activeReportModal.completed_tasks || []).map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                  {(!activeReportModal.completed_tasks || activeReportModal.completed_tasks.length === 0) && (
                    <li className="text-slate-400 italic">None</li>
                  )}
                </ul>
              </div>

              <div>
                <h5 className="font-bold text-slate-700 mb-1">Pending Tasks ({activeReportModal.pending_tasks?.length || 0}):</h5>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  {(activeReportModal.pending_tasks || []).map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                  {(!activeReportModal.pending_tasks || activeReportModal.pending_tasks.length === 0) && (
                    <li className="text-slate-400 italic">None</li>
                  )}
                </ul>
              </div>

              <div>
                <h5 className="font-bold text-slate-700 mb-1">Blockers / Challenges:</h5>
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {activeReportModal.blockers || 'None'}
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-700 mb-1">Tomorrow's Priority:</h5>
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {activeReportModal.tomorrow_plan || 'Not specified'}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveReportModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
