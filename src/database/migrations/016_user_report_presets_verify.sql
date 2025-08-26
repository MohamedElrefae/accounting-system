-- 016_user_report_presets_verify.sql

-- A) List presets for a key (should be empty initially)
select * from public.get_report_presets('general-ledger');

-- B) Create a preset
select public.upsert_report_preset(
  null,
  'general-ledger',
  'افتراضي',
  jsonb_build_object(
    'dateFrom', current_date::text,
    'dateTo', current_date::text,
    'includeOpening', true,
    'postedOnly', true,
    'orgId', null,
    'projectId', null,
    'accountId', null
  ),
  jsonb_build_array('entry_number','entry_date','account_code','account_name_ar','description','debit','credit','running_debit','running_credit')
);

-- C) List again (should show one)
select * from public.get_report_presets('general-ledger');
