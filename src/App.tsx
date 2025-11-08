import React, { useEffect } from 'react';
import { useIdleLogout } from './hooks/useIdleLogout';
import { useAuthPerformance } from './hooks/useAuthPerformance';
import { initAuthCleanup } from './utils/authCleanup';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAppStore from './store/useAppStore';
import { ArabicLanguageService } from './services/ArabicLanguageService';
import DashboardLayout from './components/layout/DashboardLayout';
import SkeletonLoader from './components/Common/SkeletonLoader';
// Debug imports removed - they were causing slow startup
const LandingDecider = React.lazy(() => import('./pages/LandingDecider'));
const AccountsTreeLazy = React.lazy(() => import('./pages/MainData/AccountsTree'));
const DocumentCategoriesPage = React.lazy(() => import('./pages/MainData/DocumentCategories'));
const TemplateLibraryPage = React.lazy(() => import('./pages/MainData/DocumentTemplates/TemplateLibrary'));
const TemplateEditorPage = React.lazy(() => import('./pages/MainData/DocumentTemplates/TemplateEditor'));
const TemplateViewerPage = React.lazy(() => import('./pages/MainData/DocumentTemplates/TemplateViewer'));
const DocumentApprovalsPage = React.lazy(() => import('./pages/Approvals/DocumentApprovals'));
const SubTreePage = React.lazy(() => import('./pages/MainData/SubTree'));
const WorkItemsPage = React.lazy(() => import('./pages/MainData/WorkItems'));
const CostCentersPage = React.lazy(() => import('./pages/MainData/CostCenters'));
const TransactionLineItemsCatalogPage = React.lazy(() => import('./pages/MainData/TransactionLineItems'));
const AnalysisWorkItemsPage = React.lazy(() => import('./pages/MainData/AnalysisWorkItems'));
const AssignCostAnalysisPage = React.lazy(() => import('./pages/Transactions/AssignCostAnalysis'));
const TestRTL = React.lazy(() => import('./pages/TestRTL'));
const ExportTestPage = React.lazy(() => import('./pages/ExportTestPage'));
const DocumentControlsBarTest = React.lazy(() => import('./features/documents/components/DocumentControlsBarTest'));
const DocumentControlsBarRTLTest = React.lazy(() => import('./features/documents/components/DocumentControlsBarRTLTest'));
const TransactionsPage = React.lazy(() => import('./pages/Transactions/Transactions'));
const TransactionsEnrichedPage = React.lazy(() => import('./pages/Transactions/TransactionsEnriched'));
// GL2 pages removed in unified model
const TxLineItemsPage = React.lazy(() => import('./pages/Transactions/TransactionLineItems'))
const TransactionDetailsPage = React.lazy(() => import('./pages/Transactions/TransactionDetails'))
const GeneralLedgerPage = React.lazy(() => import('./pages/Reports/GeneralLedger'))
const ProfitLossPage = React.lazy(() => import('./pages/Reports/ProfitLoss'))
const BalanceSheetPage = React.lazy(() => import('./pages/Reports/BalanceSheet'))
const WorkItemUsagePage = React.lazy(() => import('./pages/Reports/WorkItemUsage'))
const AnalysisItemUsagePage = React.lazy(() => import('./pages/Reports/AnalysisItemUsage'))
const TrialBalanceAllLevelsPage = React.lazy(() => import('./pages/Reports/TrialBalanceAllLevels'))
const AccountExplorerReportPage = React.lazy(() => import('./pages/Reports/AccountExplorer'))
const CustomReportsPage = React.lazy(() => import('./pages/CustomReports'))
const DocumentsPage = React.lazy(() => import('./pages/Documents/Documents'))
const OpeningBalanceImportPage = React.lazy(() => import('./pages/Fiscal/OpeningBalanceImport'))
const FiscalYearDashboardPage = React.lazy(() => import('./pages/Fiscal/FiscalYearDashboard'))
const FiscalPeriodManagerPage = React.lazy(() => import('./pages/Fiscal/FiscalPeriodManager'))
// Enhanced components with Arabic/RTL support
const EnhancedFiscalHubPage = React.lazy(() => import('./pages/Fiscal/EnhancedFiscalHub'))
const EnhancedOpeningBalanceImportPage = React.lazy(() => import('./pages/Fiscal/EnhancedOpeningBalanceImport'))
const EnhancedFiscalPeriodManagerPage = React.lazy(() => import('./pages/Fiscal/EnhancedFiscalPeriodManager'))
const ConstructionDashboardPage = React.lazy(() => import('./pages/Fiscal/ConstructionDashboard'))
const OpeningBalanceApprovalWorkflowPage = React.lazy(() => import('./pages/Fiscal/OpeningBalanceApprovalWorkflow'))
const ValidationRuleManagerPage = React.lazy(() => import('./pages/Fiscal/ValidationRuleManager'))
const BalanceReconciliationDashboardPage = React.lazy(() => import('./pages/Fiscal/BalanceReconciliationDashboard'))
const OpeningBalanceAuditTrailPage = React.lazy(() => import('./pages/Fiscal/OpeningBalanceAuditTrail'))
const ApprovalNotificationCenterPage = React.lazy(() => import('./pages/Fiscal/ApprovalNotificationCenter'))
const PerformanceDashboardPage = React.lazy(() => import('./pages/PerformanceDashboard'))
const TransactionClassificationPage = React.lazy(() => import('./pages/MainData/TransactionClassification'))
const TrialBalanceOriginalPage = React.lazy(() => import('./pages/Reports/TrialBalanceOriginal'))
const TransactionClassificationReportsPage = React.lazy(() => import('./pages/Reports/TransactionClassificationReports'))
const EnhancedFiscalYearDashboardSafePage = React.lazy(() => import('./pages/Fiscal/EnhancedFiscalYearDashboard.safe'))
const InventoryDashboardPage = React.lazy(() => import('./pages/Inventory/InventoryDashboard'))
const InventoryMaterialsPage = React.lazy(() => import('./pages/Inventory/Materials'))
const InventoryLocationsPage = React.lazy(() => import('./pages/Inventory/Locations'))
const InventoryOnHandPage = React.lazy(() => import('./pages/Inventory/OnHand'))
const InventoryMovementsPage = React.lazy(() => import('./pages/Inventory/Movements'))
const InventoryValuationPage = React.lazy(() => import('./pages/Inventory/Valuation'))
const InventoryAgeingPage = React.lazy(() => import('./pages/Inventory/Ageing'))
const InventoryReconciliationPage = React.lazy(() => import('./pages/Inventory/Reconciliation'))
const InventoryReconciliationSessionPage = React.lazy(() => import('./pages/Inventory/ReconciliationSession'))
const InventoryMovementSummaryPage = React.lazy(() => import('./pages/Inventory/MovementSummary'))
const InventoryMovementDetailPage = React.lazy(() => import('./pages/Inventory/MovementDetail'))
const InventoryProjectMovementSummaryPage = React.lazy(() => import('./pages/Inventory/ProjectMovementSummary'))
const InventoryValuationByProjectPage = React.lazy(() => import('./pages/Inventory/ValuationByProject'))
const InventoryReceivePage = React.lazy(() => import('./pages/Inventory/Receive'))
const InventoryIssuePage = React.lazy(() => import('./pages/Inventory/Issue'))
const InventoryTransferPage = React.lazy(() => import('./pages/Inventory/Transfer'))
const InventoryAdjustPage = React.lazy(() => import('./pages/Inventory/Adjust'))
const InventoryReturnsPage = React.lazy(() => import('./pages/Inventory/Returns'))
const InventoryKpiDashboardPage = React.lazy(() => import('./pages/Inventory/KPIDashboard'))
const InventorySettingsPage = React.lazy(() => import('./pages/Inventory/InventorySettings'))
const InventoryDocumentDetailsPage = React.lazy(() => import('./pages/Inventory/DocumentDetails'))
const AccountPrefixMappingPage = React.lazy(() => import('./pages/admin/AccountPrefixMapping'))
const ApprovalsWorkflowsPage = React.lazy(() => import('./pages/Approvals/Workflows'))
const ApprovalsTestWorkflowPage = React.lazy(() => import('./pages/Approvals/TestWorkflow'))
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { ResetPassword } from './components/auth/ResetPassword';
import AuthDebug from './pages/AuthDebug';
import { debugAuthState, forceAuthRefresh, clearAuthState } from './utils/authDebug';
import './utils/corsCheck';
const UserManagementSystem = React.lazy(() => import('./pages/admin/UserManagementSystem'));
const Diagnostics = React.lazy(() => import('./pages/admin/Diagnostics'));
const Profile = React.lazy(() => import('./pages/admin/Profile'));
const ProjectManagement = React.lazy(() => import('./components/Projects/ProjectManagement'));
const ProjectAttachmentsPage = React.lazy(() => import('./pages/Projects/ProjectAttachments'));
const OrgManagementTabs = React.lazy(() => import('./components/Organizations/OrganizationManagementTabs'));
const FontSettings = React.lazy(() => import('./components/Settings/FontSettings'));
const ExportDatabasePage = React.lazy(() => import('./pages/admin/ExportDatabase'));
const ApprovalsInbox = React.lazy(() => import('./pages/Approvals/Inbox'));
import ProtectedRoute from './components/routing/ProtectedRoute';
import PerformanceMonitor from './components/Common/PerformanceMonitor';
import PerformanceDashboard from './components/Common/PerformanceDashboard';

