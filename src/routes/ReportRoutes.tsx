import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/routing/ProtectedRoute';
import { OptimizedSuspense } from '../components/Common/PerformanceOptimizer';
import { TransactionsDataProvider } from '../contexts/TransactionsDataContext';

// Report routes - these are heavy components, load on demand
const GeneralLedgerPage = React.lazy(() => import('../pages/Reports/GeneralLedger'));
const ProfitLossPage = React.lazy(() => import('../pages/Reports/ProfitLoss'));
const BalanceSheetPage = React.lazy(() => import('../pages/Reports/BalanceSheet'));
const WorkItemUsagePage = React.lazy(() => import('../pages/Reports/WorkItemUsage'));
const AnalysisItemUsagePage = React.lazy(() => import('../pages/Reports/AnalysisItemUsage'));
const TrialBalanceAllLevelsPage = React.lazy(() => import('../pages/Reports/TrialBalanceAllLevels'));
const AccountExplorerReportPage = React.lazy(() => import('../pages/Reports/AccountExplorer'));
const CustomReportsPage = React.lazy(() => import('../pages/CustomReports'));
const TrialBalanceOriginalPage = React.lazy(() => import('../pages/Reports/TrialBalanceOriginal'));

const TransactionClassificationReportsPage = React.lazy(() => import('../pages/Reports/TransactionClassificationReports'));
const RunningBalanceEnrichedPage = React.lazy(() => import('../pages/Reports/RunningBalanceEnriched'));

const ReportRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Trial Balance */}
      <Route path="trial-balance" element={
        <ProtectedRoute>
          <OptimizedSuspense>
            <TrialBalanceOriginalPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />

      <Route path="trial-balance-all-levels" element={
        <ProtectedRoute>
          <OptimizedSuspense>
            <TrialBalanceAllLevelsPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />

      {/* General Ledger */}
      <Route path="general-ledger" element={
        <ProtectedRoute>
          <OptimizedSuspense>
            <GeneralLedgerPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />

      {/* Running Balance */}
      <Route path="running-balance" element={
        <ProtectedRoute>
          <TransactionsDataProvider>
            <OptimizedSuspense>
              <RunningBalanceEnrichedPage />
            </OptimizedSuspense>
          </TransactionsDataProvider>
        </ProtectedRoute>
      } />

      {/* Account Explorer */}
      <Route path="account-explorer" element={
        <ProtectedRoute>
          <OptimizedSuspense>
            <AccountExplorerReportPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />

      {/* Financial Statements */}
      <Route path="profit-loss" element={
        <ProtectedRoute>
          <OptimizedSuspense>
            <ProfitLossPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />

      <Route path="balance-sheet" element={
        <ProtectedRoute>
          <OptimizedSuspense>
            <BalanceSheetPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />

      {/* Usage Reports */}
      <Route path="main-data/work-item-usage" element={
        <ProtectedRoute>
          <OptimizedSuspense>
            <WorkItemUsagePage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />

      <Route path="main-data/analysis-item-usage" element={
        <ProtectedRoute>
          <OptimizedSuspense>
            <AnalysisItemUsagePage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />

      {/* Transaction Classification Reports */}
      <Route path="main-data/transaction-classification" element={
        <ProtectedRoute>
          <OptimizedSuspense>
            <TransactionClassificationReportsPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />

      {/* Custom Reports */}
      <Route path="custom" element={
        <OptimizedSuspense>
          <CustomReportsPage />
        </OptimizedSuspense>
      } />
    </Routes>
  );
};

export default ReportRoutes;