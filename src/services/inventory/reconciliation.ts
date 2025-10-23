import { supabase } from '@/utils/supabase'

export type ReconSession = {
  id: string
  statement_id: string | null
  session_name: string
  session_notes: string | null
  status: 'draft' | 'in_progress' | 'resolved' | 'posted'
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type ReconLine = {
  id: string
  session_id: string
  material_id: string
  material_code: string | null
  material_name: string | null
  warehouse_id: string | null
  location_id: string
  location_code: string | null
  location_name: string | null
  system_qty: number | null
  system_value: number | null
  external_qty: number | null
  external_value: number | null
  delta_qty: number | null
  status: 'draft' | 'in_progress' | 'resolved' | 'posted'
  resolution_action: 'adjust_system' | 'adjust_external' | 'ignore' | 'defer' | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
}

export type ReconSummary = {
  session_id: string
  line_count: number
  positive_delta_lines: number
  negative_delta_lines: number
  total_delta_qty: number
  total_external_value: number
  total_system_value: number
  total_delta_value: number
  adjust_system_count: number
  adjust_external_count: number
  ignore_count: number
  defer_count: number
}

export const ReconciliationService = {
  async listSessions(): Promise<ReconSession[]> {
    const { data, error } = await supabase
      .from('v_inv_recon_sessions')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as ReconSession[]) || []
  },

  async getSessionSummary(sessionId: string): Promise<ReconSummary | null> {
    const { data, error } = await supabase
      .from('v_inv_recon_session_summary')
      .select('*')
      .eq('session_id', sessionId)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return (data as ReconSummary) || null
  },

  async getSessionLines(sessionId: string): Promise<ReconLine[]> {
    const { data, error } = await supabase
      .from('v_inv_recon_lines')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as ReconLine[]) || []
  },

  async setLineResolution(lineId: string, action: 'adjust_system' | 'adjust_external' | 'ignore' | 'defer', notes?: string, userId?: string): Promise<void> {
    const { error } = await supabase.rpc('sp_set_recon_line_resolution', {
      p_line_id: lineId,
      p_action: action,
      p_notes: notes || null,
      p_user_id: userId || null
    })
    if (error) throw error
  },

  async bulkSetResolution(sessionId: string, userId?: string): Promise<{ line_id: string, new_action: string }[]> {
    const { data, error } = await supabase.rpc('sp_set_recon_resolution_bulk', {
      p_session_id: sessionId,
      p_user_id: userId || null
    })
    if (error) throw error
    return (data as { line_id: string, new_action: string }[]) || []
  },

  async postSession(orgId: string, sessionId: string, userId?: string, useResolvedOnly: boolean = true): Promise<string> {
    const { data, error } = await supabase.rpc('post_inventory_reconciliation_session', {
      p_org_id: orgId,
      p_session_id: sessionId,
      p_user_id: userId || null,
      p_use_resolved_only: useResolvedOnly
    })
    if (error) throw error
    return (data as string) || ''
  },

  async findLatestReconDocumentId(sessionId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('inventory_documents')
      .select('id, reference, created_at')
      .ilike('reference', `RECON:${sessionId}%`)
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) throw error
    if (!data || data.length === 0) return null
    return (data[0] as any).id as string
  },

  async voidInventoryDocument(orgId: string, docId: string, userId?: string, reason?: string): Promise<void> {
    const { error } = await supabase.rpc('void_inventory_document', {
      p_org_id: orgId,
      p_doc_id: docId,
      p_user_id: userId || null,
      p_reason: reason || 'Void from UI'
    })
    if (error) throw error
  },

  async getDocumentHeader(docId: string): Promise<{ id: string, status: string, total_lines: number, total_quantity: number, total_value: number, posted_at: string | null } | null> {
    const { data, error } = await supabase
      .from('inventory_documents')
      .select('id, status, total_lines, total_quantity, total_value, posted_at')
      .eq('id', docId)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return (data as any) || null
  }
}
