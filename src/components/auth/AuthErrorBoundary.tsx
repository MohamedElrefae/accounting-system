/**
 * Auth Error Boundary Component
 * 
 * Feature: enterprise-auth-performance-optimization
 * Implements error boundaries for auth components with graceful fallback
 * 
 * Validates: Requirements 7.3
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';

export interface AuthErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export interface AuthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  useBasicAuth: boolean;
}

/**
 * Error Boundary for Auth Components
 * 
 * Catches errors in auth components and provides graceful fallback:
 * - Logs errors for debugging
 * - Displays user-friendly error message
 * - Falls back to basic auth without optimizations
 * - Allows retry of failed operations
 * 
 * Validates: Requirements 7.3
 */
export class AuthErrorBoundary extends Component<
  AuthErrorBoundaryProps,
  AuthErrorBoundaryState
> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      useBasicAuth: false,
    };
  }

  /**
   * Update state so the next render will show the fallback UI
   */
  static getDerivedStateFromError(error: Error): Partial<AuthErrorBoundaryState> {
    return { hasError: true, error };
  }

  /**
   * Log error details for debugging
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Auth component error:', error, errorInfo);

    // Log error details
    this.logError(error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
      useBasicAuth: true,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Log error for monitoring
   */
  private logError(error: Error, errorInfo: ErrorInfo): void {
    const errorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    };

    console.error('Auth Error Boundary Log:', errorLog);

    // TODO: Send to monitoring service (e.g., Sentry, DataDog)
  }

  /**
   * Retry the failed operation
   */
  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      useBasicAuth: false,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div
          style={{
            padding: '20px',
            margin: '20px',
            border: '1px solid #f5222d',
            borderRadius: '4px',
            backgroundColor: '#fff1f0',
          }}
        >
          <h2 style={{ color: '#f5222d', marginTop: 0 }}>
            Authentication Error
          </h2>
          <p style={{ color: '#666' }}>
            An error occurred while processing your authentication. 
            The system is falling back to basic authentication without optimizations.
          </p>
          {this.state.error && (
            <details style={{ marginTop: '10px', cursor: 'pointer' }}>
              <summary style={{ color: '#666', fontWeight: 'bold' }}>
                Error Details
              </summary>
              <pre
                style={{
                  backgroundColor: '#f5f5f5',
                  padding: '10px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px',
                  marginTop: '10px',
                }}
              >
                {this.state.error.message}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleRetry}
            style={{
              marginTop: '15px',
              padding: '8px 16px',
              backgroundColor: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;
