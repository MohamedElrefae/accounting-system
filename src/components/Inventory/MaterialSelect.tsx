import React from 'react'
import { TextField, Autocomplete, CircularProgress } from '@mui/material'
import { supabase } from '@/utils/supabase'

export type MaterialOption = { id: string; label: string }

export interface MaterialSelectProps {
  orgId: string | null
  value: string
  onChange: (id: string) => void
  label?: string
}

export const MaterialSelect: React.FC<MaterialSelectProps> = ({ orgId, value, onChange, label = 'Material' }) => {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [options, setOptions] = React.useState<MaterialOption[]>([])
  const [input, setInput] = React.useState('')

  const fetch = React.useCallback(async (q: string) => {
    if (!orgId) return
    setLoading(true)
    try {
      let query = supabase
        .from('materials')
        .select('id, material_code, material_name')
        .eq('org_id', orgId)
        .limit(20)
      if (q) {
        // search by code or name
        query = query.or(`material_code.ilike.%${q}%,material_name.ilike.%${q}%`)
      }
      const { data, error } = await query
      if (!error && data) {
        setOptions(
          data.map((m: any) => ({ id: m.id, label: `${m.material_code ?? ''} ${m.material_name ?? ''}`.trim() }))
        )
      }
    } finally {
      setLoading(false)
    }
  }, [orgId])

  React.useEffect(() => {
    if (open) fetch(input)
  }, [open, input, fetch])

  const selected = options.find(o => o.id === value) || null

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      loading={loading}
      value={selected}
      onChange={(_, opt) => onChange(opt?.id || '')}
      onInputChange={(_, val) => setInput(val)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            )
          }}
        />
      )}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      sx={{ minWidth: 280 }}
    />
  )
}