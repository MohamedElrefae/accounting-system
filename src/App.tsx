import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CustomThemeProvider } from './contexts/ThemeContext';
// import { ThemeDemo } from './components/ThemeDemo';
// import { DatabaseTest } from './components/DatabaseTest';
import useAppStore from './store/useAppStore';
import { mockUser } from './data/mockData';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
const AccountsTreeLazy = React.lazy(() => import('./pages/MainData/AccountsTree'));
import TestRTL from './pages/TestRTL';
import ExportTestPage from './pages/ExportTestPage';

// Placeholder components for other pages
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ padding: '2rem' }}>
    <h2>{title}</h2>
    <p>This page is under construction. The navigation and layout are fully functional!</p>
  </div>
);

const App: React.FC = () => {
  const { setUser, language } = useAppStore();

  // Initialize user data
  useEffect(() => {
    setUser(mockUser);
  }, [setUser]);

  // Ensure document direction is set on mount and language changes
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    console.log('[App] Document direction set to:', document.documentElement.dir);
  }, [language]);

  return (
    <CustomThemeProvider>
      <Router>
        <Routes>
          {/* Theme Demo Route */}
          {/* <Route path="/theme-demo" element={<ThemeDemo />} /> */}
          {/* <Route path="/database-test" element={<DatabaseTest />} /> */}
          
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="/test-rtl" element={<TestRTL />} />
            
          {/* Main Data */}
          <Route path="/main-data/accounts-tree" element={<React.Suspense fallback={<>Loading...</>}><AccountsTreeLazy /></React.Suspense>} />

          {/* Chart of Accounts (legacy placeholders) */}
          <Route path="/accounts" element={<PlaceholderPage title="Accounts List" />} />
          <Route path="/accounts/add" element={<PlaceholderPage title="Add Account" />} />
            
            {/* Transactions */}
            <Route path="/transactions/journal" element={<PlaceholderPage title="Journal Entries" />} />
            <Route path="/transactions/ledger" element={<PlaceholderPage title="General Ledger" />} />
            <Route path="/transactions/trial-balance" element={<PlaceholderPage title="Trial Balance" />} />
            
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
            <Route path="/settings/users" element={<PlaceholderPage title="Users Management" />} />
            <Route path="/settings/preferences" element={<PlaceholderPage title="Preferences" />} />
            <Route path="/settings/backup" element={<PlaceholderPage title="Backup & Restore" />} />
            
            {/* Export Test Page */}
            <Route path="/export-test" element={<ExportTestPage />} />
          </Route>
        </Routes>
      </Router>
    </CustomThemeProvider>
  );
};

export default App;
