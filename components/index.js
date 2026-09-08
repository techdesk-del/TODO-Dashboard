/**
 * Centralized Component Barrel Exports
 */

// Layout
export { default as Header } from './layout/Header';
export { default as Sidebar } from './layout/Sidebar';
export { default as TopNavbar } from './layout/TopNavbar';

// Tasks Domain
export { default as KanbanBoard } from './tasks/KanbanBoard';
export { default as TaskCard } from './tasks/TaskCard';
export { default as TaskModal } from './tasks/TaskModal';
export { default as TaskRemarkModal } from './tasks/TaskRemarkModal';
export { default as CalendarView } from './tasks/CalendarView';

// Dashboard & Analytics
export { default as CEODashboard } from './dashboard/CEODashboard';
export { default as EODReportsHub } from './dashboard/EODReportsHub';
export { default as LiveActivityFeed } from './dashboard/LiveActivityFeed';

// Modals
export { default as DailyReadingModal } from './modals/DailyReadingModal';
export { default as EODCheckoutModal } from './modals/EODCheckoutModal';

// Auth
export { default as AuthScreen } from './auth/AuthScreen';
