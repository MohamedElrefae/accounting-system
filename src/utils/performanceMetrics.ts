// Advanced Performance Metrics Collection and Analysis

import React from 'react';
import { ApplicationPerformanceMonitor } from '../services/ApplicationPerformanceMonitor';

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
  private cleanupFns: Array<() => void> = [];

  constructor() {
    this.initializeObservers();
    this.trackVitals();
  }

  private getNetworkTier(): 'fast' | 'medium' | 'slow' {
    try {
      const connection = (navigator as any)?.connection;
      const effectiveType = String(connection?.effectiveType || '').toLowerCase();
      if (effectiveType.includes('2g') || effectiveType.includes('slow-2g') || effectiveType.includes('3g')) return 'slow';
      if (effectiveType.includes('4g')) return 'fast';

      const downlink = Number(connection?.downlink || 0);
      const rtt = Number(connection?.rtt || 0);
      if ((downlink > 0 && downlink < 1.2) || (rtt > 0 && rtt >= 350)) return 'slow';
      if ((downlink > 0 && downlink < 3) || (rtt > 0 && rtt >= 200)) return 'medium';
      return 'medium';
    } catch {
      return 'medium';
    }
  }

  private getWarnThresholdMs(name: string): number {
    const tier = this.getNetworkTier();
    if (name === 'largest_contentful_paint') {
      return tier === 'slow' ? 12000 : tier === 'medium' ? 6000 : 3500;
    }
    if (name === 'first_contentful_paint' || name === 'first_paint') {
      return tier === 'slow' ? 9000 : tier === 'medium' ? 5000 : 4000;
    }
    if (name === 'time_to_first_byte') {
      return tier === 'slow' ? 2500 : tier === 'medium' ? 1500 : 900;
    }
    if (name === 'resource_load_time') {
      return tier === 'slow' ? 4000 : tier === 'medium' ? 2500 : 1500;
    }
    return tier === 'slow' ? 2500 : tier === 'medium' ? 1500 : 1000;
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

            const ttfbStart = navEntry.requestStart || navEntry.fetchStart;
            this.recordMetric('time_to_first_byte', navEntry.responseStart - ttfbStart);
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

      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          const paintName = entry?.name;
          if (paintName === 'first-paint') {
            this.recordMetric('first_paint', entry.startTime);
          } else if (paintName === 'first-contentful-paint') {
            this.recordMetric('first_contentful_paint', entry.startTime);
          }
        }
      });

      try {
        paintObserver.observe({ type: 'paint', buffered: true } as any);
      } catch {
        paintObserver.observe({ entryTypes: ['paint'] } as any);
      }
      this.observers.push(paintObserver);

      // Track largest contentful paint
      let lastLcp: PerformanceEntry | null = null;
      let lcpRecorded = false;

      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          lastLcp = entry;
        }
      });

      try {
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true } as any);
      } catch {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      }
      this.observers.push(lcpObserver);

      const finalizeLcp = () => {
        if (lcpRecorded) return;
        lcpRecorded = true;
        if (lastLcp) {
          this.recordMetric('largest_contentful_paint', lastLcp.startTime);
        }
        try { lcpObserver.disconnect(); } catch { }
      };

      const onVisibility = () => {
        if (document.visibilityState === 'hidden') finalizeLcp();
      };

      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('pagehide', finalizeLcp);
      const lcpTimer = window.setTimeout(finalizeLcp, 10000);
      this.cleanupFns.push(() => {
        try { window.clearTimeout(lcpTimer); } catch { }
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('pagehide', finalizeLcp);
      });

      // Track first input delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const e = entry as unknown as PerformanceEventTiming;
          const processingStart = typeof e.processingStart === 'number' ? e.processingStart : e.startTime;
          this.recordMetric('first_input_delay', processingStart - e.startTime);
        }
      });

      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // Track cumulative layout shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          // Ignore shifts caused by user input
          if (entry && entry.hadRecentInput) continue;
          clsValue += entry?.value || 0;
        }
        this.recordMetric('cumulative_layout_shift', clsValue);
      });

      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
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
      const warnThreshold = this.getWarnThresholdMs(name);
      const infoThreshold = Math.max(100, Math.min(1000, warnThreshold * 0.5));

      if (value > warnThreshold) {
        console.warn(`🐌 Slow ${name}: ${value.toFixed(2)}ms${tagStr}`);
      } else if (value > infoThreshold) {
        console.log(`⚠️ ${name}: ${value.toFixed(2)}ms${tagStr}`);
      } else {
        console.log(`✅ ${name}: ${value.toFixed(2)}ms${tagStr}`);
      }
    }

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    const w = window as any;
    if (w?.analytics?.track) {
      w.analytics.track('PerformanceMetric', metric);
    }
    if (w?.monitoring?.send) {
      w.monitoring.send('performance', metric);
    }

    ApplicationPerformanceMonitor.record(metric.name, metric.value);
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
    this.cleanupFns.forEach(fn => {
      try { fn(); } catch { }
    });
    this.cleanupFns = [];
    this.metrics = [];
    this.startTimes.clear();
  }
}

// Global performance tracker instance
export const performanceTracker = new PerformanceTracker();

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