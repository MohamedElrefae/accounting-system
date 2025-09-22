import React from 'react'
import { MenuItem, TextField } from '@mui/material'
import { supabase } from '@/utils/supabase'
import { getActiveOrgId } from '@/utils/org'

export interface FiscalYear {
  id: string
  org_id: string
  year_number: number
  name_en: string
  name_ar?: string | null
  start_date: string
  end_date: string
  status: 'draft' | 'active' | 'closed' | 'archived'
  is_current: boolean
}

export interface FiscalYearSelectorProps {
  orgId?: string | null
  value?: string | null
  onChange?: (fiscalYearId: string) => void
  label?: string
  helperText?: string
  size?: 'small' | 'medium'
  persistKey?: string // localStorage key, default 'fiscal_year_id'
  sx?: any
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
}) => {
  const [years, setYears] = React.useState<FiscalYear[]>([])
  const [selected, setSelected] = React.useState<string | ''>(() => {
    try {
      return (value ?? localStorage.getItem(persistKey) ?? '') as string
    } catch {
      return (value ?? '') as string
    }
  })
  const effectiveOrg = React.useMemo(() => orgId ?? getActiveOrgId(), [orgId])

  React.useEffect(() => { if (value !== undefined) setSelected(value || '') }, [value])

  React.useEffect(() => {
    (async () => {
      if (!effectiveOrg) { setYears([]); return }
      const { data, error } = await supabase
        .from('fiscal_years')
        .select('*')
        .eq('org_id', effectiveOrg)
        .order('year_number', { ascending: true })
      if (error) { setYears([]); return }
      setYears(data as unknown as FiscalYear[])
      // If no selection and there is a current year, preselect it
      if ((!selected || selected === '') && data && data.length > 0) {
        const current = (data as any[]).find(y => y.is_current) || data[data.length - 1]
        if (current?.id) {
          setSelected(current.id)
          try { localStorage.setItem(persistKey, current.id) } catch {}
          onChange?.(current.id)
        }
      }
    })()
  }, [effectiveOrg])

  const handleChange = (id: string) => {
    setSelected(id)
    try { localStorage.setItem(persistKey, id) } catch {}
    onChange?.(id)
  }

  return (
    <TextField
      select
      size={size}
      label={label}
      value={selected}
      onChange={(e) => handleChange(e.target.value)}
      helperText={helperText}
      sx={sx}
      disabled={!effectiveOrg}
    >
      {years.map((y) => (
        <MenuItem key={y.id} value={y.id}>{y.year_number} - {y.name_en}</MenuItem>
      ))}
    </TextField>
  )
}