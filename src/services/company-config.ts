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
  shortcuts: []
}

// Cache for company config
let configCache: CompanyConfig | null = null
let configCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Get the current company configuration
 */
export async function getCompanyConfig(): Promise<CompanyConfig> {
  const now = Date.now()
  
  // Return cached config if it's still valid
  if (configCache && now - configCacheTime < CACHE_DURATION) {
    return configCache
  }

  try {
    const { data, error } = await supabase
      .from('company_config')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No config exists, create default
        return await createDefaultConfig()
      }
      throw error
    }

    configCache = data as CompanyConfig
    configCacheTime = now
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
async function createDefaultConfig(): Promise<CompanyConfig> {
  try {
    const { data, error } = await supabase
      .from('company_config')
      .insert(DEFAULT_COMPANY_CONFIG)
      .select('*')
      .single()

    if (error) throw error

    configCache = data as CompanyConfig
    configCacheTime = Date.now()
    return configCache
  } catch (error) {
    console.error('Error creating default config:', error)
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
 * Update company configuration
 */
export async function updateCompanyConfig(updates: Partial<CompanyConfig>): Promise<CompanyConfig> {
  try {
    const currentConfig = await getCompanyConfig()
    
    const { data, error } = await supabase
      .from('company_config')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentConfig.id)
      .select('*')
      .single()

    if (error) throw error

    // Clear cache
    configCache = null
    configCacheTime = 0

    return data as CompanyConfig
  } catch (error) {
    console.error('Error updating company config:', error)
    throw error
  }
}

/**
 * Get transaction number configuration from company config
 */
export async function getTransactionNumberConfig() {
  const config = await getCompanyConfig()
  
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
}
