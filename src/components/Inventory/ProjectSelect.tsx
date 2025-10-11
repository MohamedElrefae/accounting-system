import React from 'react'
import { TextField, Autocomplete, CircularProgress } from '@mui/material'
import { supabase } from '@/utils/supabase'

export type ProjectOption = { id: string; label: string }

export interface ProjectSelectProps {
  orgId: string | null
  value: string
  onChange: (id: string) => void
  label?: string
}

export const ProjectSelect: React.FC<ProjectSelectProps> = ({ orgId, value, onChange, label = 'Project' }) => {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [options, setOptions] = React.useState<ProjectOption[]>([])
  const [input, setInput] = React.useState('')

  const fetch = React.useCallback(async (q: string) => {
    if (!orgId) return
    setLoading(true)
    try {
      let query = supabase
        .from('projects')
        .select('id, code, name')
        .eq('org_id', orgId)
        .limit(20)
      if (q) {
        query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%`)
      }
      const { data, error } = await query
      if (!error && data) {
        setOptions(
          data.map((p: any) => ({ id: p.id, label: `${p.code ?? ''} ${p.name ?? ''}`.trim() }))
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