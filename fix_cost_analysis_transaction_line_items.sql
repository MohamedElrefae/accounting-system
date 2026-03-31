-- Fix Cost Analysis Report to use Transaction Line Items with Against Account
-- This creates the necessary views and functions for the cost analysis report

-- Step 0: Drop existing views to avoid column name conflicts
DROP VIEW IF EXISTS v_transactions_enriched_cost_analysis;
DROP VIEW IF EXISTS v_transaction_line_items_cost_analysis;
DROP FUNCTION IF EXISTS get_cost_analysis_data(p_search text, p_date_from date, p_date_to date, p_org_id uuid, p_project_id uuid, p_debit_account_id uuid, p_credit_account_id uuid, p_approval_status text, p_classification_id uuid, p_cost_center_id uuid, p_work_item_id uuid, p_analysis_work_item_id uuid, p_sub_tree_id uuid, p_has_cost_analysis boolean, p_is_compliant boolean, p_sort_field text, p_sort_order text, p_page integer, p_page_size integer);

-- Step 1: Create view for transaction line items with against account information
CREATE OR REPLACE VIEW v_transaction_line_items_cost_analysis AS
SELECT 
    -- Transaction header info
    t.id AS transaction_id,
    t.entry_number,
    t.entry_date,
    t.description AS transaction_description,
    t.org_id,
    o.code AS org_code,
    o.name AS org_name,
    t.project_id AS transaction_project_id,
    hp.code AS transaction_project_code,
    hp.name AS transaction_project_name,
    t.approval_status,
    t.is_posted,
    t.created_by,
    t.created_at,
    t.updated_at,
    
    -- Transaction line info
    tl.id AS transaction_line_id,
    tl.line_no,
    tl.account_id,
    acc.code AS account_code,
    acc.name AS account_name,
    acc.name_ar AS account_name_ar,
    tl.debit_amount,
    tl.credit_amount,
    tl.description AS line_description,
    tl.project_id AS line_project_id,
    p.code AS project_code,
    p.name AS project_name,
    tl.cost_center_id,
    cc.code AS cost_center_code,
    cc.name AS cost_center_name,
    tl.work_item_id,
    wi.code AS work_item_code,
    wi.name AS work_item_name,
    tl.analysis_work_item_id,
    awi.code AS analysis_work_item_code,
    awi.name AS analysis_work_item_name,
    tl.classification_id,
    cls.code AS classification_code,
    cls.name AS classification_name,
    tl.sub_tree_id,
    st.code AS sub_tree_code,
    st.description AS sub_tree_name,
    
    -- Against account information (from other lines in same transaction)
    against_acc.code AS against_account_code,
    against_acc.name AS against_account_name,
    against_acc.name_ar AS against_account_name_ar,
    
    -- Transaction line items info
    tli.id AS line_item_id,
    tli.line_number AS item_line_number,
    tli.quantity,
    tli.percentage,
    tli.unit_price,
    tli.unit_of_measure,
    tli.total_amount,
    tli.deduction_percentage,
    tli.deduction_amount,
    tli.addition_percentage,
    tli.addition_amount,
    tli.net_amount,
    
    -- Line item catalog info
    li.code AS item_code,
    li.name AS item_name,
    li.name_ar AS item_name_ar,
    
    -- Cost analysis validation fields
    COALESCE(line_stats.total_items, 0)::integer AS cost_analysis_items_count,
    COALESCE(line_stats.total_sum, 0.0)::numeric AS cost_analysis_total_amount,
    (tli.id IS NOT NULL) AS has_cost_analysis_items,
    COALESCE(cav.has_cost_analysis_items, false) AS validation_has_items,
    COALESCE(cav.is_two_line_transaction, false) AS is_two_line_transaction,
    COALESCE(cav.dimensions_match, true) AS dimensions_match,
    cav.validation_errors,
    COALESCE(cav.validated_at, t.updated_at) AS validated_at

FROM transactions t
JOIN organizations o ON o.id = t.org_id
LEFT JOIN projects hp ON hp.id = t.project_id
JOIN transaction_lines tl ON tl.transaction_id = t.id
JOIN accounts acc ON acc.id = tl.account_id
LEFT JOIN projects p ON p.id = tl.project_id
LEFT JOIN cost_centers cc ON cc.id = tl.cost_center_id
LEFT JOIN work_items wi ON wi.id = tl.work_item_id
LEFT JOIN analysis_work_items awi ON awi.id = tl.analysis_work_item_id
LEFT JOIN transaction_classification cls ON cls.id = tl.classification_id
LEFT JOIN sub_tree st ON st.id = tl.sub_tree_id

