/**
 * SyncQueueManager.ts
 * Manages the queue of offline operations waiting to be synced to the server.
 *
 * Features:
 * - Priority-based queue (payments > invoices > journal entries)
 * - Encrypted operation storage
 * - Exponential backoff retry with max attempts
 * - Checkpoint-based resumable sync
 * - Semantic duplicate detection for payments
 */

import { getOfflineDB } from '../core/OfflineSchema';
import { DB_CONSTANTS, calculateBackoffDelay } from '../core/OfflineConfig';
import { encryptData, decryptData, isSessionActive } from '../security/OfflineEncryption';
import type { SyncOperation, SyncQueueEntry, QueueStatus } from '../core/OfflineTypes';

// ─── Priority Levels ──────────────────────────────────────────────────────────

const OPERATION_PRIORITY: Record<string, number> = {
  payment: 100,       // Highest — financial impact
  invoice: 80,
  transaction: 70,
  journal_entry: 60,
  attachment: 20,     // Lowest — can be deferred
};

function getPriority(entityType: string): number {
  return OPERATION_PRIORITY[entityType] ?? 50;
}

// ─── Enqueue ──────────────────────────────────────────────────────────────────

/**
 * Add an operation to the sync queue.
 * Operations are encrypted before storage.
 */
export async function enqueueOperation(operation: SyncOperation): Promise<SyncQueueEntry> {
  const db = getOfflineDB();
  const now = new Date().toISOString();

  // Encrypt the operation data if session is active
  let encryptedOperation: string | undefined;
  if (isSessionActive()) {
    const encrypted = await encryptData(operation, 'confidential');
    encryptedOperation = JSON.stringify(encrypted);
  }

  const entry: SyncQueueEntry & { _encryptedOperation?: string } = {
    id: crypto.randomUUID(),
    operation,
    priority: getPriority(operation.entityType),
    retryCount: 0,
    maxRetries: DB_CONSTANTS.MAX_SYNC_RETRIES,
    nextRetryAt: now,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    _encryptedOperation: encryptedOperation,
  };

  await db.syncQueue.add(entry);
  return entry;
}

// ─── Dequeue ──────────────────────────────────────────────────────────────────

/**
 * Get the next batch of operations to process, ordered by priority then creation time.
 * Only returns operations that are ready to retry (nextRetryAt <= now).
 */
export async function dequeue(batchSize = 10): Promise<SyncQueueEntry[]> {
  const db = getOfflineDB();
  const now = new Date().toISOString();

  const entries = await db.syncQueue
    .where('status')
    .equals('pending')
    .filter(e => e.nextRetryAt <= now)
    .sortBy('priority');

  // Sort descending by priority, then ascending by createdAt
  entries.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.createdAt.localeCompare(b.createdAt);
  });

  const batch = entries.slice(0, batchSize);

  // Decrypt operations if needed
  return Promise.all(batch.map(decryptQueueEntry));
}

// ─── Status Updates ───────────────────────────────────────────────────────────

/**
 * Mark an operation as successfully synced.
 */
