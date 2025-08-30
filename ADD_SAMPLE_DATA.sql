-- ================================================
-- ADD SAMPLE DATA FOR TRIAL BALANCE TESTING
-- This script adds realistic accounting data to test your trial balance
-- ================================================

-- 1. First, let's check what data exists
SELECT 'CURRENT DATA CHECK:' as info;
SELECT 'Accounts count:' as table_name, COUNT(*) as count FROM public.accounts;
SELECT 'Transactions count:' as table_name, COUNT(*) as count FROM public.transactions;

-- 2. Add sample accounts if they don't exist
INSERT INTO public.accounts (code, name, account_type, org_id) VALUES
('1000', 'Cash', 'asset', gen_random_uuid()),
('1100', 'Accounts Receivable', 'asset', gen_random_uuid()),
('1200', 'Inventory', 'asset', gen_random_uuid()),
('2000', 'Accounts Payable', 'liability', gen_random_uuid()),
('2100', 'Notes Payable', 'liability', gen_random_uuid()),
('3000', 'Owner Equity', 'equity', gen_random_uuid()),
('4000', 'Sales Revenue', 'revenue', gen_random_uuid()),
('5000', 'Cost of Goods Sold', 'expense', gen_random_uuid()),
('5100', 'Office Expenses', 'expense', gen_random_uuid()),
('5200', 'Rent Expense', 'expense', gen_random_uuid())
ON CONFLICT (code) DO NOTHING;

-- 3. Add sample transactions
DO $$
DECLARE
    cash_id uuid;
    revenue_id uuid;
    cogs_id uuid;
    inventory_id uuid;
    receivable_id uuid;
    payable_id uuid;
    expense_id uuid;
BEGIN
    -- Get account IDs
    SELECT id INTO cash_id FROM public.accounts WHERE code = '1000';
    SELECT id INTO revenue_id FROM public.accounts WHERE code = '4000';
    SELECT id INTO cogs_id FROM public.accounts WHERE code = '5000';
    SELECT id INTO inventory_id FROM public.accounts WHERE code = '1200';
    SELECT id INTO receivable_id FROM public.accounts WHERE code = '1100';
    SELECT id INTO payable_id FROM public.accounts WHERE code = '2000';
    SELECT id INTO expense_id FROM public.accounts WHERE code = '5100';
    
    -- Transaction 1: Cash Sale
    INSERT INTO public.transactions (
        description, amount, debit_account_id, credit_account_id, 
        is_posted, transaction_date, org_id
    ) VALUES (
        'Cash Sale - Product A', 1000.00, cash_id, revenue_id, 
        true, CURRENT_DATE, gen_random_uuid()
    );
    
    -- Transaction 2: Cost of Goods Sold
    INSERT INTO public.transactions (
        description, amount, debit_account_id, credit_account_id, 
        is_posted, transaction_date, org_id
    ) VALUES (
        'COGS - Product A', 600.00, cogs_id, inventory_id, 
        true, CURRENT_DATE, gen_random_uuid()
    );
    
    -- Transaction 3: Credit Sale
    INSERT INTO public.transactions (
        description, amount, debit_account_id, credit_account_id, 
        is_posted, transaction_date, org_id
    ) VALUES (
        'Credit Sale - Product B', 1500.00, receivable_id, revenue_id, 
        true, CURRENT_DATE, gen_random_uuid()
    );
    
    -- Transaction 4: Office Expenses
    INSERT INTO public.transactions (
        description, amount, debit_account_id, credit_account_id, 
        is_posted, transaction_date, org_id
    ) VALUES (
        'Office Supplies Purchase', 250.00, expense_id, payable_id, 
        true, CURRENT_DATE, gen_random_uuid()
    );
    
    -- Transaction 5: Another Cash Sale
    INSERT INTO public.transactions (
        description, amount, debit_account_id, credit_account_id, 
        is_posted, transaction_date, org_id
    ) VALUES (
        'Cash Sale - Service', 800.00, cash_id, revenue_id, 
        true, CURRENT_DATE, gen_random_uuid()
    );
END $$;

-- 4. Verify data was added
SELECT 'AFTER ADDING DATA:' as info;
SELECT 'Accounts count:' as table_name, COUNT(*) as count FROM public.accounts;
SELECT 'Transactions count:' as table_name, COUNT(*) as count FROM public.transactions;

-- 5. Test the trial balance function
SELECT 'TESTING TRIAL BALANCE FUNCTION:' as info;
SELECT * FROM public.get_trial_balance_current_tx_simplified() LIMIT 10;

-- 6. Show sample transaction data
SELECT 'SAMPLE TRANSACTIONS:' as info;
SELECT 
    t.description,
    t.amount,
    da.code as debit_account,
    da.name as debit_name,
    ca.code as credit_account, 
    ca.name as credit_name,
    t.is_posted,
    t.transaction_date
FROM public.transactions t
LEFT JOIN public.accounts da ON t.debit_account_id = da.id
LEFT JOIN public.accounts ca ON t.credit_account_id = ca.id
ORDER BY t.transaction_date DESC, t.created_at DESC
LIMIT 5;

SELECT '✅ SAMPLE DATA ADDED SUCCESSFULLY! Your trial balance should now show data.' as result;
