import { useState, useEffect } from 'react';
import { permissionAuditService } from '../services/permissionAuditService';
import type { PermissionAuditLog, PermissionAuditFilters } from '../services/permissionAuditService';

export interface UsePermissionAuditLogsResult {
  logs: PermissionAuditLog[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export function usePermissionAuditLogs(
  orgId: string,
  filters?: PermissionAuditFilters
): UsePermissionAuditLogsResult {
  const [logs, setLogs] = useState<PermissionAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const limit = filters?.limit || 50;

  const fetchLogs = async (newOffset: number = 0) => {
    try {
      setLoading(true);
      setError(null);

      const data = await permissionAuditService.getPermissionAuditLogs(orgId, {
        ...filters,
        limit,
        offset: newOffset
      });

      if (newOffset === 0) {
        setLogs(data);
      } else {
        setLogs(prev => [...prev, ...data]);
      }

      setHasMore(data.length === limit);
      setOffset(newOffset);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch audit logs'));
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) {
      fetchLogs(0);
    }
  }, [orgId, filters?.action, filters?.resourceType, filters?.userId, filters?.startDate, filters?.endDate]);

  const refetch = async () => {
    await fetchLogs(0);
  };

  const loadMore = async () => {
    if (hasMore && !loading) {
      await fetchLogs(offset + limit);
    }
  };

  return {
    logs,
    loading,
    error,
    refetch,
    hasMore,
    loadMore
  };
}
