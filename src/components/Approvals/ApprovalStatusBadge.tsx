import { Chip, Tooltip } from '@mui/material'
import {
  CheckCircle,
  Schedule,
  Cancel,
  Edit,
  Description
} from '@mui/icons-material'

interface ApprovalStatusBadgeProps {
  status?: string
  size?: 'small' | 'medium'
  showIcon?: boolean
}

export default function ApprovalStatusBadge({ 
  status = 'draft', 
  size = 'small',
  showIcon = true 
}: ApprovalStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'draft':
        return {
          label: 'مسودة',
          color: 'default' as const,
          icon: <Description fontSize="small" />,
          tooltip: 'معاملة مسودة - لم يتم إرسالها للاعتماد بعد'
        }
      case 'submitted':
        return {
          label: 'قيد المراجعة',
          color: 'warning' as const,
          icon: <Schedule fontSize="small" />,
          tooltip: 'تم إرسال المعاملة وتنتظر الاعتماد'
        }
      case 'revision_requested':
        return {
          label: 'مطلوب تعديل',
          color: 'info' as const,
          icon: <Edit fontSize="small" />,
          tooltip: 'تم طلب تعديلات على المعاملة'
        }
      case 'approved':
        return {
          label: 'معتمد',
          color: 'success' as const,
          icon: <CheckCircle fontSize="small" />,
          tooltip: 'تم اعتماد جميع سطور المعاملة'
        }
      case 'rejected':
        return {
          label: 'مرفوض',
          color: 'error' as const,
          icon: <Cancel fontSize="small" />,
          tooltip: 'تم رفض المعاملة'
        }
      case 'cancelled':
        return {
          label: 'ملغي',
          color: 'default' as const,
          icon: <Cancel fontSize="small" />,
          tooltip: 'تم إلغاء المعاملة'
        }
      default:
        return {
          label: status,
          color: 'default' as const,
          icon: <Description fontSize="small" />,
          tooltip: status
        }
    }
  }

  const config = getStatusConfig()

  return (
    <Tooltip title={config.tooltip} arrow>
      <Chip
        label={config.label}
        color={config.color}
        size={size}
        icon={showIcon ? config.icon : undefined}
        sx={{
          fontWeight: 600,
          fontSize: size === 'small' ? '11px' : '13px'
        }}
      />
    </Tooltip>
  )
}
