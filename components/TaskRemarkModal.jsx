import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  Send, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Flame, 
  Sparkles,
  Tag,
  Trash2
} from 'lucide-react';
import { sounds } from '../lib/audio';

export default function TaskRemarkModal({
  isOpen,
  onClose,
  task,
  candidateTasks = [],
  allTasks = [],
  currentUser,
  onSaveRemark,
  onDeleteRemark
}) {
  if (!isOpen) return null;

  const [selectedTaskId, setSelectedTaskId] = useState(task?.id || '');
  const [remarkText, setRemarkText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRemarkId, setDeletingRemarkId] = useState(null);

  useEffect(() => {
    if (task?.id) {
      setSelectedTaskId(task.id);
    }
  }, [task?.id]);

  // Dynamically resolve the live task: check allTasks first, then candidateTasks, then fallback to task prop
  const activeTask = 
    (allTasks || []).find(t => t.id === (selectedTaskId || task?.id)) ||
    (candidateTasks || []).find(t => t.id === (selectedTaskId || task?.id)) ||
    task;

  // Local reactive remarks list for 0ms latency updates
  const [remarksList, setRemarksList] = useState(Array.isArray(activeTask?.remarks) ? activeTask.remarks : []);

  useEffect(() => {
    if (activeTask && Array.isArray(activeTask.remarks)) {
      setRemarksList(activeTask.remarks);
    } else {
      setRemarksList([]);
    }
  }, [activeTask?.id, activeTask?.remarks]);

  const quickPresets = [
    { label: '⚡ In Progress', text: '⚡ Working on this task currently. Progressing as planned.' },
    { label: '⚠️ Blocked', text: '⚠️ Blocked: Waiting on external dependency / client confirmation.' },
    { label: '🔍 Ready for Review', text: '🔍 Implementation ready for code review / testing.' },
    { label: '📞 Client Update', text: '📞 Client discussion completed. Requirements aligned.' },
    { label: '🚀 Deployed', text: '🚀 Changes deployed to staging / production environment.' }
  ];

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanText = remarkText.trim();
    if (!cleanText || isSubmitting || !activeTask) return;

    // 1. Instant 0ms Optimistic local insert into remarks list
    const tempId = 'rem_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const newRemark = {
      id: tempId,
      text: cleanText,
      author_id: currentUser?.id || 'usr_unknown',
      author_name: currentUser?.name || 'Team Member',
      author_avatar: currentUser?.avatar || currentUser?.name?.substring(0, 2).toUpperCase() || '??',
      author_color: currentUser?.color || '#6366f1',
      created_at: new Date().toISOString()
    };

    setRemarksList(prev => [newRemark, ...prev]);
    setRemarkText('');
    sounds.playClick();

    try {
      setIsSubmitting(true);
      await onSaveRemark(activeTask.id, cleanText);
    } catch (err) {
      console.error('Error saving remark:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRemark = async (remId) => {
    if (!remId || !onDeleteRemark || deletingRemarkId || !activeTask) return;

    // 1. Instant 0ms Optimistic local removal from remarks list
    setRemarksList(prev => prev.filter(r => r.id !== remId && r._id !== remId && String(r._id) !== String(remId)));
    sounds.playTrash();

    try {
      setDeletingRemarkId(remId);
      await onDeleteRemark(activeTask.id, remId);
    } catch (err) {
      console.error('Error deleting remark:', err);
    } finally {
      setDeletingRemarkId(null);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  const formatTimestamp = (dateVal) => {
    if (!dateVal) return 'Just now';
    try {
      const d = new Date(dateVal);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;

      return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Recently';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] my-auto overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  Task Remarks & Notes
                </h3>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {remarksList.length} {remarksList.length === 1 ? 'Remark' : 'Remarks'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Real-time team information, status notes & work logs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Summary Strip */}
        <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="min-w-0 flex-1">
            {candidateTasks && candidateTasks.length > 1 ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 shrink-0">Select Task:</span>
                <select
                  value={activeTask.id}
                  onChange={(e) => {
                    sounds.playClick();
                    setSelectedTaskId(e.target.value);
                  }}
                  className="px-2.5 py-1 text-xs rounded-xl bg-white border border-indigo-200 font-bold text-indigo-950 cursor-pointer shadow-2xs focus:outline-none focus:border-indigo-500 max-w-xs truncate"
                >
                  {candidateTasks.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="font-extrabold text-slate-900 truncate">
                {activeTask.title}
              </div>
            )}
            {activeTask.description && (
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {activeTask.description}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Priority */}
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
              activeTask.priority === 'urgent' ? 'badge-urgent' :
              activeTask.priority === 'high' ? 'badge-high' :
              activeTask.priority === 'medium' ? 'badge-medium' : 'badge-low'
            }`}>
              {activeTask.priority}
            </span>

            {/* Status */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md capitalize ${
              activeTask.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
              activeTask.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              activeTask.status === 'blocked' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {activeTask.status.replace('_', ' ')}
            </span>

            {/* Assignee */}
            <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
              <div 
                className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-white text-[9px]"
                style={{ backgroundColor: activeTask.assignee_color || '#2563eb' }}
              >
                {activeTask.assignee_avatar || '??'}
              </div>
              <span className="font-bold text-slate-700 text-[11px] max-w-[90px] truncate">
                {activeTask.assignee_name}
              </span>
            </div>
          </div>
        </div>

        {/* Remarks Timeline / List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-[180px] max-h-[380px] bg-slate-50/30">
          {remarksList.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-xl shadow-2xs">
                💬
              </div>
              <div className="text-xs font-bold text-slate-700">No Remarks Yet</div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Add the first remark or work note below to keep team members and executives updated on this task.
              </p>
            </div>
          ) : (
            remarksList.map((rem, idx) => {
              const isMe = rem.author_id === currentUser?.id;

              return (
                <div 
                  key={rem.id || idx}
                  className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5 hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white shadow-2xs shrink-0"
                        style={{ backgroundColor: rem.author_color || '#6366f1' }}
                      >
                        {rem.author_avatar || rem.author_name?.substring(0, 2).toUpperCase() || '??'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          {rem.author_name}
                        </span>
                        {isMe && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                            You
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(rem.created_at)}
                      </span>

                      {onDeleteRemark && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRemark(rem.id || rem._id);
                          }}
                          disabled={deletingRemarkId === (rem.id || rem._id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                          title="Delete this remark"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Remark Text */}
                  <div className="text-xs text-slate-700 leading-relaxed pl-8 break-words whitespace-pre-wrap font-medium">
                    {rem.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500" /> Quick:
          </span>
          {quickPresets.map((preset, pIdx) => (
            <button
              key={pIdx}
              type="button"
              onClick={() => {
                sounds.playClick();
                setRemarkText(preset.text);
              }}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 text-slate-600 font-semibold text-[10.5px] shrink-0 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 bg-white border-t border-slate-200 space-y-2">
          <div className="relative">
            <textarea
              rows={2}
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a task remark, status update, blocker note, or info... (Ctrl+Enter to post)"
              className="w-full px-3.5 py-2.5 text-xs rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none resize-none transition-all pr-12 text-slate-800 placeholder-slate-400"
            />
            <button
              type="submit"
              disabled={!remarkText.trim() || isSubmitting}
              className={`absolute right-2.5 bottom-3.5 p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                remarkText.trim() && !isSubmitting
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              title="Post Remark (Ctrl+Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10.5px] text-slate-400 px-1">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[9.5px] border border-slate-200">Ctrl + Enter</kbd> to submit</span>
            <span className="font-semibold text-indigo-600">Syncs live across all screens</span>
          </div>
        </form>

      </div>
    </div>
  );
}
