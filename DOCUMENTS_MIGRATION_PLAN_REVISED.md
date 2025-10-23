# Documents Migration: Unified Model with Transaction Lines Support

## Overview
Keep the unified documents model and link documents to **transaction_lines** (and transactions) via a `document_associations` junction table. This avoids FK bloat in the documents table and supports linking documents to ANY entity type (invoices, POs, payments, etc.) in the future.

### Why This Approach?
- ✅ **No FK columns needed in documents** - supports any entity type
- ✅ **Flexible linking** - one document can link to multiple entities
- ✅ **Scalable** - add new entity types (invoices, POs) without schema changes
- ✅ **Clean UI** - still managed through UI (unchanged)
- ✅ **Maintains existing documents** - backwards compatible

---

## Phase 1: Database Schema Migration

### Step 1: Run SQL Migration
Execute the migration SQL in Supabase SQL Editor:
```sql
-- See: migrations/001_add_transaction_line_to_documents.sql
```

This will:
- ✅ Create `document_associations` junction table
- ✅ Add indexes for performance (entity lookups)
- ✅ Create helper views for document aggregation
- ✅ Support multiple entity types (transaction, transaction_line, invoice, purchase_order, payment)

### Step 2: Verify Migration
```sql
-- Check the new table exists
SELECT * FROM document_associations LIMIT 5;

-- View the helper views
SELECT * FROM v_transaction_documents LIMIT 5;
SELECT * FROM v_transaction_line_documents LIMIT 5;
```

---

## Phase 2: Update React Services

### File: `src/services/documents.ts`

**NEW FUNCTIONS** (using document_associations table):

1. **Link document to entity** (transaction, transaction_line, etc)
   ```typescript
   export async function linkDocumentToEntity(
     documentId: string,
     entityType: 'transaction' | 'transaction_line' | 'invoice' | 'purchase_order' | 'payment',
     entityId: string
   ): Promise<void> {
     const { error } = await supabase
       .from('document_associations')
       .insert({ document_id: documentId, entity_type: entityType, entity_id: entityId })
     if (error && !error.message.includes('duplicate')) throw error
     // Silently ignore duplicates
   }
   ```

2. **Get documents for entity**
   ```typescript
   export async function getEntityDocuments(
     entityType: 'transaction' | 'transaction_line' | 'invoice' | 'purchase_order' | 'payment',
     entityId: string
   ): Promise<Document[]> {
     const { data, error } = await supabase
       .from('document_associations')
       .select('documents(*)')
       .eq('entity_type', entityType)
       .eq('entity_id', entityId)
       .order('sort_order', { ascending: true })
     if (error) throw error
     return data?.map((d: any) => d.documents) || []
   }
   ```

3. **Get document count for entity**
   ```typescript
   export async function getEntityDocumentCount(
     entityType: 'transaction' | 'transaction_line' | 'invoice' | 'purchase_order' | 'payment',
     entityId: string
   ): Promise<number> {
     const { count, error } = await supabase
       .from('document_associations')
       .select('*', { count: 'exact' })
       .eq('entity_type', entityType)
       .eq('entity_id', entityId)
     if (error) throw error
     return count || 0
   }
   ```

4. **Unlink document from entity**
   ```typescript
   export async function unlinkDocumentFromEntity(
     documentId: string,
     entityType: 'transaction' | 'transaction_line' | 'invoice' | 'purchase_order' | 'payment',
     entityId: string
   ): Promise<void> {
     const { error } = await supabase
       .from('document_associations')
       .delete()
       .eq('document_id', documentId)
       .eq('entity_type', entityType)
       .eq('entity_id', entityId)
     if (error) throw error
   }
   ```

5. **Convenience functions for transaction lines**
   ```typescript
   // Helper aliases for transaction lines
   export const linkDocumentToTransactionLine = (documentId: string, lineId: string) =>
     linkDocumentToEntity(documentId, 'transaction_line', lineId)

   export const getTransactionLineDocuments = (lineId: string) =>
     getEntityDocuments('transaction_line', lineId)

   export const getTransactionLineDocumentCount = (lineId: string) =>
     getEntityDocumentCount('transaction_line', lineId)
   ```

---

## Phase 3: Update UI Components (Only Move Column Location)

### File: `src/pages/Transactions/Transactions.tsx`

**Changes needed:**

1. **Remove documents column from headers table defaultColumns**
   ```typescript
   // REMOVE this from defaultColumns:
   // { key: 'documents', label: 'المستندات', visible: true, width: 130, type: 'actions' }
   ```

