# Enhanced Line Approval Manager - Implementation Examples

## Example 1: Basic Integration in Existing Component

### Before (Old Implementation)
```tsx
import React, { useState } from 'react'
import ApprovalWorkflowManager from '@/components/Approvals/ApprovalWorkflowManager'

export function TransactionApprovalPage() {
  const [transactionId] = useState('tx-123')
  const [approvalRequestId] = useState('ar-456')

  return (
    <ApprovalWorkflowManager
      transactionId={transactionId}
      approvalRequestId={approvalRequestId}
      onApprovalComplete={() => console.log('Done')}
    />
  )
}
```

### After (New Implementation)
```tsx
import React, { useState } from 'react'
import EnhancedLineApprovalManager from '@/components/Approvals/EnhancedLineApprovalManager'

export function TransactionApprovalPage() {
  const [transactionId] = useState('tx-123')
  const [approvalRequestId] = useState('ar-456')

  const handleApprovalComplete = () => {
    console.log('✅ All lines approved successfully')
    // Redirect or refresh data
  }

  const handleApprovalFailed = (error: string) => {
    console.error('❌ Approval failed:', error)
    // Show error toast
  }

  return (
    <EnhancedLineApprovalManager
      transactionId={transactionId}
      approvalRequestId={approvalRequestId}
      onApprovalComplete={handleApprovalComplete}
      onApprovalFailed={handleApprovalFailed}
      onClose={() => console.log('Modal closed')}
    />
  )
}
```

## Example 2: Updating ApprovalWorkflowManager

### Step 1: Update Imports
```tsx
// OLD
import LineReviewsTable from './LineReviewsTable'
import EnhancedLineReviewModal from './EnhancedLineReviewModal'

// NEW
import EnhancedLineReviewsTable from './EnhancedLineReviewsTable'
import EnhancedLineReviewModalV2 from './EnhancedLineReviewModalV2'
```

### Step 2: Update Component Usage in Tabs
```tsx
{/* Lines Tab */}
<TabPanel value={tabValue} index={0}>
  <Box sx={{ px: 3, pb: 3 }}>
    {/* OLD */}
    {/* <LineReviewsTable
      lines={lineReviews}
      loading={reviewsLoading}
      onReviewLine={handleReviewLine}
    /> */}

    {/* NEW */}
    <EnhancedLineReviewsTable
      lines={lineReviews}
      loading={reviewsLoading}
      onReviewLine={handleReviewLine}
    />
  </Box>
</TabPanel>
```

### Step 3: Update Modal Usage
```tsx
{/* OLD */}
{/* {selectedLine && (
  <EnhancedLineReviewModal
    open={reviewModalOpen}
    onClose={() => {
      setReviewModalOpen(false)
      setSelectedLine(null)
    }}
    lineData={selectedLine}
    onAddComment={handleAddComment}
    onRequestEdit={handleRequestEdit}
    onApprove={handleApprove}
    onFlag={handleFlag}
  />
)} */}

{/* NEW */}
{selectedLine && (
  <EnhancedLineReviewModalV2
    open={reviewModalOpen}
    onClose={() => {
      setReviewModalOpen(false)
      setSelectedLine(null)
    }}
    lineData={selectedLine}
    onAddComment={handleAddComment}
    onRequestEdit={handleRequestEdit}
    onApprove={handleApprove}
    onFlag={handleFlag}
  />
)}
```

## Example 3: Preparing Line Data with Approval History

### Database Query Example
```sql
-- Get line reviews with approval history
SELECT 
  tl.id as line_id,
  tl.line_no,
  a.code as account_code,
  a.name as account_name,
  a.name_ar as account_name_ar,
  tl.org_id,
  tl.project_id,
  tl.description,
  tl.debit_amount,
  tl.credit_amount,
  COUNT(lr.id) as review_count,
  MAX(CASE WHEN lr.review_type = 'request_change' THEN true ELSE false END) as has_change_requests,
  MAX(lr.comment) as latest_comment,
  MAX(lr.reviewer_email) as latest_reviewer_email,
  MAX(lr.created_at) as latest_review_at,
  -- NEW: Approval history
  COALESCE(
    json_agg(
      json_build_object(
        'id', lr.id,
        'action', lr.review_type,
        'status', CASE 
          WHEN lr.status = 'approved' THEN 'completed'
          WHEN lr.status = 'pending' THEN 'pending'
          ELSE 'suspended'
        END,
        'user_email', lr.reviewer_email,
        'created_at', lr.created_at,
        'comment', lr.comment
      ) ORDER BY lr.created_at DESC
    ) FILTER (WHERE lr.id IS NOT NULL),
    '[]'::json
  ) as approval_history
FROM transaction_lines tl
LEFT JOIN accounts a ON tl.account_id = a.id
LEFT JOIN line_reviews lr ON tl.id = lr.line_id
WHERE tl.transaction_id = $1
GROUP BY tl.id, a.code, a.name, a.name_ar, tl.org_id, tl.project_id, tl.description
ORDER BY tl.line_no ASC
```

