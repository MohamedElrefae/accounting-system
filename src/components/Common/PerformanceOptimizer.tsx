import React, { useEffect, useRef, useState } from 'react';
import { CircularProgress, LinearProgress, Typography } from '@mui/material';

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

// Enhanced loading indicator with progressive updates and accessibility
export const EnhancedLoader: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Initializing...");
  const startTime = useRef(performance.now());
  
  useEffect(() => {
    const messages = [
      "Loading core components...",
      "Fetching user data...", 
      "Preparing interface...",
      "Almost ready..."
    ];
    
    // Calculate adaptive timing based on predicted load duration
    const predictedLoadTime = 2500; // ms - adjust based on analytics
    const interval = predictedLoadTime / messages.length;
    
    messages.forEach((msg, index) => {
      const delay = index * interval;
      
      // Use requestIdleCallback for non-critical updates
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          setTimeout(() => {
            setMessage(msg);
            setProgress((index + 1) * 25);
          }, delay);
        }, { timeout: 100 });
      } else {
        setTimeout(() => {
          setMessage(msg);
          setProgress((index + 1) * 25);
        }, delay);
      }
    });
    
    return () => {
      // Cleanup any pending timeouts
    };
  }, []);
  
  return (
    <div 
      style={{ textAlign: 'center', padding: '2rem' }}
      role="status"
      aria-live="polite"
    >
      <CircularProgress 
        variant="determinate" 
        value={progress}
        size={60}
        aria-label="Loading progress"
      />
      <Typography 
        variant="body2" 
        style={{ marginTop: '1rem' }}
        aria-live="polite"
      >
        {message}
      </Typography>
      <LinearProgress 
        variant="determinate" 
        value={progress}
        style={{ marginTop: '1rem', width: '200px' }}
        aria-hidden="true"
      />
    </div>
  );
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