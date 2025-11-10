import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { OptimizedSuspense } from '../components/Common/PerformanceOptimizer';

// Fiscal management routes - specialized module, load on demand
const OpeningBalanceImportPage = React.lazy(() => import('../pages/Fiscal/OpeningBalanceImport'));
const FiscalYearDashboardPage = React.lazy(() => import('../pages/Fiscal/FiscalYearDashboard'));
const FiscalPeriodManagerPage = React.lazy(() => import('../pages/Fiscal/FiscalPeriodManager'));
const EnhancedFiscalHubPage = React.lazy(() => import('../pages/Fiscal/EnhancedFiscalHub'));
const EnhancedOpeningBalanceImportPage = React.lazy(() => import('../pages/Fiscal/EnhancedOpeningBalanceImport'));
const EnhancedFiscalPeriodManagerPage = React.lazy(() => import('../pages/Fiscal/EnhancedFiscalPeriodManager'));
const ConstructionDashboardPage = React.lazy(() => import('../pages/Fiscal/ConstructionDashboard'));
const OpeningBalanceApprovalWorkflowPage = React.lazy(() => import('../pages/Fiscal/OpeningBalanceApprovalWorkflow'));
const ValidationRuleManagerPage = React.lazy(() => import('../pages/Fiscal/ValidationRuleManager'));
const BalanceReconciliationDashboardPage = React.lazy(() => import('../pages/Fiscal/BalanceReconciliationDashboard'));
const OpeningBalanceAuditTrailPage = React.lazy(() => import('../pages/Fiscal/OpeningBalanceAuditTrail'));
const ApprovalNotificationCenterPage = React.lazy(() => import('../pages/Fiscal/ApprovalNotificationCenter'));
const EnhancedFiscalYearDashboardSafePage = React.lazy(() => import('../pages/Fiscal/EnhancedFiscalYearDashboard.safe'));

const FiscalRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Basic Fiscal Management */}
      <Route path="/fiscal/opening-balance-import" element={
        <OptimizedSuspense>
          <OpeningBalanceImportPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/fiscal/dashboard" element={
        <OptimizedSuspense>
          <FiscalYearDashboardPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/fiscal/periods" element={
        <OptimizedSuspense>
          <FiscalPeriodManagerPage />
        </OptimizedSuspense>
      } />
      
      {/* Enhanced Fiscal Management with Arabic/RTL Support */}
      <Route path="/fiscal/enhanced" element={
        <OptimizedSuspense>
          <EnhancedFiscalHubPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/fiscal/enhanced/opening-balance-import" element={
        <OptimizedSuspense>
          <EnhancedOpeningBalanceImportPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/fiscal/enhanced/dashboard" element={
        <OptimizedSuspense>
          <EnhancedFiscalYearDashboardSafePage />
        </OptimizedSuspense>
      } />
      
      <Route path="/fiscal/enhanced/periods" element={
        <OptimizedSuspense>
          <EnhancedFiscalPeriodManagerPage />
        </OptimizedSuspense>
      } />
      
      {/* Construction Management */}
      <Route path="/fiscal/construction" element={
        <OptimizedSuspense>
          <ConstructionDashboardPage />
        </OptimizedSuspense>
      } />
      
      {/* Approval Workflows */}
      <Route path="/fiscal/approval-workflow" element={
        <OptimizedSuspense>
          <OpeningBalanceApprovalWorkflowPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/fiscal/validation-rules" element={
        <OptimizedSuspense>
          <ValidationRuleManagerPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/fiscal/reconciliation" element={
        <OptimizedSuspense>
          <BalanceReconciliationDashboardPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/fiscal/audit-trail" element={
        <OptimizedSuspense>
          <OpeningBalanceAuditTrailPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/fiscal/approvals" element={
        <OptimizedSuspense>
          <ApprovalNotificationCenterPage />
        </OptimizedSuspense>
      } />
    </Routes>
  );
};

export default FiscalRoutes;