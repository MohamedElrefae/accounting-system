-- Test Column Preferences Persistence
-- Run these queries to verify column settings persist correctly

-- 1. Check current user_column_preferences table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_column_preferences'
ORDER BY ordinal_position;

-- 2. Get current column preferences for transactions table
SELECT 
    user_id,
    table_key,
    column_config,
    version,
    created_at,
    updated_at
FROM user_column_preferences 
WHERE table_key = 'transactions_table'
ORDER BY updated_at DESC 
LIMIT 3;

-- 3. Example of what a complete column_config should look like with frozen/pinPriority
-- This shows the JSON structure that will be saved when user configures columns
/*
Example column_config with frozen columns and pin priorities:
{
  "wrapMode": false,
  "columns": [
    {
      "key": "entry_number",
      "label": "رقم القيد",
      "visible": true,
      "width": 120,
      "minWidth": 100,
      "maxWidth": 200,
      "type": "text",
      "resizable": true,
      "frozen": true,
      "pinPriority": 3
    },
    {
      "key": "entry_date",
      "label": "التاريخ",
      "visible": true,
      "width": 130,
      "minWidth": 120,
      "maxWidth": 180,
      "type": "date",
      "resizable": true,
      "frozen": true,
      "pinPriority": 4
    },
    {
      "key": "description",
      "label": "البيان",
      "visible": true,
      "width": 250,
      "minWidth": 200,
      "maxWidth": 400,
      "type": "text",
      "resizable": true,
      "frozen": true,
      "pinPriority": 1
    },
    {
      "key": "amount",
      "label": "المبلغ",
      "visible": true,
      "width": 140,
      "minWidth": 120,
      "maxWidth": 200,
      "type": "currency",
      "resizable": true,
      "frozen": false
    }
  ]
}
*/

-- 4. Test RPC functions exist and work
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('upsert_user_column_preferences', 'get_user_column_preferences');

-- 5. Verify RLS policies are in place
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'user_column_preferences';

-- 6. Check if there are any existing preferences that might conflict
SELECT 
    table_key,
    COUNT(*) as preference_count,
    MAX(updated_at) as last_updated
FROM user_column_preferences 
GROUP BY table_key
ORDER BY last_updated DESC;