### Service Implementation
```typescript
// src/services/lineReviewService.ts
export async function getLineReviewsForApproval(
  approvalRequestId: string
): Promise<LineReview[]> {
  const { data, error } = await supabase.rpc('get_line_reviews_for_approval', {
    p_approval_request_id: approvalRequestId
  })

  if (error) {
    console.error('Error fetching line reviews:', error)
    throw error
  }

  // Transform data to ensure approval_history is properly formatted
  return (data || []).map((line: any) => ({
    ...line,
    approval_history: Array.isArray(line.approval_history) 
      ? line.approval_history 
      : []
  }))
}
```

## Example 4: Custom Styling

### Using CSS Variables
```tsx
// All components automatically use these CSS variables
const themeVariables = {
  '--modal_bg': '#1e1e1e',
  '--surface': '#2d2d2d',
  '--background': '#1a1a1a',
  '--text': '#ffffff',
  '--heading': '#f0f0f0',
  '--muted_text': '#999999',
  '--accent': '#2076ff',
  '--success': '#21c197',
  '--warning': '#ffc048',
  '--error': '#de3f3f',
  '--border': '#404040',
  '--hover-bg': '#3a3a3a',
  '--table_header_bg': '#252525',
  '--table_row_bg': '#1e1e1e',
  '--field_bg': '#2a2a2a',
  '--chip-bg': '#3a3a3a'
}
```

### Custom Theme Override
```tsx
// In your theme provider
const customTheme = {
  ...defaultTheme,
  '--accent': '#ff6b6b',
  '--success': '#51cf66',
  '--warning': '#ffd43b',
  '--error': '#ff6b6b'
}

// Apply to component
<Box sx={{ '--accent': '#ff6b6b' } as any}>
  <EnhancedLineApprovalManager {...props} />
</Box>
```

## Example 5: Error Handling

### Complete Error Handling Example
```tsx
import React, { useState } from 'react'
import { Alert, Snackbar } from '@mui/material'
import EnhancedLineApprovalManager from '@/components/Approvals/EnhancedLineApprovalManager'

export function ApprovalWithErrorHandling() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleApprovalComplete = () => {
    setSuccess(true)
    // Auto-hide after 3 seconds
    setTimeout(() => setSuccess(false), 3000)
  }

  const handleApprovalFailed = (errorMessage: string) => {
    setError(errorMessage)
    // Auto-hide after 5 seconds
    setTimeout(() => setError(null), 5000)
  }

  return (
    <>
      <EnhancedLineApprovalManager
        transactionId="tx-123"
        approvalRequestId="ar-456"
        onApprovalComplete={handleApprovalComplete}
        onApprovalFailed={handleApprovalFailed}
      />

      {/* Success Notification */}
      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="success">
          ✅ تم اعتماد جميع الأسطر بنجاح
        </Alert>
      </Snackbar>

      {/* Error Notification */}
      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="error">
          ❌ {error}
        </Alert>
      </Snackbar>
    </>
  )
}
```

## Example 6: Integration with Transaction Page

### Full Page Implementation
```tsx
import React, { useState, useEffect } from 'react'
import { Box, Button, CircularProgress } from '@mui/material'
import EnhancedLineApprovalManager from '@/components/Approvals/EnhancedLineApprovalManager'
import { getTransaction } from '@/services/transactions'

interface TransactionDetailsPageProps {
  transactionId: string
}

export function TransactionDetailsPage({ transactionId }: TransactionDetailsPageProps) {
  const [transaction, setTransaction] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showApprovalManager, setShowApprovalManager] = useState(false)

  useEffect(() => {
    loadTransaction()
  }, [transactionId])

  const loadTransaction = async () => {
    try {
      setLoading(true)
      const data = await getTransaction(transactionId)
      setTransaction(data)
    } catch (error) {
      console.error('Failed to load transaction:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <CircularProgress />
  }

  if (!transaction) {
    return <Box>Transaction not found</Box>
  }

  return (
    <Box>
      {/* Transaction Details */}
      <Box sx={{ mb: 3 }}>
        <h2>{transaction.entry_number}</h2>
        <p>{transaction.description}</p>
        <p>Status: {transaction.status}</p>
      </Box>

      {/* Approval Button */}
      {transaction.status === 'pending_approval' && (
        <Button
          variant="contained"
          onClick={() => setShowApprovalManager(true)}
        >
          مراجعة واعتماد الأسطر
        </Button>
      )}

      {/* Approval Manager Modal */}
      {showApprovalManager && (
        <EnhancedLineApprovalManager
          transactionId={transactionId}
          approvalRequestId={transaction.approval_request_id}
          onApprovalComplete={() => {
            setShowApprovalManager(false)
            loadTransaction() // Refresh transaction
          }}
          onApprovalFailed={(error) => {
            console.error('Approval failed:', error)
          }}
          onClose={() => setShowApprovalManager(false)}
        />
      )}
    </Box>
  )
}
```

