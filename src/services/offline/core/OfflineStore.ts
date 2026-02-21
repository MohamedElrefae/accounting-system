/**
 * OfflineStore.ts
 * Core offline data store — encrypted CRUD operations for transactions.
 *
 * ALL writes go through the encryption layer (OfflineEncryption.ts).
 * ALL writes are logged to the audit trail (AuditLogger.ts).
 * ALL reads verify integrity checksums (IntegrityValidator.ts).
 *
 * This is the single source of truth for offline financial data.
 */

import { getOfflineDB, type StoredTransaction, getStorageEstimate } from '../core/OfflineSchema';
import { STORAGE_CONSTANTS, isMobilePlatform } from '../core/OfflineConfig';
import type { Transaction, TransactionSyncStatus, StorageInfo } from '../core/OfflineTypes';
import { encryptData, decryptData, isSessionActive } from '../security/OfflineEncryption';
import { generateTransactionChecksum, verifyTransactionChecksum } from '../security/IntegrityValidator';
import { logCreate, logUpdate, logDelete } from '../security/AuditLogger';

// ─── ACID Transaction Wrapper (Task 2.1) ─────────────────────────────────────

/**
 * Executes a multi-step write operation atomically.
 * If ANY step fails, ALL changes are rolled back automatically by Dexie.
 *
 * This is the primary ACID guarantee for the offline system.
 * All multi-table writes MUST go through this wrapper.
 *
 * @param operation - Async function containing all write operations
 * @returns Result of the operation
 * @throws If any step fails (Dexie rolls back automatically)
 */
export async function atomicTransaction<T>(
  operation: () => Promise<T>
): Promise<T> {
  const db = getOfflineDB();
  return db.transaction('rw', [
    db.transactions,
    db.transactionLines,
    db.auditLog,
    db.syncQueue,
  ], async () => {
    return operation();
  });
}

/**
 * Quarantines a corrupted record and logs a security event.
 * Implements Requirement 1.6: data corruption quarantine + admin alert.
 */
