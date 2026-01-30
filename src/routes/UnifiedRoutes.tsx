import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { OptimizedSuspense } from '../components/Common/PerformanceOptimizer';
import OptimizedProtectedRoute from '../components/routing/OptimizedProtectedRoute';
import { TransactionsDataProvider } from '../contexts/TransactionsDataContext';
import TransactionsErrorBoundary from '../components/TransactionsErrorBoundary';
import ErrorBoundary from '../components/Common/ErrorBoundary';
import InventoryLoadingFallback from '../components/Inventory/InventoryLoadingFallback';
import InventoryErrorFallback from '../components/Inventory/InventoryErrorFallback';
import { useAuditContext } from '../hooks/useAuditContext';

// ============================================================================
// LAZY IMPORTS (Consolidated from all route files)
// ============================================================================

// Core & Dashboard
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const Welcome = React.lazy(() => import('../pages/Welcome'));
const PerformanceDashboardPage = React.lazy(() => import('../pages/PerformanceDashboard'));

// Main Data
const AccountsTreeLazy = React.lazy(() => import('../pages/MainData/AccountsTree'));
const DocumentCategoriesPage = React.lazy(() => import('../pages/MainData/DocumentCategories'));
const SubTreePage = React.lazy(() => import('../pages/MainData/SubTree'));
const WorkItemsPage = React.lazy(() => import('../pages/MainData/WorkItems'));
const CostCentersPage = React.lazy(() => import('../pages/MainData/CostCenters'));
const TransactionLineItemsCatalogPage = React.lazy(() => import('../pages/MainData/TransactionLineItems'));
const AnalysisWorkItemsPage = React.lazy(() => import('../pages/MainData/AnalysisWorkItems'));
const TransactionClassificationPage = React.lazy(() => import('../pages/MainData/TransactionClassification'));
const OrgManagementTabs = React.lazy(() => import('../components/Organizations/OrganizationManagementTabs'));
const ProjectManagement = React.lazy(() => import('../components/Projects/ProjectManagement'));
const TemplateLibraryPage = React.lazy(() => import('../pages/MainData/DocumentTemplates/TemplateLibrary'));
const TemplateEditorPage = React.lazy(() => import('../pages/MainData/DocumentTemplates/TemplateEditor'));
const TemplateViewerPage = React.lazy(() => import('../pages/MainData/DocumentTemplates/TemplateViewer'));

// Transactions
const TransactionsPage = React.lazy(() => import('../pages/Transactions/Transactions'));
const TransactionsEnrichedPage = React.lazy(() => import('../pages/Transactions/TransactionsEnriched'));
const MyLinesEnrichedPage = React.lazy(() => import('../pages/Transactions/MyLinesEnriched'));
const AllLinesEnrichedPage = React.lazy(() => import('../pages/Transactions/AllLinesEnriched'));
const TxLineItemsPage = React.lazy(() => import('../pages/Transactions/TransactionLineItems'));
const TransactionDetailsPage = React.lazy(() => import('../pages/Transactions/TransactionDetails'));
const AssignCostAnalysisPage = React.lazy(() => import('../pages/Transactions/AssignCostAnalysis'));

// Reports
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
const TransactionLinesReportPage = React.lazy(() => import('../pages/Reports/TransactionLinesReport'));

// Inventory
const InventoryModule = React.lazy(() => import('../pages/Inventory/InventoryModule'));

// Fiscal
const FiscalYearDashboardPage = React.lazy(() => import('../pages/Fiscal/FiscalYearDashboard'));
const FiscalPeriodManagerPage = React.lazy(() => import('../pages/Fiscal/FiscalPeriodManagerRefactored'));
const OpeningBalanceImportPage = React.lazy(() => import('../pages/Fiscal/OpeningBalanceImportSimple'));

// Admin & Settings
const UserManagementSystem = React.lazy(() => import('../pages/admin/UserManagementSystem'));
const Diagnostics = React.lazy(() => import('../pages/admin/Diagnostics'));
const Profile = React.lazy(() => import('../pages/admin/Profile'));
const ExportDatabasePage = React.lazy(() => import('../pages/admin/ExportDatabase'));
const AccountPrefixMappingPage = React.lazy(() => import('../pages/admin/AccountPrefixMapping'));
const FontSettings = React.lazy(() => import('../components/Settings/FontSettings'));
const OnlineUsers = React.lazy(() => import('../pages/admin/OnlineUsers'));
const AuditLogPage = React.lazy(() => import('../pages/admin/EnterpriseAudit'));
const AuditManagement = React.lazy(() => import('../pages/admin/AuditManagement'));
const OrganizationManagement = React.lazy(() => import('../components/Organizations/OrganizationManagement'));

