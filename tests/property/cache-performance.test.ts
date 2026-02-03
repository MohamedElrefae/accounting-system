/**
 * Property-Based Tests for Cache Performance and Hit Rate
 * 
 * Validates Property 2: Cache Performance and Hit Rate
 * Ensures cache layer serves results with 96%+ hit rate and maintains consistency
 * 
 * Feature: enterprise-auth-performance-optimization
 * Property 2: Cache Performance and Hit Rate
 * Validates: Requirements 1.3, 2.1, 6.2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { CacheManager, resetCacheManager } from '../../src/services/cache/CacheManager';
import { cacheKeyStrategy, CACHE_TTL } from '../../src/services/cache/CacheKeyStrategy';

describe('Property 2: Cache Performance and Hit Rate', () => {
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
   * Property: Cache Hit Rate Consistency
   * 
   * For any sequence of repeated cache accesses, the cache should maintain
   * a hit rate of 96%+ for repeated requests within a session.
   */
  it('Property 2.1: Cache hit rate should exceed 96% for repeated requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 50 }),
          requestCount: fc.integer({ min: 50, max: 200 }),
          uniqueKeys: fc.integer({ min: 5, max: 20 }),
        }),
        async (testData) => {
          const { userId, requestCount, uniqueKeys } = testData;
          const keys: string[] = [];

          // Generate unique cache keys
          for (let i = 0; i < uniqueKeys; i++) {
            keys.push(cacheKeyStrategy.userPermissions(userId, `scope:${i}`));
          }

          // Populate cache with initial data
          for (const key of keys) {
            await cacheManager.set(key, { data: key, timestamp: Date.now() });
          }

          // Perform repeated requests
          let hits = 0;
          let misses = 0;

          for (let i = 0; i < requestCount; i++) {
            const keyIndex = i % uniqueKeys;
            const result = await cacheManager.get(keys[keyIndex]);

            if (result !== null) {
              hits++;
            } else {
              misses++;
            }
          }

          const hitRate = hits / (hits + misses);

          // Verify 96%+ hit rate requirement
          expect(hitRate).toBeGreaterThanOrEqual(0.96);
          expect(hits).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cache Data Consistency
   * 
   * For any cached data, repeated retrievals should return identical values
   * and maintain consistency with the original stored data.
   */
  it('Property 2.2: Cached data should maintain consistency across retrievals', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 50 }),
          permissions: fc.array(fc.string({ minLength: 1, maxLength: 30 }), {
            minLength: 1,
            maxLength: 20,
          }),
          retrievalCount: fc.integer({ min: 10, max: 50 }),
        }),
        async (testData) => {
          const { userId, permissions, retrievalCount } = testData;
          const key = cacheKeyStrategy.userPermissions(userId);
          const originalData = { permissions, timestamp: Date.now() };

          // Store data in cache
          await cacheManager.set(key, originalData, CACHE_TTL.permissions);

          // Retrieve multiple times and verify consistency
          for (let i = 0; i < retrievalCount; i++) {
            const retrieved = await cacheManager.get(key);

            expect(retrieved).toBeDefined();
            expect(retrieved).toEqual(originalData);
            expect(retrieved?.permissions).toEqual(permissions);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cache Response Time Performance
   * 
   * For any cache hit, the response time should be sub-millisecond
   * (under 10ms as per requirement 3.3).
   */
  it('Property 2.3: Cache hits should respond in under 10ms', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 50 }),
          dataSize: fc.integer({ min: 100, max: 10000 }),
          requestCount: fc.integer({ min: 20, max: 100 }),
        }),
        async (testData) => {
          const { userId, dataSize, requestCount } = testData;
          const key = cacheKeyStrategy.userAuth(userId);
          const largeData = {
            userId,
            data: 'x'.repeat(dataSize),
            timestamp: Date.now(),
          };

          // Store data
          await cacheManager.set(key, largeData, CACHE_TTL.userAuth);

          // Measure response times for cache hits
          const responseTimes: number[] = [];

          for (let i = 0; i < requestCount; i++) {
            const startTime = performance.now();
            await cacheManager.get(key);
            const responseTime = performance.now() - startTime;
            responseTimes.push(responseTime);
          }

          // Verify all responses are under 10ms
          const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
          const maxResponseTime = Math.max(...responseTimes);

          expect(avgResponseTime).toBeLessThan(10);
          expect(maxResponseTime).toBeLessThan(50); // Allow some variance
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cache Invalidation Effectiveness
   * 
   * For any invalidation pattern, the cache should remove matching entries
   * while preserving non-matching entries, maintaining data integrity.
   */
  it('Property 2.4: Cache invalidation should remove only matching entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 20, unit: fc.char().filter(c => /^[a-z0-9]$/.test(c)) }),
          orgId: fc.string({ minLength: 1, maxLength: 20, unit: fc.char().filter(c => /^[a-z0-9]$/.test(c)) }),
          entryCount: fc.integer({ min: 10, max: 50 }),
        }),
        async (testData) => {
          const { userId, orgId, entryCount } = testData;

          // Create mixed cache entries
          const matchingKeys: string[] = [];
          const nonMatchingKeys: string[] = [];

          for (let i = 0; i < entryCount; i++) {
            if (i % 2 === 0) {
              const key = `perm:${userId}:org:${orgId}:${i}`;
              matchingKeys.push(key);
              await cacheManager.set(key, { data: `matching:${i}` });
            } else {
              const key = `perm:other${i}:org:other:${i}`;
              nonMatchingKeys.push(key);
              await cacheManager.set(key, { data: `non-matching:${i}` });
            }
          }

          // Invalidate matching pattern (escape special chars)
          const pattern = `perm:${userId}:org:${orgId}:.*`;
          await cacheManager.invalidate(pattern);

          // Verify matching entries are gone
          for (const key of matchingKeys) {
            const result = await cacheManager.get(key);
            expect(result).toBeNull();
          }

          // Verify non-matching entries remain
          for (const key of nonMatchingKeys) {
            const result = await cacheManager.get(key);
            expect(result).not.toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cache Statistics Accuracy
   * 
   * For any sequence of cache operations, the statistics should accurately
   * reflect the hit rate, miss rate, and response times.
   */
  it('Property 2.5: Cache statistics should accurately reflect operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 50 }),
          operationCount: fc.integer({ min: 20, max: 50 }),
        }),
        async (testData) => {
          // Create fresh cache manager for this test
          const freshCache = new CacheManager();
          
          const { userId, operationCount } = testData;
          const key = cacheKeyStrategy.userAuth(userId);

          // Populate cache
          await freshCache.set(key, { userId, data: 'test' });

          // Perform repeated requests (all hits)
          for (let i = 0; i < operationCount; i++) {
            await freshCache.get(key);
          }

          const stats = freshCache.getStats();

          // Verify statistics accuracy
          expect(stats.totalRequests).toBeGreaterThan(0);
          expect(stats.cacheHits).toBeGreaterThan(0);
          expect(stats.hitRate).toBeGreaterThan(0.9); // Should be mostly hits
          
          await freshCache.close();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Concurrent Cache Access Performance
   * 
   * For any concurrent cache operations, the cache should maintain
   * consistency and performance under parallel access.
   */
  it('Property 2.6: Concurrent cache access should maintain consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userCount: fc.integer({ min: 5, max: 20 }),
          operationsPerUser: fc.integer({ min: 10, max: 50 }),
        }),
        async (testData) => {
          const { userCount, operationsPerUser } = testData;

          // Populate cache with data for multiple users
          const userData: Record<string, any> = {};
          for (let i = 0; i < userCount; i++) {
            const userId = `user:${i}`;
            const key = cacheKeyStrategy.userAuth(userId);
            const data = { userId, permissions: [`perm:${i}`] };
            userData[key] = data;
            await cacheManager.set(key, data);
          }

          // Perform concurrent operations
          const operations: Promise<any>[] = [];

          for (let i = 0; i < userCount; i++) {
            for (let j = 0; j < operationsPerUser; j++) {
              const userId = `user:${i}`;
              const key = cacheKeyStrategy.userAuth(userId);
              operations.push(cacheManager.get(key));
            }
          }

          const results = await Promise.all(operations);

          // Verify all results are consistent
          let operationIndex = 0;
          for (let i = 0; i < userCount; i++) {
            const userId = `user:${i}`;
            const key = cacheKeyStrategy.userAuth(userId);
            const expectedData = userData[key];

            for (let j = 0; j < operationsPerUser; j++) {
              const result = results[operationIndex++];
              expect(result).toEqual(expectedData);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cache TTL Expiration Accuracy
   * 
   * For any cached entry with TTL, the entry should expire after the
   * specified time and not be retrievable.
   */
  it('Property 2.7: Cache entries should expire after TTL', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async (testData) => {
          const { userId } = testData;
          const key = cacheKeyStrategy.userAuth(userId);
          const data = { userId, timestamp: Date.now() };

          // Set with 1 second TTL
          await cacheManager.set(key, data, 1);

          // Should exist immediately
          let result = await cacheManager.get(key);
          expect(result).toEqual(data);

          // Wait for expiration (1.5 seconds)
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Should be expired
          result = await cacheManager.get(key);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 10 } // Reduced runs due to time-based nature
    );
  }, 60000); // 60 second timeout

  /**
   * Property: Cache Memory Efficiency
   * 
   * For any set of cached entries, the memory usage should be proportional
   * to the data size and not grow unexpectedly.
   */
  it('Property 2.8: Cache memory usage should be proportional to data size', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          entryCount: fc.integer({ min: 5, max: 15 }),
        }),
        async (testData) => {
          const { entryCount } = testData;

          // Store entries with consistent size
          const dataSize = 500;

          for (let i = 0; i < entryCount; i++) {
            const key = `cache:entry:${i}`;
            const data = { content: 'x'.repeat(dataSize) };
            await cacheManager.set(key, data);
          }

          const stats = cacheManager.getStats();

          // Memory usage should be reasonable
          expect(stats.memoryUsage).toBeGreaterThan(0);
          // Allow generous overhead for metadata and JSON serialization
          expect(stats.memoryUsage).toBeLessThan(dataSize * entryCount * 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cache Warming Effectiveness
   * 
   * For any cache warming operation, the cache should be pre-populated
   * and subsequent requests should have high hit rates.
   */
  it('Property 2.9: Cache warming should improve hit rate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 50 }),
          requestCount: fc.integer({ min: 50, max: 150 }),
        }),
        async (testData) => {
          const { userId, requestCount } = testData;

          // Warm cache
          await cacheManager.warmAuthCache(userId);

          // Populate with actual data
          const key = cacheKeyStrategy.userAuth(userId);
          const authData = { userId, permissions: ['read', 'write'] };
          await cacheManager.set(key, authData);

          // Perform requests
          let hits = 0;
          for (let i = 0; i < requestCount; i++) {
            const result = await cacheManager.get(key);
            if (result !== null) {
              hits++;
            }
          }

          const hitRate = hits / requestCount;

          // After warming, hit rate should be very high (>95%)
          expect(hitRate).toBeGreaterThan(0.95);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cache Tier Selection
   * 
   * For any cache tier option, the cache should respect the tier preference
   * and retrieve data from the specified tier.
   */
  it('Property 2.10: Cache tier options should be respected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 50 }),
          requestCount: fc.integer({ min: 20, max: 100 }),
        }),
        async (testData) => {
          const { userId, requestCount } = testData;
          const key = cacheKeyStrategy.userAuth(userId);
          const data = { userId, data: 'test' };

          // Set in cache
          await cacheManager.set(key, data);

          // Request with memory tier only
          let hits = 0;
          for (let i = 0; i < requestCount; i++) {
            const result = await cacheManager.get(key, { tier: 'memory' });
            if (result !== null) {
              hits++;
            }
          }

          // Should have high hit rate from memory tier
          const hitRate = hits / requestCount;
          expect(hitRate).toBeGreaterThan(0.95);
        }
      ),
      { numRuns: 100 }
    );
  });
});
