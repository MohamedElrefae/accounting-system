import React, { useEffect } from 'react';
import { useIdleLogout } from './hooks/useIdleLogout';
import { useAuthPerformance } from './hooks/useAuthPerformance';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAppStore from './store/useAppStore';
import { ArabicLanguageService } from './services/ArabicLanguageService';
import DashboardLayout from './components/layout/DashboardLayout';
import { OptimizedSuspense } from './components/Common/PerformanceOptimizer';

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
import ErrorBoundary from './components/Common/ErrorBoundary';

// Lazy load admin and other specialized routes
const UserManagementSystem = React.lazy(() => import('./pages/admin/UserManagementSystem'));
const Profile = React.lazy(() => import('./pages/admin/Profile'));
const ProjectAttachmentsPage = React.lazy(() => import('./pages/Projects/ProjectAttachments'));
const FontSettings = React.lazy(() => import('./components/Settings/FontSettings'));

const OptimizedApp: React.FC = () => {
  useIdleLogout();
  useAuthPerformance();
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
            <DashboardLayout />
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
    </Router>
  );
};

export default OptimizedApp;