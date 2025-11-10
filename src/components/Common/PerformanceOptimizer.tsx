import React, { useEffect, useRef } from 'react';

// Performance optimization utilities
export const PerformanceOptimizer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mountTime = useRef(performance.now());

  useEffect(() => {
    // Log app initialization time
    const initTime = performance.now() - mountTime.current;
    if (import.meta.env.DEV) {
      console.log(`🚀 App initialized in ${initTime.toFixed(2)}ms`);
    }

    // Preload critical resources
    const preloadResources = () => {
      // Preload commonly used MUI components
      import('@mui/material/Button');
      import('@mui/material/TextField');
      import('@mui/material/Typography');
      
      // Preload critical routes after 1 second
      setTimeout(() => {
        import('../../pages/Dashboard');
        import('../../pages/Transactions/Transactions');
      }, 1000);
    };

    preloadResources();

    // Performance monitoring
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          if (import.meta.env.DEV) {
            console.log(`📊 Page load: ${navEntry.loadEventEnd - navEntry.loadEventStart}ms`);
          }
        }
      }
    });

    observer.observe({ entryTypes: ['navigation'] });

    return () => observer.disconnect();
  }, []);

  return <>{children}</>;
};

// HOC for component performance monitoring
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return React.memo((props: P) => {
    const renderStart = useRef(performance.now());

    useEffect(() => {
      const renderTime = performance.now() - renderStart.current;
      if (import.meta.env.DEV && renderTime > 100) {
        console.warn(`🐌 Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
      }
    });

    return <Component {...props} />;
  });
};

// Optimized Suspense wrapper with better loading states
export const OptimizedSuspense: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => {
  const defaultFallback = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
      fontSize: '14px',
      color: '#666'
    }}>
      Loading...
    </div>
  );

  return (
    <React.Suspense fallback={fallback || defaultFallback}>
      {children}
    </React.Suspense>
  );
};

export default PerformanceOptimizer;