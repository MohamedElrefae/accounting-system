-- ============================================================================
-- Enterprise Enriched Views for Custom Reports
-- Creates user-friendly views with Arabic names instead of IDs
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. transactions_enriched - المعاملات المالية الشاملة
-- Already exists, but let's ensure it has all needed fields
-- ============================================================================
DROP VIEW IF EXISTS transactions_enriched CASCADE;

CREATE OR REPLACE VIEW transactions_enriched AS
SELECT 
  t.id,
  t.entry_number,
  t.entry_date,
  t.description,
  t.amount,
  t.notes,
  t.reference_number,
  t.source_document,
  t.is_posted,
  t.status,
  t.org_id,
  t.created_at,
  t.updated_at,
  t.created_by,
  
  -- Debit Account (enriched)
  t.debit_account_id,
  da.code AS debit_account_code,
  da.name AS debit_account_name,
  da.name_ar AS debit_account_name_ar,
  da.category AS debit_account_category,
  
  -- Credit Account (enriched)
  t.credit_account_id,
  ca.code AS credit_account_code,
  ca.name AS credit_account_name,
  ca.name_ar AS credit_account_name_ar,
  ca.category AS credit_account_category,
  
  -- Project (enriched)
  t.project_id,
  p.code AS project_code,
  p.name AS project_name,
  p.name_ar AS project_name_ar,
  
  -- Classification (enriched)
  t.classification_id,
  cl.code AS classification_code,
  cl.name AS classification_name,
  cl.name_ar AS classification_name_ar,
  
  -- Expenses Category (enriched)
  t.expenses_category_id,
  ec.code AS expenses_category_code,
  ec.name AS expenses_category_name,
  ec.name_ar AS expenses_category_name_ar,
  
  -- Work Item (enriched)
  t.work_item_id,
  wi.code AS work_item_code,
  wi.name AS work_item_name,
  wi.name_ar AS work_item_name_ar,
  
  -- Cost Center (enriched)
  t.cost_center_id,
  cc.code AS cost_center_code,
  cc.name AS cost_center_name,
  cc.name_ar AS cost_center_name_ar,
  
  -- Created By User (enriched)
  pr.full_name AS created_by_name,
  pr.email AS created_by_email,
  
  -- Organization
  o.name AS organization_name

FROM transactions t
LEFT JOIN accounts da ON t.debit_account_id = da.id
LEFT JOIN accounts ca ON t.credit_account_id = ca.id
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN classifications cl ON t.classification_id = cl.id
LEFT JOIN expenses_categories ec ON t.expenses_category_id = ec.id
LEFT JOIN work_items wi ON t.work_item_id = wi.id
LEFT JOIN cost_centers cc ON t.cost_center_id = cc.id
LEFT JOIN profiles pr ON t.created_by = pr.id
LEFT JOIN organizations o ON t.org_id = o.id;

-- ============================================================================
-- 2. transaction_lines_enriched - القيود التفصيلية الشاملة
-- ============================================================================
DROP VIEW IF EXISTS transaction_lines_enriched CASCADE;

CREATE OR REPLACE VIEW transaction_lines_enriched AS
SELECT 
  tl.id,
  tl.transaction_id,
  tl.line_number,
  tl.debit_amount,
  tl.credit_amount,
  tl.description,
  tl.status,
  tl.org_id,
  tl.created_at,
  tl.updated_at,
  
  -- Parent Transaction (enriched)
  t.entry_number AS transaction_entry_number,
  t.entry_date AS transaction_date,
  t.description AS transaction_description,
  t.is_posted AS transaction_is_posted,
  t.status AS transaction_status,
  
  -- Account (enriched)
  tl.account_id,
  a.code AS account_code,
  a.name AS account_name,
  a.name_ar AS account_name_ar,
  a.category AS account_category,
  
  -- Project (enriched)
  tl.project_id,
  p.code AS project_code,
  p.name AS project_name,
  p.name_ar AS project_name_ar,
  
  -- Classification (enriched)
  tl.classification_id,
  cl.code AS classification_code,
  cl.name AS classification_name,
  cl.name_ar AS classification_name_ar,
  
  -- Expenses Category (enriched)
  tl.expenses_category_id,
  ec.code AS expenses_category_code,
  ec.name AS expenses_category_name,
  ec.name_ar AS expenses_category_name_ar,
  
  -- Work Item (enriched)
  tl.work_item_id,
  wi.code AS work_item_code,
  wi.name AS work_item_name,
  wi.name_ar AS work_item_name_ar,
  
  -- Cost Center (enriched)
  tl.cost_center_id,
  cc.code AS cost_center_code,
  cc.name AS cost_center_name,
  cc.name_ar AS cost_center_name_ar

