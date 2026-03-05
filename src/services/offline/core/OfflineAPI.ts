/**
 * OfflineAPI.ts
 * Unified entry point for all accounting operations.
 * 
 * Responsibilities:
 * - Detect network status via ConnectionMonitor (never navigator.onLine)
 * - When ONLINE: write directly to Supabase for zero latency
 * - When OFFLINE: store locally and enqueue for background sync
 * - On server error while online: degrade gracefully to offline path
 */

import { supabase } from '../../../utils/supabase';
import { storeTransaction, updateTransaction, deleteTransaction, queryTransactions, markTransactionSynced } from './OfflineStore';
import { enqueueOperation } from '../sync/SyncQueueManager';
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
   * Determine if we are currently in offline mode.
   * Delegates to ConnectionMonitor — never trusts navigator.onLine directly.
   */
  private isOffline(): boolean {
    return !getConnectionMonitor().getHealth().isOnline;
  }

  /**
   * Create a new transaction.
   * - ONLINE: writes directly to Supabase, then mirrors to local store as 'verified'.
   * - OFFLINE: stores locally as 'local_draft' and enqueues for sync.
   * - SERVER ERROR while online: degrades to offline path (enqueue for later).
   */
  public async createTransaction(
    transaction: Omit<Transaction, 'checksum' | 'syncStatus'>,
    userId: string
  ): Promise<Transaction> {
    return performanceMonitor.measure('api_create_transaction', async () => {
      // 1. Always store locally first for optimistic UI
      const localTx = await storeTransaction(transaction, userId);

      if (!this.isOffline()) {
        try {
          // 2a. ONLINE PATH: submit directly to Supabase
          const { amount, ...rest } = transaction;
          const { data, error } = await supabase
            .from('transactions')
            .insert({ 
              ...rest, 
              total_debits: amount || 0,
              total_credits: amount || 0,
              created_by: userId 
            })
            .select()
            .single();

          if (!error && data) {
            // Mirror the server-assigned ID back to local store
            await markTransactionSynced(localTx.localId!, data.id, userId);
            return { ...localTx, id: data.id, syncStatus: 'verified' };
          }

          // Server rejected — fall through to offline path below
          console.warn('[OfflineAPI] Server create failed, degrading to offline path:', error?.message);
        } catch (err) {
          console.warn('[OfflineAPI] Network error during create, degrading to offline path:', err);
        }
      }

      // 2b. OFFLINE PATH (or server degradation): enqueue for background sync
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
   * - ONLINE: updates Supabase directly, mirrors to local store.
   * - OFFLINE: updates local store and enqueues delta.
   */
  public async updateTransaction(
    id: string,
    updates: Partial<Transaction>,
    userId: string
  ): Promise<Transaction | null> {
    return performanceMonitor.measure('api_update_transaction', async () => {
      const updated = await updateTransaction(id, updates, userId);
      if (!updated) return null;

      if (!this.isOffline()) {
        try {
          // ONLINE PATH: push directly to Supabase
          const up: any = { ...updates, updated_by: userId };
          if (up.amount !== undefined) {
            up.total_debits = up.amount;
            up.total_credits = up.amount;
            delete up.amount;
          }

          const { error } = await supabase
            .from('transactions')
            .update(up)
            .eq('id', id);

          if (!error) {
            return { ...updated, syncStatus: 'verified' };
          }

          console.warn('[OfflineAPI] Server update failed, degrading to offline path:', error?.message);
        } catch (err) {
          console.warn('[OfflineAPI] Network error during update, degrading to offline path:', err);
        }
      }

      // OFFLINE PATH (or degradation)
      await enqueueOperation({
        type: 'UPDATE',
        entityType: 'transaction',
        entityId: id,
        data: updates as any,
        originalData: updated as any,
        userId
      });

      return updated;
    });
  }

  /**
   * Search for transactions.
   * Always queries local store first for speed and offline availability.
   */
  public async findTransactions(options: TransactionQueryOptions): Promise<Transaction[]> {
    return performanceMonitor.measure('api_query_transactions', () => queryTransactions(options));
  }

  /**
   * Delete a transaction.
   * - ONLINE: deletes from Supabase directly, removes from local store.
   * - OFFLINE: marks for deletion locally and enqueues.
   */
  public async removeTransaction(id: string, userId: string): Promise<void> {
    if (!this.isOffline()) {
      try {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id);

        if (!error) {
          await deleteTransaction(id, userId);
          return;
        }

        console.warn('[OfflineAPI] Server delete failed, degrading to offline path:', error?.message);
      } catch (err) {
        console.warn('[OfflineAPI] Network error during delete, degrading to offline path:', err);
      }
    }

    // OFFLINE PATH (or degradation)
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


