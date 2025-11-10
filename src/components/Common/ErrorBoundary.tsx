import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console
    console.error('❌ ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ 
          padding: '20px', 
          border: '2px solid #ff6b6b', 
          borderRadius: '8px',
          backgroundColor: '#ffe0e0',
          margin: '20px',
          direction: 'rtl'
        }}>
          <h2 style={{ color: '#d63031', margin: '0 0 10px 0' }}>
            ❌ حدث خطأ في عرض المكون
          </h2>
          <p style={{ margin: '0 0 15px 0' }}>
            Component Error: Something went wrong while rendering this component.
          </p>
          
          <details style={{ marginBottom: '15px' }}>
            <summary style={{ 
              cursor: 'pointer', 
              padding: '5px 0',
              fontWeight: 'bold'
            }}>
              📋 تفاصيل الخطأ (Error Details)
            </summary>
            
            <div style={{ 
              marginTop: '10px', 
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}>
              <div><strong>Error:</strong> {this.state.error?.toString()}</div>
              <div style={{ marginTop: '10px' }}>
                <strong>Component Stack:</strong>
                <pre style={{ 
                  margin: '5px 0', 
                  whiteSpace: 'pre-wrap',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            </div>
          </details>
          
          <button 
            onClick={() => {
              try {
                // SPA-friendly: re-navigate to current path to remount routes without full page reload
                window.history.pushState({}, '', window.location.pathname + window.location.search + window.location.hash)
                window.dispatchEvent(new PopStateEvent('popstate'))
              } catch {
                // Fallback: controlled reload only if navigation fails
                window.location.reload()
              }
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#d63031',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 إعادة المحاولة (Retry)
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
