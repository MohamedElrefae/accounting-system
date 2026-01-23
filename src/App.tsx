import React, { useEffect, Suspense } from 'react';
import { useIdleLogout } from './hooks/useIdleLogout';
import { useAuthPerformance } from './hooks/useAuthPerformance';
import { useRefreshPrevention } from './hooks/useRefreshPrevention';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import useAppStore from './store/useAppStore';
import { ArabicLanguageService } from './services/ArabicLanguageService';
import DashboardLayout from './components/layout/DashboardLayout';
import { OptimizedSuspense } from './components/Common/PerformanceOptimizer';
import DataLoadingErrorBoundary from './components/Common/DataLoadingErrorBoundary';
import DataLoadingState from './components/Common/DataLoadingState';
import { Box, Typography } from '@mui/material';
import PerformanceOptimizer from './components/Common/PerformanceOptimizer';
import RefreshMonitor from './components/Debug/RefreshMonitor';

// Import route groups instead of individual components
import { preloadCriticalRoutes } from './routes/RouteGroups';

// Core dashboard routes (lazy) loaded directly here
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Welcome = React.lazy(() => import('./pages/Welcome'));

// Lazy load route groups
const MainDataRoutes = React.lazy(() => import('./routes/MainDataRoutes'));
const TransactionRoutes = React.lazy(() => import('./routes/TransactionRoutes'));
const ReportRoutes = React.lazy(() => import('./routes/ReportRoutes'));
const InventoryRoutes = React.lazy(() => import('./routes/InventoryRoutes'));
const FiscalRoutes = React.lazy(() => import('./routes/FiscalRoutes'));
const AdminRoutes = React.lazy(() => import('./routes/AdminRoutes'));
const SettingsRoutes = React.lazy(() => import('./routes/SettingsRoutes'));

// Auth components (keep these separate as they're needed immediately)
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { ResetPassword } from './components/auth/ResetPassword';
import OptimizedProtectedRoute from './components/routing/OptimizedProtectedRoute';

// Lazy load admin and other specialized routes
const _UserManagementSystem = React.lazy(() => import('./pages/admin/UserManagementSystem'));
const _Profile = React.lazy(() => import('./pages/admin/Profile'));
const ProjectAttachmentsPage = React.lazy(() => import('./pages/Projects/ProjectAttachments'));

const OptimizedApp: React.FC = () => {
  useIdleLogout();
  useAuthPerformance();
  useRefreshPrevention({
    preventOnError: true,
    preventOnLanguageChange: true,
    preventOnDataUpdate: true,
    maxErrorRetries: 3
  });
  const { language } = useAppStore();

  // Set document direction and language
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    ArabicLanguageService.setLanguage(language === 'ar' ? 'ar' : 'en');
  }, [language]);

  // Preload critical routes after app initialization
  useEffect(() => {
    preloadCriticalRoutes();
  }, []);

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <PerformanceOptimizer>
        <RefreshMonitor />
        <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/unauthorized" element={
          <div style={{ padding: '2rem' }}>
            <h2>Access denied</h2>
            <p>You don't have permission to view this page.</p>
          </div>
        } />

        {/* Protected App Routes */}
        <Route path="/" element={
          <OptimizedProtectedRoute>
            <DataLoadingErrorBoundary>
              <Suspense fallback={
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                  <DataLoadingState message="جاري تحميل التطبيق..." showProgress={false} />
                </Box>
              }>
                <DashboardLayout />
              </Suspense>
            </DataLoadingErrorBoundary>
          </OptimizedProtectedRoute>
        }>
          {/* Core Routes (Dashboard, Landing) - flattened here for clarity */}
          <Route
            index
            element={
              <OptimizedSuspense>
                <Dashboard />
              </OptimizedSuspense>
            }
          />
          <Route
            path="dashboard"
            element={
              <OptimizedSuspense>
                <Dashboard />
              </OptimizedSuspense>
            }
          />
          <Route
            path="welcome"
            element={
              <OptimizedSuspense>
                <Welcome />
              </OptimizedSuspense>
            }
          />

          {/* Main Data Routes */}
          <Route path="main-data/*" element={
            <OptimizedSuspense>
              <MainDataRoutes />
            </OptimizedSuspense>
          } />
          
          {/* Transaction Routes */}
          <Route path="transactions/*" element={
            <OptimizedSuspense>
              <TransactionRoutes />
            </OptimizedSuspense>
          } />
          
          {/* Report Routes */}
          <Route path="reports/*" element={
            <OptimizedSuspense>
              <ReportRoutes />
            </OptimizedSuspense>
          } />
          
          {/* Inventory Routes */}
          <Route path="inventory/*" element={
            <OptimizedSuspense>
              <InventoryRoutes />
            </OptimizedSuspense>
          } />
          
          {/* Fiscal Routes */}
          <Route path="fiscal/*" element={
            <OptimizedSuspense>
              <FiscalRoutes />
            </OptimizedSuspense>
          } />
          
          {/* Admin Routes */}
          <Route path="admin/*" element={
            <OptimizedSuspense>
              <AdminRoutes />
            </OptimizedSuspense>
          } />
          
          <Route path="approvals/*" element={
            <OptimizedSuspense>
              <AdminRoutes />
            </OptimizedSuspense>
          } />
          
          <Route path="settings/*" element={
            <OptimizedSuspense>
              <SettingsRoutes />
            </OptimizedSuspense>
          } />
          
          <Route path="performance" element={
            <OptimizedSuspense>
              <AdminRoutes />
            </OptimizedSuspense>
          } />
          
          {/* Project Attachments */}
          <Route path="projects/:id/attachments" element={
            <OptimizedProtectedRoute requiredAction="documents.view">
              <OptimizedSuspense>
                <ProjectAttachmentsPage />
              </OptimizedSuspense>
            </OptimizedProtectedRoute>
          } />
        </Route>
      </Routes>
      </PerformanceOptimizer>
    </Router>
  );
};

export default OptimizedApp;