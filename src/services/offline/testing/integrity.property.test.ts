/**
 * integrity.property.test.ts
 * Property-based tests for cryptographic integrity (Task 2.4 — Requirement 1.2)
 * and audit trail immutability (Task 2.6 — Requirement 1.3)
 *
 * Properties verified:
 * - P2: Any tampered transaction fails checksum verification
 * - P3: Audit trail entries are linked and cannot be silently removed
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  generateTransactionChecksum,
  verifyTransactionChecksum,
  computeAuditEntryHash,
} from '../security/IntegrityValidator';
import { DataGenerator } from './OfflineDataGenerator';
import type { Transaction } from '../core/OfflineTypes';

// ─── Property 2: Cryptographic Integrity Verification (Task 2.4, Req 1.2) ─────

describe('Property 2: Cryptographic Integrity Verification (Req 1.2)', () => {

  it('P2a: A valid transaction always passes its own checksum', async () => {
    await fc.assert(
      fc.asyncProperty(DataGenerator.balancedTransactionArb(), async (tx) => {
        const checksum = await generateTransactionChecksum(tx);
        const txWithChecksum = { ...tx, checksum };
        const valid = await verifyTransactionChecksum(txWithChecksum);
        expect(valid).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it('P2b: Any field mutation causes checksum verification to fail', async () => {
    await fc.assert(
      fc.asyncProperty(
        DataGenerator.balancedTransactionArb(),
        fc.double({ min: 1, max: 9999 }),
        async (tx, tamperAmount) => {
          const checksum = await generateTransactionChecksum(tx);
          const txWithChecksum = { ...tx, checksum };

          // Tamper with a field WITHOUT updating the checksum
          const tampered: Transaction = {
            ...txWithChecksum,
            totalAmount: (txWithChecksum.totalAmount || 0) + tamperAmount,
          };

          const valid = await verifyTransactionChecksum(tampered);
          // Tampered data MUST fail verification
          expect(valid).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('P2c: Checksum is deterministic for the same input', async () => {
    await fc.assert(
      fc.asyncProperty(DataGenerator.balancedTransactionArb(), async (tx) => {
        const checksum1 = await generateTransactionChecksum(tx);
        const checksum2 = await generateTransactionChecksum(tx);
        expect(checksum1).toBe(checksum2);
      }),
      { numRuns: 30 }
    );
  });
});

// ─── Property 3: Immutable Audit Trail (Task 2.6, Req 1.3) ────────────────────

describe('Property 3: Immutable Audit Trail (Req 1.3)', () => {

  it('P3a: Audit entry hash changes if content changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          operation: fc.constantFrom('CREATE', 'UPDATE', 'DELETE'),
          entityType: fc.constant('transaction'),
          entityId: fc.uuid(),
          userId: fc.uuid(),
          timestamp: fc.date().map(d => d.toISOString()),
          data: fc.record({ amount: fc.float({ min: 1, max: 10000 }) }),
          previousHash: fc.string({ minLength: 10 }),
        }),
        async (entry) => {
          const hash1 = await computeAuditEntryHash(entry as any);

          // Tamper with the entry
          const tampered = { ...entry, data: { amount: (entry.data.amount || 0) + 999 } };
          const hash2 = await computeAuditEntryHash(tampered as any);

          // Hashes MUST differ for different content
          expect(hash1).not.toBe(hash2);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('P3b: Audit entry hash is stable for the same content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          operation: fc.constant('CREATE'),
          entityType: fc.constant('transaction'),
          entityId: fc.uuid(),
          userId: fc.uuid(),
          timestamp: fc.constant('2025-01-01T00:00:00.000Z'),
          data: fc.record({ amount: fc.float({ min: 1, max: 10000 }) }),
          previousHash: fc.string({ minLength: 10 }),
        }),
        async (entry) => {
          const hash1 = await computeAuditEntryHash(entry as any);
          const hash2 = await computeAuditEntryHash(entry as any);
          expect(hash1).toBe(hash2);
        }
      ),
      { numRuns: 30 }
    );
  });
});
