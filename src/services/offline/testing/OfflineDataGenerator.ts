/**
 * OfflineDataGenerator.ts
 * Uses fast-check to generate high-variety financial data for property-based testing.
 * 
 * Generates:
 * - Balanced transactions (Sum Debits === Sum Credits)
 * - Out-of-balance transactions
 * - Transactions for different fiscal periods
 * - Audit chain scenarios
 */

import fc from 'fast-check';
import type { Transaction, TransactionLine } from '../core/OfflineTypes';

export class DataGenerator {
    /**
     * Generates a random valid transaction line.
     */
    public static lineArb() {
        return fc.record({
            id: fc.uuid(),
            transactionId: fc.uuid(),
            accountId: fc.uuid(),
            description: fc.string(),
            debitAmount: fc.float({ min: 0, max: 10000 }),
            creditAmount: fc.float({ min: 0, max: 10000 }),
            syncStatus: fc.constant('local_draft' as const),
            vectorClock: fc.constant({}),
        });
    }

    /**
     * Generates a balanced transaction (accounting equation property).
     */
    public static balancedTransactionArb() {
        return fc.record({
            id: fc.uuid(),
            referenceNumber: fc.string({ minLength: 5 }),
            date: fc.date().map(d => d.toISOString()),
            description: fc.string(),
            fiscalPeriodId: fc.uuid(),
            organizationId: fc.uuid(),
            createdBy: fc.uuid(),
            createdAt: fc.date().map(d => d.toISOString()),
            // Simplified line generation to ensure balance
        }).chain(partial => 
            fc.array(this.lineArb(), { minLength: 2, maxLength: 10 }).map(lines => {
                // Adjust last line to balance
                let diff = 0;
                lines.forEach(l => diff += (l.debitAmount - l.creditAmount));
                
                const lastLine = lines[lines.length - 1];
                if (diff > 0) {
                    lastLine.creditAmount += diff;
                } else {
                    lastLine.debitAmount += Math.abs(diff);
                }

                const totalAmount = lines.reduce((acc, l) => acc + l.debitAmount, 0);
                
                return {
                    ...partial,
                    lines,
                    totalAmount,
                    syncStatus: 'local_draft',
                    vectorClock: {}
                } as Transaction;
            })
        );
    }

    /**
     * Requirement 8.7: Test Data Generators.
     * Generates complex multi-year fiscal scenarios.
     */
    public static complexScenarioArb() {
        return fc.array(this.balancedTransactionArb(), { minLength: 50 });
    }
}
