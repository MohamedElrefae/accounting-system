import React, { useEffect } from 'react';
import { useIdleLogout } from './hooks/useIdleLogout';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import useAppStore from './store/useAppStore';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
const AccountsTreeLazy = React.lazy(() => import('./pages/MainData/AccountsTree'));
import TestRTL from './pages/TestRTL';
import ExportTestPage from './pages/ExportTestPage';
import TransactionsPage from './pages/Transactions/Transactions';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { ResetPassword } from './components/auth/ResetPassword';
import AuthDebug from './pages/AuthDebug';
const UserManagement = React.lazy(() => import('./pages/admin/UserManagement'));
const RoleManagement = React.lazy(() => import('./pages/admin/RoleManagement'));
const Diagnostics = React.lazy(() => import('./pages/admin/Diagnostics'));
import EditProfile from './pages/admin/EditProfile';
import Profile from './pages/admin/Profile';
import { useHasPermission } from './hooks/useHasPermission';

// Placeholder components for other pages
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ padding: '2rem' }}>
    <h2>{title}</h2>
    <p>This page is under construction. The navigation and layout are fully functional!</p>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  console.log('[ProtectedRoute]', { user: !!user, loading });
  
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading authentication...</div>
      </div>
    );
  }
  
  if (!user) {
    console.log('[ProtectedRoute] No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  console.log('[ProtectedRoute] User found, rendering children');
  return <>{children}</>;
};

const RequirePermission: React.FC<{ perm: string; children: React.ReactNode; fallback?: React.ReactNode }> = ({ perm, children, fallback }) => {
  const hasPerm = useHasPermission();
  if (!hasPerm(perm)) {
    return fallback ?? <Navigate to="/transactions/my" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  useIdleLogout();
  const { language } = useAppStore();

  // Ensure document direction is set on mount and language changes
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    console.log('[App] Document direction set to:', document.documentElement.dir);
  }, [language]);

  return (
    <Router>
      <Routes>
        {/* Theme Demo Route */}
        {/* <Route path="/theme-demo" element={<ThemeDemo />} /> */}
        {/* <Route path="/database-test" element={<DatabaseTest />} /> */}
        
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth-debug" element={<AuthDebug />} />
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="/test-rtl" element={<TestRTL />} />
          
          {/* Main Data */}
          <Route path="/main-data/accounts-tree" element={<React.Suspense fallback={<>Loading...</>}><AccountsTreeLazy /></React.Suspense>} />

          {/* Transactions - Single row entry */}
          <Route path="/transactions/my" element={<TransactionsPage />} />
          <Route path="/transactions/pending" element={
            <RequirePermission perm="transactions.post">
              <TransactionsPage />
            </RequirePermission>
          } />
          <Route path="/transactions/all" element={<TransactionsPage />} />

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
                  {React.createElement(React.lazy(() => import('./pages/Reports/TrialBalance')))}
                </React.Suspense>
              </ProtectedRoute>
            } />
            <Route path="/reports/profit-loss" element={<PlaceholderPage title="Profit & Loss Report" />} />
            <Route path="/reports/balance-sheet" element={<PlaceholderPage title="Balance Sheet" />} />
            <Route path="/reports/cash-flow" element={<PlaceholderPage title="Cash Flow Report" />} />
            <Route path="/reports/custom" element={<PlaceholderPage title="Custom Reports" />} />
            
            {/* Inventory */}
            <Route path="/inventory/items" element={<PlaceholderPage title="Items Management" />} />
            <Route path="/inventory/movements" element={<PlaceholderPage title="Stock Movements" />} />
            <Route path="/inventory/reports" element={<PlaceholderPage title="Stock Reports" />} />
            
            {/* Settings */}
            <Route path="/settings/company" element={<PlaceholderPage title="Company Profile" />} />
            <Route path="/settings/diagnostics" element={
              <React.Suspense fallback={<div>Loading...</div>}>
                <Diagnostics />
              </React.Suspense>
            } />
            <Route path="/settings/users" element={
              <React.Suspense fallback={<div>Loading...</div>}>
                <UserManagement />
              </React.Suspense>
            } />
            <Route path="/settings/roles" element={
              <React.Suspense fallback={<div>Loading...</div>}>
                <RoleManagement />
              </React.Suspense>
            } />
            <Route path="/settings/profile" element={<Profile />} />
            <Route path="/settings/preferences" element={<PlaceholderPage title="Preferences" />} />
            <Route path="/settings/backup" element={<PlaceholderPage title="Backup & Restore" />} />
            
            {/* Export Test Page */}
            <Route path="/export-test" element={<ExportTestPage />} />
          </Route>
      </Routes>
    </Router>
  );
};

export default App;
