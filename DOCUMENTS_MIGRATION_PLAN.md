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

**Changes needed:**

1. **Update `attachDocumentToTransaction`** → `attachDocumentToTransactionLine`
   ```typescript
   // OLD: attachDocumentToTransaction(transactionId, documentId)
   // NEW: attachDocumentToTransactionLine(transactionLineId, documentId)
   
   export async function attachDocumentToTransactionLine(
     transactionLineId: string,
     documentId: string
   ): Promise<void> {
     const { error } = await supabase
       .from('documents')
       .update({ transaction_line_id: transactionLineId })
       .eq('id', documentId)
     if (error) throw error
   }
   ```

2. **Update `getTransactionDocuments`** → `getTransactionLineDocuments`
   ```typescript
   // OLD: Fetch documents for entire transaction
   // NEW: Fetch documents for specific transaction_line
   
   export async function getTransactionLineDocuments(
     transactionLineId: string
   ): Promise<Document[]> {
     const { data, error } = await supabase
       .from('documents')
       .select('*')
       .eq('transaction_line_id', transactionLineId)
     if (error) throw error
     return data || []
   }
   ```

3. **Add new function** `getTransactionDocumentsCount`
   ```typescript
   // Return total document count for entire transaction
   export async function getTransactionDocumentsCount(
     transactionId: string
   ): Promise<number> {
     const { data, error } = await supabase
       .from('v_transaction_documents')
       .select('total_document_count')
       .eq('transaction_id', transactionId)
       .single()
     if (error) throw error
     return data?.total_document_count || 0
   }
   ```

4. **Add new function** `removeDocumentFromLine`
   ```typescript
   export async function removeDocumentFromLine(
     documentId: string
   ): Promise<void> {
     const { error } = await supabase
       .from('documents')
       .update({ transaction_line_id: null })
       .eq('id', documentId)
     if (error) throw error
   }
   ```

---

## Phase 3: Update UI Components

### File: `src/pages/Transactions/Transactions.tsx`

**Changes needed:**

1. **Remove documents column from headers table** (TransactionsHeaderTable)
   - Remove from `defaultColumns` array
   - Remove `column.key === 'documents'` renderCell handler

2. **Add documents button to headers table** (show count of all docs)
   ```typescript
   // NEW: Add button that shows total document count for transaction
   if (column.key === 'documents_count') {
     return (
       <button onClick={() => openDocumentsPanel(row.original)}>
         📎 {row.original.documents_count || 0}
       </button>
     )
   }
   ```

3. **Add documents column to lines table** (TransactionLinesTable)
   - Add to `defaultLineColumns` array:
   ```typescript
   { 
     key: 'documents', 
     label: 'المستندات', 
     visible: true, 
     width: 120, 
     type: 'actions', 
     resizable: true 
   }
   ```

4. **Update TransactionLinesTable renderCell** to handle documents
   ```typescript
   if (column.key === 'documents') {
     return (
       <button onClick={() => onOpenDocuments(row.original)}>
         📎 عرض المستندات
       </button>
     )
   }
   ```

---

## Phase 4: Update Component Props & Handlers

### File: `src/pages/Transactions/TransactionLinesTable.tsx`

**Add new props:**

```typescript
interface TransactionLinesTableProps {
  // ... existing props
  onOpenDocuments: (line: TransactionLine) => void
  documentsCountByLine?: Record<string, number>
}
```

**Add render handler:**

```typescript
// In renderCell function:
if (column.key === 'documents') {
  const count = documentsCountByLine?.[row.original.id] || 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span>{count}</span>
      <button 
        onClick={() => onOpenDocuments(row.original)}
        className="ultimate-btn ultimate-btn-edit"
      >
        📎
      </button>
    </div>
  )
}
```

---

## Phase 5: Update Documents Panel

### File: `src/components/documents/AttachDocumentsPanel.tsx`

**Changes needed:**

