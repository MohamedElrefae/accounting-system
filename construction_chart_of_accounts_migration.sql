-- ================================================================
-- CONSTRUCTION CHART OF ACCOUNTS MIGRATION
-- ================================================================
-- This script implements the new 4-level construction-focused chart of accounts
-- Based on the bilingual Arabic/English structure from new tree of accounts.md
-- Run AFTER backup script completion

BEGIN;

-- Get the organization ID (replace with actual org ID or use dynamic selection)
DO $$
DECLARE 
    target_org_id UUID;
    account_1000 UUID; account_1100 UUID; account_1110 UUID; account_1120 UUID; account_1130 UUID;
    account_1200 UUID; account_1210 UUID; account_1220 UUID; account_1230 UUID; account_1240 UUID; 
    account_1245 UUID; account_1246 UUID; account_1280 UUID; account_1300 UUID; account_1310 UUID;
    account_1330 UUID; account_1400 UUID; account_1410 UUID; account_1420 UUID; account_1430 UUID;
    account_1490 UUID; account_1600 UUID;
    account_2000 UUID; account_2100 UUID; account_2110 UUID; account_2120 UUID; account_2130 UUID;
    account_2140 UUID; account_2200 UUID; account_2210 UUID; account_2220 UUID; account_2400 UUID;
    account_2430 UUID; account_2600 UUID; account_2610 UUID; account_2620 UUID;
    account_3000 UUID; account_3100 UUID; account_3300 UUID; account_3350 UUID;
    account_4000 UUID; account_4100 UUID; account_4110 UUID; account_4120 UUID; account_4130 UUID;
    account_4200 UUID; account_4210 UUID; account_4220 UUID; account_4300 UUID; account_4310 UUID; account_4320 UUID;
    account_5000 UUID; account_5100 UUID; account_5110 UUID; account_5120 UUID; account_5130 UUID;
    account_5140 UUID; account_5160 UUID; account_5170 UUID; account_5200 UUID; account_5210 UUID;
    account_5220 UUID; account_5230 UUID; account_5240 UUID; account_5250 UUID; account_5260 UUID;
    account_5290 UUID; account_5900 UUID; account_5910 UUID; account_5990 UUID;
