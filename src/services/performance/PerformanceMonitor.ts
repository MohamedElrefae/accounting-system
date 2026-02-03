/**
 * Real-time Performance Monitoring Service
 * 
 * Tracks and monitors authentication performance metrics including:
 * - Auth operation execution times
 * - Cache hit rates
 * - Query counts
 * - Performance regressions
 * - Real-time alerting
 */

export interface PerformanceMetric {
  functionName: string;
  userId: string;
  executionTimeMs: number;
  queryCount?: number;
  cacheHit?: boolean;
  timestamp: Date;
  status: 'success' | 'error';
  errorMessage?: string;
}

export interface PerformanceStats {
  totalCalls: number;
  avgExecutionTimeMs: number;
  maxExecutionTimeMs: number;
  minExecutionTimeMs: number;
  p95ExecutionTimeMs: number;
  p99ExecutionTimeMs: number;
  cacheHitRate: number;
  errorRate: number;
  timestamp: Date;
}

export interface PerformanceAlert {
  id: string;
  type: 'regression' | 'threshold_exceeded' | 'error_spike';
  severity: 'warning' | 'critical';
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
}

export interface PerformanceBaseline {
  functionName: string;
  avgExecutionTimeMs: number;
  p95ExecutionTimeMs: number;
  cacheHitRate: number;
  queryCount: number;
  lastUpdated: Date;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private alerts: PerformanceAlert[] = [];
  private maxMetricsSize = 10000;
  private regressionThreshold = 1.2; // 20% increase triggers alert
  private executionTimeThreshold = 150; // ms
  private errorRateThreshold = 0.05; // 5%
  private listeners: Set<(alert: PerformanceAlert) => void> = new Set();

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep metrics array bounded
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }

    // Check for regressions and threshold violations
    this.checkForAnomalies(metric);
  }

  /**
   * Get performance statistics for a function
   */
  getStats(functionName: string, windowMs: number = 3600000): PerformanceStats {
    const now = Date.now();
    const windowStart = now - windowMs;

    const relevantMetrics = this.metrics.filter(
      m => m.functionName === functionName && m.timestamp.getTime() >= windowStart
    );

    if (relevantMetrics.length === 0) {
      return {
        totalCalls: 0,
        avgExecutionTimeMs: 0,
        maxExecutionTimeMs: 0,
        minExecutionTimeMs: 0,
        p95ExecutionTimeMs: 0,
        p99ExecutionTimeMs: 0,
        cacheHitRate: 0,
        errorRate: 0,
        timestamp: new Date(),
      };
    }

    const executionTimes = relevantMetrics
      .filter(m => m.status === 'success')
      .map(m => m.executionTimeMs)
      .sort((a, b) => a - b);

    const cacheHits = relevantMetrics.filter(m => m.cacheHit === true).length;
    const errors = relevantMetrics.filter(m => m.status === 'error').length;

    return {
      totalCalls: relevantMetrics.length,
      avgExecutionTimeMs: executionTimes.length > 0
        ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
        : 0,
      maxExecutionTimeMs: executionTimes.length > 0 ? executionTimes[executionTimes.length - 1] : 0,
      minExecutionTimeMs: executionTimes.length > 0 ? executionTimes[0] : 0,
      p95ExecutionTimeMs: this.percentile(executionTimes, 0.95),
      p99ExecutionTimeMs: this.percentile(executionTimes, 0.99),
      cacheHitRate: relevantMetrics.length > 0 ? (cacheHits / relevantMetrics.length) * 100 : 0,
      errorRate: (errors / relevantMetrics.length) * 100,
      timestamp: new Date(),
    };
  }

  /**
   * Get all performance statistics
   */
  getAllStats(windowMs: number = 3600000): Map<string, PerformanceStats> {
    const functionNames = new Set(this.metrics.map(m => m.functionName));
    const stats = new Map<string, PerformanceStats>();

    functionNames.forEach(name => {
      stats.set(name, this.getStats(name, windowMs));
    });

    return stats;
  }

  /**
   * Set performance baseline for a function
   */
  setBaseline(functionName: string, baseline: PerformanceBaseline): void {
    this.baselines.set(functionName, baseline);
  }

  /**
   * Get performance baseline
   */
  getBaseline(functionName: string): PerformanceBaseline | undefined {
    return this.baselines.get(functionName);
  }

  /**
   * Check for performance anomalies
   */
  private checkForAnomalies(metric: PerformanceMetric): void {
    if (metric.status === 'error') {
      return; // Don't check errors for performance anomalies
    }

    const baseline = this.baselines.get(metric.functionName);

    // Check for regression
    if (baseline && metric.executionTimeMs > baseline.avgExecutionTimeMs * this.regressionThreshold) {
      this.createAlert({
        type: 'regression',
        severity: 'warning',
        message: `Performance regression detected for ${metric.functionName}`,
        metric: metric.functionName,
        currentValue: metric.executionTimeMs,
        threshold: baseline.avgExecutionTimeMs * this.regressionThreshold,
      });
    }

    // Check for threshold exceeded
    if (metric.executionTimeMs > this.executionTimeThreshold) {
      this.createAlert({
        type: 'threshold_exceeded',
        severity: 'warning',
        message: `Execution time exceeded threshold for ${metric.functionName}`,
        metric: metric.functionName,
        currentValue: metric.executionTimeMs,
        threshold: this.executionTimeThreshold,
      });
    }

    // Check for error spike
    const recentMetrics = this.metrics.filter(
      m => m.functionName === metric.functionName &&
           m.timestamp.getTime() > Date.now() - 60000 // Last 60 seconds
    );

    const errorRate = recentMetrics.filter(m => m.status === 'error').length / recentMetrics.length;
    if (errorRate > this.errorRateThreshold) {
      this.createAlert({
        type: 'error_spike',
        severity: 'critical',
        message: `Error spike detected for ${metric.functionName}`,
        metric: metric.functionName,
        currentValue: errorRate * 100,
        threshold: this.errorRateThreshold * 100,
      });
    }
  }

  /**
   * Create a performance alert
   */
  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      acknowledged: false,
      ...alertData,
    };

    this.alerts.push(alert);

    // Keep alerts bounded
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(alert));
  }

  /**
   * Get active alerts
   */
  getAlerts(acknowledged: boolean = false): PerformanceAlert[] {
    return this.alerts.filter(a => a.acknowledged === acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * Subscribe to performance alerts
   */
  onAlert(listener: (alert: PerformanceAlert) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Clear all metrics and alerts
   */
  clear(): void {
    this.metrics = [];
    this.alerts = [];
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil(sortedArray.length * p) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(functionName?: string): PerformanceMetric[] {
    if (functionName) {
      return this.metrics.filter(m => m.functionName === functionName);
    }
    return [...this.metrics];
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalMetrics: number;
    totalAlerts: number;
    activeAlerts: number;
    functions: string[];
    timestamp: Date;
  } {
    const functionNames = Array.from(new Set(this.metrics.map(m => m.functionName)));
    return {
      totalMetrics: this.metrics.length,
      totalAlerts: this.alerts.length,
      activeAlerts: this.alerts.filter(a => !a.acknowledged).length,
      functions: functionNames,
      timestamp: new Date(),
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Set default baselines for optimized functions
performanceMonitor.setBaseline('get_user_auth_data_optimized', {
  functionName: 'get_user_auth_data_optimized',
  avgExecutionTimeMs: 85,
  p95ExecutionTimeMs: 120,
  cacheHitRate: 96,
  queryCount: 4,
  lastUpdated: new Date(),
});

performanceMonitor.setBaseline('validate_permissions_batch', {
  functionName: 'validate_permissions_batch',
  avgExecutionTimeMs: 12,
  p95ExecutionTimeMs: 20,
  cacheHitRate: 92,
  queryCount: 2,
  lastUpdated: new Date(),
});

performanceMonitor.setBaseline('get_role_hierarchy_cached', {
  functionName: 'get_role_hierarchy_cached',
  avgExecutionTimeMs: 25,
  p95ExecutionTimeMs: 40,
  cacheHitRate: 94,
  queryCount: 3,
  lastUpdated: new Date(),
});

export default performanceMonitor;
