import { supabase } from '@/utils/supabase'

export type DocStatus = 'draft' | 'approved' | 'posted' | 'void'
export type DocType = 'receipt' | 'issue' | 'transfer' | 'adjust' | 'return'

export interface InventoryDocumentRow {
  id: string
  org_id: string
  doc_type: DocType
  sequence_year: number
  sequence_no: number
  doc_number?: string | null
  status: DocStatus
  document_date: string
  location_from_id?: string | null
  location_to_id?: string | null
  project_id?: string | null
  cost_center_id?: string | null
  total_lines: number
  total_quantity: number
  total_value: number
  reference?: string | null
  notes?: string | null
  notes_ar?: string | null
  created_by?: string | null
  approved_by?: string | null
  posted_by?: string | null
  created_at: string
  updated_at: string
  approved_at?: string | null
  posted_at?: string | null
}

export interface InventoryDocumentLineRow {
  id: string
  org_id: string
  document_id: string
  line_no: number
  material_id: string
  uom_id: string
  quantity: number
  unit_cost?: number | null
  price_source?: 'moving_average' | 'last_purchase' | 'manual' | null
  line_value: number
  project_id?: string | null
  cost_center_id?: string | null
  analysis_work_item_id?: string | null
  work_item_id?: string | null
  location_id?: string | null
  lot_id?: string | null
  serial_id?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export async function createInventoryDocument(payload: Partial<InventoryDocumentRow> & { org_id: string; doc_type: DocType; document_date?: string }): Promise<InventoryDocumentRow> {
  const { data, error } = await supabase
    .from('inventory_documents')
    .insert({ sequence_year: new Date().getFullYear(), ...payload })
    .select('*')
    .single()
  if (error) throw error
  return data as InventoryDocumentRow
}

export async function addInventoryDocumentLine(payload: Omit<InventoryDocumentLineRow, 'id' | 'created_at' | 'updated_at' | 'line_value'>): Promise<InventoryDocumentLineRow> {
  const { data, error } = await supabase
    .from('inventory_document_lines')
    .insert({ ...payload })
    .select('*')
    .single()
  if (error) throw error
  return data as InventoryDocumentLineRow
}

export async function listInventoryMovements(orgId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('*')
    .eq('org_id', orgId)
    .order('movement_date', { ascending: false })
    .limit(200)
  if (error) throw error
  return data || []
}

export async function listInventoryOnHandFiltered(params: { orgId: string; materialId?: string; locationId?: string }): Promise<any[]> {
  const { orgId, materialId, locationId } = params
  let query = supabase
    .from('inventory_on_hand')
    .select('*')
    .eq('org_id', orgId)
    .order('material_code', { ascending: true })
    .limit(1000)
  if (materialId) query = query.eq('material_id', materialId)
  if (locationId) query = query.eq('location_id', locationId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function listInventoryMovementsFiltered(params: { orgId: string; materialId?: string; locationId?: string; movementType?: string; dateFrom?: string; dateTo?: string }): Promise<any[]> {
  const { orgId, materialId, locationId, movementType, dateFrom, dateTo } = params
  let query = supabase
    .from('inventory_movements')
    .select('*')
    .eq('org_id', orgId)
    .order('movement_date', { ascending: false })
    .limit(500)
  if (materialId) query = query.eq('material_id', materialId)
  if (locationId) query = query.eq('location_id', locationId)
  if (movementType) query = query.eq('movement_type', movementType)
  if (dateFrom) query = query.gte('movement_date', dateFrom)
  if (dateTo) query = query.lte('movement_date', dateTo)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function listMovementsByDocument(documentId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('*')
    .eq('document_id', documentId)
    .order('movement_date', { ascending: false })
  if (error) throw error
  return data || []
}


export async function approveInventoryDocument(orgId: string, documentId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_inventory_document', { p_org_id: orgId, p_document_id: documentId, p_user_id: userId })
  if (error) throw error
}

export async function postInventoryDocument(orgId: string, documentId: string, userId: string): Promise<void> {
  // Generic post for any inventory document type
  // Prefer fully-qualified function name; fallback to legacy name
  let error: any | null = null
  try {
    const res = await supabase.rpc('inventory.sp_post_inventory_document', { p_org_id: orgId, p_document_id: documentId, p_user_id: userId })
    error = (res as any)?.error ?? null
  } catch (e: any) {
    error = e
  }
  if (error) {
    const { error: err2 } = await supabase.rpc('post_inventory_document', { p_org_id: orgId, p_document_id: documentId, p_user_id: userId })
    if (err2) throw err2
  }
}

export async function listDocumentLines(documentId: string): Promise<InventoryDocumentLineRow[]> {
  const { data, error } = await supabase
    .from('inventory_document_lines')
    .select('*')
    .eq('document_id', documentId)
    .order('line_no', { ascending: true })
  if (error) throw error
  return (data || []) as InventoryDocumentLineRow[]
}

export async function postAdjustWithType(params: { orgId: string; documentId: string; userId: string; adjustType: 'increase' | 'decrease' }): Promise<void> {
  const { orgId, documentId, userId, adjustType } = params
  // Fetch lines to build JSON for inventory.sp_post_adjust
  const lines = await listDocumentLines(documentId)
  const jsonLines = lines.map(l => ({
    document_line_id: l.id,
    material_id: l.material_id,
    uom_id: l.uom_id,
    quantity: Math.abs(l.quantity), // always positive
    unit_cost: l.unit_cost,
    location_id: l.location_id,
    adjust_type: adjustType,
    notes: l.notes || null,
  }))
  // Execute posting via inventory function
  const { error: postErr } = await supabase.rpc('inventory.sp_post_adjust', {
    p_org_id: orgId,
    p_document_id: documentId,
    p_movement_date: new Date().toISOString(),
    p_created_by: userId,
    p_lines: jsonLines,
  } as any)
  if (postErr) throw postErr
  // Mark header posted
  const { error: updErr } = await supabase
    .from('inventory_documents')
    .update({ status: 'posted', posted_at: new Date().toISOString(), posted_by: userId, updated_at: new Date().toISOString() })
    .eq('id', documentId)
  if (updErr) throw updErr
  // GL post
  const { error: glErr } = await supabase.rpc('inventory.sp_gl_post_inventory_document', { p_org_id: orgId, p_document_id: documentId, p_user_id: userId })
  if (glErr) throw glErr
}

export async function postReturnWithType(params: { orgId: string; documentId: string; userId: string; returnType: 'to_vendor' | 'from_project' }): Promise<void> {
  const { orgId, documentId, userId, returnType } = params
  const lines = await listDocumentLines(documentId)
  const jsonLines = lines.map(l => ({
    document_line_id: l.id,
    material_id: l.material_id,
    uom_id: l.uom_id,
    quantity: Math.abs(l.quantity), // always positive
    unit_cost: l.unit_cost,
    location_id: l.location_id,
    return_type: returnType,
    notes: l.notes || null,
  }))
  const { error: postErr } = await supabase.rpc('inventory.sp_post_return', {
    p_org_id: orgId,
    p_document_id: documentId,
    p_movement_date: new Date().toISOString(),
    p_created_by: userId,
    p_lines: jsonLines,
  } as any)
  if (postErr) throw postErr
  const { error: updErr } = await supabase
    .from('inventory_documents')
    .update({ status: 'posted', posted_at: new Date().toISOString(), posted_by: userId, updated_at: new Date().toISOString() })
    .eq('id', documentId)
  if (updErr) throw updErr
  const { error: glErr } = await supabase.rpc('inventory.sp_gl_post_inventory_document', { p_org_id: orgId, p_document_id: documentId, p_user_id: userId })
  if (glErr) throw glErr
}

export interface InventoryDocumentSummary {
  id: string
  org_id: string
  doc_type: DocType
  status: DocStatus
  document_date: string
  doc_number?: string | null
  posted_at?: string | null
}

export async function listRecentDocuments(params: { orgId: string; q?: string; types?: DocType[]; limit?: number }): Promise<InventoryDocumentSummary[]> {
  const { orgId, q, types, limit = 25 } = params
  let query = supabase
    .from('inventory_documents')
    .select('id, org_id, doc_type, status, document_date, doc_number, posted_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (types && types.length > 0) {
    query = query.in('doc_type', types as any)
  }
  if (q && q.trim()) {
    const like = `%${q.trim()}%`
    // filter by doc_number ILIKE or id text
    query = query.or(`doc_number.ilike.${like},id.eq.${q.trim()}`)
  }
  const { data, error } = await query
  if (error) throw error
  return (data || []) as InventoryDocumentSummary[]
}

export async function getInventoryDocument(documentId: string): Promise<InventoryDocumentRow | null> {
  const { data, error } = await supabase
    .from('inventory_documents')
    .select('*')
    .eq('id', documentId)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as InventoryDocumentRow) || null
}

export interface InventoryPostingLink {
  document_id: string
  transaction_id: string
  document: InventoryDocumentSummary
}

export async function findInventoryDocumentByTransaction(params: { orgId: string; transactionId: string }): Promise<InventoryDocumentSummary | null> {
  const { orgId, transactionId } = params
  const { data, error } = await supabase
    .from('inventory_postings')
    .select('document_id, inventory_documents!inner(id, org_id, doc_type, status, document_date, doc_number, posted_at)')
    .eq('org_id', orgId)
    .eq('transaction_id', transactionId)
    .limit(1)
    .maybeSingle()
  if (error) return null
  if (!data) return null
  const doc = (data as any).inventory_documents
  return doc ? {
    id: doc.id,
    org_id: doc.org_id,
    doc_type: doc.doc_type,
    status: doc.status,
    document_date: doc.document_date,
    doc_number: doc.doc_number,
    posted_at: doc.posted_at,
  } as InventoryDocumentSummary : null
}

export async function listInventoryPostingsByTransaction(params: { orgId: string; transactionId: string }): Promise<InventoryPostingLink[]> {
  const { orgId, transactionId } = params
  const { data, error } = await supabase
    .from('inventory_postings')
    .select('document_id, transaction_id, inventory_documents!inner(id, org_id, doc_type, status, document_date, doc_number, posted_at)')
    .eq('org_id', orgId)
    .eq('transaction_id', transactionId)
  if (error) return []
  const rows = (data as any[]) || []
  return rows.map(r => ({
    document_id: r.document_id,
    transaction_id: r.transaction_id,
    document: {
      id: r.inventory_documents.id,
      org_id: r.inventory_documents.org_id,
      doc_type: r.inventory_documents.doc_type,
      status: r.inventory_documents.status,
      document_date: r.inventory_documents.document_date,
      doc_number: r.inventory_documents.doc_number,
      posted_at: r.inventory_documents.posted_at,
    }
  })) as InventoryPostingLink[]
}

export interface LinkedTxForDocument {
  document_id: string
  transaction_id: string
  entry_number: string | null
  entry_date: string | null
  amount: number | null
  posted_at: string | null
}

export async function listTransactionsLinkedToDocuments(params: { orgId: string; documentIds: string[]; excludeTransactionId?: string }): Promise<LinkedTxForDocument[]> {
  const { orgId, documentIds, excludeTransactionId } = params
  if (!documentIds || documentIds.length === 0) return []
  let query = supabase
    .from('inventory_postings')
    .select('document_id, transaction_id, transactions!inner(id, entry_number, entry_date, amount, posted_at)')
    .eq('org_id', orgId)
    .in('document_id', documentIds)
  if (excludeTransactionId) {
    query = query.neq('transaction_id', excludeTransactionId)
  }
  const { data, error } = await query
  if (error) return []
  const rows = (data as any[]) || []
  // Deduplicate by transaction_id
  const seen = new Set<string>()
  const out: LinkedTxForDocument[] = []
  for (const r of rows) {
    const tx = r.transactions
    const id = tx?.id || r.transaction_id
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({
      document_id: r.document_id,
      transaction_id: id,
      entry_number: tx?.entry_number ?? null,
      entry_date: tx?.entry_date ?? null,
      amount: tx?.amount ?? null,
      posted_at: tx?.posted_at ?? null,
    })
  }
  return out
}

export async function voidInventoryDocument(orgId: string, documentId: string, userId: string, reason = 'void via UI'): Promise<void> {
  // Try specific void RPC first
  let error: any | null = null
  try {
    const res = await supabase.rpc('inventory.sp_void_inventory_document', { p_org_id: orgId, p_document_id: documentId, p_user_id: userId, p_reason: reason } as any)
    error = (res as any)?.error ?? null
  } catch (e: any) {
    error = e
  }
  if (error) {
    // Fallback to legacy function name if exists
    const { error: err2 } = await supabase.rpc('void_inventory_document', { p_org_id: orgId, p_document_id: documentId, p_user_id: userId, p_reason: reason } as any)
    if (err2) throw err2
  }
}
