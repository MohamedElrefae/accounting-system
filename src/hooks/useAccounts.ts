import { useSyncedQuery } from './useSyncedQuery'
import { supabase } from '../utils/supabase'

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
  
  // Debug: Log the orgId to see what type it is
  console.log('fetchExplorerAccounts called with orgId:', orgId, typeof orgId)
  
  // Defensive check: ensure orgId is a string, not an object
  if (orgId && typeof orgId !== 'string') {
    console.error('fetchExplorerAccounts: orgId is not a string:', orgId)
    return []
  }
  
  const { data, error } = await supabase
    .from('accounts')
    .select('id, code, name, name_ar, level, parent_id, status, category, org_id')
    .eq('org_id', orgId)
    .order('code', { ascending: true })
    
  if (error) throw error
  return (data || []) as ExplorerAccount[]
}

export function useExplorerAccounts(orgId: string | null) {
  return useSyncedQuery({
    queryKey: ['explorer-accounts', orgId],
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
