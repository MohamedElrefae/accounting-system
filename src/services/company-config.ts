import { supabase } from '../utils/supabase'

export interface CompanyConfig {
  id: string
  company_name: string
  transaction_number_prefix: string
  transaction_number_use_year_month: boolean
  transaction_number_length: number
  transaction_number_separator: string
  fiscal_year_start_month: number
  currency_code: string
  currency_symbol: string
  date_format: string
  number_format: string
  default_org_id?: string | null
  default_project_id?: string | null
  // Optional toggle: resequence numbers after delete (for pre-go-live/testing)
  renumber_transactions_after_delete?: boolean | null
  // Optional company-wide dashboard shortcuts
  // Stored as JSONB in DB: [{ label, path, icon?, accessKey? }]
  shortcuts?: Array<{ label: string; path: string; icon?: string; accessKey?: string }>
  created_at: string
  updated_at: string
}

// Default configuration
const DEFAULT_COMPANY_CONFIG: Partial<CompanyConfig> = {
  company_name: 'شركتي',
  transaction_number_prefix: 'JE',
  transaction_number_use_year_month: true,
  transaction_number_length: 4,
  transaction_number_separator: '-',
  fiscal_year_start_month: 1, // January
  currency_code: 'SAR',
  currency_symbol: 'none', // default to numbers only unless configured
  date_format: 'YYYY-MM-DD',
  number_format: 'ar-SA',
  default_org_id: null,
  default_project_id: null,
  renumber_transactions_after_delete: false,
  shortcuts: []
}

// Cache for company config
let configCache: CompanyConfig | null = null
let configCacheTime = 0
let configCacheOrgId: string | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Get the current company configuration
 */
export async function getCompanyConfig(orgId?: string | null): Promise<CompanyConfig> {
  const now = Date.now()
  const effectiveOrgId = orgId ?? null
  
  // Return cached config if it's still valid
  if (configCache && now - configCacheTime < CACHE_DURATION && configCacheOrgId === effectiveOrgId) {
    return configCache
  }

  try {
    let query = supabase
      .from('company_config')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    if (effectiveOrgId) {
      query = query.eq('org_id', effectiveOrgId)
    }

    const { data, error } = await query
    if (error) throw error

    const row = Array.isArray(data) ? (data[0] as CompanyConfig | undefined) : (data as unknown as CompanyConfig | undefined)

    if (!row) {
      const fallback = {
        ...DEFAULT_COMPANY_CONFIG,
        id: 'default',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as CompanyConfig
      configCache = fallback
      configCacheTime = now
      configCacheOrgId = effectiveOrgId
      return fallback
    }

    configCache = row
    configCacheTime = now
    configCacheOrgId = effectiveOrgId
    return configCache
  } catch (error) {
    console.error('Error fetching company config:', error)
    // Return default config as fallback
    return {
      ...DEFAULT_COMPANY_CONFIG,
      id: 'default',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as CompanyConfig
  }
}

/**
 * Create default company configuration
 */
export async function createDefaultConfig(): Promise<CompanyConfig> {
  // Do not attempt to write a row automatically; return in-memory defaults.
  // This avoids 400 errors when optional columns differ per environment and respects RLS.
  const fallback = {
    ...DEFAULT_COMPANY_CONFIG,
    id: 'default',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  } as CompanyConfig
  configCache = fallback
  configCacheTime = Date.now()
  configCacheOrgId = null
  return fallback
}

/**
 * Update company configuration
 */
export async function updateCompanyConfig(updates: Partial<CompanyConfig>, orgId?: string | null): Promise<CompanyConfig> {
  // Only send columns that certainly exist in the DB to avoid PostgREST 400 (unknown column)
  const ALLOWED_COLUMNS: (keyof CompanyConfig)[] = [
    'company_name',
    'transaction_number_prefix',
    'transaction_number_use_year_month',
    'transaction_number_length',
    'transaction_number_separator',
    'fiscal_year_start_month',
    'currency_code',
    'currency_symbol',
    'date_format',
    'number_format',
    'default_org_id',
    'default_project_id',
    'auto_post_on_approve',
    'renumber_transactions_after_delete',
  ] as any;

  const payload: Record<string, any> = {};
  for (const k of ALLOWED_COLUMNS as string[]) {
    if ((updates as any)[k] !== undefined) payload[k] = (updates as any)[k];
  }

  try {
    const currentConfig = await getCompanyConfig(orgId ?? null);

    // Include optional columns only if they exist in current config shape
    const OPTIONAL_KEYS = [
      'default_org_id',
      'default_project_id',
      'renumber_transactions_after_delete',
      'auto_post_on_approve',
    ];
    for (const k of OPTIONAL_KEYS) {
      if ((currentConfig as any)[k] !== undefined && (updates as any)[k] !== undefined) {
        (payload as any)[k] = (updates as any)[k];
      }
    }

    // If no persistent row exists yet (cache fallback id), insert a new row
    if (!currentConfig || currentConfig.id === 'default') {
      const insertPayload = { ...payload, updated_at: new Date().toISOString(), org_id: (orgId ?? null) }
      const { data, error } = await supabase
        .from('company_config')
        .insert(insertPayload)
        .select('*')
        .single();
      if (error) throw error;

      // Clear cache
      configCache = null;
      configCacheTime = 0;
      configCacheOrgId = null;
      return data as CompanyConfig;
    }

    const { data, error } = await supabase
      .from('company_config')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentConfig.id)
      .select('*')
      .single();

    if (error) throw error;

    // Clear cache
    configCache = null;
    configCacheTime = 0;
    configCacheOrgId = null;

    return data as CompanyConfig;
  } catch (error) {
    console.error('Error updating company config:', error);
    throw error;
  }
}

/**
 * Get transaction number configuration from company config
 */
export async function getTransactionNumberConfig() {
  const config = await getCompanyConfig(null)
  
  return {
    prefix: config.transaction_number_prefix,
    useYearMonth: config.transaction_number_use_year_month,
    numberLength: config.transaction_number_length,
    separator: config.transaction_number_separator
  }
}

/**
 * Clear the configuration cache
 */
export function clearConfigCache() {
  configCache = null
  configCacheTime = 0
  configCacheOrgId = null
}
