-- ============================================================================
-- FINAL VERIFICATION - RUN AFTER ALL PARTS
-- ============================================================================

DO $$
DECLARE
    v_count INTEGER;
    v_debit NUMERIC;
    v_credit NUMERIC;
    v_balance NUMERIC;
    v_with_class INTEGER;
    v_with_proj INTEGER;
    v_with_anal INTEGER;
    v_with_sub INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        SUM(debit_amount),
        SUM(credit_amount),
        SUM(debit_amount) - SUM(credit_amount),
        COUNT(CASE WHEN classification_id IS NOT NULL THEN 1 END),
        COUNT(CASE WHEN project_id IS NOT NULL THEN 1 END),
        COUNT(CASE WHEN analysis_work_item_id IS NOT NULL THEN 1 END),
        COUNT(CASE WHEN sub_tree_id IS NOT NULL THEN 1 END)
    INTO v_count, v_debit, v_credit, v_balance, v_with_class, v_with_proj, v_with_anal, v_with_sub
    FROM transaction_lines WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

    RAISE NOTICE '=========================================';
    RAISE NOTICE 'FINAL IMPORT VERIFICATION';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Total lines: %', v_count;
    RAISE NOTICE 'Total debit: %', v_debit;
    RAISE NOTICE 'Total credit: %', v_credit;
    RAISE NOTICE 'Balance: %', v_balance;
    RAISE NOTICE '';
    RAISE NOTICE 'Dimension Coverage:';
    RAISE NOTICE '  Classification: % (%.1f%%)', v_with_class, (v_with_class::NUMERIC / v_count * 100);
    RAISE NOTICE '  Project: % (%.1f%%)', v_with_proj, (v_with_proj::NUMERIC / v_count * 100);
    RAISE NOTICE '  Analysis: % (%.1f%%)', v_with_anal, (v_with_anal::NUMERIC / v_count * 100);
    RAISE NOTICE '  Sub-tree: % (%.1f%%)', v_with_sub, (v_with_sub::NUMERIC / v_count * 100);
    RAISE NOTICE '';

    IF v_count != 13963 THEN
        RAISE EXCEPTION 'Line count mismatch: expected 13963, got %', v_count;
    END IF;

    IF ABS(v_debit - 905925674.8393677) > 0.01 THEN
        RAISE EXCEPTION 'Debit total mismatch';
    END IF;

    IF ABS(v_credit - 905925674.8393676) > 0.01 THEN
        RAISE EXCEPTION 'Credit total mismatch';
    END IF;

    IF ABS(v_balance) > 0.01 THEN
        RAISE EXCEPTION 'Transactions not balanced: %', v_balance;
    END IF;

    RAISE NOTICE '✅ ALL VERIFICATIONS PASSED';
    RAISE NOTICE '';
END $$;
