// Web Vitals Performance Monitoring
// Tracks Core Web Vitals metrics for performance optimization

import { trackPerformanceMetric } from './errorTracking';

type MetricRating = 'good' | 'needs-improvement' | 'poor';

interface WebVitalMetric {
  name: string;
  value: number;
  rating: MetricRating;
  delta: number;
  id: string;
  navigationType: string;
}

// Thresholds for Core Web Vitals (based on Google's recommendations)
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },      // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 },     // First Contentful Paint (ms)
  FID: { good: 100, poor: 300 },       // First Input Delay (ms)
  INP: { good: 200, poor: 500 },       // Interaction to Next Paint (ms)
  LCP: { good: 2500, poor: 4000 },     // Largest Contentful Paint (ms)
  TTFB: { good: 800, poor: 1800 },     // Time to First Byte (ms)
};

// Get rating based on metric value
const getRating = (name: string, value: number): MetricRating => {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
};

// Send metric to analytics endpoint
const sendToAnalytics = (metric: WebVitalMetric): void => {
  // Log to console in development
  if (import.meta.env.DEV) {
    const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(`[WebVitals] ${emoji} ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);
  }
  
  // Track via error tracking utility
  trackPerformanceMetric({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
  });
  
  // Send to Vercel Analytics if available
  if (typeof window !== 'undefined' && (window as any).va) {
    (window as any).va('event', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
    });
  }
  
  // Send to custom analytics endpoint if configured
  const analyticsEndpoint = import.meta.env.VITE_VITALS_ENDPOINT;
  if (analyticsEndpoint) {
    const body = {
      dsn: import.meta.env.VITE_ANALYTICS_ID || 'accounting-system',
      id: metric.id,
      page: window.location.pathname,
      href: window.location.href,
      event_name: metric.name,
      value: metric.value.toString(),
      rating: metric.rating,
      speed: getConnectionSpeed(),
      timestamp: Date.now(),
    };
    
    // Use sendBeacon for reliability
    if (navigator.sendBeacon) {
      navigator.sendBeacon(analyticsEndpoint, JSON.stringify(body));
    } else {
      fetch(analyticsEndpoint, {
        method: 'POST',
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {
        // Silently fail
      });
    }
  }
};

// Get connection speed if available
const getConnectionSpeed = (): string | undefined => {
  if ('connection' in navigator) {
    const conn = (navigator as any).connection;
    return conn?.effectiveType;
  }
  return undefined;
};

// Initialize Web Vitals monitoring
export const initWebVitals = async (): Promise<void> => {
  // Only run in browser
  if (typeof window === 'undefined') return;
  
  try {
    // Dynamically import web-vitals to avoid bundle bloat
    const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;
    const { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } = await dynamicImport('web-vitals');
    
    // Create handler that adds rating
    const handleMetric = (metric: any) => {
      const rating = getRating(metric.name, metric.value);
      sendToAnalytics({
        ...metric,
        rating,
      });
    };
    
    // Register all Core Web Vitals
    onCLS(handleMetric);
    onFCP(handleMetric);
    onFID(handleMetric);
    onINP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
    
    console.log('[WebVitals] Performance monitoring initialized');
  } catch {
    // web-vitals package not installed - that's okay
    console.log('[WebVitals] web-vitals package not available - install with: npm install web-vitals');
  }
};

// Manual performance mark
export const markPerformance = (name: string): void => {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
};

// Measure between two marks
export const measurePerformance = (name: string, startMark: string, endMark?: string): number | null => {
  if (typeof performance === 'undefined' || !performance.measure) return null;
  
  try {
    const end = endMark || `${startMark}-end`;
    if (!endMark) performance.mark(end);
    
    const measure = performance.measure(name, startMark, end);
    
    if (import.meta.env.DEV) {
      console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
    }
    
    return measure.duration;
  } catch {
    return null;
  }
};

// Track component render time
export const trackComponentRender = (componentName: string, renderTime: number): void => {
  if (import.meta.env.DEV) {
    const rating: MetricRating = renderTime < 16 ? 'good' : renderTime < 50 ? 'needs-improvement' : 'poor';
    const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(`[Render] ${emoji} ${componentName}: ${renderTime.toFixed(2)}ms`);
  }
};

// Export for use in main.tsx
export default {
  initWebVitals,
  markPerformance,
  measurePerformance,
  trackComponentRender,
};
