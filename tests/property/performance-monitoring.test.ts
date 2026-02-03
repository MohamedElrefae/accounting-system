/**
 * Property-Based Tests for Real-time Performance Monitoring
 * 
 * Feature: enterprise-auth-performance-optimization
 * Property 14: Real-time Performance Monitoring
 * Validates: Requirements 5.4
 * 
 * Tests that the performance monitoring system correctly tracks,
 * aggregates, and reports authentication performance metrics.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import performanceMonitor, {
  PerformanceMetric,
  PerformanceStats,
} from '../../src/services/performance/PerformanceMonitor';

describe('Property 14: Real-time Performance Monitoring', () => {
  beforeEach(() => {
    performanceMonitor.clear();
  });

  afterEach(() => {
    performanceMonitor.clear();
  });

  /**
   * Property: For any set of performance metrics recorded,
   * the monitoring system should correctly calculate statistics
   * including averages, percentiles, and error rates.
   */
  it('should correctly calculate performance statistics for recorded metrics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          functionName: fc.constantFrom(
            'get_user_auth_data_optimized',
            'validate_permissions_batch',
            'get_role_hierarchy_cached'
          ),
          executionTimes: fc.array(fc.integer({ min: 10, max: 500 }), {
            minLength: 1,
            maxLength: 100,
          }),
          errorCount: fc.integer({ min: 0, max: 10 }),
          cacheHitCount: fc.integer({ min: 0, max: 50 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 14: Real-time Performance Monitoring
          
          // Record metrics
          const totalMetrics = testData.executionTimes.length + testData.errorCount;
          
          testData.executionTimes.forEach((time, index) => {
            performanceMonitor.recordMetric({
              functionName: testData.functionName,
              userId: `user-${index}`,
              executionTimeMs: time,
              queryCount: 4,
              cacheHit: index < testData.cacheHitCount,
              timestamp: new Date(),
              status: 'success',
            });
          });

          // Record errors
          for (let i = 0; i < testData.errorCount; i++) {
            performanceMonitor.recordMetric({
              functionName: testData.functionName,
              userId: `user-error-${i}`,
              executionTimeMs: 0,
              timestamp: new Date(),
              status: 'error',
              errorMessage: 'Test error',
            });
          }

          // Get statistics
          const stats = performanceMonitor.getStats(testData.functionName);

          // Verify total calls
          expect(stats.totalCalls).toBe(totalMetrics);

          // Verify execution time statistics
          if (testData.executionTimes.length > 0) {
            const sortedTimes = [...testData.executionTimes].sort((a, b) => a - b);
            
            // Average should be within reasonable bounds
            expect(stats.avgExecutionTimeMs).toBeGreaterThanOrEqual(
              Math.min(...sortedTimes)
            );
            expect(stats.avgExecutionTimeMs).toBeLessThanOrEqual(
              Math.max(...sortedTimes)
            );

            // Min/Max should match
            expect(stats.minExecutionTimeMs).toBe(sortedTimes[0]);
            expect(stats.maxExecutionTimeMs).toBe(sortedTimes[sortedTimes.length - 1]);

            // Percentiles should be in order
            expect(stats.p95ExecutionTimeMs).toBeGreaterThanOrEqual(stats.avgExecutionTimeMs);
            expect(stats.p99ExecutionTimeMs).toBeGreaterThanOrEqual(stats.p95ExecutionTimeMs);
          }

          // Verify cache hit rate
          const expectedCacheHitRate = (testData.cacheHitCount / testData.executionTimes.length) * 100;
          expect(stats.cacheHitRate).toBe(expectedCacheHitRate);

          // Verify error rate
          const expectedErrorRate = (testData.errorCount / totalMetrics) * 100;
          expect(stats.errorRate).toBe(expectedErrorRate);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any time window specified, the monitoring system
   * should only include metrics within that window in calculations.
   */
  it('should respect time windows when calculating statistics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          functionName: fc.constant('get_user_auth_data_optimized'),
          metricsInWindow: fc.array(fc.integer({ min: 10, max: 200 }), {
            minLength: 1,
            maxLength: 50,
          }),
          metricsOutsideWindow: fc.array(fc.integer({ min: 10, max: 200 }), {
            minLength: 0,
            maxLength: 50,
          }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 14: Real-time Performance Monitoring
          
          const now = Date.now();
          const windowMs = 60000; // 1 minute window

          // Record metrics inside window
          testData.metricsInWindow.forEach((time, index) => {
            performanceMonitor.recordMetric({
              functionName: testData.functionName,
              userId: `user-in-${index}`,
              executionTimeMs: time,
              timestamp: new Date(now - 30000), // 30 seconds ago
              status: 'success',
            });
          });

          // Record metrics outside window
          testData.metricsOutsideWindow.forEach((time, index) => {
            performanceMonitor.recordMetric({
              functionName: testData.functionName,
              userId: `user-out-${index}`,
              executionTimeMs: time,
              timestamp: new Date(now - 120000), // 2 minutes ago
              status: 'success',
            });
          });

          // Get statistics for 1-minute window
          const stats = performanceMonitor.getStats(testData.functionName, windowMs);

          // Should only include metrics in window
          expect(stats.totalCalls).toBe(testData.metricsInWindow.length);

          // Verify calculations are based on in-window metrics only
          if (testData.metricsInWindow.length > 0) {
            const sortedInWindow = [...testData.metricsInWindow].sort((a, b) => a - b);
            const expectedAvg = sortedInWindow.reduce((a, b) => a + b, 0) / sortedInWindow.length;
            
            expect(stats.avgExecutionTimeMs).toBe(expectedAvg);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any performance metrics recorded, the monitoring
   * system should maintain bounded memory by limiting stored metrics.
   */
  it('should maintain bounded memory for stored metrics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          functionName: fc.constant('get_user_auth_data_optimized'),
          metricsToRecord: fc.integer({ min: 5000, max: 15000 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 14: Real-time Performance Monitoring
          
          // Record many metrics
          for (let i = 0; i < testData.metricsToRecord; i++) {
            performanceMonitor.recordMetric({
              functionName: testData.functionName,
              userId: `user-${i}`,
              executionTimeMs: Math.random() * 200,
              timestamp: new Date(),
              status: 'success',
            });
          }

          // Get exported metrics
          const exported = performanceMonitor.exportMetrics(testData.functionName);

          // Should not exceed max size (10000)
          expect(exported.length).toBeLessThanOrEqual(10000);

          // Should contain the most recent metrics
          if (testData.metricsToRecord > 10000) {
            expect(exported.length).toBe(10000);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: For any baseline set, the monitoring system should
   * correctly identify when metrics exceed the baseline.
   */
  it('should correctly identify performance regressions against baselines', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          functionName: fc.constant('get_user_auth_data_optimized'),
          baselineAvg: fc.integer({ min: 50, max: 150 }),
          regressionMultiplier: fc.float({ min: 1.1, max: 3.0 }),
          normalMetrics: fc.array(fc.integer({ min: 10, max: 100 }), {
            minLength: 1,
            maxLength: 20,
          }),
          regressionMetrics: fc.array(fc.integer({ min: 10, max: 100 }), {
            minLength: 1,
            maxLength: 20,
          }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 14: Real-time Performance Monitoring
          
          // Set baseline
          performanceMonitor.setBaseline(testData.functionName, {
            functionName: testData.functionName,
            avgExecutionTimeMs: testData.baselineAvg,
            p95ExecutionTimeMs: testData.baselineAvg * 1.5,
            cacheHitRate: 95,
            queryCount: 4,
            lastUpdated: new Date(),
          });

          // Record normal metrics
          testData.normalMetrics.forEach((time, index) => {
            performanceMonitor.recordMetric({
              functionName: testData.functionName,
              userId: `user-normal-${index}`,
              executionTimeMs: time,
              timestamp: new Date(),
              status: 'success',
            });
          });

          // Record regression metrics
          const regressionThreshold = testData.baselineAvg * testData.regressionMultiplier;
          testData.regressionMetrics.forEach((time, index) => {
            performanceMonitor.recordMetric({
              functionName: testData.functionName,
              userId: `user-regression-${index}`,
              executionTimeMs: regressionThreshold + time,
              timestamp: new Date(),
              status: 'success',
            });
          });

          // Get alerts
          const alerts = performanceMonitor.getAlerts(false);

          // Should have detected regression if multiplier > 1.2
          if (testData.regressionMultiplier > 1.2) {
            const regressionAlerts = alerts.filter(a => a.type === 'regression');
            expect(regressionAlerts.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any set of alerts, the monitoring system should
   * correctly track alert state and allow acknowledgment.
   */
  it('should correctly manage alert lifecycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          alertCount: fc.integer({ min: 1, max: 50 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 14: Real-time Performance Monitoring
          
          // Create alerts by recording regression metrics
          for (let i = 0; i < testData.alertCount; i++) {
            performanceMonitor.recordMetric({
              functionName: 'get_user_auth_data_optimized',
              userId: `user-${i}`,
              executionTimeMs: 500, // High execution time to trigger alert
              timestamp: new Date(),
              status: 'success',
            });
          }

          // Get active alerts
          const activeAlerts = performanceMonitor.getAlerts(false);
          expect(activeAlerts.length).toBeGreaterThan(0);

          // Acknowledge first alert
          if (activeAlerts.length > 0) {
            const firstAlertId = activeAlerts[0].id;
            performanceMonitor.acknowledgeAlert(firstAlertId);

            // Verify alert is acknowledged
            const remainingActive = performanceMonitor.getAlerts(false);
            expect(remainingActive.find(a => a.id === firstAlertId)).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any performance metrics, the monitoring system
   * should provide accurate summary information.
   */
  it('should provide accurate performance summary', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          functions: fc.array(
            fc.constantFrom(
              'get_user_auth_data_optimized',
              'validate_permissions_batch',
              'get_role_hierarchy_cached'
            ),
            { minLength: 1, maxLength: 3, uniqueBy: x => x }
          ),
          metricsPerFunction: fc.integer({ min: 1, max: 100 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 14: Real-time Performance Monitoring
          
          // Record metrics for each function
          testData.functions.forEach(functionName => {
            for (let i = 0; i < testData.metricsPerFunction; i++) {
              performanceMonitor.recordMetric({
                functionName,
                userId: `user-${i}`,
                executionTimeMs: Math.random() * 200,
                timestamp: new Date(),
                status: 'success',
              });
            }
          });

          // Get summary
          const summary = performanceMonitor.getSummary();

          // Verify summary accuracy
          expect(summary.totalMetrics).toBe(
            testData.functions.length * testData.metricsPerFunction
          );
          expect(summary.functions.length).toBe(testData.functions.length);
          expect(summary.functions).toEqual(expect.arrayContaining(testData.functions));
          expect(summary.timestamp).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any alert subscription, the monitoring system
   * should notify listeners of new alerts.
   */
  it('should notify listeners of new alerts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          alertCount: fc.integer({ min: 1, max: 20 }),
        }),
        async (testData) => {
          // Feature: enterprise-auth-performance-optimization, Property 14: Real-time Performance Monitoring
          
          const receivedAlerts: any[] = [];
          const unsubscribe = performanceMonitor.onAlert((alert) => {
            receivedAlerts.push(alert);
          });

          try {
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

            // Should have received alerts
            expect(receivedAlerts.length).toBeGreaterThan(0);

            // All received items should be alerts
            receivedAlerts.forEach(alert => {
              expect(alert).toHaveProperty('id');
              expect(alert).toHaveProperty('type');
              expect(alert).toHaveProperty('severity');
              expect(alert).toHaveProperty('message');
              expect(alert).toHaveProperty('timestamp');
            });
          } finally {
            unsubscribe();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
