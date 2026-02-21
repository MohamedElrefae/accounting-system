/**
 * StorageMonitor.ts
 * Manages IndexedDB storage quotas, especially for mobile browsers.
 * 
 * Responsibilities:
 * - Monitor Byte usage vs Quota
 * - Enforce mobile-specific storage caps (e.g., 200MB)
 * - Trigger cleanup recommendations when approaching limits
 * - Manage attachment storage strategy (cloud-reference vs full)
 */

import { STORAGE_CONSTANTS, isMobilePlatform } from '../core/OfflineConfig';
import { getStorageEstimate, requestPersistentStorage } from '../core/OfflineSchema';
import type { StorageInfo, StorageRecommendation } from '../core/OfflineTypes';

export class StorageMonitor {
  private static instance: StorageMonitor;
  private isMobile: boolean;

  private constructor() {
    this.isMobile = isMobilePlatform();
  }

  public static getInstance(): StorageMonitor {
    if (!StorageMonitor.instance) {
      StorageMonitor.instance = new StorageMonitor();
    }
    return StorageMonitor.instance;
  }

  /**
   * Initializes storage settings. Requests persistent storage if available.
   */
  public async initialize(): Promise<void> {
    await requestPersistentStorage();
    // Start periodic auto-purge check
    setInterval(() => this.autoPurgeIfNeeded(), 60 * 60 * 1000); // Once an hour
  }

  /**
   * Gets a comprehensive report of current storage status.
   * Implements Req 4.5: Separate storage pools.
   */
  public async getStatus(): Promise<StorageInfo> {
    const db = (await import('../core/OfflineSchema')).getOfflineDB();
    const estimate = await getStorageEstimate();
    const isMobile = this.isMobile;
    const mobileCap = STORAGE_CONSTANTS.MOBILE_STORAGE_CAP_BYTES;

    // Accurate breakdown by category (Req 4.5)
    // In a real implementation, we'd sum actual byte sizes.
    // Here we use weights based on count.
    const [txCount, lineCount, auditCount, queueCount, securityCount] = await Promise.all([
      db.transactions.count(),
      db.transactionLines.count(),
      db.auditLog.count(),
      db.syncQueue.count(),
      db.securityEvents.count()
    ]);

    const txSize = txCount * 1024; // ~1KB per tx
    const lineSize = lineCount * 512; // ~0.5KB per line
    const auditSize = auditCount * 256;
    const queueSize = queueCount * 1024;

    return {
      totalCapacity: estimate.quota,
      usedSpace: estimate.used,
      availableSpace: estimate.quota - estimate.used,
      quotaPercentUsed: estimate.percent,
      isPersisted: false,
      dataBreakdown: {
        transactions: txSize + lineSize,
        attachments: 0, // No attachments integrated in this skeleton
        cache: estimate.used - (txSize + lineSize + auditSize + queueSize + (securityCount * 128)), // browser cache
        indexes: txSize * 0.2,
        syncQueue: queueSize,
        auditLog: auditSize,
      },
      attachmentMode: isMobile 
        ? STORAGE_CONSTANTS.MOBILE_ATTACHMENT_MODE 
        : STORAGE_CONSTANTS.DESKTOP_ATTACHMENT_MODE,
      isMobileCapped: isMobile,
      mobileCap: mobileCap,
    };
  }

  /**
   * Evaluates if new data can be stored and triggers auto-purge if needed.
   */
  public async canStore(newBytesEstimated: number = 0): Promise<boolean> {
    const status = await this.getStatus();
    
    // Auto-purge if approaching limits (Req 4.10)
    if (status.quotaPercentUsed >= 0.8 || (this.isMobile && status.usedSpace > status.mobileCap * 0.8)) {
        console.warn('[StorageMonitor] Storage > 80%. Triggering auto-purge...');
        await this.autoPurgeIfNeeded();
    }

    // Check mobile cap if applicable
    if (this.isMobile && (status.usedSpace + newBytesEstimated) > status.mobileCap) {
        console.warn('[StorageMonitor] Mobile storage cap exceeded.');
        return false;
    }

    // Check overall quota
    if (status.quotaPercentUsed >= STORAGE_CONSTANTS.QUOTA_CRITICAL_THRESHOLD) {
        console.error('[StorageMonitor] Critical storage threshold reached.');
        return false;
    }

    return true;
  }

  /**
   * Purges oldest synced data to free up space.
   * Implements Req 4.10: Auto-purge oldest synced data at 180MB/80% capacity.
   */
  public async autoPurgeIfNeeded(): Promise<void> {
    const status = await this.getStatus();
    const isMobileFull = this.isMobile && status.usedSpace > status.mobileCap * 0.8;
    const isQuotaFull = status.quotaPercentUsed > 0.8;

    if (!isMobileFull && !isQuotaFull) return;

    console.info('[StorageMonitor] Purging synced data to free up space...');
    const db = (await import('../core/OfflineSchema')).getOfflineDB();
    
    // Find synced transactions older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString();

    const oldSyncedIds = await db.transactions
      .where('syncStatus').equals('synced')
      .and(tx => !!tx.offlineCreatedAt && tx.offlineCreatedAt < dateStr)
      .limit(100)
      .primaryKeys();

    if (oldSyncedIds.length > 0) {
        await db.transactionLines.where('transactionId').anyOf(oldSyncedIds).delete();
        await db.transactions.bulkDelete(oldSyncedIds);
        console.info(`[StorageMonitor] Purged ${oldSyncedIds.length} old synced records.`);
    }
  }

  /**
   * Provides actionable cleanup recommendations if storage is high.
   */
  public async getRecommendations(): Promise<StorageRecommendation[]> {
    const status = await this.getStatus();
    const recommendations: StorageRecommendation[] = [];

    if (status.quotaPercentUsed >= STORAGE_CONSTANTS.QUOTA_WARNING_THRESHOLD) {
      recommendations.push({
        type: 'warn',
        message: `Storage is ${Math.round(status.quotaPercentUsed * 100)}% full.`,
        potentialSavings: 0
      });

      recommendations.push({
        type: 'archive',
        message: 'Sync and archive old fiscal period data to free up space.',
        potentialSavings: status.usedSpace * 0.3 // Estimated 30% savings
      });
    }

    if (this.isMobile && status.usedSpace > status.mobileCap * 0.8) {
        recommendations.push({
            type: 'cleanup',
            message: 'Mobile storage is nearly full. Clearing attachment cache is recommended.',
            potentialSavings: status.dataBreakdown.attachments
        });
    }

    return recommendations;
  }

  /**
   * Helper to format bytes for UI display.
   */
  public static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const storageMonitor = StorageMonitor.getInstance();
