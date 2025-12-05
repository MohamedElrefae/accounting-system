# 🔧 خطة التنفيذ التقنية / Technical Execution Plan

**Status:** 📋 Ready to Execute (Awaiting Approval)  
**Estimated Time:** 6-9 hours  
**Risk Level:** 🟢 Low (No data migration required)

---

## 📦 Files to Modify

### Primary File
```
src/components/Transactions/UnifiedTransactionDetailsPanel.tsx
├── Update view mode (display all lines)
├── Update edit mode (use TransactionWizard)
└── Remove legacy single-row fields
```

### Supporting Files (May need minor updates)
```
src/components/Transactions/TransactionWizard.tsx
└── Add edit mode support (if not already present)

src/services/transactions.ts
└── Verify update functions support multi-line
```

---

## 🎯 Phase 1: Update View Mode (2-3 hours)

### Step 1.1: Remove Legacy Display
**File:** `UnifiedTransactionDetailsPanel.tsx`

**Remove these sections:**
```typescript
// ❌ REMOVE: Legacy single-row display
{ id: 'debit_account', label: 'الحساب المدين', value: getAccountLabel((transaction as any).debit_account_id) }
{ id: 'credit_account', label: 'الحساب الدائن', value: getAccountLabel((transaction as any).credit_account_id) }
{ id: 'amount', label: 'المبلغ', value: ... }
```

### Step 1.2: Add Multi-Line Display
**Add new section:**
```typescript
// ✅ ADD: Multi-line display section
lines_view: {
  title: 'القيود التفصيلية',
  fields: txLines.length > 0 ? [
    {
      id: 'tx_lines_table',
      label: '',
      value: (
        <TransactionLinesTable
          lines={txLines}
          accounts={accounts}
          showTotals={true}
          showBalance={true}
        />
      )
    }
  ] : []
}
```

### Step 1.3: Add Totals Display
```typescript
// ✅ ADD: Totals section
totals_info: {
  title: 'الإجماليات',
  fields: [
    { 
      id: 'total_debits', 
      label: 'إجمالي المدين', 
      value: `${totalDebits.toLocaleString('ar-EG')} ج.م` 
    },
    { 
      id: 'total_credits', 
      label: 'إجمالي الدائن', 
      value: `${totalCredits.toLocaleString('ar-EG')} ج.م` 
    },
    { 
      id: 'balance_status', 
      label: 'الحالة', 
      value: isBalanced ? '✅ متوازن' : '❌ غير متوازن' 
    }
  ]
}
```

---

## 🎯 Phase 2: Update Edit Mode (3-4 hours)

### Step 2.1: Replace Edit Form with Wizard
**File:** `UnifiedTransactionDetailsPanel.tsx`

**Current edit mode:**
```typescript
// ❌ CURRENT: Legacy form
{viewMode === 'edit' ? (
  <UnifiedCRUDForm
    config={headerFormConfig}
    initialData={initialFormData}
    onSubmit={handleFormSubmit}
    onCancel={handleFormCancel}
  />
) : (
  // View mode
)}
```

**New edit mode:**
```typescript
// ✅ NEW: Use TransactionWizard
{viewMode === 'edit' ? (
  <TransactionWizard
    mode="edit"
    transactionId={transaction.id}
    initialData={{
      header: {
        entry_number: transaction.entry_number,
        entry_date: transaction.entry_date,
        description: transaction.description,
        // ... other header fields
      },
      lines: txLines
    }}
    accounts={accounts}
    projects={projects}
    organizations={organizations}
    classifications={classifications}
    categories={categories}
    workItems={workItems}
    costCenters={costCenters}
    onSave={handleEditSave}
    onCancel={handleFormCancel}
  />
) : (
  // View mode
)}
```

### Step 2.2: Add Edit Mode Handler
```typescript
const handleEditSave = async (data: any) => {
  setIsLoading(true)
  setError(null)
  
  try {
    // Update transaction header
    await updateTransaction(transaction.id, data.header)
    
    // Update transaction lines
    await updateTransactionLines(transaction.id, data.lines)
    
    // Refresh data
    await refreshTransaction()
    
    // Switch back to view mode
    setViewMode('view')
    
    showToast('تم تحديث المعاملة بنجاح', { severity: 'success' })
  } catch (err: any) {
    setError(err.message || 'فشل في تحديث المعاملة')
  } finally {
    setIsLoading(false)
  }
}
```

