/**
 * OfflineAPI.ts
 * Unified entry point for all accounting operations.
 * 
 * Responsibilities:
 * - Detect network status
 * - Fallback to OfflineStore when offline
 * - Use Supabase RPC directly when online (optional, depends on policy)
 * - Handle optimistic updates and queuing
 */

import { supabase } from '../../../utils/supabase';
import { storeTransaction, updateTransaction, deleteTransaction, queryTransactions } from './OfflineStore';
import { enqueueOperation } from '../sync/SyncQueueManager';
import { isSessionActive } from '../security/OfflineEncryption';
import { performanceMonitor } from '../monitoring/OfflineMetrics';
import type { Transaction, TransactionQueryOptions } from './OfflineTypes';
import { getConnectionMonitor } from '../../../utils/connectionMonitor';

export class UnifiedOfflineAPI {
  private static instance: UnifiedOfflineAPI;

  private constructor() {}

  public static getInstance(): UnifiedOfflineAPI {
    if (!UnifiedOfflineAPI.instance) {
      UnifiedOfflineAPI.instance = new UnifiedOfflineAPI();
    }
    return UnifiedOfflineAPI.instance;
  }

  /**
   * Helper to determine if we should operate in offline mode.
   * Delegates to ConnectionMonitor — never trusts navigator.onLine directly.
   */
  private isOffline(): boolean {
    return !getConnectionMonitor().getHealth().isOnline;
  }

  /**
   * Create a new transaction.
   * If online, tries server first. If offline, stores locally and enqueues.
   */
  public async createTransaction(
    transaction: Omit<Transaction, 'checksum' | 'syncStatus'>,
    userId: string
  ): Promise<Transaction> {
    return performanceMonitor.measure('api_create_transaction', async () => {
      // 1. Store locally first (Optimistic UI + Offline Durability)
      const localTx = await storeTransaction(transaction, userId);

      // 2. Enqueue for sync
      await enqueueOperation({
        type: 'CREATE',
        entityType: 'transaction',
        entityId: localTx.id || localTx.localId!,
        data: localTx as any,
        userId
      });

      return localTx;
    });
  }

  /**
   * Update an existing transaction.
   */
  public async updateTransaction(
    id: string,
    updates: Partial<Transaction>,
    userId: string
  ): Promise<Transaction | null> {
    return performanceMonitor.measure('api_update_transaction', async () => {
      const updated = await updateTransaction(id, updates, userId);
      if (!updated) return null;

      await enqueueOperation({
        type: 'UPDATE',
        entityType: 'transaction',
        entityId: id,
        data: updates as any,
        originalData: updated as any, // For delta calculations
        userId
      });

      return updated;
    });
  }

  /**
   * Search for transactions.
   * Prioritizes local store for speed and availability.
   */
  public async findTransactions(options: TransactionQueryOptions): Promise<Transaction[]> {
    return performanceMonitor.measure('api_query_transactions', () => queryTransactions(options));
  }

  /**
   * Delete a transaction.
   */
  public async removeTransaction(id: string, userId: string): Promise<void> {
    await deleteTransaction(id, userId);
    await enqueueOperation({
      type: 'DELETE',
      entityType: 'transaction',
      entityId: id,
      data: { id },
      userId
    });
  }
}

export const offlineAPI = UnifiedOfflineAPI.getInstance();