FROM transaction_lines tl
LEFT JOIN transactions t ON tl.transaction_id = t.id
LEFT JOIN accounts a ON tl.account_id = a.id
LEFT JOIN projects p ON tl.project_id = p.id
LEFT JOIN classifications cl ON tl.classification_id = cl.id
LEFT JOIN expenses_categories ec ON tl.expenses_category_id = ec.id
LEFT JOIN work_items wi ON tl.work_item_id = wi.id
LEFT JOIN cost_centers cc ON tl.cost_center_id = cc.id;

-- ============================================================================
-- 3. transaction_line_items_enriched - تحليل سطور المعاملات الشامل
-- ============================================================================
DROP VIEW IF EXISTS transaction_line_items_enriched CASCADE;

CREATE OR REPLACE VIEW transaction_line_items_enriched AS
SELECT 
  tli.id,
  tli.transaction_id,
  tli.line_number,
  tli.debit_amount,
  tli.credit_amount,
  tli.description,
  tli.status,
  tli.org_id,
  tli.created_at,
  tli.updated_at,
  
  -- Parent Transaction (enriched)
  t.entry_number AS transaction_entry_number,
  t.entry_date AS transaction_date,
  t.description AS transaction_description,
  t.is_posted AS transaction_is_posted,
  t.status AS transaction_status,
  
  -- Account (enriched)
  tli.account_id,
  a.code AS account_code,
  a.name AS account_name,
  a.name_ar AS account_name_ar,
  a.category AS account_category,
  
  -- Project (enriched)
  tli.project_id,
  p.code AS project_code,
  p.name AS project_name,
  p.name_ar AS project_name_ar,
  
  -- Classification (enriched)
  tli.classification_id,
  cl.code AS classification_code,
  cl.name AS classification_name,
  cl.name_ar AS classification_name_ar,
  
  -- Expenses Category (enriched)
  tli.expenses_category_id,
  ec.code AS expenses_category_code,
  ec.name AS expenses_category_name,
  ec.name_ar AS expenses_category_name_ar,
  
  -- Work Item (enriched)
  tli.work_item_id,
  wi.code AS work_item_code,
  wi.name AS work_item_name,
  wi.name_ar AS work_item_name_ar,
  
  -- Cost Center (enriched)
  tli.cost_center_id,
  cc.code AS cost_center_code,
  cc.name AS cost_center_name,
  cc.name_ar AS cost_center_name_ar

FROM transaction_line_items tli
LEFT JOIN transactions t ON tli.transaction_id = t.id
LEFT JOIN accounts a ON tli.account_id = a.id
LEFT JOIN projects p ON tli.project_id = p.id
LEFT JOIN classifications cl ON tli.classification_id = cl.id
LEFT JOIN expenses_categories ec ON tli.expenses_category_id = ec.id
LEFT JOIN work_items wi ON tli.work_item_id = wi.id
LEFT JOIN cost_centers cc ON tli.cost_center_id = cc.id;

-- ============================================================================
-- Grant permissions on views
-- ============================================================================
GRANT SELECT ON transactions_enriched TO authenticated;
GRANT SELECT ON transaction_lines_enriched TO authenticated;
GRANT SELECT ON transaction_line_items_enriched TO authenticated;

-- ============================================================================
-- Verify views created successfully
-- ============================================================================
SELECT 'transactions_enriched' as view_name, count(*) as column_count 
FROM information_schema.columns WHERE table_name = 'transactions_enriched'
UNION ALL
SELECT 'transaction_lines_enriched', count(*) 
FROM information_schema.columns WHERE table_name = 'transaction_lines_enriched'
UNION ALL
SELECT 'transaction_line_items_enriched', count(*) 
FROM information_schema.columns WHERE table_name = 'transaction_line_items_enriched';
