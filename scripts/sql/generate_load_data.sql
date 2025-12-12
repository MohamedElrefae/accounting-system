
-- Load Test Data Generation Script
-- Run this in Supabase SQL Editor to generate 1000 dummy transactions

DO $$
DECLARE
  v_org_id uuid;
  v_debit_acc_id uuid;
  v_credit_acc_id uuid;
  v_project_id uuid;
  v_cost_center_id uuid;
  v_tx_id uuid;
  v_amount numeric;
  v_date date;
  v_counter integer := 0;
BEGIN
  -- 1. Get or Create Organization
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (code, name, status)
    VALUES ('LOAD-TEST', 'Load Test Org', 'active')
    RETURNING id INTO v_org_id;
    RAISE NOTICE 'Created Organization: %', v_org_id;
  ELSE
    RAISE NOTICE 'Using Organization: %', v_org_id;
  END IF;

  -- 2. Ensure Accounts exist
  SELECT id INTO v_debit_acc_id FROM accounts WHERE org_id = v_org_id LIMIT 1;
  IF v_debit_acc_id IS NULL THEN
    INSERT INTO accounts (org_id, code, name, type) VALUES 
    (v_org_id, '1001', 'Cash', 'asset') RETURNING id INTO v_debit_acc_id;
    
    INSERT INTO accounts (org_id, code, name, type) VALUES 
    (v_org_id, '2001', 'Sales', 'revenue') RETURNING id INTO v_credit_acc_id;
  ELSE
    SELECT id INTO v_credit_acc_id FROM accounts WHERE org_id = v_org_id AND id != v_debit_acc_id LIMIT 1;
    IF v_credit_acc_id IS NULL THEN
       INSERT INTO accounts (org_id, code, name, type) VALUES 
       (v_org_id, '9999', 'Load Dummy', 'liability') RETURNING id INTO v_credit_acc_id;
    END IF;
  END IF;

  -- 3. Get Project/Cost Center (Optional)
  SELECT id INTO v_project_id FROM projects WHERE org_id = v_org_id OR org_id IS NULL LIMIT 1;
  SELECT id INTO v_cost_center_id FROM cost_centers WHERE org_id = v_org_id LIMIT 1;

  -- 4. Generate 1000 Transactions
  FOR i IN 1..1000 LOOP
    v_amount := floor(random() * 10000 + 100);
    v_date := CURRENT_DATE - (floor(random() * 30)::int);
    v_tx_id := gen_random_uuid();

    -- Insert Header
    INSERT INTO transactions (
      id, org_id, entry_number, entry_date, description, 
      project_id, is_posted, created_by, approval_status
    ) VALUES (
      v_tx_id,
      v_org_id,
      'LOAD-' || lpad(i::text, 4, '0'),
      v_date,
      'Load Test Transaction ' || i,
      v_project_id,
      false, -- is_posted (set to false to avoid constraint chk_transactions_post_fields requiring posted_by)
      null, -- system generated
      CASE WHEN random() > 0.7 THEN 'approved' ELSE 'draft' END
    );

    -- Insert Lines (Debit)
    INSERT INTO transaction_lines (
      transaction_id, line_no, account_id, debit_amount, credit_amount, 
      description, cost_center_id, org_id
    ) VALUES (
      v_tx_id, 1, v_debit_acc_id, v_amount, 0,
      'Debit Line', v_cost_center_id, v_org_id
    );

    -- Insert Lines (Credit)
    INSERT INTO transaction_lines (
      transaction_id, line_no, account_id, debit_amount, credit_amount, 
      description, cost_center_id, org_id
    ) VALUES (
      v_tx_id, 2, v_credit_acc_id, 0, v_amount,
      'Credit Line', v_cost_center_id, v_org_id
    );
    
    v_counter := v_counter + 1;
  END LOOP;

  RAISE NOTICE 'Successfully generated % transactions', v_counter;
END $$;
