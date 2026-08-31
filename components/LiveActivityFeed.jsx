import React from 'react';
import { 
  Activity, 
  CheckCircle2, 
  PlusCircle, 
  RefreshCw, 
  Trash2, 
  LogOut, 
  UserCheck
} from 'lucide-react';

export default function LiveActivityFeed({ activityLogs }) {
  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'task_create':
        return <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />;
      case 'task_complete':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'task_update':
        return <RefreshCw className="w-3.5 h-3.5 text-amber-600" />;
      case 'task_delete':
        return <Trash2 className="w-3.5 h-3.5 text-rose-600" />;
      case 'eod_submit':
        return <LogOut className="w-3.5 h-3.5 text-purple-600" />;
      case 'user_login':
        return <UserCheck className="w-3.5 h-3.5 text-cyan-600" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-bold text-slate-800">
            Live Activity Feed
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">Real-Time</span>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {activityLogs.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No recent activity</p>
        ) : (
          activityLogs.map((log) => (
            <div 
              key={log.id} 
              className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2 text-xs"
            >
              <div className="mt-0.5 p-1 rounded-md bg-white border border-slate-200 shrink-0">
                {getActionIcon(log.action_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-700 text-[11px] leading-snug">
                  <span className="font-bold text-slate-900">{log.user_name}</span> {log.description.replace(log.user_name, '')}
                </p>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
