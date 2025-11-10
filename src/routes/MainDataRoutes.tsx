import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/routing/ProtectedRoute';
import { OptimizedSuspense } from '../components/Common/PerformanceOptimizer';

// Main data routes grouped together
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

// Document Templates
const TemplateLibraryPage = React.lazy(() => import('../pages/MainData/DocumentTemplates/TemplateLibrary'));
const TemplateEditorPage = React.lazy(() => import('../pages/MainData/DocumentTemplates/TemplateEditor'));
const TemplateViewerPage = React.lazy(() => import('../pages/MainData/DocumentTemplates/TemplateViewer'));

const MainDataRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Accounts Tree */}
      <Route path="/main-data/accounts-tree" element={
        <OptimizedSuspense>
          <AccountsTreeLazy />
        </OptimizedSuspense>
      } />
      
      {/* Sub Tree */}
      <Route path="/main-data/sub-tree" element={
        <ProtectedRoute requiredAction="sub_tree.view">
          <OptimizedSuspense>
            <SubTreePage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      {/* Work Items */}
      <Route path="/main-data/work-items" element={
        <OptimizedSuspense>
          <WorkItemsPage />
        </OptimizedSuspense>
      } />
      
      {/* Document Categories */}
      <Route path="/main-data/document-categories" element={
        <OptimizedSuspense>
          <DocumentCategoriesPage />
        </OptimizedSuspense>
      } />
      
      {/* Document Templates */}
      <Route path="/main-data/document-templates" element={
        <ProtectedRoute requiredAction="templates.view">
          <OptimizedSuspense>
            <TemplateLibraryPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      <Route path="/main-data/document-templates/:id" element={
        <ProtectedRoute requiredAction="templates.manage">
          <OptimizedSuspense>
            <TemplateEditorPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      <Route path="/main-data/document-templates/:id/view" element={
        <ProtectedRoute requiredAction="templates.view">
          <OptimizedSuspense>
            <TemplateViewerPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      {/* Analysis Work Items */}
      <Route path="/main-data/analysis-work-items" element={
        <OptimizedSuspense>
          <AnalysisWorkItemsPage />
        </OptimizedSuspense>
      } />
      
      {/* Cost Centers */}
      <Route path="/main-data/cost-centers" element={
        <OptimizedSuspense>
          <CostCentersPage />
        </OptimizedSuspense>
      } />
      
      {/* Transaction Line Items */}
      <Route path="/main-data/transaction-line-items" element={
        <ProtectedRoute requiredAction="transaction_line_items.read">
          <OptimizedSuspense>
            <TransactionLineItemsCatalogPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      {/* Organizations */}
      <Route path="/main-data/organizations" element={
        <OptimizedSuspense>
          <OrgManagementTabs />
        </OptimizedSuspense>
      } />
      
      {/* Projects */}
      <Route path="/main-data/projects" element={
        <OptimizedSuspense>
          <ProjectManagement />
        </OptimizedSuspense>
      } />
      
      {/* Transaction Classification */}
      <Route path="/main-data/transaction-classification" element={
        <OptimizedSuspense>
          <TransactionClassificationPage />
        </OptimizedSuspense>
      } />
    </Routes>
  );
};

export default MainDataRoutes;