export async function markSynced(entryId: string): Promise<void> {
  const db = getOfflineDB();
  await db.syncQueue.update(entryId, {
    status: 'synced' as QueueStatus,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Mark an operation as failed and schedule a retry with exponential backoff.
 * If max retries exceeded, marks as permanently failed.
 */
export async function markFailed(entryId: string, error: string): Promise<void> {
  const db = getOfflineDB();
  const entry = await db.syncQueue.get(entryId);
  if (!entry) return;

  const newRetryCount = entry.retryCount + 1;
  const delay = calculateBackoffDelay(newRetryCount, entry.maxRetries);

  if (delay === Infinity) {
    // Max retries exceeded — permanently failed
    await db.syncQueue.update(entryId, {
      status: 'failed' as QueueStatus,
      retryCount: newRetryCount,
      error,
      updatedAt: new Date().toISOString(),
    });
    console.warn(`[SyncQueue] Operation ${entryId} permanently failed after ${newRetryCount} attempts.`);
  } else {
    // Schedule retry
    const nextRetryAt = new Date(Date.now() + delay).toISOString();
    await db.syncQueue.update(entryId, {
      status: 'pending' as QueueStatus,
      retryCount: newRetryCount,
      nextRetryAt,
      error,
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Mark an operation as having a conflict requiring manual resolution.
 */
export async function markConflict(entryId: string, conflictDetails: string): Promise<void> {
  const db = getOfflineDB();
  await db.syncQueue.update(entryId, {
    status: 'conflict' as QueueStatus,
    error: conflictDetails,
    updatedAt: new Date().toISOString(),
  });
}

// ─── Queue Inspection ─────────────────────────────────────────────────────────

export async function getQueueLength(): Promise<number> {
  const db = getOfflineDB();
  return db.syncQueue.where('status').equals('pending').count();
}

export async function getFailedCount(): Promise<number> {
  const db = getOfflineDB();
  return db.syncQueue.where('status').equals('failed').count();
}

export async function getConflictCount(): Promise<number> {
  const db = getOfflineDB();
  return db.syncQueue.where('status').equals('conflict').count();
}

export async function getAllPending(): Promise<SyncQueueEntry[]> {
  const db = getOfflineDB();
  const entries = await db.syncQueue.where('status').equals('pending').toArray();
  return Promise.all(entries.map(decryptQueueEntry));
}

export async function getAllFailed(): Promise<SyncQueueEntry[]> {
  const db = getOfflineDB();
  const entries = await db.syncQueue.where('status').equals('failed').toArray();
  return Promise.all(entries.map(decryptQueueEntry));
}

export async function getAllConflicts(): Promise<SyncQueueEntry[]> {
  const db = getOfflineDB();
  const entries = await db.syncQueue.where('status').equals('conflict').toArray();
  return Promise.all(entries.map(decryptQueueEntry));
}

/**
 * Peek at the next operation without removing it from the queue.
 */
export async function peek(): Promise<SyncQueueEntry | null> {
  const batch = await dequeue(1);
  return batch[0] ?? null;
}

// ─── Semantic Duplicate Detection ─────────────────────────────────────────────

/**
 * Check if an incoming operation is a suspected semantic duplicate of an existing queued operation.
 *
 * Duplicate criteria (per engineering review):
 * - Same entity type (e.g., 'payment')
 * - Same supplier/account (within operation data)
 * - Amount within ±5%
 * - Date within ±3 days
 *
 * CRITICAL: Payment conflicts must NEVER be auto-resolved — always require human confirmation.
 */
export async function detectSemanticDuplicates(
  operation: SyncOperation
): Promise<Array<{ entry: SyncQueueEntry; matchScore: number; matchReasons: string[] }>> {
  if (operation.entityType !== 'payment' && operation.entityType !== 'transaction') {
    return []; // Only check payments and transactions
  }

  const pending = await getAllPending();
  const duplicates: Array<{ entry: SyncQueueEntry; matchScore: number; matchReasons: string[] }> = [];

  for (const entry of pending) {
    if (entry.operation.entityType !== operation.entityType) continue;
    if (entry.operation.id === operation.id) continue;

    const reasons: string[] = [];
    let score = 0;

    const opData = operation.data as Record<string, unknown>;
    const entryData = entry.operation.data as Record<string, unknown>;

    // Check supplier/account match
    if (opData.supplierId && opData.supplierId === entryData.supplierId) {
      reasons.push('same supplier');
      score += 0.4;
    }
    if (opData.accountId && opData.accountId === entryData.accountId) {
      reasons.push('same account');
      score += 0.2;
    }

    // Check amount within ±5%
    const opAmount = Number(opData.totalAmount ?? opData.amount ?? 0);
    const entryAmount = Number(entryData.totalAmount ?? entryData.amount ?? 0);
    if (opAmount > 0 && entryAmount > 0) {
      const diff = Math.abs(opAmount - entryAmount) / Math.max(opAmount, entryAmount);
      if (diff <= 0.05) {
        reasons.push(`amount within 5% (${opAmount} vs ${entryAmount})`);
        score += 0.3;
      }
    }

    // Check date within ±3 days
    const opDate = new Date(String(opData.date ?? operation.timestamp));
    const entryDate = new Date(String(entryData.date ?? entry.operation.timestamp));
    const daysDiff = Math.abs(opDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff <= 3) {
      reasons.push(`date within 3 days (${daysDiff.toFixed(1)} days apart)`);
      score += 0.1;
    }

    // Flag as suspected duplicate if score >= 0.7
    if (score >= 0.7) {
      duplicates.push({ entry, matchScore: score, matchReasons: reasons });
    }
  }

  return duplicates;
}

// ─── Checkpoint Support ───────────────────────────────────────────────────────

/**
 * Save a sync checkpoint (for resumable sync after interruption).
 */
export async function saveCheckpoint(
  syncedOperationIds: string[],
  pendingOperationIds: string[]
): Promise<void> {
  const db = getOfflineDB();
  await db.syncCheckpoints.put({
    id: 'current',
    timestamp: new Date().toISOString(),
    lastSyncedOperationIndex: syncedOperationIds.length,
    totalOperations: syncedOperationIds.length + pendingOperationIds.length,
    syncedOperationIds,
    pendingOperationIds,
  });
}

/**
 * Get the last saved checkpoint (for resuming interrupted sync).
 */
export async function getLastCheckpoint() {
  const db = getOfflineDB();
  return db.syncCheckpoints.get('current');
}

/**
 * Clear checkpoints after successful sync completion.
 */
export async function clearCheckpoints(): Promise<void> {
  const db = getOfflineDB();
  await db.syncCheckpoints.clear();
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

/**
 * Remove all successfully synced operations from the queue.
 * Should be called periodically to keep the queue clean.
 */
export async function purgeSyncedOperations(): Promise<number> {
  const db = getOfflineDB();
  const synced = await db.syncQueue.where('status').equals('synced').toArray();
  await db.syncQueue.bulkDelete(synced.map(e => e.id));
  return synced.length;
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function decryptQueueEntry(
  entry: SyncQueueEntry & { _encryptedOperation?: string }
): Promise<SyncQueueEntry> {
  if (entry._encryptedOperation && isSessionActive()) {
    try {
      const encryptedData = JSON.parse(entry._encryptedOperation);
      const operation = await decryptData<SyncOperation>(encryptedData);
      return { ...entry, operation };
    } catch {
      // Decryption failed — return entry with original operation data
    }
  }
  return entry;
}
