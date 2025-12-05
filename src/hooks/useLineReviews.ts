import { useState, useEffect, useCallback } from 'react'
import {
  getLineReviewsForApproval,
  getLineReviewsForTransaction,
  addLineReviewComment,
  checkLinesReviewStatus,
  type LineReview,
  type LineReviewStatus
} from '../services/lineReviewService'

/**
 * Hook for managing line reviews during approval process
 */
export function useLineReviews(approvalRequestId: string | null | undefined, transactionId?: string | null) {
  const [lineReviews, setLineReviews] = useState<LineReview[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadLineReviews = useCallback(async () => {
    // If we have approvalRequestId, use it
    if (approvalRequestId) {
      try {
        setLoading(true)
        setError(null)
        const data = await getLineReviewsForApproval(approvalRequestId)
        setLineReviews(data)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load line reviews'
        setError(errorMsg)
        console.error('Load line reviews error:', err)
      } finally {
        setLoading(false)
      }
    }
    // Otherwise, if we have transactionId, fetch lines directly
    else if (transactionId) {
      try {
        setLoading(true)
        setError(null)
        const data = await getLineReviewsForTransaction(transactionId)
        setLineReviews(data)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load transaction lines'
        setError(errorMsg)
        console.error('Load transaction lines error:', err)
      } finally {
        setLoading(false)
      }
    }
    // If neither, clear the list
    else {
      setLineReviews([])
    }
  }, [approvalRequestId, transactionId])

  useEffect(() => {
    loadLineReviews()
  }, [loadLineReviews])

  const addComment = useCallback(
    async (
      lineId: string,
      comment: string,
      reviewType: 'comment' | 'flag' | 'approve' | 'request_change' = 'comment'
    ) => {
      // We allow comments without approvalRequestId (direct transaction review)
      // if (!approvalRequestId) throw new Error('No approval request ID')

      try {
        await addLineReviewComment(approvalRequestId || null, lineId, comment, reviewType)
        await loadLineReviews() // Refresh
      } catch (err) {
        throw err
      }
    },
    [approvalRequestId, loadLineReviews]
  )

  return {
    lineReviews,
    loading,
    error,
    refresh: loadLineReviews,
    addComment
  }
}

/**
 * Hook for monitoring line review status
 */
export function useLineReviewStatus(transactionId: string | null) {
  const [status, setStatus] = useState<LineReviewStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    if (!transactionId) return

    try {
      setLoading(true)
      setError(null)
      const data = await checkLinesReviewStatus(transactionId)
      setStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status')
      console.error('Load review status error:', err)
    } finally {
      setLoading(false)
    }
  }, [transactionId])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  return {
    status,
    loading,
    error,
    refresh: loadStatus
  }
}
