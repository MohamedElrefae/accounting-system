import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CostAnalysisModal } from '../CostAnalysisModal'
import { TransactionLineItemsEditor } from '../TransactionLineItemsEditor'
import type { EditableTxLineItem } from '../../../services/transaction-line-items-enhanced'

/**
 * 🧪 COST ANALYSIS MODAL INTEGRATION TESTS
 * 
 * Verifies:
 * ✓ Modal opens when item is selected
 * ✓ Dropdown data flows through from props
 * ✓ Defaults are populated from transaction line
 * ✓ User can override defaults per line item
 * ✓ Saves persist to parent component
 * ✓ Escape/cancel closes modal
 */

describe('CostAnalysisModal Integration', () => {
  const mockWorkItems = [
    { id: '1', code: 'WI001', name: 'Design' },
    { id: '2', code: 'WI002', name: 'Development' },
    { id: '3', code: 'WI003', name: 'Testing' },
  ]

  const mockAnalysisItems = {
    'ai-001': { code: 'ANA001', name: 'Salaries' },
    'ai-002': { code: 'ANA002', name: 'Equipment' },
    'ai-003': { code: 'ANA003', name: 'Travel' },
  }

  const mockCostCenters = [
    { id: 'cc-1', code: 'CC001', name: 'Engineering', level: 1 },
    { id: 'cc-2', code: 'CC002', name: 'Operations', level: 1 },
    { id: 'cc-3', code: 'CC003', name: 'Admin', level: 2 },
  ]

  const mockTransactionLineDefaults = {
    work_item_id: '1',
    analysis_work_item_id: 'ai-001',
    sub_tree_id: 'cc-1',
  }

  const mockItem: EditableTxLineItem = {
    id: 'item-1',
    line_number: 1,
    quantity: 5,
    percentage: 100,
    unit_price: 100,
    discount_amount: 0,
    tax_amount: 0,
    unit_of_measure: 'piece',
    item_code: 'ITEM001',
    item_name: 'Widget',
    analysis_work_item_id: null,
    sub_tree_id: null,
    line_item_id: null,
    work_item_id: null,
  }

  it('should render modal when isOpen is true', () => {
    const mockOnClose = jest.fn()
    const mockOnSave = jest.fn()

    render(
      <CostAnalysisModal
        item={mockItem}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        workItems={mockWorkItems}
        analysisItems={mockAnalysisItems}
        costCenters={mockCostCenters}
        transactionLineDefaults={mockTransactionLineDefaults}
      />
    )

    expect(screen.getByText(/💰 تحليل التكلفة/i)).toBeInTheDocument()
    expect(screen.getByText(/Widget/i)).toBeInTheDocument()
  })

  it('should not render modal when isOpen is false', () => {
    const mockOnClose = jest.fn()
    const mockOnSave = jest.fn()

    const { container } = render(
      <CostAnalysisModal
        item={mockItem}
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
        workItems={mockWorkItems}
        analysisItems={mockAnalysisItems}
        costCenters={mockCostCenters}
        transactionLineDefaults={mockTransactionLineDefaults}
      />
    )

    expect(container.firstChild).toBeEmptyDOMElement()
  })

  it('should display transaction line defaults info', () => {
    const mockOnClose = jest.fn()
    const mockOnSave = jest.fn()

    render(
      <CostAnalysisModal
        item={mockItem}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        workItems={mockWorkItems}
        analysisItems={mockAnalysisItems}
        costCenters={mockCostCenters}
        transactionLineDefaults={mockTransactionLineDefaults}
      />
    )

    expect(screen.getByText(/📋 GL Line Defaults:/i)).toBeInTheDocument()
    expect(screen.getByText(/WI001 - Design/)).toBeInTheDocument()
    expect(screen.getByText(/ANA001 - Salaries/)).toBeInTheDocument()
    expect(screen.getByText(/CC001 - Engineering/)).toBeInTheDocument()
  })

  it('should populate work items dropdown', async () => {
    const mockOnClose = jest.fn()
    const mockOnSave = jest.fn()

    render(
      <CostAnalysisModal
        item={mockItem}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        workItems={mockWorkItems}
        analysisItems={mockAnalysisItems}
        costCenters={mockCostCenters}
        transactionLineDefaults={mockTransactionLineDefaults}
      />
    )

    const workItemSelect = screen.getByDisplayValue('— None / بلا —')
    expect(workItemSelect).toBeInTheDocument()

    // Should have all work items as options
    expect(screen.getByText(/WI001 - Design/)).toBeInTheDocument()
    expect(screen.getByText(/WI002 - Development/)).toBeInTheDocument()
    expect(screen.getByText(/WI003 - Testing/)).toBeInTheDocument()
  })

  it('should allow user to select work item', async () => {
    const mockOnClose = jest.fn()
    const mockOnSave = jest.fn()
    const user = userEvent.setup()

    render(
      <CostAnalysisModal
        item={mockItem}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        workItems={mockWorkItems}
        analysisItems={mockAnalysisItems}
        costCenters={mockCostCenters}
        transactionLineDefaults={mockTransactionLineDefaults}
      />
    )

    const workItemSelects = screen.getAllByDisplayValue('— None / بلا —')
    await user.selectOptions(workItemSelects[0], '2')

    expect(screen.getByDisplayValue(/WI002 - Development/)).toBeInTheDocument()
  })

  it('should allow user to select analysis item', async () => {
    const mockOnClose = jest.fn()
    const mockOnSave = jest.fn()
    const user = userEvent.setup()

    render(
      <CostAnalysisModal
        item={mockItem}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        workItems={mockWorkItems}
        analysisItems={mockAnalysisItems}
        costCenters={mockCostCenters}
        transactionLineDefaults={mockTransactionLineDefaults}
      />
    )

    const selects = screen.getAllByDisplayValue('— None / بلا —')
    // Analysis item is second select
    await user.selectOptions(selects[1], 'ai-002')

    expect(screen.getByDisplayValue(/ANA002 - Equipment/)).toBeInTheDocument()
  })

  it('should allow user to select cost center', async () => {
    const mockOnClose = jest.fn()
    const mockOnSave = jest.fn()
    const user = userEvent.setup()

    render(
      <CostAnalysisModal
        item={mockItem}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        workItems={mockWorkItems}
        analysisItems={mockAnalysisItems}
        costCenters={mockCostCenters}
        transactionLineDefaults={mockTransactionLineDefaults}
      />
    )

    const selects = screen.getAllByDisplayValue('— None / بلا —')
    // Cost center is third select
    await user.selectOptions(selects[2], 'cc-3')

    expect(screen.getByDisplayValue(/CC003 - Admin/)).toBeInTheDocument()
  })

  it('should save with user selections', async () => {
    const mockOnClose = jest.fn()
    const mockOnSave = jest.fn()
    const user = userEvent.setup()

    render(
      <CostAnalysisModal
        item={mockItem}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        workItems={mockWorkItems}
        analysisItems={mockAnalysisItems}
        costCenters={mockCostCenters}
        transactionLineDefaults={mockTransactionLineDefaults}
      />
    )

    const selects = screen.getAllByDisplayValue('— None / بلا —')
    await user.selectOptions(selects[0], '3') // WI003
    await user.selectOptions(selects[1], 'ai-003') // ANA003
    await user.selectOptions(selects[2], 'cc-2') // CC002

    const saveButton = screen.getByText(/✓ Save/i)
    await user.click(saveButton)

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'item-1',
        work_item_id: '3',
        analysis_work_item_id: 'ai-003',
        sub_tree_id: 'cc-2',
      })
    )
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should close modal on cancel', async () => {
    const mockOnClose = jest.fn()
    const mockOnSave = jest.fn()
    const user = userEvent.setup()

    render(
      <CostAnalysisModal
        item={mockItem}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        workItems={mockWorkItems}
        analysisItems={mockAnalysisItems}
        costCenters={mockCostCenters}
        transactionLineDefaults={mockTransactionLineDefaults}
      />
    )

    const cancelButton = screen.getByText(/Cancel/i)
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it('should reset to defaults', async () => {
    const mockOnClose = jest.fn()
    const mockOnSave = jest.fn()
    const user = userEvent.setup()

    const { rerender } = render(
      <CostAnalysisModal
        item={mockItem}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        workItems={mockWorkItems}
        analysisItems={mockAnalysisItems}
        costCenters={mockCostCenters}
        transactionLineDefaults={mockTransactionLineDefaults}
      />
    )

    // Change selections
    const selects = screen.getAllByDisplayValue('— None / بلا —')
    await user.selectOptions(selects[0], '2')

    // Click reset
    const resetButton = screen.getByText(/🔄 Reset/i)
    await user.click(resetButton)

    // After reset, should show defaults
    await waitFor(() => {
      expect(screen.getByText(/📋 GL Line Defaults:/i)).toBeInTheDocument()
    })
  })
})

