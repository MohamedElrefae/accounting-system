# Dual-Table Transactions Page Architecture

## Overview

This document outlines the refactoring of the `/transactions/my` page to support a two-table display:
- **Table 1 (Top)**: Transaction headers with filters, pagination, column config, export
- **Table 2 (Bottom)**: Transaction lines (detail rows) for the selected transaction

## Files Created

### 1. TransactionsHeaderTable.tsx
Location: `src/pages/Transactions/TransactionsHeaderTable.tsx`

**Purpose**: Component for displaying transaction headers (T1)
- Manages all existing filters and features
- Shows transaction-level data (entry_number, entry_date, description, amount, etc.)
- Includes all current action buttons (edit, delete, submit, approve, etc.)
- Has row click handler to select a transaction
- Supports wrap mode and column resizing
- Renders approval status badges and document counts

**Key Props**:
- transactions, accounts, organizations, projects, categories, workItems, analysisItemsMap, classifications
- columns, wrapMode, loading
- Callback handlers: onSelectTransaction, onEdit, onDelete, onOpenDetails, etc.
- selectedTransactionId for highlighting

### 2. TransactionLinesTable.tsx
Location: `src/pages/Transactions/TransactionLinesTable.tsx`

**Purpose**: Component for displaying transaction line details (T2)
- Shows account, debit_amount, credit_amount, description, project, cost_center, etc.
- Maps to `transaction_lines` table in database
- Has edit/delete buttons for each line
- Filtered to show only lines from selected transaction
- Supports wrap mode and column resizing
- Shows empty message when no transaction is selected

**Key Props**:
- lines (filtered by selected transaction_id)
- accounts, projects, categories, workItems, costCenters, classifications
- columns, wrapMode, loading, selectedLineId
- Callback handlers: onEditLine, onDeleteLine, onSelectLine

## State Management Changes in Transactions.tsx

### NEW STATE VARIABLES:
```typescript
// Transaction selection state
const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
const [selectedLineId, setSelectedLineId] = useState<string | null>(null)

// Separate column config for transaction lines table
const [lineColumnsConfigOpen, setLineColumnsConfigOpen] = useState(false)

// Lines state (already exists but needs expansion)
const [lines, setLines] = useState<TransactionLineRecord[]>([])
```

### MODIFIED STATE:
- Rename `columnConfigOpen` to `headersColumnConfigOpen` for clarity
- Create separate default columns for both tables:
  - `defaultHeaderColumns` (T1)
  - `defaultLineColumns` (T2)

### COLUMN PREFERENCES:
- Use different storage keys:
  - `transactions_table` for header columns
  - `transactions_lines_table` for line columns

## Implementation Steps

### Step 1: Import New Components
```typescript
import TransactionsHeaderTable from './TransactionsHeaderTable'
import TransactionLinesTable, { type TransactionLineRecord } from './TransactionLinesTable'
```

### Step 2: Add State for Selection
```typescript
const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
const [lineColumnsConfigOpen, setLineColumnsConfigOpen] = useState(false)
```

### Step 3: Create Default Columns for Lines Table
```typescript
const defaultLineColumns: ColumnConfig[] = useMemo(() => [
  { key: 'line_no', label: 'رقم السطر', visible: true, width: 80, minWidth: 60, maxWidth: 120, type: 'number', resizable: true },
  { key: 'account_label', label: 'الحساب', visible: true, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
  { key: 'debit_amount', label: 'المبلغ المدين', visible: true, width: 120, minWidth: 100, maxWidth: 180, type: 'currency', resizable: true },
  { key: 'credit_amount', label: 'المبلغ الدائن', visible: true, width: 120, minWidth: 100, maxWidth: 180, type: 'currency', resizable: true },
  { key: 'description', label: 'البيان', visible: true, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
  { key: 'project_label', label: 'المشروع', visible: true, width: 150, minWidth: 120, maxWidth: 220, type: 'text', resizable: true },
  { key: 'cost_center_label', label: 'مركز التكلفة', visible: true, width: 150, minWidth: 120, maxWidth: 220, type: 'text', resizable: true },
  { key: 'work_item_label', label: 'عنصر العمل', visible: false, width: 150, minWidth: 120, maxWidth: 220, type: 'text', resizable: true },
  { key: 'classification_label', label: 'التصنيف', visible: false, width: 150, minWidth: 120, maxWidth: 220, type: 'text', resizable: true },
  { key: 'sub_tree_label', label: 'الشجرة الفرعية', visible: false, width: 150, minWidth: 120, maxWidth: 220, type: 'text', resizable: true },
  { key: 'actions', label: 'الإجراءات', visible: true, width: 120, minWidth: 100, maxWidth: 180, type: 'actions', resizable: true }
], [])
```

### Step 4: Setup Column Preferences Hook for Lines
```typescript
const {
  columns: lineColumns,
  handleColumnResize: handleLineColumnResize,
  handleColumnConfigChange: handleLineColumnConfigChange,
  resetToDefaults: resetLineColumnsToDefaults
} = useColumnPreferences({
  storageKey: 'transactions_lines_table',
  defaultColumns: defaultLineColumns,
  userId: currentUserId || undefined
})
```