// Placeholder components for other pages
const PlaceholderPage: React.FC<{ title: string }> = React.memo(({ title }) => (
  <div style={{ padding: '2rem' }}>
    <h2>{title}</h2>
    <p>This page is under construction. The navigation and layout are fully functional!</p>
  </div>
));

const UnauthorizedPage: React.FC = React.memo(() => (
  <div style={{ padding: '2rem' }}>
    <h2>Access denied</h2>
    <p>You don't have permission to view this page.</p>
  </div>
));

const App: React.FC = () => {
  useIdleLogout();
  useAuthPerformance(); // Monitor auth performance
  const { language } = useAppStore();

  // Ensure document direction AND ArabicLanguageService state are set on mount and language changes
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    // Keep the ArabicLanguageService in sync so useArabicLanguage() reflects the UI language
    ArabicLanguageService.setLanguage(language === 'ar' ? 'ar' : 'en')
  }, [language]);

  // Initialize auth cleanup on app start
  useEffect(() => {
    initAuthCleanup();
  }, []);

  return (
    <>
      <PerformanceDashboard />
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
        {/* Theme Demo Route */}
        {/* <Route path="/theme-demo" element={<ThemeDemo />} /> */}
        {/* <Route path="/database-test" element={<DatabaseTest />} /> */}
        
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth-debug" element={<AuthDebug />} />
        <Route path="/debug-auth-state" element={
          <div style={{ padding: '2rem' }}>
            <h2>Auth Debug</h2>
            <button onClick={debugAuthState}>Debug Auth State</button>
            <button onClick={forceAuthRefresh} style={{ marginLeft: '1rem' }}>Force Refresh</button>
            <button onClick={clearAuthState} style={{ marginLeft: '1rem' }}>Clear Auth State</button>
            <p>Check browser console for debug output</p>
          </div>
        } />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <PerformanceMonitor componentName="DashboardLayout">
              <DashboardLayout />
            </PerformanceMonitor>
          </ProtectedRoute>
        }>
          <Route index element={
            <React.Suspense fallback={<SkeletonLoader />}>
              <PerformanceMonitor componentName="LandingDecider">
                <LandingDecider />
              </PerformanceMonitor>
            </React.Suspense>
          } />
          <Route path="/test-rtl" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <TestRTL />
            </React.Suspense>
          } />
          <Route path="/test/document-controls" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <DocumentControlsBarTest />
            </React.Suspense>
          } />
          <Route path="/test/document-controls-rtl" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <DocumentControlsBarRTLTest />
            </React.Suspense>
          } />
          
          {/* Main Data */}
          <Route path="/main-data/accounts-tree" element={<React.Suspense fallback={<SkeletonLoader />}><AccountsTreeLazy /></React.Suspense>} />
          <Route path="/main-data/sub-tree" element={
            <ProtectedRoute requiredAction="sub_tree.view">
              <React.Suspense fallback={<div>Loading...</div>}>
                <SubTreePage />
              </React.Suspense>
            </ProtectedRoute>
          } />
          <Route path="/main-data/work-items" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <WorkItemsPage />
            </React.Suspense>
          } />
          <Route path="/main-data/document-categories" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <DocumentCategoriesPage />
            </React.Suspense>
          } />
          <Route path="/main-data/document-templates" element={
            <ProtectedRoute requiredAction="templates.view">
              <React.Suspense fallback={<div>Loading...</div>}>
                <TemplateLibraryPage />
              </React.Suspense>
            </ProtectedRoute>
          } />
          <Route path="/main-data/document-templates/:id" element={
            <ProtectedRoute requiredAction="templates.manage">
              <React.Suspense fallback={<div>Loading...</div>}>
                <TemplateEditorPage />
              </React.Suspense>
            </ProtectedRoute>
          } />
          <Route path="/main-data/document-templates/:id/view" element={
            <ProtectedRoute requiredAction="templates.view">
              <React.Suspense fallback={<div>Loading...</div>}>
                <TemplateViewerPage />
              </React.Suspense>
            </ProtectedRoute>
          } />
          <Route path="/main-data/analysis-work-items" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <AnalysisWorkItemsPage />
            </React.Suspense>
          } />
          <Route path="/main-data/cost-centers" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <CostCentersPage />
            </React.Suspense>
          } />
          <Route path="/main-data/transaction-line-items" element={
            <ProtectedRoute requiredAction="transaction_line_items.read">
              <React.Suspense fallback={<div>Loading...</div>}>
                <TransactionLineItemsCatalogPage />
              </React.Suspense>
            </ProtectedRoute>
          } />
          <Route path="/main-data/organizations" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <OrgManagementTabs />
            </React.Suspense>
          } />
          <Route path="/main-data/projects" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <ProjectManagement />
            </React.Suspense>
          } />
          <Route path="/projects/:id/attachments" element={
            <ProtectedRoute requiredAction="documents.view">
              <React.Suspense fallback={<div>Loading...</div>}>
                <ProjectAttachmentsPage />
              </React.Suspense>
            </ProtectedRoute>
          } />
          <Route path="/main-data/transaction-classification" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <TransactionClassificationPage />
            </React.Suspense>
          } />

          {/* Transactions - Single row entry */}
          <Route path="/transactions/my" element={
            <React.Suspense fallback={<SkeletonLoader />}>
              <ErrorBoundary>
                <TransactionsPage />
              </ErrorBoundary>
            </React.Suspense>
          } />
          <Route path="/transactions/pending" element={
            <ProtectedRoute requiredAction="transactions.review">
              <React.Suspense fallback={<div>Loading...</div>}>
                <TransactionsPage />
              </React.Suspense>
            </ProtectedRoute>
          } />
          <Route path="/transactions/all" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <TransactionsPage />
            </React.Suspense>
          } />
          <Route path="/transactions/my-enriched" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <TransactionsEnrichedPage />
            </React.Suspense>
          } />
          <Route path="/transactions/all-enriched" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <TransactionsEnrichedPage />
            </React.Suspense>
          } />
{/* GL2 routes removed in unified model */}
          <Route path="/transactions/:id" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <TransactionDetailsPage />
            </React.Suspense>
          } />
          <Route path="/transactions/assign-cost-analysis" element={
            <ProtectedRoute requiredAction="transactions.cost_analysis">
              <React.Suspense fallback={<div>Loading...</div>}>
                <AssignCostAnalysisPage />
              </React.Suspense>
            </ProtectedRoute>
          } />

          {/* Standalone Transaction Line Items page */}
          <Route path="/Transactions/TransactionLineItems" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <TxLineItemsPage />
            </React.Suspense>
          } />
          <Route path="/transactions/line-items" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <TxLineItemsPage />
            </React.Suspense>
          } />

          {/* Chart of Accounts (legacy placeholders) */}
          <Route path="/accounts" element={<PlaceholderPage title="Accounts List" />} />
          <Route path="/accounts/add" element={<PlaceholderPage title="Add Account" />} />
            
            {/* Transactions */}
            <Route path="/transactions/journal" element={<PlaceholderPage title="Journal Entries" />} />
            <Route path="/transactions/ledger" element={<PlaceholderPage title="General Ledger" />} />
            <Route path="/transactions/trial-balance" element={<PlaceholderPage title="Trial Balance (legacy)" />} />
            
            {/* Invoicing */}
            <Route path="/invoicing/sales" element={<PlaceholderPage title="Sales Invoices" />} />
            <Route path="/invoicing/purchases" element={<PlaceholderPage title="Purchase Invoices" />} />
            <Route path="/invoicing/quotations" element={<PlaceholderPage title="Quotations" />} />
            
            {/* Customers */}
            <Route path="/customers" element={<PlaceholderPage title="Customers List" />} />
            <Route path="/customers/statements" element={<PlaceholderPage title="Customer Statements" />} />
            
            {/* Suppliers */}
            <Route path="/suppliers" element={<PlaceholderPage title="Suppliers List" />} />
            <Route path="/suppliers/statements" element={<PlaceholderPage title="Supplier Statements" />} />
            
