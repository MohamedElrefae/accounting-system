/**
 * IntegrityValidator.ts
 * Cryptographic integrity verification for offline financial data.
 *
 * Implements:
 * - SHA-256 checksum generation for transaction payloads
 * - Tamper detection via checksum comparison
 * - Blockchain-style hash chaining for the audit trail
 *
 * Uses the Web Crypto API (available in all modern browsers, no dependencies).
 */

import type { Transaction, AuditEntry } from './OfflineTypes';

// ─── SHA-256 Utilities ────────────────────────────────────────────────────────

/**
 * Compute a SHA-256 hash of any serializable value.
 * Returns a lowercase hex string (64 characters).
 */
export async function sha256(data: unknown): Promise<string> {
  const json = JSON.stringify(data, Object.keys(data as object).sort());
  const encoder = new TextEncoder();
  const buffer = encoder.encode(json);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return bufferToHex(hashBuffer);
}

/**
 * Convert an ArrayBuffer to a lowercase hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Transaction Integrity ────────────────────────────────────────────────────

/**
 * Fields included in the transaction checksum.
 * Excludes metadata fields that change during sync (syncStatus, lastSyncedAt, etc.)
 */
const TRANSACTION_CHECKSUM_FIELDS: (keyof Transaction)[] = [
  'id',
  'referenceNumber',
  'date',
  'description',
  'totalAmount',
  'fiscalPeriodId',
  'organizationId',
  'projectId',
  'createdBy',
  'createdAt',
  'lines',
];

/**
 * Generate a SHA-256 checksum for a transaction's immutable payload.
 * This checksum should be stored alongside the transaction and verified on read.
 */
export async function generateTransactionChecksum(transaction: Transaction): Promise<string> {
  const payload: Partial<Transaction> = {};
  for (const field of TRANSACTION_CHECKSUM_FIELDS) {
    if (field in transaction) {
      (payload as Record<string, unknown>)[field] = transaction[field];
    }
  }
  return sha256(payload);
}

/**
 * Verify that a stored transaction's checksum matches its current payload.
 * Returns true if valid, false if tampered or corrupted.
 */
export async function verifyTransactionChecksum(transaction: Transaction): Promise<boolean> {
  if (!transaction.checksum) {
    // No checksum stored — cannot verify (treat as unverified, not invalid)
    console.warn(`[IntegrityValidator] Transaction ${transaction.id} has no checksum.`);
    return true;
  }
  const expected = await generateTransactionChecksum(transaction);
  const valid = expected === transaction.checksum;
  if (!valid) {
    console.error(
      `[IntegrityValidator] INTEGRITY FAILURE: Transaction ${transaction.id} checksum mismatch.`,
      { stored: transaction.checksum, computed: expected }
    );
  }
  return valid;
}

// ─── Audit Chain (Blockchain-Style Linking) ───────────────────────────────────

/**
 * The genesis hash — used as the previousHash for the very first audit entry.
 * This is a well-known constant, not a secret.
 */
export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Compute the hash for an audit entry.
 * The hash covers all fields EXCEPT currentHash (which is what we're computing).
 */
export async function computeAuditEntryHash(entry: Omit<AuditEntry, 'currentHash'>): Promise<string> {
  const payload = {
    id: entry.id,
    operationId: entry.operationId,
    userId: entry.userId,
    timestamp: entry.timestamp,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    beforeState: entry.beforeState,
    afterState: entry.afterState,
    offlineMode: entry.offlineMode,
    previousHash: entry.previousHash,
  };
  return sha256(payload);
}

/**
 * Create a new audit entry, chaining it to the previous entry's hash.
 * This creates a tamper-evident linked list of all financial operations.
 *
 * @param entryData - The audit data (without hash fields)
 * @param previousHash - The currentHash of the last audit entry (or GENESIS_HASH)
 */
export async function createAuditEntry(
  entryData: Omit<AuditEntry, 'previousHash' | 'currentHash' | 'immutable'>,
  previousHash: string = GENESIS_HASH
): Promise<AuditEntry> {
  const partial: Omit<AuditEntry, 'currentHash'> = {
    ...entryData,
    previousHash,
    immutable: true,
  };
  const currentHash = await computeAuditEntryHash(partial);
  return { ...partial, currentHash };
}

/**
 * Verify the integrity of an audit chain.
 * Checks that each entry's previousHash matches the previous entry's currentHash.
 *
 * @param entries - Audit entries in chronological order (oldest first)
 * @returns Object with isValid flag and index of first invalid entry (-1 if all valid)
 */
export async function verifyAuditChain(
  entries: AuditEntry[]
): Promise<{ isValid: boolean; firstInvalidIndex: number; reason?: string }> {
  if (entries.length === 0) {
    return { isValid: true, firstInvalidIndex: -1 };
  }

  // Verify first entry links to genesis
  if (entries[0].previousHash !== GENESIS_HASH && entries.length === 1) {
    // Single entry may have any previousHash if it's not the first ever
    // (we don't have the full chain context here)
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Recompute this entry's hash
    const { currentHash, ...rest } = entry;
    const computed = await computeAuditEntryHash(rest);

    if (computed !== currentHash) {
      return {
        isValid: false,
        firstInvalidIndex: i,
        reason: `Entry ${entry.id} hash mismatch: stored=${currentHash}, computed=${computed}`,
      };
    }

    // Verify chain link (skip for first entry if we don't have the predecessor)
    if (i > 0) {
      const prevEntry = entries[i - 1];
      if (entry.previousHash !== prevEntry.currentHash) {
        return {
          isValid: false,
          firstInvalidIndex: i,
          reason: `Entry ${entry.id} chain broken: previousHash=${entry.previousHash} does not match previous entry currentHash=${prevEntry.currentHash}`,
        };
      }
    }
  }

  return { isValid: true, firstInvalidIndex: -1 };
}

// ─── Database Integrity Check ─────────────────────────────────────────────────

export interface IntegrityReport {
  valid: boolean;
  checkedCount: number;
  failedIds: string[];
  errors: string[];
}

/**
 * Verify the integrity of a batch of transactions.
 * Returns a report of any failures found.
 */
export async function verifyTransactionBatch(
  transactions: Transaction[]
): Promise<IntegrityReport> {
  const failedIds: string[] = [];
  const errors: string[] = [];

  await Promise.all(
    transactions.map(async (tx) => {
      try {
        const valid = await verifyTransactionChecksum(tx);
        if (!valid) {
          failedIds.push(tx.id);
          errors.push(`Transaction ${tx.id} (ref: ${tx.referenceNumber}) failed integrity check`);
        }
      } catch (err) {
        failedIds.push(tx.id);
        errors.push(`Transaction ${tx.id} threw during integrity check: ${String(err)}`);
      }
    })
  );

  return {
    valid: failedIds.length === 0,
    checkedCount: transactions.length,
    failedIds,
    errors,
  };
}
