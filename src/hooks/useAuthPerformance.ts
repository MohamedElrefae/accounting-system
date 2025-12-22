import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

/**
 * Hook to monitor auth performance and log slow operations
 */
export const useAuthPerformance = () => {
  const { loading, permissionsLoading, user, roles } = useAuth();
  const authStartTime = useRef<number | null>(null);
  const permissionsStartTime = useRef<number | null>(null);

  const getNetworkTier = useCallback((): 'fast' | 'medium' | 'slow' => {
    try {
      const connection = (navigator as any)?.connection;
      const effectiveType = String(connection?.effectiveType || '').toLowerCase();
      if (effectiveType.includes('2g') || effectiveType.includes('slow-2g') || effectiveType.includes('3g')) return 'slow';
      if (effectiveType.includes('4g')) return 'fast';

      const downlink = Number(connection?.downlink || 0);
      const rtt = Number(connection?.rtt || 0);
      if ((downlink > 0 && downlink < 1.2) || (rtt > 0 && rtt >= 350)) return 'slow';
      if ((downlink > 0 && downlink < 3) || (rtt > 0 && rtt >= 200)) return 'medium';
      return 'fast';
    } catch {
      return 'fast';
    }
  }, []);

  const getWarnThreshold = useCallback((kind: 'auth' | 'permissions'): number => {
    const tier = getNetworkTier();
    if (kind === 'auth') {
      return tier === 'slow' ? 5000 : tier === 'medium' ? 2500 : 1200;
    }
    return tier === 'slow' ? 2500 : tier === 'medium' ? 1200 : 700;
  }, [getNetworkTier]);

  useEffect(() => {
    if (loading && !authStartTime.current) {
      authStartTime.current = performance.now();
    } else if (!loading && authStartTime.current) {
      const authTime = performance.now() - authStartTime.current;
      if (import.meta.env.DEV) {
        if (authTime > getWarnThreshold('auth')) {
          console.warn(`🐌 Slow auth loading: ${authTime.toFixed(2)}ms`);
        } else {
          console.log(`✅ Auth loaded in: ${authTime.toFixed(2)}ms`);
        }
      }
      authStartTime.current = null;
    }
  }, [loading, getWarnThreshold]);

  useEffect(() => {
    if (permissionsLoading && !permissionsStartTime.current) {
      permissionsStartTime.current = performance.now();
    } else if (!permissionsLoading && permissionsStartTime.current) {
      const permissionsTime = performance.now() - permissionsStartTime.current;
      if (import.meta.env.DEV) {
        if (permissionsTime > getWarnThreshold('permissions')) {
          console.warn(`🐌 Slow permissions loading: ${permissionsTime.toFixed(2)}ms`);
        } else {
          console.log(`✅ Permissions loaded in: ${permissionsTime.toFixed(2)}ms`);
        }
      }
      permissionsStartTime.current = null;
    }
  }, [permissionsLoading, getWarnThreshold]);

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