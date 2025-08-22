import { SupabaseClient } from '@supabase/supabase-js';

// Secure RPC-based audit logging helper
// Calls the Postgres SECURITY DEFINER function public.log_audit
export async function audit(
  supabase: SupabaseClient,
  action: string,
  entityType?: string | null,
  entityId?: string | number | null,
  details?: Record<string, any>
): Promise<void> {
  try {
    const payload = {
      p_action: action,
      p_entity_type: entityType ?? null,
      p_entity_id: entityId != null ? String(entityId) : null,
      p_details: details ?? {}
    };
    const { error } = await supabase.rpc('log_audit', payload);
    if (error) {
      console.warn('[audit] log_audit RPC failed:', error.message);
    }
  } catch (e: any) {
    console.warn('[audit] RPC call failed:', e?.message || e);
  }
}

