import React, { useState } from 'react'
import { 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  List, 
  ListItem, 
  ListItemText,
  Box,
  Chip,
  IconButton,
  TextField
} from '@mui/material'
import { Delete as DeleteIcon } from '@mui/icons-material'
import TransactionLineItemSelector from './TransactionLineItemSelector'
import { useTransactionLineItemSelector } from '../../hooks/useTransactionLineItemSelector'
import type { SelectedLineItem } from './TransactionLineItemSelector'

interface ExampleUsageProps {
  orgId: string
}

const TransactionLineItemSelectorExample: React.FC<ExampleUsageProps> = ({ orgId }) => {
  const {
    isOpen,
    selectedItems,
    openSelector,
    closeSelector,
    handleSelection,
    clearSelection,
    removeItem,
    updateItemQuantity,
    updateItemPrice,
    getTotalAmount,
    getTotalQuantity,
  } = useTransactionLineItemSelector()

  const [allowQuantityEdit, setAllowQuantityEdit] = useState(true)
  const [allowPriceEdit, setAllowPriceEdit] = useState(false)
  const [multiSelect, setMultiSelect] = useState(true)

  const handleSaveTransaction = () => {
    // Example: Convert selected items to transaction line items format
    const transactionLineItems = selectedItems.map(item => ({
      id: undefined, // New line item
      item_code: item.item_code,
      item_name: item.item_name,
      item_name_ar: item.item_name_ar,
      description: item.description,
      quantity: item.quantity_selected,
      unit_price: item.unit_price_override,
      unit_of_measure: item.unit_of_measure,
      line_total: item.total_amount,
      template_id: item.id, // Reference to the template
    }))

    console.log('Transaction Line Items to save:', transactionLineItems)
    alert(`Ready to save ${transactionLineItems.length} line items with total: ${getTotalAmount().toFixed(2)}`)
  }

  return (
    <div style={{ padding: '1rem' }}>
      <Typography variant="h5" gutterBottom>
        Transaction Line Item Selector Example
      </Typography>

      <Box display="flex" gap={2} mb={2}>
        <Button variant="contained" onClick={openSelector}>
          Select Line Items
        </Button>
        <Button variant="outlined" onClick={clearSelection} disabled={selectedItems.length === 0}>
          Clear All
        </Button>
        <Button 
          variant="contained" 
          color="success" 
          onClick={handleSaveTransaction}
          disabled={selectedItems.length === 0}
        >
          Save Transaction ({selectedItems.length} items)
        </Button>
      </Box>

      {/* Configuration Options */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Selector Configuration</Typography>
          <Box display="flex" gap={2} alignItems="center">
            <label>
              <input 
                type="checkbox" 
                checked={allowQuantityEdit} 
                onChange={(e) => setAllowQuantityEdit(e.target.checked)} 
              />
              Allow Quantity Edit
            </label>
            <label>
              <input 
                type="checkbox" 
                checked={allowPriceEdit} 
                onChange={(e) => setAllowPriceEdit(e.target.checked)} 
              />
              Allow Price Edit
            </label>
            <label>
              <input 
                type="checkbox" 
                checked={multiSelect} 
                onChange={(e) => setMultiSelect(e.target.checked)} 
              />
              Multi-Select
            </label>
          </Box>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Selected Items ({selectedItems.length})
            </Typography>
            <Box display="flex" gap={1}>
              <Chip 
                label={`Total Qty: ${getTotalQuantity()}`} 
                color="primary" 
                variant="outlined" 
              />
              <Chip 
                label={`Total Amount: ${getTotalAmount().toFixed(2)}`} 
                color="primary" 
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Selected Items List */}
      {selectedItems.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Selected Line Items</Typography>
            <List>
              {selectedItems.map((item: SelectedLineItem) => (
                <ListItem 
                  key={item.id}
                  secondaryAction={
                    <Box display="flex" gap={1} alignItems="center">
                      <TextField
                        size="small"
                        type="number"
                        label="Qty"
                        value={item.quantity_selected}
                        onChange={(e) => updateItemQuantity(item.id, parseFloat(e.target.value) || 0)}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ width: '80px' }}
                      />
                      <TextField
                        size="small"
                        type="number"
                        label="Price"
                        value={item.unit_price_override}
                        onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ width: '100px' }}
                      />
                      <Chip
                        label={item.total_amount.toFixed(2)}
                        color="primary"
                        size="small"
                      />
                      <IconButton 
                        edge="end" 
                        onClick={() => removeItem(item.id)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Box display="flex" gap={1} alignItems="center">
                        <Typography variant="body1">
                          {item.item_code} - {item.item_name}
                        </Typography>
                        <Chip 
                          label={`L${item.level}`} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        {item.item_name_ar && (
                          <Typography variant="body2" color="text.secondary">
                            {item.item_name_ar}
                          </Typography>
                        )}
                        <Typography variant="caption">
                          Unit: {item.unit_of_measure || 'piece'} | 
                          Template Qty: {item.quantity} | 
                          Template Price: {item.unit_price}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* The Selector Dialog */}
      <TransactionLineItemSelector
        open={isOpen}
        onClose={closeSelector}
        onSelect={handleSelection}
        orgId={orgId}
        selectedItems={selectedItems}
        multiSelect={multiSelect}
        allowQuantityEdit={allowQuantityEdit}
        allowPriceEdit={allowPriceEdit}
        title="Select Transaction Line Items / اختر بنود المعاملة"
      />
    </div>
  )
}

export default TransactionLineItemSelectorExample