{/* Financial Reports */}
            <Route path="/reports/trial-balance" element={
              <ProtectedRoute>
                <React.Suspense fallback={<>Loading...</>}>
                  <TrialBalanceOriginalPage />
                </React.Suspense>
              </ProtectedRoute>
            } />
            <Route path="/reports/trial-balance-all-levels" element={
              <ProtectedRoute>
                <React.Suspense fallback={<div>Loading...</div>}>
                  <TrialBalanceAllLevelsPage />
                </React.Suspense>
              </ProtectedRoute>
            } />
            <Route path="/reports/general-ledger" element={
              <ProtectedRoute>
                <React.Suspense fallback={<div>Loading...</div>}>
                  <GeneralLedgerPage />
                </React.Suspense>
              </ProtectedRoute>
            } />
            <Route path="/reports/account-explorer" element={
              <ProtectedRoute>
                <React.Suspense fallback={<div>Loading...</div>}>
                  <AccountExplorerReportPage />
                </React.Suspense>
              </ProtectedRoute>
            } />
            <Route path="/reports/profit-loss" element={
              <ProtectedRoute>
                <React.Suspense fallback={<div>Loading...</div>}>
                  <ProfitLossPage />
                </React.Suspense>
              </ProtectedRoute>
            } />
            <Route path="/reports/balance-sheet" element={
              <ProtectedRoute>
                <React.Suspense fallback={<div>Loading...</div>}>
                  <BalanceSheetPage />
                </React.Suspense>
              </ProtectedRoute>
            } />
            <Route path="/reports/main-data/transaction-classification" element={
              <ProtectedRoute>
                <React.Suspense fallback={<div>Loading...</div>}>
                  <TransactionClassificationReportsPage />
                </React.Suspense>
              </ProtectedRoute>
            } />
            <Route path="/reports/main-data/work-item-usage" element={
              <ProtectedRoute>
                <React.Suspense fallback={<div>Loading...</div>}>
                  <WorkItemUsagePage />
                </React.Suspense>
              </ProtectedRoute>
            } />
            <Route path="/reports/main-data/analysis-item-usage" element={
              <ProtectedRoute>
                <React.Suspense fallback={<div>Loading...</div>}>
                  <AnalysisItemUsagePage />
                </React.Suspense>
              </ProtectedRoute>
            } />
            <Route path="/reports/cash-flow" element={<PlaceholderPage title="Cash Flow Report" />} />
            <Route path="/reports/custom" element={
                <React.Suspense fallback={<div>Loading...</div>}>
                  <CustomReportsPage />
                </React.Suspense>
            } />
            
          {/* Fiscal Management */}
          <Route path="/fiscal/opening-balance-import" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <OpeningBalanceImportPage />
            </React.Suspense>
          } />
          <Route path="/fiscal/dashboard" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <FiscalYearDashboardPage />
            </React.Suspense>
          } />
          <Route path="/fiscal/periods" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <FiscalPeriodManagerPage />
            </React.Suspense>
          } />
          {/* Enhanced Fiscal Management with Arabic/RTL Support */}
          <Route path="/fiscal/enhanced" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <EnhancedFiscalHubPage />
            </React.Suspense>
          } />
          <Route path="/fiscal/enhanced/opening-balance-import" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <EnhancedOpeningBalanceImportPage />
            </React.Suspense>
          } />
          <Route path="/fiscal/enhanced/dashboard" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <EnhancedFiscalYearDashboardSafePage />
            </React.Suspense>
          } />
          <Route path="/fiscal/enhanced/periods" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <EnhancedFiscalPeriodManagerPage />
            </React.Suspense>
          } />
          <Route path="/fiscal/construction" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <ConstructionDashboardPage />
            </React.Suspense>
          } />
          <Route path="/fiscal/approval-workflow" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <OpeningBalanceApprovalWorkflowPage />
            </React.Suspense>
          } />
          <Route path="/fiscal/validation-rules" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <ValidationRuleManagerPage />
            </React.Suspense>
          } />
          <Route path="/fiscal/reconciliation" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <BalanceReconciliationDashboardPage />
            </React.Suspense>
          } />
          <Route path="/fiscal/audit-trail" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <OpeningBalanceAuditTrailPage />
            </React.Suspense>
          } />
          <Route path="/fiscal/approvals" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <ApprovalNotificationCenterPage />
            </React.Suspense>
          } />
          <Route path="/performance" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <PerformanceDashboardPage />
            </React.Suspense>
          } />

