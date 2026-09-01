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
      serverSelectionTimeoutMS: 5000
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

    // Ensure all 9 members have their Book Reading task automatically
    for (const bookTask of defaultBookReadingTasks) {
      await Task.findOneAndUpdate(
        { id: bookTask.id },
        { 
          $setOnInsert: {
            ...bookTask,
            createdAt: new Date(),
            updatedAt: new Date()
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

  // Live Heartbeat for Real-Time Presence across multiple PCs & Vercel serverless
  heartbeat: async (userId) => {
    if (!userId) return null;
    const now = new Date();
    try {
      if (await connectToMongo()) {
        await User.findOneAndUpdate(
          { id: userId },
          { 
            $set: { 
              status: 'online', 
              last_heartbeat: now,
              last_active: now 
            } 
          }
        );
        return true;
      }
    } catch (e) {}

    const memUser = memoryDb.users.find(u => u.id === userId);
    if (memUser) {
      memUser.status = 'online';
      memUser.last_heartbeat = now;
      memUser.last_active = now;
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
      }
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

  updateTask: async (id, updates) => {
    try {
      if (await connectToMongo()) {
        if (updates.status === 'completed') {
          updates.completed_at = new Date();
        } else if (updates.status && updates.status !== 'completed') {
          updates.completed_at = null;
        }
        await Task.findOneAndUpdate({ id }, { $set: updates }, { returnDocument: 'after' });
        return await dbHelpers.getTaskById(id);
      }
    } catch (e) {}

    const index = memoryDb.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;
    memoryDb.tasks[index] = { 
      ...memoryDb.tasks[index], 
      ...updates,
      book_stats: updates.book_stats 
        ? { ...(memoryDb.tasks[index].book_stats || {}), ...updates.book_stats } 
        : memoryDb.tasks[index].book_stats 
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

  // Company Overview
  getCompanyOverview: async () => {
    const users = await dbHelpers.getUsers();
    const tasks = await dbHelpers.getTasks();
    const eodReports = await dbHelpers.getEodReports();

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

    const memberBreakdown = users.map(u => {
      const userTasks = tasks.filter(t => t.assigned_to === u.id);
      const userCompleted = userTasks.filter(t => t.status === 'completed').length;
      const userPending = userTasks.filter(t => t.status !== 'completed').length;
      const userEod = todayReports.find(r => r.user_id === u.id);

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
      memberBreakdown,
      todayReports
    };
  }
};

module.exports = { dbHelpers };
