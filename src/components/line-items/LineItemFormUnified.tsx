// This component has been removed as part of the migration from line_items to transaction_line_items
// Use the new TransactionLineItemsSection component instead

import React from 'react'

// DEPRECATED: This component has been replaced by TransactionLineItemsSection
// The line_items table and all related UI components have been migrated to transaction_line_items

const LineItemFormUnified: React.FC = () => {
  return (
    <div className="deprecated-notice">
      <p>This component has been deprecated.</p>
      <p>Please use TransactionLineItemsSection instead.</p>
    </div>
  )
}

export default LineItemFormUnified
