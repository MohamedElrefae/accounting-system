-- Migration to combine accounting dimensions from counterparty lines
-- This ensures the Cost Analysis Report properly shows dimensions even if they are filled on the credit/debit side opposite of the item list.

CREATE OR REPLACE VIEW public.v_transactions_enriched_cost_analysis AS
 SELECT t.id AS transaction_id,
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
    v.transaction_line_id,
    tl.line_no,
    tl.account_id,
    acc.code AS account_code,
    acc.name AS account_name,
    acc.name_ar AS account_name_ar,
    tl.debit_amount,
    tl.credit_amount,
    tl.description AS line_description,
    -- Use COALESCE to fallback to the counterparty line's dimensions
    COALESCE(tl.project_id, against_acc.project_id) AS line_project_id,
    p.code AS project_code,
    p.name AS project_name,
    COALESCE(tl.cost_center_id, against_acc.cost_center_id) AS cost_center_id,
    cc.code AS cost_center_code,
    cc.name AS cost_center_name,
    COALESCE(tl.work_item_id, against_acc.work_item_id) AS work_item_id,
    wi.code AS work_item_code,
    wi.name AS work_item_name,
    COALESCE(tl.analysis_work_item_id, against_acc.analysis_work_item_id) AS analysis_work_item_id,
    awi.code AS analysis_work_item_code,
    awi.name AS analysis_work_item_name,
    COALESCE(tl.classification_id, against_acc.classification_id) AS classification_id,
    cls.code AS classification_code,
    cls.name AS classification_name,
    COALESCE(tl.sub_tree_id, against_acc.sub_tree_id) AS sub_tree_id,
    st.code AS sub_tree_code,
    st.description AS sub_tree_name,
    against_acc.code AS against_account_code,
    against_acc.name AS against_account_name,
    against_acc.name_ar AS against_account_name_ar,
    v.id AS line_item_id,
    v.line_number AS item_line_number,
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
    v.line_item_code AS item_code,
    v.line_item_name AS item_name,
    v.line_item_name_ar AS item_name_ar,
    (COALESCE(line_stats.total_items, (0)::bigint))::integer AS cost_analysis_items_count,
    COALESCE(line_stats.total_sum, 0.0) AS cost_analysis_total_amount,
    (v.id IS NOT NULL) AS has_cost_analysis_items,
    COALESCE(cav.has_cost_analysis_items, false) AS validation_has_items,
    COALESCE(cav.is_two_line_transaction, false) AS is_two_line_transaction,
    COALESCE(cav.dimensions_match, true) AS dimensions_match,
    cav.validation_errors,
    COALESCE(cav.validated_at, t.updated_at) AS validated_at
   FROM ((((((((((((((v_transaction_line_items_report v
     JOIN transaction_lines tl ON ((v.transaction_line_id = tl.id)))
     JOIN transactions t ON ((tl.transaction_id = t.id)))
     JOIN organizations o ON ((o.id = t.org_id)))
     LEFT JOIN projects hp ON ((hp.id = t.project_id)))
     JOIN accounts acc ON ((acc.id = tl.account_id)))
     
     -- Move LATERAL JOIN up so dependent joins can reference it
     LEFT JOIN LATERAL ( SELECT acc_against.code,
            acc_against.name,
            acc_against.name_ar,
            tl_against.project_id,
            tl_against.cost_center_id,
            tl_against.work_item_id,
            tl_against.analysis_work_item_id,
            tl_against.classification_id,
            tl_against.sub_tree_id
           FROM (transaction_lines tl_against
             JOIN accounts acc_against ON ((acc_against.id = tl_against.account_id)))
          WHERE ((tl_against.transaction_id = t.id) AND (tl_against.id <> tl.id))
         LIMIT 1) against_acc ON (true))

     LEFT JOIN projects p ON ((p.id = COALESCE(tl.project_id, against_acc.project_id))))
     LEFT JOIN cost_centers cc ON ((cc.id = COALESCE(tl.cost_center_id, against_acc.cost_center_id))))
     LEFT JOIN work_items wi ON ((wi.id = COALESCE(tl.work_item_id, against_acc.work_item_id))))
     LEFT JOIN analysis_work_items awi ON ((awi.id = COALESCE(tl.analysis_work_item_id, against_acc.analysis_work_item_id))))
     LEFT JOIN transaction_classification cls ON ((cls.id = COALESCE(tl.classification_id, against_acc.classification_id))))
     LEFT JOIN sub_tree st ON ((st.id = COALESCE(tl.sub_tree_id, against_acc.sub_tree_id))))
     
     LEFT JOIN ( SELECT transaction_line_items.transaction_line_id,
            count(transaction_line_items.id) AS total_items,
            sum(transaction_line_items.net_amount) AS total_sum
           FROM transaction_line_items
          GROUP BY transaction_line_items.transaction_line_id) line_stats ON ((line_stats.transaction_line_id = tl.id)))
     LEFT JOIN cost_analysis_transaction_validation cav ON ((cav.transaction_id = t.id)));
