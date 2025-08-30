import React, { useEffect } from 'react';
import { useIdleLogout } from './hooks/useIdleLogout';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import useAppStore from './store/useAppStore';
import DashboardLayout from './components/layout/DashboardLayout';
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const AccountsTreeLazy = React.lazy(() => import('./pages/MainData/AccountsTree'));
const TestRTL = React.lazy(() => import('./pages/TestRTL'));
const ExportTestPage = React.lazy(() => import('./pages/ExportTestPage'));
const TransactionsPage = React.lazy(() => import('./pages/Transactions/Transactions'));
const GeneralLedgerPage = React.lazy(() => import('./pages/Reports/GeneralLedger'))
const AccountExplorerPage = React.lazy(() => import('./pages/Reports/AccountExplorer'))
const ProfitLossPage = React.lazy(() => import('./pages/Reports/ProfitLoss'))
const BalanceSheetPage = React.lazy(() => import('./pages/Reports/BalanceSheet'))
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { ResetPassword } from './components/auth/ResetPassword';
import AuthDebug from './pages/AuthDebug';
const UserManagement = React.lazy(() => import('./pages/admin/UserManagement'));
const RoleManagement = React.lazy(() => import('./pages/admin/RoleManagement'));
const Diagnostics = React.lazy(() => import('./pages/admin/Diagnostics'));
const Profile = React.lazy(() => import('./pages/admin/Profile'));
const ProjectManagement = React.lazy(() => import('./components/Projects/ProjectManagement'));
const OrgManagementTabs = React.lazy(() => import('./components/Organizations/OrganizationManagementTabs'));
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
  
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading authentication...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
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
  }, [language]);

  return (
    <>
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
          <Route index element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <Dashboard />
            </React.Suspense>
          } />
          <Route path="/test-rtl" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <TestRTL />
            </React.Suspense>
          } />
          
          {/* Main Data */}
          <Route path="/main-data/accounts-tree" element={<React.Suspense fallback={<>Loading...</>}><AccountsTreeLazy /></React.Suspense>} />
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

          {/* Transactions - Single row entry */}
          <Route path="/transactions/my" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <TransactionsPage />
            </React.Suspense>
          } />
          <Route path="/transactions/pending" element={
            <RequirePermission perm="transactions.post">
              <React.Suspense fallback={<div>Loading...</div>}>
                <TransactionsPage />
              </React.Suspense>
            </RequirePermission>
          } />
          <Route path="/transactions/all" element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <TransactionsPage />
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
                  {React.createElement(React.lazy(() => import('./pages/Reports/TrialBalanceOriginal')))}
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
                  <AccountExplorerPage />
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
            <Route path="/reports/cash-flow" element={<PlaceholderPage title="Cash Flow Report" />} />
            <Route path="/reports/custom" element={<PlaceholderPage title="Custom Reports" />} />
            
            {/* Inventory */}
            <Route path="/inventory/items" element={<PlaceholderPage title="Items Management" />} />
            <Route path="/inventory/movements" element={<PlaceholderPage title="Stock Movements" />} />
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
                {React.createElement(React.lazy(() => import('./pages/admin/AccountPrefixMapping')))}
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
            <Route path="/settings/preferences" element={<PlaceholderPage title="Preferences" />} />
            <Route path="/settings/backup" element={<PlaceholderPage title="Backup & Restore" />} />
            
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
