import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import UserManagementSystem from '../UserManagementSystem';

// Mock the enterprise components since they have complex dependencies
jest.mock('../EnterpriseUserManagement', () => {
  return function MockEnterpriseUserManagement() {
    return <div data-testid="enterprise-user-management">Enterprise User Management</div>;
  };
});

jest.mock('../EnterpriseRoleManagement', () => {
  return function MockEnterpriseRoleManagement() {
    return <div data-testid="enterprise-role-management">Enterprise Role Management</div>;
  };
});

jest.mock('../EnterprisePermissionsManagement', () => {
  return function MockEnterprisePermissionsManagement() {
    return <div data-testid="enterprise-permissions-management">Enterprise Permissions Management</div>;
  };
});

jest.mock('../../components/admin/AccessRequestManagement', () => {
  return {
    AccessRequestManagement: function MockAccessRequestManagement() {
      return <div data-testid="access-request-management">Access Request Management</div>;
    }
  };
});

const theme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'light',
    primary: { main: '#2076FF' },
    secondary: { main: '#21C197' },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('UserManagementSystem', () => {
  test('renders main heading and description', () => {
    renderWithProviders(<UserManagementSystem />);
    
    expect(screen.getByText('إدارة المستخدمين والصلاحيات')).toBeInTheDocument();
    expect(screen.getByText('User Management & Security System')).toBeInTheDocument();
    expect(screen.getByText(/نظام شامل لإدارة المستخدمين/)).toBeInTheDocument();
  });

  test('renders all navigation tabs', () => {
    renderWithProviders(<UserManagementSystem />);
    
    // Check for Arabic tab labels
    expect(screen.getByText('المستخدمين')).toBeInTheDocument();
    expect(screen.getByText('الأدوار')).toBeInTheDocument();
    expect(screen.getByText('الصلاحيات')).toBeInTheDocument();
    expect(screen.getByText('طلبات الوصول')).toBeInTheDocument();
    
    // Check for English tab labels
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Roles')).toBeInTheDocument();
    expect(screen.getByText('Permissions')).toBeInTheDocument();
    expect(screen.getByText('Access Requests')).toBeInTheDocument();
  });

  test('renders enterprise user management component by default', () => {
    renderWithProviders(<UserManagementSystem />);
    
    // Should show the first tab content (Enterprise User Management)
    expect(screen.getByTestId('enterprise-user-management')).toBeInTheDocument();
  });

  test('has proper accessibility attributes', () => {
    renderWithProviders(<UserManagementSystem />);
    
    // Check for proper ARIA attributes
    const tabs = screen.getByRole('tablist');
    expect(tabs).toHaveAttribute('aria-label', 'user management tabs');
    
    // Check for tab panels with proper IDs
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'user-management-tabpanel-0');
  });

  test('displays security icon in header', () => {
    renderWithProviders(<UserManagementSystem />);
    
    // The security icon should be present (rendered as SVG)
    const securityIcon = screen.getByTestId('SecurityIcon') || 
                         document.querySelector('[data-testid="SecurityIcon"]') ||
                         document.querySelector('svg');
    expect(securityIcon).toBeInTheDocument();
  });

  test('has unified enterprise structure', () => {
    renderWithProviders(<UserManagementSystem />);
    
    // Verify it's a unified system (not separate pages)
    expect(screen.queryByText('/settings/users')).not.toBeInTheDocument();
    expect(screen.queryByText('/settings/roles')).not.toBeInTheDocument();
    expect(screen.queryByText('/settings/permissions')).not.toBeInTheDocument();
    
    // Should be a single unified interface
    expect(screen.getByText('نظام شامل لإدارة المستخدمين، الأدوار، والصلاحيات مع واجهة موحدة ومتطورة')).toBeInTheDocument();
  });
});