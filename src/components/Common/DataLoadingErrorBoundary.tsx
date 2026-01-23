import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class DataLoadingErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DataLoadingErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to monitoring service if available
    const w = window as any;
    if (w?.monitoring?.send) {
      w.monitoring.send('client_error', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: Date.now(),
        url: window.location.href
      });
    }
  }

  handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      // Show permanent error instead of hard reload
      console.warn('[DataLoadingErrorBoundary] Max retries exceeded, showing permanent error');
      return;
    }

    // Clear any existing retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts = [];

    // Increment retry count and reset error state
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));

    // Set a timeout to show error again if retry fails
    const timeout = setTimeout(() => {
      this.setState(prevState => ({
        hasError: true,
        retryCount: prevState.retryCount
      }));
    }, 5000);

    this.retryTimeouts.push(timeout);
  };

  handleHardReset = () => {
    // Clear all caches and storage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
    
    // Hard reload
    window.location.reload();
  };

  componentWillUnmount() {
    // Clean up retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback component if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="400px"
          p={3}
          textAlign="center"
        >
          <Alert severity="error" sx={{ mb: 2, maxWidth: 600 }}>
            <Typography variant="h6" gutterBottom>
              فشل تحميل البيانات
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              حدث خطأ أثناء تحميل البيانات الأساسية. هذا قد يكون بسبب مشكلة مؤقتة في الاتصال بالإنترنت أو خادم التطبيق.
            </Typography>
            
            {import.meta.env.DEV && this.state.error && (
              <Box sx={{ textAlign: 'left', mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="caption" component="pre" sx={{ fontSize: '0.7rem', overflow: 'auto' }}>
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack}
                </Typography>
              </Box>
            )}
            
            <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
                disabled={this.state.retryCount >= this.maxRetries}
              >
                {this.state.retryCount >= this.maxRetries ? 'تجاوز الحد الأقصى للمحاولات' : `إعادة المحاولة (${this.state.retryCount + 1}/${this.maxRetries})`}
              </Button>
              
              <Button
                variant="outlined"
                onClick={this.handleHardReset}
                color="warning"
              >
                إعادة تعيين وتحديث
              </Button>
            </Box>
          </Alert>
          
          {this.state.retryCount < this.maxRetries && (
            <Box sx={{ mt: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="caption" sx={{ ml: 1 }}>
                جاري إعادة المحاولة...
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}

export default DataLoadingErrorBoundary;
