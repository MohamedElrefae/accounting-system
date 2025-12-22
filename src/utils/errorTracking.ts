// Error Tracking and Monitoring Utilities
// Integrates with Sentry for production error tracking

// Note: To enable Sentry, install the package and set VITE_SENTRY_DSN environment variable
// npm install @sentry/react

interface ErrorContext {
  userId?: string;
  orgId?: string;
  action?: string;
  component?: string;
  extra?: Record<string, unknown>;
}

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

// Check if Sentry is available and should be active
const isSentryEnabled = (): boolean => {
  // Only enable Sentry if DSN is set AND we are NOT in development
  // This prevents ad-blockers from cluttering the console with ERR_BLOCKED_BY_CLIENT
  return !!(import.meta.env.VITE_SENTRY_DSN && typeof window !== 'undefined' && import.meta.env.PROD);
};

// Initialize error tracking (call this in main.tsx)
export const initErrorTracking = async (): Promise<void> => {
  if (!isSentryEnabled()) {
    console.log('[ErrorTracking] Sentry DSN not configured - error tracking disabled');
    return;
  }

  try {
    const Sentry = await import('@sentry/react');
    
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',
      
      // Performance monitoring
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in prod, 100% in dev
      
      // Session replay for debugging
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
      
      // Filter out non-critical errors
      beforeSend(event) {
        // Don't send errors in development
        if (import.meta.env.DEV) {
          console.log('[Sentry] Would send event:', event);
          return null;
        }
        
        // Filter out known non-critical errors
        const message = event.exception?.values?.[0]?.value || '';
        if (
          message.includes('ResizeObserver loop') ||
          message.includes('Network request failed') ||
          message.includes('Load failed')
        ) {
          return null;
        }
        
        return event;
      },
      
      // Integrations
      integrations: [
        Sentry.browserTracingIntegration({
          // Trace all requests to Supabase
          tracePropagationTargets: [
            'localhost',
            /^https:\/\/.*\.supabase\.co/,
          ],
        }),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
    });
    
    console.log('[ErrorTracking] Sentry initialized successfully');
  } catch (error) {
    console.warn('[ErrorTracking] Failed to initialize Sentry:', error);
  }
};

// Capture exception with context
export const captureException = async (
  error: Error | unknown,
  context?: ErrorContext
): Promise<void> => {
  // Always log to console
  console.error('[Error]', error, context);
  
  if (!isSentryEnabled()) return;
  
  try {
    const Sentry = await import('@sentry/react');
    
    Sentry.withScope((scope) => {
      if (context?.userId) scope.setUser({ id: context.userId });
      if (context?.orgId) scope.setTag('org_id', context.orgId);
      if (context?.action) scope.setTag('action', context.action);
      if (context?.component) scope.setTag('component', context.component);
      if (context?.extra) scope.setExtras(context.extra);
      
      Sentry.captureException(error);
    });
  } catch (e) {
    console.warn('[ErrorTracking] Failed to capture exception:', e);
  }
};

// Capture message (for non-error events)
export const captureMessage = async (
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: ErrorContext
): Promise<void> => {
  console.log(`[${level.toUpperCase()}]`, message, context);
  
  if (!isSentryEnabled()) return;
  
  try {
    const Sentry = await import('@sentry/react');
    
    Sentry.withScope((scope) => {
      if (context?.userId) scope.setUser({ id: context.userId });
      if (context?.orgId) scope.setTag('org_id', context.orgId);
      if (context?.action) scope.setTag('action', context.action);
      if (context?.extra) scope.setExtras(context.extra);
      
      Sentry.captureMessage(message, level);
    });
  } catch (e) {
    console.warn('[ErrorTracking] Failed to capture message:', e);
  }
};

// Set user context for all future events
export const setUserContext = async (user: {
  id: string;
  email?: string;
  orgId?: string;
  role?: string;
} | null): Promise<void> => {
  if (!isSentryEnabled()) return;
  
  try {
    const Sentry = await import('@sentry/react');
    
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
      });
      if (user.orgId) Sentry.setTag('org_id', user.orgId);
      if (user.role) Sentry.setTag('user_role', user.role);
    } else {
      Sentry.setUser(null);
    }
  } catch (e) {
    console.warn('[ErrorTracking] Failed to set user context:', e);
  }
};

// Track performance metric
export const trackPerformanceMetric = (metric: PerformanceMetric): void => {
  console.log(`[Performance] ${metric.name}: ${metric.value}ms (${metric.rating})`);
  
  // Send to analytics if configured
  if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
    try {
      navigator.sendBeacon?.(
        import.meta.env.VITE_ANALYTICS_ENDPOINT,
        JSON.stringify({
          type: 'performance',
          ...metric,
          timestamp: Date.now(),
          url: window.location.href,
        })
      );
    } catch {
      // Silently fail
    }
  }
};

// Create error boundary wrapper component
export const createErrorBoundary = async () => {
  if (!isSentryEnabled()) {
    // Return a simple error boundary if Sentry is not available
    return null;
  }
  
  try {
    const Sentry = await import('@sentry/react');
    return Sentry.ErrorBoundary;
  } catch {
    return null;
  }
};

// Export for use in components
export default {
  initErrorTracking,
  captureException,
  captureMessage,
  setUserContext,
  trackPerformanceMetric,
};
