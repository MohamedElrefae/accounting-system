import React, { useEffect, useCallback, useMemo, useState } from 'react';
import featureFlags from '../utils/featureFlags';
import { useOptimizedAuth } from '../hooks/useOptimizedAuth';

// Group related routes to reduce the number of lazy imports
// This dramatically improves route loading performance

// Core app routes (preloaded)
export const CoreRoutes = React.lazy(() => import('./CoreRoutes'));

// Main data routes (loaded on demand)
export const MainDataRoutes = React.lazy(() => import('./MainDataRoutes'));

// Transaction routes (commonly used, preload after core)
export const TransactionRoutes = React.lazy(() => import('./TransactionRoutes'));

// Report routes (heavy, load on demand)
export const ReportRoutes = React.lazy(() => import('./ReportRoutes'));

// Fiscal routes (specialized, load on demand)
export const FiscalRoutes = React.lazy(() => import('./FiscalRoutes'));

// Inventory routes (specialized, load on demand)
export const InventoryRoutes = React.lazy(() => import('./InventoryRoutes'));

// Admin routes (rarely used, load on demand)
export const AdminRoutes = React.lazy(() => import('./AdminRoutes'));

const SMART_PRELOAD_PATTERNS_KEY = 'smart_preload_patterns_v1';
let criticalRoutesPreloaded = false;

// Preload critical routes after app initialization with network awareness
export const preloadCriticalRoutes = () => {
  if (criticalRoutesPreloaded) return;
  criticalRoutesPreloaded = true;

  // Get adaptive delay based on network conditions
  const getAdaptiveDelay = (): number | null => {
    // Check for Network Information API support
    if (!('connection' in navigator)) {
      console.log('[Network] Network Information API not supported, using default delay');
      return 1000; // Default delay for unsupported browsers
    }
    
    const connection = navigator.connection;
    
    // Respect data saver mode
    if (connection.saveData) {
      console.log('[Network] Data saver mode enabled, skipping preload');
      return null;
    }
    
    // Adaptive delays based on network type
    switch (connection.effectiveType) {
      case '4g':
        return 800; // More conservative than original 500ms
      case '3g':
        return 1500;
      case '2g':
      case 'slow-2g':
        console.log('[Network] Slow connection detected, skipping preload');
        return null;
      default:
        // Unknown connection type - use moderate delay
        return 1000;
    }
  };
  
  const preloadWithNetworkAwareness = (target: { name: string; importer: () => Promise<unknown> }) => {
    const adaptiveDelay = getAdaptiveDelay();
    
    if (adaptiveDelay === null) {
      console.log(`[Preload] Skipping ${target.name} due to network conditions`);
      return;
    }
    
    console.log(`[Preload] Scheduling ${target.name} with ${adaptiveDelay}ms delay`);
    
    setTimeout(() => {
      target.importer().catch(error => {
        console.warn(`[Preload] Failed to preload ${target.name}:`, error);
      });
    }, adaptiveDelay);
  };
  
  // Preload routes with network awareness
  preloadWithNetworkAwareness({ name: 'TransactionRoutes', importer: () => import('./TransactionRoutes') });
  preloadWithNetworkAwareness({ name: 'MainDataRoutes', importer: () => import('./MainDataRoutes') });
  
  // Reports preload with slightly longer delay
  setTimeout(() => {
    preloadWithNetworkAwareness({ name: 'ReportRoutes', importer: () => import('./ReportRoutes') });
  }, 2000);
  
  // Inventory preload with longer delay (less critical)
  setTimeout(() => {
    preloadWithNetworkAwareness({ name: 'InventoryRoutes', importer: () => import('./InventoryRoutes') });
  }, 4000);
};

