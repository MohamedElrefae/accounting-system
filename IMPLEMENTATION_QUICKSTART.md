# Document Association Implementation - Remaining Phases

## Status Summary
✅ **Phase 1**: Database migration complete (document_associations table created)
✅ **Phase 2**: Document service functions added (documents.ts)
✅ **Phase 3**: Columns moved (documents removed from headers, added to lines)

## Remaining Phases (4-7)

### Phase 4: Update TransactionLinesTable Props
Add to `src/pages/Transactions/TransactionLinesTable.tsx`:

```typescript
interface TransactionLinesTableProps {
  // ... existing props
  onOpenDocuments?: (line: any) => void
}

// In renderCell, add:
if (column.key === 'documents') {
  return (
    <button 
      onClick={() => onOpenDocuments?.(row.original)}
      className="ultimate-btn ultimate-btn-edit"
      title="المستندات المرفقة"
    >
      <div className="btn-content"><span className="btn-text">📎 المستندات</span></div>
    </button>
  )
}
```

### Phase 5: Update AttachDocumentsPanel
In `src/components/documents/AttachDocumentsPanel.tsx`, add prop:

```typescript
interface AttachDocumentsPanelProps {
  transactionLineId?: string  // NEW
  // ... other props
}

// Update useEffect for fetching:
useEffect(() => {
  if (!transactionLineId) return
  getTransactionLineDocuments(transactionLineId).then(setDocuments)
}, [transactionLineId])
```

### Phase 6: Update Transactions.tsx State
Add to main Transactions component:

```typescript
// Near other state declarations
const [lineDocumentCounts, setLineDocumentCounts] = useState<Record<string, number>>({})

// Add useEffect after transactionLines is fetched:
useEffect(() => {
  const fetchCounts = async () => {
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
  fetchCounts()
}, [transactionLines])

// Pass to TransactionLinesTable:
<TransactionLinesTable
  // ... other props
  onOpenDocuments={(line) => {
    setDocumentsFor({ transactionLineId: line.id })
    setDocumentsOpen(true)
  }}
/>
```

### Phase 7: Build & Test
```bash
npm run build
npm run lint
```

Then test in browser:
1. Select a transaction to load lines
2. Click documents button on a line
3. Attach a document to the line
4. Verify the count updates

## File Locations to Update
- `src/pages/Transactions/TransactionLinesTable.tsx` - Add documents handler
- `src/components/documents/AttachDocumentsPanel.tsx` - Update for lineId
- `src/pages/Transactions/Transactions.tsx` - Add state + hook to pass to tables

## Build Command
```bash
npm run build
```

Expected output: Zero errors, only non-blocking warnings

## Next: Run Build
Execute the remaining edits from Phase 4-5 then build to verify all works together.
