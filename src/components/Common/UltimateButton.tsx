import React from 'react'
import { Button, type ButtonProps } from '@mui/material'

export type UltimateVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost'

interface UltimateButtonProps extends Omit<ButtonProps, 'color' | 'variant'> {
  kind?: UltimateVariant
}

const UltimateButton: React.FC<UltimateButtonProps> = ({ kind='primary', sx, children, ...rest }) => {
  const base = {
    borderRadius: '12px',
    transition: 'all 0.2s ease',
  } as const

  const stylesByKind: Record<UltimateVariant, any> = {
    primary: {
      background: (theme: any)=> `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
      color: 'primary.contrastText',
      '&:hover': { transform: 'scale(1.03)' }
    },
    secondary: {
      background: (theme: any)=> `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
      color: 'common.white',
      '&:hover': { transform: 'scale(1.03)' }
    },
    success: {
      background: (theme: any)=> `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
      color: 'common.white',
      '&:hover': { transform: 'scale(1.03)' }
    },
    warning: {
      background: (theme: any)=> `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
      color: 'common.white',
      '&:hover': { transform: 'scale(1.03)' }
    },
    danger: {
      background: (theme: any)=> `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
      color: 'common.white',
      '&:hover': { transform: 'scale(1.03)' }
    },
    ghost: {
      background: 'transparent',
      color: 'text.primary',
      border: '1px solid',
      borderColor: 'divider',
      '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
    }
  }

  return (
    <Button sx={{ ...base, ...stylesByKind[kind], ...(sx||{}) }} {...rest}>
      {children}
    </Button>
  )
}

export default UltimateButton