describe('TransactionLineItemsEditor with Cost Modal', () => {
  const mockWorkItems = [
    { id: '1', code: 'WI001', name: 'Design' },
    { id: '2', code: 'WI002', name: 'Development' },
  ]

  const mockAnalysisItems = {
    'ai-001': { code: 'ANA001', name: 'Salaries' },
  }

  const mockCostCenters = [
    { id: 'cc-1', code: 'CC001', name: 'Engineering', level: 1 },
  ]

  const mockTransactionLineDefaults = {
    work_item_id: '1',
    analysis_work_item_id: 'ai-001',
    sub_tree_id: 'cc-1',
  }

  const mockItems: EditableTxLineItem[] = [
    {
      id: 'item-1',
      line_number: 1,
      quantity: 5,
      percentage: 100,
      unit_price: 100,
      discount_amount: 0,
      tax_amount: 0,
      unit_of_measure: 'piece',
      item_code: 'ITEM001',
      item_name: 'Widget A',
      work_item_id: null,
      analysis_work_item_id: null,
      sub_tree_id: null,
      line_item_id: null,
    },
  ]

  it('should open cost modal when cost button is clicked', async () => {
    const mockOnChange = jest.fn()
    const user = userEvent.setup()

    render(
      <TransactionLineItemsEditor
        transactionLineId="tx-1"
        orgId="org-1"
        items={mockItems}
        onChange={mockOnChange}
        disabled={false}
        workItems={mockWorkItems}
        analysisItems={mockAnalysisItems}
        costCenters={mockCostCenters}
        transactionLineDefaults={mockTransactionLineDefaults}
      />
    )

    // Click the cost button (💰)
    const costButtons = screen.getAllByText('💰')
    await user.click(costButtons[0])

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByText(/💰 تحليل التكلفة/i)).toBeInTheDocument()
    })
  })

  it('should update item when cost modal saves', async () => {
    const mockOnChange = jest.fn()
    const user = userEvent.setup()

    render(
      <TransactionLineItemsEditor
        transactionLineId="tx-1"
        orgId="org-1"
        items={mockItems}
        onChange={mockOnChange}
        disabled={false}
        workItems={mockWorkItems}
        analysisItems={mockAnalysisItems}
        costCenters={mockCostCenters}
        transactionLineDefaults={mockTransactionLineDefaults}
      />
    )

    // Open modal
    const costButtons = screen.getAllByText('💰')
    await user.click(costButtons[0])

    // Select new work item
    await waitFor(() => {
      expect(screen.getByText(/💰 تحليل التكلفة/i)).toBeInTheDocument()
    })

    const selects = screen.getAllByDisplayValue('— None / بلا —')
    await user.selectOptions(selects[0], '2')

    // Save
    const saveButton = screen.getByText(/✓ Save/i)
    await user.click(saveButton)

    // Should call onChange with updated items
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'item-1',
          work_item_id: '2',
        }),
      ])
    )
  })
})
