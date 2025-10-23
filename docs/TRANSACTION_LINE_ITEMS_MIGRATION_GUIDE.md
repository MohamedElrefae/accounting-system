# Transaction Line Items Migration Guide

## Overview
This guide documents the migration of `transaction_line_items` to be linked to `transaction_lines` instead of just `transactions`, enabling document attachments and cost analysis at the line item level.

## What Changed

### Database Schema
1. Added `transaction_line_id` column to `transaction_line_items` table
2. Added foreign key constraint to `transaction_lines`
3. Created view `v_transaction_line_items_with_context` for easy querying
4. Updated `document_associations` to support `transaction_line_items` entity type

### Service Layer (`src/services/transaction-line-items.ts`)
- Updated `DbTxLineItem` interface to include `transaction_line_id`
- Updated `EditableTxLineItem` interface to include `transaction_line_id`
- Added `listByTransactionLine(transactionLineId)` method
- Added `countByTransactionLine(transactionLineId)` method

### Document Service (`src/services/documents.ts`)
- Added `'transaction_line_items'` to `EntityType` union
- Added `linkDocumentToTransactionLineItems()` convenience function
- Added `unlinkDocumentFromTransactionLineItems()` convenience function
- Added `getTransactionLineItemsDocuments()` function
- Added `getTransactionLineItemsDocumentCount()` function

### UI Components
- Updated `AttachDocumentsPanel` to accept `transactionLineItemId` prop
- Updated `TransactionLinesTable` to display document counts per line
- Updated entity type resolution to prioritize `transaction_line_items` > `transaction_lines` > `transactions`

## Migration Steps

### Step 1: Apply Database Migrations
Run both SQL migration files in Supabase SQL Editor (in order):

1. `migrations/2025-10-19_migrate_line_items_to_transaction_lines.sql`
   - Adds `transaction_line_id` column
   - Creates indexes
   - Populates relationship data
   - Creates helper view

2. `migrations/2025-10-19_update_document_associations_constraints.sql`
   - Updates CHECK constraint to allow `'transaction_line_items'` entity type
   - Creates optimized index for transaction_line_items lookups

### Step 2: Deploy Code Changes
Deploy the following updated files:

**Backend/Service:**
- `src/services/transaction-line-items.ts` - Updated interfaces and methods
- `src/services/documents.ts` - New entity type and helper functions

**Frontend:**
- `src/components/documents/AttachDocumentsPanel.tsx` - Support for transaction_line_items
- `src/pages/Transactions/TransactionLinesTable.tsx` - Document count display

### Step 3: Verify Migration

#### Database Verification Queries
```sql
-- Check migration success - should show all records mapped
SELECT 
  COUNT(*) as total_line_items,
  COUNT(transaction_line_id) as mapped_to_lines,
  COUNT(transaction_line_id) FILTER (WHERE transaction_line_id IS NULL) as unmapped,
  COUNT(transaction_line_id) * 100.0 / COUNT(*) as success_percentage
FROM public.transaction_line_items;

-- Verify no orphaned records
SELECT COUNT(*) as orphaned_records
FROM public.transaction_line_items tli
WHERE transaction_line_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.transaction_lines tl 
    WHERE tl.id = tli.transaction_line_id
  );

-- Sample data verification
SELECT 
  tli.id,
  tli.transaction_line_id,
  tli.transaction_id,
  tli.line_number,
  tl.line_no,
  tl.transaction_id as tx_from_line
FROM public.transaction_line_items tli
LEFT JOIN public.transaction_lines tl ON tli.transaction_line_id = tl.id
ORDER BY tli.created_at DESC
LIMIT 20;
```

#### Frontend Verification Checklist
- [ ] Browse to a transaction with line items
- [ ] Verify transaction line items display correctly
- [ ] Click document icon on a transaction line to open document panel
- [ ] Upload/attach a document to a line item
- [ ] Verify document appears in line item's document list
- [ ] Check document count badge displays on transaction line
- [ ] Verify removing document works correctly
- [ ] Test with multiple line items and documents
- [ ] Verify no console errors

### Step 4: Test Document Linking
```javascript
// Test linking documents to transaction line items
const docId = '...'; // UUID of a document
const lineItemId = '...'; // UUID of a transaction_line_item

// Link document to transaction line item
await linkDocumentToTransactionLineItems(docId, lineItemId);

// Get documents for line item
const docs = await getTransactionLineItemsDocuments(lineItemId);
console.log('Documents:', docs);

// Get count
const count = await getTransactionLineItemsDocumentCount(lineItemId);
console.log('Document count:', count);

// Unlink
await unlinkDocumentFromTransactionLineItems(docId, lineItemId);
```

## Backward Compatibility

### What's Maintained
- `transaction_id` column remains in `transaction_line_items`
- Existing queries using `transaction_id` still work
- `listByTransaction()` method unchanged
- All existing functionality preserved

### What's New
- `transaction_line_id` is now the primary link (where applicable)
- New methods for querying by `transaction_line_id`
- Document associations via `document_associations` table

## Performance Considerations

### Indexes Created
- `idx_tli_transaction_line_id` - Fast lookup by transaction_line_id
- `idx_tli_tx_line_composite` - Combined query performance
- `idx_doc_assoc_line_items` - Document lookups per line item

### Query Optimization
- Use `listByTransactionLine()` when querying by line
- Document associations use indexed lookups
- View `v_transaction_line_items_with_context` joins pre-optimized

## Rollback Plan (if needed)

If issues occur, rollback is available:

```sql
-- Rollback database changes
ALTER TABLE public.transaction_line_items 
DROP CONSTRAINT fk_tli_transaction_line;

ALTER TABLE public.transaction_line_items 
DROP COLUMN transaction_line_id;

DROP VIEW IF EXISTS v_transaction_line_items_with_context;

-- Revert document_associations constraint
ALTER TABLE public.document_associations 
DROP CONSTRAINT valid_entity_type;

ALTER TABLE public.document_associations
ADD CONSTRAINT valid_entity_type CHECK (
  entity_type IN ('transaction', 'transaction_line', 'invoice', 'purchase_order', 'payment')
);
```

Then revert code changes by checking out previous commits.

## Troubleshooting

### Issue: "Unknown entity_type: transaction_line_items"
**Cause:** Database migrations not applied
**Solution:** Run migration `2025-10-19_update_document_associations_constraints.sql`

### Issue: Document linking fails
**Cause:** `transaction_line_id` is NULL
**Solution:** Ensure transaction line item was created with associated transaction line
**Check:** `SELECT transaction_line_id FROM transaction_line_items WHERE id = '...'`

### Issue: Document count shows 0 but documents exist
**Cause:** Documents linked to old entity type
**Solution:** Check if documents are linked to 'transaction_line' or 'transaction' instead of 'transaction_line_items'
**Query:** `SELECT * FROM document_associations WHERE entity_type IN ('transaction', 'transaction_line') AND entity_id = '...'`

## FAQ

**Q: Can I still query by transaction_id?**
A: Yes, `transaction_id` column remains and all existing queries work. New code should use `transaction_line_id` when available.

**Q: Will this affect existing documents?**
A: No. Existing document links to transactions/lines remain valid. New documents created after migration will link to transaction_line_items.

**Q: Do I need to re-link existing documents?**
A: No, existing links are preserved. New document linking uses the new transaction_line_items entity type.

**Q: What about transaction line items without transaction_line_id?**
A: They may exist if created before migration. You can migrate them manually if needed.

## Support

For issues or questions about this migration:
1. Check the troubleshooting section above
2. Verify database migrations ran successfully
3. Check browser console for errors
4. Review application logs
