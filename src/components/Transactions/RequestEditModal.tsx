/**
 * Request Edit Modal
 * Allows users to request edits for submitted/approved transactions
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
  CircularProgress
} from '@mui/material'
import { requestEdit } from '../../services/editRequests'

interface RequestEditModalProps {
  open: boolean
  transactionId: string
  transactionNumber?: string
  onClose: () => void
  onSuccess: () => void
  onError?: (error: string) => void
}

export const RequestEditModal: React.FC<RequestEditModalProps> = ({
  open,
  transactionId,
  transactionNumber,
  onClose,
  onSuccess,
  onError
}) => {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('يرجى إدخال سبب طلب التعديل')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await requestEdit(transactionId, reason)
      onSuccess()
      handleClose()
    } catch (err: any) {
      const errorMsg = err?.message || 'فشل طلب التعديل'
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
        📝 طلب تعديل المعاملة
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
            معرف المعاملة: <strong>{transactionNumber || transactionId}</strong>
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            سيتم إرسال طلب التعديل إلى المسؤول للمراجعة والموافقة
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          multiline
          rows={4}
          label="سبب طلب التعديل"
          placeholder="اشرح السبب وراء طلب تعديل هذه المعاملة..."
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
          disabled={loading || !reason.trim()}
          variant="contained"
          sx={{
            background: '#3b82f6',
            '&:hover': {
              background: '#2563eb'
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
            'إرسال الطلب'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RequestEditModal
