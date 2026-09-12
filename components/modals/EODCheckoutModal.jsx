import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  Lock, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { sounds } from '@/lib/audio';
import { checkEodAllowed } from '@/lib/timeUtils';

export default function EODCheckoutModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  userTasks = [], 
  onSubmitEOD 
}) {
  if (!isOpen) return null;

  const completedTasks = userTasks.filter(t => t.status === 'completed');
  const pendingTasks = userTasks.filter(t => t.status !== 'completed');

  const [pendingNotes, setPendingNotes] = useState({});
  const [blockers, setBlockers] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [hoursWorked, setHoursWorked] = useState('8.0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Time & Policy Validation: 6:15 PM (18:15 IST) rule
  const [timeStatus, setTimeStatus] = useState(() => checkEodAllowed());
  const [ceoOverride, setCeoOverride] = useState(false);

  const isAakash = currentUser?.id === 'usr_aakash' || 
                   currentUser?.name?.toLowerCase().includes('aakash');
  const canSubmit = timeStatus.isAllowed || (isAakash && ceoOverride);

  useEffect(() => {
    setTimeStatus(checkEodAllowed());
    const interval = setInterval(() => {
      setTimeStatus(checkEodAllowed());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const initialNotes = {};
    pendingTasks.forEach(task => {
      initialNotes[task.id] = {
        title: task.title,
        status: task.status,
        priority: task.priority || 'medium',
        reason: 'In progress, will continue tomorrow.',
        plan_for_tomorrow: 'Complete during morning sprint.'
      };
    });
    setPendingNotes(initialNotes);
  }, [userTasks]);

  const handleNoteChange = (taskId, field, value) => {
    setPendingNotes(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) {
      sounds.playClick();
      return;
    }
    setIsSubmitting(true);

    const pendingPayload = Object.keys(pendingNotes).map(taskId => ({
      id: taskId,
      title: pendingNotes[taskId]?.title || 'Task',
      status: pendingNotes[taskId]?.status || 'pending',
      priority: pendingNotes[taskId]?.priority || 'medium',
      reason: pendingNotes[taskId]?.reason || 'Carried forward to next sprint.',
      plan_for_tomorrow: pendingNotes[taskId]?.plan_for_tomorrow || 'Continue execution.'
    }));

    const completedPayload = completedTasks.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority || 'medium'
    }));

    const reportData = {
      user_id: currentUser?.id,
      user_name: currentUser?.name,
      user_role: currentUser?.role,
      department: currentUser?.department || 'Engineering',
      report_date: new Date().toISOString().split('T')[0],
      completed_tasks: completedPayload,
      pending_tasks: pendingPayload,
      blockers: blockers.trim() || 'None',
      tomorrow_plan: tomorrowPlan.trim() || 'Continue sprint deliverables.',
      day_rating: 5,
      hours_worked: parseFloat(hoursWorked) || 8.0,
      is_ceo_override: isAakash && ceoOverride && !timeStatus.isAllowed
    };

    sounds.playClick();
    onSubmitEOD(reportData);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl my-auto bg-white border border-slate-300 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Office Minimalist Header */}
        <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              End-of-Day (EOD) Checkout
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              <span>{currentUser?.name}</span>
              <span className="mx-1.5">•</span>
              <span>{currentUser?.role || 'Team Member'}</span>
              <span className="mx-1.5">•</span>
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Policy Lockout Notice (Pre-6:15 PM) */}
          {!timeStatus.isAllowed && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-amber-950">
                      Checkout Policy: Submissions open at 6:15 PM (18:15 IST)
                    </span>
                    <span className="text-[11px] font-medium text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300/80">
                      {timeStatus.formattedRemaining} remaining
                    </span>
                  </div>
                  <p className="text-amber-800 text-[11px] mt-0.5">
                    Standard shift timing is 9:30 AM – 6:30 PM. EOD checkout opens 15 minutes before shift conclusion.
                  </p>
                </div>
              </div>

              {/* CEO Early Checkout Authorization */}
              {isAakash && (
                <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-700">
                    Administrative Access (Aakash Das):
                  </span>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-900">
                    <input
                      type="checkbox"
                      checked={ceoOverride}
                      onChange={(e) => {
                        sounds.playClick();
                        setCeoOverride(e.target.checked);
                      }}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-slate-800 focus:ring-slate-500 cursor-pointer"
                    />
                    <span>Authorize Early Checkout</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Quick Metrics Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 block">Completed Today</span>
              <span className="text-lg font-semibold text-slate-900 mt-0.5 block">{completedTasks.length}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 block">Remaining In Progress</span>
              <span className="text-lg font-semibold text-slate-900 mt-0.5 block">{pendingTasks.length}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <label htmlFor="eod-hours" className="text-[11px] font-medium text-slate-500 block">
                Shift Hours Logged
              </label>
              <div className="mt-0.5 flex items-center gap-1">
                <input
                  id="eod-hours"
                  type="number"
                  step="0.5"
                  min="1"
                  max="16"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  className="w-16 px-2 py-0.5 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-slate-500"
                />
                <span className="text-xs text-slate-500">hrs</span>
              </div>
            </div>
          </div>

          {/* 1. Completed Tasks Summary */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 uppercase tracking-wide">
              <span>Tasks Delivered Today ({completedTasks.length})</span>
            </div>

            {completedTasks.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                No tasks marked completed today.
              </div>
            ) : (
              <div className="space-y-1 max-h-[120px] overflow-y-auto">
                {completedTasks.map((task, idx) => (
                  <div 
                    key={task.id || idx} 
                    className="p-2 rounded-md bg-slate-50/80 border border-slate-200 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-slate-800 font-medium truncate">{task.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium shrink-0 uppercase">
                      {task.priority || 'medium'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Pending Tasks Handover */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 uppercase tracking-wide">
              <span>In-Progress Tasks & Next Day Handover ({pendingTasks.length})</span>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
                All assigned tasks for today have been completed.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-0.5">
                {pendingTasks.map((task, idx) => (
                  <div 
                    key={task.id || idx} 
                    className="p-3 rounded-lg bg-white border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {task.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 rounded bg-slate-100 shrink-0 uppercase">
                        {task.status?.replace('_', ' ') || 'In Progress'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10.5px] font-medium text-slate-600 block mb-0.5">
                          Status / Pending Reason
                        </label>
                        <input
                          type="text"
                          required
                          value={pendingNotes[task.id]?.reason || ''}
                          onChange={(e) => handleNoteChange(task.id, 'reason', e.target.value)}
                          placeholder="Current progress status..."
                          className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-600"
                        />
                      </div>

                      <div>
                        <label className="text-[10.5px] font-medium text-slate-600 block mb-0.5">
                          Tomorrow's Plan
                        </label>
                        <input
                          type="text"
                          required
                          value={pendingNotes[task.id]?.plan_for_tomorrow || ''}
                          onChange={(e) => handleNoteChange(task.id, 'plan_for_tomorrow', e.target.value)}
                          placeholder="Action planned for tomorrow..."
                          className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-600"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Tomorrow's Focus / Goals */}
          <div className="space-y-1">
            <label htmlFor="eod-tomorrow-plan" className="text-xs font-semibold text-slate-700 block">
              Tomorrow's Priority Deliverables
            </label>
            <input
              id="eod-tomorrow-plan"
              type="text"
              value={tomorrowPlan}
              onChange={(e) => setTomorrowPlan(e.target.value)}
              placeholder="Key tasks or deliverables planned for tomorrow..."
              className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-600"
            />
          </div>

          {/* 4. Blockers / Dependencies */}
          <div className="space-y-1">
            <label htmlFor="eod-blockers" className="text-xs font-semibold text-slate-700 block">
              Blockers or Dependencies (Optional)
            </label>
            <input
              id="eod-blockers"
              type="text"
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              placeholder="Any roadblocks requiring management assistance..."
              className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-600"
            />
          </div>

        </form>

        {/* Office Footer Action Bar */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 min-w-0 flex-1">
            {!canSubmit ? (
              <span className="text-amber-800 text-[11px] font-medium inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Locked until 6:15 PM ({timeStatus.formattedRemaining} left)</span>
              </span>
            ) : (
              <span className="text-slate-600 text-[11px] font-medium inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{isAakash && ceoOverride && !timeStatus.isAllowed ? 'Admin Override Enabled' : 'Ready for submission'}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                canSubmit
                  ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-xs active:scale-98'
                  : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit EOD Report'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
