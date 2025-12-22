import { supabase } from '../utils/supabase'

export type AccountGroup = 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses'
export interface PrefixRule { prefix: string; account_group: AccountGroup; org_id?: string | null }

const FALLBACK_RULES: PrefixRule[] = [
  { prefix: '11', account_group: 'assets' },
  { prefix: '12', account_group: 'assets' },
  { prefix: '21', account_group: 'equity' },
  { prefix: '22', account_group: 'liabilities' },
  { prefix: '23', account_group: 'liabilities' },
  { prefix: '3', account_group: 'revenue' },
  { prefix: '4', account_group: 'expenses' },
]

export async function fetchPrefixRules(orgId?: string): Promise<PrefixRule[]> {
  let query = supabase
    .from('account_prefix_map')
    .select('prefix, account_group, org_id')
    .eq('is_active', true)
  
  // Filter: system-wide (org_id IS NULL) OR org-specific
  if (orgId) {
    query = query.or(`org_id.is.null,org_id.eq.${orgId}`)
  }
  
  const { data, error } = await query
  if (error || !data || data.length === 0) return FALLBACK_RULES
  // Sort by prefix length desc to prefer longer, more specific matches
  // Org-specific rules take precedence over system-wide
  return [...data].sort((a, b) => {
    // Org-specific first
    if (a.org_id && !b.org_id) return -1
    if (!a.org_id && b.org_id) return 1
    // Then by prefix length
    return b.prefix.length - a.prefix.length
  })
}

export function classifyByRules(code: string, rules: PrefixRule[]): AccountGroup | undefined {
  if (!code) return undefined
  const numeric = String(code).trim().replace(/[^0-9].*$/, '')
  for (const r of rules) {
    if (numeric.startsWith(r.prefix)) return r.account_group
  }
  return undefined
}
