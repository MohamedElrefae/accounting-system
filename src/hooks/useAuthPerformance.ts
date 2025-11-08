import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

/**
 * Hook to monitor auth performance and log slow operations
 */
export const useAuthPerformance = () => {
  const { loading, permissionsLoading, user, roles } = useAuth();
  const authStartTime = useRef<number | null>(null);
  const permissionsStartTime = useRef<number | null>(null);

  useEffect(() => {
    if (loading && !authStartTime.current) {
      authStartTime.current = performance.now();
    } else if (!loading && authStartTime.current) {
      const authTime = performance.now() - authStartTime.current;
      if (import.meta.env.DEV) {
        if (authTime > 1000) {
          console.warn(`🐌 Slow auth loading: ${authTime.toFixed(2)}ms`);
        } else {
          console.log(`✅ Auth loaded in: ${authTime.toFixed(2)}ms`);
        }
      }
      authStartTime.current = null;
    }
  }, [loading]);

  useEffect(() => {
    if (permissionsLoading && !permissionsStartTime.current) {
      permissionsStartTime.current = performance.now();
    } else if (!permissionsLoading && permissionsStartTime.current) {
      const permissionsTime = performance.now() - permissionsStartTime.current;
      if (import.meta.env.DEV) {
        if (permissionsTime > 500) {
          console.warn(`🐌 Slow permissions loading: ${permissionsTime.toFixed(2)}ms`);
        } else {
          console.log(`✅ Permissions loaded in: ${permissionsTime.toFixed(2)}ms`);
        }
      }
      permissionsStartTime.current = null;
    }
  }, [permissionsLoading]);

  useEffect(() => {
    if (user && roles.length > 0 && import.meta.env.DEV) {
      console.log(`👤 User authenticated with roles: ${roles.join(', ')}`);
    }
  }, [user, roles]);

  return {
    isAuthLoading: loading,
    isPermissionsLoading: permissionsLoading,
    isFullyLoaded: !loading && !permissionsLoading && !!user
  };
};

export default useAuthPerformance;