import React from 'react'
import { Button, CircularProgress, type ButtonProps } from '@mui/material'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export type UltimateVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'ghost'
  | 'neutral'
  | 'info'

export type UltimateButtonState = 'default' | 'loading' | 'success' | 'error'

interface UltimateButtonProps extends Omit<ButtonProps, 'color' | 'variant'> {
  kind?: UltimateVariant
  state?: UltimateButtonState
  icon?: React.ReactNode
  iconPosition?: 'start' | 'end'
  keepIconSpace?: boolean
}

const baseSx = {
  borderRadius: '12px',
  transition: 'all 0.2s ease',
  fontWeight: 600,
  textTransform: 'none',
  minHeight: 40,
  px: 2.5,
  display: 'inline-flex',
  gap: 1,
  alignItems: 'center',
  justifyContent: 'center',
} as const

const variantStyles: Record<UltimateVariant, any> = {
  primary: ({ palette }: any) => ({
    background: `linear-gradient(135deg, ${palette.primary.main} 0%, ${palette.primary.dark} 100%)`,
    color: palette.primary.contrastText,
    '&:hover': { transform: 'translateY(-2px)' },
  }),
  secondary: ({ palette }: any) => ({
    background: `linear-gradient(135deg, ${palette.secondary.main} 0%, ${palette.secondary.dark} 100%)`,
    color: palette.common.white,
    '&:hover': { transform: 'translateY(-2px)' },
  }),
  success: ({ palette }: any) => ({
    background: `linear-gradient(135deg, ${palette.success.main} 0%, ${palette.success.dark} 100%)`,
    color: palette.common.white,
    '&:hover': { transform: 'translateY(-2px)' },
  }),
  warning: ({ palette }: any) => ({
    background: `linear-gradient(135deg, ${palette.warning.main} 0%, ${palette.warning.dark} 100%)`,
    color: palette.getContrastText(palette.warning.main),
    '&:hover': { transform: 'translateY(-2px)' },
  }),
  danger: ({ palette }: any) => ({
    background: `linear-gradient(135deg, ${palette.error.main} 0%, ${palette.error.dark} 100%)`,
    color: palette.common.white,
    '&:hover': { transform: 'translateY(-2px)' },
  }),
  ghost: ({ palette }: any) => ({
    background: 'transparent',
    color: palette.text.primary,
    border: `1px solid ${palette.divider}`,
    '&:hover': {
      transform: 'translateY(-2px)',
      backgroundColor: palette.action.hover,
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    },
  }),
  neutral: () => ({
    background: 'linear-gradient(135deg,#6b7280,#4b5563)',
    color: '#ffffff',
    '&:hover': { transform: 'translateY(-2px)' },
  }),
  info: ({ palette }: any) => ({
    background: `linear-gradient(135deg, ${palette.info.main} 0%, ${palette.info.dark} 100%)`,
    color: palette.common.white,
    '&:hover': { transform: 'translateY(-2px)' },
  }),
}

const stateIcons: Record<Exclude<UltimateButtonState, 'default'>, React.ReactNode> = {
  loading: <CircularProgress size={18} color="inherit" thickness={4} />,
  success: <CheckCircle2 size={18} />, 
  error: <AlertCircle size={18} />,
}

const UltimateButton: React.FC<UltimateButtonProps> = ({
  kind = 'primary',
  state = 'default',
  icon,
  iconPosition = 'start',
  keepIconSpace = false,
  disabled,
  children,
  sx,
  ...rest
}) => {
  const renderStateIcon = state !== 'default' ? stateIcons[state] : null
  const showIcon = renderStateIcon ?? icon

  return (
    <Button
      sx={(theme) => ({
        ...baseSx,
        ...(variantStyles[kind]?.(theme) ?? {}),
        ...(sx ?? {}),
      })}
      disabled={disabled || state === 'loading'}
      {...rest}
    >
      {iconPosition === 'start' && (showIcon || keepIconSpace) ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginInlineEnd: 6 }}>
          {showIcon}
        </span>
      ) : null}
      <span>{children}</span>
      {iconPosition === 'end' && (showIcon || keepIconSpace) ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginInlineStart: 6 }}>
          {showIcon}
        </span>
      ) : null}
    </Button>
  )
}

export default UltimateButton
