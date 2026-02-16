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
import { Box } from '@mui/material';
import PerformanceOptimizer from './components/Common/PerformanceOptimizer';
import DashboardShellSkeleton from './components/layout/DashboardShellSkeleton';
// Debug components removed for production

// Lazy load unified routes
const UnifiedRoutes = React.lazy(() => import('./routes/UnifiedRoutes'));

// Auth components
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { ResetPassword } from './components/auth/ResetPassword';
import OptimizedProtectedRoute from './components/routing/OptimizedProtectedRoute';

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

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <PerformanceOptimizer>
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

          {/* Protected App Routes - All handled by UnifiedRoutes */}
          <Route path="/*" element={
            <OptimizedProtectedRoute>
              <DataLoadingErrorBoundary>
                <Suspense fallback={<DashboardShellSkeleton />}>
                  <DashboardLayout>
                    <OptimizedSuspense>
                      <UnifiedRoutes />
                    </OptimizedSuspense>
                  </DashboardLayout>
                </Suspense>
              </DataLoadingErrorBoundary>
            </OptimizedProtectedRoute>
          } />
        </Routes>
      </PerformanceOptimizer>
    </Router>
  );
};

export default OptimizedApp;