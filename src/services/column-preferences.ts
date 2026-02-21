import { supabase } from '../utils/supabase'
import { getConnectionMonitor } from '../utils/connectionMonitor'

export interface UserColumnPreferencesRow {
  id: string
  user_id: string
  table_key: string
  column_config: any
  version: number
  created_at: string
  updated_at: string
}

let COLUMN_PREFS_RPC_DISABLED = false

function shouldDisableRpc(error: any): boolean {
  try {
    const msg = String(error?.message || '').toLowerCase()
    const code = String((error as any)?.code || '')
    const status = Number((error as any)?.status || 0)
    return status === 404 || code === 'PGRST116' || msg.includes('404') || msg.includes('not exist') || msg.includes('not found')
  } catch {
    return false
  }
}

export function isColumnPreferencesRpcDisabled(): boolean {
  return COLUMN_PREFS_RPC_DISABLED
}

export async function getUserColumnPreferences(tableKey: string): Promise<UserColumnPreferencesRow | null> {
  const monitor = getConnectionMonitor();
  if (!monitor.getHealth().isOnline) return null;
  if (!COLUMN_PREFS_RPC_DISABLED) {
    const { data, error } = await supabase.rpc('get_user_column_preferences', { p_table_key: tableKey })
    if (!error) return (data as UserColumnPreferencesRow) ?? null
    if (shouldDisableRpc(error)) COLUMN_PREFS_RPC_DISABLED = true
  }
  // Fallback: direct table read (uses RLS)
  const { data: row } = await supabase
    .from('user_column_preferences')
    .select('*')
    .eq('table_key', tableKey)
    .maybeSingle()
  return (row as UserColumnPreferencesRow) ?? null
}

export async function upsertUserColumnPreferences(params: {
  tableKey: string
  columnConfig: any
  version?: number
}): Promise<UserColumnPreferencesRow | null> {
  const monitor = getConnectionMonitor();
  if (!monitor.getHealth().isOnline) return null;
  const { tableKey, columnConfig, version = 1 } = params
  if (!COLUMN_PREFS_RPC_DISABLED) {
    const { data, error } = await supabase.rpc('upsert_user_column_preferences', {
      p_table_key: tableKey,
      p_column_config: columnConfig,
      p_version: version,
    })
    if (!error) return (data as UserColumnPreferencesRow) ?? null
    if (shouldDisableRpc(error)) COLUMN_PREFS_RPC_DISABLED = true
  }
  // Fallback: table upsert (RLS should set user_id to current user via trigger/policy or rely on unique per user)
  const { data: up } = await supabase
    .from('user_column_preferences')
    .upsert({ table_key: tableKey, column_config: columnConfig, version }, { onConflict: 'user_id,table_key' })
    .select('*')
    .maybeSingle()
  return (up as UserColumnPreferencesRow) ?? null
}
