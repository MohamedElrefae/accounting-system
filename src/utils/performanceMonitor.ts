export class PerformanceMonitor {
  private static measurements: { [key: string]: number } = {};

  static startMeasure(name: string) {
    this.measurements[name] = performance.now();
    if (import.meta.env.DEV) {
      console.log(`⏱️ Started measuring: ${name}`);
    }
  }

  static endMeasure(name: string) {
    const start = this.measurements[name];
    if (start) {
      const duration = performance.now() - start;
      if (import.meta.env.DEV) {
        console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
      }
      delete this.measurements[name];
      return duration;
    }
    return 0;
  }

  static measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasure(name);
    return fn().finally(() => this.endMeasure(name));
  }

  static logPageLoad() {
    // Log Core Web Vitals (dev only)
    if (import.meta.env.DEV && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      console.log('📊 Performance Metrics:');
      console.log(`🎯 DOM Content Loaded: ${navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart}ms`);
      console.log(`🎯 Page Load Complete: ${navigation.loadEventEnd - navigation.loadEventStart}ms`);
      console.log(`🎯 Time to Interactive: ${navigation.domInteractive - navigation.navigationStart}ms`);
    }
  }
}

// Auto-log page performance when DOM is ready (dev only)
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.addEventListener('load', () => {
    setTimeout(() => PerformanceMonitor.logPageLoad(), 100);
  });
}
