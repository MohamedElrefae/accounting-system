# Approval Logic - Implementation Examples

## 📋 Complete Examples

### Example 1: Basic Approval Page Integration

```typescript
// src/pages/Approvals/ApprovalDetail.tsx
import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Container, CircularProgress, Alert } from '@mui/material'
import ApprovalWorkflowManager from '@/components/Approvals/ApprovalWorkflowManager'

export function ApprovalDetail() {
  const { transactionId, approvalRequestId } = useParams()
  const navigate = useNavigate()
  const [error, setError] = React.useState<string | null>(null)

  if (!transactionId || !approvalRequestId) {
    return <Alert severity="error">Missing required parameters</Alert>
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <ApprovalWorkflowManager
        transactionId={transactionId}
        approvalRequestId={approvalRequestId}
        onApprovalComplete={() => {
          // Show success message
          navigate('/approvals', { state: { success: true } })
        }}
        onApprovalFailed={(error) => {
          setError(error)
        }}
      />
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Container>
  )
}
```

---

### Example 2: Custom Approval Workflow

```typescript
// src/pages/Approvals/CustomApprovalPage.tsx
import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Button,
  Typography,
  Alert,
  Divider
} from '@mui/material'
import { CheckCircle, Send } from '@mui/icons-material'
import LineReviewStatus from '@/components/Approvals/LineReviewStatus'
import LineReviewsTable from '@/components/Approvals/LineReviewsTable'
import EnhancedLineReviewModal from '@/components/Approvals/EnhancedLineReviewModal'
import { useLineReviews, useLineReviewStatus } from '@/hooks/useLineReviews'
import {
  addLineReviewComment,
  requestLineEdit,
  approveLineReview,
  flagLineForAttention
} from '@/services/lineReviewService'

interface CustomApprovalPageProps {
  transactionId: string
  approvalRequestId: string
}

export function CustomApprovalPage({
  transactionId,
  approvalRequestId
}: CustomApprovalPageProps) {
  const [selectedLine, setSelectedLine] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { lineReviews, loading: reviewsLoading, refresh: refreshReviews } =
    useLineReviews(approvalRequestId)
  const { status, loading: statusLoading, refresh: refreshStatus } =
    useLineReviewStatus(transactionId)

  const handleReviewLine = (line: any) => {
    setSelectedLine(line)
    setModalOpen(true)
  }

  const handleAddComment = async (comment: string) => {
    if (!selectedLine) return
    try {
      await addLineReviewComment(
        approvalRequestId,
        selectedLine.line_id,
        comment,
        'comment'
      )
      await refreshReviews()
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  const handleRequestEdit = async (reason: string) => {
    if (!selectedLine) return
    try {
      await requestLineEdit(approvalRequestId, selectedLine.line_id, reason)
      await refreshReviews()
      await refreshStatus()
    } catch (error) {
      console.error('Failed to request edit:', error)
    }
  }

  const handleApprove = async (notes?: string) => {
    if (!selectedLine) return
    try {
      await approveLineReview(approvalRequestId, selectedLine.line_id, notes)
      await refreshReviews()
      await refreshStatus()
    } catch (error) {
      console.error('Failed to approve:', error)
    }
  }

  const handleFlag = async (reason: string) => {
    if (!selectedLine) return
    try {
      await flagLineForAttention(approvalRequestId, selectedLine.line_id, reason)
      await refreshReviews()
    } catch (error) {
      console.error('Failed to flag:', error)
    }
  }

  const handleFinalApproval = async () => {
    try {
      setSubmitting(true)
      // Call your approval submission function
      // await submitApproval(approvalRequestId)
      console.log('Approval submitted')
    } catch (error) {
      console.error('Failed to submit approval:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const canFinalApprove =
    status &&
    status.all_lines_reviewed &&
    status.lines_with_change_requests === 0

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      {/* Status Alert */}
      {status && status.lines_with_change_requests > 0 && (
        <Alert severity="warning">
          <strong>{status.lines_with_change_requests} أسطر</strong> تحتاج إلى
          تعديلات
        </Alert>
      )}

      {/* Review Status */}
      {status && (
        <LineReviewStatus
          allLinesReviewed={status.all_lines_reviewed}
          totalLines={status.total_lines}
          linesNeedingReview={status.lines_needing_review}
          linesWithComments={status.lines_with_comments}
          linesWithChangeRequests={status.lines_with_change_requests}
          loading={statusLoading}
        />
      )}

      {/* Lines Table */}
      <Card>
        <CardHeader title="الأسطر للمراجعة" />
        <CardContent>
          <LineReviewsTable
            lines={lineReviews}
            loading={reviewsLoading}
            onReviewLine={handleReviewLine}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant="outlined">إلغاء</Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<CheckCircle />}
          disabled={!canFinalApprove || submitting}
          onClick={handleFinalApproval}
        >
          اعتماد نهائي
        </Button>
      </Box>

      {/* Review Modal */}
      {selectedLine && (
        <EnhancedLineReviewModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setSelectedLine(null)
          }}
          lineData={selectedLine}
          onAddComment={handleAddComment}
          onRequestEdit={handleRequestEdit}
          onApprove={handleApprove}
          onFlag={handleFlag}
        />
      )}
    </Box>
  )
}
```

