import React from 'react'
import { TextField, Autocomplete, CircularProgress } from '@mui/material'
import { supabase } from '@/utils/supabase'

export type LocationOption = { id: string; label: string }

export interface LocationSelectProps {
  orgId: string | null
  value: string
  onChange: (id: string) => void
  label?: string
}

export const LocationSelect: React.FC<LocationSelectProps> = ({ orgId, value, onChange, label = 'Location' }) => {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [options, setOptions] = React.useState<LocationOption[]>([])
  const [input, setInput] = React.useState('')

  const fetch = React.useCallback(async (q: string) => {
    if (!orgId) return
    setLoading(true)
    try {
      let query = supabase
        .from('inventory_locations')
        .select('id, location_code, location_name')
        .eq('org_id', orgId)
        .limit(20)
      if (q) {
        query = query.or(`location_code.ilike.%${q}%,location_name.ilike.%${q}%`)
      }
      const { data, error } = await query
      if (!error && data) {
        setOptions(
          data.map((l: any) => ({ id: l.id, label: `${l.location_code ?? ''} ${l.location_name ?? ''}`.trim() }))
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