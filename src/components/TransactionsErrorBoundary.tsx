import React, { ReactNode } from 'react'
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export default class TransactionsErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[TransactionsErrorBoundary] error:', error)
    console.error('[TransactionsErrorBoundary] info:', errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Paper sx={{ width: '100%', maxWidth: 720, p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              حدث خطأ أثناء تحميل صفحة القيود
            </Typography>
            <Alert severity="error">
              {this.state.error?.message || 'حدث خطأ غير متوقع'}
            </Alert>
            <Button variant="contained" onClick={this.handleReload}>
              إعادة تحميل الصفحة
            </Button>
            {this.state.error?.stack ? (
              <Box component="details">
                <Box component="summary" sx={{ cursor: 'pointer' }}>
                  تفاصيل تقنية
                </Box>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    mt: 1,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'monospace',
                    fontSize: 12,
                  }}
                >
                  {this.state.error.stack}
                </Box>
              </Box>
            ) : null}
          </Stack>
        </Paper>
      </Box>
    )
  }
}