---

### Example 3: Batch Review Operations

```typescript
// src/utils/batchApprovalUtils.ts
import {
  approveLineReview,
  requestLineEdit,
  flagLineForAttention,
  getLineReviewsForApproval
} from '@/services/lineReviewService'

/**
 * Approve all lines in a batch
 */
export async function approveAllLines(
  approvalRequestId: string,
  notes?: string
) {
  const reviews = await getLineReviewsForApproval(approvalRequestId)

  const results = await Promise.all(
    reviews.map((line) => approveLineReview(approvalRequestId, line.line_id, notes))
  )

  return {
    total: reviews.length,
    approved: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length
  }
}

/**
 * Request edits on specific lines
 */
export async function requestEditsOnLines(
  approvalRequestId: string,
  lineIds: string[],
  reason: string
) {
  const results = await Promise.all(
    lineIds.map((lineId) => requestLineEdit(approvalRequestId, lineId, reason))
  )

  return {
    total: lineIds.length,
    requested: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length
  }
}

/**
 * Flag lines for manager review
 */
export async function flagLinesForManagerReview(
  approvalRequestId: string,
  lineIds: string[]
) {
  const results = await Promise.all(
    lineIds.map((lineId) =>
      flagLineForAttention(
        approvalRequestId,
        lineId,
        'Requires manager review'
      )
    )
  )

  return {
    total: lineIds.length,
    flagged: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length
  }
}

/**
 * Get lines needing review
 */
export async function getLinesPendingReview(approvalRequestId: string) {
  const reviews = await getLineReviewsForApproval(approvalRequestId)
  return reviews.filter((line) => line.review_count === 0)
}

/**
 * Get lines with change requests
 */
export async function getLinesWithChangeRequests(approvalRequestId: string) {
  const reviews = await getLineReviewsForApproval(approvalRequestId)
  return reviews.filter((line) => line.has_change_requests)
}
```

---

### Example 4: Advanced Approval Hook

