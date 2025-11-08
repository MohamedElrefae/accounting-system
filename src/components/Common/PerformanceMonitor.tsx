import React, { useEffect } from 'react';

interface PerformanceMonitorProps {
  componentName: string;
  children: React.ReactNode;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  componentName, 
  children 
}) => {
  useEffect(() => {
    if (import.meta.env.DEV) {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        if (renderTime > 100) { // Log slow renders (>100ms)
          console.warn(`🐌 Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
        }
      };
    }
  }, [componentName]);

  return <>{children}</>;
};

export default PerformanceMonitor;