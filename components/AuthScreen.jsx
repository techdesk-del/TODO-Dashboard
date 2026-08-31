import React, { useState } from 'react';
import { 
  Lock, 
  KeyRound, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { sounds } from '../lib/audio';

export default function AuthScreen({ users, onLoginSuccess }) {
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const selectedUser = users.find(u => u.id === selectedUserId) || users[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin || pin.trim().length === 0) {
      setError('Please enter your 4-digit PIN');
      sounds.playClick();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, pin: pin.trim() })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        sounds.playComplete();
        onLoginSuccess(data.user);
      } else {
        sounds.playClick();
        setError(data.error || 'Invalid PIN. Default PIN is 1234');
      }
    } catch (err) {
      setError('Failed to connect to authentication server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 space-y-6 animate-slide-up">
        
        {/* Brand Logo Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-1">
            <img 
              src="/urbangaon-logo.jpg" 
              alt="UrbanGaon" 
              className="h-12 w-auto object-contain"
            />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Member Secure Login
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your profile & enter your 4-digit PIN to unlock your private workspace.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Member Selection Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Select Your Name
            </label>
            <div className="space-y-2">
              <select
                value={selectedUserId}
                onChange={(e) => {
                  sounds.playClick();
                  setSelectedUserId(e.target.value);
                  setError('');
                }}
                className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>

              {/* Selected User Preview Badge */}
              {selectedUser && (
                <div className="flex items-center gap-2.5 p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0"
                    style={{ backgroundColor: selectedUser.color || '#2563eb' }}
                  >
                    {selectedUser.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-blue-950 truncate">{selectedUser.name}</p>
                    <p className="text-[10px] text-blue-600 font-medium truncate">{selectedUser.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4-Digit PIN Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                4-Digit Security PIN
              </label>
              <span className="text-[10px] font-semibold text-slate-400">
                Default: <strong>1234</strong>
              </span>
            </div>
            
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                maxLength={8}
                placeholder="Enter PIN (e.g. 1234)"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError('');
                }}
                autoFocus
                className="w-full pl-3.5 pr-10 py-2.5 text-sm tracking-widest font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-center"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-all p-1"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Unlock & Open Dashboard</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>

        </form>

        {/* Security Footer Notice */}
        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Protected by Zero-Trust Role & Session Lockdown
          </p>
        </div>

      </div>
    </div>
  );
}