BEGIN
    -- Get the target organization (use the main organization)
    SELECT id INTO target_org_id 
    FROM organizations 
    WHERE code = 'MAIN' 
    LIMIT 1;
    
    IF target_org_id IS NULL THEN
        RAISE EXCEPTION 'Target organization not found. Please update organization selection logic.';
    END IF;
    
    RAISE NOTICE 'Starting migration for organization: %', target_org_id;

    -- ================================================================
    -- STEP 1: Clear existing accounts (if starting fresh)
    -- ================================================================
    RAISE NOTICE 'Clearing existing accounts for organization: %', target_org_id;
    DELETE FROM accounts WHERE org_id = target_org_id;
    
    -- ================================================================
    -- STEP 2: Create Level 1 Accounts (Main Categories)
    -- ================================================================
    RAISE NOTICE 'Creating Level 1 accounts...';
    
    -- 1000 الأصول | 1000 Assets
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '1000', 'Assets', 'الأصول', '1000', 1, 'asset', null, false, 'active', false, now(), now()) 
    RETURNING id INTO account_1000;
    
    -- 2000 الخصوم | 2000 Liabilities  
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '2000', 'Liabilities', 'الخصوم', '2000', 1, 'liability', null, false, 'active', false, now(), now()) 
    RETURNING id INTO account_2000;
    
    -- 3000 حقوق الملكية | 3000 Equity
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '3000', 'Equity', 'حقوق الملكية', '3000', 1, 'equity', null, false, 'active', false, now(), now()) 
    RETURNING id INTO account_3000;
    
    -- 4000 الإيرادات | 4000 Revenue
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '4000', 'Revenue', 'الإيرادات', '4000', 1, 'revenue', null, false, 'active', false, now(), now()) 
    RETURNING id INTO account_4000;
    
    -- 5000 التكاليف والمصروفات | 5000 Costs and Expenses
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '5000', 'Costs and Expenses', 'التكاليف والمصروفات', '5000', 1, 'expense', null, false, 'active', false, now(), now()) 
    RETURNING id INTO account_5000;

    -- ================================================================
    -- STEP 3: Create Level 2 Accounts (Sub-categories)
    -- ================================================================
    RAISE NOTICE 'Creating Level 2 accounts...';
    
    -- ASSETS Level 2
    -- 1100 النقدية وما في حكمها | 1100 Cash and Cash Equivalents
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '1100', 'Cash and Cash Equivalents', 'النقدية وما في حكمها', '1000.1100', 2, 'asset', account_1000, false, 'active', false, now(), now()) 
    RETURNING id INTO account_1100;
    
    -- 1200 الذمم والأصول المتداولة الأخرى | 1200 Receivables and Other Current Assets
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '1200', 'Receivables and Other Current Assets', 'الذمم والأصول المتداولة الأخرى', '1000.1200', 2, 'asset', account_1000, false, 'active', false, now(), now()) 
    RETURNING id INTO account_1200;
    
    -- 1300 المخزون والمواد | 1300 Inventory and Materials
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '1300', 'Inventory and Materials', 'المخزون والمواد', '1000.1300', 2, 'asset', account_1000, false, 'active', false, now(), now()) 
    RETURNING id INTO account_1300;
    
    -- 1400 الممتلكات والآلات والمعدات | 1400 Property, Plant and Equipment
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '1400', 'Property, Plant and Equipment', 'الممتلكات والآلات والمعدات', '1000.1400', 2, 'asset', account_1000, false, 'active', false, now(), now()) 
    RETURNING id INTO account_1400;
    
    -- 1600 أعمال تحت التنفيذ | 1600 Work in Progress (WIP) - Construction specific
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '1600', 'Work in Progress (WIP)', 'أعمال تحت التنفيذ', '1000.1600', 2, 'asset', account_1000, false, 'active', false, now(), now()) 
    RETURNING id INTO account_1600;

    -- LIABILITIES Level 2
    -- 2100 الدائنون التجاريون ومقاولو الباطن | 2100 Trade Payables and Subcontractors
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '2100', 'Trade Payables and Subcontractors', 'الدائنون التجاريون ومقاولو الباطن', '2000.2100', 2, 'liability', account_2000, false, 'active', false, now(), now()) 
    RETURNING id INTO account_2100;
    
    -- 2200 التزامات قصيرة الأجل | 2200 Short-Term Liabilities
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '2200', 'Short-Term Liabilities', 'التزامات قصيرة الأجل', '2000.2200', 2, 'liability', account_2000, false, 'active', false, now(), now()) 
    RETURNING id INTO account_2200;
    
    -- 2400 ضرائب ورسوم | 2400 Taxes and Duties
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '2400', 'Taxes and Duties', 'ضرائب ورسوم', '2000.2400', 2, 'liability', account_2000, false, 'active', false, now(), now()) 
    RETURNING id INTO account_2400;
    
    -- 2600 قروض وتمويل | 2600 Loans and Borrowings
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '2600', 'Loans and Borrowings', 'قروض وتمويل', '2000.2600', 2, 'liability', account_2000, false, 'active', false, now(), now()) 
    RETURNING id INTO account_2600;

    -- EQUITY Level 2
    -- 3100 رأس المال والاحتياطيات | 3100 Capital and Reserves
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '3100', 'Capital and Reserves', 'رأس المال والاحتياطيات', '3000.3100', 2, 'equity', account_3000, false, 'active', false, now(), now()) 
    RETURNING id INTO account_3100;
    
    -- 3300 الأرباح المحتجزة والنتائج | 3300 Retained Earnings and Results
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '3300', 'Retained Earnings and Results', 'الأرباح المحتجزة والنتائج', '3000.3300', 2, 'equity', account_3000, false, 'active', false, now(), now()) 
    RETURNING id INTO account_3300;
    
    -- 3350 حسابات جارية مساهمين | 3350 Shareholders Current Accounts
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '3350', 'Shareholders Current Accounts', 'حسابات جارية مساهمين', '3000.3350', 2, 'equity', account_3000, false, 'active', false, now(), now()) 
    RETURNING id INTO account_3350;

    -- REVENUE Level 2
    -- 4100 إيرادات عقود المقاولات | 4100 Construction Contract Revenue
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '4100', 'Construction Contract Revenue', 'إيرادات عقود المقاولات', '4000.4100', 2, 'revenue', account_4000, false, 'active', false, now(), now()) 
    RETURNING id INTO account_4100;
    
    -- 4200 إيرادات أخرى | 4200 Other Revenue
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '4200', 'Other Revenue', 'إيرادات أخرى', '4000.4200', 2, 'revenue', account_4000, false, 'active', false, now(), now()) 
    RETURNING id INTO account_4200;
    
    -- 4300 إيرادات عكسية (خصومات/مردودات) | 4300 Contra Revenue (Discounts/Returns)
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '4300', 'Contra Revenue (Discounts/Returns)', 'إيرادات عكسية (خصومات/مردودات)', '4000.4300', 2, 'revenue', account_4000, false, 'active', false, now(), now()) 
    RETURNING id INTO account_4300;

    -- EXPENSES Level 2
    -- 5100 تكاليف تنفيذ مباشرة | 5100 Direct Construction Costs
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '5100', 'Direct Construction Costs', 'تكاليف تنفيذ مباشرة', '5000.5100', 2, 'expense', account_5000, false, 'active', false, now(), now()) 
    RETURNING id INTO account_5100;
    
    -- 5200 مصروفات تشغيل وإدارية | 5200 Operating and Administrative Expenses
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '5200', 'Operating and Administrative Expenses', 'مصروفات تشغيل وإدارية', '5000.5200', 2, 'expense', account_5000, false, 'active', false, now(), now()) 
    RETURNING id INTO account_5200;
    
    -- 5900 مصروفات أخرى | 5900 Other Expenses
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '5900', 'Other Expenses', 'مصروفات أخرى', '5000.5900', 2, 'expense', account_5000, false, 'active', false, now(), now()) 
    RETURNING id INTO account_5900;

    -- ================================================================
    -- STEP 4: Create Level 3 Accounts (Sub-sub-categories)
    -- ================================================================
    RAISE NOTICE 'Creating Level 3 accounts...';
    
    -- ASSETS Level 3 - Cash Group
    -- 1110 الخزينة | 1110 Cash on Hand
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '1110', 'Cash on Hand', 'الخزينة', '1000.1100.1110', 3, 'asset', account_1100, false, 'active', false, now(), now()) 
    RETURNING id INTO account_1110;
    
    -- 1120 البنوك | 1120 Banks
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '1120', 'Banks', 'البنوك', '1000.1100.1120', 3, 'asset', account_1100, false, 'active', false, now(), now()) 
    RETURNING id INTO account_1120;
    
    -- 1130 نقدية مقيدة / هوامش ضمان | 1130 Restricted Cash / Guarantee Margins
    INSERT INTO accounts (id, org_id, code, name, name_ar, path, level, category, parent_id, is_postable, status, allow_transactions, created_at, updated_at) 
    VALUES (gen_random_uuid(), target_org_id, '1130', 'Restricted Cash / Guarantee Margins', 'نقدية مقيدة / هوامش ضمان', '1000.1100.1130', 3, 'asset', account_1100, false, 'active', false, now(), now()) 
    RETURNING id INTO account_1130;

    -- Continue with more Level 3 accounts...
    -- (Add additional Level 3 accounts as needed - this is a sample structure)
    
    -- Log completion
    RAISE NOTICE 'Chart of accounts migration completed successfully for organization: %', target_org_id;
    
    -- Update account prefix map for new numbering system
    DELETE FROM account_prefix_map WHERE 1=1; -- Clear existing
    
    INSERT INTO account_prefix_map (id, prefix, account_group, description, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), '10', 'assets', 'Non-current assets', true, now(), now()),
    (gen_random_uuid(), '11', 'assets', 'Cash and cash equivalents', true, now(), now()),
    (gen_random_uuid(), '12', 'assets', 'Receivables and current assets', true, now(), now()),
    (gen_random_uuid(), '13', 'assets', 'Inventory and materials', true, now(), now()),
    (gen_random_uuid(), '14', 'assets', 'Property, plant & equipment', true, now(), now()),
    (gen_random_uuid(), '16', 'assets', 'Work in Progress', true, now(), now()),
    (gen_random_uuid(), '21', 'liabilities', 'Trade payables', true, now(), now()),
    (gen_random_uuid(), '22', 'liabilities', 'Short-term liabilities', true, now(), now()),
    (gen_random_uuid(), '24', 'liabilities', 'Taxes and duties', true, now(), now()),
    (gen_random_uuid(), '26', 'liabilities', 'Loans and borrowings', true, now(), now()),
    (gen_random_uuid(), '31', 'equity', 'Capital and reserves', true, now(), now()),
    (gen_random_uuid(), '33', 'equity', 'Retained earnings', true, now(), now()),
    (gen_random_uuid(), '41', 'revenue', 'Construction revenue', true, now(), now()),
    (gen_random_uuid(), '42', 'revenue', 'Other revenue', true, now(), now()),
    (gen_random_uuid(), '43', 'revenue', 'Contra revenue', true, now(), now()),
    (gen_random_uuid(), '51', 'expenses', 'Direct construction costs', true, now(), now()),
    (gen_random_uuid(), '52', 'expenses', 'Operating expenses', true, now(), now()),
    (gen_random_uuid(), '59', 'expenses', 'Other expenses', true, now(), now());

END $$;

COMMIT;

-- Display completion message
SELECT 
    'Construction Chart of Accounts Migration Completed' as status,
    count(*) as total_accounts_created
FROM accounts 
WHERE org_id = (SELECT id FROM organizations WHERE code = 'MAIN' LIMIT 1);
