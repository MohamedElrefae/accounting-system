import React from 'react'
import { Button, Typography, Box, Alert, AlertTitle } from '@mui/material'
import { useNavigate } from 'react-router-dom'

const InventoryErrorFallback: React.FC<{ error?: Error }> = ({ error }) => {
  const navigate = useNavigate()
  
  const handleRetry = () => {
    // Try to reload the inventory module
    navigate('/inventory', { replace: true })
    window.location.reload()
  }
  
  const handleGoHome = () => {
    navigate('/')
  }
  
  return (
    <Box 
      sx={{ 
        padding: '2rem',
        maxWidth: '600px',
        margin: '0 auto'
      }}
      role="alert"
      aria-live="assertive"
    >
      <Alert 
        severity="error"
        sx={{ 
          marginBottom: '1.5rem',
          borderRadius: '8px'
        }}
      >
        <AlertTitle>خطأ في تحميل نظام المخزون</AlertTitle>
        <Typography variant="body1">
          {error ? error.message : 'حدث خطأ أثناء تحميل نظام المخزون. يرجى المحاولة مرة أخرى.'}
        </Typography>
      </Alert>
      
      <Typography variant="body2" sx={{ marginBottom: '1.5rem', color: 'text.secondary' }}>
        Error loading inventory management system. This may be due to network issues or temporary system problems.
      </Typography>
      
      <Box sx={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <Button 
          variant="contained"
          color="primary"
          onClick={handleRetry}
          aria-label="Retry loading inventory"
        >
          إعادة المحاولة
        </Button>
        <Button 
          variant="outlined"
          onClick={handleGoHome}
          aria-label="Go to home page"
        >
          العودة للصفحة الرئيسية
        </Button>
      </Box>
      
      {error && (
        <Box sx={{ 
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: 'background.paper',
          borderRadius: '4px',
          fontSize: '0.875rem',
          color: 'text.secondary',
          overflow: 'auto',
          maxHeight: '200px'
        }}>
          <Typography variant="caption" display="block" gutterBottom>
            Error Details:
          </Typography>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {error.toString()}
            {error.stack && `
${error.stack}`}
          </pre>
        </Box>
      )}
    </Box>
  )
}

export default InventoryErrorFallback