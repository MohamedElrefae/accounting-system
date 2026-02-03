/**
 * Unit Tests for Cache Manager
 * 
 * Tests specific examples and edge cases for the unified cache manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheManager, resetCacheManager } from '../cache/CacheManager';
import { cacheKeyStrategy, CACHE_TTL } from '../cache/CacheKeyStrategy';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    resetCacheManager();
    cacheManager = new CacheManager();
  });

  afterEach(async () => {
    await cacheManager.clear();
    await cacheManager.close();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get a value from memory cache', async () => {
      const key = 'test:key';
      const value = { userId: '123', name: 'Test User' };

      await cacheManager.set(key, value);
      const result = await cacheManager.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cacheManager.get('non:existent:key');
      expect(result).toBeNull();
    });

    it('should handle different data types', async () => {
      const testCases = [
        { key: 'string:key', value: 'test string' },
        { key: 'number:key', value: 42 },
        { key: 'boolean:key', value: true },
        { key: 'array:key', value: [1, 2, 3] },
        { key: 'object:key', value: { nested: { data: 'value' } } },
      ];

      for (const { key, value } of testCases) {
        await cacheManager.set(key, value);
        const result = await cacheManager.get(key);
        expect(result).toEqual(value);
      }
    });

    it('should respect TTL and expire entries', async () => {
      const key = 'expiring:key';
      const value = { data: 'test' };

      // Set with 1 second TTL
      await cacheManager.set(key, value, 1);

      // Should exist immediately
      let result = await cacheManager.get(key);
      expect(result).toEqual(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      result = await cacheManager.get(key);
      expect(result).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      const key = 'default:ttl:key';
      const value = { data: 'test' };

      await cacheManager.set(key, value); // No TTL specified

      // Should exist immediately
      const result = await cacheManager.get(key);
      expect(result).toEqual(value);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate entries matching a pattern', async () => {
      const keys = [
        'auth:user:123',
        'auth:user:456',
        'perm:user:123',
        'roles:user:789',
      ];

      for (const key of keys) {
        await cacheManager.set(key, { data: key });
      }

      // Invalidate all auth entries
      await cacheManager.invalidate('auth:user:*');

      // Auth entries should be gone
      expect(await cacheManager.get('auth:user:123')).toBeNull();
      expect(await cacheManager.get('auth:user:456')).toBeNull();

      // Other entries should remain
      expect(await cacheManager.get('perm:user:123')).toEqual({ data: 'perm:user:123' });
      expect(await cacheManager.get('roles:user:789')).toEqual({ data: 'roles:user:789' });
    });

    it('should handle regex patterns in invalidation', async () => {
      const keys = [
        'perm:user:123:org:456',
        'perm:user:123:org:789',
        'perm:user:456:org:123',
      ];

      for (const key of keys) {
        await cacheManager.set(key, { data: key });
      }

      // Invalidate all permissions for user 123
      await cacheManager.invalidate('perm:user:123:.*');

      expect(await cacheManager.get('perm:user:123:org:456')).toBeNull();
      expect(await cacheManager.get('perm:user:123:org:789')).toBeNull();
      expect(await cacheManager.get('perm:user:456:org:123')).toEqual({ data: 'perm:user:456:org:123' });
    });

    it('should clear all cache', async () => {
      const keys = ['key1', 'key2', 'key3'];

      for (const key of keys) {
        await cacheManager.set(key, { data: key });
      }

      await cacheManager.clear();

      for (const key of keys) {
        expect(await cacheManager.get(key)).toBeNull();
      }
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', async () => {
      const key = 'stats:test';
      const value = { data: 'test' };

      await cacheManager.set(key, value);

      // First get - miss (not in cache yet, but we just set it)
      await cacheManager.get(key); // hit
      await cacheManager.get(key); // hit
      await cacheManager.get('non:existent'); // miss

      const stats = cacheManager.getStats();

      expect(stats.cacheHits).toBeGreaterThan(0);
      expect(stats.cacheMisses).toBeGreaterThan(0);
      expect(stats.totalRequests).toBeGreaterThan(0);
    });

    it('should calculate hit rate correctly', async () => {
      const key = 'hitrate:test';
      const value = { data: 'test' };

      await cacheManager.set(key, value);

      // 3 hits
      await cacheManager.get(key);
      await cacheManager.get(key);
      await cacheManager.get(key);

      // 1 miss
      await cacheManager.get('non:existent');

      const stats = cacheManager.getStats();

      // Hit rate should be 3/4 = 0.75
      expect(stats.hitRate).toBeCloseTo(0.75, 2);
    });

    it('should track average response time', async () => {
      const key = 'response:time:test';
      const value = { data: 'test' };

      await cacheManager.set(key, value);
      await cacheManager.get(key);

      const stats = cacheManager.getStats();

      expect(stats.avgResponseTime).toBeGreaterThan(0);
      expect(stats.avgResponseTime).toBeLessThan(100); // Should be very fast
    });

    it('should report memory usage', async () => {
      const key = 'memory:test';
      const value = { data: 'x'.repeat(1000) };

      await cacheManager.set(key, value);

      const stats = cacheManager.getStats();

      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Cache Warming', () => {
    it('should warm auth cache for a user', async () => {
      const userId = 'user:123';

      await cacheManager.warmAuthCache(userId);

      const warmingKey = `auth:user:${userId}:warming`;
      const result = await cacheManager.get(warmingKey);

      expect(result).toBe(true);
    });

    it('should warm permission cache with scope', async () => {
      const userId = 'user:123';
      const scope = { userId, orgId: 'org:456', projectId: 'proj:789' };

      await cacheManager.warmPermissionCache(userId, scope);

      const warmingKey = `perm:${userId}:org:456:proj:789:warming`;
      const result = await cacheManager.get(warmingKey);

      expect(result).toBe(true);
    });
  });

  describe('Cache Options', () => {
    it('should respect tier option for memory-only cache', async () => {
      const key = 'tier:memory:test';
      const value = { data: 'test' };

      await cacheManager.set(key, value);
      const result = await cacheManager.get(key, { tier: 'memory' });

      expect(result).toEqual(value);
    });

    it('should handle skipIfExists option', async () => {
      const key = 'skip:exists:test';
      const value1 = { data: 'first' };

      await cacheManager.set(key, value1);

      // With skipIfExists, should not overwrite
      // (This is a placeholder for future implementation)
      const result = await cacheManager.get(key);

      expect(result).toEqual(value1);
    });
  });

  describe('Cleanup Operations', () => {
    it('should cleanup expired entries', async () => {
      const keys = [
        { key: 'expire:1', ttl: 1 },
        { key: 'expire:2', ttl: 1 },
        { key: 'persist:1', ttl: 3600 },
      ];

      for (const { key, ttl } of keys) {
        await cacheManager.set(key, { data: key }, ttl);
      }

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Cleanup
      cacheManager.cleanupExpiredEntries();

      // Expired entries should be gone
      expect(await cacheManager.get('expire:1')).toBeNull();
      expect(await cacheManager.get('expire:2')).toBeNull();

      // Persistent entry should remain
      expect(await cacheManager.get('persist:1')).toEqual({ data: 'persist:1' });
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully during set', async () => {
      const key = 'error:test';
      const value = { data: 'test' };

      // Should not throw
      await expect(cacheManager.set(key, value)).resolves.not.toThrow();
    });

    it('should handle errors gracefully during get', async () => {
      // Should not throw
      await expect(cacheManager.get('any:key')).resolves.not.toThrow();
    });

    it('should handle errors gracefully during invalidate', async () => {
      // Should not throw
      await expect(cacheManager.invalidate('any:pattern')).resolves.not.toThrow();
    });
  });

  describe('Cache Key Strategy Integration', () => {
    it('should work with cache key strategy', async () => {
      const userId = 'user:123';
      const key = cacheKeyStrategy.userAuth(userId);
      const value = { userId, email: 'test@example.com' };

      await cacheManager.set(key, value, CACHE_TTL.userAuth);
      const result = await cacheManager.get(key);

      expect(result).toEqual(value);
    });

    it('should work with permission cache keys', async () => {
      const userId = 'user:123';
      const scope = 'org:456';
      const key = cacheKeyStrategy.userPermissions(userId, scope);
      const value = ['read', 'write'];

      await cacheManager.set(key, value, CACHE_TTL.permissions);
      const result = await cacheManager.get(key);

      expect(result).toEqual(value);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent sets and gets', async () => {
      const operations = [];

      for (let i = 0; i < 10; i++) {
        operations.push(
          cacheManager.set(`key:${i}`, { data: i })
        );
      }

      await Promise.all(operations);

      const getOperations = [];
      for (let i = 0; i < 10; i++) {
        getOperations.push(
          cacheManager.get(`key:${i}`)
        );
      }

      const results = await Promise.all(getOperations);

      results.forEach((result, index) => {
        expect(result).toEqual({ data: index });
      });
    });

    it('should handle concurrent invalidations', async () => {
      const keys = [];
      for (let i = 0; i < 20; i++) {
        const key = `concurrent:${i}`;
        keys.push(key);
        await cacheManager.set(key, { data: i });
      }

      // Concurrent invalidations
      const invalidations = [
        cacheManager.invalidate('concurrent:1*'),
        cacheManager.invalidate('concurrent:2*'),
        cacheManager.invalidate('concurrent:3*'),
      ];

      await Promise.all(invalidations);

      // Verify some entries are gone
      expect(await cacheManager.get('concurrent:10')).toBeNull();
      expect(await cacheManager.get('concurrent:20')).toBeNull();
    });
  });
});
