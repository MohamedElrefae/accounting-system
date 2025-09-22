import React from 'react'
import { Box, CircularProgress } from '@mui/material'

export const LoadingOverlay: React.FC<{ loading: boolean; height?: number }> = ({ loading, height = 200 }) => {
  if (!loading) return null
  return (
    <Box sx={{ position: 'relative', height }}>
      <Box sx={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.6)', zIndex: 1,
      }}>
        <CircularProgress size={28} />
      </Box>
    </Box>
  )
}