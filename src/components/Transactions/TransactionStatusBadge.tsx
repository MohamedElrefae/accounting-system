/**
 * Transaction Status Badge
 * Displays transaction approval status with appropriate styling and icons
 */

import React from 'react'
import { Box, Tooltip, Typography } from '@mui/material'

interface TransactionStatusBadgeProps {
  status: string
  isPosted?: boolean
  size?: 'small' | 'medium'
  showLabel?: boolean
  onClick?: () => void
}

const statusConfig: Record<string, { label: string; icon: string; color: string; bgColor: string; description: string }> = {
  'draft': {
    label: 'مسودة',
    icon: '📝',
    color: '#94a3b8',
    bgColor: '#1e293b',
    description: 'المعاملة في حالة مسودة ويمكن تعديلها'
  },
  'submitted': {
    label: 'مرسلة',
    icon: '📤',
    color: '#3b82f6',
    bgColor: '#1e3a8a',
    description: 'المعاملة مرسلة للموافقة'
  },
  'approved': {
    label: 'معتمدة',
    icon: '✅',
    color: '#10b981',
    bgColor: '#064e3b',
    description: 'المعاملة معتمدة'
  },
  'rejected': {
    label: 'مرفوضة',
    icon: '❌',
    color: '#ef4444',
    bgColor: '#7f1d1d',
    description: 'المعاملة مرفوضة'
  },
  'revision_requested': {
    label: 'تعديل مطلوب',
    icon: '⚠️',
    color: '#f59e0b',
    bgColor: '#78350f',
    description: 'تم طلب تعديل المعاملة'
  },
  'posted': {
    label: 'مرسلة',
    icon: '🔒',
    color: '#8b5cf6',
    bgColor: '#3f0f5c',
    description: 'المعاملة مرسلة ولا يمكن تعديلها'
  }
}

export const TransactionStatusBadge: React.FC<TransactionStatusBadgeProps> = ({
  status,
  isPosted = false,
  size = 'small',
  showLabel = true,
  onClick
}) => {
  const displayStatus = isPosted ? 'posted' : status
  const config = statusConfig[displayStatus] || statusConfig['draft']

  const badgeContent = (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        padding: size === 'small' ? '4px 8px' : '6px 12px',
        borderRadius: '6px',
        background: config.bgColor,
        border: `1px solid ${config.color}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        '&:hover': onClick ? {
          background: config.color,
          color: '#0f172a'
        } : {}
      }}
      onClick={onClick}
    >
      <span style={{ fontSize: size === 'small' ? '14px' : '16px' }}>
        {config.icon}
      </span>
      {showLabel && (
        <Typography
          variant={size === 'small' ? 'caption' : 'body2'}
          sx={{
            color: config.color,
            fontWeight: 600,
            fontSize: size === 'small' ? '12px' : '14px'
          }}
        >
          {config.label}
        </Typography>
      )}
    </Box>
  )

  return (
    <Tooltip title={config.description} arrow>
      {badgeContent}
    </Tooltip>
  )
}

export default TransactionStatusBadge
