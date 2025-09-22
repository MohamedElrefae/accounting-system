// This component has been removed as part of the migration from line_items to transaction_line_items
// This component is now part of the enhanced TransactionLineItemsSection

import React from 'react'

// DEPRECATED: This component has been integrated into TransactionLineItemsSection
// The enhanced transaction line items service provides all tree management functionality

const LineItemsTreeManager: React.FC = () => {
  return (
    <div className="deprecated-notice">
      <p>This component has been deprecated.</p>
      <p>Tree management functionality is now integrated into TransactionLineItemsSection.</p>
    </div>
  )
}

export default LineItemsTreeManager;
