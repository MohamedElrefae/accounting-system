import { supabase } from '../utils/supabase'
import { getCurrentUserId } from './transactions'

export interface LineReview {
  line_id: string
  line_no: number
  account_code: string
  account_name: string
  account_name_ar?: string
  org_id?: string
  project_id?: string
  line_status?: string
  description?: string
  debit_amount: number
  credit_amount: number
  review_count: number
  has_change_requests: boolean
  latest_comment: string | null
  latest_reviewer_email: string | null
  latest_review_at: string | null
  approval_history?: Array<{
    id: string
    action: string
    status: string
    user_email: string
    created_at: string
    comment: string
  }>
}

export interface LineReviewStatus {
  all_lines_reviewed: boolean
  total_lines: number
  lines_needing_review: number
  lines_with_comments: number
  lines_with_change_requests: number
}

/**
 * Flag specific lines for review during approval process
 */
export async function flagLinesForReview(
  transactionId: string,
  lineIds: string[]
): Promise<{ success: boolean; lines_flagged: number; message: string }> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { data, error } = await supabase.rpc('flag_lines_for_review', {
    p_transaction_id: transactionId,
    p_line_ids: lineIds,
    p_flagged_by: userId
  })

  if (error) throw error
  return data[0]
}

/**
 * Add a review comment to a specific line during approval
 */
export async function addLineReviewComment(
  approvalRequestId: string | null,
  lineId: string,
  comment: string,
  reviewType: 'comment' | 'flag' | 'approve' | 'request_change' = 'comment'
): Promise<{ success: boolean; review_id: string; message: string }> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { data, error } = await supabase.rpc('add_line_review_comment', {
    p_approval_request_id: approvalRequestId,
    p_line_id: lineId,
    p_reviewer_user_id: userId,
    p_comment: comment,
    p_review_type: reviewType
  })

  if (error) throw error
  return data[0]
}

/**
 * Get all line reviews for an approval request
 */
export async function getLineReviewsForApproval(
  approvalRequestId: string
): Promise<LineReview[]> {
  const { data, error } = await supabase.rpc('get_line_reviews_for_approval', {
    p_approval_request_id: approvalRequestId
  })

  if (error) throw error
  return data || []
}

/**
 * Get all lines for a transaction (for review when no approval request exists yet)
 */
export async function getLineReviewsForTransaction(
  transactionId: string
): Promise<LineReview[]> {
  try {
    // First, fetch transaction lines with accounts
    const { data: lines, error: linesError } = await supabase
      .from('transaction_lines')
      .select(`
        id,
        line_no,
        debit_amount,
        credit_amount,
        account_id,
        description,
        org_id,
        project_id,
        line_status,
        accounts(code, name, name_ar)
      `)
      .eq('transaction_id', transactionId)
      .order('line_no', { ascending: true })

    if (linesError) throw linesError

    if (!lines || lines.length === 0) {
      return []
    }

    const lineIds = lines.map((l: any) => l.id)

    // Then, fetch reviews separately
    const { data: reviews, error: reviewsError } = await supabase
      .from('transaction_line_reviews')
      .select(`
        id,
        line_id,
        review_type,
        comment,
        created_at,
        reviewer_user_id
      `)
      .in('line_id', lineIds)
      .order('created_at', { ascending: true })

    if (reviewsError) throw reviewsError

    // Fetch user emails for reviewers
    const reviewerIds = [...new Set((reviews || []).map((r: any) => r.reviewer_user_id))]
    let userEmails: Record<string, string> = {}

    if (reviewerIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('auth.users')
        .select('id, email')
        .in('id', reviewerIds)

      if (!usersError && users) {
        userEmails = Object.fromEntries(users.map((u: any) => [u.id, u.email]))
      }
    }

    // Transform to LineReview format with approval history
    return (lines || []).map((line: any) => {
      const lineReviews = (reviews || []).filter((r: any) => r.line_id === line.id)
      const hasChangeRequests = lineReviews.some((r: any) => r.review_type === 'request_change')
      const latestReview = lineReviews.length > 0 ? lineReviews[lineReviews.length - 1] : null

      return {
        line_id: line.id,
        line_no: line.line_no,
        account_code: line.accounts?.code || '',
        account_name: line.accounts?.name || '',
        account_name_ar: line.accounts?.name_ar,
        org_id: line.org_id,
        project_id: line.project_id,
        line_status: line.line_status,
        description: line.description,
        debit_amount: line.debit_amount,
        credit_amount: line.credit_amount,
        review_count: lineReviews.length,
        has_change_requests: hasChangeRequests,
        latest_comment: latestReview?.comment || null,
        latest_reviewer_email: latestReview ? userEmails[latestReview.reviewer_user_id] || 'Unknown' : null,
        latest_review_at: latestReview?.created_at || null,
        approval_history: lineReviews.map((r: any) => ({
          id: r.id,
          action: r.review_type,
          status: r.review_type === 'approve' ? 'completed' : r.review_type === 'request_change' ? 'pending' : 'completed',
          user_email: userEmails[r.reviewer_user_id] || 'Unknown',
          created_at: r.created_at,
          comment: r.comment
        }))
      }
    })
  } catch (err) {
    console.error('Error in getLineReviewsForTransaction:', err)
    throw err
  }
}

/**
 * Check overall line review status for a transaction
 */
export async function checkLinesReviewStatus(
  transactionId: string
): Promise<LineReviewStatus> {
  const { data, error } = await supabase.rpc('check_lines_review_status', {
    p_transaction_id: transactionId
  })

  if (error) throw error
  return data[0]
}

/**
 * Request edit on a line (shorthand for adding change request)
 */
export async function requestLineEdit(
  approvalRequestId: string,
  lineId: string,
  reason: string
): Promise<{ success: boolean; review_id: string; message: string }> {
  return addLineReviewComment(
    approvalRequestId,
    lineId,
    reason,
    'request_change'
  )
}

/**
 * Approve a line during review (shorthand)
 */
export async function approveLineReview(
  approvalRequestId: string,
  lineId: string,
  notes?: string
): Promise<{ success: boolean; review_id: string; message: string }> {
  return addLineReviewComment(
    approvalRequestId,
    lineId,
    notes || 'Approved',
    'approve'
  )
}

/**
 * Flag a line for attention (shorthand)
 */
export async function flagLineForAttention(
  approvalRequestId: string,
  lineId: string,
  reason: string
): Promise<{ success: boolean; review_id: string; message: string }> {
  return addLineReviewComment(
    approvalRequestId,
    lineId,
    reason,
    'flag'
  )
}
