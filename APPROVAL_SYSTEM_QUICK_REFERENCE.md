# Line Approval System - Quick Reference Card 🚀

## For Users (Transaction Creators)

### Creating a Transaction:
1. Click **"+ New Transaction"** button
2. Fill in basic information (date, description, organization)
3. Add transaction lines (account, amount, description)
4. Review transaction and see approval preview
5. Click **"📤 Submit for Approval"**
6. Done! Transaction is now pending approval

### Checking Status:
- View transaction list to see approval status badges
- Click transaction to see detailed approval progress
- Each line shows: ✅ Approved, ⏳ Pending, or ❌ Rejected

---

## For Approvers

### Accessing Approvals:
1. Click **"📋 Approvals Inbox"** button on transactions page
2. Or navigate to `/approvals/inbox`
3. See two tabs:
   - **Line Approvals** (default) - Individual line items
   - **Transaction Approvals** - Full transactions

### Approving a Line:
1. Review line details (account, amount, project, etc.)
2. Click **"✅ Approve"** button
3. Add optional notes
4. Confirm approval
5. Done! Line is approved

### Rejecting a Line:
1. Review line details
2. Click **"❌ Reject"** button
3. Enter rejection reason (required)
4. Confirm rejection
5. Transaction marked as "Revision Requested"

---

## Status Badges

| Badge | Meaning | Action Required |
|-------|---------|-----------------|
| 📝 مسودة | Draft | Submit for approval |
| ⏳ قيد المراجعة | Submitted | Wait for approval |
| ✏️ مطلوب تعديل | Revision Requested | Edit and resubmit |
| ✅ معتمد | Approved | Ready to post |
| ❌ مرفوض | Rejected | Review rejection reason |
| 🚫 ملغي | Cancelled | No action needed |

---

## Approval Progress

### Understanding the Progress Bar:
```
Progress: ████████░░░░░░░░░░ 2 / 5 lines approved (40%)

✅ Approved: 2    ⏳ Pending: 3    ❌ Rejected: 0
```

- **Green**: Approved lines
- **Orange**: Pending lines
- **Red**: Rejected lines

### Auto-Approval:
When ALL lines are approved, the transaction automatically becomes "Approved" and ready to post.

---

## Keyboard Shortcuts

### In Transaction Wizard:
- `Ctrl + Enter` - Next step / Submit
- `Ctrl + B` - Previous step
- `Esc` - Close wizard

### In Approval Inbox:
- `Tab` - Navigate between items
- `Enter` - Open item details
- `Esc` - Close dialogs

---

## Permissions Required

| Action | Permission |
|--------|------------|
| Create transaction | `transactions.create` |
| View approvals inbox | `approvals.review` |
| Approve/Reject lines | `approvals.review` |
| Manage workflows | `approvals.manage` |

---

## Common Workflows

### Scenario 1: Simple Transaction
```
User creates → Submits → Approver approves all lines → Auto-approved → Post
```

### Scenario 2: Revision Needed
```
User creates → Submits → Approver rejects line → User edits → Resubmits → Approved
```

### Scenario 3: Partial Approval
```
User creates → Submits → Approver 1 approves line 1 → Approver 2 approves line 2 → Auto-approved
```

---

## Troubleshooting

### "Cannot submit transaction"
- ✅ Check all required fields are filled
- ✅ Ensure debits equal credits
- ✅ Verify you have `transactions.create` permission

### "Cannot see approvals inbox"
- ✅ Verify you have `approvals.review` permission
- ✅ Check you're logged in
- ✅ Refresh the page

### "Approval button disabled"
- ✅ Check if you're the assigned approver
- ✅ Verify line is still pending
- ✅ Ensure you have permission

---

## Best Practices

### For Users:
✅ Fill in all details before submitting
✅ Add clear descriptions for each line
✅ Attach supporting documents
✅ Double-check amounts before submitting

### For Approvers:
✅ Review all line details carefully
✅ Add notes when approving for audit trail
✅ Provide clear rejection reasons
✅ Process approvals promptly

---

## Quick Links

### Navigation:
- Transactions: `/transactions/all`
- Approvals Inbox: `/approvals/inbox`
- Line Approvals: `/approvals/lines`
- My Transactions: `/transactions/my`
- Pending Approvals: `/transactions/pending`

### Documentation:
- Full Guide: `LINE_APPROVAL_IMPLEMENTATION_GUIDE.md`
- Visual Guide: `LINE_APPROVAL_UI_VISUAL_GUIDE.md`
- Integration Details: `LINE_APPROVAL_UI_INTEGRATION_COMPLETE.md`

---

## Support

### Need Help?
1. Check this quick reference
2. Review the visual guide
3. Contact system administrator
4. Check error logs (if admin)

### Report Issues:
- Use error log button on transactions page
- Provide transaction ID and error message
- Include steps to reproduce

---

## Tips & Tricks

### For Faster Approval:
💡 Use the badge counters to see pending count at a glance
💡 Sort by priority to handle urgent items first
💡 Use keyboard shortcuts for faster navigation
💡 Add notes to approvals for better communication

### For Better Submissions:
💡 Use descriptive transaction descriptions
💡 Fill in all optional fields for context
💡 Attach documents before submitting
💡 Review approval preview before submitting

---

## Version Information

**System Version**: 1.0.0
**Last Updated**: 2025-01-23
**Status**: Production Ready

---

## Quick Command Reference

```bash
# View pending approvals
Navigate to: /approvals/inbox

# Create new transaction
Click: + New Transaction

# Check transaction status
View: Transaction list with status badges

# Approve line
Click: ✅ Approve button in inbox

# Reject line
Click: ❌ Reject button in inbox
```

---

**Print this page for quick reference at your desk!**