-- Subquery for per-line item statistics
LEFT JOIN (
    SELECT 
        transaction_line_id,
        COUNT(id) AS total_items,
        SUM(net_amount) AS total_sum
    FROM transaction_line_items
    GROUP BY transaction_line_id
) line_stats ON line_stats.transaction_line_id = tl.id

-- Validation tracking
LEFT JOIN cost_analysis_transaction_validation cav ON cav.transaction_id = t.id

-- Get against account (other line in same transaction)
LEFT JOIN LATERAL (
    SELECT 
        acc_against.id,
        acc_against.code,
        acc_against.name,
        acc_against.name_ar
    FROM transaction_lines tl_against
    JOIN accounts acc_against ON acc_against.id = tl_against.account_id
    WHERE tl_against.transaction_id = t.id
      AND tl_against.id != tl.id
    LIMIT 1
) against_acc ON true

-- Join transaction line items
LEFT JOIN transaction_line_items tli ON tli.transaction_line_id = tl.id
LEFT JOIN line_items li ON li.id = tli.line_item_id;

-- Step 2: Create enriched view with cost analysis calculations
CREATE OR REPLACE VIEW v_transactions_enriched_cost_analysis AS
SELECT 
    -- Transaction header info
    v.transaction_id,
    v.entry_number,
    v.entry_date,
    v.transaction_description,
    v.org_id,
    v.org_code,
    v.org_name,
    v.transaction_project_id,
    v.transaction_project_code,
    v.transaction_project_name,
    v.approval_status,
    v.is_posted,
    v.created_by,
    v.created_at,
    v.updated_at,
    
    -- Transaction line info
    v.transaction_line_id,
    v.line_no,
    v.account_id,
    v.account_code,
    v.account_name,
    v.account_name_ar,
    v.debit_amount,
    v.credit_amount,
    v.line_description,
    v.line_project_id,
    v.project_code,
    v.project_name,
    v.cost_center_id,
    v.cost_center_code,
    v.cost_center_name,
    v.work_item_id,
    v.work_item_code,
    v.work_item_name,
    v.analysis_work_item_id,
    v.analysis_work_item_code,
    v.analysis_work_item_name,
    v.classification_id,
    v.classification_code,
    v.classification_name,
    v.sub_tree_id,
    v.sub_tree_code,
    v.sub_tree_name,
    
    -- Against account information
    v.against_account_code,
    v.against_account_name,
    v.against_account_name_ar,
    
    -- Transaction line items info
    v.line_item_id,
    v.item_line_number,
    v.quantity,
    v.percentage,
    v.unit_price,
    v.unit_of_measure,
    v.total_amount,
    v.deduction_percentage,
    v.deduction_amount,
    v.addition_percentage,
    v.addition_amount,
    v.net_amount,
    
    -- Line item catalog info
    v.item_code,
    v.item_name,
    v.item_name_ar,
    
    -- Cost analysis validation fields
    v.cost_analysis_items_count,
    v.cost_analysis_total_amount,
    v.has_cost_analysis_items,
    v.validation_has_items,
    v.is_two_line_transaction,
    v.dimensions_match,
    v.validation_errors,
    v.validated_at
FROM v_transaction_line_items_cost_analysis v;

-- Step 3: Grant permissions
GRANT SELECT ON v_transaction_line_items_cost_analysis TO authenticated, service_role, anon;
GRANT SELECT ON v_transactions_enriched_cost_analysis TO authenticated, service_role, anon;

