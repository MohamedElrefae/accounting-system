import React from 'react';
import { Routes, Route } from 'react-router-dom';
import OptimizedProtectedRoute from '../components/routing/OptimizedProtectedRoute';
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

// Settings
const FontSettings = React.lazy(() => import('../components/Settings/FontSettings'));

const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      {/* User Management */}
      <Route path="/admin/users" element={
        <OptimizedProtectedRoute requiredAction="users.manage">
          <OptimizedSuspense>
            <UserManagementSystem />
          </OptimizedSuspense>
        </OptimizedProtectedRoute>
      } />

      {/* System Diagnostics */}
      <Route path="/admin/diagnostics" element={
        <OptimizedProtectedRoute requiredAction="users.manage">
          <OptimizedSuspense>
            <Diagnostics />
          </OptimizedSuspense>
        </OptimizedProtectedRoute>
      } />

      {/* Profile Management */}
      <Route path="/admin/profile" element={
        <OptimizedSuspense>
          <Profile />
        </OptimizedSuspense>
      } />

      {/* Database Export */}
      <Route path="/admin/export-database" element={
        <OptimizedProtectedRoute requiredAction="data.export">
          <OptimizedSuspense>
            <ExportDatabasePage />
          </OptimizedSuspense>
        </OptimizedProtectedRoute>
      } />

      {/* Account Prefix Mapping */}
      <Route path="/admin/account-prefix-mapping" element={
        <OptimizedProtectedRoute requiredAction="accounts.manage">
          <OptimizedSuspense>
            <AccountPrefixMappingPage />
          </OptimizedSuspense>
        </OptimizedProtectedRoute>
      } />

      {/* Performance Dashboard */}
      <Route path="/performance" element={
        <OptimizedSuspense>
          <PerformanceDashboardPage />
        </OptimizedSuspense>
      } />

      {/* Approvals - Using relative paths since mounted at /approvals/* */}
      <Route path="inbox" element={
        <OptimizedProtectedRoute requiredAction="approvals.review">
          <OptimizedSuspense>
            <ApprovalsInbox />
          </OptimizedSuspense>
        </OptimizedProtectedRoute>
      } />

      <Route path="documents" element={
        <OptimizedProtectedRoute requiredAction="approvals.review">
          <OptimizedSuspense>
            <DocumentApprovalsPage />
          </OptimizedSuspense>
        </OptimizedProtectedRoute>
      } />

      <Route path="workflows" element={
        <OptimizedProtectedRoute requiredAction="approvals.manage">
          <OptimizedSuspense>
            <ApprovalsWorkflowsPage />
          </OptimizedSuspense>
        </OptimizedProtectedRoute>
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