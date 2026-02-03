/**
 * Cache Layer Error Handler
 * 
 * Feature: enterprise-auth-performance-optimization
 * Implements resilient cache manager with graceful degradation
 * 
 * Validates: Requirements 7.3
 */

export interface CacheError extends Error {
  code?: string;
  isTransient?: boolean;
}

export interface CacheRecoveryStrategy {
  type: 'retry' | 'degrade' | 'bypass' | 'fail';
  message: string;
  fallbackToDirect?: boolean;
  retryAfter?: number;
}

/**
 * Cache Error Handler
 * 
 * Handles errors from cache operations with graceful degradation:
 * - Redis connection failures: Fall back to memory cache
 * - Cache corruption: Invalidate and refresh from database
 * - Memory cache overflow: Evict least recently used entries
 * - Serialization errors: Skip caching and use direct database access
 */
export class CacheErrorHandler {
  private redisFailureCount = 0;
  private redisFailureThreshold = 5;
  private redisRecoveryTimeMs = 60000; // 1 minute
  private lastRedisFailureTime = 0;
  private isRedisDisabled = false;

  /**
   * Handle Redis connection errors
   * 
   * If Redis connection fails repeatedly, disable Redis and fall back
   * to memory cache only. This prevents cascading failures.
   */
  async handleRedisConnectionError(error: CacheError): Promise<CacheRecoveryStrategy> {
    console.warn('Redis connection error:', error);

    this.redisFailureCount++;
    this.lastRedisFailureTime = Date.now();

    // Log the error
    this.logError('REDIS_CONNECTION_FAILED', error, {
      failureCount: this.redisFailureCount,
    });

    // If Redis has failed too many times, disable it temporarily
    if (this.redisFailureCount >= this.redisFailureThreshold) {
      this.isRedisDisabled = true;
      console.warn(
        `Redis disabled after ${this.redisFailureCount} failures. ` +
        `Will retry in ${this.redisRecoveryTimeMs}ms`
      );

      return {
        type: 'degrade',
        message: 'Redis disabled, using memory cache only',
        fallbackToDirect: false,
        retryAfter: this.redisRecoveryTimeMs,
      };
    }

    // For transient errors, retry
    if (error.isTransient) {
      return {
        type: 'retry',
        message: 'Redis connection error (transient), retrying',
        fallbackToDirect: false,
        retryAfter: 1000,
      };
    }

    // For persistent errors, degrade
    return {
      type: 'degrade',
      message: 'Redis connection error, using memory cache only',
      fallbackToDirect: false,
      retryAfter: 5000,
    };
  }

  /**
   * Handle cache corruption detection and recovery
   * 
   * If cache data appears corrupted, invalidate it and refresh from database.
   */
  async handleCacheCorruption(key: string): Promise<CacheRecoveryStrategy> {
    console.warn(`Cache corruption detected for key: ${key}`);

    // Log the error
    this.logError('CACHE_CORRUPTION_DETECTED', new Error('Cache corruption'), {
      key,
    });

    return {
      type: 'bypass',
      message: `Cache corrupted for key ${key}, refreshing from database`,
      fallbackToDirect: true,
    };
  }

  /**
   * Handle memory cache overflow
   * 
   * When memory cache exceeds threshold, evict least recently used entries.
   */
  async handleMemoryCacheOverflow(): Promise<CacheRecoveryStrategy> {
    console.warn('Memory cache overflow detected');

    // Log the error
    this.logError('MEMORY_CACHE_OVERFLOW', new Error('Memory cache overflow'), {
      timestamp: new Date().toISOString(),
    });

    return {
      type: 'degrade',
      message: 'Memory cache overflow, evicting least recently used entries',
      fallbackToDirect: false,
    };
  }

  /**
   * Handle serialization errors
   * 
   * If data cannot be serialized for caching, skip caching and use
   * direct database access.
   */
  async handleSerializationError(
    key: string,
    error: Error
  ): Promise<CacheRecoveryStrategy> {
    console.warn(`Serialization error for key ${key}:`, error);

    // Log the error
    this.logError('SERIALIZATION_ERROR', error as CacheError, {
      key,
    });

    return {
      type: 'bypass',
      message: `Cannot serialize data for key ${key}, using direct database access`,
      fallbackToDirect: true,
    };
  }

  /**
   * Check if Redis should be retried
   * 
   * If Redis has been disabled, check if recovery time has passed.
   */
  shouldRetryRedis(): boolean {
    if (!this.isRedisDisabled) {
      return true;
    }

    const timeSinceFailure = Date.now() - this.lastRedisFailureTime;
    if (timeSinceFailure >= this.redisRecoveryTimeMs) {
      console.log('Attempting to recover Redis connection');
      this.isRedisDisabled = false;
      this.redisFailureCount = 0;
      return true;
    }

    return false;
  }

  /**
   * Check if Redis is currently disabled
   */
  isRedisDegraded(): boolean {
    return this.isRedisDisabled;
  }

  /**
   * Reset Redis failure count (called on successful connection)
   */
  resetRedisFailureCount(): void {
    this.redisFailureCount = 0;
    this.isRedisDisabled = false;
  }

  /**
   * Get cache error statistics
   */
  getStats(): {
    redisFailureCount: number;
    isRedisDisabled: boolean;
    timeSinceLastFailure: number;
  } {
    return {
      redisFailureCount: this.redisFailureCount,
      isRedisDisabled: this.isRedisDisabled,
      timeSinceLastFailure: Date.now() - this.lastRedisFailureTime,
    };
  }

  /**
   * Log error for monitoring and debugging
   */
  private logError(
    errorType: string,
    error: Error,
    context?: Record<string, any>
  ): void {
    const errorLog = {
      timestamp: new Date().toISOString(),
      type: errorType,
      message: error.message,
      context,
    };

    console.error('Cache Error Log:', errorLog);

    // TODO: Send to monitoring service (e.g., Sentry, DataDog)
  }
}

// Singleton instance
let cacheErrorHandlerInstance: CacheErrorHandler | null = null;

/**
 * Get or create cache error handler instance
 */
export function getCacheErrorHandler(): CacheErrorHandler {
  if (!cacheErrorHandlerInstance) {
    cacheErrorHandlerInstance = new CacheErrorHandler();
  }
  return cacheErrorHandlerInstance;
}

/**
 * Reset error handler (for testing)
 */
export function resetCacheErrorHandler(): void {
  cacheErrorHandlerInstance = null;
}