1. **Update props to accept transaction_line_id instead of transaction_id**
   ```typescript
   interface AttachDocumentsPanelProps {
     transactionLineId?: string  // NEW
     transactionId?: string       // DEPRECATED - for reference only
     // ... other props
   }
   ```

2. **Update attach function**
   ```typescript
   const handleAttachDocument = async (documentId: string) => {
     if (!transactionLineId) return
     await attachDocumentToTransactionLine(transactionLineId, documentId)
     // Refresh list
   }
   ```

3. **Update fetch function**
   ```typescript
   useEffect(() => {
     if (!transactionLineId) {
       setDocuments([])
       return
     }
     getTransactionLineDocuments(transactionLineId).then(setDocuments)
   }, [transactionLineId])
   ```

---

## Phase 6: Update State Management in Transactions.tsx

### Add state for tracking line documents:

```typescript
const [lineDocumentsCount, setLineDocumentsCount] = useState<Record<string, number>>({})

// Fetch when lines are loaded
useEffect(() => {
  const fetchDocumentCounts = async () => {
    if (!transactionLines.length) return
    
    const counts: Record<string, number> = {}
    for (const line of transactionLines) {
      const count = await getTransactionLineDocumentsCount(line.id)
      counts[line.id] = count
    }
    setLineDocumentsCount(counts)
  }
  
  fetchDocumentCounts()
}, [transactionLines])
```

### Update handler:

```typescript
<TransactionLinesTable
  // ... other props
  onOpenDocuments={(line) => {
    setDocumentsFor({ ...line, transactionLineId: line.id })
    setDocumentsOpen(true)
  }}
  documentsCountByLine={lineDocumentsCount}
/>
```

---

## Phase 7: Data Migration (One-time)

### Migrate existing documents from transactions to their first line:

```sql
-- Create temporary mapping of documents to first line of each transaction
UPDATE public.documents d
SET transaction_line_id = (
  SELECT tl.id 
  FROM public.transaction_lines tl
  WHERE tl.transaction_id = d.project_id  -- Assuming documents.project_id contains tx id
  ORDER BY tl.line_no ASC
  LIMIT 1
)
WHERE transaction_line_id IS NULL
  AND project_id IS NOT NULL;

-- Verify migration
SELECT 
  COUNT(*) total_docs,
  COUNT(*) FILTER (WHERE transaction_line_id IS NOT NULL) linked_docs,
  COUNT(*) FILTER (WHERE transaction_line_id IS NULL) unlinked_docs
FROM public.documents;
```

---

## Phase 8: Testing Checklist

- [ ] Schema migration runs without errors
- [ ] New columns/views exist and accessible
- [ ] Service functions work with transaction_line_id
- [ ] Documents can be attached to specific lines
- [ ] Document count displays correctly in headers table
- [ ] Document list displays correctly in lines table
- [ ] Removing documents from lines works
- [ ] Existing data migrated successfully
- [ ] UI renders correctly with new layout
- [ ] No console errors during document operations

---

## Rollback Plan (if needed)

```sql
-- Remove the new column (rolls back all changes)
ALTER TABLE public.documents DROP COLUMN transaction_line_id CASCADE;

-- Drop views
DROP VIEW IF EXISTS v_transaction_line_documents;
DROP VIEW IF EXISTS v_transaction_documents;
```

---

## Summary

| Component | Status | Effort |
| --------- | ------ | ------ |
| Database Schema | ⏳ TODO | 10 min |
| Document Service | ⏳ TODO | 30 min |
| Headers Table | ⏳ TODO | 15 min |
| Lines Table | ⏳ TODO | 20 min |
| Documents Panel | ⏳ TODO | 20 min |
| State Management | ⏳ TODO | 15 min |
| Data Migration | ⏳ TODO | 5 min |
| Testing | ⏳ TODO | 30 min |
| **Total** | | **~145 min** |

