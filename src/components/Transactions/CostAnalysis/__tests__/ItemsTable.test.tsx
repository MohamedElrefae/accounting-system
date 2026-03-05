import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import ItemsTable from '../ItemsTable';
import { useArabicLanguage } from '../../../../services/ArabicLanguageService';
import { TransactionLineItem } from '../../../../services/transaction-line-items';

vi.mock('../../../../services/ArabicLanguageService', () => ({
    useArabicLanguage: vi.fn()
}));

// Mock the LineItemSelector which can be complex to render headless
vi.mock('../LineItemSelector', () => ({
    default: ({ value, onChange, disabled }: any) => (
        <div data-testid="line-item-selector">
            <input
                data-testid="selector-input"
                value={value || ''}
                disabled={disabled}
                onChange={(e) => onChange({ id: e.target.value, name: 'Mock Item' })}
            />
        </div>
    )
}));

describe('ItemsTable', () => {
    const mockItems: TransactionLineItem[] = [
        { id: '1', line_number: 1, line_item_id: 'item1', quantity: 2, unit_price: 50, percentage: 100 } as any,
        { id: '2', line_number: 2, line_item_id: 'item2', quantity: -1, unit_price: 100, percentage: 50 } as any
    ];

    const mockOnChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useArabicLanguage).mockReturnValue({
            t: (val: any) => typeof val === 'object' ? val.en : val,
            isRTL: false,
            formatCurrency: (v: number) => `$${v}`,
            texts: {
                costAnalysis: {
                    item: 'Item',
                    quantity: 'Qty',
                    unitPrice: 'Price',
                    percentage: 'Share %',
                    netAmount: 'Net',
                    noItems: 'No items'
                },
                common: {
                    delete: 'Delete'
                }
            }
        } as any);
    });

    it('renders empty state correctly', () => {
        render(<ItemsTable items={[]} orgId="org1" isLocked={false} onItemsChange={mockOnChange} />);
        expect(screen.getByText('No items')).toBeInTheDocument();
    });

    it('renders items and calculates totals', () => {
        render(<ItemsTable items={mockItems} orgId="org1" isLocked={false} onItemsChange={mockOnChange} />);

        // First item: 2 * 50 = 100
        // Second item: -1 * 100 * 50% = -50
        expect(screen.getByText('$100')).toBeInTheDocument();
        expect(screen.getByText('$-50')).toBeInTheDocument();
    });

    it('allows inline editing of quantity', () => {
        render(<ItemsTable items={mockItems} orgId="org1" isLocked={false} onItemsChange={mockOnChange} />);

        const qtyInputs = screen.getAllByRole('spinbutton').filter(input => (input as HTMLInputElement).value === '2');
        fireEvent.change(qtyInputs[0], { target: { value: '5' } });

        expect(mockOnChange).toHaveBeenCalled();
        const newItems = mockOnChange.mock.calls[0][0];
        expect(newItems[0].quantity).toBe(5);
    });

    it('allows moving rows up and down', () => {
        render(<ItemsTable items={mockItems} orgId="org1" isLocked={false} onItemsChange={mockOnChange} />);

        // Move 2nd item up (index 1)
        const moveUpBtns = screen.getAllByTestId('KeyboardArrowUpIcon');
        fireEvent.click(moveUpBtns[1].closest('button')!);

        expect(mockOnChange).toHaveBeenCalled();
        const newItems = mockOnChange.mock.calls[0][0];
        expect(newItems[0].id).toBe('2'); // Swapped
        expect(newItems[0].line_number).toBe(1); // Reassigned sequence
        expect(newItems[1].id).toBe('1');
        expect(newItems[1].line_number).toBe(2);
    });

    it('allows deleting a row', () => {
        render(<ItemsTable items={mockItems} orgId="org1" isLocked={false} onItemsChange={mockOnChange} />);

        const deleteBtns = screen.getAllByTestId('DeleteIcon');
        fireEvent.click(deleteBtns[0].closest('button')!);

        expect(mockOnChange).toHaveBeenCalled();
        const newItems = mockOnChange.mock.calls[0][0];
        expect(newItems).toHaveLength(1);
        expect(newItems[0].id).toBe('2');
        expect(newItems[0].line_number).toBe(1); // Reassigned sequence after deletion
    });

    it('disables interactions when locked', () => {
        render(<ItemsTable items={mockItems} orgId="org1" isLocked={true} onItemsChange={mockOnChange} />);

        const qtyInputs = screen.getAllByRole('spinbutton');
        qtyInputs.forEach(input => {
            expect(input).toBeDisabled();
        });

        const selectors = screen.getAllByTestId('selector-input');
        selectors.forEach(input => {
            expect(input).toBeDisabled();
        });

        const deleteBtns = screen.getAllByTestId('DeleteIcon');
        deleteBtns.forEach(btn => {
            expect(btn.closest('button')).toBeDisabled();
        });
    });
});
