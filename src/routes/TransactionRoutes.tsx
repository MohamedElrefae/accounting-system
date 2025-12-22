import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/routing/ProtectedRoute';
import { OptimizedSuspense } from '../components/Common/PerformanceOptimizer';
import { TransactionsDataProvider } from '../contexts/TransactionsDataContext';
import TransactionsErrorBoundary from '../components/TransactionsErrorBoundary';
import { useAuditContext } from '../hooks/useAuditContext';

// Transaction-related routes grouped together for better performance
const TransactionsPage = React.lazy(() => import('../pages/Transactions/Transactions'));
const TransactionsEnrichedPage = React.lazy(() => import('../pages/Transactions/TransactionsEnriched'));
const MyLinesEnrichedPage = React.lazy(() => import('../pages/Transactions/MyLinesEnriched'));
const AllLinesEnrichedPage = React.lazy(() => import('../pages/Transactions/AllLinesEnriched'));
const TxLineItemsPage = React.lazy(() => import('../pages/Transactions/TransactionLineItems'));
const TransactionDetailsPage = React.lazy(() => import('../pages/Transactions/TransactionDetails'));
const AssignCostAnalysisPage = React.lazy(() => import('../pages/Transactions/AssignCostAnalysis'));

const TransactionRoutes: React.FC = () => {
  useAuditContext({ pageName: 'Transactions', moduleName: 'Transactions' });

  return (
    <TransactionsDataProvider>
      <TransactionsErrorBoundary>
        <Routes>
          {/* My Transactions */}
          <Route path="my" element={
            <OptimizedSuspense>
              <TransactionsPage />
            </OptimizedSuspense>
          } />

          {/* Pending Transactions */}
          <Route path="pending" element={
            <ProtectedRoute requiredAction="transactions.review">
              <OptimizedSuspense>
                <TransactionsPage />
              </OptimizedSuspense>
            </ProtectedRoute>
          } />

          {/* All Transactions */}
          <Route path="all" element={
            <OptimizedSuspense>
              <TransactionsPage />
            </OptimizedSuspense>
          } />

          {/* Enriched Transactions */}
          <Route path="my-enriched" element={
            <OptimizedSuspense>
              <TransactionsEnrichedPage />
            </OptimizedSuspense>
          } />

          <Route path="all-enriched" element={
            <OptimizedSuspense>
              <TransactionsEnrichedPage />
            </OptimizedSuspense>
          } />

          {/* My Lines Enriched - Transaction lines created by current user */}
          <Route path="my-lines" element={
            <OptimizedSuspense>
              <MyLinesEnrichedPage />
            </OptimizedSuspense>
          } />

          {/* All Lines Enriched - All transaction lines (requires read.all permission) */}
          <Route path="all-lines" element={
            <ProtectedRoute requiredAction="transactions.read.all">
              <OptimizedSuspense>
                <AllLinesEnrichedPage />
              </OptimizedSuspense>
            </ProtectedRoute>
          } />

          {/* Transaction Details */}
          <Route path=":id" element={
            <OptimizedSuspense>
              <TransactionDetailsPage />
            </OptimizedSuspense>
          } />

          {/* Transaction Line Items */}
          <Route path="line-items" element={
            <OptimizedSuspense>
              <TxLineItemsPage />
            </OptimizedSuspense>
          } />

          <Route path="TransactionLineItems" element={
            <OptimizedSuspense>
              <TxLineItemsPage />
            </OptimizedSuspense>
          } />

          {/* Cost Analysis */}
          <Route path="assign-cost-analysis" element={
            <ProtectedRoute requiredAction="transactions.cost_analysis">
              <OptimizedSuspense>
                <AssignCostAnalysisPage />
              </OptimizedSuspense>
            </ProtectedRoute>
          } />
        </Routes>
      </TransactionsErrorBoundary>
    </TransactionsDataProvider>
  );
};

export default TransactionRoutes;