{/* Inventory */}
<Route path="/inventory" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryDashboardPage />
            </React.Suspense>
          } />
<Route path="/inventory/materials" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryMaterialsPage />
            </React.Suspense>
          } />
<Route path="/inventory/locations" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryLocationsPage />
            </React.Suspense>
          } />
<Route path="/inventory/on-hand" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryOnHandPage />
            </React.Suspense>
          } />
<Route path="/inventory/movements" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryMovementsPage />
            </React.Suspense>
          } />
<Route path="/inventory/valuation" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryValuationPage />
            </React.Suspense>
          } />
<Route path="/inventory/ageing" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryAgeingPage />
            </React.Suspense>
          } />
<Route path="/inventory/reconciliation" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryReconciliationPage />
            </React.Suspense>
          } />
<Route path="/inventory/reconciliation/:sessionId" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryReconciliationSessionPage />
            </React.Suspense>
          } />
<Route path="/inventory/movement-summary" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryMovementSummaryPage />
            </React.Suspense>
          } />
<Route path="/inventory/movement-detail" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryMovementDetailPage />
            </React.Suspense>
          } />
<Route path="/inventory/project-movement-summary" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryProjectMovementSummaryPage />
            </React.Suspense>
          } />
<Route path="/inventory/valuation-by-project" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryValuationByProjectPage />
            </React.Suspense>
          } />
