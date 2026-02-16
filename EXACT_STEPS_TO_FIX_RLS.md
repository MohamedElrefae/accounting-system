# Exact Steps to Fix RLS Issue

## Current Status
✅ Column mapping fixed
✅ Column filtering works
❌ RLS policy blocking inserts

## The Fix (3 Steps)

---

## STEP 1: Get Service Role Key

### In Supabase Dashboard:

1. Go to: https://app.supabase.com
2. Select project: `bgxknceshxxifwytalex`
3. Click "Settings" (bottom left)
4. Click "API" (left sidebar)
5. Look for "Service Role" section
6. Copy the long key (starts with `eyJ...`)

**Example:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJneGtuY2VzaHh4aWZ3eXRhbGV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxODAwMDAwMDAwfQ.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## STEP 2: Update `.env.local`

### Open `.env.local` file

Find this line:
```
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace it with the service role key you copied:
```
SUPABASE_KEY=<PASTE_SERVICE_ROLE_KEY_HERE>
```

**Complete `.env.local` should look like:**
```
SUPABASE_URL=https://bgxknceshxxifwytalex.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJneGtuY2VzaHh4aWZ3eXRhbGV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxODAwMDAwMDAwfQ.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Save the file.**

---

## STEP 3: Run Migration

### Test with Dry-Run First

```bash
python migrate.py --mode dry-run --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```

**Expected output:**
```
============================================================
MIGRATION PLAN
============================================================
Mode: DRY-RUN
Batch size: 100
Records to migrate: 14224
============================================================

============================================================
MIGRATION SUMMARY
============================================================
Mode: DRY-RUN
Transactions: 14224/14224 succeeded
Transaction lines: 14224/14224 succeeded
Total succeeded: 28448
Total failed: 0
Success rate: 100.0%
Report: reports/migration_report.md
Summary: reports/migration_summary.json
============================================================
```

**If you see this, the RLS issue is fixed! ✅**

### Then Execute

```bash
python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```

When prompted:
```
Continue with migration? (yes/no): yes
```

Type `yes` and press Enter.

**Expected output:**
```
============================================================
MIGRATION SUMMARY
============================================================
Mode: EXECUTE
Transactions: 14224/14224 succeeded
Transaction lines: 14224/14224 succeeded
Total succeeded: 28448
Total failed: 0
Success rate: 100.0%
Report: reports/migration_report.md
Summary: reports/migration_summary.json
============================================================
```

---

## Verification

### Check Supabase

1. Go to Supabase Dashboard
2. Project: bgxknceshxxifwytalex
3. Go to "transactions" table
4. Verify records exist with:
   - `entry_number` (from Excel: "entry no")
   - `entry_date` (from Excel: "entry date")
   - `org_id` = 731a3a00-6fa6-4282-9bec-8b5a8678e127

5. Go to "transaction_lines" table
6. Verify records exist with all line-item columns

---

## Optional: Revert to Anon Key

After migration completes, you can revert to the anon key if desired:

1. Open `.env.local`
2. Replace SUPABASE_KEY with the original anon key
3. Save

**Note:** The anon key will enforce RLS again, so normal application operations will work correctly.

---

## Troubleshooting

### Still Getting RLS Error?
- Verify you copied the **Service Role** key (not anon key)
- Verify you saved `.env.local`
- Restart Python/terminal to reload environment variables

### Getting Different Error?
- Check `reports/migration_report.md` for details
- Check `reports/migration_summary.json` for summary

---

## Summary

| Step | Action | Status |
|------|--------|--------|
| 1 | Get Service Role Key | ⏳ TODO |
| 2 | Update `.env.local` | ⏳ TODO |
| 3 | Run dry-run | ⏳ TODO |
| 4 | Run execute | ⏳ TODO |
| 5 | Verify in Supabase | ⏳ TODO |

---

## Status
🔄 **READY FOR IMPLEMENTATION** - All steps documented and ready to execute
