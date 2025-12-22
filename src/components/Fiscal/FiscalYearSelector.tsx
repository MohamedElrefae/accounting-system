// ============================================
// FISCAL YEAR SELECTOR - Updated to use unified hooks
// ============================================

import React from 'react'
import { MenuItem, TextField, Skeleton, Alert } from '@mui/material'
import { useFiscalYears } from '@/services/fiscal'
import { useScopeOptional } from '@/contexts/ScopeContext'

export interface FiscalYearSelectorProps {
  orgId?: string | null
  value?: string | null
  onChange?: (fiscalYearId: string) => void
  label?: string
  helperText?: string
  size?: 'small' | 'medium'
  persistKey?: string
  sx?: any
  disabled?: boolean
}

export const FiscalYearSelector: React.FC<FiscalYearSelectorProps> = ({
  orgId,
  value,
  onChange,
  label = 'Fiscal Year',
  helperText,
  size = 'small',
  persistKey = 'fiscal_year_id',
  sx,
  disabled = false,
}) => {
  const scope = useScopeOptional()
  const effectiveOrgId = orgId ?? scope?.currentOrg?.id ?? null

  // Use the new unified hook instead of direct Supabase calls
  const { data: years, isLoading, error } = useFiscalYears(effectiveOrgId)

  // Debug logging
  React.useEffect(() => {
    console.log('FiscalYearSelector: Data loaded', {
      effectiveOrgId,
      yearsCount: years?.length || 0,
      years,
      isLoading,
      error
    })
  }, [effectiveOrgId, years, isLoading, error])

  const [selected, setSelected] = React.useState<string>(() => {
    if (value) return value
    try {
      return localStorage.getItem(persistKey) ?? ''
    } catch {
      return ''
    }
  })

  // Auto-select current year if none selected
  React.useEffect(() => {
    if (!selected && years?.length) {
      const current = years.find(y => y.isCurrent) || years[0]
      if (current) {
        setSelected(current.id)
        try { localStorage.setItem(persistKey, current.id) } catch {}
        onChange?.(current.id)
      }
    }
  }, [years, selected, persistKey, onChange])

  // Sync with external value
  React.useEffect(() => {
    if (value !== undefined && value !== selected) {
      setSelected(value || '')
    }
  }, [value, selected])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const id = event.target.value
    setSelected(id)
    try { localStorage.setItem(persistKey, id) } catch {}
    onChange?.(id)
  }

  if (isLoading) {
    return <Skeleton variant="rectangular" width={200} height={40} sx={sx} />
  }

  if (error) {
    return <Alert severity="error" sx={{ maxWidth: 300, ...sx }}>Failed to load fiscal years</Alert>
  }

  return (
    <TextField
      select
      label={label}
      value={selected}
      onChange={handleChange}
      size={size}
      helperText={helperText}
      disabled={disabled || !years?.length || !effectiveOrgId}
      sx={{ minWidth: 200, ...sx }}
    >
      {years?.map((year) => (
        <MenuItem key={year.id} value={year.id}>
          {year.yearNumber} - {year.nameEn} {year.isCurrent && '(Current)'}
        </MenuItem>
      ))}
    </TextField>
  )
}

export default FiscalYearSelector
