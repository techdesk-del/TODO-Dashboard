import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Calendar, 
  User, 
  Save
} from 'lucide-react';
import { sounds } from '../lib/audio';

export default function TaskModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialTask = null, 
  defaultStatus = 'todo',
  users = [],
  currentUser 
}) {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || '');
      setAssignedTo(initialTask.assigned_to || (users[0]?.id || ''));
      setStatus(initialTask.status || 'todo');
      setPriority(initialTask.priority || 'medium');
      setDueDate(initialTask.due_date || new Date().toISOString().split('T')[0]);
    } else {
      setTitle('');
      setDescription('');
      setAssignedTo(currentUser?.id || users[0]?.id || '');
      setStatus(defaultStatus || 'todo');
      setPriority('medium');
      setDueDate(new Date().toISOString().split('T')[0]);
    }
  }, [initialTask, defaultStatus, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    sounds.playClick();
    onSave({
      id: initialTask?.id,
      title: title.trim(),
      description: description.trim(),
      assigned_to: assignedTo,
      created_by: initialTask?.created_by || currentUser?.id || 'usr_ceo',
      status,
      priority,
      due_date: dueDate,
      tags: initialTask?.tags || ['Sprint'],
      subtasks: initialTask?.subtasks || [],
      estimated_hours: initialTask?.estimated_hours || 2
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg my-6 bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4 animate-slide-up">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {initialTask ? 'Edit Task' : 'Create New Task'}
            </h3>
            <p className="text-xs text-slate-500">
              Changes sync in real time across all team member screens
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Deploy Redis cluster, Finalize landing page UX..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl clean-input font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Provide specifications or instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl clean-input resize-none"
            />
          </div>

          {/* Assignee & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Assignee
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl clean-input cursor-pointer font-medium"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl clean-input cursor-pointer font-medium"
              >
                <option value="urgent">🚨 Urgent</option>
                <option value="high">⚡ High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Status & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl clean-input cursor-pointer font-medium"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Target Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl clean-input cursor-pointer"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{initialTask ? 'Update Task' : 'Save Task'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
