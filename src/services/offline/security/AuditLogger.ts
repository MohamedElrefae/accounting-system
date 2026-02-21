/**
 * AuditLogger.ts
 * Immutable, blockchain-style audit trail for all offline financial operations.
 *
 * Every financial operation (create/update/delete/sync) is recorded as an
 * audit entry. Each entry contains a hash of the previous entry, creating
 * a tamper-evident chain. Any modification to a past entry breaks the chain.
 *
 * CRITICAL: Audit entries are APPEND-ONLY. Never delete or modify them.
 * The chain is verified server-side before any compliance report is generated.
 */

import { getOfflineDB } from '../core/OfflineSchema';
import {
  createAuditEntry,
  GENESIS_HASH,
  verifyAuditChain,
  type IntegrityReport,
} from './IntegrityValidator';
import type { AuditEntry } from '../core/OfflineTypes';

// ─── Device Info ──────────────────────────────────────────────────────────────

function getDeviceInfo() {
  return {
    deviceId: getOrCreateDeviceId(),
    browser: getBrowserName(),
    platform: navigator.platform || 'unknown',
  };
}

function getOrCreateDeviceId(): string {
  const key = 'offline_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `device_${crypto.randomUUID()}`;
    localStorage.setItem(key, id);
  }
  return id;
}

function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edge')) return 'Edge';
  return 'Unknown';
}

// ─── Last Hash Cache ──────────────────────────────────────────────────────────

let _lastHash: string | null = null;

/**
 * Get the hash of the most recent audit entry.
 * Used as the previousHash for the next entry.
 */
async function getLastAuditHash(): Promise<string> {
  if (_lastHash) return _lastHash;

  const db = getOfflineDB();
  // Get the most recent audit entry by timestamp
  const last = await db.auditLog
    .orderBy('timestamp')
    .last();

  _lastHash = last?.currentHash ?? GENESIS_HASH;
  return _lastHash;
}

// ─── Core Logging API ─────────────────────────────────────────────────────────

/**
 * Log a financial operation to the immutable audit trail.
 * This is the primary entry point for all audit logging.
 *
 * @param params - Audit event parameters
 * @returns The created AuditEntry (with hash chain fields populated)
 */
export async function logOperation(params: {
  operationId: string;
  userId: string;
  action: AuditEntry['action'];
  entityType: string;
  entityId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  offlineMode: boolean;
  syncedAt?: string;
}): Promise<AuditEntry> {
  const db = getOfflineDB();
  const previousHash = await getLastAuditHash();

  const entry = await createAuditEntry(
    {
      id: crypto.randomUUID(),
      operationId: params.operationId,
      userId: params.userId,
      timestamp: new Date().toISOString(),
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeState: params.beforeState,
      afterState: params.afterState,
      deviceInfo: getDeviceInfo(),
      offlineMode: params.offlineMode,
      syncedAt: params.syncedAt,
    },
    previousHash
  );

  // Store in IndexedDB (append-only)
  await db.auditLog.add(entry);

  // Update the cached last hash
  _lastHash = entry.currentHash;

  return entry;
}

// ─── Convenience Wrappers ─────────────────────────────────────────────────────

export async function logCreate(params: {
  userId: string;
  entityType: string;
  entityId: string;
  data: Record<string, unknown>;
  offlineMode: boolean;
}): Promise<AuditEntry> {
  return logOperation({
    operationId: crypto.randomUUID(),
    userId: params.userId,
    action: 'create',
    entityType: params.entityType,
    entityId: params.entityId,
    afterState: params.data,
    offlineMode: params.offlineMode,
  });
}

export async function logUpdate(params: {
  userId: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  offlineMode: boolean;
}): Promise<AuditEntry> {
  return logOperation({
    operationId: crypto.randomUUID(),
    userId: params.userId,
    action: 'update',
    entityType: params.entityType,
    entityId: params.entityId,
    beforeState: params.before,
    afterState: params.after,
    offlineMode: params.offlineMode,
  });
}

export async function logDelete(params: {
  userId: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown>;
  offlineMode: boolean;
}): Promise<AuditEntry> {
  return logOperation({
    operationId: crypto.randomUUID(),
    userId: params.userId,
    action: 'delete',
    entityType: params.entityType,
    entityId: params.entityId,
    beforeState: params.before,
    offlineMode: params.offlineMode,
  });
}

export async function logSync(params: {
  userId: string;
  entityType: string;
  entityId: string;
  syncedAt: string;
}): Promise<AuditEntry> {
  return logOperation({
    operationId: crypto.randomUUID(),
    userId: params.userId,
    action: 'sync',
    entityType: params.entityType,
    entityId: params.entityId,
    offlineMode: false,
    syncedAt: params.syncedAt,
  });
}

export async function logConflictResolved(params: {
  userId: string;
  entityType: string;
  entityId: string;
  conflictData: Record<string, unknown>;
  resolution: Record<string, unknown>;
}): Promise<AuditEntry> {
  return logOperation({
    operationId: crypto.randomUUID(),
    userId: params.userId,
    action: 'conflict_resolved',
    entityType: params.entityType,
    entityId: params.entityId,
    beforeState: params.conflictData,
    afterState: params.resolution,
    offlineMode: false,
  });
}

// ─── Query API ────────────────────────────────────────────────────────────────

/**
 * Get all audit entries for a specific entity, in chronological order.
 */
export async function getEntityAuditTrail(
  entityType: string,
  entityId: string
): Promise<AuditEntry[]> {
  const db = getOfflineDB();
  return db.auditLog
    .where('[entityType+entityId]')
    .equals([entityType, entityId])
    .sortBy('timestamp');
}

/**
 * Get all audit entries for a user, in chronological order.
 */
export async function getUserAuditTrail(userId: string): Promise<AuditEntry[]> {
  const db = getOfflineDB();
  return db.auditLog
    .where('userId')
    .equals(userId)
    .sortBy('timestamp');
}

/**
 * Get recent audit entries (last N entries).
 */
export async function getRecentAuditEntries(limit = 100): Promise<AuditEntry[]> {
  const db = getOfflineDB();
  const all = await db.auditLog.orderBy('timestamp').reverse().limit(limit).toArray();
  return all.reverse(); // Return in chronological order
}

// ─── Chain Verification ───────────────────────────────────────────────────────

/**
 * Verify the integrity of the local audit chain.
 * Should be run on startup and periodically.
 */
export async function verifyLocalAuditChain(): Promise<IntegrityReport> {
  const db = getOfflineDB();
  const entries = await db.auditLog.orderBy('timestamp').toArray();

  const result = await verifyAuditChain(entries);

  return {
    valid: result.isValid,
    checkedCount: entries.length,
    failedIds: result.firstInvalidIndex >= 0 ? [entries[result.firstInvalidIndex].id] : [],
    errors: result.reason ? [result.reason] : [],
  };
}

/**
 * Export audit trail as JSON for compliance reporting.
 * Includes chain verification result.
 */
export async function exportAuditTrail(): Promise<{
  entries: AuditEntry[];
  chainValid: boolean;
  exportedAt: string;
  deviceId: string;
}> {
  const db = getOfflineDB();
  const entries = await db.auditLog.orderBy('timestamp').toArray();
  const chainResult = await verifyAuditChain(entries);

  return {
    entries,
    chainValid: chainResult.isValid,
    exportedAt: new Date().toISOString(),
    deviceId: getOrCreateDeviceId(),
  };
}
