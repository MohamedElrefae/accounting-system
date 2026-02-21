// Simple test to verify the confirmation dialog integration
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TransactionConfirmationDialog from '../src/components/Transactions/TransactionConfirmationDialog'

describe('TransactionConfirmationDialog', () => {
  const mockOnAction = jest.fn()
  const mockOnClose = jest.fn()

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    action: 'submit' as const,
    transactionData: {
      description: 'Test Transaction',
      entry_date: '2024-01-01',
      totalAmount: 1000,
      linesCount: 2,
      organizationName: 'Test Org',
      projectName: 'Test Project'
    },
    onAction: mockOnAction
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly for submit action', () => {
    render(<TransactionConfirmationDialog {...defaultProps} />)
    
    expect(screen.getByText('تم إرسال المعاملة للاعتماد بنجاح!')).toBeInTheDocument()
    expect(screen.getByText('Test Transaction')).toBeInTheDocument()
    expect(screen.getByText('1,000 ريال')).toBeInTheDocument()
    expect(screen.getByText('Test Org')).toBeInTheDocument()
    expect(screen.getByText('Test Project')).toBeInTheDocument()
  })

  it('renders correctly for draft action', () => {
    render(<TransactionConfirmationDialog {...defaultProps} action="draft" />)
    
    expect(screen.getByText('تم حفظ المعاملة كمسودة بنجاح!')).toBeInTheDocument()
    expect(screen.getByText('حفظ كمسودة')).toBeInTheDocument()
  })

  it('calls onAction with close when close button is clicked', async () => {
    render(<TransactionConfirmationDialog {...defaultProps} />)
    
    const closeButton = screen.getByText('إغلاق')
    fireEvent.click(closeButton)
    
    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledWith('close')
    })
  })

  it('calls onAction with new when new transaction button is clicked', async () => {
    render(<TransactionConfirmationDialog {...defaultProps} />)
    
    const newButton = screen.getByText('معاملة جديدة')
    fireEvent.click(newButton)
    
    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledWith('new')
    })
  })

  it('shows processing state correctly', () => {
    render(<TransactionConfirmationDialog {...defaultProps} isProcessing={true} />)
    
    expect(screen.getByText('جاري معالجة الطلب...')).toBeInTheDocument()
    expect(screen.getByText('إغلاق')).toBeDisabled()
    expect(screen.getByText('معاملة جديدة')).toBeDisabled()
  })
})
