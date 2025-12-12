import React from 'react'
import { Box, Paper, Stack, Typography, Button } from '@mui/material'

interface TransactionsErrorFallbackProps {
  title: string
  message?: string
  onRetry?: () => void
  variant?: 'page' | 'section'
}

const TransactionsErrorFallback: React.FC<TransactionsErrorFallbackProps> = ({
  title,
  message = 'حدث خلل غير متوقع أثناء عرض هذه الوحدة.',
  onRetry,
  variant = 'section',
}) => {
  const isPage = variant === 'page'

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: isPage ? '70vh' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: isPage ? 4 : 2,
        direction: 'rtl',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: '100%',
          maxWidth: isPage ? 640 : '100%',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'error.light',
          p: 3,
          background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.08), rgba(255, 255, 255, 0.9))',
        }}
      >
        <Stack spacing={2}>
          <Typography variant={isPage ? 'h5' : 'subtitle1'} fontWeight="bold" color="error.main">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
          {onRetry && (
            <Box>
              <Button
                variant="contained"
                color="error"
                onClick={() => onRetry()}
                sx={{ borderRadius: 2, px: 3 }}
              >
                إعادة المحاولة
              </Button>
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  )
}

export default TransactionsErrorFallback
