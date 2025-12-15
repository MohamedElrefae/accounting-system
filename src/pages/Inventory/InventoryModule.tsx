import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'
import InventoryLoadingFallback from '@/components/Inventory/InventoryLoadingFallback'
import InventoryErrorFallback from '@/components/Inventory/InventoryErrorFallback'
import ErrorBoundary from '@/components/Common/ErrorBoundary'

// Lazy load all inventory views
const DashboardView = lazy(() => import('./views/DashboardView'))
const MaterialsView = lazy(() => import('./views/MaterialsView'))
const LocationsView = lazy(() => import('./views/LocationsView'))
const DocumentsView = lazy(() => import('./views/DocumentsView'))
const DocumentDetailsView = lazy(() => import('./views/DocumentDetailsView'))
const MovementsView = lazy(() => import('./views/MovementsView'))
const OnHandReportView = lazy(() => import('./views/OnHandReportView'))
const ValuationReportView = lazy(() => import('./views/ValuationReportView'))
const AgeingReportView = lazy(() => import('./views/AgeingReportView'))
const ReconciliationView = lazy(() => import('./views/ReconciliationView'))
const ReconciliationSessionView = lazy(() => import('./views/ReconciliationSessionView'))
const MovementSummaryView = lazy(() => import('./views/MovementSummaryView'))
const MovementDetailView = lazy(() => import('./views/MovementDetailView'))
const ProjectMovementSummaryView = lazy(() => import('./views/ProjectMovementSummaryView'))
const ValuationByProjectView = lazy(() => import('./views/ValuationByProjectView'))
const ReceiveView = lazy(() => import('./views/ReceiveView'))
const IssueView = lazy(() => import('./views/IssueView'))
const TransferView = lazy(() => import('./views/TransferView'))
const AdjustView = lazy(() => import('./views/AdjustView'))
const ReturnsView = lazy(() => import('./views/ReturnsView'))
const KPIDashboardView = lazy(() => import('./views/KPIDashboardView'))
const InventorySettingsView = lazy(() => import('./views/InventorySettingsView'))
const UOMsView = lazy(() => import('./views/UOMsView'))

const InventoryModule: React.FC = () => {
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ErrorBoundary fallback={<InventoryErrorFallback />}>
        <Suspense fallback={<InventoryLoadingFallback />}>
          <Routes>
            {/* Dashboard */}
            <Route path="dashboard" element={<DashboardView />} />
            
            {/* Master Data */}
            <Route path="materials" element={<MaterialsView />} />
            <Route path="locations" element={<LocationsView />} />
            
            {/* Documents */}
            <Route path="documents" element={<DocumentsView />} />
            <Route path="documents/:id" element={<DocumentDetailsView />} />
            
            {/* Transactions */}
            <Route path="receive" element={<ReceiveView />} />
            <Route path="issue" element={<IssueView />} />
            <Route path="transfer" element={<TransferView />} />
            <Route path="adjust" element={<AdjustView />} />
            <Route path="returns" element={<ReturnsView />} />
            
            {/* Reports */}
            <Route path="on-hand" element={<OnHandReportView />} />
            <Route path="movements" element={<MovementsView />} />
            <Route path="valuation" element={<ValuationReportView />} />
            <Route path="ageing" element={<AgeingReportView />} />
            <Route path="movement-summary" element={<MovementSummaryView />} />
            <Route path="movement-detail" element={<MovementDetailView />} />
            <Route path="project-movement-summary" element={<ProjectMovementSummaryView />} />
            <Route path="valuation-by-project" element={<ValuationByProjectView />} />
            
            {/* Reconciliation */}
            <Route path="reconciliation" element={<ReconciliationView />} />
            <Route path="reconciliation/:sessionId" element={<ReconciliationSessionView />} />
            
            {/* KPIs and Settings */}
            <Route path="kpis" element={<KPIDashboardView />} />
            <Route path="settings" element={<InventorySettingsView />} />
            <Route path="uoms" element={<UOMsView />} />
            
            {/* Default redirect */}
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Box>
  )
}

export default InventoryModule