```typescript
// src/hooks/useAdvancedApproval.ts
import { useState, useCallback } from 'react'
import { useLineReviews, useLineReviewStatus } from './useLineReviews'
import {
  addLineReviewComment,
  requestLineEdit,
  approveLineReview,
  flagLineForAttention
} from '@/services/lineReviewService'

interface UseAdvancedApprovalOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useAdvancedApproval(
  transactionId: string,
  approvalRequestId: string,
  options: UseAdvancedApprovalOptions = {}
) {
  const { autoRefresh = false, refreshInterval = 5000 } = options

  const { lineReviews, loading: reviewsLoading, refresh: refreshReviews } =
    useLineReviews(approvalRequestId)
  const { status, loading: statusLoading, refresh: refreshStatus } =
    useLineReviewStatus(transactionId)

  const [actionInProgress, setActionInProgress] = useState(false)

  // Auto-refresh
  React.useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshReviews()
      refreshStatus()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refreshReviews, refreshStatus])

  // Approve line
  const approve = useCallback(
    async (lineId: string, notes?: string) => {
      try {
        setActionInProgress(true)
        await approveLineReview(approvalRequestId, lineId, notes)
        await refreshReviews()
        await refreshStatus()
      } finally {
        setActionInProgress(false)
      }
    },
    [approvalRequestId, refreshReviews, refreshStatus]
  )

  // Request edit
  const requestEdit = useCallback(
    async (lineId: string, reason: string) => {
      try {
        setActionInProgress(true)
        await requestLineEdit(approvalRequestId, lineId, reason)
        await refreshReviews()
        await refreshStatus()
      } finally {
        setActionInProgress(false)
      }
    },
    [approvalRequestId, refreshReviews, refreshStatus]
  )

  // Flag line
  const flag = useCallback(
    async (lineId: string, reason: string) => {
      try {
        setActionInProgress(true)
        await flagLineForAttention(approvalRequestId, lineId, reason)
        await refreshReviews()
      } finally {
        setActionInProgress(false)
      }
    },
    [approvalRequestId, refreshReviews]
  )

  // Add comment
  const comment = useCallback(
    async (lineId: string, text: string) => {
      try {
        setActionInProgress(true)
        await addLineReviewComment(approvalRequestId, lineId, text, 'comment')
        await refreshReviews()
      } finally {
        setActionInProgress(false)
      }
    },
    [approvalRequestId, refreshReviews]
  )

  // Get pending lines
  const getPendingLines = useCallback(() => {
    return lineReviews.filter((line) => line.review_count === 0)
  }, [lineReviews])

  // Get lines with change requests
  const getChangeRequestLines = useCallback(() => {
    return lineReviews.filter((line) => line.has_change_requests)
  }, [lineReviews])

  // Check if can approve
  const canApprove = useCallback(() => {
    return (
      status &&
      status.all_lines_reviewed &&
      status.lines_with_change_requests === 0
    )
  }, [status])

  return {
    // Data
    lineReviews,
    status,

    // Loading states
    loading: reviewsLoading || statusLoading,
    actionInProgress,

    // Actions
    approve,
    requestEdit,
    flag,
    comment,

    // Helpers
    getPendingLines,
    getChangeRequestLines,
    canApprove,

    // Refresh
    refresh: () => {
      refreshReviews()
      refreshStatus()
    }
  }
}
```

---

### Example 5: Approval Status Component

```typescript
// src/components/Approvals/ApprovalStatusWidget.tsx
import React from 'react'
import { Box, Card, CardContent, Typography, LinearProgress, Chip } from '@mui/material'
import { CheckCircle, Clock, AlertCircle } from '@mui/icons-material'
import { useLineReviewStatus } from '@/hooks/useLineReviews'

interface ApprovalStatusWidgetProps {
  transactionId: string
  compact?: boolean
}

export function ApprovalStatusWidget({
  transactionId,
  compact = false
}: ApprovalStatusWidgetProps) {
  const { status, loading } = useLineReviewStatus(transactionId)

  if (loading || !status) {
    return <Typography variant="body2">جاري التحميل...</Typography>
  }

  const progress = (
    ((status.total_lines - status.lines_needing_review) / status.total_lines) *
    100
  ).toFixed(0)

  if (compact) {
    return (
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {status.all_lines_reviewed ? (
          <Chip
            icon={<CheckCircle />}
            label="مكتمل"
            color="success"
            size="small"
          />
        ) : (
          <Chip
            icon={<Clock />}
            label={`${status.lines_needing_review} بانتظار`}
            color="warning"
            size="small"
          />
        )}
        <Typography variant="caption">{progress}%</Typography>
      </Box>
    )
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">حالة المراجعة</Typography>
          {status.all_lines_reviewed ? (
            <Chip
              icon={<CheckCircle />}
              label="مكتمل"
              color="success"
              size="small"
            />
          ) : status.lines_with_change_requests > 0 ? (
            <Chip
              icon={<AlertCircle />}
              label="يحتاج تعديلات"
              color="error"
              size="small"
            />
          ) : (
            <Chip
              icon={<Clock />}
              label="قيد المراجعة"
              color="warning"
              size="small"
            />
          )}
        </Box>

        <LinearProgress
          variant="determinate"
          value={parseFloat(progress)}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <Box>
            <Typography variant="caption" color="textSecondary">
              إجمالي
            </Typography>
            <Typography variant="h6">{status.total_lines}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary">
              مراجع
            </Typography>
            <Typography variant="h6" sx={{ color: '#10b981' }}>
              {status.total_lines - status.lines_needing_review}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary">
              بانتظار
            </Typography>
            <Typography variant="h6" sx={{ color: '#f59e0b' }}>
              {status.lines_needing_review}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary">
              تعديلات
            </Typography>
            <Typography variant="h6" sx={{ color: '#ef4444' }}>
              {status.lines_with_change_requests}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}
```