2. **Add documents column to lines table defaultLineColumns**
   ```typescript
   // ADD to defaultLineColumns:
   { key: 'documents', label: 'المستندات', visible: true, width: 120, type: 'actions', resizable: true }
   ```

3. **Move renderCell logic from headers to lines**
   ```typescript
   // REMOVE from TransactionsHeaderTable renderCell:
   if (column.key === 'documents') { ... }

   // ADD to TransactionLinesTable renderCell:
   if (column.key === 'documents') {
     return (
       <button onClick={() => onOpenDocuments(row.original)}>
         📎 المستندات
       </button>
     )
   }
   ```

---

## Phase 4: Update Component Props

### File: `src/pages/Transactions/TransactionLinesTable.tsx`

**Add documents handler prop:**

```typescript
interface TransactionLinesTableProps {
  // ... existing props
  onOpenDocuments: (line: TransactionLine) => void
}
```

**Update Transactions.tsx to pass the handler:**

```typescript
<TransactionLinesTable
  // ... other props
  onOpenDocuments={(line) => {
    setDocumentsFor({ transactionLineId: line.id })
    setDocumentsOpen(true)
  }}
/>
```

---

## Phase 5: Update Documents Panel

### File: `src/components/documents/AttachDocumentsPanel.tsx`

**Update to use transaction_line_id:**

```typescript
interface AttachDocumentsPanelProps {
  transactionLineId?: string  // NEW - the line ID to attach docs to
  // ... other existing props
}

// Update useEffect to fetch line documents
useEffect(() => {
  if (!transactionLineId) {
    setDocuments([])
    return
  }
  getTransactionLineDocuments(transactionLineId).then(setDocuments)
}, [transactionLineId])

// Update attach function
const handleAttachDocument = async (documentId: string) => {
  if (!transactionLineId) return
  await linkDocumentToTransactionLine(documentId, transactionLineId)
  // Refresh document list
  const updated = await getTransactionLineDocuments(transactionLineId)
  setDocuments(updated)
}
```

---

## Phase 6: Update State in Transactions.tsx

**Add state for line document counts:**

```typescript
const [lineDocumentCounts, setLineDocumentCounts] = useState<Record<string, number>>({})

// Fetch document counts when lines change
useEffect(() => {
  const fetchDocCounts = async () => {
    if (!transactionLines.length) {
      setLineDocumentCounts({})
      return
    }
    
    const counts: Record<string, number> = {}
    await Promise.all(
      transactionLines.map(async (line) => {
        const count = await getTransactionLineDocumentCount(line.id)
        counts[line.id] = count
      })
    )
    setLineDocumentCounts(counts)
  }
  
  fetchDocCounts()
}, [transactionLines])
```

**Pass counts to lines table:**

```typescript
<TransactionLinesTable
  // ... other props
  documentCounts={lineDocumentCounts}
/>
```

---

## Phase 7: No Data Migration Required

Since we're using a junction table, **no existing data migration is needed**. The old documents system continues to work, and new documents get linked via the `document_associations` table.

When users attach documents to lines going forward, they'll use the new system automatically.

---

## Summary

| Phase | Task | Time | Impact |
|-------|------|------|--------|
| 1 | Database schema (junction table) | 10 min | ✅ Backwards compatible |
| 2 | Add document service functions | 20 min | ✅ New functions only |
| 3 | Move documents column location | 15 min | ✅ UI change only |
| 4 | Update component props | 10 min | ✅ Minor prop additions |
| 5 | Update documents panel | 15 min | ✅ Change line ID source |
| 6 | Add document count state | 10 min | ✅ Performance tracking |
| **TOTAL** | | **~80 min** | ✅ **Zero breaking changes** |

---

## Benefits of This Approach

1. **No FK Pollution** - Documents table stays clean
2. **Flexible Linking** - One document can link to transaction + its lines
3. **Extensible** - Ready for invoices, POs, payments, etc.
4. **UI Driven** - All associations managed through React UI
5. **Backwards Compatible** - Existing documents remain functional
6. **Performance** - Indexed lookups on entity type/ID
7. **Clean Migration** - No complex data migration required

## Ready to Start?

The revised approach maintains your original unified documents philosophy while adding the flexibility to link documents to transaction lines through UI-driven associations. No breaking changes, minimal effort, maximum flexibility.

Should I start with Phase 1 (database migration) or would you prefer to review the approach first?