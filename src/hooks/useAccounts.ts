import { useSyncedQuery } from './useSyncedQuery'
import { supabase } from '../utils/supabase'
import { offlineCacheManager } from '../services/offline/core/OfflineCacheManager';
import { useConnectionHealth } from '../utils/connectionMonitor';

export interface ExplorerAccount {
  id: string
  code: string
  name: string
  name_ar?: string
  level: number
  parent_id?: string
  status: string
  category?: string
  org_id: string
}

async function fetchExplorerAccounts(orgId: string | null): Promise<ExplorerAccount[]> {
  if (!orgId) return []
  
  const { getConnectionMonitor } = await import('../utils/connectionMonitor');
  const isOffline = !getConnectionMonitor().getHealth().isOnline;

  if (isOffline) {
    try {
      const cached = await offlineCacheManager.get<ExplorerAccount[]>(`accounts_cache:${orgId}`);
      if (cached && Array.isArray(cached)) return cached;
    } catch {}
    return [];
  }
  
  // Debug: Log the orgId to see what type it is
  console.log('fetchExplorerAccounts called with orgId:', orgId, typeof orgId)
  
  // Defensive check: ensure orgId is a string, not an object
  if (orgId && typeof orgId !== 'string') {
    console.error('fetchExplorerAccounts: orgId is not a string:', orgId)
    return []
  }
  
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('id, code, name, name_ar, level, parent_id, status, category, org_id')
      .eq('org_id', orgId)
      .order('code', { ascending: true })
      
    if (error) throw error
    const result = (data || []) as ExplorerAccount[]

    // Cache for offline
    try {
      await offlineCacheManager.set(`accounts_cache:${orgId}`, result);
    } catch {}

    return result
  } catch (error) {
    console.error('fetchExplorerAccounts failed:', error);
    // Fallback on error
    try {
      const cached = await offlineCacheManager.get<ExplorerAccount[]>(`accounts_cache:${orgId}`, Infinity);
      if (cached && Array.isArray(cached)) return cached;
    } catch {}
    throw error;
  }
}

export function useExplorerAccounts(orgId: string | null) {
  const { isOnline } = useConnectionHealth();

  return useSyncedQuery({
    queryKey: ['explorer-accounts', orgId, isOnline], // Add isOnline to key for reactivity
    queryFn: () => fetchExplorerAccounts(orgId),
    sync: {
      channelId: 'explorer-accounts',
      tables: ['accounts'],
    },
    queryOptions: {
      enabled: !!orgId,
      staleTime: 1000 * 60 * 60, // 1 hour
    }
  })
}
