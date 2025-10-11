import React from 'react'
import { Stack } from '@mui/material'
import type { StackProps } from '@mui/material'

export const FilterBar: React.FC<StackProps> = ({ children, sx, ...rest }) => {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1, ...(sx || {}) }} {...rest}>
      {children}
    </Stack>
  )
}
