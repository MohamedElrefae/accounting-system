import { supabase } from '../utils/supabase'

export type LandingPreference = 'welcome' | 'dashboard'

// Reads the user's landing preference, scoped to active org if available.
// Falls back to 'dashboard' if none is set or user is not authenticated.
export async function getLandingPreference(orgId?: string): Promise<LandingPreference> {

  try {
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) return 'dashboard' // Default to dashboard for authenticated users

    const effectiveOrgId = orgId ?? null

    let q = supabase
      .from('user_landing_preferences')
      .select('landing_preference')
      .eq('user_id', user.id)
      .limit(1)

    q = effectiveOrgId ? q.eq('org_id', effectiveOrgId) : (q as any).is('org_id', null)

    const { data, error } = await q.single()
    
    // If table doesn't exist or query fails, default to dashboard
    if (error) {
      console.log('Landing preference query failed, defaulting to dashboard:', error.message)
      return 'dashboard'
    }
    
    if (!data) return 'dashboard'
    return (data as any).landing_preference as LandingPreference
  } catch (error) {
    console.log('Error getting landing preference, defaulting to dashboard:', error)
    return 'dashboard'
  }
}

// Upserts the user's landing preference for the active org (or global/null org).
export async function setLandingPreference(pref: LandingPreference, orgId?: string): Promise<void> {

  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) throw new Error('Not authenticated')

  const effectiveOrgId = orgId ?? null

  const payload: any = {
    user_id: user.id,
    landing_preference: pref,
    org_id: effectiveOrgId ?? null,
  }

  const { error } = await supabase
    .from('user_landing_preferences')
    .upsert(payload, { onConflict: 'user_id,org_id' })

  if (error) throw error
}