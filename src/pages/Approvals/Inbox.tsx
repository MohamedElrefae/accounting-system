import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button, CircularProgress, Chip } from '@mui/material'
import EnhancedLineApprovalManager from '../../components/Approvals/EnhancedLineApprovalManager'
import './Approvals.css'

const ApprovalsInbox: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  
  // Modern approval workflow modal state
  const [approvalWorkflowOpen, setApprovalWorkflowOpen] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    try {
      // TODO: Implement getTransactionsWithPendingLines using lineReviewService
      // For now, show empty state
      setTransactions([])
      console.log('✅ Loaded transactions with pending lines: 0')
    } catch (err: any) {
      console.error('Error loading transactions:', err)
      setError(err?.message || 'فشل تحميل صندوق الموافقات')
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  return (
    <div className="approval-container" dir="rtl">
      <div className="approval-header">
        <h1 className="approval-title">صندوق الموافقات</h1>
      </div>

      {/* Modern Approval Inbox - Transaction-Based */}
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            📄 صندوق الموافقات
          </Typography>
          <Button variant="outlined" onClick={reload} disabled={loading}>
            تحديث
          </Button>
        </Box>

        {error && (
          <Box sx={{ p: 2, mb: 2, bgcolor: '#fee', color: '#c00', borderRadius: 1 }}>
            ❌ {error}
          </Box>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && transactions.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" gutterBottom>
              ✅ All caught up!
            </Typography>
            <Typography color="text.secondary">
              No pending approvals at the moment
            </Typography>
          </Box>
        )}

        {!loading && transactions.length > 0 && (
          <Box sx={{ display: 'grid', gap: 2 }}>
            {transactions.map(r => (
              <Box
                key={r.transaction_id}
                sx={{
                  p: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  '&:hover': {
                    boxShadow: 2,
                    borderColor: 'primary.main'
                  }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {r.entry_number}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {r.description || 'No description'}
                    </Typography>
                  </Box>
                  <Chip 
                    label={`${r.pending_lines_count} سطور معلقة`}
                    color="warning"
                    size="small"
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      التاريخ
                    </Typography>
                    <Typography variant="body2">{r.entry_date}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      إجمالي السطور
                    </Typography>
                    <Typography variant="body2">
                      {r.total_lines_count}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      الحالة
                    </Typography>
                    <Typography variant="body2">
                      {r.status === 'pending' ? 'قيد المراجعة' : r.status}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={() => {
                      setSelectedTransactionId(r.transaction_id)
                      setApprovalWorkflowOpen(true)
                    }}
                    sx={{
                      minWidth: '200px',
                      fontWeight: 600
                    }}
                  >
                    مراجعة واعتماد
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      navigate(`/transactions/${r.transaction_id}`)
                    }}
                  >
                    عرض التفاصيل
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Enhanced Line Approval Manager Modal */}
      {approvalWorkflowOpen && selectedTransactionId && (
        <EnhancedLineApprovalManager
          transactionId={selectedTransactionId}
          onClose={() => {
            setApprovalWorkflowOpen(false)
            setSelectedTransactionId(null)
          }}
          onApprovalComplete={() => {
            setApprovalWorkflowOpen(false)
            setSelectedTransactionId(null)
            reload()
          }}
          onApprovalFailed={(error) => {
            console.error('Approval failed:', error)
          }}
        />
      )}
    </div>
  )
}

export default ApprovalsInbox
