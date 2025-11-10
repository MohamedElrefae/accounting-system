import React from 'react';

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

// Preload critical routes after app initialization
export const preloadCriticalRoutes = () => {
  // Preload most commonly accessed routes after 1 second
  setTimeout(() => {
    import('./TransactionRoutes');
    import('./MainDataRoutes');
  }, 1000);
  
  // Preload reports after 3 seconds (when user is likely to navigate)
  setTimeout(() => {
    import('./ReportRoutes');
  }, 3000);
  
  // Preload inventory after 5 seconds (less commonly used)
  setTimeout(() => {
    import('./InventoryRoutes');
  }, 5000);
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