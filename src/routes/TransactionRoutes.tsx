import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/routing/ProtectedRoute';
import { OptimizedSuspense } from '../components/Common/PerformanceOptimizer';

// Transaction-related routes grouped together for better performance
const TransactionsPage = React.lazy(() => import('../pages/Transactions/Transactions'));
const TransactionsEnrichedPage = React.lazy(() => import('../pages/Transactions/TransactionsEnriched'));
const TxLineItemsPage = React.lazy(() => import('../pages/Transactions/TransactionLineItems'));
const TransactionDetailsPage = React.lazy(() => import('../pages/Transactions/TransactionDetails'));
const AssignCostAnalysisPage = React.lazy(() => import('../pages/Transactions/AssignCostAnalysis'));

const TransactionRoutes: React.FC = () => {
  return (
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
  );
};

export default TransactionRoutes;