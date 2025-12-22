import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { useContext } from 'react';
import { TransactionsDataContext } from '../contexts/TransactionsDataContext';
import { ScopeContext } from '../contexts/ScopeContext';

interface UseAppSyncOptions {
  showToast?: (message: string) => void;
}

export const useAppSync = (options?: UseAppSyncOptions) => {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Hook into legacy context to ensure backward compatibility
  const transactionsContext = useContext(TransactionsDataContext); 
  const refreshTransactionsContext = transactionsContext?.refreshAll;
  
  // Hook into ScopeContext for org/project refresh
  const scopeContext = useContext(ScopeContext);
  const refreshScopeContext = scopeContext?.refreshScope;

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    const start = Date.now();

    try {
      console.log('🔄 AppSync: Starting global refresh...');

      // 1. Invalidate all React Query keys defined in our factory
      const keysToRefresh: any[] = [
        queryKeys.scope.all(),
        queryKeys.transactions.all(),
        queryKeys.accounts.all(),
        queryKeys.costCenters.all(),
        queryKeys.projects.all(),
        queryKeys.organizations.all(),
        queryKeys.reports.all(),
        queryKeys.classifications.all(),
      ];

      const promises: Promise<any>[] = keysToRefresh.map((key) =>
        queryClient.invalidateQueries({ queryKey: key })
      );

      // 2. Refresh ScopeContext (org/project)
      if (refreshScopeContext) {
        promises.push(refreshScopeContext());
      }

      // 3. Refresh legacy transactions context if available
      if (refreshTransactionsContext) {
        promises.push(refreshTransactionsContext());
      }

      await Promise.all(promises);

      const duration = Date.now() - start;
      console.log(`✅ AppSync: Global refresh complete in ${duration}ms`);

      if (options?.showToast) {
        options.showToast('✅ تم تحديث جميع البيانات');
      }
    } catch (error) {
      console.error('❌ AppSync: Update failed', error);
      if (options?.showToast) {
        options.showToast('❌ فشل التحديث');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, refreshScopeContext, refreshTransactionsContext, options]);

  return { refreshAll, isRefreshing };
};
