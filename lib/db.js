require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Task = require('./models/Task');
const EODReport = require('./models/EODReport');
const ActivityLog = require('./models/ActivityLog');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/urban_gaon_todo';

let isConnected = false;

// 9 Official Team Members
const initialTeamMembers = [
  { id: 'usr_shyamsundar', name: 'Shyamsundar Varma', email: 'shyamsundar@urbangaon.com', avatar: 'SV', color: '#f59e0b', role: 'ceo', pin: '1234', status: 'offline', last_heartbeat: new Date(0) },
  { id: 'usr_aakash', name: 'Aakash Das', email: 'aakash.das@urbangaon.com', avatar: 'AD', color: '#6366f1', role: 'admin', pin: '1234', status: 'offline', last_heartbeat: new Date(0) },
  { id: 'usr_yudhister', name: 'Yudhister Tiwari', email: 'yudhister.t@urbangaon.com', avatar: 'YT', color: '#10b981', role: 'member', pin: '1234', status: 'offline', last_heartbeat: new Date(0) },
  { id: 'usr_rekha', name: 'Dr Rekha Pareek', email: 'rekha.pareek@urbangaon.com', avatar: 'RP', color: '#a855f7', role: 'member', pin: '1234', status: 'offline', last_heartbeat: new Date(0) },
  { id: 'usr_sanjay', name: 'Sanjay', email: 'sanjay@urbangaon.com', avatar: 'SJ', color: '#06b6d4', role: 'member', pin: '1234', status: 'offline', last_heartbeat: new Date(0) },
  { id: 'usr_ayaz', name: 'Ayaz', email: 'ayaz@urbangaon.com', avatar: 'AY', color: '#ec4899', role: 'member', pin: '1234', status: 'offline', last_heartbeat: new Date(0) },
  { id: 'usr_utkarsh', name: 'Utkarsh', email: 'utkarsh@urbangaon.com', avatar: 'UT', color: '#3b82f6', role: 'member', pin: '1234', status: 'offline', last_heartbeat: new Date(0) },
  { id: 'usr_pratap', name: 'Pratap', email: 'pratap@urbangaon.com', avatar: 'PR', color: '#14b8a6', role: 'member', pin: '1234', status: 'offline', last_heartbeat: new Date(0) },
  { id: 'usr_varun', name: 'Varun Mudgal', email: 'varun.mudgal@urbangaon.com', avatar: 'VM', color: '#f97316', role: 'member', pin: '1234', status: 'offline', last_heartbeat: new Date(0) }
];

// Dedicated Default Book Reading Task for all 9 Team Members (Clean initial state for self-input)
const defaultBookReadingTasks = initialTeamMembers.map((member) => ({
  id: `tsk_book_${member.id}`,
  title: '📖 Book Reading',
  description: '',
  status: 'todo',
  priority: 'medium',
  assigned_to: member.id,
  created_by: 'usr_shyamsundar',
  due_date: '',
  tags: ['BookReading'],
  subtasks: [],
  estimated_hours: 0,
  logged_hours: 0,
  is_book_reading: true,
  book_stats: {
    total_books: 0,
    completed: 0,
    in_progress: 0,
    books_presented: 0,
    total_pages: 0,
    total_pages_read: 0
  }
}));

let memoryDb = {
  users: [...initialTeamMembers],
  tasks: [...defaultBookReadingTasks],
  eod_reports: [],
  activity_logs: []
};

// 12 seconds threshold for online presence
const ONLINE_HEARTBEAT_THRESHOLD_MS = 12000;

function computeLiveStatus(user) {
  const lastHb = user.last_heartbeat ? new Date(user.last_heartbeat).getTime() : 0;
  const isHeartbeatFresh = (Date.now() - lastHb) < ONLINE_HEARTBEAT_THRESHOLD_MS;

  if (isHeartbeatFresh) {
    return 'online';
  }
  if (user.status === 'logged_out') {
    return 'logged_out';
  }
  return 'offline';
}

