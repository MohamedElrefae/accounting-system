import React from 'react';
import { Routes, Route } from 'react-router-dom';
import OptimizedProtectedRoute from '../components/routing/OptimizedProtectedRoute';
import { OptimizedSuspense } from '../components/Common/PerformanceOptimizer';

// Settings pages - lazy loaded
const UserManagementSystem = React.lazy(() => import('../pages/admin/UserManagementSystem'));
const Diagnostics = React.lazy(() => import('../pages/admin/Diagnostics'));
const Profile = React.lazy(() => import('../pages/admin/Profile'));
const ExportDatabasePage = React.lazy(() => import('../pages/admin/ExportDatabase'));
const AccountPrefixMappingPage = React.lazy(() => import('../pages/admin/AccountPrefixMapping'));
const FontSettings = React.lazy(() => import('../components/Settings/FontSettings'));

// Organization Management
const OrganizationManagement = React.lazy(() => import('../components/Organizations/OrganizationManagement'));

const SettingsRoutes: React.FC = () => {
  return (
    <Routes>
      {/* User Management - /settings/user-management */}
      <Route path="user-management" element={
        <OptimizedProtectedRoute requiredAction="users.view">
          <OptimizedSuspense>
            <UserManagementSystem />
          </OptimizedSuspense>
        </OptimizedProtectedRoute>
      } />

      {/* Organization Management - /settings/organization-management */}
      <Route path="organization-management" element={
        <OptimizedSuspense>
          <OrganizationManagement />
        </OptimizedSuspense>
      } />

      {/* Account Prefix Mapping - /settings/account-prefix-mapping */}
      <Route path="account-prefix-mapping" element={
        <OptimizedProtectedRoute requiredAction="accounts.manage">
          <OptimizedSuspense>
            <AccountPrefixMappingPage />
          </OptimizedSuspense>
        </OptimizedProtectedRoute>
      } />

      {/* Font Preferences - /settings/font-preferences */}
      <Route path="font-preferences" element={
        <OptimizedSuspense>
          <FontSettings />
        </OptimizedSuspense>
      } />

      {/* Export Database - /settings/export-database */}
      <Route path="export-database" element={
        <OptimizedProtectedRoute requiredAction="data.export">
          <OptimizedSuspense>
            <ExportDatabasePage />
          </OptimizedSuspense>
        </OptimizedProtectedRoute>
      } />

      {/* Diagnostics - /settings/diagnostics */}
      <Route path="diagnostics" element={
        <OptimizedProtectedRoute requiredAction="users.manage">
          <OptimizedSuspense>
            <Diagnostics />
          </OptimizedSuspense>
        </OptimizedProtectedRoute>
      } />

      {/* Profile - /settings/profile */}
      <Route path="profile" element={
        <OptimizedSuspense>
          <Profile />
        </OptimizedSuspense>
      } />
    </Routes>
  );
};

export default SettingsRoutes;
