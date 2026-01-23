# Manual Entry UI Fix - Debit/Credit Fields

## Problem
The manual entry form was showing a single "Amount" field instead of separate "Amount Debit" and "Amount Credit" fields, which could confuse users and is inconsistent with standard accounting practices.

## Solution Applied
Updated `EnhancedOpeningBalanceImport.tsx` to force debit/credit mode:

### Changes Made

1. **Forced Debit/Credit Mode**: 
   - Modified localStorage loading to clear any saved amount mode preference
   - Set `useAmountMode` to `false` by default and prevented it from being overridden
   - Updated localStorage persistence to always save `useAmountMode: false`

2. **Column Configuration**:
   - The system already supports both modes (amount vs debit/credit)
   - Debit/Credit columns (`opening_balance_debit`, `opening_balance_credit`) are now always visible
   - Amount column is hidden when in debit/credit mode

3. **Row Structure**:
   - Default rows already include `opening_balance_debit` and `opening_balance_credit` fields
   - "Add Row" button correctly creates rows with debit/credit fields

### Result
- Manual entry now shows separate "Debit" (مدين) and "Credit" (دائن) columns
- Consistent with standard accounting data entry
- No user confusion about single amount field
- Maintains all existing functionality (project/cost center selection, validation, etc.)

### Files Modified
- `src/pages/Fiscal/EnhancedOpeningBalanceImport.tsx`: Forced debit/credit mode and prevented amount mode override

### Testing
The manual entry form will now display:
- Account Code column
- **Debit column** (مدين)
- **Credit column** (دائن) 
- Project Code column
- Cost Center column
- Currency column
- Actions column

This provides better consistency with accounting standards and clearer user experience.
