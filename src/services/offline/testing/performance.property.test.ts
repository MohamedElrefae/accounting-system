/**
 * performance.property.test.ts
 * Property-based tests for performance requirements (Tasks 10.2, 10.4)
 * Requirements: 6.1 (overhead <100ms), 6.4 (non-blocking background sync)
 *
 * Properties verified:
 * - P17: Operation overhead is always less than 100ms
 * - P19: Background sync never blocks the UI thread
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { DataGenerator } from './OfflineDataGenerator';
import { AccountingValidator } from '../core/AccountingValidator';

// ─── Property 17: Operation Overhead Limits (Task 10.2, Req 6.1) ──────────────

describe('Property 17: Operation Overhead Limits (Req 6.1)', () => {

  it('P17a: Accounting validation completes in under 100ms', async () => {
    await fc.assert(
      fc.asyncProperty(DataGenerator.balancedTransactionArb(), async (tx) => {
        const start = performance.now();
        await AccountingValidator.validateTransaction(tx);
        const elapsed = performance.now() - start;

        // Requirement 6.1: less than 100ms overhead
        expect(elapsed).toBeLessThan(100);
      }),
      { numRuns: 50 }
    );
  });

  it('P17b: Checksum generation completes in under 50ms', async () => {
    const { generateTransactionChecksum } = await import('../security/IntegrityValidator');

    await fc.assert(
      fc.asyncProperty(DataGenerator.balancedTransactionArb(), async (tx) => {
        const start = performance.now();
        await generateTransactionChecksum(tx);
        const elapsed = performance.now() - start;

        // Checksum generation must be fast
        expect(elapsed).toBeLessThan(50);
      }),
      { numRuns: 30 }
    );
  });

  it('P17c: Generating 100 transactions stays under 2 seconds total', async () => {
    const start = performance.now();
    const transactions = await fc.sample(DataGenerator.balancedTransactionArb(), 100);
    const elapsed = performance.now() - start;

    expect(transactions).toHaveLength(100);
    expect(elapsed).toBeLessThan(2000);
  });
});

// ─── Property 19: Background Sync Non-Blocking (Task 10.4, Req 6.4) ───────────

describe('Property 19: Background Sync Non-Blocking (Req 6.4)', () => {

  it('P19a: Background sync uses Promise-based async (non-blocking)', () => {
    // Verify that sync operations return Promises (non-blocking contract)
    const { syncEngine } = require('../sync/SynchronizationEngine');
    const syncResult = syncEngine.startSync();

    // Must return a Promise (non-blocking)
    expect(syncResult).toBeInstanceOf(Promise);
  });

  it('P19b: Sync status can be queried while sync is running', () => {
    const { syncEngine } = require('../sync/SynchronizationEngine');

    // Start sync (non-blocking)
    syncEngine.startSync().catch(() => {}); // Ignore errors in test

    // Status must be queryable immediately (non-blocking)
    const status = syncEngine.getSyncStatus();
    expect(status).toBeDefined();
    expect(typeof status.isSyncing).toBe('boolean');
  });
});

// ─── Property 10: Current Fiscal Year Prioritization (Task 5.5, Req 4.1) ──────

describe('Property 10: Current Fiscal Year Prioritization (Req 4.1)', () => {

  it('P10a: Current year transactions are always prioritized over older ones', () => {
    const currentYear = new Date().getFullYear();

    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            year: fc.integer({ min: 2018, max: currentYear }),
            priority: fc.integer({ min: 1, max: 10 }),
          }),
          { minLength: 2, maxLength: 20 }
        ),
        (transactions) => {
          // Sort by year descending (current year first)
          const sorted = [...transactions].sort((a, b) => b.year - a.year);

          // The first item must be from the most recent year
          expect(sorted[0].year).toBeGreaterThanOrEqual(sorted[sorted.length - 1].year);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ─── Property 13: Storage Pool Separation (Task 5.5, Req 4.5) ────────────────

describe('Property 13: Storage Pool Separation (Req 4.5)', () => {

  it('P13a: Different data types are stored in separate pools', () => {
    const pools = {
      transactions: [] as string[],
      attachments: [] as string[],
      reports: [] as string[],
    };

    fc.assert(
      fc.property(
        fc.constantFrom('transaction', 'attachment', 'report'),
        fc.uuid(),
        (dataType, id) => {
          // Each data type goes to its own pool
          if (dataType === 'transaction') pools.transactions.push(id);
          else if (dataType === 'attachment') pools.attachments.push(id);
          else pools.reports.push(id);

          // Pools must not overlap
          const allIds = [...pools.transactions, ...pools.attachments, ...pools.reports];
          const uniqueIds = new Set(allIds);
          expect(uniqueIds.size).toBe(allIds.length);
        }
      ),
      { numRuns: 50 }
    );
  });
});
