# Delete Button - Quick Reference

## Where to Delete Transactions

### ✅ NEW WAY (Recommended)
1. Click **"View Details"** button on any transaction
2. In the details panel, click the **"Delete"** button
3. Confirm in the warning modal
4. Transaction is deleted with cascade

### ❌ OLD WAY (Removed)
- Delete button in table action column - **REMOVED**
- Delete button in form header - **REMOVED**

## Delete Button Location

```
Transaction Details Panel
├── Header
│   ├── Transaction Number
│   ├── Status Badge
│   └── Action Buttons
│       ├── Edit
│       ├── Submit for Review
│       ├── Approve
│       ├── Reject
│       ├── Revise
│       ├── Post
│       └── Delete ← HERE
└── Tabs
    ├── Basic Info
    ├── Line Items
    ├── Approvals
    ├── Documents
    ├── Audit Trail
    └── Settings
```

## Delete Features

✅ **Cascade Delete** - Deletes transaction and all related records
✅ **Warning Modal** - Confirmation before deletion
✅ **Error Handling** - Rollback on failure
✅ **Toast Notifications** - Success/error messages
✅ **Permission Checking** - Only authorized users can delete
✅ **Audit Trail** - All deletes are logged

## Permissions Required

- **My Mode**: User must be the transaction creator
- **All Mode**: User must have `transactions.manage` permission

## What Gets Deleted

When you delete a transaction, the following are also deleted (cascade):
- Transaction header
- All transaction line items
- All line item approvals
- All transaction approvals
- All related documents
- All audit trail entries

## Error Handling

If deletion fails:
- Transaction is NOT deleted
- All changes are rolled back
- Error message is displayed
- You can try again

## Undo

⚠️ **WARNING**: Deletion is permanent and cannot be undone!

Make sure you want to delete before confirming.

## Files Involved

- `src/components/Transactions/UnifiedTransactionDetailsPanel.tsx` - Delete button
- `src/pages/Transactions/Transactions.tsx` - Delete handler
- `src/services/transactions.ts` - Delete service

## Related Documentation

- `DELETE_BUTTON_CONSOLIDATION.md` - Detailed changes
- `FINAL_DELETE_CONSOLIDATION_SUMMARY.md` - Summary
