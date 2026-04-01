import { supabase } from '../utils/supabase'

export interface CompanyConfig {
  id: string
  company_name: string
  transaction_number_prefix: string
  transaction_number_use_year_month: boolean
  transaction_number_length: number
  transaction_number_separator: string
  transaction_number_start?: number | null  // Optional starting number (defaults to 1)
  transaction_number_year_month_separator?: string | null  // Optional separator between year/month (e.g., '-', null=YYYYMM)
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
  transaction_number_prefix: '',  // Empty prefix by default (optional)
  transaction_number_use_year_month: true,
  transaction_number_length: 4,
  transaction_number_separator: '-',
  transaction_number_start: 1,
  transaction_number_year_month_separator: null,
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
let pendingPromise: Promise<CompanyConfig> | null = null
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

  // Promise caching for thundering herd prevention
  if (pendingPromise) {
    return pendingPromise
  }


  pendingPromise = (async () => {
    // Offline fallback: rely on cache or default
    const { getConnectionMonitor } = await import('../utils/connectionMonitor');
    if (!getConnectionMonitor().getHealth().isOnline) {
      if (configCache) return configCache;
      // If no cache and offline, return default instead of failing
      return {
        ...DEFAULT_COMPANY_CONFIG,
        id: 'default',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as CompanyConfig
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
        configCacheTime = Date.now()
        configCacheOrgId = effectiveOrgId
        return fallback
      }

      configCache = row
      configCacheTime = Date.now()
      configCacheOrgId = effectiveOrgId
      return configCache
    } catch (error: any) {
      if (
        error.name === 'AbortError' || 
        error.message?.includes('AbortError') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError')
      ) {
        // Ignore abort and network errors
        return {
          ...DEFAULT_COMPANY_CONFIG,
          id: 'default',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as CompanyConfig
      }
      console.error('Error fetching company config:', error)
      // Return default config as fallback
      return {
        ...DEFAULT_COMPANY_CONFIG,
        id: 'default',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as CompanyConfig
    } finally {
      pendingPromise = null
    }
  })()

  return pendingPromise
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
  try {
    const currentConfig = await getCompanyConfig(orgId ?? null);
    const isNewConfig = !currentConfig || currentConfig.id === 'default';

    // Build payload only from columns that exist in database
    const payload: Record<string, any> = {};
    
    // Core columns that definitely exist in all versions
    const CORE_COLUMNS = [
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
    ];
    
    // New columns that may not exist in DB yet
    const NEW_COLUMNS = [
      'default_org_id',
      'default_project_id',
      'renumber_transactions_after_delete',
      'auto_post_on_approve',
      'transaction_number_start',
      'transaction_number_year_month_separator',
    ];
    
    // Always include core columns if provided
    for (const k of CORE_COLUMNS) {
      if ((updates as any)[k] !== undefined) {
        // Convert empty string prefix to null to satisfy DB constraint
        if (k === 'transaction_number_prefix' && (updates as any)[k] === '') {
          payload[k] = null;
        } else {
          payload[k] = (updates as any)[k];
        }
      }
    }
    
    // For new configs (no DB row yet), NEVER send new columns - they don't exist in DB
    // For existing configs, only send if the column already exists (has value in currentConfig)
    if (!isNewConfig) {
      for (const k of NEW_COLUMNS) {
        // Check if DB row has this column by checking if the field exists in currentConfig
        // (undefined means column doesn't exist in DB, null means it exists but is empty)
        const currentValue = (currentConfig as any)[k];
        if ((updates as any)[k] !== undefined && currentValue !== undefined) {
          payload[k] = (updates as any)[k];
        }
      }
    }

    // If no persistent row exists yet (cache fallback id), insert a new row
    if (isNewConfig) {
      const insertPayload = { 
        ...payload, 
        updated_at: new Date().toISOString(), 
        org_id: (orgId ?? null) 
      };
      
      const { data, error } = await supabase
        .from('company_config')
        .insert(insertPayload)
        .select('*')
        .single();
        
      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      // Clear cache
      configCache = null;
      configCacheTime = 0;
      configCacheOrgId = null;
      return data as CompanyConfig;
    }

    // Update existing row
    const { data, error } = await supabase
      .from('company_config')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentConfig.id)
      .select('*')
      .single();

    if (error) {
      console.error('Update error:', error);
      throw error;
    }

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
    separator: config.transaction_number_separator,
    startNumber: config.transaction_number_start ?? 1,
    yearMonthSeparator: config.transaction_number_year_month_separator
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
