-- ================================================
-- CHECK AND FIX COLUMNS - Find actual column names
-- This will show the real column structure and fix functions
-- ================================================

-- First, let's see what columns actually exist in journal_entries
SELECT 'JOURNAL_ENTRIES COLUMNS:' as info, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'journal_entries'
ORDER BY ordinal_position;

-- Also check accounts table structure
SELECT 'ACCOUNTS COLUMNS:' as info, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'accounts'
ORDER BY ordinal_position;

-- Check transactions table structure
SELECT 'TRANSACTIONS COLUMNS:' as info, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'transactions'
ORDER BY ordinal_position;

-- Based on common accounting patterns, the column might be named differently
-- Let's check for common variations:
DO $$ 
BEGIN
    -- Check if journal_entries has account_id, account, or acct_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'account_id') THEN
        RAISE NOTICE 'journal_entries.account_id exists';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'account') THEN
        RAISE NOTICE 'journal_entries.account exists (should use this)';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'acct_id') THEN
        RAISE NOTICE 'journal_entries.acct_id exists (should use this)';
    ELSE
        RAISE NOTICE 'No account reference column found in journal_entries';
    END IF;
    
    -- Check transaction relationship
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'transaction_id') THEN
        RAISE NOTICE 'journal_entries.transaction_id exists';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'trans_id') THEN
        RAISE NOTICE 'journal_entries.trans_id exists (should use this)';
    ELSE
        RAISE NOTICE 'No transaction reference column found in journal_entries';
    END IF;
END $$;