async function connectToMongo() {
  if (isConnected) return true;
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000
    });
    isConnected = true;

    // Ensure all 9 members exist in Atlas with updated emails
    for (const member of initialTeamMembers) {
      await User.findOneAndUpdate(
        { id: member.id },
        { 
          $set: { 
            name: member.name, 
            email: member.email, 
            avatar: member.avatar, 
            color: member.color,
            role: member.role,
            pin: member.pin
          },
          $setOnInsert: { 
            status: 'offline',
            last_heartbeat: new Date(0)
          } 
        },
        { upsert: true }
      );
    }

    // Ensure all members have their Book Reading task automatically
    for (const bookTask of defaultBookReadingTasks) {
      await Task.findOneAndUpdate(
        { id: bookTask.id },
        { 
          $setOnInsert: {
            id: bookTask.id,
            title: bookTask.title,
            description: bookTask.description,
            status: bookTask.status,
            priority: bookTask.priority,
            assigned_to: bookTask.assigned_to,
            created_by: bookTask.created_by,
            due_date: bookTask.due_date,
            tags: bookTask.tags,
            subtasks: bookTask.subtasks,
            estimated_hours: bookTask.estimated_hours,
            logged_hours: bookTask.logged_hours,
            is_book_reading: bookTask.is_book_reading,
            book_stats: bookTask.book_stats,
            reading_logs: []
          } 
        },
        { upsert: true }
      );
    }

    return true;
  } catch (err) {
    console.warn(`> ⚠️ MongoDB connection notice (${err.message}). Using high-performance operational cache.`);
    isConnected = false;
    return false;
  }
}

connectToMongo();