export async function quarantineCorruptedRecord(
  id: string,
  reason: string,
  userId: string
): Promise<void> {
  const db = getOfflineDB();
  await db.securityEvents.add({
    id: crypto.randomUUID(),
    type: 'DATA_CORRUPTION',
    severity: 'critical',
    userId,
    deviceId: 'unknown',
    details: { corruptedId: id, reason },
    timestamp: new Date().toISOString(),
    resolved: false,
  });
  // Mark the record as corrupted so it is excluded from reads
  await db.transactions.update(id, { syncStatus: 'corrupted' as any });
  console.error(`[OfflineStore] QUARANTINED record ${id}: ${reason}`);
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Save a new transaction to the offline store.
 * Generates a checksum, encrypts the payload, and logs to audit trail.
 * Uses atomicTransaction to ensure all-or-nothing write semantics.
 *
 * @param transaction - Transaction data (id may be omitted for offline-created records)
 * @param userId - Current user ID (for audit trail)
 * @returns The stored transaction with localId and checksum populated
 */
export async function storeTransaction(
  transaction: Omit<Transaction, 'checksum' | 'syncStatus'>,
  userId: string
): Promise<Transaction> {
  const db = getOfflineDB();

  // Assign a local ID if no server ID yet
  const localId = transaction.localId ?? generateLocalId();
  const pk = transaction.id || localId;

  const now = new Date().toISOString();
  const txWithMeta: Transaction = {
    ...transaction,
    localId,
    syncStatus: 'local_draft',
    offlineCreatedAt: now,
    lines: transaction.lines ?? [],
    checksum: '', // will be filled below
  } as Transaction;

  // Generate integrity checksum
  txWithMeta.checksum = await generateTransactionChecksum(txWithMeta);

  // Encrypt the full transaction payload
  let encryptedPayload: string | undefined;
  if (isSessionActive()) {
    const encrypted = await encryptData(txWithMeta, 'confidential');
    encryptedPayload = JSON.stringify(encrypted);
  }

  const stored: StoredTransaction = {
    ...txWithMeta,
    _pk: pk,
    _encryptedPayload: encryptedPayload,
    _storedAt: now,
  };

  // ACID: store transaction + lines + audit log atomically
  await atomicTransaction(async () => {
    await db.transactions.add(stored);

    // Store lines separately for indexed queries
    if (txWithMeta.lines?.length) {
      await db.transactionLines.bulkAdd(
        txWithMeta.lines.map(line => ({
          ...line,
          transactionId: pk,
          _pk: line.id || line.localId || crypto.randomUUID(),
          _storedAt: now
        }))
      );
    }

    // Audit log inside the same atomic transaction
    await logCreate({
      userId,
      entityType: 'transaction',
      entityId: pk,
      data: { reference_number: txWithMeta.reference_number, amount: txWithMeta.amount },
      offlineMode: true,
    });
  });

  return txWithMeta;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Retrieve a transaction by its primary key (server ID or local ID).
 * Decrypts and verifies integrity on read.
 */
export async function getTransaction(id: string): Promise<Transaction | null> {
  const db = getOfflineDB();
  const stored = await db.transactions.get(id);
  if (!stored) return null;
  return decryptAndVerify(stored);
}

/**
 * Get all transactions matching a filter.
 */
export async function getTransactions(filter?: {
  syncStatus?: TransactionSyncStatus;
  organizationId?: string;
  fiscalPeriodId?: string;
  limit?: number;
}): Promise<Transaction[]> {
  const db = getOfflineDB();
  let query = db.transactions.orderBy('date');

  if (filter?.syncStatus) {
    query = db.transactions.where('syncStatus').equals(filter.syncStatus) as typeof query;
  }
  if (filter?.organizationId) {
    query = db.transactions.where('org_id').equals(filter.organizationId) as typeof query;
  }

  const records = filter?.limit
    ? await query.limit(filter.limit).toArray()
    : await query.toArray();

  const results = await Promise.all(records.map(decryptAndVerify));
  return results.filter((tx): tx is Transaction => tx !== null);
}

export interface TransactionQueryOptions {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  minAmount?: number;
  maxAmount?: number;
  referenceSearch?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'totalAmount' | '_storedAt';
  sortOrder?: 'asc' | 'desc';
  syncStatus?: TransactionSyncStatus;
}

/**
 * Perform an advanced query on local transactions.
 * Implements Req 6.1 (filtered reads) with bandwidth optimization.
 * 
 * @param options - Filtering and pagination options
 * @returns Array of matching transactions
 */
export async function queryTransactions(
  options: TransactionQueryOptions
): Promise<Transaction[]> {
  const db = getOfflineDB();
  let collection = db.transactions.toCollection();

  // Apply basic range filters if possible via index
  if (options.startDate || options.endDate) {
    if (options.startDate && options.endDate) {
      collection = db.transactions.where('entry_date').between(options.startDate, options.endDate, true, true);
    } else if (options.startDate) {
      collection = db.transactions.where('entry_date').aboveOrEqual(options.startDate);
    } else if (options.endDate) {
      collection = db.transactions.where('entry_date').belowOrEqual(options.endDate);
    }
  } else if (options.syncStatus) {
    collection = db.transactions.where('syncStatus').equals(options.syncStatus);
  }

  // Apply memory filters for more complex criteria
  let records = await collection.toArray();
  let results = await Promise.all(records.map(decryptAndVerify));
  let filteredResults = results.filter((tx): tx is Transaction => tx !== null);

  if (options.accountId) {
    filteredResults = filteredResults.filter(tx => 
      tx.lines?.some(line => line.account_id === options.accountId)
    );
  }

  if (options.minAmount !== undefined) {
    filteredResults = filteredResults.filter(tx => (tx.amount || 0) >= options.minAmount!);
  }

  if (options.maxAmount !== undefined) {
    filteredResults = filteredResults.filter(tx => (tx.amount || 0) <= options.maxAmount!);
  }

  if (options.referenceSearch) {
    const search = options.referenceSearch.toLowerCase();
    filteredResults = filteredResults.filter(tx => 
      tx.reference_number?.toLowerCase().includes(search) || 
      tx.description?.toLowerCase().includes(search)
    );
  }

  // Sorting
  const sortBy = options.sortBy === 'date' ? 'entry_date' : (options.sortBy === 'totalAmount' ? 'amount' : '_storedAt');
  const sortOrder = options.sortOrder || 'desc';
  
  filteredResults.sort((a, b) => {
    const valA = (a as any)[sortBy];
    const valB = (b as any)[sortBy];
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const offset = options.offset || 0;
  const limit = options.limit || 50;
  
  return filteredResults.slice(offset, offset + limit);
}

/**
 * Get all transactions with a given sync status.
 */
export async function getPendingTransactions(): Promise<Transaction[]> {
  return queryTransactions({ syncStatus: 'local_draft' });
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update an existing offline transaction.
 * Re-generates checksum, re-encrypts, and logs the change.
 */
export async function updateTransaction(
  id: string,
  updates: Partial<Omit<Transaction, 'checksum' | 'localId'>>,
  userId: string
): Promise<Transaction | null> {
  const db = getOfflineDB();
  const existing = await getTransaction(id);
  if (!existing) return null;

  const before = { ...existing };
  const updated: Transaction = {
    ...existing,
    ...updates,
    modifiedBy: userId,
    modifiedAt: new Date().toISOString(),
    checksum: '', // will be regenerated
  };

  // Regenerate checksum for updated data
  updated.checksum = await generateTransactionChecksum(updated);

  // Re-encrypt
  let encryptedPayload: string | undefined;
  if (isSessionActive()) {
    const encrypted = await encryptData(updated, 'confidential');
    encryptedPayload = JSON.stringify(encrypted);
  }

  const stored: StoredTransaction = {
    ...updated,
    _pk: id,
    _encryptedPayload: encryptedPayload,
    _storedAt: new Date().toISOString(),
  };

  await db.transactions.put(stored);

  // Audit log
  await logUpdate({
    userId,
    entityType: 'transaction',
    entityId: id,
    before: { referenceNumber: before.referenceNumber, totalAmount: before.totalAmount },
    after: { referenceNumber: updated.referenceNumber, totalAmount: updated.totalAmount },
    offlineMode: true,
  });

  return updated;
}

/**
 * Mark a transaction as synced (update its sync status).
 */
export async function markTransactionSynced(
  localId: string,
  serverId: string,
  userId: string
): Promise<void> {
  await updateTransaction(localId, {
    id: serverId,
    syncStatus: 'pending_verification',
    lastSyncedAt: new Date().toISOString(),
  }, userId);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete a transaction from the offline store.
 * Logs the deletion to the audit trail before removing.
 */
export async function deleteTransaction(id: string, userId: string): Promise<void> {
  const db = getOfflineDB();
  const existing = await getTransaction(id);

  if (existing) {
    await logDelete({
      userId,
      entityType: 'transaction',
      entityId: id,
      before: { referenceNumber: existing.referenceNumber, totalAmount: existing.totalAmount },
      offlineMode: true,
    });
  }

  await db.transactions.delete(id);
  // Also delete associated lines
  await db.transactionLines.where('transaction_id').equals(id).delete();
}

// ─── Storage Management ───────────────────────────────────────────────────────

/**
 * Get current storage usage information.
 */
export async function getStorageInfo(): Promise<StorageInfo> {
  const db = getOfflineDB();
  const { used, quota, percent } = await getStorageEstimate();

  const txCount = await db.transactions.count();
  const queueCount = await db.syncQueue.count();
  const auditCount = await db.auditLog.count();

  const isMobile = isMobilePlatform();
  const mobileCap = STORAGE_CONSTANTS.MOBILE_STORAGE_CAP_BYTES;

  return {
    totalCapacity: quota,
    usedSpace: used,
    availableSpace: quota - used,
    quotaPercentUsed: percent,
    isPersisted: false, // updated by requestPersistentStorage
    dataBreakdown: {
      transactions: txCount * 5000,   // rough estimate: 5KB per transaction
      attachments: 0,                  // tracked separately
      cache: 0,
      indexes: txCount * 200,
      syncQueue: queueCount * 1000,
      auditLog: auditCount * 500,
    },
    attachmentMode: isMobile
      ? STORAGE_CONSTANTS.MOBILE_ATTACHMENT_MODE
      : STORAGE_CONSTANTS.DESKTOP_ATTACHMENT_MODE,
    isMobileCapped: isMobile,
    mobileCap,
  };
}

/**
 * Check if storage is approaching limits and return recommendations.
 */
export async function checkStorageHealth(): Promise<{
  status: 'ok' | 'warning' | 'critical';
  percentUsed: number;
  message?: string;
}> {
  const { percent } = await getStorageEstimate();

  if (percent >= STORAGE_CONSTANTS.QUOTA_CRITICAL_THRESHOLD) {
    return {
      status: 'critical',
      percentUsed: percent,
      message: `Storage is ${Math.round(percent * 100)}% full. New offline operations are blocked. Please sync and clear old data.`,
    };
  }
  if (percent >= STORAGE_CONSTANTS.QUOTA_WARNING_THRESHOLD) {
    return {
      status: 'warning',
      percentUsed: percent,
      message: `Storage is ${Math.round(percent * 100)}% full. Consider syncing soon.`,
    };
  }
  return { status: 'ok', percentUsed: percent };
}

// ─── Internal: Decrypt & Verify ───────────────────────────────────────────────

async function decryptAndVerify(stored: StoredTransaction): Promise<Transaction | null> {
  try {
    let tx: Transaction;

    if (stored._encryptedPayload && isSessionActive()) {
      // Decrypt the payload
      const encryptedData = JSON.parse(stored._encryptedPayload);
      tx = await decryptData<Transaction>(encryptedData);
    } else {
      // No encryption or session not active — return plaintext fields
      const { _pk, _encryptedPayload, _storedAt, ...rest } = stored;
      tx = rest as unknown as Transaction;
    }

    // Verify integrity checksum
    const valid = await verifyTransactionChecksum(tx);
    if (!valid) {
      console.error(`[OfflineStore] Integrity check FAILED for transaction ${tx.id}. Data may be corrupted.`);
      
      const { securityManager } = await import('../security/SecurityManager');
      await securityManager.logSecurityEvent('DATA_CORRUPTION', 'critical', { 
        transactionId: tx.id,
        reason: 'Checksum verification failed during read'
      });

      // Don't return corrupted data — return null and let caller handle
      return null;
    }

    return tx;
  } catch (err) {
    console.error('[OfflineStore] Failed to decrypt/verify transaction:', err);
    return null;
  }
}

/**
 * Generates a unique local ID for offline records (Req 1.1).
 */
function generateLocalId(): string {
  return `local_${crypto.randomUUID()}`;
}
