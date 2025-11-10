import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/routing/ProtectedRoute';
import { OptimizedSuspense } from '../components/Common/PerformanceOptimizer';

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

const ReportRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Trial Balance */}
      <Route path="/reports/trial-balance" element={
        <ProtectedRoute>
          <OptimizedSuspense>
            <TrialBalanceOriginalPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      <Route path="/reports/trial-balance-all-levels" element={
        <ProtectedRoute>
          <OptimizedSuspense>
            <TrialBalanceAllLevelsPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      {/* General Ledger */}
      <Route path="/reports/general-ledger" element={
        <ProtectedRoute>
          <OptimizedSuspense>
            <GeneralLedgerPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      {/* Account Explorer */}
      <Route path="/reports/account-explorer" element={
        <ProtectedRoute>
          <OptimizedSuspense>
            <AccountExplorerReportPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      {/* Financial Statements */}
      <Route path="/reports/profit-loss" element={
        <ProtectedRoute>
          <OptimizedSuspense>
            <ProfitLossPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      <Route path="/reports/balance-sheet" element={
        <ProtectedRoute>
          <OptimizedSuspense>
            <BalanceSheetPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      {/* Usage Reports */}
      <Route path="/reports/main-data/work-item-usage" element={
        <ProtectedRoute>
          <OptimizedSuspense>
            <WorkItemUsagePage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      <Route path="/reports/main-data/analysis-item-usage" element={
        <ProtectedRoute>
          <OptimizedSuspense>
            <AnalysisItemUsagePage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      {/* Transaction Classification Reports */}
      <Route path="/reports/main-data/transaction-classification" element={
        <ProtectedRoute>
          <OptimizedSuspense>
            <TransactionClassificationReportsPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      {/* Custom Reports */}
      <Route path="/reports/custom" element={
        <OptimizedSuspense>
          <CustomReportsPage />
        </OptimizedSuspense>
      } />
    </Routes>
  );
};

export default ReportRoutes;