### Step 2.3: Add Business Rules Validation
```typescript
const validateEdit = (data: any): boolean => {
  // Rule 1: Check balance
  const totalDebits = data.lines.reduce((sum, line) => sum + (line.debit || 0), 0)
  const totalCredits = data.lines.reduce((sum, line) => sum + (line.credit || 0), 0)
  
  if (totalDebits !== totalCredits) {
    setError('القيود غير متوازنة. إجمالي المدين يجب أن يساوي إجمالي الدائن')
    return false
  }
  
  // Rule 2: Check approval status
  if (transaction.approval_status === 'approved') {
    setError('لا يمكن تعديل معاملة معتمدة')
    return false
  }
  
  // Rule 3: Check posted status
  if (transaction.is_posted) {
    setError('لا يمكن تعديل معاملة مرحلة')
    return false
  }
  
  // Rule 4: Check minimum lines
  if (data.lines.length < 2) {
    setError('يجب أن تحتوي المعاملة على قيدين على الأقل')
    return false
  }
  
  return true
}
```

---

## 🎯 Phase 3: Update TransactionWizard for Edit Mode (1-2 hours)

### Step 3.1: Add Edit Mode Support
**File:** `src/components/Transactions/TransactionWizard.tsx`

**Check if edit mode exists:**
```typescript
interface TransactionWizardProps {
  mode?: 'create' | 'edit'  // ✅ Add mode prop
  transactionId?: string     // ✅ Add for edit mode
  initialData?: {            // ✅ Add for edit mode
    header: any
    lines: any[]
  }
  // ... other props
}
```

**If not present, add:**
```typescript
const TransactionWizard: React.FC<TransactionWizardProps> = ({
  mode = 'create',
  transactionId,
  initialData,
  // ... other props
}) => {
  // Initialize with existing data in edit mode
  const [headerData, setHeaderData] = useState(
    mode === 'edit' && initialData 
      ? initialData.header 
      : defaultHeaderData
  )
  
  const [lines, setLines] = useState(
    mode === 'edit' && initialData 
      ? initialData.lines 
      : []
  )
  
  // ... rest of component
}
```

---

## 🧪 Phase 4: Testing (1-2 hours)

### Test Suite

#### Test 1: View Mode - Single Line Transaction
```typescript
describe('UnifiedTransactionDetailsPanel - View Mode', () => {
  it('should display single line transaction correctly', async () => {
    // Create transaction with 1 line
    const tx = await createTestTransaction({
      lines: [
        { account: '1010', debit: 5000, credit: 0 }
      ]
    })
    
    // Open details
    render(<UnifiedTransactionDetailsPanel transaction={tx} />)
    
    // Verify
    expect(screen.getByText('1010')).toBeInTheDocument()
    expect(screen.getByText('5,000')).toBeInTheDocument()
    expect(screen.getByText('✅ متوازن')).toBeInTheDocument()
  })
})
```

#### Test 2: View Mode - Multi-Line Transaction
```typescript
it('should display multi-line transaction correctly', async () => {
  // Create transaction with 5 lines
  const tx = await createTestTransaction({
    lines: [
      { account: '1010', debit: 5000, credit: 0 },
      { account: '1020', debit: 3000, credit: 0 },
      { account: '1030', debit: 2000, credit: 0 },
      { account: '2010', debit: 0, credit: 8000 },
      { account: '2020', debit: 0, credit: 2000 }
    ]
  })
  
  // Open details
  render(<UnifiedTransactionDetailsPanel transaction={tx} />)
  
  // Verify all lines displayed
  expect(screen.getAllByRole('row')).toHaveLength(6) // 5 lines + header
  expect(screen.getByText('إجمالي المدين: 10,000')).toBeInTheDocument()
  expect(screen.getByText('إجمالي الدائن: 10,000')).toBeInTheDocument()
})
```

#### Test 3: Edit Mode - Update Transaction
```typescript
it('should allow editing transaction', async () => {
  const tx = await createTestTransaction({
    lines: [
      { account: '1010', debit: 5000, credit: 0 },
      { account: '2010', debit: 0, credit: 5000 }
    ]
  })
  
  render(<UnifiedTransactionDetailsPanel transaction={tx} />)
  
  // Click edit
  fireEvent.click(screen.getByText('تعديل'))
  
  // Verify wizard opened
  expect(screen.getByText('معالج التعديل')).toBeInTheDocument()
  
  // Modify description
  const descInput = screen.getByLabelText('الوصف')
  fireEvent.change(descInput, { target: { value: 'وصف محدث' } })
  
  // Save
  fireEvent.click(screen.getByText('حفظ التعديلات'))
  
  // Verify saved
  await waitFor(() => {
    expect(screen.getByText('وصف محدث')).toBeInTheDocument()
  })
})
```

