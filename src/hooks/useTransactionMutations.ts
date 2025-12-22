import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { postTransaction } from '../services/transaction-posting'; // Assuming this exists
import { queryKeys } from '../lib/queryKeys';

export const useTransactionMutations = () => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Temporarily importing delete logic here if not exported cleanly
      // But assuming service exists
      const { sp_delete_transaction_cascade } = await import('../services/transactions'); 
      return sp_delete_transaction_cascade(id);
    },
    onMutate: async (deletedId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions.all() });

      // Snapshot previous value
      const previousTransactions = queryClient.getQueryData(queryKeys.transactions.all());

      // Optimistically update lists
      queryClient.setQueriesData(
        { queryKey: queryKeys.transactions.all() },
        (old: any) => {
            if (!old || !old.rows) return old;
            return {
                ...old,
                rows: old.rows.filter((t: any) => (t.id || t.transaction_id) !== deletedId),
                total: Math.max(0, old.total - 1)
            };
        }
      );

      return { previousTransactions };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousTransactions) {
        // We can't easily restore all queries unless we track them carefully
        // Simplified: just invalidate
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() });
    },
  });

  return {
    deleteTransaction: deleteMutation,
  };
};
