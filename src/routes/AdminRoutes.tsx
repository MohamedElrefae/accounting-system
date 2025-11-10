import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/routing/ProtectedRoute';
import { OptimizedSuspense } from '../components/Common/PerformanceOptimizer';

// Admin routes - rarely used, load on demand
const UserManagementSystem = React.lazy(() => import('../pages/admin/UserManagementSystem'));
const Diagnostics = React.lazy(() => import('../pages/admin/Diagnostics'));
const Profile = React.lazy(() => import('../pages/admin/Profile'));
const ExportDatabasePage = React.lazy(() => import('../pages/admin/ExportDatabase'));
const AccountPrefixMappingPage = React.lazy(() => import('../pages/admin/AccountPrefixMapping'));
const PerformanceDashboardPage = React.lazy(() => import('../pages/PerformanceDashboard'));

// Approval routes
const ApprovalsInbox = React.lazy(() => import('../pages/Approvals/Inbox'));
const DocumentApprovalsPage = React.lazy(() => import('../pages/Approvals/DocumentApprovals'));
const ApprovalsWorkflowsPage = React.lazy(() => import('../pages/Approvals/Workflows'));
const ApprovalsTestWorkflowPage = React.lazy(() => import('../pages/Approvals/TestWorkflow'));

// Settings
const FontSettings = React.lazy(() => import('../components/Settings/FontSettings'));

const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      {/* User Management */}
      <Route path="/admin/users" element={
        <ProtectedRoute requiredAction="users.manage">
          <OptimizedSuspense>
            <UserManagementSystem />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      {/* System Diagnostics */}
      <Route path="/admin/diagnostics" element={
        <ProtectedRoute requiredAction="users.manage">
          <OptimizedSuspense>
            <Diagnostics />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      {/* Profile Management */}
      <Route path="/admin/profile" element={
        <OptimizedSuspense>
          <Profile />
        </OptimizedSuspense>
      } />
      
      {/* Database Export */}
      <Route path="/admin/export-database" element={
        <ProtectedRoute requiredAction="data.export">
          <OptimizedSuspense>
            <ExportDatabasePage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      {/* Account Prefix Mapping */}
      <Route path="/admin/account-prefix-mapping" element={
        <ProtectedRoute requiredAction="accounts.manage">
          <OptimizedSuspense>
            <AccountPrefixMappingPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      {/* Performance Dashboard */}
      <Route path="/performance" element={
        <OptimizedSuspense>
          <PerformanceDashboardPage />
        </OptimizedSuspense>
      } />
      
      {/* Approvals */}
      <Route path="/approvals/inbox" element={
        <ProtectedRoute requiredAction="approvals.review">
          <OptimizedSuspense>
            <ApprovalsInbox />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      <Route path="/approvals/documents" element={
        <ProtectedRoute requiredAction="approvals.review">
          <OptimizedSuspense>
            <DocumentApprovalsPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      <Route path="/approvals/workflows" element={
        <ProtectedRoute requiredAction="approvals.manage">
          <OptimizedSuspense>
            <ApprovalsWorkflowsPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      <Route path="/approvals/test-workflow" element={
        <ProtectedRoute requiredAction="approvals.manage">
          <OptimizedSuspense>
            <ApprovalsTestWorkflowPage />
          </OptimizedSuspense>
        </ProtectedRoute>
      } />
      
      {/* Settings */}
      <Route path="/settings/fonts" element={
        <OptimizedSuspense>
          <FontSettings />
        </OptimizedSuspense>
      } />
    </Routes>
  );
};

export default AdminRoutes;