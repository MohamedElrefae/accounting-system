/**
 * OfflineMetrics.ts
 * Telemetry and performance monitoring for the offline-first system.
 * 
 * Tracks:
 * - Operation overhead (ms per read/write)
 * - Sync duration and success rates
 * - Database size and record counts
 * - Conflict frequency
 * - Background job health
 */

import { getOfflineDB } from '../core/OfflineSchema';
import type { OfflineMetrics } from '../core/OfflineTypes';

export class PerformanceMonitor {
    private static instance: PerformanceMonitor;

    private constructor() {}

    public static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    /**
     * Records a specific metric event.
     */
    public async recordMetric(name: string, value: number, tags?: Record<string, string>): Promise<void> {
        const db = getOfflineDB();
        
        // Using a dedicated metrics store or the key-value metadata store
        const metrics = await this.getMetrics();
        // Placeholder for real metric aggregation
        console.log(`[Metrics] ${name}: ${value}`, tags);
    }

    /**
     * Measures the execution time of an asynchronous function.
     */
    public async measure<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T> {
        const start = performance.now();
        try {
            const result = await fn();
            const duration = performance.now() - start;
            await this.recordMetric(`${name}_duration`, duration, tags);
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            await this.recordMetric(`${name}_failed_duration`, duration, tags);
            throw error;
        }
    }

    /**
     * Collects a snapshot of all system health metrics.
     */
    public async getSnapshot(): Promise<any> {
        const db = getOfflineDB();
        return {
            timestamp: new Date().toISOString(),
            dbStats: {
                transactions: await db.transactions.count(),
                syncQueue: await db.syncQueue.count(),
                auditLog: await db.auditLog.count()
            },
            storage: await navigator.storage.estimate()
        };
    }

    private async getMetrics(): Promise<any> {
        const db = getOfflineDB();
        return (await db.metadata.get('system_metrics'))?.value || {};
    }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
