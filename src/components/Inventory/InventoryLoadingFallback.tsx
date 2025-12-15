import React from 'react'
import { CircularProgress, Typography, Box } from '@mui/material'

const InventoryLoadingFallback: React.FC = () => {
  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        padding: '2rem',
        textAlign: 'center'
      }}
      role="status"
      aria-live="polite"
    >
      <CircularProgress 
        size={50}
        thickness={4}
        sx={{ color: 'primary.main' }}
        aria-label="Loading inventory module"
      />
      <Typography 
        variant="body1"
        sx={{ 
          marginTop: '1.5rem',
          color: 'text.secondary',
          fontWeight: 'medium'
        }}
        aria-live="polite"
      >
        جاري تحميل نظام المخزون...
      </Typography>
      <Typography 
        variant="body2"
        sx={{ 
          marginTop: '0.5rem',
          color: 'text.disabled'
        }}
      >
        Loading inventory management system...
      </Typography>
    </Box>
  )
}

export default InventoryLoadingFallback