import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TotalsSummary from '../TotalsSummary';
import { useArabicLanguage } from '../../../../services/ArabicLanguageService';
import type { TransactionLineItem } from '../../../../services/transaction-line-items';

vi.mock('../../../../services/ArabicLanguageService', () => ({
    useArabicLanguage: vi.fn()
}));

vi.mock('../NumberDisplay', () => ({
    default: ({ value, prefix = '', suffix = '' }: any) => <div data-testid="number-display">{prefix}{value}{suffix}</div>
}));

describe('TotalsSummary', () => {
    const mockItems: TransactionLineItem[] = [
        { quantity: 2, unit_price: 100, percentage: 100, addition_percentage: 10, deduction_percentage: 5 } as any,
        { quantity: 1, unit_price: 50, percentage: 50, addition_percentage: 0, deduction_percentage: 10 } as any
    ];

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
    });

    it('renders item count correctly', () => {
        render(<TotalsSummary items={mockItems} />);
        expect(screen.getByText('Items')).toBeInTheDocument();
        // Use a more specific matcher for the item count
        const itemCount = screen.getByText('2');
        expect(itemCount).toBeInTheDocument();
    });

    it('renders gross, additions, deductions, and net correctly', () => {
        render(<TotalsSummary items={mockItems} />);

        const displays = screen.getAllByTestId('number-display');
        // Order in Grid: Gross (0), Additions (1), Deductions (2), Net (3)
        expect(displays[0]).toHaveTextContent('$225');
        expect(displays[1]).toHaveTextContent('+$20');
        expect(displays[2]).toHaveTextContent('-$12.5');
        expect(displays[3]).toHaveTextContent('$232.5');
    });

    it('renders gracefully with no items', () => {
        render(<TotalsSummary items={[]} />);
        expect(screen.getByText('0')).toBeInTheDocument(); // Item count
        const displays = screen.getAllByTestId('number-display');
        expect(displays[0]).toHaveTextContent('$0'); // Gross Total
    });

});
