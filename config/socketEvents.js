/**
 * Standardized Socket.IO Event Names
 */
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  
  // Presence & User Sync
  USER_JOIN: 'user:join',
  USER_LOGOUT: 'user:logout',
  USER_PING: 'user:ping',
  PRESENCE_UPDATED: 'presence:updated',
  SYNC_INITIAL: 'sync:initial',

  // Task Operations
  TASK_CREATE: 'task:create',
  TASK_CREATED: 'task:created',
  TASK_UPDATE: 'task:update',
  TASK_UPDATED: 'task:updated',
  TASK_DELETE: 'task:delete',
  TASK_DELETED: 'task:deleted',
  TASK_MOVE: 'task:move',
  TASK_MOVED: 'task:moved',
  TASK_REMARK_SAVE: 'task:remark:save',
  TASK_REMARK_DELETE: 'task:remark:delete',

  // Daily Reading & EOD
  DAILY_READING_UPDATE: 'daily-reading:update',
  DAILY_READING_UPDATED: 'daily-reading:updated',
  EOD_SUBMIT: 'eod:submit',
  EOD_SUBMITTED: 'eod:submitted',

  // Live Reviews
  REVIEW_CREATE: 'review:create',
  REVIEW_CREATED: 'review:created',
  REVIEW_UPDATE: 'review:update',
  REVIEW_UPDATED: 'review:updated',
  REVIEW_DELETE: 'review:delete',
  REVIEW_DELETED: 'review:deleted'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SOCKET_EVENTS };
}
