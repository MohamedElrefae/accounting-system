/**
 * Edit Requests Service
 * Handles edit request workflows for submitted/approved transactions
 */

import { supabase } from '../lib/supabase'

export interface EditRequest {
  id: string
  transaction_id: string
  requested_by: string
  requested_by_name?: string
  requested_at: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by?: string
  reviewed_by_name?: string
  reviewed_at?: string
  review_note?: string
  created_at: string
  updated_at: string
}

/**
 * Request edit for a submitted/approved transaction
 */
export const requestEdit = async (
  transactionId: string,
  reason: string
): Promise<EditRequest> => {
  const { data, error } = await supabase
    .from('edit_requests')
    .insert({
      transaction_id: transactionId,
      reason: reason,
      status: 'pending'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get edit request by ID
 */
export const getEditRequest = async (requestId: string): Promise<EditRequest> => {
  const { data, error } = await supabase
    .from('edit_requests')
    .select(`
      *,
      requested_by_name:auth.users!requested_by(display_name),
      reviewed_by_name:auth.users!reviewed_by(display_name)
    `)
    .eq('id', requestId)
    .single()

  if (error) throw error
  return data
}

/**
 * Get all edit requests for a transaction
 */
export const getTransactionEditRequests = async (
  transactionId: string
): Promise<EditRequest[]> => {
  const { data, error } = await supabase
    .from('edit_requests')
    .select(`
      *,
      requested_by_name:auth.users!requested_by(display_name),
      reviewed_by_name:auth.users!reviewed_by(display_name)
    `)
    .eq('transaction_id', transactionId)
    .order('requested_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get pending edit requests for current user (as approver)
 */
export const getPendingEditRequests = async (): Promise<EditRequest[]> => {
  const { data, error } = await supabase
    .from('edit_requests')
    .select(`
      *,
      requested_by_name:auth.users!requested_by(display_name),
      transaction:transactions(id, entry_number, description)
    `)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Approve edit request
 */
export const approveEditRequest = async (
  requestId: string,
  reviewNote?: string
): Promise<EditRequest> => {
  const { data, error } = await supabase
    .from('edit_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote
    })
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error

  // Update transaction to allow editing
  const request = await getEditRequest(requestId)
  await supabase
    .from('transactions')
    .update({
      approval_status: 'revision_requested',
      edit_locked: false
    })
    .eq('id', request.transaction_id)

  return data
}

/**
 * Reject edit request
 */
export const rejectEditRequest = async (
  requestId: string,
  reviewNote?: string
): Promise<EditRequest> => {
  const { data, error } = await supabase
    .from('edit_requests')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote
    })
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Check if transaction has pending edit request
 */
export const hasPendingEditRequest = async (transactionId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('edit_requests')
    .select('id')
    .eq('transaction_id', transactionId)
    .eq('status', 'pending')
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return !!data
}

/**
 * Get latest edit request for transaction
 */
export const getLatestEditRequest = async (
  transactionId: string
): Promise<EditRequest | null> => {
  const { data, error } = await supabase
    .from('edit_requests')
    .select(`
      *,
      requested_by_name:auth.users!requested_by(display_name),
      reviewed_by_name:auth.users!reviewed_by(display_name)
    `)
    .eq('transaction_id', transactionId)
    .order('requested_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

/**
 * Cancel edit request (only if pending)
 */
export const cancelEditRequest = async (requestId: string): Promise<void> => {
  const request = await getEditRequest(requestId)

  if (request.status !== 'pending') {
    throw new Error('يمكن إلغاء طلبات التعديل المعلقة فقط')
  }

  const { error } = await supabase
    .from('edit_requests')
    .delete()
    .eq('id', requestId)

  if (error) throw error
}