// Preload routes on hover/focus for instant navigation
export const useRoutePreloading = () => {
  const preloadRoute = React.useCallback((routeGroup: string) => {
    switch (routeGroup) {
      case 'transactions':
        import('./TransactionRoutes');
        break;
      case 'reports':
        import('./ReportRoutes');
        break;
      case 'fiscal':
        import('./FiscalRoutes');
        break;
      case 'inventory':
        import('./InventoryRoutes');
        break;
      case 'admin':
        import('./AdminRoutes');
        break;
    }
  }, []);
  
  return { preloadRoute };
};

// Phase 2: Smart route preloading with pattern analysis + role strategy
export const useSmartRoutePreloading = () => {
  const { roles } = useOptimizedAuth();
  const enabled = featureFlags.isEnabled('SMART_ROUTE_PRELOADING');
  const [userPatterns, setUserPatterns] = useState<Record<string, number>>(() => {
    if (!enabled) return {};
    try {
      const raw = localStorage.getItem(SMART_PRELOAD_PATTERNS_KEY);
      if (!raw) return {};
      return JSON.parse(raw) as Record<string, number>;
    } catch {
      return {};
    }
  });
  const [lastPreloadTime, setLastPreloadTime] = useState(0);

  const persistPatterns = useCallback((patterns: Record<string, number>) => {
    if (!enabled) return;
    try {
      localStorage.setItem(SMART_PRELOAD_PATTERNS_KEY, JSON.stringify(patterns));
    } catch {
      // ignore
    }
  }, [enabled]);

  const recordNavigation = useCallback((pathname: string) => {
    if (!enabled) return;
    setUserPatterns(prev => {
      const next = { ...prev, [pathname]: (prev[pathname] || 0) + 1 };
      persistPatterns(next);
      return next;
    });
  }, [enabled, persistPatterns]);

  const preloadOnHover = useCallback((routeType: string) => {
    if (!enabled) return;
    switch (routeType) {
      case 'transactions':
        import('./TransactionRoutes').catch(console.warn);
        break;
      case 'reports':
        import('./ReportRoutes').catch(console.warn);
        break;
      case 'inventory':
        import('./InventoryRoutes').catch(console.warn);
        break;
      case 'admin':
        import('./AdminRoutes').catch(console.warn);
        break;
      case 'main-data':
        import('./MainDataRoutes').catch(console.warn);
        break;
    }
  }, [enabled]);

  const preloadBasedOnPatterns = useCallback(() => {
    if (!enabled) return;

    const now = Date.now();
    if (now - lastPreloadTime < 30000) return;
    setLastPreloadTime(now);

    const frequentRoutes = Object.entries(userPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([route]) => route);

    frequentRoutes.forEach(route => {
      if (route.includes('transactions')) {
        import('./TransactionRoutes').catch(console.warn);
      } else if (route.includes('reports')) {
        import('./ReportRoutes').catch(console.warn);
      } else if (route.includes('inventory')) {
        import('./InventoryRoutes').catch(console.warn);
      } else if (route.includes('admin')) {
        import('./AdminRoutes').catch(console.warn);
      } else if (route.includes('main-data')) {
        import('./MainDataRoutes').catch(console.warn);
      }
    });
  }, [enabled, lastPreloadTime, userPatterns]);

  const preloadForRole = useCallback(() => {
    if (!enabled) return;
    if (!roles.length) return;

    if (roles.includes('super_admin')) {
      import('./TransactionRoutes').catch(console.warn);
      import('./AdminRoutes').catch(console.warn);
      import('./ReportRoutes').catch(console.warn);
      import('./MainDataRoutes').catch(console.warn);
      return;
    }

    if (roles.includes('accountant') || roles.includes('manager')) {
      import('./TransactionRoutes').catch(console.warn);
      import('./ReportRoutes').catch(console.warn);
      import('./MainDataRoutes').catch(console.warn);
    }
  }, [enabled, roles]);

  useEffect(() => {
    preloadForRole();
  }, [preloadForRole]);

  return useMemo(
    () => ({ recordNavigation, preloadBasedOnPatterns, preloadOnHover, enabled }),
    [recordNavigation, preloadBasedOnPatterns, preloadOnHover, enabled]
  );
};