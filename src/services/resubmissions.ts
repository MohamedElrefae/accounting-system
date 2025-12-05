/**
 * Resubmissions Service
 * Handles transaction resubmission after revision or rejection
 */

import { supabase } from '../lib/supabase'
import { updateTransaction } from './transactions'

export interface Resubmission {
  id: string
  transaction_id: string
  resubmitted_by: string
  resubmitted_by_name?: string
  resubmitted_at: string
  previous_status: string
  reason?: string
  created_at: string
  updated_at: string
}

/**
 * Resubmit transaction after revision or rejection
 */
export const resubmitTransaction = async (
  transactionId: string,
  reason?: string
): Promise<Resubmission> => {
  // Get current transaction
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .select('approval_status')
    .eq('id', transactionId)
    .single()

  if (txError) throw txError

  // Validate status
  const validStatuses = ['revision_requested', 'rejected']
  if (!validStatuses.includes(transaction.approval_status)) {
    throw new Error('يمكن إعادة الإرسال فقط للمعاملات المرفوضة أو التي تحتاج تعديل')
  }

  // Create resubmission record
  const { data, error } = await supabase
    .from('resubmissions')
    .insert({
      transaction_id: transactionId,
      previous_status: transaction.approval_status,
      reason: reason
    })
    .select()
    .single()

  if (error) throw error

  // Update transaction status to submitted
  await updateTransaction(transactionId, {
    approval_status: 'submitted',
    edit_locked: false
  })

  return data
}

/**
 * Get resubmission history for transaction
 */
export const getTransactionResubmissions = async (
  transactionId: string
): Promise<Resubmission[]> => {
  const { data, error } = await supabase
    .from('resubmissions')
    .select(`
      *,
      resubmitted_by_name:auth.users!resubmitted_by(display_name)
    `)
    .eq('transaction_id', transactionId)
    .order('resubmitted_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get latest resubmission for transaction
 */
export const getLatestResubmission = async (
  transactionId: string
): Promise<Resubmission | null> => {
  const { data, error } = await supabase
    .from('resubmissions')
    .select(`
      *,
      resubmitted_by_name:auth.users!resubmitted_by(display_name)
    `)
    .eq('transaction_id', transactionId)
    .order('resubmitted_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

/**
 * Get resubmission count for transaction
 */
export const getResubmissionCount = async (transactionId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('resubmissions')
    .select('id', { count: 'exact' })
    .eq('transaction_id', transactionId)

  if (error) throw error
  return count || 0
}

/**
 * Check if transaction has been resubmitted
 */
export const hasBeenResubmitted = async (transactionId: string): Promise<boolean> => {
  const count = await getResubmissionCount(transactionId)
  return count > 0
}
