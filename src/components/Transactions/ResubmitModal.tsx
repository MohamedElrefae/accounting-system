/**
 * Resubmit Modal
 * Allows users to resubmit transactions after revision or rejection
 */

import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material'
import { resubmitTransaction } from '../../services/resubmissions'

interface ResubmitModalProps {
  open: boolean
  transactionId: string
  transactionNumber?: string
  previousStatus: string
  rejectionReason?: string
  onClose: () => void
  onSuccess: () => void
  onError?: (error: string) => void
}

export const ResubmitModal: React.FC<ResubmitModalProps> = ({
  open,
  transactionId,
  transactionNumber,
  previousStatus,
  rejectionReason,
  onClose,
  onSuccess,
  onError
}) => {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      'revision_requested': 'تعديل مطلوب',
      'rejected': 'مرفوضة'
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string): 'warning' | 'error' => {
    return status === 'revision_requested' ? 'warning' : 'error'
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      await resubmitTransaction(transactionId, reason || undefined)
      onSuccess()
      handleClose()
    } catch (err: any) {
      const errorMsg = err?.message || 'فشل إعادة الإرسال'
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setReason('')
    setError(null)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      dir="rtl"
      PaperProps={{
        sx: {
          background: '#0f172a',
          color: '#e2e8f0',
          borderRadius: 2,
          border: '1px solid #334155'
        }
      }}
    >
      <DialogTitle
        sx={{
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          fontSize: '18px',
          fontWeight: 600,
          color: '#3b82f6'
        }}
      >
        🔄 إعادة إرسال المعاملة
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
            معرف المعاملة: <strong>{transactionNumber || transactionId}</strong>
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              الحالة الحالية:
            </Typography>
            <Chip
              label={getStatusLabel(previousStatus)}
              color={getStatusColor(previousStatus)}
              size="small"
              sx={{ height: 24 }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            تم تعديل المعاملة بناءً على الملاحظات. يرجى إعادة إرسالها للموافقة
          </Typography>
        </Box>

        {rejectionReason && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              ملاحظات المراجع:
            </Typography>
            <Typography variant="body2">{rejectionReason}</Typography>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          multiline
          rows={3}
          label="ملاحظات إعادة الإرسال (اختياري)"
          placeholder="أضف أي ملاحظات حول التعديلات التي تم إجراؤها..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#e2e8f0',
              '& fieldset': {
                borderColor: '#334155'
              },
              '&:hover fieldset': {
                borderColor: '#475569'
              },
              '&.Mui-focused fieldset': {
                borderColor: '#3b82f6'
              }
            },
            '& .MuiOutlinedInput-input::placeholder': {
              color: '#64748b',
              opacity: 1
            },
            '& .MuiInputBase-input': {
              color: '#e2e8f0'
            }
          }}
        />
      </DialogContent>

      <DialogActions
        sx={{
          background: '#1e293b',
          borderTop: '1px solid #334155',
          padding: '16px',
          gap: 1
        }}
      >
        <Button
          onClick={handleClose}
          disabled={loading}
          sx={{
            color: '#94a3b8',
            '&:hover': {
              background: '#334155'
            }
          }}
        >
          إلغاء
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          variant="contained"
          sx={{
            background: '#10b981',
            '&:hover': {
              background: '#059669'
            },
            '&:disabled': {
              background: '#475569',
              color: '#94a3b8'
            }
          }}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              جاري الإرسال...
            </>
          ) : (
            'إعادة الإرسال'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ResubmitModal
