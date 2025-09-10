import { useState, useEffect, useCallback } from 'react';
import { getPendingAccessRequestsCount, canManageAccessRequests } from '../services/accessRequestService';

export const useAccessRequestNotifications = (refreshInterval: number = 60000) => {
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

  // Set up periodic refresh
  useEffect(() => {
    if (!canManage) return;

    const interval = setInterval(() => {
      fetchPendingCount();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [canManage, fetchPendingCount, refreshInterval]);

  return {
    pendingCount,
    canManage,
    loading,
    error,
    refresh
  };
};
