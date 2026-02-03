/**
 * Cache Service Module
 * 
 * Exports unified cache manager and related utilities
 */

export {
  CacheManager,
  getCacheManager,
  resetCacheManager,
  type CacheOptions,
  type CacheStats,
  type CacheEntry,
  type AuthScope,
} from './CacheManager';

export {
  cacheKeyStrategy,
  cacheInvalidationPatterns,
  CACHE_TTL,
  computePermissionChecksum,
  CacheKeyBuilder,
  type CacheKeyStrategy,
} from './CacheKeyStrategy';
