-- 002_seed_adjustment_types.sql
-- Step 2: Seed default adjustment types
-- Run once per organization on setup or migration

-- Note: Replace :org_id with the actual organization UUID
-- This script seeds the two most common adjustment types for Egyptian construction accounting

INSERT INTO public.adjustment_types
  (code, name, name_ar, default_percentage, org_id, description)
VALUES
  ('RET-5',  'Retention 5%',  'استبقاء ٥٪',
   0.05, :org_id, 'Standard 5% retention deduction'),

  ('VAT-14', 'VAT 14%', 'ضريبة القيمة المضافة ١٤٪',
   0.14, :org_id, 'Egypt standard VAT 14% addition')
ON CONFLICT (org_id, code) DO NOTHING;