---

### Example 6: Approval Notification Hook

```typescript
// src/hooks/useApprovalNotifications.ts
import { useEffect } from 'react'
import { useLineReviewStatus } from './useLineReviews'

interface NotificationOptions {
  onAllReviewed?: () => void
  onChangeRequested?: () => void
  onPendingReview?: () => void
}

export function useApprovalNotifications(
  transactionId: string,
  options: NotificationOptions = {}
) {
  const { status } = useLineReviewStatus(transactionId)

  useEffect(() => {
    if (!status) return

    if (status.all_lines_reviewed && status.lines_with_change_requests === 0) {
      options.onAllReviewed?.()
    } else if (status.lines_with_change_requests > 0) {
      options.onChangeRequested?.()
    } else if (status.lines_needing_review > 0) {
      options.onPendingReview?.()
    }
  }, [status, options])

  return status
}
```

---

## 🎯 Usage Patterns

### Pattern: Progressive Approval

```typescript
// Approve lines one by one as you review them
const { approve, getPendingLines } = useAdvancedApproval(
  transactionId,
  approvalRequestId
)

const pending = getPendingLines()
for (const line of pending) {
  // Review line
  // If OK, approve
  await approve(line.line_id, 'Reviewed and approved')
}
```

### Pattern: Conditional Approval

```typescript
// Only allow final approval if all conditions met
const { canApprove, status } = useAdvancedApproval(
  transactionId,
  approvalRequestId
)

if (canApprove()) {
  // Show final approval button
} else if (status?.lines_with_change_requests > 0) {
  // Show "Pending changes" message
} else {
  // Show "Pending review" message
}
```

### Pattern: Batch Operations

```typescript
// Approve all lines at once
const { approve, lineReviews } = useAdvancedApproval(
  transactionId,
  approvalRequestId
)

await Promise.all(
  lineReviews.map((line) => approve(line.line_id, 'Batch approved'))
)
```

---

## ✅ Testing Examples

```typescript
// src/__tests__/approval.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ApprovalWorkflowManager from '@/components/Approvals/ApprovalWorkflowManager'

describe('ApprovalWorkflowManager', () => {
  it('should load line reviews', async () => {
    render(
      <ApprovalWorkflowManager
        transactionId="tx-123"
        approvalRequestId="ar-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/الأسطر/)).toBeInTheDocument()
    })
  })

  it('should show review status', async () => {
    render(
      <ApprovalWorkflowManager
        transactionId="tx-123"
        approvalRequestId="ar-123"
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/حالة مراجعة الأسطر/)).toBeInTheDocument()
    })
  })

  it('should open review modal on line click', async () => {
    render(
      <ApprovalWorkflowManager
        transactionId="tx-123"
        approvalRequestId="ar-123"
      />
    )

    const reviewButton = await screen.findByRole('button', { name: /مراجعة/ })
    fireEvent.click(reviewButton)

    await waitFor(() => {
      expect(screen.getByText(/مراجعة السطر/)).toBeInTheDocument()
    })
  })
})
```

