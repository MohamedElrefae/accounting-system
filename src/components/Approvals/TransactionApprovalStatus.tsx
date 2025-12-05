import React from 'react'
import { Box, Typography, Chip } from '@mui/material'
import { CheckCircleIcon, TimerIcon, CancelIcon, EditIcon } from '../icons/SimpleIcons'

interface TransactionApprovalStatusProps {
  transactionId?: string
  status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'revision_requested'
}

const TransactionApprovalStatus: React.FC<TransactionApprovalStatusProps> = ({ 
  transactionId,
  status = 'draft' 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'approved':
        return {
          label: 'معتمدة',
          color: 'success' as const,
          icon: <CheckCircleIcon />
        }
      case 'submitted':
        return {
          label: 'مُرسلة للمراجعة',
          color: 'info' as const,
          icon: <TimerIcon />
        }
      case 'rejected':
        return {
          label: 'مرفوضة',
          color: 'error' as const,
          icon: <CancelIcon />
        }
      case 'revision_requested':
        return {
          label: 'طلب تعديل',
          color: 'warning' as const,
          icon: <EditIcon />
        }
      default:
        return {
          label: 'مسودة',
          color: 'default' as const,
          icon: <EditIcon />
        }
    }
  }

  const config = getStatusConfig()

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
      <Typography variant="body2" color="text.secondary">
        حالة الاعتماد:
      </Typography>
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
      />
    </Box>
  )
}

export default TransactionApprovalStatus
