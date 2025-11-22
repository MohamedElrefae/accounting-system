import { useOptimizedAuth } from './useOptimizedAuth';

// Unified auth hook used across the app, backed by optimized singleton auth.
export const useAuth = () => {
  return useOptimizedAuth();
};
