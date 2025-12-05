# Quick Action Guide - Get Approvals Working Now! 🚀

## The Problem
Approvals pages are blank because the database migration hasn't been applied.

## The Solution
Apply the database migration in 30 seconds.

---

## Option 1: CLI (Fastest)

```bash
supabase db push
```

Done! ✅

---

## Option 2: Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Click "SQL Editor"
4. Click "New Query"
5. Copy this file: `supabase/migrations/20250120_line_based_approval.sql`
6. Paste into editor
7. Click "Run"

Done! ✅

---

## Verify It Worked

Visit: `http://localhost:3000/approvals/test-setup`

You should see:
```
✅ Current User
✅ RPC Functions: EXISTS
✅ Database Tables: EXISTS
✅ Approval Columns: EXISTS

✅ All systems ready!
```

---

## Test the Workflow

1. Go to `/transactions/all`
2. Click "New Transaction"
3. Fill in details
4. Click "Submit for Approval"
5. Go to `/approvals/inbox`
6. Should see pending approvals
7. Try approving/rejecting

---

## If Still Blank

1. **Hard refresh**: `Ctrl+Shift+R`
2. **Check test page**: `/approvals/test-setup`
3. **Check console**: F12 → Console
4. **Check for errors**: Look for red messages

---

## That's It!

The system is ready. Just apply the migration and you're done! 🎉

---

**Time to complete**: ~1 minute
**Difficulty**: Easy
**Next step**: `supabase db push`
