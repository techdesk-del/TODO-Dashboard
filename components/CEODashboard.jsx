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
  FileText,
  Calendar,
  Star,
  Plus,
  Search,
  Filter,
  Flame,
  AlertCircle,
  Edit2,
  Trash2,
  CheckSquare,
  Layers,
  ArrowRight,
  BookOpen,
  Sparkles,
  History
} from 'lucide-react';
import { sounds } from '../lib/audio';

export default function CEODashboard({ 
  overview, 
  tasks, 
  users, 
  currentUser,
  eodReports, 
  onStatusChange,
  onEditTask,
  onDeleteTask,
  onSelectMemberFilter,
  openNewTaskModal 
}) {
  const [activeReportModal, setActiveReportModal] = useState(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedReadingHistoryTask, setSelectedReadingHistoryTask] = useState(null);
  
  // Executive Task Filter States
  const [taskStatusFilter, setTaskStatusFilter] = useState('all'); // 'all' | 'pending' | 'todo' | 'in_progress' | 'blocked' | 'completed' | 'overdue'
  const [taskMemberFilter, setTaskMemberFilter] = useState('all');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');

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

  // Filter EOD reports for the selected date
  const filteredEodReports = (eodReports || []).filter(r => r.report_date === selectedDate);
  const ratings = filteredEodReports.map(r => Number(r.day_rating) || 5);
  const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '5.0';
  const totalHoursWorked = filteredEodReports.reduce((acc, r) => acc + (Number(r.hours_worked) || 8), 0).toFixed(1);

  const memberList = (users || []).map(u => {
    const userTasks = (tasks || []).filter(t => t.assigned_to === u.id);
    const userCompleted = userTasks.filter(t => t.status === 'completed').length;
    const userPending = userTasks.filter(t => t.status !== 'completed').length;
    const userEod = filteredEodReports.find(r => r.user_id === u.id);

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role || 'member',
      status: u.status,
      avatar: u.avatar,
      color: u.color,
      total_tasks: userTasks.length,
      completed_tasks: userCompleted,
      pending_tasks: userPending,
      has_submitted_eod: !!userEod,
      eod_report: userEod || null
    };
  });

  const getCleanRole = (role) => {
    if (!role) return 'Member';
    const lower = role.toLowerCase();
    if (lower === 'ceo' || lower === 'admin') return 'Admin';
    return 'Member';
  };

  // Filter Company Tasks for Executive Task Matrix
  const todayStr = new Date().toISOString().split('T')[0];
  const allCompanyTasks = tasks || [];

  const filteredCompanyTasks = allCompanyTasks.filter(task => {
    // Member Filter
    if (taskMemberFilter !== 'all' && task.assigned_to !== taskMemberFilter) {
      return false;
    }

    // Status Filter
    const isOverdue = task.status !== 'completed' && task.due_date && new Date(task.due_date).getTime() < new Date(todayStr).getTime();
    if (taskStatusFilter === 'pending' && task.status === 'completed') return false;
    if (taskStatusFilter === 'overdue' && !isOverdue) return false;
    if (taskStatusFilter === 'todo' && task.status !== 'todo') return false;
    if (taskStatusFilter === 'in_progress' && (task.status !== 'in_progress' && task.status !== 'review')) return false;
    if (taskStatusFilter === 'blocked' && task.status !== 'blocked') return false;
    if (taskStatusFilter === 'completed' && task.status !== 'completed') return false;

    // Search Query
    if (taskSearchQuery) {
      const q = taskSearchQuery.toLowerCase();
      const match = 
        task.title.toLowerCase().includes(q) ||
        (task.description && task.description.toLowerCase().includes(q)) ||
        (task.assignee_name && task.assignee_name.toLowerCase().includes(q)) ||
        (task.tags && task.tags.some(t => t.toLowerCase().includes(q)));
      if (!match) return false;
    }

    return true;
  });

  const pendingCount = allCompanyTasks.filter(t => t.status !== 'completed').length;
  const overdueCount = allCompanyTasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date).getTime() < new Date(todayStr).getTime()).length;

  // Export report to CSV
  const handleExportCSV = () => {
    sounds.playClick();
    const rows = [
      ['Member Name', 'Role', 'Status', 'Total Tasks', 'Completed Tasks', 'Pending Tasks', `EOD Submitted (${selectedDate})`],
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
    link.setAttribute("download", `UrbanGaon_Workforce_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export professional PDF report
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

      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('UrbanGaon — Team Workforce & Performance Report', 14, 12);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Report Date: ${selectedDate}  |  Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}  |  UrbanGaon Workspace`, 14, 20);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 34, 182, 22, 3, 3, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Team Members: ${userStats.total}   (EOD Checkouts: ${filteredEodReports.length}/${userStats.total})   |   Avg Rating: ${avgRating} / 5.0 ⭐`, 20, 43);
      doc.text(`Total Tasks: ${stats.total}   |   Completed: ${stats.completed} (${stats.completion_rate}%)   |   Hours Logged: ${totalHoursWorked} hrs`, 20, 50);

      const tableHeaders = [['#', 'Member Name', 'Role', 'Live Status', 'Completed', 'Pending', `EOD (${selectedDate})`]];
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

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`UrbanGaon Workspace Report • Page ${i} of ${pageCount}`, 14, 287);
      }

      doc.save(`UrbanGaon_Workforce_Report_${selectedDate}.pdf`);
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
            Executive Overview & Task Control Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full visibility and management over all active team tasks, pending workloads, and daily checkouts.
          </p>
        </div>

        {/* Date Selector & Export Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shadow-xs">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>{isExportingPDF ? 'Generating PDF...' : 'Export PDF'}</span>
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
            {userStats.checked_out} clocked out
          </span>
        </div>

        {/* Pending Active Workload */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Active Pending Tasks</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{pendingCount}</span>
            <span className="text-xs font-semibold text-slate-500">of {stats.total}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {overdueCount > 0 ? `${overdueCount} overdue` : 'All tasks on schedule'}
          </span>
        </div>

        {/* Sprint Completion Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Completion Rate</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">{stats.completion_rate}%</span>
            <span className="text-xs font-semibold text-slate-500">({stats.completed} done)</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {stats.in_progress} in progress
          </span>
        </div>

        {/* EOD Attendance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block mb-1">EOD Checkouts ({selectedDate})</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-600">
              {filteredEodReports.length}/{userStats.total}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Avg rating: {avgRating} ⭐
          </span>
        </div>

      </div>

      {/* SECTION: TEAM DAILY BOOK READING TRACKER */}
      {(() => {
        const bookTasks = allCompanyTasks.filter(t => t.is_book_reading);
        const todayStrLocal = new Date().toISOString().split('T')[0];
        
        let totalPagesReadToday = 0;
        let membersReadTodayCount = 0;
        let totalCumulativePages = 0;

        const memberReadingData = users.map(user => {
          const task = bookTasks.find(t => t.assigned_to === user.id);
          const logs = Array.isArray(task?.reading_logs) ? task.reading_logs : [];
          const todayLog = logs.find(l => l.date === todayStrLocal);
          const latestLog = logs[0] || null;

          const totalPagesRead = Number(task?.book_stats?.total_pages_read) || 0;
          const totalPages = Number(task?.book_stats?.total_pages) || 0;
          
          if (todayLog && todayLog.pages_read > 0) {
            totalPagesReadToday += Number(todayLog.pages_read);
            membersReadTodayCount++;
          }
          totalCumulativePages += totalPagesRead;

          return {
            user,
            task,
            logs,
            todayLog,
            latestLog,
            totalPagesRead,
            totalPages,
            bookTitle: task?.title || 'No Book Selected',
            author: task?.description || '',
            percent: totalPages > 0 ? Math.min(100, Math.round((totalPagesRead / totalPages) * 100)) : 0
          };
        });

        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Team Daily Book Reading Tracker
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-600 text-white">
                      Daily Activity
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track daily pages read, key learnings & book completion across all 9 team members.
                  </p>
                </div>
              </div>

              {/* Summary Stats Badges */}
              <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1.5">
                  <span>⚡ Read Today:</span>
                  <span className="font-black text-emerald-950">{membersReadTodayCount}/{users.length} Members</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-center gap-1.5">
                  <span>📖 Today's Pages:</span>
                  <span className="font-black text-indigo-950">+{totalPagesReadToday} pgs</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 flex items-center gap-1.5">
                  <span>📚 Total Read:</span>
                  <span className="font-black text-purple-950">{totalCumulativePages} pgs</span>
                </div>
              </div>
            </div>

            {/* Reading Grid Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-3 px-4">Team Member</th>
                    <th className="py-3 px-4">Current Book & Author</th>
                    <th className="py-3 px-4">Today's Reading Status</th>
                    <th className="py-3 px-4">Overall Progress</th>
                    <th className="py-3 px-4">Latest Insights / Key Learnings</th>
                    <th className="py-3 px-4 text-right">History</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberReadingData.map(item => (
                    <tr key={item.user.id} className="hover:bg-indigo-50/30 transition-colors">
                      {/* Team Member */}
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-extrabold text-white shadow-2xs shrink-0"
                            style={{ backgroundColor: item.user.color || '#2563eb' }}
                          >
                            {item.user.avatar || '??'}
                          </div>
                          <div>
                            <div className="leading-snug">{item.user.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{item.user.role}</div>
                          </div>
                        </div>
                      </td>

                      {/* Current Book & Author */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="font-bold text-indigo-950 truncate" title={item.bookTitle}>
                          {item.bookTitle}
                        </div>
                        {item.author && (
                          <div className="text-[10.5px] text-slate-500 truncate" title={item.author}>
                            ✍️ {item.author}
                          </div>
                        )}
                      </td>

                      {/* Today's Reading Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.todayLog ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-black text-xs border border-emerald-300 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            +{item.todayLog.pages_read} pages read
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200">
                            ⏳ No log yet today
                          </span>
                        )}
                      </td>

                      {/* Overall Progress */}
                      <td className="py-3 px-4 min-w-[140px]">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                          <span>{item.totalPagesRead} / {item.totalPages || '—'} pgs</span>
                          <span className="text-indigo-600">{item.percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </td>

                      {/* Latest Insights / Learnings */}
                      <td className="py-3 px-4 max-w-xs">
                        {item.latestLog?.takeaways ? (
                          <p className="text-[11px] text-slate-700 bg-slate-50 p-1.5 rounded-lg border border-slate-200/70 italic line-clamp-2">
                            "{item.latestLog.takeaways}"
                          </p>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* History Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            sounds.playClick();
                            setSelectedReadingHistoryTask(item);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <History className="w-3 h-3" />
                          <span>Logs ({item.logs.length})</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* SECTION 1: LIVE TASK QUEUE & EXECUTIVE MODIFICATION MATRIX */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Live Company Tasks & Pending Work Matrix
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {filteredCompanyTasks.length} tasks
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect, modify status, edit details, or delete any task across all 9 team members in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search tasks, tags..."
                value={taskSearchQuery}
                onChange={(e) => setTaskSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 w-44"
              />
            </div>

            {/* Member Filter */}
            <select
              value={taskMemberFilter}
              onChange={(e) => setTaskMemberFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Members</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>

            {/* Create New Task Button */}
            <button
              onClick={() => { sounds.playClick(); openNewTaskModal('todo'); }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: `All (${allCompanyTasks.length})` },
            { id: 'pending', label: `Pending Active (${pendingCount})` },
            { id: 'overdue', label: `🔥 Overdue (${overdueCount})` },
            { id: 'todo', label: 'To Do' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'blocked', label: 'Blocked' },
            { id: 'completed', label: `Completed (${stats.completed})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { sounds.playClick(); setTaskStatusFilter(tab.id); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                taskStatusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tasks Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-4">Task Title & Details</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status & Quick Change</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCompanyTasks.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    No tasks found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredCompanyTasks.map(task => {
                  const isCompleted = task.status === 'completed';
                  const isOverdue = !isCompleted && task.due_date && new Date(task.due_date).getTime() < new Date(todayStr).getTime();

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                      
                      {/* Title & Description */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="space-y-0.5">
                          <h4 className={`font-bold text-slate-900 ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {task.description}
                            </p>
                          )}
                          {task.is_book_reading && task.book_stats && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
                              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                📚 Total: {task.book_stats.total_books || 0}
                              </span>
                              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✅ Done: {task.book_stats.completed || 0}
                              </span>
                              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                📖 Reading: {task.book_stats.in_progress || 0}
                              </span>
                              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                🎤 Presented: {task.book_stats.books_presented || 0}
                              </span>
                              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                📄 Total Pages: {task.book_stats.total_pages || 0}
                              </span>
                              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                                📖 Read: {task.book_stats.total_pages_read || 0}
                              </span>
                            </div>
                          )}
                          {Array.isArray(task.tags) && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {task.tags.map((t, idx) => (
                                <span key={idx} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-white text-[10px] shadow-xs shrink-0"
                            style={{ backgroundColor: task.assignee_color || '#2563eb' }}
                          >
                            {task.assignee_avatar || '??'}
                          </div>
                          <span className="font-bold text-slate-800">{task.assignee_name}</span>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                          task.priority === 'urgent' ? 'bg-rose-100 text-rose-800' :
                          task.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                          task.priority === 'medium' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {task.priority}
                        </span>
                      </td>

                      {/* Due Date & Overdue Badge */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="text-slate-700 font-mono text-[11px] block">
                            {task.due_date || 'No Date'}
                          </span>
                          {isOverdue && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 font-bold rounded flex items-center gap-1 w-max">
                              <Flame className="w-2.5 h-2.5 text-rose-600" /> Overdue
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Dropdown (Direct Executive Modify) */}
                      <td className="py-3 px-4">
                        <select
                          value={task.status}
                          onChange={(e) => {
                            sounds.playClick();
                            onStatusChange(task.id, e.target.value);
                          }}
                          className={`text-xs font-bold rounded-lg px-2.5 py-1 border cursor-pointer focus:outline-none transition-colors ${
                            task.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            task.status === 'in_progress' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                            task.status === 'blocked' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                            'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="blocked">Blocked</option>
                          <option value="completed">Completed ✓</option>
                        </select>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditTask(task)}
                            title="Edit Task Details"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { sounds.playClick(); onDeleteTask(task.id); }}
                            title="Delete Task"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: TEAM ATTENDANCE & EOD BREAKDOWN */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Team Workload & Attendance for {selectedDate}
          </h3>
          <span className="text-xs text-slate-500">
            Click any member to filter their tasks above
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
                <th className="py-3 px-4">EOD ({selectedDate})</th>
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
                    <button
                      onClick={() => setTaskMemberFilter(member.id)}
                      className="hover:underline cursor-pointer"
                      title="Filter tasks above"
                    >
                      {member.pending_tasks}
                    </button>
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
                        Not submitted on {selectedDate}
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
                  Submitted for date {activeReportModal.report_date} at {new Date(activeReportModal.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                <h5 className="font-bold text-slate-700 mb-1">Completed Tasks ({activeReportModal.completed_tasks?.length || 0}):</h5>
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

      {/* Member Reading History Modal */}
      {selectedReadingHistoryTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg my-6 bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4 animate-slide-up">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-extrabold text-white shadow-2xs shrink-0"
                  style={{ backgroundColor: selectedReadingHistoryTask.user?.color || '#4f46e5' }}
                >
                  {selectedReadingHistoryTask.user?.avatar || '??'}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    {selectedReadingHistoryTask.user?.name} — Reading Timeline
                  </h4>
                  <p className="text-xs text-indigo-700 font-semibold truncate max-w-xs">
                    📖 {selectedReadingHistoryTask.bookTitle} {selectedReadingHistoryTask.author ? `(by ${selectedReadingHistoryTask.author})` : ''}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedReadingHistoryTask(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
              >
                Close
              </button>
            </div>

            {/* Total Stats summary banner */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="text-[10.5px] font-bold text-slate-500 block">Total Read</span>
                <span className="text-sm font-black text-indigo-950">
                  {selectedReadingHistoryTask.totalPagesRead} {selectedReadingHistoryTask.totalPages ? `/ ${selectedReadingHistoryTask.totalPages}` : ''} pages
                </span>
              </div>
              <span className="text-xs font-black px-2.5 py-1 bg-indigo-600 text-white rounded-lg shadow-2xs">
                {selectedReadingHistoryTask.percent}% Completed
              </span>
            </div>

            {/* Daily Logs Timeline list */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {(!selectedReadingHistoryTask.logs || selectedReadingHistoryTask.logs.length === 0) ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No daily reading check-ins recorded yet for this member.
                </div>
              ) : (
                selectedReadingHistoryTask.logs.map((log, idx) => (
                  <div 
                    key={log.id || idx}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        {log.date}
                      </span>
                      <span className="font-black text-xs px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                        +{log.pages_read} pages
                      </span>
                    </div>
                    {log.takeaways && (
                      <p className="text-[11.5px] text-slate-700 bg-white p-2 rounded-xl border border-slate-100 leading-relaxed italic">
                        "{log.takeaways}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
