import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { OptimizedSuspense } from '../components/Common/PerformanceOptimizer';
import ErrorBoundary from '../components/Common/ErrorBoundary';
import InventoryLoadingFallback from '../components/Inventory/InventoryLoadingFallback';
import InventoryErrorFallback from '../components/Inventory/InventoryErrorFallback';

// Unified inventory module
const InventoryModule = React.lazy(() => import('../pages/Inventory/InventoryModule'));

const InventoryRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <ErrorBoundary fallback={<InventoryErrorFallback />}>
      <Routes>
        {/* Unified inventory module with nested routing */}
        <Route path="/*" element={
          <OptimizedSuspense fallback={<InventoryLoadingFallback />}>
            <InventoryModule key={location.pathname} />
          </OptimizedSuspense>
        } />
        
        {/* Default redirect to dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />
      </Routes>
    </ErrorBoundary>
  );
};

export default InventoryRoutes;