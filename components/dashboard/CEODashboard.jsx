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
  History,
  Award,
  MessageSquare,
  ChevronDown
} from 'lucide-react';
import TaskRemarkModal from '@/components/tasks/TaskRemarkModal';
import { sounds } from '@/lib/audio';

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
  openNewTaskModal,
  onSaveRemark,
  onDeleteRemark
}) {
  const [activeReportModal, setActiveReportModal] = useState(null);
  const [activeRemarkTask, setActiveRemarkTask] = useState(null);
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

      const tableHeaders = [['#', 'Member Name', 'Role', 'Activity Status', 'Completed', 'Pending', `EOD (${selectedDate})`]];
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
      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
              Workforce Command Center
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Executive Overview & Task Control Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full visibility and management over all active team tasks, pending workloads, and daily checkouts.
          </p>
        </div>

        {/* Date Selector & Export Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
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
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>{isExportingPDF ? 'Generating...' : 'Export PDF'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        
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
        <div 
          onClick={() => {
            sounds.playClick();
            setTaskStatusFilter('pending');
            const el = document.getElementById('ceo-tasks-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group"
          title="Click to view all pending tasks"
        >
          <span className="text-xs font-semibold text-slate-500 group-hover:text-amber-700 block mb-1">Active Pending Tasks</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{pendingCount}</span>
            <span className="text-xs font-semibold text-slate-500">of {stats.total}</span>
          </div>
          <div className="mt-1">
            {overdueCount > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  sounds.playClick();
                  setTaskStatusFilter('overdue');
                  const el = document.getElementById('ceo-tasks-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                title="Click to view overdue tasks"
              >
                🔥 {overdueCount} overdue (Click to view)
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 block">All tasks on schedule</span>
            )}
          </div>
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
        
        let totalCompanyBooks = 0;
        let totalCompanyCompleted = 0;
        let totalCompanyInProgress = 0;
        let totalCompanyPresented = 0;
        let totalCompanyPages = 0;
        let totalCompanyPagesRead = 0;
        let totalPagesReadToday = 0;
        let membersReadTodayCount = 0;

        const memberReadingData = users.map(user => {
          const task = bookTasks.find(t => t.assigned_to === user.id);
          const logs = Array.isArray(task?.reading_logs) ? task.reading_logs : [];
          const todayLog = logs.find(l => l.date === todayStrLocal);
          const latestLog = logs[0] || null;

          const booksList = Array.isArray(task?.books_list) ? task.books_list : [];
          const totalBooks = Number(task?.book_stats?.total_books) || booksList.length || (task ? 1 : 0);
          const completedBooks = Number(task?.book_stats?.completed) || booksList.filter(b => b.status === 'completed').length || (task?.status === 'completed' ? 1 : 0);
          const inProgressBooks = Number(task?.book_stats?.in_progress) || booksList.filter(b => b.status === 'in_progress' || b.status !== 'completed').length || (task && task.status !== 'completed' ? 1 : 0);
          const presentedBooks = Number(task?.book_stats?.books_presented) || booksList.filter(b => b.presented).length || 0;
          const totalPagesRead = Number(task?.book_stats?.total_pages_read) || 0;
          const totalPages = Number(task?.book_stats?.total_pages) || 0;
          
          totalCompanyBooks += totalBooks;
          totalCompanyCompleted += completedBooks;
          totalCompanyInProgress += inProgressBooks;
          totalCompanyPresented += presentedBooks;
          totalCompanyPages += totalPages;
          totalCompanyPagesRead += totalPagesRead;

          if (todayLog && todayLog.pages_read > 0) {
            totalPagesReadToday += Number(todayLog.pages_read);
            membersReadTodayCount++;
          }

          const isAllCompleted = Boolean(
            task?.status === 'completed' || 
            (completedBooks > 0 && inProgressBooks === 0) || 
            (totalPages > 0 && totalPagesRead >= totalPages)
          );

          return {
            user,
            task,
            logs,
            todayLog,
            latestLog,
            totalBooks,
            completedBooks,
            inProgressBooks,
            presentedBooks,
            totalPagesRead,
            totalPages,
            booksList,
            isAllCompleted,
            bookTitle: task?.title || 'No Book Selected',
            author: task?.description || '',
            percent: totalPages > 0 ? Math.min(100, Math.round((totalPagesRead / totalPages) * 100)) : (isAllCompleted ? 100 : 0)
          };
        });

        const overallCompanyBookPercent = totalCompanyPages > 0 
          ? Math.min(100, Math.round((totalCompanyPagesRead / totalCompanyPages) * 100)) 
          : 0;

        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold shadow-2xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Executive Book Reading & Learning Analytics
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-600 text-white shadow-2xs">
                      Company Overview
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track total books, reading completion, presentations & daily progress across all 9 members.
                  </p>
                </div>
              </div>

              {/* Today's Velocity Badges */}
              <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1.5 shadow-2xs">
                  <span>⚡ Read Today:</span>
                  <span className="font-black text-emerald-950">{membersReadTodayCount}/{users.length} Active</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-center gap-1.5 shadow-2xs">
                  <span>📖 Today's Output:</span>
                  <span className="font-black text-indigo-950">+{totalPagesReadToday} pgs</span>
                </div>
              </div>
            </div>

            {/* 6 EXECUTIVE KPI CARDS FOR BOOK READING */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Total Books */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-slate-50 border border-indigo-100 shadow-2xs">
                <div className="flex items-center justify-between text-indigo-600 mb-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Total Books</span>
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-black text-slate-900">{totalCompanyBooks}</div>
                <span className="text-[10px] text-slate-400 font-medium">In company queue</span>
              </div>

              {/* Completed */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-slate-50 border border-emerald-100 shadow-2xs">
                <div className="flex items-center justify-between text-emerald-600 mb-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Completed</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-black text-emerald-700">{totalCompanyCompleted}</div>
                <span className="text-[10px] text-emerald-600 font-semibold">Fully finished</span>
              </div>

              {/* In Progress */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50/80 to-slate-50 border border-blue-100 shadow-2xs">
                <div className="flex items-center justify-between text-blue-600 mb-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">In Progress</span>
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-black text-blue-700">{totalCompanyInProgress}</div>
                <span className="text-[10px] text-blue-600 font-semibold">Being read now</span>
              </div>

              {/* Books Presented */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50/80 to-slate-50 border border-purple-100 shadow-2xs">
                <div className="flex items-center justify-between text-purple-600 mb-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Presented</span>
                  <Award className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-black text-purple-700">{totalCompanyPresented}</div>
                <span className="text-[10px] text-purple-600 font-semibold">Shared with team</span>
              </div>

              {/* Total Pages */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50/80 to-slate-50 border border-amber-100 shadow-2xs">
                <div className="flex items-center justify-between text-amber-600 mb-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Total Pages</span>
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-black text-amber-800">{totalCompanyPages.toLocaleString()}</div>
                <span className="text-[10px] text-slate-400 font-medium">Total volume</span>
              </div>

              {/* Total Pages Read */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-teal-50/80 to-slate-50 border border-teal-100 shadow-2xs">
                <div className="flex items-center justify-between text-teal-600 mb-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Pages Read</span>
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-black text-teal-700">
                  {totalCompanyPagesRead.toLocaleString()}
                </div>
                <span className="text-[10px] text-teal-600 font-bold">{overallCompanyBookPercent}% read so far</span>
              </div>
            </div>

            {/* Reading Grid Table - Smooth horizontal scroll on mobile */}
            <div className="border border-slate-200 rounded-xl overflow-x-auto matrix-scroll touch-scroll shadow-2xs">
              <table className="w-full min-w-[760px] table-fixed text-left text-xs border-collapse">
                <colgroup>
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '12%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Team Member</th>
                    <th className="py-2.5 px-3">Current Book & Author</th>
                    <th className="py-2.5 px-3">Books Status</th>
                    <th className="py-2.5 px-3">Today's Status</th>
                    <th className="py-2.5 px-3">Total Progress</th>
                    <th className="py-2.5 px-3 text-right">Insights / Logs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {memberReadingData.map(item => (
                    <tr key={item.user.id} className="hover:bg-indigo-50/20 transition-colors">
                      {/* 1. Team Member */}
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-extrabold text-white shadow-2xs shrink-0"
                            style={{ backgroundColor: item.user.color || '#2563eb' }}
                          >
                            {item.user.avatar || '??'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="leading-snug truncate text-[11.5px]" title={item.user.name}>{item.user.name}</div>
                            <div className="text-[9.5px] text-slate-400 font-normal capitalize truncate">{item.user.role}</div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Current Book & Author */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-indigo-950 truncate text-[11.5px]" title={item.bookTitle}>
                          {item.bookTitle}
                        </div>
                        {item.author ? (
                          <div className="text-[10px] text-slate-500 truncate mt-0.5" title={item.author}>
                            ✍️ {item.author}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">No author specified</div>
                        )}
                      </td>

                      {/* 3. Books Status (Consolidated Badges) */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs" title="Total books assigned">
                            {item.totalBooks} book{item.totalBooks === 1 ? '' : 's'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs" title="Completed books">
                            {item.completedBooks} done
                          </span>
                          {item.inProgressBooks > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs" title="In progress">
                              {item.inProgressBooks} active
                            </span>
                          )}
                          {item.presentedBooks > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs" title="Presented to team">
                              🎤 {item.presentedBooks}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Today's Reading Status */}
                      <td className="py-2.5 px-3">
                        {item.todayLog ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-[10.5px] border border-emerald-300 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                            <span>+{item.todayLog.pages_read} pgs</span>
                          </span>
                        ) : item.isAllCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-[10.5px] border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Finished</span>
                          </span>
                        ) : !item.task || item.totalBooks === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 text-slate-400 font-medium text-[10.5px] border border-slate-200">
                            ⚪ Inactive
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 font-bold text-[10.5px] border border-amber-200">
                            ⏳ Pending
                          </span>
                        )}
                      </td>

                      {/* 5. Overall Progress */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-700 mb-1">
                          <span className="truncate">{item.totalPagesRead} / {item.totalPages || '—'} pgs</span>
                          <span className="text-indigo-600 font-black ml-1 shrink-0">{item.percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </td>

                      {/* 6. Insights & History Action */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.latestLog?.takeaways && (
                            <span 
                              className="cursor-pointer text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50 transition-colors"
                              title={`Latest Takeaway: "${item.latestLog.takeaways}"`}
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                            </span>
                          )}
                          <button
                            onClick={() => {
                              sounds.playClick();
                              setSelectedReadingHistoryTask(item);
                            }}
                            className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10.5px] border border-indigo-200 transition-all inline-flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                            title="View reading timeline and logs"
                          >
                            <History className="w-3 h-3 shrink-0" />
                            <span>Logs ({item.logs.length})</span>
                          </button>
                        </div>
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
      <div id="ceo-tasks-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        
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

        {/* Status Filter Tabs & Column Navigator */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto matrix-scroll touch-scroll py-1">
          <div className="flex items-center gap-1.5 flex-nowrap">
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  taskStatusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tasks Table - Smooth horizontal scroll on mobile */}
        <div className="border border-slate-200 rounded-xl overflow-x-auto matrix-scroll touch-scroll shadow-2xs">
          <table className="w-full min-w-[880px] table-fixed text-left text-xs border-collapse">
            <colgroup>
              <col style={{ width: '27%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200 text-[11px]">
                <th className="py-3 px-3">Task Title & Details</th>
                <th className="py-3 px-2.5">Assignee</th>
                <th className="py-3 px-2">Priority</th>
                <th className="py-3 px-2.5">Due Date</th>
                <th className="py-3 px-2.5">💬 Remarks</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredCompanyTasks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No tasks found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredCompanyTasks.map(task => {
                  const isCompleted = task.status === 'completed';
                  const isOverdue = !isCompleted && task.due_date && new Date(task.due_date).getTime() < new Date(todayStr).getTime();
                  const isBook = Boolean(task.is_book_reading);
                  const booksList = Array.isArray(task.books_list) ? task.books_list : [];
                  const totalBooks = Number(task.book_stats?.total_books) || booksList.length || 0;
                  const completedBooks = Number(task.book_stats?.completed) || booksList.filter(b => b.status === 'completed').length || (task.status === 'completed' ? 1 : 0);
                  const inProgressBooks = Number(task.book_stats?.in_progress) || booksList.filter(b => b.status === 'in_progress' || b.status !== 'completed').length || (task.status !== 'completed' ? 1 : 0);
                  const totalPages = Number(task.book_stats?.total_pages) || 0;
                  const totalPagesRead = Number(task.book_stats?.total_pages_read) || 0;
                  const percent = totalPages > 0 ? Math.min(100, Math.round((totalPagesRead / totalPages) * 100)) : 0;

                  return (
                    <tr key={task.id} className="group hover:bg-slate-50/80 transition-colors">
                      
                      {/* 1. Title & Details */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className={`font-semibold text-xs tracking-tight leading-snug truncate ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`} title={task.title}>
                              {task.title}
                            </h4>
                            {isBook && (
                              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs shrink-0">
                                📚 Book
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-[10.5px] text-slate-500 truncate font-normal" title={task.description}>
                              {task.description}
                            </p>
                          )}
                          {isBook && (
                            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-indigo-800 bg-indigo-50/90 px-1.5 py-0.2 rounded border border-indigo-200/70">
                                📖 {completedBooks}/{totalBooks} Books ({percent}%)
                              </span>
                              {totalPages > 0 && (
                                <span className="text-[9.5px] text-slate-500 font-medium">
                                  {totalPagesRead}/{totalPages} pgs
                                </span>
                              )}
                            </div>
                          )}
                          {!isBook && Array.isArray(task.tags) && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {task.tags.map((t, idx) => (
                                <span key={idx} className="text-[9px] font-medium bg-slate-100/90 text-slate-600 px-1.5 py-0.2 rounded-full border border-slate-200/60">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 2. Assignee */}
                      <td className="py-3 px-2.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div 
                            className="w-5 h-5 rounded-full flex items-center justify-center font-extrabold text-white text-[9px] shadow-2xs shrink-0 ring-1 ring-white"
                            style={{ backgroundColor: task.assignee_color || '#2563eb' }}
                          >
                            {task.assignee_avatar || '??'}
                          </div>
                          <span className="font-semibold text-slate-800 text-[11.5px] truncate" title={task.assignee_name}>{task.assignee_name}</span>
                        </div>
                      </td>

                      {/* 3. Priority */}
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          task.priority === 'urgent' ? 'bg-rose-50 text-rose-700 border border-rose-200/70' :
                          task.priority === 'high' ? 'bg-amber-50 text-amber-700 border border-amber-200/70' :
                          task.priority === 'medium' ? 'bg-blue-50 text-blue-700 border border-blue-200/70' :
                          'bg-slate-50 text-slate-600 border border-slate-200/70'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            task.priority === 'urgent' ? 'bg-rose-600 animate-pulse' :
                            task.priority === 'high' ? 'bg-amber-500' :
                            task.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-400'
                          }`} />
                          <span>{task.priority || 'Normal'}</span>
                        </span>
                      </td>

                      {/* 4. Due Date */}
                      <td className="py-3 px-2.5 text-[11px] text-slate-600">
                        <div className="flex items-center gap-1 truncate" title={task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}>
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {task.due_date
                              ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              : (task.start_date ? `From ${new Date(task.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'No date')}
                          </span>
                        </div>
                        {isOverdue && (
                          <span className="text-[9px] font-bold px-1 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded inline-flex items-center gap-0.5 mt-0.5">
                            <Flame className="w-2.5 h-2.5 text-rose-600 shrink-0" /> Overdue
                          </span>
                        )}
                      </td>

                      {/* 5. Remarks */}
                      <td className="py-3 px-2.5">
                        {task.latest_remark || task.remarks?.[0]?.text ? (
                          <div 
                            onClick={() => { sounds.playClick(); setActiveRemarkTask(task); }}
                            className="p-1.5 rounded-lg bg-indigo-50/50 hover:bg-indigo-100/70 border border-indigo-100/80 text-xs text-indigo-950 cursor-pointer space-y-0.5 transition-all duration-150 hover:shadow-2xs"
                            title="Click to view full remark history"
                          >
                            <div className="flex items-center justify-between text-[9.5px]">
                              <span className="font-bold text-indigo-700 flex items-center gap-1 truncate">
                                <MessageSquare className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                <span className="truncate">{task.remarks?.[0]?.author_name || 'Remark'}</span>
                              </span>
                              {task.remarks?.length > 1 && (
                                <span className="px-1 py-0.1 rounded-full bg-indigo-200/90 font-extrabold text-[8.5px] text-indigo-900 shrink-0">
                                  +{task.remarks.length - 1}
                                </span>
                              )}
                            </div>
                            <p className="italic text-slate-600 truncate text-[10.5px]">
                              "{task.latest_remark || task.remarks?.[0]?.text}"
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => { sounds.playClick(); setActiveRemarkTask(task); }}
                            className="px-2 py-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-200 text-[10.5px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <MessageSquare className="w-3 h-3 shrink-0" />
                            <span>+ Note</span>
                          </button>
                        )}
                      </td>

                      {/* 6. Status Dropdown */}
                      <td className="py-3 px-2">
                        <div className="relative inline-block w-full max-w-[110px]">
                          <select
                            value={task.status}
                            onChange={(e) => {
                              sounds.playClick();
                              onStatusChange(task.id, e.target.value);
                            }}
                            className={`text-[10.5px] font-bold rounded-lg pl-2 pr-6 py-1 border appearance-none cursor-pointer focus:outline-none focus:ring-1 transition-all w-full truncate ${
                              task.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-300/80' :
                              task.status === 'in_progress' ? 'bg-blue-50 text-blue-800 border-blue-300/80' :
                              task.status === 'blocked' ? 'bg-rose-50 text-rose-800 border-rose-300/80' :
                              'bg-slate-50 text-slate-700 border-slate-300/80'
                            }`}
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="blocked">Blocked</option>
                            <option value="completed">Done ✓</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>

                      {/* 7. Action Buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { sounds.playClick(); setActiveRemarkTask(task); }}
                            title={task.remarks?.length > 0 ? `${task.remarks.length} Remark(s)` : 'Add Remark'}
                            className={`p-1 rounded-md transition-all cursor-pointer ${
                              task.remarks?.length > 0 
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs' 
                                : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                            }`}
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onEditTask(task)}
                            title="Edit Task Details"
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => { sounds.playClick(); onDeleteTask(task.id); }}
                            title="Delete Task"
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
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

        <div className="overflow-x-auto matrix-scroll touch-scroll">
          <table className="w-full min-w-[760px] table-fixed text-left text-xs border-collapse">
            <colgroup>
              <col style={{ width: '26%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
                <th className="py-3 px-3.5">Member</th>
                <th className="py-3 px-2.5">Presence</th>
                <th className="py-3 px-2.5">Role</th>
                <th className="py-3 px-2 text-center">Completed</th>
                <th className="py-3 px-2 text-center">Pending</th>
                <th className="py-3 px-2.5">EOD ({selectedDate})</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {memberList.map((member) => (
                <tr 
                  key={member.id}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  <td className="py-2.5 px-3.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white shadow-2xs shrink-0 text-xs"
                        style={{ backgroundColor: member.color || '#2563eb' }}
                      >
                        {member.avatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900 block truncate text-xs" title={member.name}>{member.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate" title={member.email}>{member.email}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-2.5 px-2.5">
                    {member.status === 'online' ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                    ) : member.status === 'logged_out' ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        Away
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10.5px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        Offline
                      </span>
                    )}
                  </td>

                  <td className="py-2.5 px-2.5 text-slate-600 font-medium capitalize truncate text-xs" title={getCleanRole(member.role)}>
                    {getCleanRole(member.role)}
                  </td>

                  <td className="py-2.5 px-2 text-center font-bold text-emerald-600 text-xs">
                    {member.completed_tasks}
                  </td>

                  <td className="py-2.5 px-2 text-center font-bold text-amber-600 text-xs">
                    <button
                      onClick={() => setTaskMemberFilter(member.id)}
                      className="hover:underline cursor-pointer"
                      title="Filter tasks above"
                    >
                      {member.pending_tasks}
                    </button>
                  </td>

                  <td className="py-2.5 px-2.5">
                    {member.has_submitted_eod ? (
                      <button
                        onClick={() => { sounds.playClick(); setActiveReportModal(member.eod_report); }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2 py-0.5 rounded-lg transition-all cursor-pointer shadow-2xs"
                      >
                        <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>View EOD</span>
                      </button>
                    ) : (
                      <span className="text-[10.5px] text-slate-400 italic">
                        Not submitted
                      </span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => onSelectMemberFilter(member.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition-all cursor-pointer text-[11px] shadow-2xs active:scale-95"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Board</span>
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg my-auto bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto">
            
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

            {/* Individual Books Breakdown (Book 1, Book 2...) */}
            {Array.isArray(selectedReadingHistoryTask.booksList) && selectedReadingHistoryTask.booksList.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                  📚 Books in Library ({selectedReadingHistoryTask.booksList.length})
                </span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-0.5">
                  {selectedReadingHistoryTask.booksList.map((b, i) => {
                    const bp = Number(b.total_pages) || 0;
                    const br = Number(b.pages_read) || 0;
                    const pct = bp > 0 ? Math.min(100, Math.round((br / bp) * 100)) : 0;
                    return (
                      <div key={b.id || i} className="p-2 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between gap-2 shadow-2xs">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate">
                            Book #{i + 1}: {b.title || 'Untitled'}
                          </span>
                          {b.author && (
                            <span className="text-[10.5px] text-slate-400 block truncate">
                              ✍️ {b.author}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-black text-indigo-700 block">
                            {br} / {bp || '—'} pgs ({pct}%)
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded inline-block ${
                            b.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {b.status === 'completed' ? 'Completed' : 'In Progress'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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

      {/* Task Remark Modal for CEO View */}
      {activeRemarkTask && (
        <TaskRemarkModal
          isOpen={Boolean(activeRemarkTask)}
          onClose={() => setActiveRemarkTask(null)}
          task={tasks.find(t => t.id === activeRemarkTask.id) || activeRemarkTask}
          allTasks={tasks}
          currentUser={currentUser}
          onSaveRemark={onSaveRemark}
          onDeleteRemark={onDeleteRemark}
        />
      )}

    </div>
  );
}
