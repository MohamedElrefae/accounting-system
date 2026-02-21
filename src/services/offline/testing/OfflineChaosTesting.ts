/**
 * OfflineChaosTesting.ts
 * Tools for simulating various failure modes in the offline system.
 * 
 * Simulations:
 * - Network drops during transaction save
 * - Partial sync failure (browser close simulation)
 * - Data corruption in IndexedDB
 * - Storage quota exceeded
 * - Latency spikes
 */

import { OFFLINE_FEATURE_FLAGS } from '../core/OfflineConfig';
import { getOfflineDB } from '../core/OfflineSchema';

export class ChaosEngine {
    private static instance: ChaosEngine;
    private isNetworkMocked: boolean = false;

    private constructor() {}

    public static getInstance(): ChaosEngine {
        if (!ChaosEngine.instance) {
            ChaosEngine.instance = new ChaosEngine();
        }
        return ChaosEngine.instance;
    }

    /**
     * Requirement 8.1: Network Failure Simulation.
     * Randomly fails network requests to test sync recovery.
     */
    public async simulateNetworkDrop(probability: number = 0.3): Promise<boolean> {
        if (!OFFLINE_FEATURE_FLAGS.CHAOS_TESTING_ENABLED) return false;
        
        const shouldFail = Math.random() < probability;
        if (shouldFail) {
            console.warn('[Chaos] Simulating network drop!');
            throw new Error('ChaosEngine: Simulated Network Failure');
        }
        return true;
    }

    /**
     * Requirement 8.2: Data Corruption.
     * Intentionally tampers with a record to test integrity checks.
     */
    public async simulateDataCorruption(txId: string): Promise<void> {
        if (!OFFLINE_FEATURE_FLAGS.CHAOS_TESTING_ENABLED) return;

        const db = getOfflineDB();
        const tx = await db.transactions.get(txId);
        if (tx) {
            console.warn(`[Chaos] Corrupting transaction ${txId}`);
            // Tamper with data without updating checksum
            await db.transactions.update(txId, { totalAmount: (tx.totalAmount || 0) + 1000 });
        }
    }

    /**
     * Requirement 8.4: Latency Simulation.
     */
    public async simulateLatency(ms: number = 2000): Promise<void> {
        if (!OFFLINE_FEATURE_FLAGS.CHAOS_TESTING_ENABLED) return;
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Simulate browser process being killed (abrupt stop).
     */
    public simulateAbruptStop(): void {
        console.error('[Chaos] SIMULATING ABRUPT PROCESS TERMINATION');
        // In a browser, we can't truly kill the process, but we can throw to stop JS execution.
        throw new Error('ChaosEngine: Abrupt Termination');
    }
}

export const chaosEngine = ChaosEngine.getInstance();
