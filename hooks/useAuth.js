import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '@/config/constants';

/**
 * Custom React Hook for Authentication & Heartbeat lifecycle
 */
export function useAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Restore session from localStorage on initial mount
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser && savedUser.id) {
          setCurrentUser(savedUser);
        }
      }
    } catch (e) {
      console.warn('Failed to restore auth session:', e);
    }
    setIsAuthReady(true);
  }, []);

  const login = useCallback((user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    } catch (e) {}
  }, []);

  const logout = useCallback(() => {
    if (currentUser?.id) {
      try {
        fetch('/api/users/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id })
        }).catch(() => {});
      } catch (e) {}
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    } catch (e) {}
  }, [currentUser?.id]);

  // Maintain heartbeat mesh
  useEffect(() => {
    if (!currentUser?.id) return;

    const sendHeartbeat = () => {
      if (document.hidden) return;
      fetch('/api/users/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      }).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 15000);

    const handleUnload = () => {
      if (currentUser?.id) {
        const payload = JSON.stringify({ userId: currentUser.id });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/users/logout', payload);
        } else {
          fetch('/api/users/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true
          }).catch(() => {});
        }
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [currentUser?.id]);

  return {
    currentUser,
    isAuthReady,
    login,
    logout,
    setCurrentUser
  };
}

export default useAuth;