### Step 5: Fetch Transaction Lines for Selected Transaction
```typescript
useEffect(() => {
  const fetchLines = async () => {
    if (!selectedTransactionId) {
      setLines([])
      return
    }
    try {
      const { data, error } = await supabase
        .from('transaction_lines')
        .select('*')
        .eq('transaction_id', selectedTransactionId)
        .order('line_no', { ascending: true })
      if (!error && data) {
        setLines(data as TransactionLineRecord[])
      }
    } catch {
      setLines([])
    }
  }
  fetchLines()
}, [selectedTransactionId])
```

### Step 6: Update Layout - Split Table Area into Two Sections

**Before**: Single ResizableTable for transactions

**After**:
```jsx
<div className="transactions-content">
  {/* Section 1: Transaction Headers Table */}
  <div className="transactions-section headers-section">
    <div className="section-header">
      <h2>المعاملات (رؤوس القيود)</h2>
      <div className="section-controls">
        <button onClick={() => setHeadersColumnConfigOpen(true)}>
          ⚙️ إعدادات الأعمدة (الجدول العلوي)
        </button>
      </div>
    </div>
    <div className="transactions-tablebar">
      {/* Existing toolbar code */}
    </div>
    <TransactionsHeaderTable
      transactions={transactions}
      accounts={accounts}
      organizations={organizations}
      projects={projects}
      categories={categories}
      workItems={workItems}
      analysisItemsMap={analysisItemsMap}
      classifications={classifications}
      userNames={userNames}
      columns={columns}
      wrapMode={wrapMode}
      loading={loading}
      onColumnResize={handleColumnResize}
      onSelectTransaction={(tx) => {
        setSelectedTransactionId(tx.id)
        setSelectedLineId(null)
      }}
      selectedTransactionId={selectedTransactionId}
      onEdit={(tx) => {
        setKeepCreateTitle(false)
        setEditingTx(tx)
        initialFormDataRef.current = buildInitialFormDataForEdit(tx)
        setFormOpen(true)
      }}
      onDelete={handleDelete}
      onOpenDetails={async (tx) => {
        setDetailsFor(tx)
        try {
          const rows = await getTransactionAudit(tx.id)
          setAudit(rows)
        } catch {}
        try {
          const hist = await getApprovalHistoryByTransactionId(tx.id)
          setApprovalHistory(hist)
        } catch {}
        setDetailsOpen(true)
      }}
      onOpenDocuments={(tx) => {
        setDocumentsFor(tx)
        setDocumentsOpen(true)
      }}
      onOpenCostAnalysis={openCostAnalysisModal}
      onSubmit={(id) => {
        setSubmitTargetId(id)
        setSubmitNote('')
        setSubmitOpen(true)
      }}
      onApprove={(id) => openReview('approve', id)}
      onRevise={(id) => openReview('revise', id)}
      onReject={(id) => openReview('reject', id)}
      onResubmit={(id) => {
        setSubmitTargetId(id)
        setSubmitNote('')
        setSubmitOpen(true)
      }}
      onPost={async (id) => {
        try {
          await withRetry(() => postTransaction(id))
          showToast('تم الترحيل', { severity: 'success' })
          await reload()
        } catch (e: any) {
          showToast(formatSupabaseError(e) || 'فشل ترحيل المعاملة', { severity: 'error' })
        }
      }}
      onCancelSubmission={async (id) => {
        try {
          await withRetry(() => cancelSubmission(id))
          showToast('تم إلغاء الإرسال', { severity: 'success' })
          await reload()
        } catch (e: any) {
          showToast(formatSupabaseError(e) || 'تعذر إلغاء الإرسال', { severity: 'error' })
        }
      }}
      mode={mode}
      currentUserId={currentUserId || undefined}
      hasPerm={hasPerm}
    />
  </div>

  {/* Divider / Section Separator */}
  <div className="transactions-section-divider">
    <span>القيود التفصيلية للمعاملة المحددة</span>
  </div>

  {/* Section 2: Transaction Lines Table */}
  <div className="transactions-section lines-section">
    <div className="section-header">
      <h2>القيود التفصيلية</h2>
      <div className="section-controls">
        <button 
          onClick={() => setLineColumnsConfigOpen(true)}
          disabled={!selectedTransactionId}
        >
          ⚙️ إعدادات الأعمدة (الجدول السفلي)
        </button>
      </div>
    </div>
    <TransactionLinesTable
      lines={lines}
      accounts={accounts}
      projects={projects}
      categories={categories}
      workItems={workItems}
      costCenters={costCenters}
      classifications={classifications}
      columns={lineColumns}
      wrapMode={wrapMode}
      loading={loading}
      selectedLineId={selectedLineId}
      onColumnResize={handleLineColumnResize}
      onEditLine={(line) => {
        // Open line editor in side panel (or modal)
        setLineForm({
          id: line.id,
          account_id: line.account_id,
          debit_amount: String(line.debit_amount || 0),
          credit_amount: String(line.credit_amount || 0),
          description: line.description || '',
          project_id: line.project_id || '',
          cost_center_id: line.cost_center_id || '',
          work_item_id: line.work_item_id || '',
          analysis_work_item_id: line.analysis_work_item_id || '',
          classification_id: line.classification_id || '',
          sub_tree_id: line.sub_tree_id || ''
        })
        setEditingLine(true)
      }}
      onDeleteLine={async (id) => {
        const ok = window.confirm('هل تريد حذف هذا السطر؟')
        if (!ok) return
        try {
          const { error } = await supabase
            .from('transaction_lines')
            .delete()
            .eq('id', id)
          if (error) throw error
          showToast('تم حذف السطر', { severity: 'success' })
          // Refresh lines
          if (selectedTransactionId) {
            const { data } = await supabase
              .from('transaction_lines')
              .select('*')
              .eq('transaction_id', selectedTransactionId)
              .order('line_no', { ascending: true })
            if (data) setLines(data as TransactionLineRecord[])
          }
        } catch (e: any) {
          showToast(e?.message || 'فشل حذف السطر', { severity: 'error' })
        }
      }}
      onSelectLine={(line) => setSelectedLineId(line.id)}
    />
  </div>
</div>
```

