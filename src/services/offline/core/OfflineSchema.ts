/**
 * OfflineSchema.ts
 * Dexie.js database schema for the offline-first accounting system.
 *
 * IMPORTANT: When adding new stores or indexes, increment DB_VERSION in OfflineConfig.ts
 * and add a new `.version(N).stores(...)` block. Never modify existing version blocks.
 */

import Dexie, { type Table } from 'dexie';
import { DB_CONSTANTS } from './OfflineConfig';
import type {
  Transaction,
  TransactionLine,
  SyncQueueEntry,
  AuditEntry,
  OfflineLock,
  SyncCheckpoint,
  SystemHealthCheck,
  RecoveryMetrics,
  SecurityEvent,
} from './OfflineTypes';

// ─── Stored Record Types ──────────────────────────────────────────────────────
// These extend the base types with IndexedDB-specific fields.

export interface StoredTransaction extends Omit<Transaction, 'lines'> {
  /** Dexie primary key — uses localId if offline, id if synced */
  _pk: string;
  /** Encrypted payload blob (when encryption enabled) */
  _encryptedPayload?: string;
  /** Timestamp for TTL-based eviction */
  _storedAt: string;
}

export interface StoredTransactionLine extends TransactionLine {
  _pk: string;
  _encryptedPayload?: string;
  _storedAt: string;
}

export interface StoredSyncQueueEntry extends SyncQueueEntry {
  /** Encrypted operation data */
  _encryptedOperation?: string;
}

export interface StoredAuditEntry extends AuditEntry {
  // Audit entries are stored as-is; they are append-only
}

export interface StoredSecurityEvent extends SecurityEvent {
  // Security events stored as-is
}

// ─── Dexie Database Class ─────────────────────────────────────────────────────

export class OfflineDatabase extends Dexie {
  // Object store tables
  transactions!: Table<StoredTransaction, string>;
  transactionLines!: Table<StoredTransactionLine, string>;
  syncQueue!: Table<StoredSyncQueueEntry, string>;
  auditLog!: Table<StoredAuditEntry, string>;
  offlineLocks!: Table<OfflineLock, string>;
  syncCheckpoints!: Table<SyncCheckpoint, string>;
  healthChecks!: Table<SystemHealthCheck, string>;
  recoveryEvents!: Table<RecoveryMetrics, string>;
  securityEvents!: Table<StoredSecurityEvent, string>;
  /** Key-value store for misc metadata (last sync time, canary values, etc.) */
  metadata!: Table<{ key: string; value: unknown; updatedAt: string }, string>;

  constructor() {
    super(DB_CONSTANTS.DB_NAME);

    /**
     * Version 1 — Initial schema
     *
     * Index syntax:
     *   &field   = primary key (unique)
     *   field    = indexed (non-unique)
     *   [f1+f2]  = compound index
     *   *field   = multi-entry index (for arrays)
     */
    /**
     * Version 1 — Initial schema (Legacy camelCase)
     */
    this.version(1).stores({
      transactions: '&_pk, id, syncStatus, fiscalPeriodId, organizationId, projectId, date, createdBy, _storedAt',
      transactionLines: '&_pk, id, transactionId, accountId, syncStatus',
      syncQueue: '&id, status, priority, nextRetryAt, [status+priority]',
      auditLog: '&id, entityId, entityType, userId, timestamp, action',
      offlineLocks: '&id, resourceId, resourceType, userId, expiresAt',
      syncCheckpoints: '&id, timestamp',
      healthChecks: '&timestamp',
      recoveryEvents: '&recoveryId, recoveryType, startTime',
      securityEvents: '&id, type, userId, timestamp, severity',
      metadata: '&key',
    });

    /**
     * Version 2 — Standardized snake_case to match Supabase
     */
    this.version(2).stores({
      // Transactions: primary key _pk, indexed by syncStatus, entry_date, org_id
      transactions: '&_pk, id, syncStatus, fiscal_period_id, org_id, project_id, entry_date, created_by, _storedAt',

      // Transaction lines: primary key _pk, indexed by transaction_id
      transactionLines: '&_pk, id, transaction_id, account_id, syncStatus',

      // Sync queue
      syncQueue: '&id, status, priority, nextRetryAt, [status+priority]',

      // Audit log
      auditLog: '&id, entityId, entityType, userId, timestamp, action',

      // Offline locks
      offlineLocks: '&id, resourceId, resourceType, userId, expiresAt',

      // Sync checkpoints
      syncCheckpoints: '&id, timestamp',

      // Health checks
      healthChecks: '&timestamp',

      // Recovery events
      recoveryEvents: '&recoveryId, recoveryType, startTime',

      // Security events
      securityEvents: '&id, type, userId, timestamp, severity',

      // Metadata key-value store
      metadata: '&key',
    });

    // Map tables to class properties
    this.transactions = this.table('transactions');
    this.transactionLines = this.table('transactionLines');
    this.syncQueue = this.table('syncQueue');
    this.auditLog = this.table('auditLog');
    this.offlineLocks = this.table('offlineLocks');
    this.syncCheckpoints = this.table('syncCheckpoints');
    this.healthChecks = this.table('healthChecks');
    this.recoveryEvents = this.table('recoveryEvents');
    this.securityEvents = this.table('securityEvents');
    this.metadata = this.table('metadata');
  }
}

// ─── Singleton Instance ───────────────────────────────────────────────────────

let _db: OfflineDatabase | null = null;

/**
 * Get the singleton OfflineDatabase instance.
 * Lazily initialized on first call.
 */
export function getOfflineDB(): OfflineDatabase {
  if (!_db) {
    _db = new OfflineDatabase();
  }
  return _db;
}

/**
 * Close and destroy the database instance.
 * Used during secure wipe and testing teardown.
 */
export async function destroyOfflineDB(): Promise<void> {
  if (_db) {
    _db.close();
    _db = null;
  }
  await Dexie.delete(DB_CONSTANTS.DB_NAME);
}

/**
 * Check if the offline database exists in this browser.
 */
export async function offlineDBExists(): Promise<boolean> {
  return Dexie.exists(DB_CONSTANTS.DB_NAME);
}

/**
 * Request persistent storage from the browser.
 * Without this, browsers may evict IndexedDB data under storage pressure.
 * Returns true if granted, false if denied or unavailable.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) {
    console.warn('[OfflineDB] Persistent Storage API not available on this browser.');
    return false;
  }
  const granted = await navigator.storage.persist();
  if (granted) {
    console.info('[OfflineDB] Persistent storage granted — data will not be evicted automatically.');
  } else {
    console.warn('[OfflineDB] Persistent storage denied — data may be evicted under storage pressure.');
  }
  return granted;
}

/**
 * Get current storage quota usage.
 */
export async function getStorageEstimate(): Promise<{ used: number; quota: number; percent: number }> {
  if (!navigator.storage?.estimate) {
    return { used: 0, quota: 0, percent: 0 };
  }
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return {
    used: usage,
    quota,
    percent: quota > 0 ? usage / quota : 0,
  };
}
