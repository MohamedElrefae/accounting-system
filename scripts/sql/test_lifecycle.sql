
-- Transaction Lifecycle Integration Test (SQL)
-- Run this in Supabase SQL Editor to verify the full flow: Create -> Lines -> Submit -> Approve -> Post

DO $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_debit_acc_id uuid;
  v_credit_acc_id uuid;
  v_tx_id uuid;
  v_status text;
  v_is_posted boolean;
BEGIN
  RAISE NOTICE '🚀 Starting Lifecycle Test...';

  -- 1. Setup Context
  -- Get ID of the user running the script (or a placeholder if null)
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
     -- Try to find a user or use a zero UUID
     SELECT id INTO v_user_id FROM auth.users LIMIT 1;
     IF v_user_id IS NULL THEN
       v_user_id := '00000000-0000-0000-0000-000000000000';
     END IF;
  END IF;
  RAISE NOTICE '   Actor ID: %', v_user_id;

  -- Get/Create Org
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (code, name, status) VALUES ('LC-TEST-SQL', 'Lifecycle SQL Org', 'active') RETURNING id INTO v_org_id;
  END IF;
  RAISE NOTICE '   Org ID: %', v_org_id;

  -- Get/Create Accounts
  SELECT id INTO v_debit_acc_id FROM accounts WHERE org_id = v_org_id LIMIT 1;
  IF v_debit_acc_id IS NULL THEN
    INSERT INTO accounts (org_id, code, name, type) VALUES (v_org_id, '1001-LC', 'Asset', 'asset') RETURNING id INTO v_debit_acc_id;
    INSERT INTO accounts (org_id, code, name, type) VALUES (v_org_id, '2001-LC', 'Liability', 'liability') RETURNING id INTO v_credit_acc_id;
  ELSE
    SELECT id INTO v_credit_acc_id FROM accounts WHERE org_id = v_org_id AND id != v_debit_acc_id LIMIT 1;
    IF v_credit_acc_id IS NULL THEN
       INSERT INTO accounts (org_id, code, name, type) VALUES (v_org_id, '9999-LC', 'Liability', 'liability') RETURNING id INTO v_credit_acc_id;
    END IF;
  END IF;

  -- 2. Create Header
  INSERT INTO transactions (
    org_id, entry_number, entry_date, description, created_by, approval_status, is_posted
  ) VALUES (
    v_org_id, 'TEST-LC-' || floor(random()*1000)::text, CURRENT_DATE, 'Lifecycle SQL Test', v_user_id, 'draft', false
  ) RETURNING id INTO v_tx_id;
  
  RAISE NOTICE '✅ Transaction Created: %', v_tx_id;

  -- 3. Create Lines
  INSERT INTO transaction_lines (transaction_id, line_no, account_id, debit_amount, credit_amount, org_id) VALUES
  (v_tx_id, 1, v_debit_acc_id, 100, 0, v_org_id),
  (v_tx_id, 2, v_credit_acc_id, 0, 100, v_org_id);
  
  RAISE NOTICE '✅ Lines Added';

  -- 4. Submit
  -- Note: We call the RPC logic directly or update status if RPC not accessible in DO block (it is)
  PERFORM submit_transaction_for_line_approval(v_tx_id, v_user_id);
  
  SELECT approval_status INTO v_status FROM transactions WHERE id = v_tx_id;
  RAISE NOTICE '   Status after submit: %', v_status;

  -- 5. Approve
  PERFORM review_transaction(v_tx_id, 'approve', 'SQL Test Approval');
  
  SELECT approval_status INTO v_status FROM transactions WHERE id = v_tx_id;
  RAISE NOTICE '   Status after approve: %', v_status;
  
  IF v_status != 'approved' THEN
    RAISE EXCEPTION '❌ Approval Failed';
  END IF;
  RAISE NOTICE '✅ Approved';

  -- 6. Post
  PERFORM post_transaction(v_tx_id, v_user_id);
  
  SELECT is_posted INTO v_is_posted FROM transactions WHERE id = v_tx_id;
  IF v_is_posted THEN
    RAISE NOTICE '✅ Posted Successfully';
  ELSE
    RAISE EXCEPTION '❌ Posting Failed';
  END IF;

  -- 7. Cleanup
  -- Force delete to clean up
  PERFORM sp_delete_transaction_cascade(v_tx_id, true);
  RAISE NOTICE '✅ Cleanup Complete';

END $$;
