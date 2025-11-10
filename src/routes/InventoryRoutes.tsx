import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/routing/ProtectedRoute';
import { OptimizedSuspense } from '../components/Common/PerformanceOptimizer';

// Inventory routes - specialized module, load on demand
const InventoryDashboardPage = React.lazy(() => import('../pages/Inventory/InventoryDashboard'));
const InventoryMaterialsPage = React.lazy(() => import('../pages/Inventory/Materials'));
const InventoryLocationsPage = React.lazy(() => import('../pages/Inventory/Locations'));
const InventoryOnHandPage = React.lazy(() => import('../pages/Inventory/OnHand'));
const InventoryMovementsPage = React.lazy(() => import('../pages/Inventory/Movements'));
const InventoryValuationPage = React.lazy(() => import('../pages/Inventory/Valuation'));
const InventoryAgeingPage = React.lazy(() => import('../pages/Inventory/Ageing'));
const InventoryReconciliationPage = React.lazy(() => import('../pages/Inventory/Reconciliation'));
const InventoryReconciliationSessionPage = React.lazy(() => import('../pages/Inventory/ReconciliationSession'));
const InventoryMovementSummaryPage = React.lazy(() => import('../pages/Inventory/MovementSummary'));
const InventoryMovementDetailPage = React.lazy(() => import('../pages/Inventory/MovementDetail'));
const InventoryProjectMovementSummaryPage = React.lazy(() => import('../pages/Inventory/ProjectMovementSummary'));
const InventoryValuationByProjectPage = React.lazy(() => import('../pages/Inventory/ValuationByProject'));
const InventoryReceivePage = React.lazy(() => import('../pages/Inventory/Receive'));
const InventoryIssuePage = React.lazy(() => import('../pages/Inventory/Issue'));
const InventoryTransferPage = React.lazy(() => import('../pages/Inventory/Transfer'));
const InventoryAdjustPage = React.lazy(() => import('../pages/Inventory/Adjust'));
const InventoryReturnsPage = React.lazy(() => import('../pages/Inventory/Returns'));
const InventoryKpiDashboardPage = React.lazy(() => import('../pages/Inventory/KPIDashboard'));
const InventorySettingsPage = React.lazy(() => import('../pages/Inventory/InventorySettings'));
const InventoryDocumentDetailsPage = React.lazy(() => import('../pages/Inventory/DocumentDetails'));

const InventoryRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Dashboard */}
      <Route path="/inventory" element={
        <OptimizedSuspense>
          <InventoryDashboardPage />
        </OptimizedSuspense>
      } />
      
      {/* Master Data */}
      <Route path="/inventory/materials" element={
        <OptimizedSuspense>
          <InventoryMaterialsPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/inventory/locations" element={
        <OptimizedSuspense>
          <InventoryLocationsPage />
        </OptimizedSuspense>
      } />
      
      {/* Reports */}
      <Route path="/inventory/on-hand" element={
        <OptimizedSuspense>
          <InventoryOnHandPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/inventory/movements" element={
        <OptimizedSuspense>
          <InventoryMovementsPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/inventory/valuation" element={
        <OptimizedSuspense>
          <InventoryValuationPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/inventory/ageing" element={
        <OptimizedSuspense>
          <InventoryAgeingPage />
        </OptimizedSuspense>
      } />
      
      {/* Reconciliation */}
      <Route path="/inventory/reconciliation" element={
        <OptimizedSuspense>
          <InventoryReconciliationPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/inventory/reconciliation/:sessionId" element={
        <OptimizedSuspense>
          <InventoryReconciliationSessionPage />
        </OptimizedSuspense>
      } />
      
      {/* Movement Reports */}
      <Route path="/inventory/movement-summary" element={
        <OptimizedSuspense>
          <InventoryMovementSummaryPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/inventory/movement-detail" element={
        <OptimizedSuspense>
          <InventoryMovementDetailPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/inventory/project-movement-summary" element={
        <OptimizedSuspense>
          <InventoryProjectMovementSummaryPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/inventory/valuation-by-project" element={
        <OptimizedSuspense>
          <InventoryValuationByProjectPage />
        </OptimizedSuspense>
      } />
      
      {/* Transactions */}
      <Route path="/inventory/receive" element={
        <OptimizedSuspense>
          <InventoryReceivePage />
        </OptimizedSuspense>
      } />
      
      <Route path="/inventory/issue" element={
        <OptimizedSuspense>
          <InventoryIssuePage />
        </OptimizedSuspense>
      } />
      
      <Route path="/inventory/transfer" element={
        <OptimizedSuspense>
          <InventoryTransferPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/inventory/adjust" element={
        <OptimizedSuspense>
          <InventoryAdjustPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/inventory/returns" element={
        <OptimizedSuspense>
          <InventoryReturnsPage />
        </OptimizedSuspense>
      } />
      
      {/* KPIs and Settings */}
      <Route path="/inventory/kpis" element={
        <OptimizedSuspense>
          <InventoryKpiDashboardPage />
        </OptimizedSuspense>
      } />
      
      <Route path="/inventory/settings" element={
        <ProtectedRoute requiredAction="inventory.manage">
          <OptimizedSuspense>
            <InventorySettingsPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      <Route path="/inventory/document/:id" element={
        <OptimizedSuspense>
          <InventoryDocumentDetailsPage />
        </OptimizedSuspense>
      } />
    </Routes>
  );
};

export default InventoryRoutes;