import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import CostAnalysisModal from '../CostAnalysisModal';
import { useArabicLanguage } from '../../services/ArabicLanguageService';
import { getTransactionLineItems, replaceLineItems, canEditTransactionLine } from '../../services/transaction-line-items';

// Mock the services
vi.mock('../../services/transaction-line-items', () => ({
    getTransactionLineItems: vi.fn(),
    replaceLineItems: vi.fn(),
    canEditTransactionLine: vi.fn()
}));

vi.mock('../../services/ArabicLanguageService', () => ({
    useArabicLanguage: vi.fn()
}));

// Mock the underlying Dialog shell so we don't need real DOM metrics
vi.mock('../../components/Common/DraggableResizableDialog', () => ({
    default: ({ open, children, title }: any) => open ? (
        <div data-testid="mock-dialog">
            <h2>{title}</h2>
            {children}
        </div>
    ) : null
}));

describe('CostAnalysisModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSaveSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Default Arabic language mock implementation
        vi.mocked(useArabicLanguage).mockReturnValue({
            t: (val: any) => typeof val === 'object' ? val.en : val,
            isRTL: false,
            texts: {
                costAnalysis: {
                    modalTitle: 'Cost Analysis',
                    searchCatalog: 'Search catalog...',
                    saveError: 'Save Error',
                    unsavedChanges: 'Unsaved Changes',
                    lockedWarning: 'Locked Warning',
                    stay: 'Stay',
                    leave: 'Leave'
                },
                common: {
                    save: 'Save',
                    cancel: 'Cancel'
                }
            }
        } as any);
    });

    it('renders nothing when closed', () => {
        render(
            <CostAnalysisModal
                open={false}
                onClose={mockOnClose}
                transactionLineId="123"
            />
        );
        expect(screen.queryByTestId('mock-dialog')).toBeNull();
    });

    it('loads data and checks editability on open', async () => {
        vi.mocked(canEditTransactionLine).mockResolvedValueOnce(true);
        vi.mocked(getTransactionLineItems).mockResolvedValueOnce([
            { line_item_id: 'a', quantity: 1, unit_price: 10 } as any
        ]);

        render(
            <CostAnalysisModal
                open={true}
                onClose={mockOnClose}
                transactionLineId="123"
            />
        );

        // Initial loading state
        expect(screen.getByRole('progressbar')).toBeInTheDocument();

        await waitFor(() => {
            expect(canEditTransactionLine).toHaveBeenCalledWith('123');
            expect(getTransactionLineItems).toHaveBeenCalledWith('123');
        });

        // Loading should be gone
        expect(screen.queryByRole('progressbar')).toBeNull();
    });

    it('shows locked warning and disables save if not editable', async () => {
        vi.mocked(canEditTransactionLine).mockResolvedValueOnce(false);
        vi.mocked(getTransactionLineItems).mockResolvedValueOnce([]);

        render(
            <CostAnalysisModal
                open={true}
                onClose={mockOnClose}
                transactionLineId="123"
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Locked Warning')).toBeInTheDocument();
            // Save button should not be present
            expect(screen.queryByText('Save')).toBeNull();
        });
    });
});
