// Advanced Performance Metrics Collection and Analysis

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'timing' | 'counter' | 'gauge';
  tags?: Record<string, string>;
}

class PerformanceTracker {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private startTimes: Map<string, number> = new Map();

  constructor() {
    this.initializeObservers();
    this.trackVitals();
  }

  private initializeObservers() {
    // Track navigation timing
    if ('PerformanceObserver' in window) {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric('page_load_time', navEntry.loadEventEnd - navEntry.loadEventStart);
            this.recordMetric('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart);
            this.recordMetric('first_paint', navEntry.loadEventStart - navEntry.fetchStart);
          }
        }
      });
      
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // Track resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            if (resourceEntry.name.includes('.js') || resourceEntry.name.includes('.css')) {
              this.recordMetric('resource_load_time', resourceEntry.responseEnd - resourceEntry.requestStart, {
                resource: resourceEntry.name.split('/').pop() || 'unknown'
              });
            }
          }
        }
      });
      
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // Track largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('largest_contentful_paint', entry.startTime);
        }
      });
      
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // Track first input delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('first_input_delay', entry.processingStart - entry.startTime);
        }
      });
      
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    }
  }

  private trackVitals() {
    // Track memory usage if available
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.recordMetric('memory_used', memory.usedJSHeapSize / 1024 / 1024, { unit: 'MB' });
        this.recordMetric('memory_total', memory.totalJSHeapSize / 1024 / 1024, { unit: 'MB' });
      }, 30000); // Every 30 seconds
    }

    // Track connection info
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.recordMetric('connection_downlink', connection.downlink, { unit: 'Mbps' });
      this.recordMetric('connection_rtt', connection.rtt, { unit: 'ms' });
    }
  }

  // Start timing a custom metric
  startTiming(name: string) {
    this.startTimes.set(name, performance.now());
  }

  // End timing and record the metric
  endTiming(name: string, tags?: Record<string, string>) {
    const startTime = this.startTimes.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, tags);
      this.startTimes.delete(name);
      return duration;
    }
    return 0;
  }

  // Record a custom metric
  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      type: 'timing',
      tags
    };

    this.metrics.push(metric);

    // Log in development
    if (import.meta.env.DEV) {
      const tagStr = tags ? ` (${Object.entries(tags).map(([k, v]) => `${k}:${v}`).join(', ')})` : '';
      if (value > 1000) {
        console.warn(`🐌 Slow ${name}: ${value.toFixed(2)}ms${tagStr}`);
      } else if (value > 100) {
        console.log(`⚠️ ${name}: ${value.toFixed(2)}ms${tagStr}`);
      } else {
        console.log(`✅ ${name}: ${value.toFixed(2)}ms${tagStr}`);
      }
    }

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  // Get performance summary
  getSummary() {
    const summary: Record<string, { avg: number; min: number; max: number; count: number }> = {};

    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = { avg: 0, min: Infinity, max: -Infinity, count: 0 };
      }

      const s = summary[metric.name];
      s.count++;
      s.min = Math.min(s.min, metric.value);
      s.max = Math.max(s.max, metric.value);
      s.avg = (s.avg * (s.count - 1) + metric.value) / s.count;
    });

    return summary;
  }

  // Get recent metrics
  getRecentMetrics(minutes: number = 5) {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  // Export metrics for analysis
  exportMetrics() {
    return {
      summary: this.getSummary(),
      recent: this.getRecentMetrics(),
      all: this.metrics
    };
  }

  // Clean up observers
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
    this.startTimes.clear();
  }
}

// Global performance tracker instance
export const performanceTracker = new PerformanceTracker();

import React from 'react';

// React hook for component performance tracking
export const usePerformanceTracking = (componentName: string) => {
  React.useEffect(() => {
    performanceTracker.startTiming(`${componentName}_mount`);
    
    return () => {
      performanceTracker.endTiming(`${componentName}_mount`);
    };
  }, [componentName]);

  const trackAction = React.useCallback((actionName: string, fn: () => void | Promise<void>) => {
    performanceTracker.startTiming(`${componentName}_${actionName}`);
    
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        performanceTracker.endTiming(`${componentName}_${actionName}`);
      });
    } else {
      performanceTracker.endTiming(`${componentName}_${actionName}`);
      return result;
    }
  }, [componentName]);

  return { trackAction };
};

export default performanceTracker;