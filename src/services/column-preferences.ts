import { supabase } from '../utils/supabase'

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
  if (COLUMN_PREFS_RPC_DISABLED) return null
  const { data, error } = await supabase.rpc('get_user_column_preferences', { p_table_key: tableKey })
  if (error) {
    if (shouldDisableRpc(error)) {
      COLUMN_PREFS_RPC_DISABLED = true
    }
    // Treat as no preferences
    return null
  }
  return (data as UserColumnPreferencesRow) ?? null
}

export async function upsertUserColumnPreferences(params: {
  tableKey: string
  columnConfig: any
  version?: number
}): Promise<UserColumnPreferencesRow | null> {
  if (COLUMN_PREFS_RPC_DISABLED) return null
  const { tableKey, columnConfig, version = 1 } = params
  const { data, error } = await supabase.rpc('upsert_user_column_preferences', {
    p_table_key: tableKey,
    p_column_config: columnConfig,
    p_version: version,
  })
  if (error) {
    if (shouldDisableRpc(error)) {
      COLUMN_PREFS_RPC_DISABLED = true
    }
    return null
  }
  return (data as UserColumnPreferencesRow) ?? null
}
