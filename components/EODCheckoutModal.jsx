import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  Send, 
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../lib/audio';

export default function EODCheckoutModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  userTasks, 
  onSubmitEOD 
}) {
  if (!isOpen) return null;

  const completedTasks = userTasks.filter(t => t.status === 'completed');
  const pendingTasks = userTasks.filter(t => t.status !== 'completed');

  const [pendingNotes, setPendingNotes] = useState({});
  const [blockers, setBlockers] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [dayRating, setDayRating] = useState(5);
  const [hoursWorked, setHoursWorked] = useState(8.0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initialNotes = {};
    pendingTasks.forEach(task => {
      initialNotes[task.id] = {
        title: task.title,
        status: task.status,
        priority: task.priority,
        reason: 'In progress, will complete tomorrow.',
        plan_for_tomorrow: 'Prioritize and complete tomorrow morning.'
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
    setIsSubmitting(true);

    const pendingPayload = Object.keys(pendingNotes).map(taskId => ({
      id: taskId,
      title: pendingNotes[taskId].title,
      status: pendingNotes[taskId].status,
      priority: pendingNotes[taskId].priority,
      reason: pendingNotes[taskId].reason,
      plan_for_tomorrow: pendingNotes[taskId].plan_for_tomorrow
    }));

    const completedPayload = completedTasks.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority
    }));

    const reportData = {
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role,
      department: currentUser.department,
      report_date: new Date().toISOString().split('T')[0],
      completed_tasks: completedPayload,
      pending_tasks: pendingPayload,
      blockers: blockers || 'None',
      tomorrow_plan: tomorrowPlan || 'Follow up on pending sprint items.',
      day_rating: dayRating,
      hours_worked: Number(hoursWorked) || 8.0
    };

    sounds.playFanfare();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    onSubmitEOD(reportData);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl my-6 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="p-5 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
              📋
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                End-of-Day (EOD) Daily Checkout
              </h2>
              <p className="text-xs text-slate-600">
                Member: <strong className="text-indigo-900">{currentUser?.name}</strong> • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-xs text-emerald-800 font-bold block mb-1">
                Completed Tasks Today
              </span>
              <p className="text-2xl font-bold text-emerald-700">{completedTasks.length} Done</p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-xs text-amber-800 font-bold block mb-1">
                Pending Tasks Remaining
              </span>
              <p className="text-2xl font-bold text-amber-700">{pendingTasks.length} Pending</p>
            </div>
          </div>

          {/* Completed Tasks */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Tasks Completed Today ({completedTasks.length})
            </h3>

            {completedTasks.length === 0 ? (
              <p className="text-xs text-slate-500 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                No tasks marked completed today.
              </p>
            ) : (
              <div className="space-y-1.5">
                {completedTasks.map(task => (
                  <div key={task.id} className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs font-semibold text-emerald-900 flex items-center justify-between">
                    <span>✓ {task.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-200 text-emerald-800 font-bold">DONE</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Tasks Reasons */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              Pending Tasks & Status Notes ({pendingTasks.length})
            </h3>

            {pendingTasks.length === 0 ? (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold">
                🎉 All assigned tasks completed for today!
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTasks.map(task => (
                  <div key={task.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{task.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold uppercase">
                        {task.status}
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                        Reason for Pending & Tomorrow's Plan
                      </label>
                      <input
                        type="text"
                        required
                        value={pendingNotes[task.id]?.reason || ''}
                        onChange={(e) => handleNoteChange(task.id, 'reason', e.target.value)}
                        placeholder="e.g. 70% complete, waiting on code review, will finish by 11 AM..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg clean-input"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Blocker input */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Blockers or Dependencies (Optional)
            </label>
            <input
              type="text"
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              placeholder="Any roadblocks or assistance needed from management..."
              className="w-full px-3 py-2 text-xs rounded-lg clean-input"
            />
          </div>

          {/* Submit CTA */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Submit EOD Report & Clock Out</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
