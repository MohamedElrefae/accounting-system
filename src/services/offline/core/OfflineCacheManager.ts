/**
 * OfflineCacheManager.ts
 * Centralized service to manage metadata-based caches in Dexie with TTL support.
 */

import { getOfflineDB } from './OfflineSchema';
import { DB_CONSTANTS } from './OfflineConfig';

export interface CacheWrapper<T> {
  key: string;
  value: T;
  updatedAt: string;
}

export class OfflineCacheManager {
  /**
   * Get values from cache with TTL check.
   * Returns null if missing or expired.
   */
  async get<T>(key: string, ttlOverride?: number): Promise<T | null> {
    try {
      const db = getOfflineDB();
      const cached = await db.metadata.get(key) as CacheWrapper<T> | undefined;

      if (!cached) return null;

      const ttl = ttlOverride ?? this.getTTLForKey(key);
      const isExpired = Date.now() - new Date(cached.updatedAt).getTime() > ttl;

      if (isExpired) {
        if (import.meta.env.DEV) console.debug(`[OfflineCacheManager] Cache expired for key: ${key}`);
        return null;
      }

      return cached.value;
    } catch (err) {
      console.error(`[OfflineCacheManager] Failed to get cache for key ${key}:`, err);
      return null;
    }
  }

  /**
   * Set value in cache with current timestamp.
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      const db = getOfflineDB();
      await db.metadata.put({
        key,
        value,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(`[OfflineCacheManager] Failed to set cache for key ${key}:`, err);
    }
  }

  /**
   * Checks if a cache key is stale (exceeds TTL).
   */
  async isStale(key: string): Promise<boolean> {
    try {
      const db = getOfflineDB();
      const cached = await db.metadata.get(key);
      if (!cached) return true;

      const ttl = this.getTTLForKey(key);
      return Date.now() - new Date(cached.updatedAt).getTime() > ttl;
    } catch {
      return true;
    }
  }

  /**
   * Checks if enough time has passed since last re-seed attempt.
   */
  async needsReseed(key: string): Promise<boolean> {
    try {
      const db = getOfflineDB();
      const cached = await db.metadata.get(key);
      if (!cached) return true;

      // Reseed if older than half the TTL or specific reseed interval
      const lastUpdate = new Date(cached.updatedAt).getTime();
      return Date.now() - lastUpdate > DB_CONSTANTS.RESEED_INTERVAL;
    } catch {
      return true;
    }
  }

  /**
   * Get TTL for a specific key from config or default.
   */
  private getTTLForKey(key: string): number {
    if (key.includes('projects')) return DB_CONSTANTS.CACHE_TTL.PROJECTS;
    if (key.includes('organizations')) return DB_CONSTANTS.CACHE_TTL.ORGANIZATIONS;
    if (key.includes('accounts')) return DB_CONSTANTS.CACHE_TTL.ACCOUNTS;
    return DB_CONSTANTS.CACHE_TTL.DEFAULTS;
  }
}

export const offlineCacheManager = new OfflineCacheManager();
