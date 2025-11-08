import { supabase } from '../utils/supabase'
import { getActiveOrgId } from '../utils/org'

export type LandingPreference = 'welcome' | 'dashboard'

// Reads the user's landing preference, scoped to active org if available.
// Falls back to 'dashboard' if none is set or user is not authenticated.
export async function getLandingPreference(orgId?: string): Promise<LandingPreference> {
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) return 'welcome'

  const effectiveOrgId = orgId ?? getActiveOrgId()

  let q = supabase
    .from('user_landing_preferences')
    .select('landing_preference')
    .eq('user_id', user.id)
    .limit(1)

  q = effectiveOrgId ? q.eq('org_id', effectiveOrgId) : (q as any).is('org_id', null)

  const { data, error } = await q.single()
  if (error || !data) return 'welcome'
  return (data as any).landing_preference as LandingPreference
}

// Upserts the user's landing preference for the active org (or global/null org).
export async function setLandingPreference(pref: LandingPreference, orgId?: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) throw new Error('Not authenticated')

  const effectiveOrgId = orgId ?? getActiveOrgId()

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