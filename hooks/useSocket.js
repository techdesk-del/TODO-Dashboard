import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { sounds } from '@/lib/audio';
import { STORAGE_KEYS } from '@/config/constants';

/**
 * Custom React Hook for Real-Time Socket.IO Synchronization
 */
export function useSocket({
  currentUser,
  onDataSync,
  onToast
}) {
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    let socket;
    try {
      socket = io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000
      });
      socketRef.current = socket;

      socket.on('connect', () => setSocketConnected(true));
      socket.on('disconnect', () => setSocketConnected(false));
      socket.on('connect_error', () => setSocketConnected(false));

      socket.on('sync:initial', (data) => {
        onDataSync?.({
          users: data.users,
          tasks: data.tasks,
          overview: data.overview,
          eodReports: data.eodReports
        });
      });

      socket.on('task:created', ({ task, tasks, overview }) => {
        onDataSync?.({ tasks, overview });
        onToast?.('⚡ Task Created', `"${task.title}" assigned to ${task.assignee_name}`, 'success');
        sounds.playClick();
      });

      socket.on('task:updated', ({ task, tasks, overview }) => {
        onDataSync?.({ tasks, overview });
        if (task.status === 'completed') {
          onToast?.('🎉 Task Completed', `"${task.title}" marked as completed!`, 'success');
        }
      });

      socket.on('task:deleted', ({ tasks, overview }) => {
        onDataSync?.({ tasks, overview });
      });

      socket.on('eod:submitted', ({ eodReports, users, overview }) => {
        onDataSync?.({ eodReports, users, overview });
        onToast?.('📋 EOD Report Submitted', 'A team member completed daily checkout.', 'info');
      });

      socket.on('presence:updated', ({ users, overview }) => {
        onDataSync?.({ users, overview });
      });
    } catch (err) {
      console.error('Socket init error:', err);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  // Announce user presence when logged in
  useEffect(() => {
    if (socketConnected && socketRef.current && currentUser?.id) {
      socketRef.current.emit('user:join', currentUser);
    }
  }, [socketConnected, currentUser?.id]);

  return {
    socket: socketRef.current,
    socketConnected
  };
}

export default useSocket;
