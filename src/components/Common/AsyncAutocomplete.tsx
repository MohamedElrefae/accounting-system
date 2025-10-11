import React, { useEffect, useMemo, useRef, useState } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import VirtualizedAutocompleteListbox from './VirtualizedAutocompleteListbox'

export type AsyncOption<T = any> = { id: string; label: string; raw?: T }

export interface AsyncAutocompleteProps<T = any> {
  label: string
  value: string
  onChange: (newValue: string, option?: AsyncOption<T> | null) => void
  loader: (query: string) => Promise<AsyncOption<T>[]> | AsyncOption<T>[]
  disabled?: boolean
  error?: boolean
  helperText?: string
  placeholder?: string
  fullWidth?: boolean
}

export default function AsyncAutocomplete<T = any>({
  label,
  value,
  onChange,
  loader,
  disabled,
  error,
  helperText,
  placeholder,
  fullWidth = true,
}: AsyncAutocompleteProps<T>) {
  const [options, setOptions] = useState<AsyncOption<T>[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => { return () => { mountedRef.current = false } }, [])

  // Debounced load
  useEffect(() => {
    let active = true
    const handler = setTimeout(async () => {
      try {
        setLoading(true)
        const res = await loader(inputValue)
        if (active && mountedRef.current) setOptions(Array.isArray(res) ? res : [])
      } catch {
        if (active && mountedRef.current) setOptions([])
      } finally {
        if (active && mountedRef.current) setLoading(false)
      }
    }, 200)
    return () => { active = false; clearTimeout(handler) }
  }, [inputValue, loader])

  const valueOption = useMemo(() => options.find(o => o.id === value) || null, [options, value])

  return (
    <Autocomplete
      value={valueOption}
      onChange={(_, opt) => onChange(opt?.id || '', opt || null)}
      inputValue={inputValue}
      onInputChange={(_, v) => setInputValue(v)}
      options={options}
      getOptionLabel={(o) => (o?.label || '')}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      disablePortal={false}
      openOnFocus
      ListboxComponent={VirtualizedAutocompleteListbox as any}
      loading={loading}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          error={!!error}
          helperText={helperText}
          fullWidth={fullWidth}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          disabled={disabled}
        />
      )}
    />
  )
}