<Route path="/inventory/receive" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryReceivePage />
            </React.Suspense>
          } />
<Route path="/inventory/issue" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryIssuePage />
            </React.Suspense>
          } />
<Route path="/inventory/transfer" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryTransferPage />
            </React.Suspense>
          } />
<Route path="/inventory/adjust" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryAdjustPage />
            </React.Suspense>
          } />
<Route path="/inventory/returns" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryReturnsPage />
            </React.Suspense>
          } />
<Route path="/inventory/kpis" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <InventoryKpiDashboardPage />
            </React.Suspense>
          } />
          <Route path="/inventory/settings" element={
            <ProtectedRoute requiredAction="inventory.manage">
              <React.Suspense fallback={<div>Loading...</div>}>
                <InventorySettingsPage />
              </React.Suspense>
            </ProtectedRoute>
          } />
<Route path="/inventory/documents/:id" element={
            <ProtectedRoute requiredAction="inventory.view">
              <React.Suspense fallback={<div>Loading...</div>}>
                <InventoryDocumentDetailsPage />
              </React.Suspense>
            </ProtectedRoute>
          } />
          <Route path="/inventory/reports" element={<PlaceholderPage title="Stock Reports" />} />
            
            {/* Settings */}
            <Route path="/settings/company" element={<Navigate to="/settings/organization-management" replace />} />
            <Route path="/settings/diagnostics" element={
              <React.Suspense fallback={<div>Loading...</div>}>
                <Diagnostics />
              </React.Suspense>
            } />
            <Route path="/settings/account-prefix-mapping" element={
              <React.Suspense fallback={<div>Loading...</div>}>
                <AccountPrefixMappingPage />
              </React.Suspense>
            } />
            {/* Unified User Management System */}
            <Route path="/settings/user-management" element={
              <ProtectedRoute requiredAction="users.view">
                <React.Suspense fallback={<div>Loading...</div>}>
                  <UserManagementSystem />
                </React.Suspense>
              </ProtectedRoute>
            } />
            {/* Legacy routes removed - consolidated into /settings/user-management */}
            {/* Temporary redirects for legacy bookmarks - remove in next major release */}
            <Route path="/settings/users" element={<Navigate to="/settings/user-management" replace />} />
            <Route path="/settings/roles" element={<Navigate to="/settings/user-management" replace />} />
            <Route path="/settings/permissions" element={<Navigate to="/settings/user-management" replace />} />
            <Route path="/settings/organization-management" element={
              <React.Suspense fallback={<div>Loading...</div>}>
                <OrgManagementTabs />
              </React.Suspense>
            } />
            <Route path="/settings/org-members" element={<Navigate to="/settings/organization-management" replace />} />
            <Route path="/settings/profile" element={
              <React.Suspense fallback={<div>Loading...</div>}>
                <Profile />
              </React.Suspense>
            } />
            <Route path="/settings/font-preferences" element={
              <React.Suspense fallback={<div>Loading...</div>}>
                <FontSettings />
              </React.Suspense>
            } />
            <Route path="/settings/export-database" element={
              <ProtectedRoute requiredAction="data.export">
                <React.Suspense fallback={<div>Loading...</div>}>
                  <ExportDatabasePage />
                </React.Suspense>
              </ProtectedRoute>
            } />
            <Route path="/settings/preferences" element={<PlaceholderPage title="Preferences" />} />
            <Route path="/settings/backup" element={<PlaceholderPage title="Backup & Restore" />} />
            
            {/* Documents */}
            <Route path="/documents" element={
              <ProtectedRoute requiredAction="documents.view">
                <React.Suspense fallback={<div>Loading...</div>}>
                  <DocumentsPage />
                </React.Suspense>
              </ProtectedRoute>
            } />

            {/* Approvals */}
            <Route path="/approvals/documents" element={
              <React.Suspense fallback={<div>Loading...</div>}>
                <DocumentApprovalsPage />
              </React.Suspense>
            } />
            <Route path="/approvals/inbox" element={
              <ProtectedRoute requiredAction="transactions.review">
                <React.Suspense fallback={<div>Loading...</div>}>
                  <ApprovalsInbox />
                </React.Suspense>
              </ProtectedRoute>
            } />
            <Route path="/approvals/workflows" element={
              <ProtectedRoute requiredAction="transactions.manage">
                <React.Suspense fallback={<div>Loading...</div>}>
                  <ApprovalsWorkflowsPage />
                </React.Suspense>
              </ProtectedRoute>
            } />
            <Route path="/approvals/test" element={
              <ProtectedRoute requiredAction="transactions.manage">
                <React.Suspense fallback={<div>Loading...</div>}>
                  <ApprovalsTestWorkflowPage />
                </React.Suspense>
              </ProtectedRoute>
            } />

            {/* Export Test Page */}
            <Route path="/export-test" element={
              <React.Suspense fallback={<div>Loading...</div>}>
                <ExportTestPage />
              </React.Suspense>
            } />
          </Route>
        </Routes>
      </Router>
    </>
  );
};

export default App;