const dbHelpers = {
  connect: connectToMongo,

  // Live Heartbeat for Real-Time Presence (Non-blocking high-speed write-behind)
  heartbeat: async (userId) => {
    if (!userId) return null;
    const now = new Date();

    // Instant in-memory cache update (0ms latency for client)
    const memUser = memoryDb.users.find(u => u.id === userId);
    if (memUser) {
      memUser.status = 'online';
      memUser.last_heartbeat = now;
      memUser.last_active = now;
    }

    // Async non-blocking DB persist
    if (isConnected) {
      User.updateOne(
        { id: userId },
        { $set: { status: 'online', last_heartbeat: now, last_active: now } }
      ).catch(() => {});
    }
    return true;
  },

  // Logout / Disconnect presence
  logoutUser: async (userId) => {
    if (!userId) return null;
    try {
      if (await connectToMongo()) {
        await User.findOneAndUpdate(
          { id: userId },
          { 
            $set: { 
              status: 'offline', 
              last_heartbeat: new Date(0) 
            } 
          }
        );
        return true;
      }
    } catch (e) {}

    const memUser = memoryDb.users.find(u => u.id === userId);
    if (memUser) {
      memUser.status = 'offline';
      memUser.last_heartbeat = new Date(0);
    }
    return true;
  },

  // Auth: Verify 4-digit PIN
  verifyPin: async (userId, pin) => {
    try {
      if (await connectToMongo()) {
        const user = await User.findOne({ id: userId }).lean();
        if (user && (user.pin === pin || (!user.pin && pin === '1234'))) {
          // Immediately mark online
          await User.findOneAndUpdate(
            { id: userId },
            { $set: { status: 'online', last_heartbeat: new Date(), last_active: new Date() } }
          );
          const { pin: _, ...safeUser } = user;
          return { success: true, user: { ...safeUser, status: 'online' } };
        }
      }
    } catch (e) {}

    const memUser = memoryDb.users.find(u => u.id === userId);
    if (memUser && (memUser.pin === pin || pin === '1234')) {
      memUser.status = 'online';
      memUser.last_heartbeat = new Date();
      const { pin: _, ...safeUser } = memUser;
      return { success: true, user: { ...safeUser, status: 'online' } };
    }
    return { success: false, error: 'Invalid PIN. Please try again.' };
  },

  // Users with dynamic online calculation
  getUsers: async () => {
    try {
      if (await connectToMongo()) {
        const users = await User.find({}, { pin: 0 }).lean();
        if (users.length > 0) {
          return users.map(u => ({
            ...u,
            status: computeLiveStatus(u)
          }));
        }
      }
    } catch (e) {}

    return memoryDb.users.map(({ pin, ...safe }) => ({
      ...safe,
      status: computeLiveStatus(safe)
    }));
  },

  getUserById: async (id) => {
    try {
      if (await connectToMongo()) {
        const user = await User.findOne({ id }, { pin: 0 }).lean();
        if (user) {
          return {
            ...user,
            status: computeLiveStatus(user)
          };
        }
      }
    } catch (e) {}
    const user = memoryDb.users.find(u => u.id === id);
    if (!user) return null;
    const { pin, ...safe } = user;
    return {
      ...safe,
      status: computeLiveStatus(safe)
    };
  },

  syncOnlinePresence: async (activeUserIds) => {
    const now = new Date();
    try {
      if (await connectToMongo()) {
        if (activeUserIds && activeUserIds.length > 0) {
          await User.updateMany(
            { id: { $in: activeUserIds } },
            { $set: { status: 'online', last_heartbeat: now, last_active: now } }
          );
        }
        const users = await User.find({}, { pin: 0 }).lean();
        return users.map(u => ({
          ...u,
          status: computeLiveStatus(u)
        }));
      }
    } catch (e) {}

    if (activeUserIds && activeUserIds.length > 0) {
      activeUserIds.forEach(id => {
        const u = memoryDb.users.find(m => m.id === id);
        if (u) {
          u.status = 'online';
          u.last_heartbeat = now;
        }
      });
    }

    return memoryDb.users.map(({ pin, ...safe }) => ({
      ...safe,
      status: computeLiveStatus(safe)
    }));
  },

  // Tasks
  getTasks: async (filter = {}) => {
    try {
      if (await connectToMongo()) {
        const query = {};
        if (filter.assigned_to) query.assigned_to = filter.assigned_to;
        if (filter.status) query.status = filter.status;

        const tasks = await Task.find(query).sort({ updatedAt: -1 }).lean();
        const users = await User.find({}, { pin: 0 }).lean();

        return tasks.map(t => {
          const assignee = users.find(u => u.id === t.assigned_to) || {};
          const creator = users.find(u => u.id === t.created_by) || {};
          return {
            ...t,
            assignee_name: assignee.name || 'Unassigned',
            assignee_avatar: assignee.avatar || '??',
            assignee_color: assignee.color || '#2563eb',
            creator_name: creator.name || 'Admin'
          };
        });
      }
    } catch (e) {}

    let tasks = memoryDb.tasks.map(t => {
      const assignee = memoryDb.users.find(u => u.id === t.assigned_to) || {};
      const creator = memoryDb.users.find(u => u.id === t.created_by) || {};
      return {
        ...t,
        assignee_name: assignee.name || 'Unassigned',
        assignee_avatar: assignee.avatar || '??',
        assignee_color: assignee.color || '#2563eb',
        creator_name: creator.name || 'Admin'
      };
    });

    if (filter.assigned_to) tasks = tasks.filter(t => t.assigned_to === filter.assigned_to);
    if (filter.status) tasks = tasks.filter(t => t.status === filter.status);
    return tasks;
  },

  getTaskById: async (id) => {
    try {
      if (await connectToMongo()) {
        const task = await Task.findOne({ id }).lean();
        if (task) {
          const assignee = await User.findOne({ id: task.assigned_to }, { pin: 0 }).lean() || {};
          const creator = await User.findOne({ id: task.created_by }, { pin: 0 }).lean() || {};
          return {
            ...task,
            assignee_name: assignee.name || 'Unassigned',
            assignee_avatar: assignee.avatar || '??',
            assignee_color: assignee.color || '#2563eb',
            creator_name: creator.name || 'Admin'
          };
        }
      }
    } catch (e) {}

    const task = memoryDb.tasks.find(t => t.id === id);
    if (!task) return null;
    const assignee = memoryDb.users.find(u => u.id === task.assigned_to) || {};
    const creator = memoryDb.users.find(u => u.id === task.created_by) || {};
    return {
      ...task,
      assignee_name: assignee.name || 'Unassigned',
      assignee_avatar: assignee.avatar || '??',
      assignee_color: assignee.color || '#2563eb',
      creator_name: creator.name || 'Admin'
    };
  },

  createTask: async (taskData) => {
    const id = taskData.id || ('tsk_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4));
    const newTask = {
      id,
      title: taskData.title,
      description: taskData.description || '',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      assigned_to: taskData.assigned_to,
      created_by: taskData.created_by || 'usr_shyamsundar',
      start_date: taskData.start_date || new Date().toISOString().split('T')[0],
      due_date: taskData.due_date || new Date().toISOString().split('T')[0],
      tags: Array.isArray(taskData.tags) ? taskData.tags : [],
      subtasks: Array.isArray(taskData.subtasks) ? taskData.subtasks : [],
      estimated_hours: Number(taskData.estimated_hours) || 2,
      logged_hours: Number(taskData.logged_hours) || 0,
      completed_at: taskData.status === 'completed' ? new Date() : null,
      is_book_reading: Boolean(taskData.is_book_reading),
      book_stats: {
        total_books: Number(taskData.book_stats?.total_books ?? 0),
        completed: Number(taskData.book_stats?.completed ?? 0),
        in_progress: Number(taskData.book_stats?.in_progress ?? 0),
        books_presented: Number(taskData.book_stats?.books_presented ?? 0),
        total_pages: Number(taskData.book_stats?.total_pages ?? 0),
        total_pages_read: Number(taskData.book_stats?.total_pages_read ?? 0)
      },
      books_list: Array.isArray(taskData.books_list) ? taskData.books_list : [],
      reading_logs: Array.isArray(taskData.reading_logs) ? taskData.reading_logs : []
    };

    try {
      if (await connectToMongo()) {
        await Task.create(newTask);
        return await dbHelpers.getTaskById(id);
      }
    } catch (e) {}

    memoryDb.tasks.unshift(newTask);
    return dbHelpers.getTaskById(id);
  },

  logDailyReading: async (taskId, logData, user) => {
    const logEntry = {
      id: 'log_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      date: logData.date || new Date().toISOString().split('T')[0],
      pages_read: Number(logData.pages_read) || 0,
      takeaways: logData.takeaways || '',
      created_at: new Date()
    };

    // Always update in-memory cache
    const memTask = memoryDb.tasks.find(t => t.id === taskId);
    if (memTask) {
      if (!Array.isArray(memTask.reading_logs)) memTask.reading_logs = [];
      const idx = memTask.reading_logs.findIndex(l => l.date === logEntry.date);
      if (idx >= 0) memTask.reading_logs[idx] = logEntry;
      else memTask.reading_logs.unshift(logEntry);

      if (!memTask.book_stats) memTask.book_stats = {};
      memTask.book_stats.total_pages_read = memTask.reading_logs.reduce((a, b) => a + (Number(b.pages_read) || 0), 0);
    }

    try {
      if (await connectToMongo()) {
        const existingTask = await Task.findOne({ id: taskId }).lean();
        if (existingTask) {
          const currentLogs = Array.isArray(existingTask.reading_logs) ? [...existingTask.reading_logs] : [];
          const existingIndex = currentLogs.findIndex(l => l.date === logEntry.date);
          if (existingIndex >= 0) {
            currentLogs[existingIndex] = logEntry;
          } else {
            currentLogs.unshift(logEntry);
          }

          const totalRead = currentLogs.reduce((acc, l) => acc + (Number(l.pages_read) || 0), 0);

          await Task.findOneAndUpdate(
            { id: taskId },
            {
              $set: {
                reading_logs: currentLogs,
                "book_stats.total_pages_read": totalRead
              }
            },
            { new: true }
          );

          await dbHelpers.logActivity(
            user?.id || existingTask.assigned_to,
            user?.name || existingTask.assignee_name || 'Team Member',
            'book_reading_log',
            `Logged ${logEntry.pages_read} pages read for "${existingTask.title}" (${logEntry.date})${logEntry.takeaways ? ` • "${logEntry.takeaways}"` : ''}`,
            taskId
          );

          return await dbHelpers.getTaskById(taskId);
        }
      }
    } catch (e) {
      console.error('logDailyReading DB error:', e);
    }

    if (memTask) {
      await dbHelpers.logActivity(
        user?.id || memTask.assigned_to,
        user?.name || 'Team Member',
        'book_reading_log',
        `Logged ${logEntry.pages_read} pages read for "${memTask.title}"`,
        taskId
      );
      return dbHelpers.getTaskById(taskId);
    }
    return null;
  },

  updateTask: async (id, updates) => {
    try {
      if (Array.isArray(updates.books_list)) {
        const list = updates.books_list;
        const totalBooks = list.length;
        const completed = list.filter(b => b.status === 'completed').length;
        const inProgress = list.filter(b => b.status === 'in_progress' || b.status === 'reading' || !b.status || b.status !== 'completed').length;
        const presented = list.filter(b => b.presented || b.status === 'presented').length;
        const totalPages = list.reduce((a, b) => a + (Number(b.total_pages) || 0), 0);
        const pagesRead = list.reduce((a, b) => a + (Number(b.pages_read) || 0), 0);

        updates.book_stats = {
          total_books: totalBooks,
          completed,
          in_progress: inProgress,
          books_presented: presented,
          total_pages: totalPages,
          total_pages_read: pagesRead
        };

        const activeBook = list.find(b => b.status === 'in_progress' || b.status === 'reading') || list[0];
        if (activeBook && activeBook.title) {
          updates.title = activeBook.title;
          updates.description = activeBook.author || '';
        }
      }

      if (await connectToMongo()) {
        if (updates.status === 'completed') {
          updates.completed_at = new Date();
        } else if (updates.status && updates.status !== 'completed') {
          updates.completed_at = null;
        }
        await Task.findOneAndUpdate({ id }, { $set: updates }, { returnDocument: 'after', new: true });
        return await dbHelpers.getTaskById(id);
      }
    } catch (e) {
      console.error('updateTask DB error:', e);
    }

    const index = memoryDb.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;
    memoryDb.tasks[index] = { 
      ...memoryDb.tasks[index], 
      ...updates,
      book_stats: updates.book_stats 
        ? { ...(memoryDb.tasks[index].book_stats || {}), ...updates.book_stats } 
        : memoryDb.tasks[index].book_stats,
      books_list: updates.books_list || memoryDb.tasks[index].books_list || [],
      reading_logs: updates.reading_logs || memoryDb.tasks[index].reading_logs || []
    };
    return dbHelpers.getTaskById(id);
  },

  deleteTask: async (id) => {
    try {
      if (await connectToMongo()) {
        await Task.findOneAndDelete({ id });
        return true;
      }
    } catch (e) {}

    const index = memoryDb.tasks.findIndex(t => t.id === id);
    if (index === -1) return false;
    memoryDb.tasks.splice(index, 1);
    return true;
  },

  // EOD Reports
  createEodReport: async (report) => {
    const id = 'eod_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const today = report.report_date || new Date().toISOString().split('T')[0];

    const newReport = {
      id,
      user_id: report.user_id,
      user_name: report.user_name,
      user_role: report.user_role || 'member',
      department: report.department || 'Engineering',
      report_date: today,
      completed_tasks: report.completed_tasks || [],
      pending_tasks: report.pending_tasks || [],
      blockers: report.blockers || 'None',
      tomorrow_plan: report.tomorrow_plan || '',
      day_rating: Number(report.day_rating) || 5,
      hours_worked: Number(report.hours_worked) || 8.0,
      submitted_at: new Date()
    };

    try {
      if (await connectToMongo()) {
        await EODReport.deleteMany({ user_id: report.user_id, report_date: today });
        await EODReport.create(newReport);
        await User.findOneAndUpdate(
          { id: report.user_id }, 
          { status: 'logged_out', last_heartbeat: new Date(0), last_active: new Date() }
        );
        return newReport;
      }
    } catch (e) {}

    memoryDb.eod_reports = memoryDb.eod_reports.filter(r => !(r.user_id === report.user_id && r.report_date === today));
    memoryDb.eod_reports.unshift(newReport);
    return newReport;
  },

  getEodReports: async (filter = {}) => {
    try {
      if (await connectToMongo()) {
        const query = {};
        if (filter.user_id) query.user_id = filter.user_id;
        if (filter.report_date) query.report_date = filter.report_date;
        return await EODReport.find(query).sort({ submitted_at: -1 }).lean();
      }
    } catch (e) {}

    return memoryDb.eod_reports;
  },

  // Activity Logs
  logActivity: async (userId, userName, actionType, description, taskId = null) => {
    const id = 'act_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const newLog = {
      id,
      user_id: userId,
      user_name: userName,
      action_type: actionType,
      description: description,
      task_id: taskId,
      created_at: new Date()
    };

    try {
      if (await connectToMongo()) {
        await ActivityLog.create(newLog);
        return newLog;
      }
    } catch (e) {}

    memoryDb.activity_logs.unshift(newLog);
    return newLog;
  },

  getActivityLogs: async (limit = 30) => {
    try {
      if (await connectToMongo()) {
        return await ActivityLog.find().sort({ created_at: -1 }).limit(limit).lean();
      }
    } catch (e) {}

    return memoryDb.activity_logs.slice(0, limit);
  },

  // Company Overview (Parallel Ultra-Fast Aggregation)
  getCompanyOverview: async () => {
    let users = [];
    let tasks = [];
    let eodReports = [];

    try {
      if (await connectToMongo()) {
        const [rawUsers, rawTasks, rawEods] = await Promise.all([
          User.find({}, { pin: 0 }).lean(),
          Task.find().sort({ updatedAt: -1 }).lean(),
          EODReport.find().sort({ submitted_at: -1 }).lean()
        ]);

        users = rawUsers.map(u => ({ ...u, status: computeLiveStatus(u) }));
        tasks = rawTasks.map(t => {
          const assignee = users.find(u => u.id === t.assigned_to) || {};
          const creator = users.find(u => u.id === t.created_by) || {};
          return {
            ...t,
            assignee_name: assignee.name || 'Unassigned',
            assignee_avatar: assignee.avatar || '??',
            assignee_color: assignee.color || '#2563eb',
            creator_name: creator.name || 'Admin'
          };
        });
        eodReports = rawEods;
      }
    } catch (e) {}

    if (users.length === 0) {
      users = memoryDb.users.map(({ pin, ...safe }) => ({ ...safe, status: computeLiveStatus(safe) }));
      tasks = memoryDb.tasks.map(t => {
        const assignee = memoryDb.users.find(u => u.id === t.assigned_to) || {};
        const creator = memoryDb.users.find(u => u.id === t.created_by) || {};
        return {
          ...t,
          assignee_name: assignee.name || 'Unassigned',
          assignee_avatar: assignee.avatar || '??',
          assignee_color: assignee.color || '#2563eb',
          creator_name: creator.name || 'Admin'
        };
      });
      eodReports = memoryDb.eod_reports;
    }

    const totalUsers = users.length;
    const onlineUsers = users.filter(u => u.status === 'online').length;
    const checkedOutUsers = users.filter(u => u.status === 'logged_out').length;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const todoTasks = tasks.filter(t => t.status === 'todo').length;
    const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
    const urgentPending = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length;

    const todayDate = new Date().toISOString().split('T')[0];
    const todayReports = eodReports.filter(r => r.report_date === todayDate);

    // Book Reading Aggregated Stats
    const bookTasks = tasks.filter(t => t.is_book_reading);
    let bookTotalCount = 0;
    let bookCompletedCount = 0;
    let bookInProgressCount = 0;
    let bookPresentedCount = 0;
    let bookTotalPages = 0;
    let bookTotalPagesRead = 0;

    bookTasks.forEach(bt => {
      const stats = bt.book_stats || {};
      bookTotalCount += Number(stats.total_books) || 0;
      bookCompletedCount += Number(stats.completed) || 0;
      bookInProgressCount += Number(stats.in_progress) || 0;
      bookPresentedCount += Number(stats.books_presented) || 0;
      bookTotalPages += Number(stats.total_pages) || 0;
      bookTotalPagesRead += Number(stats.total_pages_read) || 0;
    });

    const memberBreakdown = users.map(u => {
      const userTasks = tasks.filter(t => t.assigned_to === u.id);
      const userCompleted = userTasks.filter(t => t.status === 'completed').length;
      const userPending = userTasks.filter(t => t.status !== 'completed').length;
      const userEod = todayReports.find(r => r.user_id === u.id);
      const userBookTask = bookTasks.find(t => t.assigned_to === u.id);

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
        eod_report: userEod || null,
        book_task: userBookTask || null
      };
    });

    return {
      users: {
        total: totalUsers,
        online: onlineUsers,
        checked_out: checkedOutUsers
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        in_progress: inProgressTasks,
        todo: todoTasks,
        blocked: blockedTasks,
        urgent_pending: urgentPending,
        completion_rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      books: {
        total_books: bookTotalCount,
        completed: bookCompletedCount,
        in_progress: bookInProgressCount,
        books_presented: bookPresentedCount,
        total_pages: bookTotalPages,
        total_pages_read: bookTotalPagesRead,
        completion_rate: bookTotalPages > 0 ? Math.min(100, Math.round((bookTotalPagesRead / bookTotalPages) * 100)) : 0
      },
      memberBreakdown,
      todayReports
    };
  }
};

module.exports = { dbHelpers };
