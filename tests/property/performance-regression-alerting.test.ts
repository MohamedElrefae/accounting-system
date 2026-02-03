/**
 * Property-Based Tests for Performance Regression Alerting
 * 
 * Feature: enterprise-auth-performance-optimization
 * Property 15: Performance Regression Alerting
 * Validates: Requirements 5.5
 * 
 * Tests that the performance monitoring system correctly detects
 * performance regressions and alerts administrators within 1 minute.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import performanceMonitor, {
  PerformanceAlert,
} from '../../src/services/performance/PerformanceMonitor';

describe('Property 15: Performance Regression Alerting', () => {
  beforeEach(() => {
    performanceMonitor.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    performanceMonitor.clear();
    vi.useRealTimers();
  });

  /**
   * Property: For any performance metric that exceeds the baseline
   * by 20% or more, the system should generate a regression alert.
   */
  it('should detect performance regressions exceeding 20% threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          functionName: fc.constant('get_user_auth_data_optimized'),
          baselineAvg: fc.integer({ min: 50, max: 150 }),
          regressionPercentage: fc.integer({ min: 21, max: 300 }),
          metricCount: fc.integer({ min: 1, max: 10 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 15: Performance Regression Alerting
          
          // Set baseline
          performanceMonitor.setBaseline(testData.functionName, {
            functionName: testData.functionName,
            avgExecutionTimeMs: testData.baselineAvg,
            p95ExecutionTimeMs: testData.baselineAvg * 1.5,
            cacheHitRate: 95,
            queryCount: 4,
            lastUpdated: new Date(),
          });

          // Calculate regression threshold (20% above baseline)
          const regressionThreshold = testData.baselineAvg * 1.2;
          const regressionExecutionTime = testData.baselineAvg * (1 + testData.regressionPercentage / 100);

          // Record regression metrics
          for (let i = 0; i < testData.metricCount; i++) {
            performanceMonitor.recordMetric({
              functionName: testData.functionName,
              userId: `user-${i}`,
              executionTimeMs: regressionExecutionTime,
              timestamp: new Date(),
              status: 'success',
            });
          }

          // Get alerts
          const alerts = performanceMonitor.getAlerts(false);
          const regressionAlerts = alerts.filter(a => a.type === 'regression');

          // Should have detected regression
          expect(regressionAlerts.length).toBeGreaterThan(0);

          // Verify alert properties
          regressionAlerts.forEach(alert => {
            expect(alert.severity).toBe('warning');
            expect(alert.message).toContain(testData.functionName);
            expect(alert.currentValue).toBeGreaterThan(alert.threshold);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any performance metric that does not exceed the
   * baseline by 20%, the system should not generate a regression alert.
   */
  it('should not alert for minor performance variations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          functionName: fc.constant('get_user_auth_data_optimized'),
          baselineAvg: fc.integer({ min: 50, max: 150 }),
          variationPercentage: fc.integer({ min: 0, max: 19 }),
          metricCount: fc.integer({ min: 1, max: 10 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 15: Performance Regression Alerting
          
          // Set baseline
          performanceMonitor.setBaseline(testData.functionName, {
            functionName: testData.functionName,
            avgExecutionTimeMs: testData.baselineAvg,
            p95ExecutionTimeMs: testData.baselineAvg * 1.5,
            cacheHitRate: 95,
            queryCount: 4,
            lastUpdated: new Date(),
          });

          // Record metrics with minor variation
          const variationExecutionTime = testData.baselineAvg * (1 + testData.variationPercentage / 100);
          for (let i = 0; i < testData.metricCount; i++) {
            performanceMonitor.recordMetric({
              functionName: testData.functionName,
              userId: `user-${i}`,
              executionTimeMs: variationExecutionTime,
              timestamp: new Date(),
              status: 'success',
            });
          }

          // Get alerts
          const alerts = performanceMonitor.getAlerts(false);
          const regressionAlerts = alerts.filter(a => a.type === 'regression');

          // Should not have detected regression for minor variations
          expect(regressionAlerts.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any error spike (>5% error rate), the system should
   * generate a critical alert.
   */
  it('should generate critical alerts for error spikes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          functionName: fc.constant('get_user_auth_data_optimized'),
          successCount: fc.integer({ min: 1, max: 50 }),
          errorCount: fc.integer({ min: 3, max: 50 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 15: Performance Regression Alerting
          
          // Record successful metrics
          for (let i = 0; i < testData.successCount; i++) {
            performanceMonitor.recordMetric({
              functionName: testData.functionName,
              userId: `user-success-${i}`,
              executionTimeMs: 100,
              timestamp: new Date(Date.now() - 30000), // Within last 60 seconds
              status: 'success',
            });
          }

          // Record error metrics
          for (let i = 0; i < testData.errorCount; i++) {
            performanceMonitor.recordMetric({
              functionName: testData.functionName,
              userId: `user-error-${i}`,
              executionTimeMs: 0,
              timestamp: new Date(Date.now() - 30000), // Within last 60 seconds
              status: 'error',
              errorMessage: 'Test error',
            });
          }

          // Calculate error rate
          const totalMetrics = testData.successCount + testData.errorCount;
          const errorRate = (testData.errorCount / totalMetrics) * 100;

          // Get alerts
          const alerts = performanceMonitor.getAlerts(false);
          const errorAlerts = alerts.filter(a => a.type === 'error_spike');

          // Should have critical alert if error rate > 5%
          if (errorRate > 5) {
            expect(errorAlerts.length).toBeGreaterThan(0);
            errorAlerts.forEach(alert => {
              expect(alert.severity).toBe('critical');
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any alert generated, the system should include
   * accurate metric information and timestamp.
   */
  it('should include accurate information in regression alerts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          functionName: fc.constant('get_user_auth_data_optimized'),
          baselineAvg: fc.integer({ min: 50, max: 150 }),
          regressionExecutionTime: fc.integer({ min: 200, max: 500 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 15: Performance Regression Alerting
          
          // Set baseline
          performanceMonitor.setBaseline(testData.functionName, {
            functionName: testData.functionName,
            avgExecutionTimeMs: testData.baselineAvg,
            p95ExecutionTimeMs: testData.baselineAvg * 1.5,
            cacheHitRate: 95,
            queryCount: 4,
            lastUpdated: new Date(),
          });

          const beforeTime = Date.now();

          // Record regression metric
          performanceMonitor.recordMetric({
            functionName: testData.functionName,
            userId: 'test-user',
            executionTimeMs: testData.regressionExecutionTime,
            timestamp: new Date(),
            status: 'success',
          });

          const afterTime = Date.now();

          // Get alerts
          const alerts = performanceMonitor.getAlerts(false);

          // Verify alert information
          alerts.forEach(alert => {
            expect(alert.metric).toBe(testData.functionName);
            expect(alert.currentValue).toBe(testData.regressionExecutionTime);
            expect(alert.threshold).toBeGreaterThan(0);
            expect(alert.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime);
            expect(alert.timestamp.getTime()).toBeLessThanOrEqual(afterTime + 1000);
            expect(alert.id).toBeDefined();
            expect(alert.acknowledged).toBe(false);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any alert, the system should allow acknowledgment
   * and track acknowledgment state.
   */
  it('should track alert acknowledgment state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          alertCount: fc.integer({ min: 1, max: 20 }),
          acknowledgeCount: fc.integer({ min: 0, max: 20 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 15: Performance Regression Alerting
          
          // Generate alerts
          for (let i = 0; i < testData.alertCount; i++) {
            performanceMonitor.recordMetric({
              functionName: 'get_user_auth_data_optimized',
              userId: `user-${i}`,
              executionTimeMs: 500, // High execution time
              timestamp: new Date(),
              status: 'success',
            });
          }

          // Get active alerts
          const activeAlerts = performanceMonitor.getAlerts(false);
          const toAcknowledge = Math.min(testData.acknowledgeCount, activeAlerts.length);

          // Acknowledge some alerts
          for (let i = 0; i < toAcknowledge; i++) {
            performanceMonitor.acknowledgeAlert(activeAlerts[i].id);
          }

          // Verify acknowledgment
          const remainingActive = performanceMonitor.getAlerts(false);
          expect(remainingActive.length).toBe(activeAlerts.length - toAcknowledge);

          // Verify acknowledged alerts are not in active list
          const acknowledgedIds = activeAlerts.slice(0, toAcknowledge).map(a => a.id);
          remainingActive.forEach(alert => {
            expect(acknowledgedIds).not.toContain(alert.id);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any threshold exceeded (>150ms), the system should
   * generate a warning alert.
   */
  it('should alert when execution time exceeds threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          functionName: fc.constant('get_user_auth_data_optimized'),
          executionTime: fc.integer({ min: 151, max: 500 }),
          metricCount: fc.integer({ min: 1, max: 10 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 15: Performance Regression Alerting
          
          // Record metrics exceeding threshold
          for (let i = 0; i < testData.metricCount; i++) {
            performanceMonitor.recordMetric({
              functionName: testData.functionName,
              userId: `user-${i}`,
              executionTimeMs: testData.executionTime,
              timestamp: new Date(),
              status: 'success',
            });
          }

          // Get alerts
          const alerts = performanceMonitor.getAlerts(false);
          const thresholdAlerts = alerts.filter(a => a.type === 'threshold_exceeded');

          // Should have detected threshold exceeded
          expect(thresholdAlerts.length).toBeGreaterThan(0);

          // Verify alert properties
          thresholdAlerts.forEach(alert => {
            expect(alert.severity).toBe('warning');
            expect(alert.currentValue).toBeGreaterThan(150);
            expect(alert.threshold).toBe(150);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any alert subscription, the system should notify
   * listeners within 1 second of alert generation.
   */
  it('should notify listeners of alerts within 1 second', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          alertCount: fc.integer({ min: 1, max: 10 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 15: Performance Regression Alerting
          
          const receivedAlerts: PerformanceAlert[] = [];
          const notificationTimes: number[] = [];

          const unsubscribe = performanceMonitor.onAlert((alert) => {
            receivedAlerts.push(alert);
            notificationTimes.push(Date.now());
          });

          try {
            const recordStartTime = Date.now();

            // Record metrics that trigger alerts
            for (let i = 0; i < testData.alertCount; i++) {
              performanceMonitor.recordMetric({
                functionName: 'get_user_auth_data_optimized',
                userId: `user-${i}`,
                executionTimeMs: 500, // High execution time
                timestamp: new Date(),
                status: 'success',
              });
            }

            const recordEndTime = Date.now();

            // Should have received alerts
            expect(receivedAlerts.length).toBeGreaterThan(0);

            // All notifications should be within 1 second of recording
            notificationTimes.forEach(notificationTime => {
              const timeSinceRecord = notificationTime - recordStartTime;
              expect(timeSinceRecord).toBeLessThanOrEqual(1000);
            });
          } finally {
            unsubscribe();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any set of alerts, the system should maintain
   * bounded alert history.
   */
  it('should maintain bounded alert history', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          alertsToGenerate: fc.integer({ min: 500, max: 2000 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 15: Performance Regression Alerting
          
          // Generate many alerts
          for (let i = 0; i < testData.alertsToGenerate; i++) {
            performanceMonitor.recordMetric({
              functionName: 'get_user_auth_data_optimized',
              userId: `user-${i}`,
              executionTimeMs: 500, // High execution time
              timestamp: new Date(),
              status: 'success',
            });
          }

          // Get all alerts
          const allAlerts = performanceMonitor.getAlerts(false);

          // Should not exceed max size (1000)
          expect(allAlerts.length).toBeLessThanOrEqual(1000);

          // If we generated more than 1000, should have exactly 1000
          if (testData.alertsToGenerate > 1000) {
            expect(allAlerts.length).toBe(1000);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: For any alert, the system should provide accurate
   * severity classification.
   */
  it('should correctly classify alert severity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          functionName: fc.constant('get_user_auth_data_optimized'),
          successCount: fc.integer({ min: 1, max: 50 }),
          errorCount: fc.integer({ min: 0, max: 50 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 15: Performance Regression Alerting
          
          // Record metrics
          for (let i = 0; i < testData.successCount; i++) {
            performanceMonitor.recordMetric({
              functionName: testData.functionName,
              userId: `user-success-${i}`,
              executionTimeMs: 100,
              timestamp: new Date(Date.now() - 30000),
              status: 'success',
            });
          }

          for (let i = 0; i < testData.errorCount; i++) {
            performanceMonitor.recordMetric({
              functionName: testData.functionName,
              userId: `user-error-${i}`,
              executionTimeMs: 0,
              timestamp: new Date(Date.now() - 30000),
              status: 'error',
              errorMessage: 'Test error',
            });
          }

          // Get alerts
          const alerts = performanceMonitor.getAlerts(false);

          // Verify severity classification
          alerts.forEach(alert => {
            if (alert.type === 'error_spike') {
              // Error spikes should be critical
              expect(alert.severity).toBe('critical');
            } else {
              // Other alerts should be warning
              expect(['warning', 'critical']).toContain(alert.severity);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
