# Arabic Account Names Implementation Plan

## Current Situation Analysis

The application currently displays account names in English (`name` field) in most UI components, even though Arabic names (`name_ar` field) are available in the database. The goal is to modify the UI to display Arabic names only.

## Files Identified for Modification

### 1. Core Account Management
- **src/pages/MainData/AccountsTree.tsx** - Main account tree view
- **src/components/Accounts/AccountFormConfig.tsx** - Account form configuration
- **src/components/TreeView/TreeView.tsx** - Tree view component used for accounts

### 2. Financial Reports
- **src/pages/Reports/AccountExplorer.tsx** - Account explorer with financial data
- **src/components/Reports/AccountColumns.ts** - Column definitions for account reports

### 3. Transaction Management
- **src/pages/Transactions/TransactionLinesTable.tsx** - Transaction line items table
- **src/pages/Transactions/Transactions.tsx** - Main transactions view
- **src/pages/Transactions/TransactionDetails.tsx** - Transaction details view

### 4. Other Components
- **src/components/TreeView/ReportTreeView.tsx** - Report-specific tree view
- **src/pages/Reports/** - Various financial reports that display account names

## Implementation Strategy

### Phase 1: Core Account Display Changes
1. **AccountsTree.tsx** - Modify to display `name_ar` instead of `name`
2. **TreeView.tsx** - Ensure Arabic names are displayed in tree nodes
3. **AccountFormConfig.tsx** - Update form to prioritize Arabic name input

### Phase 2: Financial Reports
1. **AccountExplorer.tsx** - Display Arabic account names in reports
2. **AccountColumns.ts** - Update column definitions to use Arabic names
3. **ReportTreeView.tsx** - Ensure Arabic names in report tree views

### Phase 3: Transaction Management
1. **TransactionLinesTable.tsx** - Display Arabic account names in transaction lines
2. **Transactions.tsx** - Update transaction views to show Arabic names
3. **TransactionDetails.tsx** - Show Arabic names in transaction details

### Phase 4: Other Components
- Update any remaining components that display account names
- Ensure consistency across all views

## Technical Implementation Details

### Key Changes Required:

1. **Display Logic**: Change from `account.name` to `account.name_ar || account.name` (fallback for missing Arabic names)

2. **Form Logic**: Ensure Arabic name (`name_ar`) is the primary field in account forms

3. **API/Data Handling**: Verify that `name_ar` field is properly populated in all API responses

4. **Fallback Strategy**: Use `account.name_ar || account.name` pattern to handle cases where Arabic names might be missing

## Testing Plan

1. **Visual Testing**: Verify Arabic names appear correctly in all views
2. **Fallback Testing**: Ensure English names display when Arabic names are missing
3. **Form Testing**: Test account creation/editing with Arabic names
4. **Report Testing**: Verify financial reports show correct Arabic names
5. **Transaction Testing**: Confirm transactions display Arabic account names

## Risk Assessment

- **Low Risk**: Changes are primarily UI display logic
- **Fallback Strategy**: English names will still display if Arabic names are missing
- **Database Impact**: No schema changes required
- **API Impact**: No API changes required (data already includes `name_ar`)

## Timeline Estimate

- **Analysis & Planning**: 1 day (completed)
- **Implementation**: 2-3 days
- **Testing**: 1 day
- **Deployment**: 1 day

Total: ~5 days

## Next Steps

1. Start with core account management components
2. Move to financial reports
3. Update transaction management
4. Test thoroughly
5. Deploy changes