### Step 7: Add CSS for Split Layout

Add to `Transactions.css`:
```css
.transactions-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
}

.transactions-section {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  background: #f9f9f9;
}

.headers-section {
  flex: 1;
  min-height: 400px;
}

.lines-section {
  flex: 0 1 auto;
  min-height: 300px;
  max-height: 500px;
  overflow-y: auto;
}

.transactions-section-divider {
  text-align: center;
  padding: 8px;
  color: #666;
  font-weight: bold;
  font-size: 0.9rem;
  border-top: 2px dashed #ccc;
  border-bottom: 2px dashed #ccc;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ccc;
}

.section-header h2 {
  margin: 0;
  font-size: 1.1rem;
}

.section-controls {
  display: flex;
  gap: 8px;
}

.section-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Step 8: Column Configuration Modals

Add two separate ColumnConfiguration modals:

```jsx
{/* Headers Table Column Config */}
{headersColumnConfigOpen && (
  <ColumnConfiguration
    columns={columns}
    onApply={(newColumns) => {
      handleColumnConfigChange(newColumns)
      setHeadersColumnConfigOpen(false)
    }}
    onCancel={() => setHeadersColumnConfigOpen(false)}
    onReset={resetToDefaults}
    title="إعدادات أعمدة جدول المعاملات"
  />
)}

{/* Lines Table Column Config */}
{lineColumnsConfigOpen && (
  <ColumnConfiguration
    columns={lineColumns}
    onApply={(newColumns) => {
      handleLineColumnConfigChange(newColumns)
      setLineColumnsConfigOpen(false)
    }}
    onCancel={() => setLineColumnsConfigOpen(false)}
    onReset={resetLineColumnsToDefaults}
    title="إعدادات أعمدة جدول القيود التفصيلية"
  />
)}
```

## Testing Checklist

- [ ] Top table displays all transactions with filters working
- [ ] Clicking a transaction row selects it (highlights row, loads lines)
- [ ] Bottom table shows only lines from selected transaction
- [ ] Line edit/delete buttons work and refresh data
- [ ] Column config buttons are separate for each table
- [ ] Column preferences persist separately
- [ ] Wrap mode toggle works for both tables
- [ ] Export functionality works on top table
- [ ] All existing action buttons (approve, submit, etc.) still work
- [ ] Line editor form works with bottom table selection
- [ ] Responsive layout on small screens

## Performance Considerations

1. **Memoization**: Both components use `useMemo` for table data preparation
2. **Polling**: Line polling (1200ms) only runs when form is open
3. **Lazy Loading**: Lines only fetch when transaction is selected
4. **Column Preferences**: Separate storage keys prevent conflicts
5. **Re-renders**: Row click handlers are stable (wrapped in useCallback if needed)

## Future Enhancements

1. Add line summary (totals row) at bottom of lines table
2. Add inline line editing without modal
3. Add line copy/duplicate functionality
4. Add bulk line operations
5. Add line validation display
6. Add line export per transaction
7. Add line filtering by amount, account, etc.

## Data Flow Diagram

```
User Actions:
├─ Click "New Transaction" → Open form panel (existing behavior)
├─ Click Transaction Row → setSelectedTransactionId → Fetch lines from DB
├─ Click Line Row → setSelectedLineId → Highlight row
├─ Click Edit Line → setLineForm + setEditingLine → Show form
├─ Click Delete Line → Delete from DB → Refresh lines table
└─ Click Delete Transaction → Delete from DB → Refresh headers

State Updates:
├─ selectedTransactionId → useEffect fetches lines from transaction_lines table
├─ lines → TransactionLinesTable re-renders with new data
├─ lineColumns → Persisted in localStorage under 'transactions_lines_table'
└─ lineColumnsConfigOpen → Shows ColumnConfiguration modal
```
