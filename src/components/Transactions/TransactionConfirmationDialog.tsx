import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Divider
} from '@mui/material'
import {
  CheckCircle,
  Save,
  Send,
  Add,
  Close
} from '@mui/icons-material'

interface TransactionConfirmationDialogProps {
  open: boolean
  onClose: () => void
  action: 'draft' | 'submit'
  transactionData?: {
    description: string
    entry_date: string
    totalAmount: number
    linesCount: number
    organizationName?: string
    projectName?: string
  }
  onAction: (option: 'close' | 'new') => void
  isProcessing?: boolean
}

const TransactionConfirmationDialog: React.FC<TransactionConfirmationDialogProps> = ({
  open,
  onClose,
  action,
  transactionData,
  onAction,
  isProcessing = false
}) => {
  const isDraft = action === 'draft'
  const isSubmit = action === 'submit'

  const getActionText = () => {
    if (isDraft) return 'حفظ كمسودة'
    if (isSubmit) return 'إرسال للاعتماد'
    return ''
  }

  const getActionIcon = () => {
    if (isDraft) return <Save />
    if (isSubmit) return <Send />
    return null
  }

  const getSuccessMessage = () => {
    if (isDraft) return 'تم حفظ المعاملة كمسودة بنجاح!'
    if (isSubmit) return 'تم إرسال المعاملة للاعتماد بنجاح!'
    return ''
  }

  const getActionDescription = () => {
    if (isDraft) {
      return 'تم حفظ المعاملة كمسودة ويمكنك استكمالها لاحقاً من قائمة المسودات'
    }
    if (isSubmit) {
      return 'تم إرسال المعاملة إلى نظام الاعتماد وسيتم مراجعتها من قبل المختصين'
    }
    return ''
  }

  return (
    <Dialog
      open={open}
      onClose={isProcessing ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          color: '#f1f5f9',
          direction: 'rtl'
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 2, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        fontSize: '1.5rem',
        fontWeight: 'bold'
      }}>
        <CheckCircle sx={{ 
          fontSize: '2rem', 
          color: isDraft ? '#f59e0b' : '#10b981' 
        }} />
        <Box>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            {getSuccessMessage()}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
            {getActionDescription()}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {/* Transaction Summary */}
        {transactionData && (
          <Box sx={{ 
            mt: 2, 
            p: 3, 
            backgroundColor: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
              تفاصيل المعاملة:
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  الوصف:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {transactionData.description}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  التاريخ:
                </Typography>
                <Typography variant="body2">
                  {transactionData.entry_date}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  الإجمالي:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {transactionData.totalAmount.toLocaleString('ar-SA')} ريال
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  عدد البنود:
                </Typography>
                <Typography variant="body2">
                  {transactionData.linesCount}
                </Typography>
              </Box>

              {transactionData.organizationName && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    المؤسسة:
                  </Typography>
                  <Typography variant="body2">
                    {transactionData.organizationName}
                  </Typography>
                </Box>
              )}

              {transactionData.projectName && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    المشروع:
                  </Typography>
                  <Typography variant="body2">
                    {transactionData.projectName}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Action Status */}
        <Box sx={{ mt: 3 }}>
          <Chip
            icon={getActionIcon()}
            label={getActionText()}
            color={isDraft ? 'warning' : 'success'}
            variant="outlined"
            sx={{ 
              fontWeight: 'bold',
              '& .MuiChip-icon': {
                marginLeft: '8px'
              }
            }}
          />
        </Box>

        {/* Processing Indicator */}
        {isProcessing && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            mt: 3,
            p: 2,
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <CircularProgress size={20} />
            <Typography variant="body2">
              جاري معالجة الطلب...
            </Typography>
          </Box>
        )}

        {/* Additional Info for Submit */}
        {isSubmit && !isProcessing && (
          <Alert 
            severity="info" 
            sx={{ 
              mt: 3,
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: '#93c5fd',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              '& .MuiAlert-icon': {
                color: '#60a5fa'
              }
            }}
          >
            <Typography variant="body2">
              سيتم إشعارك عبر البريد الإلكتروني عند تحديث حالة المعاملة
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Button
          onClick={() => onAction('close')}
          variant="outlined"
          startIcon={<Close />}
          disabled={isProcessing}
          sx={{
            borderColor: '#64748b',
            color: '#94a3b8',
            fontWeight: 600,
            '&:hover': {
              borderColor: '#94a3b8',
              backgroundColor: 'rgba(148, 163, 184, 0.1)'
            }
          }}
        >
          إغلاق
        </Button>
        
        <Button
          onClick={() => onAction('new')}
          variant="contained"
          startIcon={<Add />}
          disabled={isProcessing}
          sx={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            fontWeight: 600,
            '&:hover': {
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
            }
          }}
        >
          معاملة جديدة
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default TransactionConfirmationDialog