#### Test 4: Business Rules - Prevent Unbalanced Save
```typescript
it('should prevent saving unbalanced transaction', async () => {
  const tx = await createTestTransaction({
    lines: [
      { account: '1010', debit: 5000, credit: 0 },
      { account: '2010', debit: 0, credit: 5000 }
    ]
  })
  
  render(<UnifiedTransactionDetailsPanel transaction={tx} />)
  
  // Click edit
  fireEvent.click(screen.getByText('تعديل'))
  
  // Change amount to make unbalanced
  const debitInput = screen.getAllByLabelText('مدين')[0]
  fireEvent.change(debitInput, { target: { value: '3000' } })
  
  // Try to save
  fireEvent.click(screen.getByText('حفظ التعديلات'))
  
  // Verify error
  await waitFor(() => {
    expect(screen.getByText(/غير متوازنة/)).toBeInTheDocument()
  })
})
```

#### Test 5: Business Rules - Prevent Editing Approved
```typescript
it('should prevent editing approved transaction', async () => {
  const tx = await createTestTransaction({
    approval_status: 'approved',
    lines: [
      { account: '1010', debit: 5000, credit: 0 },
      { account: '2010', debit: 0, credit: 5000 }
    ]
  })
  
  render(<UnifiedTransactionDetailsPanel transaction={tx} />)
  
  // Verify edit button disabled or not present
  const editButton = screen.queryByText('تعديل')
  expect(editButton).toBeDisabled()
})
```

---

## 📋 Implementation Checklist

### Pre-Implementation
- [ ] Review and approve plan
- [ ] Backup current code
- [ ] Create feature branch: `feature/transaction-details-refactor`
- [ ] Set up test environment

### Phase 1: View Mode (2-3 hours)
- [ ] Remove legacy single-row display fields
- [ ] Add multi-line table component
- [ ] Add totals calculation
- [ ] Add balance status indicator
- [ ] Update section configuration
- [ ] Test view mode with various transactions
- [ ] Commit: "feat: update transaction details view mode"

### Phase 2: Edit Mode (3-4 hours)
- [ ] Check TransactionWizard edit mode support
- [ ] Add edit mode prop if needed
- [ ] Replace UnifiedCRUDForm with TransactionWizard
- [ ] Implement handleEditSave function
- [ ] Add business rules validation
- [ ] Test edit mode functionality
- [ ] Commit: "feat: update transaction details edit mode"

### Phase 3: Business Rules (1 hour)
- [ ] Add balance validation
- [ ] Add approval status check
- [ ] Add posted status check
- [ ] Add minimum lines validation
- [ ] Add permission checks
- [ ] Test all validations
- [ ] Commit: "feat: add business rules validation"

### Phase 4: Testing (1-2 hours)
- [ ] Write unit tests for view mode
- [ ] Write unit tests for edit mode
- [ ] Write integration tests
- [ ] Test with real data
- [ ] Test edge cases
- [ ] Fix any bugs found
- [ ] Commit: "test: add comprehensive tests"

### Post-Implementation
- [ ] Code review
- [ ] Merge to main branch
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Update documentation

---

## 🔧 Code Snippets

### Snippet 1: Calculate Totals
```typescript
const calculateTotals = (lines: any[]) => {
  const totalDebits = lines.reduce((sum, line) => 
    sum + (parseFloat(line.debit) || 0), 0
  )
  
  const totalCredits = lines.reduce((sum, line) => 
    sum + (parseFloat(line.credit) || 0), 0
  )
  
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01
  
  return { totalDebits, totalCredits, isBalanced }
}
```

### Snippet 2: Format Currency
```typescript
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}
```

### Snippet 3: Check Edit Permission
```typescript
const canEditTransaction = (
  transaction: TransactionRecord,
  currentUserId: string,
  userRole: string
): boolean => {
  // Cannot edit if posted
  if (transaction.is_posted) return false
  
  // Cannot edit if approved (unless admin)
  if (transaction.approval_status === 'approved' && userRole !== 'admin') {
    return false
  }
  
  // Owner can edit their own transactions
  if (transaction.created_by === currentUserId) return true
  
  // Admins and managers can edit any transaction
  if (['admin', 'manager'].includes(userRole)) return true
  
  return false
}
```

