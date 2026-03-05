import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AdditionDeductionPanel from '../AdditionDeductionPanel';
import { useArabicLanguage } from '../../../../services/ArabicLanguageService';
import { getAdjustmentTypes } from '../../../../services/adjustment-types';

vi.mock('../../../../services/ArabicLanguageService', () => ({
    useArabicLanguage: vi.fn()
}));

vi.mock('../NumberDisplay', () => ({
    default: ({ value, prefix = '', suffix = '' }: any) => <div data-testid="number-display">{prefix}{value}{suffix}</div>
}));

vi.mock('../../../../services/adjustment-types', () => ({
    getAdjustmentTypes: vi.fn()
}));

describe('AdditionDeductionPanel', () => {
    const mockItem = {
        quantity: 10,
        unit_price: 100,
        percentage: 100,
        addition_percentage: 0,
        deduction_percentage: 0
    } as any;

    const mockOnChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(useArabicLanguage).mockReturnValue({
            t: (val: any) => typeof val === 'object' ? val.en : val,
            isRTL: false,
            formatCurrency: (v: number) => `$${v}`,
            texts: {
                costAnalysis: {
                    additions: 'Additions',
                    deductions: 'Deductions',
                    netAmount: 'Net Amount'
                }
            }
        } as any);

        vi.mocked(getAdjustmentTypes).mockResolvedValue([
            { id: 'add-1', name: 'VAT', default_percentage: 0.15, org_id: 'org1', code: 'VAT' },
            { id: 'ded-1', name: 'Discount', default_percentage: 10, org_id: 'org1', code: 'DSC' }
        ]);
    });

    it('renders correctly with default values', async () => {
        render(
            <AdditionDeductionPanel
                item={mockItem}
                orgId="org1"
                isLocked={false}
                onChange={mockOnChange}
            />
        );

        expect(screen.getByText('Additions')).toBeInTheDocument();
        expect(screen.getByText('Deductions')).toBeInTheDocument();
        expect(screen.getByText('Gross Total:')).toBeInTheDocument();

        // 10 * 100 = 1000
        const displays = screen.getAllByTestId('number-display');
        // Addition Amount (0), Deduction Amount (1), Gross Total (2), Net Total (3)
        expect(displays[2]).toHaveTextContent('$1000');
        expect(displays[3]).toHaveTextContent('$1000');

    });

    it('fetches and populates adjustment types', async () => {
        render(
            <AdditionDeductionPanel
                item={mockItem}
                orgId="org1"
                isLocked={false}
                onChange={mockOnChange}
            />
        );

        // Wait for the Comboboxes to load
        await waitFor(() => {
            // 2 dropdowns (Type for Additions, Type for Deductions)
            const selectBoxes = screen.getAllByRole('combobox');
            expect(selectBoxes).toHaveLength(2);
        });
    });

    it('disables inputs when locked', () => {
        render(
            <AdditionDeductionPanel
                item={mockItem}
                orgId="org1"
                isLocked={true}
                onChange={mockOnChange}
            />
        );

        const inputs = screen.getAllByRole('spinbutton');
        inputs.forEach(input => {
            expect(input).toBeDisabled();
        });
    });
});
