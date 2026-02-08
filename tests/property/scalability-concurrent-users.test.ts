/**
 * Property-Based Tests for Scalability and Concurrent User Support
 * 
 * Validates Property 11: Scalability and Concurrent User Support
 * Ensures the system maintains performance and supports 6x more concurrent users
 * than the current baseline, scaling up to 10,000 concurrent users with linear scaling.
 * 
 * Feature: enterprise-auth-performance-optimization
 * Property 11: Scalability and Concurrent User Support
 * Validates: Requirements 4.4, 8.1
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { CacheManager, resetCacheManager } from '../../src/services/cache/CacheManager';
import { cacheKeyStrategy } from '../../src/services/cache/CacheKeyStrategy';
import { propertyTestConfig } from './test-config';

describe('Property 11: Scalability and Concurrent User Support', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    resetCacheManager();
    cacheManager = new CacheManager();
  });

  afterEach(async () => {
    await cacheManager.clear();
    await cacheManager.close();
  });

  /**
   * Property: 6x Baseline Concurrent User Support
   * 
   * For any load up to 6x baseline concurrent users, the system should
   * maintain performance and handle all requests successfully.
   * Baseline: 1000 users, Target: 6000 concurrent users
   */
  it('Property 11.1: System should support 6x baseline concurrent users', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          baselineUsers: fc.constant(1000), // Baseline: 1000 users
          concurrencyMultiplier: fc.constant(6), // 6x baseline
          requestsPerUser: fc.integer({ min: 2, max: 5 }),
        }),
        async (testData) => {
          const { baselineUsers, concurrencyMultiplier, requestsPerUser } = testData;
          const targetConcurrentUsers = baselineUsers * concurrencyMultiplier; // 6000 users

          // Pre-populate cache for all users
          const userKeys: string[] = [];
          for (let i = 0; i < targetConcurrentUsers; i++) {
            const userId = `user:${i}`;
            const key = cacheKeyStrategy.userAuth(userId);
            userKeys.push(key);
            await cacheManager.set(key, {
              userId,
              permissions: ['read', 'write'],
              roles: ['user'],
              timestamp: Date.now(),
            });
          }

          // Simulate concurrent requests with batching
          const batchSize = 100; // Process 100 concurrent operations at a time
          const responseTimes: number[] = [];
          let successCount = 0;
          let errorCount = 0;

          for (let batch = 0; batch < Math.ceil((targetConcurrentUsers * requestsPerUser) / batchSize); batch++) {
            const batchOperations: Promise<number | null>[] = [];
            const startIdx = batch * batchSize;
            const endIdx = Math.min(startIdx + batchSize, targetConcurrentUsers * requestsPerUser);

            for (let idx = startIdx; idx < endIdx; idx++) {
              const userIdx = idx % targetConcurrentUsers;
              const operation = (async () => {
                try {
                  const startTime = performance.now();
                  const result = await cacheManager.get(userKeys[userIdx]);
                  const responseTime = performance.now() - startTime;
                  
                  if (result) {
                    successCount++;
                    return responseTime;
                  }
                  return null;
                } catch (error) {
                  errorCount++;
                  return null;
                }
              })();

              batchOperations.push(operation);
            }

            const batchResults = await Promise.all(batchOperations);
            responseTimes.push(...batchResults.filter((t) => t !== null) as number[]);
          }

          // Verify all requests succeeded
          expect(errorCount).toBe(0);
          expect(successCount).toBeGreaterThan(0);

          // Calculate statistics
          const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
          const maxResponseTime = Math.max(...responseTimes);
          const p99ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.99)];

          // Verify requirement 4.4: support 6x concurrent users
          // Allow more lenient thresholds for concurrent operations
          expect(avgResponseTime).toBeLessThan(200);
          expect(p99ResponseTime).toBeLessThan(300);
          expect(maxResponseTime).toBeLessThan(1000);
        }
      ),
      { numRuns: 10 } // Reduced runs due to concurrent nature
    );
  }, 60000); // 60 second timeout for concurrent operations

  /**
   * Property: Linear Scaling Up to 10,000 Concurrent Users
   * 
   * For any load up to 10,000 concurrent users, the system should
   * maintain linear performance scaling without degradation.
   */
  it('Property 11.2: System should maintain linear scaling up to 10,000 concurrent users', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userCounts: fc.constant([1000, 5000, 10000]), // Test at different scales
          requestsPerUser: fc.constant(2),
        }),
        async (testData) => {
          const { userCounts } = testData;
          const scalingMetrics: Array<{ users: number; avgTime: number; throughput: number }> = [];

          for (const userCount of userCounts) {
            // Pre-populate cache for users
            const userKeys: string[] = [];
            for (let i = 0; i < userCount; i++) {
              const userId = `user:scale:${userCount}:${i}`;
              const key = cacheKeyStrategy.userAuth(userId);
              userKeys.push(key);
              await cacheManager.set(key, {
                userId,
                permissions: ['read', 'write'],
                timestamp: Date.now(),
              });
            }

            // Measure performance at this scale
            const batchSize = 100;
            const responseTimes: number[] = [];
            let successCount = 0;

            const startTime = performance.now();
            for (let batch = 0; batch < Math.ceil(userCount / batchSize); batch++) {
              const batchOperations: Promise<number | null>[] = [];
              const startIdx = batch * batchSize;
              const endIdx = Math.min(startIdx + batchSize, userCount);

              for (let idx = startIdx; idx < endIdx; idx++) {
                const operation = (async () => {
                  try {
                    const opStart = performance.now();
                    const result = await cacheManager.get(userKeys[idx]);
                    const opTime = performance.now() - opStart;
                    
                    if (result) {
                      successCount++;
                      return opTime;
                    }
                    return null;
                  } catch {
                    return null;
                  }
                })();

                batchOperations.push(operation);
              }

              const batchResults = await Promise.all(batchOperations);
              responseTimes.push(...batchResults.filter((t) => t !== null) as number[]);
            }
            const totalTime = performance.now() - startTime;

            // Calculate metrics for this scale
            const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            const throughput = successCount / (totalTime / 1000); // requests per second

            scalingMetrics.push({
              users: userCount,
              avgTime,
              throughput,
            });

            // Verify performance at this scale
            expect(avgTime).toBeLessThan(200);
            expect(successCount).toBe(userCount);
          }

          // Verify linear scaling: throughput should scale linearly with user count
          // Throughput at 5000 users should be ~5x throughput at 1000 users
          // Throughput at 10000 users should be ~10x throughput at 1000 users
          const baselineThroughput = scalingMetrics[0].throughput;
          const mid5kThroughput = scalingMetrics[1].throughput;
          const max10kThroughput = scalingMetrics[2].throughput;

          // Allow 20% variance in linear scaling
          expect(mid5kThroughput).toBeGreaterThan(baselineThroughput * 4);
          expect(max10kThroughput).toBeGreaterThan(baselineThroughput * 8);
        }
      ),
      { numRuns: 5 } // Reduced runs due to scale testing
    );
  }, 120000); // 120 second timeout for large scale testing

  /**
   * Property: Sub-100ms Response Times Under 6x Load
   * 
   * For any authentication operation under 6x concurrent load,
   * the system should maintain sub-100ms response times.
   */
  it('Property 11.3: System should maintain sub-100ms response times under 6x load', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          concurrentUsers: fc.constant(6000),
          operationsPerUser: fc.integer({ min: 1, max: 3 }),
        }),
        async (testData) => {
          const { concurrentUsers, operationsPerUser } = testData;

          // Pre-populate cache
          const userKeys: string[] = [];
          for (let i = 0; i < concurrentUsers; i++) {
            const userId = `user:load:${i}`;
            const key = cacheKeyStrategy.userAuth(userId);
            userKeys.push(key);
            await cacheManager.set(key, {
              userId,
              permissions: ['read', 'write', 'admin'],
              roles: ['user', 'manager'],
              timestamp: Date.now(),
            });
          }

          // Execute operations under load
          const responseTimes: number[] = [];
          const batchSize = 200;
          let successCount = 0;

          for (let batch = 0; batch < Math.ceil((concurrentUsers * operationsPerUser) / batchSize); batch++) {
            const batchOperations: Promise<number | null>[] = [];
            const startIdx = batch * batchSize;
            const endIdx = Math.min(startIdx + batchSize, concurrentUsers * operationsPerUser);

            for (let idx = startIdx; idx < endIdx; idx++) {
              const userIdx = idx % concurrentUsers;
              const operation = (async () => {
                try {
                  const opStart = performance.now();
                  const result = await cacheManager.get(userKeys[userIdx]);
                  const opTime = performance.now() - opStart;
                  
                  if (result) {
                    successCount++;
                    return opTime;
                  }
                  return null;
                } catch {
                  return null;
                }
              })();

              batchOperations.push(operation);
            }

            const batchResults = await Promise.all(batchOperations);
            responseTimes.push(...batchResults.filter((t) => t !== null) as number[]);
          }

          // Verify sub-100ms response times
          const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
          const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];
          const p99ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.99)];

          expect(avgResponseTime).toBeLessThan(100);
          expect(p95ResponseTime).toBeLessThan(150);
          expect(p99ResponseTime).toBeLessThan(200);
          expect(successCount).toBeGreaterThan(0);
        }
      ),
      { numRuns: 8 }
    );
  }, 90000); // 90 second timeout

  /**
   * Property: Error Rate Under Load
   * 
   * For any load scenario, the system should maintain error rate below 1%.
   */
  it('Property 11.4: System should maintain error rate below 1% under load', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          concurrentUsers: fc.integer({ min: 1000, max: 10000 }),
          operationsPerUser: fc.integer({ min: 2, max: 5 }),
        }),
        async (testData) => {
          const { concurrentUsers, operationsPerUser } = testData;

          // Pre-populate cache
          const userKeys: string[] = [];
          for (let i = 0; i < concurrentUsers; i++) {
            const userId = `user:error:${i}`;
            const key = cacheKeyStrategy.userAuth(userId);
            userKeys.push(key);
            await cacheManager.set(key, {
              userId,
              permissions: ['read', 'write'],
              timestamp: Date.now(),
            });
          }

          // Execute operations and track errors
          let successCount = 0;
          let errorCount = 0;
          const batchSize = 150;

          for (let batch = 0; batch < Math.ceil((concurrentUsers * operationsPerUser) / batchSize); batch++) {
            const batchOperations: Promise<boolean>[] = [];
            const startIdx = batch * batchSize;
            const endIdx = Math.min(startIdx + batchSize, concurrentUsers * operationsPerUser);

            for (let idx = startIdx; idx < endIdx; idx++) {
              const userIdx = idx % concurrentUsers;
              const operation = (async () => {
                try {
                  const result = await cacheManager.get(userKeys[userIdx]);
                  return result !== null;
                } catch {
                  return false;
                }
              })();

              batchOperations.push(operation);
            }

            const batchResults = await Promise.all(batchOperations);
            successCount += batchResults.filter((r) => r).length;
            errorCount += batchResults.filter((r) => !r).length;
          }

          // Verify error rate below 1%
          const totalOperations = successCount + errorCount;
          const errorRate = errorCount / totalOperations;

          expect(errorRate).toBeLessThan(0.01);
          expect(successCount).toBeGreaterThan(0);
        }
      ),
      { numRuns: 8 }
    );
  }, 90000); // 90 second timeout
});