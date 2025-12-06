// ============================================
// FISCAL PERIOD SELECTOR - New component using unified hooks
// ============================================

import React from 'react'
import { MenuItem, TextField, Skeleton, Alert, Chip, Box } from '@mui/material'
import { useFiscalPeriods } from '@/services/fiscal'
import { getActiveOrgId } from '@/utils/org'

export interface FiscalPeriodSelectorProps {
  orgId?: string | null
  fiscalYearId: string | null
  value?: string | null
  onChange?: (periodId: string) => void
  label?: string
  size?: 'small' | 'medium'
  showStatus?: boolean
  disabled?: boolean
  sx?: any
}

const statusColors: Record<string, 'success' | 'warning' | 'default'> = {
  open: 'success',
  locked: 'warning',
  closed: 'default',
}

export const FiscalPeriodSelector: React.FC<FiscalPeriodSelectorProps> = ({
  orgId,
  fiscalYearId,
  value,
  onChange,
  label = 'Period',
  size = 'small',
  showStatus = true,
  disabled = false,
  sx,
}) => {
  const effectiveOrgId = orgId ?? getActiveOrgId()

  // Use the new unified hook
  const { data: periods, isLoading, error } = useFiscalPeriods(effectiveOrgId, fiscalYearId)

  const [selected, setSelected] = React.useState<string>(value ?? '')

  // Auto-select current period
  React.useEffect(() => {
    if (!selected && periods?.length) {
      const current = periods.find(p => p.isCurrent) || periods[0]
      if (current) {
        setSelected(current.id)
        onChange?.(current.id)
      }
    }
  }, [periods, selected, onChange])

  // Sync with external value
  React.useEffect(() => {
    if (value !== undefined && value !== selected) {
      setSelected(value || '')
    }
  }, [value])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const id = event.target.value
    setSelected(id)
    onChange?.(id)
  }

  if (!fiscalYearId) {
    return (
      <TextField
        select
        label={label}
        value=""
        size={size}
        disabled
        sx={{ minWidth: 200, ...sx }}
      >
        <MenuItem value="">Select fiscal year first</MenuItem>
      </TextField>
    )
  }

  if (isLoading) {
    return <Skeleton variant="rectangular" width={200} height={40} sx={sx} />
  }

  if (error) {
    return <Alert severity="error" sx={{ maxWidth: 300, ...sx }}>Failed to load periods</Alert>
  }

  return (
    <TextField
      select
      label={label}
      value={selected}
      onChange={handleChange}
      size={size}
      disabled={disabled || !periods?.length}
      sx={{ minWidth: 200, ...sx }}
    >
      {periods?.map((period) => (
        <MenuItem key={period.id} value={period.id}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {period.nameEn}
            {showStatus && (
              <Chip
                label={period.status}
                size="small"
                color={statusColors[period.status]}
                sx={{ ml: 1 }}
              />
            )}
            {period.isCurrent && (
              <Chip label="Current" size="small" color="primary" variant="outlined" />
            )}
          </Box>
        </MenuItem>
      ))}
    </TextField>
  )
}

export default FiscalPeriodSelector
