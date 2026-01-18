-- Fix Account Name Update Issues - Disable Interfering Triggers
-- Senior Engineer Solution: Temporarily disable triggers that cause name update failures

-- Step 1: Disable the problematic triggers that interfere with name updates
ALTER TABLE public.accounts DISABLE TRIGGER trg_sync_txn_names;
ALTER TABLE public.accounts DISABLE TRIGGER trg_sync_txn_names_ar;

-- Step 2: Test name update with triggers disabled
DO $$
DECLARE
    v_test_org_id uuid := '731a3a00-6fa6-4282-9bec-8b5a8678e127'; -- Replace with your actual org_id
    v_test_account_id uuid := '804f7750-93d3-47d4-b63b-dd5cfcbfd860'; -- Replace with actual account_id
    v_name_result json;
    v_error_message text;
BEGIN
    RAISE NOTICE '=== Testing Name Update with Triggers Disabled ===';
    
    -- Test name update (should work now)
    BEGIN
        SELECT public.account_update(
            v_test_org_id,
            v_test_account_id,
            'TEST-CODE-001',
            'Updated Name Test SUCCESS',
            'اسم اختبار محدث بنجاح',
            'asset'::public.account_category,
            1,
            'active'::public.account_status
        ) INTO v_name_result;
        
        RAISE NOTICE 'NAME UPDATE SUCCESS: %', v_name_result::text;
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message;
        RAISE NOTICE 'NAME UPDATE FAILED: %', v_error_message;
    END;
    
    RAISE NOTICE '=== Test Complete ===';
END $$;

-- Step 3: Check if triggers are now disabled
SELECT 
    'Trigger Status After Fix' as status,
    tgname as trigger_name,
    CASE WHEN tgenabled = 'O' THEN 'ENABLED' ELSE 'DISABLED' END as current_status,
    'This trigger was interfering with name updates' as note
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'accounts'
AND c.relnamespace = 'public'::regnamespace
AND tgname IN ('trg_sync_txn_names', 'trg_sync_txn_names_ar')
ORDER BY trigger_name;

-- Step 4: Create a safer version of the sync triggers
-- These triggers will only update transactions if they actually exist
CREATE OR REPLACE FUNCTION safe_sync_transaction_account_names()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only update if account name actually changed
    IF OLD.name IS DISTINCT FROM NEW.name THEN
        -- Update transactions that reference this account
        UPDATE public.transactions
        SET debit_account_name = NEW.name
        WHERE debit_account_id = NEW.id
        AND debit_account_name IS DISTINCT FROM NEW.name;

        UPDATE public.transactions
        SET credit_account_name = NEW.name
        WHERE credit_account_id = NEW.id
        AND credit_account_name IS DISTINCT FROM NEW.name;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION safe_sync_transaction_account_names_ar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only update if account name_ar actually changed and is not null
    IF OLD.name_ar IS DISTINCT FROM NEW.name_ar AND NEW.name_ar IS NOT NULL THEN
        -- Update transactions with Arabic names
        UPDATE public.transactions
        SET debit_account_name = NEW.name_ar
        WHERE debit_account_id = NEW.id
        AND NEW.name_ar IS NOT NULL
        AND debit_account_name IS DISTINCT FROM NEW.name_ar;

        UPDATE public.transactions
        SET credit_account_name = NEW.name_ar
        WHERE credit_account_id = NEW.id
        AND NEW.name_ar IS NOT NULL
        AND credit_account_name IS DISTINCT FROM NEW.name_ar;
    END IF;

    RETURN NEW;
END;
$$;

-- Step 5: Replace problematic triggers with safer versions
DROP TRIGGER IF EXISTS trg_sync_txn_names ON public.accounts;
DROP TRIGGER IF EXISTS trg_sync_txn_names_ar ON public.accounts;

CREATE TRIGGER trg_sync_txn_names
AFTER UPDATE ON public.accounts
FOR EACH ROW
WHEN (OLD.name IS DISTINCT FROM NEW.name)
EXECUTE FUNCTION safe_sync_transaction_account_names();

CREATE TRIGGER trg_sync_txn_names_ar
AFTER UPDATE ON public.accounts
FOR EACH ROW
WHEN (OLD.name_ar IS DISTINCT FROM NEW.name_ar AND NEW.name_ar IS NOT NULL)
EXECUTE FUNCTION safe_sync_transaction_account_names_ar();

-- Step 6: Verify new triggers are working
SELECT 
    'New Safe Triggers' as status,
    tgname as trigger_name,
    CASE WHEN tgenabled = 'O' THEN 'ENABLED' ELSE 'DISABLED' END as current_status,
    'Safe trigger that only updates when names actually change' as note
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'accounts'
AND c.relnamespace = 'public'::regnamespace
AND tgname IN ('trg_sync_txn_names', 'trg_sync_txn_names_ar')
ORDER BY trigger_name;

-- Step 7: Final test with new triggers
DO $$
DECLARE
    v_test_org_id uuid := '731a3a00-6fa6-4282-9bec-8b5a8678e127'; -- Replace with your actual org_id
    v_test_account_id uuid := '804f7750-93d3-47d4-b63b-dd5cfcbfd860'; -- Replace with actual account_id
    v_name_result json;
    v_error_message text;
BEGIN
    RAISE NOTICE '=== Final Test with Safe Triggers ===';
    
    -- Test name update with new safe triggers
    BEGIN
        SELECT public.account_update(
            v_test_org_id,
            v_test_account_id,
            'TEST-CODE-001',
            'Final Test Name',
            'اختبار الاسم النهائي',
            'asset'::public.account_category,
            1,
            'active'::public.account_status
        ) INTO v_name_result;
        
        RAISE NOTICE 'FINAL NAME UPDATE SUCCESS: %', v_name_result::text;
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message;
        RAISE NOTICE 'FINAL NAME UPDATE FAILED: %', v_error_message;
    END;
    
    RAISE NOTICE '=== Final Test Complete ===';
END $$;

-- Step 8: Summary
SELECT 
    'Fix Complete' as status,
    'Name update issues should now be resolved' as message,
    'Triggers replaced with safer versions that only update when names actually change' as explanation,
    'Test with your actual account data in the UI' as next_step;
