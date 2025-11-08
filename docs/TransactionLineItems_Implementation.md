# Transaction Line Items Catalog Implementation

## Overview
This document outlines the complete implementation of the **"بنود التكلفة التفصيلية"** (Detailed Cost Items) feature, which provides a master catalog management system for transaction line item templates.

## Architecture

### 1. Database Layer
- **Table**: `transaction_line_items` (existing)
- **Key Concept**: Templates are records where `transaction_id IS NULL`
- **Hierarchical Structure**: Supports up to 4 levels with numeric codes (1000 → 1100 → 1110 → 1111)
- **Code Generation**: Automatic via `fn_get_next_line_item_code()` function

### 2. Service Layer
**File**: `src/services/transaction-line-items-enhanced.ts`

#### New Service Class: `TransactionLineItemsCatalogService`
```typescript
class TransactionLineItemsCatalogService {
  // CRUD operations for catalog templates
  getCatalogItems(organizationId: string, activeOnly?: boolean)
  getCatalogStats(organizationId: string)
  createCatalogItem(organizationId: string, data: CreateCatalogItemRequest)
  updateCatalogItem(id: string, organizationId: string, data: UpdateCatalogItemRequest)
  deleteCatalogItem(id: string, organizationId: string)
  
  // Code generation and hierarchy
  getNextCatalogItemCode(organizationId: string, parentId?: string)
  buildCatalogTree(organizationId: string)
  
  // Integration helpers
  suggestCatalogItems(organizationId: string, query: string)
  getCatalogItemUsage(id: string)
}
```

### 3. UI Layer

#### Main Page Component
**File**: `src/pages/MainData/TransactionLineItems.tsx`
- Full-featured catalog management interface
- Tree and List views with tabs
- Search, filtering, and export capabilities  
- CRUD dialogs with validation
- Permission-based access control
- Bilingual support (English/Arabic)

#### Styles
**File**: `src/pages/MainData/TransactionLineItems.module.css`
- RTL layout support
- Consistent with existing CostCenters styling
- Catalog-specific visual enhancements

### 4. Reusable Components

#### Template Selector Component
**File**: `src/components/TransactionLineItemSelector/TransactionLineItemSelector.tsx`

**Features**:
- Hierarchical tree display with expand/collapse
- Multi-select and single-select modes
- Real-time quantity and price editing
- Level-based filtering
- Search functionality
- Total calculation display

**Props Interface**:
```typescript
interface TransactionLineItemSelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (items: SelectedLineItem[]) => void
  orgId: string
  selectedItems?: SelectedLineItem[]
  multiSelect?: boolean
  title?: string
  allowQuantityEdit?: boolean
  allowPriceEdit?: boolean
}
```

#### Custom Hook
**File**: `src/hooks/useTransactionLineItemSelector.ts`
- State management for selected items
- Quantity/price update handlers
- Total calculations
- Easy integration into transaction forms

### 5. Navigation Integration
**File**: `src/App.tsx`
- Route: `/main-data/transaction-line-items`
- Permission: `transaction_line_items.read`
- Menu integration already completed

## Usage Examples

### 1. Basic Catalog Management
Users can access the catalog via the main navigation menu to:
- Create hierarchical cost item templates
- Edit existing templates with quantity and pricing
- Organize items in a 4-level hierarchy (1000 → 1100 → 1110 → 1111)
- Search and filter items
- Export data to Excel/CSV

### 2. Transaction Form Integration
```typescript
import TransactionLineItemSelector, { SelectedLineItem } from '../components/TransactionLineItemSelector'
import { useTransactionLineItemSelector } from '../hooks/useTransactionLineItemSelector'

const TransactionForm = ({ orgId }) => {
  const {
    isOpen,
    selectedItems,
    openSelector,
    closeSelector,
    handleSelection,
    getTotalAmount
  } = useTransactionLineItemSelector()

  const handleSaveTransaction = () => {
    // Convert selected templates to actual transaction line items
    const lineItems = selectedItems.map(item => ({
      item_code: item.item_code,
      item_name: item.item_name,
      quantity: item.quantity_selected,
      unit_price: item.unit_price_override,
      line_total: item.total_amount,
      template_id: item.id
    }))
    
    // Save transaction with line items
    saveTransaction({ lineItems, total: getTotalAmount() })
  }

  return (
    <>
      <Button onClick={openSelector}>Select Line Items</Button>
      
      <TransactionLineItemSelector
        open={isOpen}
        onClose={closeSelector}
        onSelect={handleSelection}
        orgId={orgId}
        multiSelect={true}
        allowQuantityEdit={true}
      />
    </>
  )
}
```

## Database Queries

### Schema Inspection
Use the provided SQL queries in `database-queries/transaction_line_items_schema.sql` to:
1. Get complete table structure and indexes
2. Analyze hierarchical patterns
3. Find next available codes
4. Verify data integrity
5. Check performance

### Key Queries for Copy/Paste:

#### Get Table Schema
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items' 
ORDER BY ordinal_position;
```

#### Verify Implementation Success
```sql
-- Check catalog templates created
SELECT COUNT(*) as template_count
FROM transaction_line_items 
WHERE transaction_id IS NULL;

-- Check hierarchical structure
SELECT 
    org_id,
    CASE 
        WHEN item_code::integer % 1000 = 0 THEN 'Level 1'
        WHEN item_code::integer % 100 = 0 THEN 'Level 2' 
        WHEN item_code::integer % 10 = 0 THEN 'Level 3'
        ELSE 'Level 4'
    END as level,
    COUNT(*) as count
FROM transaction_line_items
WHERE transaction_id IS NULL
GROUP BY org_id, level
ORDER BY org_id, level;
```

## Integration Benefits

1. **Consistency**: Enforces standardized cost item definitions across transactions
2. **Efficiency**: Reduces manual entry through template selection
3. **Accuracy**: Eliminates typos and inconsistent naming
4. **Reporting**: Enables aggregated cost analysis across templates
5. **Scalability**: Hierarchical organization supports complex cost structures
6. **Multilingual**: Arabic and English names for international operations

## File Structure Summary

```
src/
├── pages/MainData/
│   ├── TransactionLineItems.tsx          # Main catalog page
│   └── TransactionLineItems.module.css   # Styling
├── components/TransactionLineItemSelector/
│   ├── TransactionLineItemSelector.tsx   # Reusable selector component
│   ├── ExampleUsage.tsx                  # Usage examples
│   └── index.ts                          # Exports
├── hooks/
│   └── useTransactionLineItemSelector.ts # Custom hook
├── services/
│   └── transaction-line-items-enhanced.ts # Extended with catalog service
└── App.tsx                               # Updated with routing

database-queries/
└── transaction_line_items_schema.sql     # Schema inspection queries

docs/
└── TransactionLineItems_Implementation.md # This documentation
```

## Next Steps

1. **Test the implementation** by navigating to `/main-data/transaction-line-items`
2. **Create initial catalog templates** for your organization
3. **Integrate the selector component** into transaction forms
4. **Run the database queries** to verify schema and data integrity
5. **Customize the UI** based on user feedback and specific requirements

## Support

For technical issues or feature requests, refer to:
- The database schema queries for troubleshooting
- The example usage component for integration patterns
- The custom hook for state management guidance
- This documentation for comprehensive feature overview