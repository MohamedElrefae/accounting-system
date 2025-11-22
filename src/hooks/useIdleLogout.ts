import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useToast } from '../contexts/ToastContext';

interface UseIdleLogoutOptions {
  timeout?: number; // Timeout in milliseconds (default: 30 minutes)
  warningTime?: number; // Warning time in milliseconds (default: 5 minutes before timeout)
  events?: string[]; // Events to listen for user activity
}

export const useIdleLogout = (options: UseIdleLogoutOptions = {}) => {
  const testSeconds = Number(import.meta.env.VITE_IDLE_TEST_SECONDS ?? 0) || 0;
  const baseMinutes = Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES ?? 30) || 30;
  const computedTimeout = testSeconds > 0 ? testSeconds * 1000 : baseMinutes * 60 * 1000;
  const computedWarning = testSeconds > 0 ? Math.min(10, Math.max(5, Math.floor(testSeconds / 2))) * 1000 : Math.max(1, Math.min(10, Math.floor(baseMinutes / 6))) * 60 * 1000;

  const {
    timeout = computedTimeout,
    warningTime = computedWarning, // default ~1/6 of timeout in minutes or ~half in test mode (5–10s)
    events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown'
    ]
  } = options;

  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    console.log('[useIdleLogout] Auto-logging out due to inactivity');
    try {
      await signOut();
    } catch (error) {
      console.error('[useIdleLogout] Error during auto-logout:', error);
    }
  }, [signOut]);

  const showWarning = useCallback(() => {
    const minutes = Math.max(1, Math.round(warningTime / 60000));
    showToast(`سيتم تسجيل الخروج تلقائياً خلال ${minutes} دقيقة بسبب عدم النشاط`, { severity: 'warning', duration: minutes * 60000 });
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, warningTime);
  }, [warningTime, handleLogout, showToast]);

  const resetTimer = useCallback(() => {
    if (!user) return;

    const now = Date.now();
    lastActivityRef.current = now;
    
    clearTimeouts();

    // Set warning timer
    warningTimeoutRef.current = setTimeout(() => {
      showWarning();
    }, timeout - warningTime);
  }, [user, timeout, warningTime, clearTimeouts, showWarning]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!user) {
      clearTimeouts();
      return;
    }

    // Reset timer on mount if user is authenticated
    resetTimer();

    // Add event listeners for user activity
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup function
    return () => {
      clearTimeouts();
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [user, handleActivity, resetTimer, clearTimeouts, events]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  return {
    lastActivity: lastActivityRef.current,
    resetTimer
  };
};