// Approvals
const ApprovalsInbox = React.lazy(() => import('../pages/Approvals/Inbox'));
const DocumentApprovalsPage = React.lazy(() => import('../pages/Approvals/DocumentApprovals'));
const ApprovalsWorkflowsPage = React.lazy(() => import('../pages/Approvals/Workflows'));

// Project Attachments
const ProjectAttachmentsPage = React.lazy(() => import('../pages/Projects/ProjectAttachments'));


/**
 * UNIFIED ROUTING CONFIGURATION
 * 
 * Replaces scattered route files (AdminRoutes, MainDataRoutes, etc.)
 * Provides a single source of truth for all authenticated application routes.
 */
const UnifiedRoutes: React.FC = () => {
    const location = useLocation();

    // Hook for audit logging context (optional, but good practice)
    useAuditContext({ pageName: 'Application', moduleName: 'UnifiedRouter' });

    return (
        <Routes>
            {/* ============================================================ */}
            {/* CORE DASHBOARD */}
            {/* ============================================================ */}
            <Route index element={
                <OptimizedSuspense>
                    <Dashboard />
                </OptimizedSuspense>
            } />
            <Route path="dashboard" element={
                <OptimizedSuspense>
                    <Dashboard />
                </OptimizedSuspense>
            } />
            <Route path="welcome" element={
                <OptimizedSuspense>
                    <Welcome />
                </OptimizedSuspense>
            } />
            <Route path="performance" element={
                <OptimizedSuspense>
                    <PerformanceDashboardPage />
                </OptimizedSuspense>
            } />

            {/* ============================================================ */}
            {/* MAIN DATA SECTION */}
            {/* ============================================================ */}
            <Route path="main-data">
                <Route path="accounts-tree" element={
                    <OptimizedSuspense>
                        <AccountsTreeLazy />
                    </OptimizedSuspense>
                } />
                <Route path="sub-tree" element={
                    <OptimizedProtectedRoute requiredPermission="sub_tree.view">
                        <OptimizedSuspense>
                            <SubTreePage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="work-items" element={
                    <OptimizedSuspense>
                        <WorkItemsPage />
                    </OptimizedSuspense>
                } />
                <Route path="document-categories" element={
                    <OptimizedSuspense>
                        <DocumentCategoriesPage />
                    </OptimizedSuspense>
                } />
                {/* Templates */}
                <Route path="document-templates" element={
                    <OptimizedProtectedRoute requiredPermission="templates.view">
                        <OptimizedSuspense>
                            <TemplateLibraryPage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="document-templates/:id" element={
                    <OptimizedProtectedRoute requiredPermission="templates.manage">
                        <OptimizedSuspense>
                            <TemplateEditorPage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="document-templates/:id/view" element={
                    <OptimizedProtectedRoute requiredPermission="templates.view">
                        <OptimizedSuspense>
                            <TemplateViewerPage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />

                <Route path="analysis-work-items" element={
                    <OptimizedProtectedRoute requiredPermission="work_items.view">
                        <OptimizedSuspense>
                            <AnalysisWorkItemsPage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="cost-centers" element={
                    <OptimizedProtectedRoute requiredPermission="cost_centers.read">
                        <OptimizedSuspense>
                            <CostCentersPage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="transaction-line-items" element={
                    <OptimizedProtectedRoute requiredPermission="transaction_line_items.read">
                        <OptimizedSuspense>
                            <TransactionLineItemsCatalogPage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="organizations" element={
                    <OptimizedSuspense>
                        <OrgManagementTabs />
                    </OptimizedSuspense>
                } />
                <Route path="projects" element={
                    <OptimizedSuspense>
                        <ProjectManagement />
                    </OptimizedSuspense>
                } />
                <Route path="transaction-classification" element={
                    <OptimizedSuspense>
                        <TransactionClassificationPage />
                    </OptimizedSuspense>
                } />
            </Route>

            {/* ============================================================ */}
            {/* TRANSACTION SECTION */}
            {/* ============================================================ */}
            <Route path="transactions" element={
                <TransactionsDataProvider>
                    <TransactionsErrorBoundary>
                        <OptimizedSuspense>
                            <TransactionsPage />
                            {/* This is a placeholder since TransactionsRoutes used sub-routes. 
                                     We need to handle the structure properly. 
                                     TransactionsPage acts as a layout? No, it's a page.
                                     Since we are flattening, we wrap children. */}
                            <Navigate to="my" /> {/* Redirect /transactions to /transactions/my */}
                        </OptimizedSuspense>
                    </TransactionsErrorBoundary>
                </TransactionsDataProvider>
            }>
                {/* Note: React Router doesn't render element if children match unless <Outlet> is there. 
                 But TransactionsPage is likely a full page.
                 We should not wrap with element if we want sub-routes to render independent pages.
                 Let's fix the structure. 
             */}
            </Route>

            {/* Correct Transaction Structure */}
            <Route path="transactions/*" element={
                <TransactionsDataProvider>
                    <TransactionsErrorBoundary>
                        <Routes>
                            {/* My Transactions */}
                            <Route path="my" element={
                                <OptimizedSuspense>
                                    <TransactionsPage />
                                </OptimizedSuspense>
                            } />

                            <Route path="pending" element={
                                <OptimizedProtectedRoute requiredPermission="transactions.review">
                                    <OptimizedSuspense>
                                        <TransactionsPage />
                                    </OptimizedSuspense>
                                </OptimizedProtectedRoute>
                            } />

                            <Route path="all" element={
                                <OptimizedSuspense>
                                    <TransactionsPage />
                                </OptimizedSuspense>
                            } />

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

                            <Route path="my-lines" element={
                                <OptimizedSuspense>
                                    <MyLinesEnrichedPage />
                                </OptimizedSuspense>
                            } />

                            <Route path="all-lines" element={
                                <OptimizedProtectedRoute requiredPermission="transactions.read.all">
                                    <OptimizedSuspense>
                                        <AllLinesEnrichedPage />
                                    </OptimizedSuspense>
                                </OptimizedProtectedRoute>
                            } />

                            <Route path=":id" element={
                                <OptimizedSuspense>
                                    <TransactionDetailsPage />
                                </OptimizedSuspense>
                            } />

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

                            <Route path="assign-cost-analysis" element={
                                <OptimizedProtectedRoute requiredPermission="transactions.cost_analysis">
                                    <OptimizedSuspense>
                                        <AssignCostAnalysisPage />
                                    </OptimizedSuspense>
                                </OptimizedProtectedRoute>
                            } />
                        </Routes>
                    </TransactionsErrorBoundary>
                </TransactionsDataProvider>
            } />

            {/* ============================================================ */}
            {/* REPORTS SECTION */}
            {/* ============================================================ */}
            <Route path="reports">
                <Route path="trial-balance" element={
                    <OptimizedProtectedRoute>
                        <OptimizedSuspense>
                            <TrialBalanceOriginalPage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="trial-balance-all-levels" element={
                    <OptimizedProtectedRoute>
                        <OptimizedSuspense>
                            <TrialBalanceAllLevelsPage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="general-ledger" element={
                    <OptimizedProtectedRoute>
                        <OptimizedSuspense>
                            <GeneralLedgerPage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="running-balance" element={
                    <OptimizedProtectedRoute>
                        <TransactionsDataProvider>
                            <OptimizedSuspense>
                                <RunningBalanceEnrichedPage />
                            </OptimizedSuspense>
                        </TransactionsDataProvider>
                    </OptimizedProtectedRoute>
                } />
                <Route path="account-explorer" element={
                    <OptimizedProtectedRoute>
                        <OptimizedSuspense>
                            <AccountExplorerReportPage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="profit-loss" element={
                    <OptimizedProtectedRoute>
                        <OptimizedSuspense>
                            <ProfitLossPage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="balance-sheet" element={
                    <OptimizedProtectedRoute>
                        <OptimizedSuspense>
                            <BalanceSheetPage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="main-data/work-item-usage" element={
                    <OptimizedProtectedRoute>
                        <OptimizedSuspense>
                            <WorkItemUsagePage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="main-data/analysis-item-usage" element={
                    <OptimizedProtectedRoute>
                        <OptimizedSuspense>
                            <AnalysisItemUsagePage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="main-data/transaction-classification" element={
                    <OptimizedProtectedRoute>
                        <OptimizedSuspense>
                            <TransactionClassificationReportsPage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="transaction-lines-report" element={
                    <OptimizedProtectedRoute>
                        <TransactionsDataProvider>
                            <OptimizedSuspense>
                                <TransactionLinesReportPage />
                            </OptimizedSuspense>
                        </TransactionsDataProvider>
                    </OptimizedProtectedRoute>
                } />
                <Route path="custom" element={
                    <OptimizedSuspense>
                        <CustomReportsPage />
                    </OptimizedSuspense>
                } />
            </Route>

            {/* ============================================================ */}
            {/* INVENTORY SECTION */}
            {/* ============================================================ */}
            <Route path="inventory/*" element={
                <ErrorBoundary fallback={<InventoryErrorFallback />}>
                    <OptimizedSuspense fallback={<InventoryLoadingFallback />}>
                        <InventoryModule />
                    </OptimizedSuspense>
                </ErrorBoundary>
            } />

            {/* ============================================================ */}
            {/* FISCAL SECTION */}
            {/* ============================================================ */}
            <Route path="fiscal/*" element={
                <TransactionsDataProvider>
                    <Routes>
                        <Route path="dashboard" element={
                            <OptimizedSuspense>
                                <FiscalYearDashboardPage />
                            </OptimizedSuspense>
                        } />
                        <Route path="periods" element={
                            <OptimizedSuspense>
                                <FiscalPeriodManagerPage />
                            </OptimizedSuspense>
                        } />
                        <Route path="opening-balance" element={
                            <OptimizedSuspense>
                                <OpeningBalanceImportPage />
                            </OptimizedSuspense>
                        } />
                        <Route index element={
                            <OptimizedSuspense>
                                <FiscalYearDashboardPage />
                            </OptimizedSuspense>
                        } />
                    </Routes>
                </TransactionsDataProvider>
            } />

            {/* ============================================================ */}
            {/* ADMIN & SETTINGS SECTION */}
            {/* ============================================================ */}
            <Route path="admin">
                <Route path="users" element={
                    <OptimizedProtectedRoute requiredPermission="users.manage">
                        <OptimizedSuspense>
                            <UserManagementSystem />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="diagnostics" element={
                    <OptimizedProtectedRoute requiredPermission="users.manage">
                        <OptimizedSuspense>
                            <Diagnostics />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="profile" element={
                    <OptimizedSuspense>
                        <Profile />
                    </OptimizedSuspense>
                } />
                <Route path="export-database" element={
                    <OptimizedProtectedRoute requiredPermission="data.export">
                        <OptimizedSuspense>
                            <ExportDatabasePage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="account-prefix-mapping" element={
                    <OptimizedProtectedRoute requiredPermission="accounts.manage">
                        <OptimizedSuspense>
                            <AccountPrefixMappingPage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="audit" element={
                    <OptimizedSuspense>
                        <AuditManagement />
                    </OptimizedSuspense>
                } />
            </Route>

            <Route path="settings">
                <Route path="user-management" element={
                    <OptimizedProtectedRoute requiredPermission="users.view">
                        <OptimizedSuspense>
                            <UserManagementSystem />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="online-users" element={
                    <OptimizedProtectedRoute requiredPermission="presence.view.team">
                        <OptimizedSuspense>
                            <OnlineUsers />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="organization-management" element={
                    <OptimizedSuspense>
                        <OrganizationManagement />
                    </OptimizedSuspense>
                } />
                <Route path="account-prefix-mapping" element={
                    <OptimizedProtectedRoute requiredPermission="accounts.manage">
                        <OptimizedSuspense>
                            <AccountPrefixMappingPage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="font-preferences" element={
                    <OptimizedSuspense>
                        <FontSettings />
                    </OptimizedSuspense>
                } />
                <Route path="export-database" element={
                    <OptimizedProtectedRoute requiredPermission="data.export">
                        <OptimizedSuspense>
                            <ExportDatabasePage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="diagnostics" element={
                    <OptimizedProtectedRoute requiredPermission="users.manage">
                        <OptimizedSuspense>
                            <Diagnostics />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="audit" element={
                    <OptimizedProtectedRoute requiredPermission="settings.audit">
                        <OptimizedSuspense>
                            <AuditLogPage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="profile" element={
                    <OptimizedSuspense>
                        <Profile />
                    </OptimizedSuspense>
                } />
            </Route>

            {/* ============================================================ */}
            {/* APPROVALS SECTION */}
            {/* ============================================================ */}
            <Route path="approvals">
                <Route path="inbox" element={
                    <OptimizedProtectedRoute requiredPermission="approvals.review">
                        <OptimizedSuspense>
                            <ApprovalsInbox />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="documents" element={
                    <OptimizedProtectedRoute requiredPermission="approvals.review">
                        <OptimizedSuspense>
                            <DocumentApprovalsPage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
                <Route path="workflows" element={
                    <OptimizedProtectedRoute requiredPermission="approvals.manage">
                        <OptimizedSuspense>
                            <ApprovalsWorkflowsPage />
                        </OptimizedSuspense>
                    </OptimizedProtectedRoute>
                } />
            </Route>

            {/* Project Attachments */}
            <Route path="projects/:id/attachments" element={
                <OptimizedProtectedRoute requiredPermission="documents.view">
                    <OptimizedSuspense>
                        <ProjectAttachmentsPage />
                    </OptimizedSuspense>
                </OptimizedProtectedRoute>
            } />

        </Routes>
    );
};

export default UnifiedRoutes;
