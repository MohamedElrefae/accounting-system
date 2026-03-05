import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  canEditTransactionLine,
  replaceLineItems,
  calculateTotals,
  validateLineItem,
  formatCurrency,
  formatNumber
} from '../transaction-line-items'
import { supabase } from '../../utils/supabase'

vi.mock('../../utils/supabase', () => ({
  supabase: {
    rpc: vi.fn()
  }
}))

describe('Transaction Line Items Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('canEditTransactionLine', () => {
    it('returns true when rpc returns true', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: true, error: null } as any)
      
      const result = await canEditTransactionLine('test-id')
      
      expect(supabase.rpc).toHaveBeenCalledWith('can_edit_transaction_line', {
        p_line_id: 'test-id'
      })
      expect(result).toBe(true)
    })

    it('returns false when error occurs', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'DB Error' } } as any)
      
      const result = await canEditTransactionLine('test-id')
      expect(result).toBe(false)
    })
  })

  describe('replaceLineItems', () => {
    it('calls replace_line_items_atomic with correct params', async () => {
      const mockResult = { success: true, items_saved: 2 }
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockResult, error: null } as any)
      
      const items = [{ line_item_id: 'item1', quantity: 2, unit_price: 10 }]
      const result = await replaceLineItems('line-123', items)
      
      expect(supabase.rpc).toHaveBeenCalledWith('replace_line_items_atomic', {
        p_transaction_line_id: 'line-123',
        p_items: items
      })
      expect(result).toEqual(mockResult)
    })

    it('throws error if rpc fails', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'Permission denied' } } as any)
      
      await expect(replaceLineItems('line-123', [])).rejects.toThrow('Failed to save line items: Permission denied')
    })
  })

  describe('calculateTotals', () => {
    it('calculates simple base amounts correctly', () => {
      const items = [
        { quantity: 2, unit_price: 100, percentage: 100 } as any,
        { quantity: 5, unit_price: 10, percentage: 100 } as any
      ]
      
      const { grossTotal, totalDeductions, totalAdditions, netTotal } = calculateTotals(items)
      
      expect(grossTotal).toBe(250) // 200 + 50
      expect(totalDeductions).toBe(0)
      expect(totalAdditions).toBe(0)
      expect(netTotal).toBe(250)
    })

    it('calculates weighted percentages correctly', () => {
      const items = [
        { quantity: 1, unit_price: 1000, percentage: 50 } as any // 50% share
      ]
      
      const { grossTotal, netTotal } = calculateTotals(items)
      expect(grossTotal).toBe(500)
      expect(netTotal).toBe(500)
    })

    it('handles negative quantities correctly', () => {
      const items = [
        { quantity: -2, unit_price: 100, percentage: 100, addition_percentage: 10 } as any
      ]
      
      // Base: -200
      // Addition: abs(-200 * 0.10) => abs(-20) => 20
      // Net: -200 - 0 + 20 => -180
      const { grossTotal, totalAdditions, netTotal } = calculateTotals(items)
      expect(grossTotal).toBe(-200)
      expect(totalAdditions).toBe(20)
      expect(netTotal).toBe(-180)
    })

    it('calculates deductions and additions correctly', () => {
      const items = [
        // Base: 100, Ded 10% (10), Add 5% (5) -> Net: 95
        { quantity: 1, unit_price: 100, percentage: 100, deduction_percentage: 10, addition_percentage: 5 } as any
      ]
      
      const { grossTotal, totalDeductions, totalAdditions, netTotal } = calculateTotals(items)
      
      expect(grossTotal).toBe(100)
      expect(totalDeductions).toBe(10)
      expect(totalAdditions).toBe(5)
      expect(netTotal).toBe(95)
    })
  })

  describe('validateLineItem', () => {
    it('validates a correct item', () => {
      const item = { line_item_id: 'abc', quantity: 2, unit_price: 50 }
      expect(validateLineItem(item)).toEqual([])
    })

    it('returns error if missing item selection', () => {
      const item = { quantity: 2, unit_price: 50 }
      expect(validateLineItem(item)).toContain('Item selection is required')
    })
    
    it('returns error if quantity is zero', () => {
      const item = { line_item_id: 'abc', quantity: 0, unit_price: 50 }
      expect(validateLineItem(item)).toContain('Quantity must be greater than zero')
    })
    
    it('returns error if price is negative', () => {
      const item = { line_item_id: 'abc', quantity: 2, unit_price: -10 }
      expect(validateLineItem(item)).toContain('Price cannot be negative')
    })

    it('handles percentage bounds', () => {
      const item = { line_item_id: 'abc', quantity: 2, unit_price: 50, percentage: 150 }
      expect(validateLineItem(item)).toContain('Percentage must be between 0 and 100')
    })
  })

  describe('formatting', () => {
    it('formats currencies', () => {
      expect(formatCurrency(1234.56)).toMatch(/1,234\.56/)
    })

    it('formats numbers', () => {
      expect(formatNumber(1234.567, 2)).toBe('1,234.57')
    })
  })
})
