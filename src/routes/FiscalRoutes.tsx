import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { OptimizedSuspense } from '../components/Common/PerformanceOptimizer';
import { TransactionsDataProvider } from '@/contexts/TransactionsDataContext';

// Unified Fiscal Management Routes - using new dashboard with full CRUD operations
const FiscalYearDashboardPage = React.lazy(() => import('../pages/Fiscal/FiscalYearDashboard'));
const FiscalPeriodManagerPage = React.lazy(() => import('../pages/Fiscal/FiscalPeriodManagerRefactored'));
const OpeningBalanceImportPage = React.lazy(() => import('../pages/Fiscal/OpeningBalanceImportSimple'));

const FiscalRoutes: React.FC = () => {
  return (
    <TransactionsDataProvider>
      <Routes>
        {/* Fiscal Year Dashboard - /fiscal/dashboard */}
        <Route path="dashboard" element={
          <OptimizedSuspense>
            <FiscalYearDashboardPage />
          </OptimizedSuspense>
        } />
        
        {/* Period Manager - /fiscal/periods */}
        <Route path="periods" element={
          <OptimizedSuspense>
            <FiscalPeriodManagerPage />
          </OptimizedSuspense>
        } />
        
        {/* Opening Balance Import - /fiscal/opening-balance */}
        <Route path="opening-balance" element={
          <OptimizedSuspense>
            <OpeningBalanceImportPage />
          </OptimizedSuspense>
        } />
        
        {/* Default redirect to dashboard */}
        <Route index element={
          <OptimizedSuspense>
            <FiscalYearDashboardPage />
          </OptimizedSuspense>
        } />
      </Routes>
    </TransactionsDataProvider>
  );
};

export default FiscalRoutes;
