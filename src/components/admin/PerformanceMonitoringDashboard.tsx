/**
 * Real-time Performance Monitoring Dashboard
 * 
 * Displays:
 * - Auth operation performance metrics
 * - Cache hit rates
 * - Performance regressions
 * - Real-time alerts
 * - Performance trends
 */

import React, { useState, useEffect, useCallback } from 'react';
import performanceMonitor, {
  PerformanceStats,
  PerformanceAlert,
} from '../../services/performance/PerformanceMonitor';
import './PerformanceMonitoringDashboard.css';

interface MetricDisplay {
  name: string;
  stats: PerformanceStats;
  baseline?: {
    avgExecutionTimeMs: number;
    p95ExecutionTimeMs: number;
    cacheHitRate: number;
  };
}

export const PerformanceMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Map<string, PerformanceStats>>(new Map());
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<PerformanceAlert[]>([]);
  const [timeWindow, setTimeWindow] = useState<number>(3600000); // 1 hour
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(5000); // 5 seconds

  // Refresh metrics
  const refreshMetrics = useCallback(() => {
    const allStats = performanceMonitor.getAllStats(timeWindow);
    setMetrics(allStats);
    setAlerts(performanceMonitor.getAlerts(false));
    setActiveAlerts(performanceMonitor.getAlerts(false));
  }, [timeWindow]);

  // Set up auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshMetrics]);

  // Initial load
  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  // Subscribe to alerts
  useEffect(() => {
    const unsubscribe = performanceMonitor.onAlert((alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 100));
      setActiveAlerts(prev => [alert, ...prev].slice(0, 100));
    });

    return unsubscribe;
  }, []);

  const handleAcknowledgeAlert = (alertId: string) => {
    performanceMonitor.acknowledgeAlert(alertId);
    setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const handleTimeWindowChange = (window: number) => {
    setTimeWindow(window);
  };

  const getPerformanceStatus = (stats: PerformanceStats): 'good' | 'warning' | 'critical' => {
    if (stats.errorRate > 5) return 'critical';
    if (stats.avgExecutionTimeMs > 150) return 'warning';
    if (stats.errorRate > 1) return 'warning';
    return 'good';
  };

  const getStatusColor = (status: 'good' | 'warning' | 'critical'): string => {
    switch (status) {
      case 'good':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'critical':
        return '#ef4444';
    }
  };

  const summary = performanceMonitor.getSummary();

  return (
    <div className="performance-monitoring-dashboard">
      <div className="dashboard-header">
        <h1>🚀 Performance Monitoring Dashboard</h1>
        <p>Real-time authentication performance metrics and alerts</p>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-label">Total Metrics</div>
          <div className="card-value">{summary.totalMetrics.toLocaleString()}</div>
        </div>
        <div className="summary-card">
          <div className="card-label">Active Alerts</div>
          <div className="card-value alert-count">{summary.activeAlerts}</div>
        </div>
        <div className="summary-card">
          <div className="card-label">Functions Monitored</div>
          <div className="card-value">{summary.functions.length}</div>
        </div>
        <div className="summary-card">
          <div className="card-label">Last Updated</div>
          <div className="card-value timestamp">
            {summary.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="dashboard-controls">
        <div className="control-group">
          <label>Time Window:</label>
          <select value={timeWindow} onChange={(e) => handleTimeWindowChange(Number(e.target.value))}>
            <option value={300000}>5 minutes</option>
            <option value={900000}>15 minutes</option>
            <option value={3600000}>1 hour</option>
            <option value={86400000}>24 hours</option>
          </select>
        </div>

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto Refresh
          </label>
        </div>

        {autoRefresh && (
          <div className="control-group">
            <label>Refresh Interval:</label>
            <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))}>
              <option value={1000}>1 second</option>
              <option value={5000}>5 seconds</option>
              <option value={10000}>10 seconds</option>
              <option value={30000}>30 seconds</option>
            </select>
          </div>
        )}

        <button className="btn-refresh" onClick={refreshMetrics}>
          🔄 Refresh Now
        </button>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="alerts-section">
          <h2>⚠️ Active Alerts ({activeAlerts.length})</h2>
          <div className="alerts-list">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-item alert-${alert.severity}`}
                style={{ borderLeftColor: alert.severity === 'critical' ? '#ef4444' : '#f59e0b' }}
              >
                <div className="alert-header">
                  <span className="alert-type">{alert.type.toUpperCase()}</span>
                  <span className="alert-severity">{alert.severity}</span>
                  <span className="alert-time">
                    {alert.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="alert-message">{alert.message}</div>
                <div className="alert-details">
                  <span>Metric: {alert.metric}</span>
                  <span>Current: {alert.currentValue.toFixed(2)}</span>
                  <span>Threshold: {alert.threshold.toFixed(2)}</span>
                </div>
                <button
                  className="btn-acknowledge"
                  onClick={() => handleAcknowledgeAlert(alert.id)}
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="metrics-section">
        <h2>📊 Performance Metrics</h2>
        <div className="metrics-grid">
          {Array.from(metrics.entries()).map(([functionName, stats]) => {
            const status = getPerformanceStatus(stats);
            const baseline = performanceMonitor.getBaseline(functionName);

            return (
              <div
                key={functionName}
                className={`metric-card metric-${status}`}
                style={{ borderTopColor: getStatusColor(status) }}
              >
                <div className="metric-header">
                  <h3>{functionName}</h3>
                  <span className={`status-badge status-${status}`}>{status.toUpperCase()}</span>
                </div>

                <div className="metric-body">
                  <div className="metric-row">
                    <span className="metric-label">Total Calls:</span>
                    <span className="metric-value">{stats.totalCalls.toLocaleString()}</span>
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Avg Execution:</span>
                    <span className="metric-value">
                      {stats.avgExecutionTimeMs.toFixed(2)}ms
                      {baseline && (
                        <span className="baseline-comparison">
                          (baseline: {baseline.avgExecutionTimeMs.toFixed(2)}ms)
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">P95 Execution:</span>
                    <span className="metric-value">
                      {stats.p95ExecutionTimeMs.toFixed(2)}ms
                      {baseline && (
                        <span className="baseline-comparison">
                          (baseline: {baseline.p95ExecutionTimeMs.toFixed(2)}ms)
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">P99 Execution:</span>
                    <span className="metric-value">{stats.p99ExecutionTimeMs.toFixed(2)}ms</span>
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Min/Max:</span>
                    <span className="metric-value">
                      {stats.minExecutionTimeMs.toFixed(2)}ms / {stats.maxExecutionTimeMs.toFixed(2)}ms
                    </span>
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Cache Hit Rate:</span>
                    <span className="metric-value">
                      {stats.cacheHitRate.toFixed(1)}%
                      {baseline && (
                        <span className="baseline-comparison">
                          (baseline: {baseline.cacheHitRate.toFixed(1)}%)
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="metric-row">
                    <span className="metric-label">Error Rate:</span>
                    <span className={`metric-value ${stats.errorRate > 1 ? 'error' : ''}`}>
                      {stats.errorRate.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="metric-footer">
                  <span className="metric-timestamp">
                    Updated: {stats.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {metrics.size === 0 && (
          <div className="no-data">
            <p>No performance metrics available yet. Metrics will appear as auth operations are performed.</p>
          </div>
        )}
      </div>

      {/* Alert History */}
      {alerts.length > 0 && (
        <div className="alert-history-section">
          <h2>📋 Alert History</h2>
          <div className="alert-history">
            {alerts.slice(0, 20).map((alert) => (
              <div key={alert.id} className="history-item">
                <span className="history-time">{alert.timestamp.toLocaleTimeString()}</span>
                <span className="history-type">{alert.type}</span>
                <span className="history-message">{alert.message}</span>
                <span className={`history-severity severity-${alert.severity}`}>
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitoringDashboard;
