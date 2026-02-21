/**
 * OfflineConfig.ts
 * Environment and platform-specific configuration for the offline-first system.
 * Handles desktop vs mobile differences, storage caps, and sync intervals.
 */

import type { PlatformSyncConfig } from './OfflineTypes';

// ─── Storage Constants ────────────────────────────────────────────────────────

export const STORAGE_CONSTANTS = {
  /** Hard cap for mobile browsers (Safari iOS has very limited quota) */
  MOBILE_STORAGE_CAP_BYTES: 200 * 1024 * 1024,  // 200MB

  /** Warning threshold — show user warning at 80% */
  QUOTA_WARNING_THRESHOLD: 0.80,

  /** Critical threshold — block new writes at 95% */
  QUOTA_CRITICAL_THRESHOLD: 0.95,

  /** Default attachment mode on mobile — never store full attachments */
  MOBILE_ATTACHMENT_MODE: 'cloud-reference' as const,

  /** Default attachment mode on desktop */
  DESKTOP_ATTACHMENT_MODE: 'thumbnail-only' as const,
} as const;

// ─── Database Constants ───────────────────────────────────────────────────────

export const DB_CONSTANTS = {
  /** Dexie database name */
  DB_NAME: 'accounting_offline_db',

  /** Current schema version — increment when schema changes */
  DB_VERSION: 2,

  /** Prefix for local-only IDs (not yet synced to server) */
  LOCAL_ID_PREFIX: 'local_',

  /** Max retries for a failed sync operation */
  MAX_SYNC_RETRIES: 5,

  /** Checkpoint every N operations during sync */
  CHECKPOINT_INTERVAL: 10,
} as const;

// ─── Security Constants ───────────────────────────────────────────────────────

export const SECURITY_CONSTANTS = {
  /** PBKDF2 iterations — NIST recommends ≥ 100,000 */
  PBKDF2_ITERATIONS: 100_000,

  /** Auto-lock timeout in milliseconds (5 minutes) */
  AUTO_LOCK_TIMEOUT_MS: 5 * 60 * 1000,

  /** PIN minimum length */
  PIN_MIN_LENGTH: 6,

  /** Max wrong PIN attempts before lockout */
  MAX_PIN_ATTEMPTS: 5,

  /** Lockout duration after max failed attempts (15 minutes) */
  LOCKOUT_DURATION_MS: 15 * 60 * 1000,
} as const;

// ─── Platform Detection ───────────────────────────────────────────────────────

export function detectPlatform(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export function isMobilePlatform(): boolean {
  return detectPlatform() !== 'desktop';
}

export function isIOS(): boolean {
  return detectPlatform() === 'ios';
}

// ─── Platform Capabilities ────────────────────────────────────────────────────

export interface PlatformCapabilities {
  backgroundSync: boolean;
  periodicSync: boolean;
  batteryAPI: boolean;
  persistentStorage: boolean;
  networkInfoAPI: boolean;
  pushNotifications: boolean;
}

export function detectCapabilities(): PlatformCapabilities {
  return {
    backgroundSync: 'serviceWorker' in navigator && 'SyncManager' in window,
    periodicSync: 'serviceWorker' in navigator && 'PeriodicSyncManager' in window,
    batteryAPI: 'getBattery' in navigator,
    persistentStorage: 'storage' in navigator && 'persist' in navigator.storage,
    networkInfoAPI: 'connection' in navigator,
    pushNotifications: 'Notification' in window && 'PushManager' in window,
  };
}

// ─── Sync Configuration ───────────────────────────────────────────────────────

const DESKTOP_SYNC_CONFIG: PlatformSyncConfig = {
  isMobile: false,
  periodicSyncInterval: 60 * 60 * 1000,    // 1 hour
  maxConcurrentOperations: 50,
  retryAttempts: 5,
  batteryThreshold: 0,                      // No battery check on desktop
};

const MOBILE_SYNC_CONFIG: PlatformSyncConfig = {
  isMobile: true,
  periodicSyncInterval: 2 * 60 * 60 * 1000, // 2 hours (conserve battery)
  maxConcurrentOperations: 20,               // Smaller batches
  retryAttempts: 3,                          // Fewer retries
  batteryThreshold: 0.20,                    // Only sync if battery > 20%
  preferWiFi: true,
  mobileCap: STORAGE_CONSTANTS.MOBILE_STORAGE_CAP_BYTES,
};

export function getPlatformSyncConfig(): PlatformSyncConfig {
  return isMobilePlatform() ? MOBILE_SYNC_CONFIG : DESKTOP_SYNC_CONFIG;
}

// ─── Feature Flags ────────────────────────────────────────────────────────────

export const OFFLINE_FEATURE_FLAGS = {
  /** Master switch — set via environment variable */
  OFFLINE_MODE_ENABLED: import.meta.env.VITE_OFFLINE_MODE === 'true',

  /** Beta user list (comma-separated emails) */
  BETA_USERS: (import.meta.env.VITE_OFFLINE_BETA_USERS || '').split(',').filter(Boolean),

  /** Gradual rollout percentage (0.0 to 1.0) */
  ROLLOUT_PERCENTAGE: parseFloat(import.meta.env.VITE_OFFLINE_ROLLOUT || '0'),

  /** Enable encryption (should always be true in production) */
  ENCRYPTION_ENABLED: import.meta.env.VITE_OFFLINE_ENCRYPTION !== 'false',

  /** Enable chaos testing tools (dev only) */
  CHAOS_TESTING_ENABLED: import.meta.env.DEV === true,
} as const;

/**
 * Determine if offline mode should be enabled for a given user.
 */
export function isOfflineEnabledForUser(userEmail: string): boolean {
  if (!OFFLINE_FEATURE_FLAGS.OFFLINE_MODE_ENABLED) return false;
  if (OFFLINE_FEATURE_FLAGS.BETA_USERS.includes(userEmail)) return true;
  if (OFFLINE_FEATURE_FLAGS.ROLLOUT_PERCENTAGE > 0) {
    // Deterministic hash-based rollout (same user always gets same result)
    const hash = userEmail.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return (hash % 100) / 100 < OFFLINE_FEATURE_FLAGS.ROLLOUT_PERCENTAGE;
  }
  return false;
}

// ─── Backoff Strategy ─────────────────────────────────────────────────────────

/**
 * Calculate exponential backoff delay for retry attempt N.
 * Returns Infinity when max attempts exceeded (stop retrying).
 */
export function calculateBackoffDelay(attempt: number, maxAttempts: number): number {
  if (attempt >= maxAttempts) return Infinity;
  // 1s, 2s, 4s, 8s, 16s
  return 1000 * Math.pow(2, attempt);
}
