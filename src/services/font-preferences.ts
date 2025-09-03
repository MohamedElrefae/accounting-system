import { supabase } from '../utils/supabase'

export interface FontPreferences {
  id: string
  user_id: string
  font_family: string
  font_size_scale: number
  line_height_scale: number
  font_weight: string
  letter_spacing_scale: number
  is_arabic_optimized: boolean
  custom_css_variables: Record<string, string>
  created_at: string
  updated_at: string
}

export type FontUpdatePayload = Omit<FontPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>

// Font families available for selection
export const AVAILABLE_FONTS = [
  { name: 'Segoe UI', value: 'Segoe UI, sans-serif', category: 'system' },
  { name: 'Arial', value: 'Arial, sans-serif', category: 'system' },
  { name: 'Helvetica', value: 'Helvetica, sans-serif', category: 'system' },
  { name: 'Tahoma', value: 'Tahoma, sans-serif', category: 'system' },
  { name: 'Verdana', value: 'Verdana, sans-serif', category: 'system' },
  { name: 'Times New Roman', value: 'Times New Roman, serif', category: 'serif' },
  { name: 'Georgia', value: 'Georgia, serif', category: 'serif' },
  { name: 'Palatino', value: 'Palatino, serif', category: 'serif' },
  { name: 'Courier New', value: 'Courier New, monospace', category: 'monospace' },
  { name: 'Monaco', value: 'Monaco, monospace', category: 'monospace' },
  // Arabic-optimized fonts
  { name: 'Noto Sans Arabic', value: 'Noto Sans Arabic, Arial, sans-serif', category: 'arabic' },
  { name: 'Dubai', value: 'Dubai, Arial, sans-serif', category: 'arabic' },
  { name: 'Droid Arabic Naskh', value: 'Droid Arabic Naskh, Arial, sans-serif', category: 'arabic' },
  { name: 'Amiri', value: 'Amiri, Times New Roman, serif', category: 'arabic' },
  { name: 'Cairo', value: 'Cairo, Arial, sans-serif', category: 'arabic' },
]

// Font weight options
export const FONT_WEIGHTS = [
  { name: 'خفيف جداً / Extra Light', value: 'lighter' },
  { name: 'عادي / Normal', value: 'normal' },
  { name: 'متوسط / Medium', value: 'medium' },
  { name: 'نصف عريض / Semi Bold', value: 'semibold' },
  { name: 'عريض / Bold', value: 'bold' },
]

// Default font preferences
export const DEFAULT_FONT_PREFERENCES: Omit<FontPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  font_family: 'Cairo, Arial, sans-serif',
  font_size_scale: 1.0,
  line_height_scale: 1.0,
  font_weight: 'normal',
  letter_spacing_scale: 1.0,
  is_arabic_optimized: false,
  custom_css_variables: {},
}

// Cache for font preferences
let preferencesCache: FontPreferences | null = null
let preferencesCacheTime = 0
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

// Local persistence (fallback) keys
const LOCAL_KEY_BASE = 'font_prefs_v1'
const mkLocalKey = (userId?: string | null) => userId ? `${LOCAL_KEY_BASE}/${userId}` : LOCAL_KEY_BASE

function loadLocalPrefs(userId?: string | null): FontPreferences | null {
  try {
    // Prefer namespaced key
    let raw = localStorage.getItem(mkLocalKey(userId))
    // Fallback to legacy key if not found
    if (!raw && userId) raw = localStorage.getItem(LOCAL_KEY_BASE)
    if (!raw) return null
    const obj = JSON.parse(raw)
    if (!obj) return null
    // Coerce into FontPreferences shape
    const now = new Date().toISOString()
    const prefs: FontPreferences = {
      id: obj.id || 'local',
      user_id: obj.user_id || (userId || 'local'),
      font_family: obj.font_family ?? DEFAULT_FONT_PREFERENCES.font_family,
      font_size_scale: Number(obj.font_size_scale ?? DEFAULT_FONT_PREFERENCES.font_size_scale),
      line_height_scale: Number(obj.line_height_scale ?? DEFAULT_FONT_PREFERENCES.line_height_scale),
      font_weight: String(obj.font_weight ?? DEFAULT_FONT_PREFERENCES.font_weight),
      letter_spacing_scale: Number(obj.letter_spacing_scale ?? DEFAULT_FONT_PREFERENCES.letter_spacing_scale),
      is_arabic_optimized: !!obj.is_arabic_optimized,
      custom_css_variables: obj.custom_css_variables ?? {},
      created_at: obj.created_at || now,
      updated_at: obj.updated_at || now,
    }
    return prefs
  } catch {
    return null
  }
}

