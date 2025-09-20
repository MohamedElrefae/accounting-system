import { useState, useCallback } from 'react'
import type { SelectedLineItem } from '../components/TransactionLineItemSelector'

interface UseTransactionLineItemSelectorReturn {
  isOpen: boolean
  selectedItems: SelectedLineItem[]
  openSelector: () => void
  closeSelector: () => void
  handleSelection: (items: SelectedLineItem[]) => void
  clearSelection: () => void
  addItem: (item: SelectedLineItem) => void
  removeItem: (itemId: string) => void
  updateItemQuantity: (itemId: string, quantity: number) => void
  updateItemPrice: (itemId: string, price: number) => void
  getTotalAmount: () => number
  getTotalQuantity: () => number
}

export const useTransactionLineItemSelector = (
  initialItems: SelectedLineItem[] = []
): UseTransactionLineItemSelectorReturn => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<SelectedLineItem[]>(initialItems)

  const openSelector = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeSelector = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleSelection = useCallback((items: SelectedLineItem[]) => {
    setSelectedItems(items)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItems([])
  }, [])

  const addItem = useCallback((item: SelectedLineItem) => {
    setSelectedItems(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        // Update existing item
        return prev.map(i => i.id === item.id ? item : i)
      } else {
        // Add new item
        return [...prev, item]
      }
    })
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setSelectedItems(prev => prev.filter(i => i.id !== itemId))
  }, [])

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(0, quantity)
        return {
          ...item,
          quantity_selected: newQuantity,
          total_amount: newQuantity * item.unit_price_override
        }
      }
      return item
    }))
  }, [])

  const updateItemPrice = useCallback((itemId: string, price: number) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newPrice = Math.max(0, price)
        return {
          ...item,
          unit_price_override: newPrice,
          total_amount: item.quantity_selected * newPrice
        }
      }
      return item
    }))
  }, [])

  const getTotalAmount = useCallback(() => {
    return selectedItems.reduce((sum, item) => sum + item.total_amount, 0)
  }, [selectedItems])

  const getTotalQuantity = useCallback(() => {
    return selectedItems.reduce((sum, item) => sum + item.quantity_selected, 0)
  }, [selectedItems])

  return {
    isOpen,
    selectedItems,
    openSelector,
    closeSelector,
    handleSelection,
    clearSelection,
    addItem,
    removeItem,
    updateItemQuantity,
    updateItemPrice,
    getTotalAmount,
    getTotalQuantity,
  }
}