## Example 7: Testing the Components

### Unit Test Example
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import EnhancedLineReviewsTable from '@/components/Approvals/EnhancedLineReviewsTable'

describe('EnhancedLineReviewsTable', () => {
  const mockLines = [
    {
      line_id: 'line-1',
      line_no: 1,
      account_code: '1010',
      account_name: 'Cash',
      account_name_ar: 'النقد',
      org_id: 'org-123',
      project_id: 'proj-456',
      description: 'Test line',
      debit_amount: 1000,
      credit_amount: 0,
      review_count: 1,
      has_change_requests: false,
      latest_comment: 'Approved',
      latest_reviewer_email: 'user@example.com',
      latest_review_at: '2024-01-15T10:30:00Z',
      approval_history: [
        {
          id: 'review-1',
          action: 'approve',
          status: 'completed',
          user_email: 'user@example.com',
          created_at: '2024-01-15T10:30:00Z',
          comment: 'Approved'
        }
      ]
    }
  ]

  it('should display line number', () => {
    render(<EnhancedLineReviewsTable lines={mockLines} />)
    expect(screen.getByText('#1')).toBeInTheDocument()
  })

  it('should display account code', () => {
    render(<EnhancedLineReviewsTable lines={mockLines} />)
    expect(screen.getByText('1010')).toBeInTheDocument()
  })

  it('should display Arabic account name', () => {
    render(<EnhancedLineReviewsTable lines={mockLines} />)
    expect(screen.getByText('النقد')).toBeInTheDocument()
  })

  it('should expand row on click', () => {
    render(<EnhancedLineReviewsTable lines={mockLines} />)
    const expandButton = screen.getByRole('button', { name: /expand/i })
    fireEvent.click(expandButton)
    expect(screen.getByText('org-123')).toBeInTheDocument()
  })

  it('should display approval history', () => {
    render(<EnhancedLineReviewsTable lines={mockLines} />)
    const expandButton = screen.getByRole('button', { name: /expand/i })
    fireEvent.click(expandButton)
    expect(screen.getByText('اعتماد')).toBeInTheDocument()
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
  })
})
```

## Example 8: Keyboard Shortcuts

### Adding Keyboard Navigation
```tsx
import { useEffect } from 'react'

export function useApprovalKeyboardShortcuts(
  onApprove: () => void,
  onReject: () => void,
  onFlag: () => void
) {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Alt + A: Approve
      if (event.altKey && event.key === 'a') {
        event.preventDefault()
        onApprove()
      }
      // Alt + R: Reject/Request Edit
      if (event.altKey && event.key === 'r') {
        event.preventDefault()
        onReject()
      }
      // Alt + F: Flag
      if (event.altKey && event.key === 'f') {
        event.preventDefault()
        onFlag()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [onApprove, onReject, onFlag])
}

// Usage in component
useApprovalKeyboardShortcuts(
  () => handleApprove(),
  () => handleRequestEdit(''),
  () => handleFlag('')
)
```

## Example 9: Bulk Operations

### Approve Multiple Lines
```tsx
const handleBulkApprove = async (selectedLineIds: string[]) => {
  try {
    setLoading(true)
    
    // Approve each line
    for (const lineId of selectedLineIds) {
      await approveLineReview(approvalRequestId, lineId, 'Bulk approved')
    }
    
    // Refresh data
    await refreshReviews()
    await refreshStatus()
    
    showSuccessMessage(`${selectedLineIds.length} lines approved`)
  } catch (error) {
    showErrorMessage('Failed to approve lines')
  } finally {
    setLoading(false)
  }
}
```

## Example 10: Export Approval History

### Export to CSV
```typescript
export function exportApprovalHistory(lines: LineReview[]) {
  const headers = ['Line #', 'Account', 'Action', 'User', 'Date', 'Comment']
  const rows: string[][] = []

  lines.forEach(line => {
    line.approval_history?.forEach(audit => {
      rows.push([
        `#${line.line_no}`,
        line.account_code,
        audit.action,
        audit.user_email,
        new Date(audit.created_at).toLocaleString('ar-SA'),
        audit.comment
      ])
    })
  })

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `approval-history-${new Date().toISOString()}.csv`
  a.click()
}
```

---

**These examples cover:**
- ✅ Basic integration
- ✅ Component updates
- ✅ Data preparation
- ✅ Error handling
- ✅ Full page implementation
- ✅ Unit testing
- ✅ Keyboard shortcuts
- ✅ Bulk operations
- ✅ Export functionality

Choose the examples that best fit your use case!
