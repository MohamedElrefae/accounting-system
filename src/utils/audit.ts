import { SupabaseClient } from '@supabase/supabase-js';

export type AuditLogPayload = {
  user_id?: string | null;
  action: string;
  entity_type?: string;
  entity_id?: string | number | null;
  details?: Record<string, any>;
  ip_address?: string | null;
  user_agent?: string | null;
};

export async function safeAuditLog(supabase: SupabaseClient, payload: AuditLogPayload): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_id: payload.user_id ?? null,
      action: payload.action,
      entity_type: payload.entity_type ?? null,
      entity_id: payload.entity_id != null ? String(payload.entity_id) : null,
      details: payload.details ?? {},
      ip_address: payload.ip_address ?? null,
      user_agent: payload.user_agent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : null)
    });
  } catch (e: any) {
    // Swallow errors to avoid breaking UX when audit_logs is missing or RLS blocks
    console.warn('[safeAuditLog] Skipping audit log:', e?.message || e);
  }
}

