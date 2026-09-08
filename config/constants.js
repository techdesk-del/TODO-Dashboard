/**
 * Application Constants & Enterprise Configurations
 */

// Official UrbanGaon Team Members
export const DEFAULT_TEAM_MEMBERS = [
  { id: 'usr_shyamsundar', name: 'Shyamsundar Varma', color: '#f59e0b', avatar: 'SV', email: 'shyamsundar@urbangaon.com', role: 'member' },
  { id: 'usr_aakash', name: 'Aakash Das', color: '#6366f1', avatar: 'AD', email: 'aakash.das@urbangaon.com', role: 'admin' },
  { id: 'usr_yudhister', name: 'Yudhister Tiwari', color: '#10b981', avatar: 'YT', email: 'yudhister.t@urbangaon.com', role: 'member' },
  { id: 'usr_rekha', name: 'Dr Rekha Pareek', color: '#a855f7', avatar: 'RP', email: 'rekha.pareek@urbangaon.com', role: 'member' },
  { id: 'usr_sanjay', name: 'Sanjay', color: '#06b6d4', avatar: 'SJ', email: 'sanjay@urbangaon.com', role: 'member' },
  { id: 'usr_ayaz', name: 'Ayaz', color: '#ec4899', avatar: 'AY', email: 'ayaz@urbangaon.com', role: 'member' },
  { id: 'usr_utkarsh', name: 'Utkarsh', color: '#3b82f6', avatar: 'UT', email: 'utkarsh@urbangaon.com', role: 'member' },
  { id: 'usr_pratap', name: 'Pratap', color: '#14b8a6', avatar: 'PR', email: 'pratap@urbangaon.com', role: 'member' },
  { id: 'usr_varun', name: 'Varun Mudgal', color: '#f97316', avatar: 'VM', email: 'varun.mudgal@urbangaon.com', role: 'member' }
];

// Local Storage & Cache Keys
export const STORAGE_KEYS = {
  AUTH_USER: 'urbangaon_auth_user_v1',
  CACHED_TASKS: 'urbangaon_cached_tasks_v1',
  CACHED_OVERVIEW: 'urbangaon_cached_overview_v1',
  CACHED_USERS: 'urbangaon_cached_users_v1'
};

// Application Time & Polling Constants
export const APP_CONFIG = {
  ONLINE_HEARTBEAT_THRESHOLD_MS: 12000,
  HEARTBEAT_INTERVAL_MS: 5000,
  EOD_STATUS_CHECK_INTERVAL_MS: 15000,
  MAX_PAYLOAD_BYTES: 1024 * 1024 // 1 MB
};

// Support CommonJS export as well
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_TEAM_MEMBERS,
    STORAGE_KEYS,
    APP_CONFIG
  };
}
