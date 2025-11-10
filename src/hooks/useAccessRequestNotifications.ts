import { useState, useEffect, useCallback } from 'react';
import { getPendingAccessRequestsCount, canManageAccessRequests } from '../services/accessRequestService';

// Default to 5 minutes; auto-pauses on hidden tab and refreshes on visibility regain
export const useAccessRequestNotifications = (refreshInterval: number = 300000) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkPermissions = useCallback(async () => {
    try {
      const hasPermission = await canManageAccessRequests();
      setCanManage(hasPermission);
      return hasPermission;
    } catch (err: any) {
      setError(err.message);
      setCanManage(false);
      return false;
    }
  }, []);

  const fetchPendingCount = useCallback(async () => {
    try {
      setError(null);
      const count = await getPendingAccessRequestsCount();
      setPendingCount(count);
    } catch (err: any) {
      setError(err.message);
      setPendingCount(0);
    }
  }, []);

  const refresh = useCallback(async () => {
    const hasPermission = await checkPermissions();
    if (hasPermission) {
      await fetchPendingCount();
    }
    setLoading(false);
  }, [checkPermissions, fetchPendingCount]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh on tab becoming visible to feel instant, even with large interval
  useEffect(() => {
    const onVisibility = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [refresh]);

  // Set up periodic refresh with visibility-aware guard
  useEffect(() => {
    if (!canManage) return;

    const id = setInterval(() => {
      if (!document.hidden) fetchPendingCount();
    }, Math.max(60000, refreshInterval)); // never less than 1 minute

    return () => clearInterval(id);
  }, [canManage, fetchPendingCount, refreshInterval]);

  return {
    pendingCount,
    canManage,
    loading,
    error,
    refresh
  };
};
