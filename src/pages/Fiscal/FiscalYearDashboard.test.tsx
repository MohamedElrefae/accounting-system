import React from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { ToastProvider } from '@/contexts/ToastContext'
import FiscalYearDashboard from './FiscalYearDashboard'

// Mock the services
jest.mock('@/services/fiscal/hooks/useFiscalYear', () => ({
  useFiscalYears: () => ({ data: [], isLoading: false, refetch: jest.fn() }),
  useCanManageFiscal: () => ({ data: true }),
  useCreateFiscalYear: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateFiscalYear: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteFiscalYear: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSetCurrentFiscalYear: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useActivateFiscalYear: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCloseFiscalYear: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useArchiveFiscalYear: () => ({ mutateAsync: jest.fn(), isPending: false })
}))

jest.mock('@/utils/org', () => ({
  getActiveOrgId: () => 'test-org-id'
}))

const theme = createTheme()
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
})

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={theme}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ThemeProvider>
  </QueryClientProvider>
)

describe('FiscalYearDashboard', () => {
  it('renders the dashboard title', () => {
    render(
      <TestWrapper>
        <FiscalYearDashboard />
      </TestWrapper>
    )
    
    expect(screen.getByText('Fiscal Year Management')).toBeInTheDocument()
  })

  it('shows empty state when no fiscal years exist', () => {
    render(
      <TestWrapper>
        <FiscalYearDashboard />
      </TestWrapper>
    )
    
    expect(screen.getByText('No fiscal years found')).toBeInTheDocument()
  })

  it('shows create button when user can manage', () => {
    render(
      <TestWrapper>
        <FiscalYearDashboard />
      </TestWrapper>
    )
    
    expect(screen.getByText('New Fiscal Year')).toBeInTheDocument()
  })
})