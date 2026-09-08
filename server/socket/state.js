/**
 * Encapsulated Socket Connection State Manager
 */
class SocketStateManager {
  constructor() {
    this.socketUserMap = new Map(); // socket.id -> userId
    this.presenceDebounceTimer = null;
  }

  set(socketId, userId) {
    if (socketId && userId) {
      this.socketUserMap.set(socketId, userId);
    }
  }

  delete(socketId) {
    this.socketUserMap.delete(socketId);
  }

  get(socketId) {
    return this.socketUserMap.get(socketId);
  }

  getActiveUserIds() {
    return Array.from(new Set(Array.from(this.socketUserMap.values()).filter(Boolean)));
  }

  debouncePresence(callback, delay = 300) {
    if (this.presenceDebounceTimer) return;
    this.presenceDebounceTimer = setTimeout(async () => {
      this.presenceDebounceTimer = null;
      try {
        await callback();
      } catch (e) {
        console.error('Debounced presence callback error:', e);
      }
    }, delay);
  }
}

const socketState = new SocketStateManager();

module.exports = { socketState, SocketStateManager };
