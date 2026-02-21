import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from './useAuth';
import { useScopeOptional } from '../contexts/ScopeContext';
import { presenceHeartbeat } from '../services/presence';
import { getConnectionMonitor } from '../utils/connectionMonitor';

export function usePresenceHeartbeat(options?: {
  intervalMs?: number;
}): void {
  const { intervalMs = 45_000 } = options ?? {};

  const { user } = useAuth();
  const scope = useScopeOptional();
  const orgId = scope?.currentOrg?.id ?? null;

  const mountedRef = useRef(false);
  const inFlightRef = useRef(false);
  const lastSentAtRef = useRef<number>(0);

  const metadata = useMemo(() => {
    return {
      client: 'web',
      path: typeof window !== 'undefined' ? window.location.pathname : '',
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const send = async () => {
      if (!mountedRef.current) return;
      if (inFlightRef.current) return;
      
      const monitor = getConnectionMonitor();
      if (!monitor.getHealth().isOnline || !navigator.onLine) return;
      
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

      const now = Date.now();
      if (now - lastSentAtRef.current < Math.max(10_000, intervalMs / 2)) return;

      inFlightRef.current = true;
      try {
        await presenceHeartbeat({ orgId, metadata });
        lastSentAtRef.current = Date.now();
      } catch {
        // Ignore heartbeat errors (do not block the UI)
      } finally {
        inFlightRef.current = false;
      }
    };

    const intervalId = window.setInterval(send, intervalMs);

    const handleVisibility = () => {
      void send();
    };

    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    void send();

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [intervalMs, metadata, orgId, user?.id]);
}
