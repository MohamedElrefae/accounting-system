import { supabase } from '../utils/supabase'

export type AccountGroup = 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses'
export interface PrefixRule { prefix: string; account_group: AccountGroup }

const FALLBACK_RULES: PrefixRule[] = [
  { prefix: '11', account_group: 'assets' },
  { prefix: '12', account_group: 'assets' },
  { prefix: '21', account_group: 'equity' },
  { prefix: '22', account_group: 'liabilities' },
  { prefix: '23', account_group: 'liabilities' },
  { prefix: '3', account_group: 'revenue' },
  { prefix: '4', account_group: 'expenses' },
]

export async function fetchPrefixRules(): Promise<PrefixRule[]> {
  const { data, error } = await supabase
    .from('account_prefix_map')
    .select('prefix, account_group')
    .eq('is_active', true)
  if (error || !data || data.length === 0) return FALLBACK_RULES
  // Sort by prefix length desc to prefer longer, more specific matches
  return [...data].sort((a,b) => b.prefix.length - a.prefix.length)
}

export function classifyByRules(code: string, rules: PrefixRule[]): AccountGroup | undefined {
  if (!code) return undefined
  const numeric = String(code).trim().replace(/[^0-9].*$/, '')
  for (const r of rules) {
    if (numeric.startsWith(r.prefix)) return r.account_group
  }
  return undefined
}