function isValidUuid(v?: string | null): boolean {
  return !!v && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v)
}

function saveLocalPrefs(prefs: Partial<FontUpdatePayload> & { id?: string; user_id?: string }): void {
  try {
    const stableUserId = isValidUuid(prefs.user_id || '') ? (prefs.user_id as string) : (loadLocalPrefs(prefs.user_id)?.user_id || 'local')
    const key = mkLocalKey(stableUserId)
    const existing = loadLocalPrefs(stableUserId)
    const merged = {
      id: prefs.id || existing?.id || 'local',
      user_id: stableUserId,
      font_family: prefs.font_family ?? existing?.font_family ?? DEFAULT_FONT_PREFERENCES.font_family,
      font_size_scale: prefs.font_size_scale ?? existing?.font_size_scale ?? DEFAULT_FONT_PREFERENCES.font_size_scale,
      line_height_scale: prefs.line_height_scale ?? existing?.line_height_scale ?? DEFAULT_FONT_PREFERENCES.line_height_scale,
      font_weight: prefs.font_weight ?? existing?.font_weight ?? DEFAULT_FONT_PREFERENCES.font_weight,
      letter_spacing_scale: prefs.letter_spacing_scale ?? existing?.letter_spacing_scale ?? DEFAULT_FONT_PREFERENCES.letter_spacing_scale,
      is_arabic_optimized: prefs.is_arabic_optimized ?? existing?.is_arabic_optimized ?? DEFAULT_FONT_PREFERENCES.is_arabic_optimized,
      custom_css_variables: prefs.custom_css_variables ?? existing?.custom_css_variables ?? {},
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    localStorage.setItem(key, JSON.stringify(merged))
  } catch {
    // ignore
  }
}

/**
 * Get current user's font preferences
 */
export async function getUserFontPreferences(): Promise<FontPreferences> {
  const now = Date.now()
  
  // Return cached preferences if still valid
  if (preferencesCache && now - preferencesCacheTime < CACHE_DURATION) {
    return preferencesCache
  }

  try {
    // Try RPC first
    const { data, error } = await supabase.rpc('get_user_font_preferences')

    if (!error && data) {
      preferencesCache = data as FontPreferences
      preferencesCacheTime = now
      saveLocalPrefs(preferencesCache)
      return preferencesCache
    }

    // Fallback: direct table read by authenticated user_id
    const { data: authData } = await supabase.auth.getUser()
    const uid = authData?.user?.id || null

    if (uid) {
      const { data: row, error: selErr } = await supabase
        .from('user_font_preferences')
        .select('*')
        .eq('user_id', uid)
        .single()

      if (!selErr && row) {
        preferencesCache = row as unknown as FontPreferences
        preferencesCacheTime = now
        saveLocalPrefs(preferencesCache)
        return preferencesCache
      }

      // If not found, create defaults server-side via fallback upsert
      const { data: createdRow, error: upsertErr } = await supabase
        .from('user_font_preferences')
        .upsert({
          user_id: uid,
          font_family: DEFAULT_FONT_PREFERENCES.font_family,
          font_size_scale: DEFAULT_FONT_PREFERENCES.font_size_scale,
          line_height_scale: DEFAULT_FONT_PREFERENCES.line_height_scale,
          font_weight: DEFAULT_FONT_PREFERENCES.font_weight,
          letter_spacing_scale: DEFAULT_FONT_PREFERENCES.letter_spacing_scale,
          is_arabic_optimized: DEFAULT_FONT_PREFERENCES.is_arabic_optimized,
          custom_css_variables: DEFAULT_FONT_PREFERENCES.custom_css_variables,
        }, { onConflict: 'user_id' })
        .select()
        .single()

      if (!upsertErr && createdRow) {
        preferencesCache = createdRow as unknown as FontPreferences
        preferencesCacheTime = now
        saveLocalPrefs(preferencesCache)
        return preferencesCache
      }
    }
    // Final fallback when no authenticated user and no server data
    const local = loadLocalPrefs(null)
    if (local) {
      preferencesCache = local
      preferencesCacheTime = now
      return local
    }
    return {
      ...DEFAULT_FONT_PREFERENCES,
      id: 'default',
      user_id: 'default',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as FontPreferences
  } catch (error) {
    console.warn('Falling back to local font preferences due to error:', error)
    // Attempt to get current user id for namespaced key
    let uid: string | null = null
    try {
      const { data } = await supabase.auth.getUser()
      uid = data?.user?.id || null
    } catch {}
    // Migrate legacy key to namespaced key if needed
    try {
      if (uid) {
        const nsKey = mkLocalKey(uid)
        const hasNs = localStorage.getItem(nsKey)
        const legacy = localStorage.getItem(LOCAL_KEY_BASE)
        if (!hasNs && legacy) {
          localStorage.setItem(nsKey, legacy)
          try { localStorage.removeItem(LOCAL_KEY_BASE) } catch {}
        }
      }
    } catch {}
    // Fallback to local storage if available, otherwise default
    const local = loadLocalPrefs(uid)
    if (local) {
      preferencesCache = local
      preferencesCacheTime = now
      return local
    }
    return {
      ...DEFAULT_FONT_PREFERENCES,
      id: 'default',
      user_id: 'default',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as FontPreferences
  }
}

/**
 * Create default font preferences for the current user
 */

/**
 * Update user font preferences
 */
export async function updateUserFontPreferences(updates: Partial<FontUpdatePayload>): Promise<FontPreferences> {
  try {
    // Ensure user is authenticated before attempting server save
    const { data: authData } = await supabase.auth.getUser()
    const uid = authData?.user?.id || null
    const currentPrefs = await getUserFontPreferences()
    const effectiveUserId = isValidUuid(uid) ? uid : (isValidUuid(currentPrefs.user_id) ? currentPrefs.user_id : null)

    const merged: FontUpdatePayload = {
      font_family: updates.font_family ?? currentPrefs.font_family,
      font_size_scale: updates.font_size_scale ?? currentPrefs.font_size_scale,
      line_height_scale: updates.line_height_scale ?? currentPrefs.line_height_scale,
      font_weight: updates.font_weight ?? currentPrefs.font_weight,
      letter_spacing_scale: updates.letter_spacing_scale ?? currentPrefs.letter_spacing_scale,
      is_arabic_optimized: updates.is_arabic_optimized ?? currentPrefs.is_arabic_optimized,
      custom_css_variables: updates.custom_css_variables ?? currentPrefs.custom_css_variables,
    }

    // Save to server
    const { data, error } = await supabase.rpc('upsert_user_font_preferences', {
      p_font_family: merged.font_family,
      p_font_size_scale: merged.font_size_scale,
      p_line_height_scale: merged.line_height_scale,
      p_font_weight: merged.font_weight,
      p_letter_spacing_scale: merged.letter_spacing_scale,
      p_is_arabic_optimized: merged.is_arabic_optimized,
      p_custom_css_variables: merged.custom_css_variables,
    })

    if (error) {
      // Try fallback: direct upsert into table when RPC is not available (e.g., 404)
      console.warn('RPC upsert_user_font_preferences failed, attempting table upsert fallback. Error:', error)
      try {
        const { data: upserted, error: upsertError } = await supabase
          .from('user_font_preferences')
          .upsert({
            user_id: effectiveUserId,
            font_family: merged.font_family,
            font_size_scale: merged.font_size_scale,
            line_height_scale: merged.line_height_scale,
            font_weight: merged.font_weight,
            letter_spacing_scale: merged.letter_spacing_scale,
            is_arabic_optimized: merged.is_arabic_optimized,
            custom_css_variables: merged.custom_css_variables ?? {},
          }, { onConflict: 'user_id' })
          .select()
          .single()
        if (upsertError) {
          // Persist locally so the UI can keep the setting, but signal failure to caller
          saveLocalPrefs({ ...merged, id: currentPrefs.id, user_id: effectiveUserId || 'local' })
          throw upsertError
        }
        const saved = upserted as unknown as FontPreferences
        saveLocalPrefs(saved)
        preferencesCache = null
        preferencesCacheTime = 0
        return saved
      } catch (fallbackErr) {
        console.error('Table upsert fallback also failed:', fallbackErr)
        // Persist locally so user sees their choice immediately, but bubble error
        saveLocalPrefs({ ...merged, id: currentPrefs.id, user_id: effectiveUserId || 'local' })
        throw fallbackErr
      }
    }

    const saved = data as FontPreferences
    // Persist locally
    saveLocalPrefs(saved)
    // Clear cache so next read pulls fresh
    preferencesCache = null
    preferencesCacheTime = 0
    return saved
  } catch (error) {
    console.error('Error updating font preferences:', error)
    // Keep local in sync even on error so user sees their choice immediately
    saveLocalPrefs(updates)
    throw error
  }
}

/**
 * Apply font preferences to CSS variables
 */
export function applyFontPreferencesToCSS(preferences: FontPreferences) {
  const root = document.documentElement
  
  // Coerce and default potentially null/undefined values from backend
  const fontFamily = preferences.font_family || DEFAULT_FONT_PREFERENCES.font_family
  const fontSizeScale = (preferences.font_size_scale ?? DEFAULT_FONT_PREFERENCES.font_size_scale)
  const lineHeightScale = (preferences.line_height_scale ?? DEFAULT_FONT_PREFERENCES.line_height_scale)
  const fontWeight = preferences.font_weight || DEFAULT_FONT_PREFERENCES.font_weight
  const letterSpacingScale = (preferences.letter_spacing_scale ?? DEFAULT_FONT_PREFERENCES.letter_spacing_scale)
  const isArabicOptimized = !!preferences.is_arabic_optimized
  const customVars = preferences.custom_css_variables ?? {}
  
  // Apply base font properties
  root.style.setProperty('--user-font-family', fontFamily)
  root.style.setProperty('--user-font-size-scale', String(fontSizeScale))
  root.style.setProperty('--user-line-height-scale', String(lineHeightScale))
  root.style.setProperty('--user-font-weight', fontWeight)
  root.style.setProperty('--user-letter-spacing-scale', String(letterSpacingScale))
  
  // Apply Arabic optimization styles if enabled
  if (isArabicOptimized) {
    root.style.setProperty('--user-arabic-optimized', '1')
    root.classList.add('arabic-optimized')
  } else {
    root.style.setProperty('--user-arabic-optimized', '0')
    root.classList.remove('arabic-optimized')
  }
  
  // Apply custom CSS variables
  Object.entries(customVars).forEach(([key, value]) => {
    root.style.setProperty(`--user-${key}`, String(value))
  })
  
  // Update font scale classes
  root.className = root.className.replace(/font-scale-\d+/g, '')
  const scaleClass = `font-scale-${Math.round(fontSizeScale * 100)}`
  root.classList.add(scaleClass)
}

/**
 * Reset font preferences to defaults
 */
export async function resetFontPreferences(): Promise<FontPreferences> {
  return await updateUserFontPreferences(DEFAULT_FONT_PREFERENCES)
}

/**
 * Clear the preferences cache
 */
export function clearFontPreferencesCache() {
  preferencesCache = null
  preferencesCacheTime = 0
}

/**
 * Get font preview text for different languages
 */
export function getFontPreviewText(language: 'en' | 'ar' | 'mixed' = 'mixed') {
  const previews = {
    en: {
      heading: 'Sample Heading Text',
      body: 'This is a sample paragraph to show how the selected font looks. You can see the font family, size, weight, and spacing in action.',
      numbers: '1234567890'
    },
    ar: {
      heading: 'عنوان نموذجي للنص',
      body: 'هذه فقرة نموذجية لإظهار كيف يبدو الخط المحدد. يمكنك رؤية عائلة الخط وحجمه ووزنه والمسافات أثناء العمل.',
      numbers: '١٢٣٤٥٦٧٨٩٠'
    },
    mixed: {
      heading: 'Sample Heading / عنوان نموذجي',
      body: 'This is mixed text showing both English and Arabic: هذا نص مختلط يظهر الإنجليزية والعربية معًا.',
      numbers: '1234567890 / ١٢٣٤٥٦٧٨٩٠'
    }
  }
  
  return previews[language]
}