-- Step 4: Create function to get cost analysis data with filters
CREATE OR REPLACE FUNCTION get_cost_analysis_data(
    p_search text DEFAULT NULL,
    p_date_from date DEFAULT NULL,
    p_date_to date DEFAULT NULL,
    p_org_id uuid DEFAULT NULL,
    p_project_id uuid DEFAULT NULL,
    p_debit_account_id uuid DEFAULT NULL,
    p_credit_account_id uuid DEFAULT NULL,
    p_approval_status text DEFAULT NULL,
    p_classification_id uuid DEFAULT NULL,
    p_cost_center_id uuid DEFAULT NULL,
    p_work_item_id uuid DEFAULT NULL,
    p_analysis_work_item_id uuid DEFAULT NULL,
    p_sub_tree_id uuid DEFAULT NULL,
    p_item_id uuid DEFAULT NULL,
    p_has_cost_analysis boolean DEFAULT NULL,
    p_is_compliant boolean DEFAULT NULL,
    p_sort_field text DEFAULT 'entry_date',
    p_sort_order text DEFAULT 'desc',
    p_page integer DEFAULT 1,
    p_page_size integer DEFAULT 20
)
RETURNS TABLE (
    transaction_id uuid,
    entry_number text,
    entry_date date,
    transaction_description text,
    org_code text,
    org_name text,
    line_no integer,
    account_code text,
    account_name text,
    account_name_ar text,
    debit_amount numeric,
    credit_amount numeric,
    line_description text,
    project_code text,
    project_name text,
    cost_center_code text,
    cost_center_name text,
    work_item_code text,
    work_item_name text,
    analysis_work_item_code text,
    analysis_work_item_name text,
    classification_code text,
    classification_name text,
    sub_tree_code text,
    sub_tree_name text,
    against_account_code text,
    against_account_name text,
    against_account_name_ar text,
    line_item_id uuid,
    item_line_number integer,
    quantity numeric,
    percentage numeric,
    unit_price numeric,
    unit_of_measure text,
    total_amount numeric,
    deduction_percentage numeric,
    deduction_amount numeric,
    addition_percentage numeric,
    addition_amount numeric,
    net_amount numeric,
    item_code text,
    item_name text,
    item_name_ar text,
    cost_analysis_items_count integer,
    cost_analysis_total_amount numeric,
    has_cost_analysis_items boolean,
    validation_has_items boolean,
    is_two_line_transaction boolean,
    dimensions_match boolean,
    validation_errors jsonb,
    validated_at timestamptz,
    approval_status text,
    is_posted boolean,
    created_by uuid,
    created_at timestamptz,
    updated_at timestamptz,
    total_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_offset int := ((p_page - 1) * p_page_size);
BEGIN
    RETURN QUERY
    WITH filtered_data AS (
        SELECT 
            vea.transaction_id, vea.entry_number, vea.entry_date, vea.transaction_description, vea.org_id, vea.org_code, vea.org_name,
            vea.transaction_project_id, vea.transaction_project_code, vea.transaction_project_name, vea.approval_status, vea.is_posted,
            vea.created_by, vea.created_at, vea.updated_at, vea.transaction_line_id, vea.line_no, vea.account_id, vea.account_code,
            vea.account_name, vea.account_name_ar, vea.debit_amount, vea.credit_amount, vea.line_description, vea.line_project_id,
            vea.project_code, vea.project_name, vea.cost_center_id, vea.cost_center_code, vea.cost_center_name, vea.work_item_id,
            vea.work_item_code, vea.work_item_name, vea.analysis_work_item_id, vea.analysis_work_item_code,
            vea.analysis_work_item_name, vea.classification_id, vea.classification_code, vea.classification_name,
            vea.sub_tree_id, vea.sub_tree_code, vea.sub_tree_name, vea.against_account_code, vea.against_account_name,
            vea.against_account_name_ar, vea.line_item_id, vea.item_line_number, vea.quantity, vea.percentage, vea.unit_price,
            vea.unit_of_measure, vea.total_amount, vea.deduction_percentage, vea.deduction_amount, vea.addition_percentage,
            vea.addition_amount, vea.net_amount, vea.item_code, vea.item_name, vea.item_name_ar, vea.cost_analysis_items_count,
            vea.cost_analysis_total_amount, vea.has_cost_analysis_items, vea.validation_has_items, vea.is_two_line_transaction,
            vea.dimensions_match, vea.validation_errors, vea.validated_at
        FROM v_transactions_enriched_cost_analysis vea
        WHERE (p_search IS NULL OR 
                vea.transaction_description ILIKE '%' || p_search || '%' OR
                vea.line_description ILIKE '%' || p_search || '%' OR
                vea.entry_number ILIKE '%' || p_search || '%')
          AND (p_date_from IS NULL OR vea.entry_date >= p_date_from)
          AND (p_date_to IS NULL OR vea.entry_date <= p_date_to)
          AND (p_org_id IS NULL OR vea.org_id = p_org_id)
          AND (p_project_id IS NULL OR vea.line_project_id = p_project_id)
          AND (p_debit_account_id IS NULL OR (vea.account_id = p_debit_account_id AND vea.debit_amount > 0))
          AND (p_credit_account_id IS NULL OR (vea.account_id = p_credit_account_id AND vea.credit_amount > 0))
          AND (p_approval_status IS NULL OR vea.approval_status = p_approval_status)
          AND (p_classification_id IS NULL OR vea.classification_id = p_classification_id)
          AND (p_cost_center_id IS NULL OR vea.cost_center_id = p_cost_center_id)
          AND (p_work_item_id IS NULL OR vea.work_item_id = p_work_item_id)
          AND (p_analysis_work_item_id IS NULL OR vea.analysis_work_item_id = p_analysis_work_item_id)
          AND (p_sub_tree_id IS NULL OR vea.sub_tree_id = p_sub_tree_id)
          AND (p_item_id IS NULL OR vea.line_item_id = p_item_id)
          AND (p_has_cost_analysis IS NULL OR vea.has_cost_analysis_items = p_has_cost_analysis)
          AND (p_is_compliant IS NULL OR vea.dimensions_match = p_is_compliant)
    ),
    counted_data AS (
        SELECT fd.*, COUNT(*) OVER () as total_count
        FROM filtered_data fd
    )
    SELECT 
        cd.transaction_id, 
        cd.entry_number::text, 
        cd.entry_date, 
        cd.transaction_description::text, 
        cd.org_code::text, 
        cd.org_name::text,
        cd.line_no, 
        cd.account_code::text, 
        cd.account_name::text, 
        cd.account_name_ar::text, 
        cd.debit_amount::numeric, 
        cd.credit_amount::numeric, 
        cd.line_description::text,
        cd.project_code::text, 
        cd.project_name::text, 
        cd.cost_center_code::text, 
        cd.cost_center_name::text, 
        cd.work_item_code::text, 
        cd.work_item_name::text,
        cd.analysis_work_item_code::text, 
        cd.analysis_work_item_name::text, 
        cd.classification_code::text, 
        cd.classification_name::text,
        cd.sub_tree_code::text, 
        cd.sub_tree_name::text, 
        cd.against_account_code::text, 
        cd.against_account_name::text, 
        cd.against_account_name_ar::text,
        cd.line_item_id, 
        cd.item_line_number, 
        cd.quantity::numeric, 
        cd.percentage::numeric, 
        cd.unit_price::numeric, 
        cd.unit_of_measure::text,
        cd.total_amount::numeric, 
        cd.deduction_percentage::numeric, 
        cd.deduction_amount::numeric, 
        cd.addition_percentage::numeric, 
        cd.addition_amount::numeric, 
        cd.net_amount::numeric,
        cd.item_code::text, 
        cd.item_name::text, 
        cd.item_name_ar::text, 
        cd.cost_analysis_items_count, 
        cd.cost_analysis_total_amount::numeric,
        cd.has_cost_analysis_items, 
        cd.validation_has_items, 
        cd.is_two_line_transaction, 
        cd.dimensions_match,
        cd.validation_errors, 
        cd.validated_at, 
        cd.approval_status::text, 
        cd.is_posted, 
        cd.created_by, 
        cd.created_at, 
        cd.updated_at,
        cd.total_count
    FROM counted_data cd
    ORDER BY 
        CASE WHEN p_sort_field = 'entry_date' AND p_sort_order = 'asc' THEN cd.entry_date END ASC,
        CASE WHEN p_sort_field = 'entry_date' AND p_sort_order = 'desc' THEN cd.entry_date END DESC,
        CASE WHEN p_sort_field = 'entry_number' AND p_sort_order = 'asc' THEN cd.entry_number END ASC,
        CASE WHEN p_sort_field = 'entry_number' AND p_sort_order = 'desc' THEN cd.entry_number END DESC,
        CASE WHEN p_sort_field = 'account_code' AND p_sort_order = 'asc' THEN cd.account_code END ASC,
        CASE WHEN p_sort_field = 'account_code' AND p_sort_order = 'desc' THEN cd.account_code END DESC,
        CASE WHEN p_sort_field = 'debit_amount' AND p_sort_order = 'asc' THEN cd.debit_amount END ASC,
        CASE WHEN p_sort_field = 'debit_amount' AND p_sort_order = 'desc' THEN cd.debit_amount END DESC,
        CASE WHEN p_sort_field = 'credit_amount' AND p_sort_order = 'asc' THEN cd.credit_amount END ASC,
        CASE WHEN p_sort_field = 'credit_amount' AND p_sort_order = 'desc' THEN cd.credit_amount END DESC,
        -- Default sort if field not matched
        CASE WHEN p_sort_field NOT IN ('entry_date', 'entry_number', 'account_code', 'debit_amount', 'credit_amount') AND p_sort_order = 'asc' THEN cd.entry_date END ASC,
        CASE WHEN p_sort_field NOT IN ('entry_date', 'entry_number', 'account_code', 'debit_amount', 'credit_amount') AND p_sort_order = 'desc' THEN cd.entry_date END DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$$;

-- Step 5: Grant permissions on function
GRANT EXECUTE ON FUNCTION get_cost_analysis_data TO authenticated, service_role, anon;

-- Step 6: Test queries (comment these out after testing)
/*
SELECT * FROM v_transactions_enriched_cost_analysis LIMIT 5;
SELECT * FROM get_cost_analysis_data(p_page_size := 5) LIMIT 5;
SELECT COUNT(*) FROM v_transactions_enriched_cost_analysis;
*/
