import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import TransactionWizard from '../TransactionWizard';
import { useScope } from '../../../contexts/ScopeContext';
import { getTransactionLineItemCounts } from '../../../services/transaction-line-items';

// Mock ScopeContext
vi.mock('../../../contexts/ScopeContext', () => ({
    useScope: vi.fn()
}));

// Mock transaction line items service
vi.mock('../../../services/transaction-line-items', () => ({
    getTransactionLineItemCounts: vi.fn().mockResolvedValue({}),
    calculateTotals: vi.fn().mockReturnValue({
        grossTotal: 100,
        totalAdditions: 0,
        totalDeductions: 0,
        netTotal: 100,
        totalDebits: 100,
        totalCredits: 100,
        diff: 0,
        isBalanced: true
    })
}));

// Mock ArabicLanguageService
vi.mock('../../../services/ArabicLanguageService', () => ({
    useArabicLanguage: () => ({
        t: (val: any) => typeof val === 'object' ? val.en : (val || ''),
        isRTL: false,
        formatCurrency: (v: number) => `$${v}`,
        texts: {
            common: { next: 'Next', back: 'Back', save: 'Save', cancel: 'Cancel' },
            costAnalysis: { additions: 'Additions', deductions: 'Deductions', netAmount: 'Net Amount' }
        }
    })
}));

// Mock CostAnalysisModal
vi.mock('../CostAnalysisModal', () => ({
    default: ({ open, onClose, transactionLineId }: any) => open ? (
        <div data-testid="cost-analysis-modal">
            <span data-testid="modal-line-id">{transactionLineId || 'no-id'}</span>
            <button onClick={onClose}>Close Modal</button>
        </div>
    ) : null
}));

// Mock other dependencies
vi.mock('../../../services/projects', () => ({
    getActiveProjectsByOrg: vi.fn().mockResolvedValue([]),
    getProjectById: vi.fn().mockResolvedValue({ id: 'proj1', name: 'Mock Proj' })
}));

vi.mock('../../../services/transactions', () => ({
    getAccountsByOrg: vi.fn().mockResolvedValue([
        { id: 'acc1', code: '101', name: 'Cash', org_id: 'org1', is_postable: true },
        { id: 'acc2', code: '401', name: 'Revenue', org_id: 'org1', is_postable: true }
    ]),
    getOrganizationById: vi.fn().mockResolvedValue({ id: 'org1', name: 'Mock Org' }),
}));

describe('TransactionWizard Integration with Cost Analysis', () => {
    const mockAccounts = [
        { id: 'acc1', code: '101', name: 'Cash', org_id: 'org1', is_postable: true },
        { id: 'acc2', code: '401', name: 'Revenue', org_id: 'org1', is_postable: true }
    ];

    const defaultProps = {
        open: true,
        onClose: vi.fn(),
        onSubmit: vi.fn(),
        mode: 'edit' as const,
        transactionId: 'tx1',
        initialData: {
            header: {
                entry_date: '2024-03-02',
                description: 'Test Transaction',
                org_id: 'org1',
                project_id: 'proj1',
                version: 1
            },
            lines: [
                { id: 'line-1', line_no: 1, account_id: 'acc1', debit_amount: 100, credit_amount: 0, description: 'Line 1' },
                { id: 'line-2', line_no: 2, account_id: 'acc2', debit_amount: 0, credit_amount: 100, description: 'Line 2' }
            ]
        },
        accounts: mockAccounts as any,
        organizations: [{ id: 'org1', name: 'Mock Org' }] as any,
        projects: [{ id: 'proj1', name: 'Mock Proj', org_id: 'org1' }] as any
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useScope).mockReturnValue({
            getOrgId: () => 'org1',
            getProjectId: () => 'proj1',
            organization: { id: 'org1', name: 'Mock Org' },
            project: { id: 'proj1', name: 'Mock Proj' }
        } as any);

        vi.mocked(getTransactionLineItemCounts).mockResolvedValue({
            'line-1': 3
        });
    });

    it('should navigate to lines and open cost analysis modal', async () => {
        render(<TransactionWizard {...defaultProps} />);

        // 1. Initial Step: Basic info should be loaded
        expect(screen.getByDisplayValue('Test Transaction')).toBeInTheDocument();

        // 2. Click Next to go to Lines step
        const nextBtn = screen.getByText(/التالي/i) || screen.getByText('Next');
        fireEvent.click(nextBtn);

        // 3. In Lines Step: Find the Calculate button
        await waitFor(() => {
            const calcButtons = screen.getAllByTestId('CalculateIcon');
            expect(calcButtons.length).toBeGreaterThan(0);
        });

        const firstCalcBtn = screen.getAllByTestId('CalculateIcon')[0].closest('button')!;

        // 4. Click the Calculate button
        fireEvent.click(firstCalcBtn);

        // 5. Verify Modal Opens
        await waitFor(() => {
            expect(screen.getByTestId('cost-analysis-modal')).toBeInTheDocument();
            expect(screen.getByTestId('modal-line-id')).toHaveTextContent('line-1');
        });

        // 6. Close Modal and verify it's gone
        fireEvent.click(screen.getByText('Close Modal'));
        expect(screen.queryByTestId('cost-analysis-modal')).not.toBeInTheDocument();
    });

    it('should show badge with item count on calculate button', async () => {
        render(<TransactionWizard {...defaultProps} />);

        // Go to Lines step
        const nextBtn = screen.getByText(/التالي/i) || screen.getByText('Next');
        fireEvent.click(nextBtn);

        // Wait for badge to appear
        await waitFor(() => {
            const badge = screen.getByText('3'); // Mocked count for line-1
            expect(badge).toBeInTheDocument();
        });
    });
});