### Snippet 4: Transaction Lines Table Component
```typescript
interface TransactionLinesTableProps {
  lines: any[]
  accounts: Account[]
  showTotals?: boolean
  showBalance?: boolean
}

const TransactionLinesTable: React.FC<TransactionLinesTableProps> = ({
  lines,
  accounts,
  showTotals = true,
  showBalance = true
}) => {
  const { totalDebits, totalCredits, isBalanced } = calculateTotals(lines)
  
  const getAccountLabel = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    return account ? `${account.code} - ${account.name}` : accountId
  }
  
  return (
    <div className="transaction-lines-table">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>الحساب</th>
            <th>مدين</th>
            <th>دائن</th>
            <th>البيان</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line.id || index}>
              <td>{index + 1}</td>
              <td>{getAccountLabel(line.account_id)}</td>
              <td className="amount">{formatCurrency(line.debit || 0)}</td>
              <td className="amount">{formatCurrency(line.credit || 0)}</td>
              <td>{line.description || '—'}</td>
            </tr>
          ))}
        </tbody>
        {showTotals && (
          <tfoot>
            <tr className="totals-row">
              <td colSpan={2}>الإجماليات</td>
              <td className="amount total">{formatCurrency(totalDebits)}</td>
              <td className="amount total">{formatCurrency(totalCredits)}</td>
              <td></td>
            </tr>
            {showBalance && (
              <tr className="balance-row">
                <td colSpan={4}>
                  {isBalanced ? (
                    <span className="balanced">✅ متوازن</span>
                  ) : (
                    <span className="unbalanced">
                      ❌ غير متوازن (الفرق: {formatCurrency(Math.abs(totalDebits - totalCredits))})
                    </span>
                  )}
                </td>
                <td></td>
              </tr>
            )}
          </tfoot>
        )}
      </table>
    </div>
  )
}
```

---

## 🎨 CSS Styles

```css
/* Transaction Lines Table */
.transaction-lines-table {
  width: 100%;
  overflow-x: auto;
  margin: var(--spacing-md) 0;
}

.transaction-lines-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.transaction-lines-table th {
  background: var(--surface-secondary);
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: right;
  font-weight: 600;
  border-bottom: 2px solid var(--border);
}

.transaction-lines-table td {
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
}

.transaction-lines-table td.amount {
  text-align: left;
  font-family: 'Courier New', monospace;
  font-weight: 500;
}

.transaction-lines-table tfoot tr.totals-row {
  background: var(--surface-tertiary);
  font-weight: 600;
}

.transaction-lines-table tfoot tr.totals-row td.total {
  font-size: 16px;
  color: var(--text-primary);
}

.transaction-lines-table tfoot tr.balance-row {
  background: var(--surface);
}

.transaction-lines-table .balanced {
  color: var(--success);
  font-weight: 600;
}

.transaction-lines-table .unbalanced {
  color: var(--error);
  font-weight: 600;
}

/* Responsive */
@media (max-width: 768px) {
  .transaction-lines-table {
    font-size: 12px;
  }
  
  .transaction-lines-table th,
  .transaction-lines-table td {
    padding: var(--spacing-xs) var(--spacing-sm);
  }
}
```

---

## 🚨 Rollback Plan

If issues occur during implementation:

### Step 1: Immediate Rollback
```bash
# Revert to previous commit
git revert HEAD

# Or reset to before changes
git reset --hard <commit-hash>

# Push to remote
git push origin main --force
```

### Step 2: Restore from Backup
```bash
# If code backup was created
cp -r backup/UnifiedTransactionDetailsPanel.tsx src/components/Transactions/

# Commit restore
git add .
git commit -m "rollback: restore transaction details panel"
git push
```

### Step 3: Database Rollback (if needed)
```sql
-- No database changes in this refactor
-- Data remains unchanged
-- Only UI code is modified
```

---

## 📞 Support & Communication

### During Implementation
- Update progress in project management tool
- Report blockers immediately
- Request code review when ready
- Communicate with stakeholders

### After Implementation
- Provide user training
- Monitor error logs
- Collect user feedback
- Address issues promptly

---

## ✅ Success Metrics

### Technical Metrics
- [ ] All tests passing (100%)
- [ ] Code coverage > 80%
- [ ] No console errors
- [ ] Performance: Load time < 2s
- [ ] No memory leaks

### User Metrics
- [ ] Users can view all transaction lines
- [ ] Users can edit transactions successfully
- [ ] No user complaints about missing data
- [ ] Positive feedback on new interface
- [ ] Reduced support tickets

### Business Metrics
- [ ] No data loss
- [ ] No downtime
- [ ] Accounting rules enforced
- [ ] Audit trail maintained
- [ ] Compliance requirements met

---

**Ready to Execute?**

Once approved, follow the checklist step-by-step and commit changes incrementally.

**Estimated Timeline:**
- Day 1: Phases 1-2 (5-7 hours)
- Day 2: Phases 3-4 (2-4 hours)
- Day 3: Testing & deployment (2-3 hours)

**Total: 2-3 days**

---
