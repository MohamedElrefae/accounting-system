import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Paper,
  Grid,
  IconButton
} from '@mui/material'
import { CheckCircle, Edit, Close } from '@mui/icons-material'
import { FlagIcon, MessageIcon } from '../icons/SimpleIcons'

interface LineReviewData {
  line_id: string
  line_no: number
  account_code: string
  account_name: string
  debit_amount: number
  credit_amount: number
  review_count: number
  has_change_requests: boolean
  latest_comment: string | null
  latest_reviewer_email: string | null
  latest_review_at: string | null
}

interface EnhancedLineReviewModalProps {
  open: boolean
  onClose: () => void
  lineData: LineReviewData | null
  onAddComment: (comment: string, reviewType: string) => Promise<void>
  onRequestEdit: (reason: string) => Promise<void>
  onApprove: (notes?: string) => Promise<void>
  onFlag: (reason: string) => Promise<void>
}

const EnhancedLineReviewModal: React.FC<EnhancedLineReviewModalProps> = ({
  open,
  onClose,
  lineData,
  onAddComment,
  onRequestEdit,
  onApprove,
  onFlag
}) => {
  const [action, setAction] = useState<'comment' | 'approve' | 'edit' | 'flag'>('comment')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!lineData) return null

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError(null)

      if (action === 'comment') {
        await onAddComment(comment, 'comment')
      } else if (action === 'approve') {
        await onApprove(comment || undefined)
      } else if (action === 'edit') {
        if (!comment.trim()) {
          setError('يجب تحديد سبب طلب التعديل')
          return
        }
        await onRequestEdit(comment)
      } else if (action === 'flag') {
        if (!comment.trim()) {
          setError('يجب تحديد سبب التنبيه')
          return
        }
        await onFlag(comment)
      }

      setComment('')
      setAction('comment')
      onClose()
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  const isReasonRequired = action !== 'comment' && action !== 'approve'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      dir="rtl"
      PaperProps={{
        sx: {
          background: 'var(--modal_bg)',
          color: 'var(--text)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
        }
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          fontSize: '1.25rem',
          color: 'var(--heading)',
          borderBottom: '2px solid var(--border)',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>مراجعة السطر #{lineData.line_no}</span>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: 'var(--muted_text)',
            '&:hover': {
              background: 'var(--hover-bg)',
              color: 'var(--text)'
            }
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ padding: '24px', background: 'var(--background)' }}>
        {/* Line Details Card */}
        <Paper
          sx={{
            p: 3,
            mb: 3,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'none'
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              mb: 2,
              fontWeight: 600,
              color: 'var(--heading)',
              fontSize: '1rem'
            }}
          >
            تفاصيل السطر
          </Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'var(--muted_text)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    display: 'block',
                    mb: 0.5
                  }}
                >
                  الحساب
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 600,
                    color: 'var(--text)',
                    fontSize: '0.95rem'
                  }}
                >
                  {lineData.account_code} - {lineData.account_name}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'var(--muted_text)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    display: 'block',
                    mb: 0.5
                  }}
                >
                  مدين
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: lineData.debit_amount > 0 ? 'var(--success)' : 'var(--muted_text)',
                    fontWeight: 700,
                    fontSize: '1.25rem'
                  }}
                >
                  {lineData.debit_amount.toLocaleString('ar-SA')}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'var(--muted_text)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    display: 'block',
                    mb: 0.5
                  }}
                >
                  دائن
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: lineData.credit_amount > 0 ? 'var(--error)' : 'var(--muted_text)',
                    fontWeight: 700,
                    fontSize: '1.25rem'
                  }}
                >
                  {lineData.credit_amount.toLocaleString('ar-SA')}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Review History */}
        {lineData.review_count > 0 && (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  mb: 1.5,
                  fontWeight: 600,
                  color: 'var(--heading)',
                  fontSize: '1rem'
                }}
              >
                سجل المراجعة
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                <Chip
                  icon={<MessageIcon />}
                  label={`${lineData.review_count} تعليق`}
                  size="small"
                  sx={{
                    background: 'var(--chip-bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    '& .MuiChip-icon': { color: 'var(--accent)' }
                  }}
                />
                {lineData.has_change_requests && (
                  <Chip
                    icon={<Edit />}
                    label="طلبات تعديل"
                    size="small"
                    sx={{
                      background: 'rgba(255, 192, 72, 0.12)',
                      color: 'var(--warning)',
                      border: '1px solid var(--warning)',
                      '& .MuiChip-icon': { color: 'var(--warning)' }
                    }}
                  />
                )}
                {lineData.latest_reviewer_email && (
                  <Chip
                    label={`آخر مراجع: ${lineData.latest_reviewer_email}`}
                    size="small"
                    sx={{
                      background: 'var(--chip-bg)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)'
                    }}
                  />
                )}
              </Box>
              {lineData.latest_comment && (
                <Box
                  sx={{
                    p: 2,
                    background: 'rgba(255, 243, 205, 0.1)',
                    border: '1px solid rgba(255, 192, 72, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid var(--warning)'
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'var(--muted_text)',
                      display: 'block',
                      mb: 0.5,
                      fontWeight: 500
                    }}
                  >
                    آخر تعليق:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'var(--text)',
                      lineHeight: 1.6
                    }}
                  >
                    {lineData.latest_comment}
                  </Typography>
                </Box>
              )}
            </Box>
            <Divider sx={{ my: 3, borderColor: 'var(--border)' }} />
          </>
        )}

        {/* Action Selection */}
        <Typography
          variant="subtitle2"
          sx={{
            mb: 2,
            fontWeight: 600,
            color: 'var(--heading)',
            fontSize: '1rem'
          }}
        >
          اختر الإجراء
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 3 }}>
          <Button
            variant={action === 'comment' ? 'contained' : 'outlined'}
            onClick={() => {
              setAction('comment')
              setComment('')
              setError(null)
            }}
            startIcon={<MessageIcon />}
            sx={{
              justifyContent: 'flex-start',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              textTransform: 'none',
              fontWeight: 600,
              ...(action === 'comment' ? {
                background: 'var(--accent)',
                color: 'var(--on-accent)',
                '&:hover': { background: 'var(--accent-primary-hover)' }
              } : {
                borderColor: 'var(--border)',
                color: 'var(--text)',
                '&:hover': {
                  background: 'var(--hover-bg)',
                  borderColor: 'var(--accent)'
                }
              })
            }}
          >
            تعليق
          </Button>
          <Button
            variant={action === 'approve' ? 'contained' : 'outlined'}
            onClick={() => {
              setAction('approve')
              setComment('')
              setError(null)
            }}
            startIcon={<CheckCircle />}
            sx={{
              justifyContent: 'flex-start',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              textTransform: 'none',
              fontWeight: 600,
              ...(action === 'approve' ? {
                background: 'var(--success)',
                color: 'var(--on-success)',
                '&:hover': { background: 'var(--success-strong)' }
              } : {
                borderColor: 'var(--border)',
                color: 'var(--text)',
                '&:hover': {
                  background: 'var(--hover-bg)',
                  borderColor: 'var(--success)'
                }
              })
            }}
          >
            اعتماد
          </Button>
          <Button
            variant={action === 'edit' ? 'contained' : 'outlined'}
            onClick={() => {
              setAction('edit')
              setComment('')
              setError(null)
            }}
            startIcon={<Edit />}
            sx={{
              justifyContent: 'flex-start',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              textTransform: 'none',
              fontWeight: 600,
              ...(action === 'edit' ? {
                background: 'var(--warning)',
                color: 'var(--on-warning)',
                '&:hover': { background: 'var(--warning-strong)' }
              } : {
                borderColor: 'var(--border)',
                color: 'var(--text)',
                '&:hover': {
                  background: 'var(--hover-bg)',
                  borderColor: 'var(--warning)'
                }
              })
            }}
          >
            طلب تعديل
          </Button>
          <Button
            variant={action === 'flag' ? 'contained' : 'outlined'}
            onClick={() => {
              setAction('flag')
              setComment('')
              setError(null)
            }}
            startIcon={<FlagIcon />}
            sx={{
              justifyContent: 'flex-start',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              textTransform: 'none',
              fontWeight: 600,
              ...(action === 'flag' ? {
                background: 'var(--error)',
                color: 'var(--on-error)',
                '&:hover': { background: 'var(--error-strong)' }
              } : {
                borderColor: 'var(--border)',
                color: 'var(--text)',
                '&:hover': {
                  background: 'var(--hover-bg)',
                  borderColor: 'var(--error)'
                }
              })
            }}
          >
            تنبيه
          </Button>
        </Box>

        {/* Comment/Reason Input */}
        <TextField
          label={isReasonRequired ? 'السبب (مطلوب)' : 'التعليق أو الملاحظات'}
          multiline
          rows={4}
          fullWidth
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            action === 'comment' ? 'أضف تعليقك هنا...' :
              action === 'approve' ? 'ملاحظات الاعتماد (اختياري)...' :
                action === 'edit' ? 'اذكر التعديلات المطلوبة...' :
                  'اذكر سبب التنبيه...'
          }
          error={!!error}
          helperText={error}
          sx={{
            '& .MuiOutlinedInput-root': {
              background: 'var(--field_bg)',
              color: 'var(--text)',
              borderRadius: 'var(--radius-md)',
              '& fieldset': {
                borderColor: 'var(--border)'
              },
              '&:hover fieldset': {
                borderColor: 'var(--accent)'
              },
              '&.Mui-focused fieldset': {
                borderColor: 'var(--accent)',
                borderWidth: '2px'
              }
            },
            '& .MuiInputLabel-root': {
              color: 'var(--muted_text)',
              '&.Mui-focused': {
                color: 'var(--accent)'
              }
            },
            '& .MuiFormHelperText-root': {
              color: 'var(--error)'
            }
          }}
        />

        {error && (
          <Alert
            severity="error"
            sx={{
              mt: 2,
              background: 'rgba(222, 63, 63, 0.12)',
              border: '1px solid var(--error)',
              color: 'var(--text)',
              borderRadius: 'var(--radius-md)',
              '& .MuiAlert-icon': { color: 'var(--error)' }
            }}
          >
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          padding: '16px 24px',
          borderTop: '2px solid var(--border)',
          background: 'var(--surface)',
          gap: 1.5
        }}
      >
        <Button
          onClick={onClose}
          disabled={loading}
          sx={{
            color: 'var(--muted_text)',
            fontWeight: 600,
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            textTransform: 'none',
            '&:hover': {
              background: 'var(--hover-bg)',
              color: 'var(--text)'
            }
          }}
        >
          إلغاء
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || (isReasonRequired && !comment.trim())}
          startIcon={loading ? <CircularProgress size={20} /> : null}
          sx={{
            background:
              action === 'approve' ? 'var(--success)' :
                action === 'edit' ? 'var(--warning)' :
                  action === 'flag' ? 'var(--error)' :
                    'var(--accent)',
            color:
              action === 'edit' ? 'var(--on-warning)' :
                'white',
            fontWeight: 600,
            padding: '10px 24px',
            borderRadius: 'var(--radius-md)',
            textTransform: 'none',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            '&:hover': {
              background:
                action === 'approve' ? 'var(--success-strong)' :
                  action === 'edit' ? 'var(--warning-strong)' :
                    action === 'flag' ? 'var(--error-strong)' :
                      'var(--accent-primary-hover)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            },
            '&:disabled': {
              background: 'var(--border)',
              color: 'var(--muted_text)'
            }
          }}
        >
          {action === 'comment' && 'إضافة تعليق'}
          {action === 'approve' && 'اعتماد السطر'}
          {action === 'edit' && 'طلب التعديل'}
          {action === 'flag' && 'تنبيه'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default EnhancedLineReviewModal
