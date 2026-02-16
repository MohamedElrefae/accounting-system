-- 01) Purge + Load accounts (Supabase SQL Editor)
-- org_id = d5789445-11e3-4ad6-9297-b56521675114
-- IMPORTANT: name (English) in your schema is NOT NULL, so it cannot be blank.
-- This script sets name = code, and puts Arabic label into name_ar.

-- PURGE (IMPORTANT ORDER)
begin;

delete from public.transaction_lines where org_id='d5789445-11e3-4ad6-9297-b56521675114'::uuid;
delete from public.transactions where org_id='d5789445-11e3-4ad6-9297-b56521675114'::uuid;
delete from public.accounts where org_id='d5789445-11e3-4ad6-9297-b56521675114'::uuid;

commit;

-- LOAD ACCOUNTS
begin;

create temp table tmp_accounts_import (
  org_id uuid,
  code text,
  name text,
  name_ar varchar(255),
  category public.account_category,
  allow_transactions boolean,
  is_postable boolean,
  is_standard boolean,
  legacy_code text,
  legacy_name text,
  parent_code text
);

insert into tmp_accounts_import (
  org_id, code, name, name_ar, category,
  allow_transactions, is_postable, is_standard,
  legacy_code, legacy_name, parent_code
) values
('d5789445-11e3-4ad6-9297-b56521675114','1000','1000','الأصول','asset',false,false,false,null,null,null),
('d5789445-11e3-4ad6-9297-b56521675114','1000','1000','الأصول','asset',false,false,false,'1','الاصول',null),
('d5789445-11e3-4ad6-9297-b56521675114','2000','2000','الالتزامات','liability',false,false,false,null,null,null),
('d5789445-11e3-4ad6-9297-b56521675114','2000','2000','الالتزامات','liability',false,false,false,'2','الخصوم',null),
('d5789445-11e3-4ad6-9297-b56521675114','3000','3000','حقوق الملكية','equity',false,false,false,null,null,null),
('d5789445-11e3-4ad6-9297-b56521675114','3000','3000','حقوق الملكية','equity',false,false,false,'21','حقوق الملكية',null),
('d5789445-11e3-4ad6-9297-b56521675114','4000','4000','الإيرادات','revenue',false,false,false,null,null,null),
('d5789445-11e3-4ad6-9297-b56521675114','4000','4000','الإيرادات','revenue',false,false,false,'4','الايرادات .',null),
('d5789445-11e3-4ad6-9297-b56521675114','5000','5000','المصروفات والتكاليف','expense',false,false,false,null,null,null),
('d5789445-11e3-4ad6-9297-b56521675114','5000','5000','المصروفات والتكاليف','expense',false,false,false,'3','المصروفات',null),
('d5789445-11e3-4ad6-9297-b56521675114','1100','1100','أصول غير متداولة','asset',false,false,false,null,null,'1000'),
('d5789445-11e3-4ad6-9297-b56521675114','1100','1100','أصول غير متداولة','asset',false,false,false,'12','الاصول طويلة الاجل','1000'),
('d5789445-11e3-4ad6-9297-b56521675114','1200','1200','أصول متداولة','asset',false,false,false,null,null,'1000'),
('d5789445-11e3-4ad6-9297-b56521675114','1200','1200','أصول متداولة','asset',false,false,false,'13','الاصول المتداولة','1000'),
('d5789445-11e3-4ad6-9297-b56521675114','2200','2200','التزامات متداولة','liability',false,false,false,null,null,'2000'),
('d5789445-11e3-4ad6-9297-b56521675114','2200','2200','التزامات متداولة','liability',false,false,false,'23','الالتزامات المتداولة','2000'),
('d5789445-11e3-4ad6-9297-b56521675114','3100','3100','رأس المال','equity',true,true,false,null,null,'3000'),
('d5789445-11e3-4ad6-9297-b56521675114','4100','4100','إيرادات التشغيل/العقود','revenue',true,true,false,null,null,'4000'),
('d5789445-11e3-4ad6-9297-b56521675114','4100','4100','إيرادات التشغيل/العقود','revenue',true,true,false,'41','ايرادات العمليات','4000'),
('d5789445-11e3-4ad6-9297-b56521675114','4200','4200','إيرادات أخرى','revenue',true,true,false,null,null,'4000'),
('d5789445-11e3-4ad6-9297-b56521675114','4200','4200','إيرادات أخرى','revenue',true,true,false,'42','ايرادات متنوعة','4000'),
('d5789445-11e3-4ad6-9297-b56521675114','5100','5100','تكاليف المشروعات/التشغيل','expense',true,true,false,null,null,'5000'),
('d5789445-11e3-4ad6-9297-b56521675114','5100','5100','تكاليف المشروعات/التشغيل','expense',true,true,false,'31','التكاليف .','5000'),
('d5789445-11e3-4ad6-9297-b56521675114','1110','1110','أصول ثابتة (PPE)','asset',false,false,false,null,null,'1100'),
('d5789445-11e3-4ad6-9297-b56521675114','1110','1110','أصول ثابتة (PPE)','asset',false,false,false,'11','الاصول الثابتة .','1100'),
('d5789445-11e3-4ad6-9297-b56521675114','1210','1210','نقدية وبنوك وودائع','asset',false,false,false,null,null,'1200'),
('d5789445-11e3-4ad6-9297-b56521675114','1220','1220','عملاء وأوراق قبض','asset',false,false,false,null,null,'1200'),
('d5789445-11e3-4ad6-9297-b56521675114','1230','1230','ذمم مدينة أخرى/سلف/مقدمات','asset',false,false,false,null,null,'1200'),
('d5789445-11e3-4ad6-9297-b56521675114','2210','2210','موردون/مقاولون/أوراق دفع','liability',false,false,false,null,null,'2200'),
('d5789445-11e3-4ad6-9297-b56521675114','2220','2220','دفعات مقدمة واحتجازات العملاء (Retention)','liability',false,false,false,null,null,'2200'),
('d5789445-11e3-4ad6-9297-b56521675114','2230','2230','ضرائب مستحقة','liability',false,false,false,null,null,'2200'),
('d5789445-11e3-4ad6-9297-b56521675114','2270','2270','تأمينات للغير/أمانات','liability',false,false,false,null,null,'2200'),
('d5789445-11e3-4ad6-9297-b56521675114','4210','4210','أرباح/خسائر رأسمالية','revenue',true,true,false,null,null,'4200'),
('d5789445-11e3-4ad6-9297-b56521675114','31001','31001','راس المال .','equity',true,true,false,'211','راس المال .','3100'),
('d5789445-11e3-4ad6-9297-b56521675114','11105','11105','الحاسب الالى','asset',true,true,false,'115','الحاسب الالى','1110'),
('d5789445-11e3-4ad6-9297-b56521675114','11106','11106','الاثاث والمهمات','asset',true,true,false,'116','الاثاث والمهمات','1110'),
('d5789445-11e3-4ad6-9297-b56521675114','11107','11107','العدد والادوات','asset',true,true,false,'117','العدد والادوات','1110'),
('d5789445-11e3-4ad6-9297-b56521675114','12101','12101','الخزينة .','asset',true,true,false,'131','الخزينة .','1210'),
('d5789445-11e3-4ad6-9297-b56521675114','12103','12103','البنوك .','asset',true,true,false,'132','البنوك .','1210'),
('d5789445-11e3-4ad6-9297-b56521675114','12113','12113','تامينات العملاء','asset',true,true,false,'13111','تامينات العملاء','1210'),
('d5789445-11e3-4ad6-9297-b56521675114','12123','12123','تامينات لدى الغير .','asset',true,true,false,'131313','تامينات لدى الغير .','1210'),
('d5789445-11e3-4ad6-9297-b56521675114','12201','12201','العملاء .','asset',true,true,false,'134','العملاء .','1220'),
('d5789445-11e3-4ad6-9297-b56521675114','12304','12304','السلفيات','asset',true,true,false,'1352','السلفيات','1230'),
('d5789445-11e3-4ad6-9297-b56521675114','12307','12307','المدينون والدائنون','asset',true,true,false,'1354','المدينون والدائنون','1230'),
('d5789445-11e3-4ad6-9297-b56521675114','22103','22103','المقاولون .','liability',true,true,false,'232','المقاولون .','2210'),
('d5789445-11e3-4ad6-9297-b56521675114','22104','22104','الموردين .','liability',true,true,false,'234','الموردين .','2210'),
('d5789445-11e3-4ad6-9297-b56521675114','22201','22201','عملاء دفعات مقدمة .','liability',true,true,false,'221','عملاء دفعات مقدمة .','2220'),
('d5789445-11e3-4ad6-9297-b56521675114','22202','22202','العملاء تشوينات .','liability',true,true,false,'233','العملاء تشوينات .','2220'),
('d5789445-11e3-4ad6-9297-b56521675114','22303','22303','ضرائب الخصم','liability',true,true,false,'2352','ضرائب الخصم','2230'),
('d5789445-11e3-4ad6-9297-b56521675114','22306','22306','ضرائب القيمة المضافة','liability',true,true,false,'2356','ضرائب القيمة المضافة','2230'),
('d5789445-11e3-4ad6-9297-b56521675114','22701','22701','تامينات للغير .','liability',true,true,false,'236','تامينات للغير .','2270'),
('d5789445-11e3-4ad6-9297-b56521675114','42101','42101','ارباح وخسائر راسمالية.','revenue',true,true,false,'56','ارباح وخسائر راسمالية.','4210')
;

insert into public.accounts (
  org_id, code, name, name_ar, category,
  allow_transactions, is_postable, is_standard,
  legacy_code, legacy_name,
  parent_id
)
select
  org_id,
  code,
  name,
  nullif(name_ar,''),
  category,
  coalesce(allow_transactions,false),
  coalesce(is_postable,false),
  coalesce(is_standard,false),
  legacy_code,
  legacy_name,
  null
from tmp_accounts_import;

update public.accounts child
set parent_id = parent.id
from tmp_accounts_import t
join public.accounts parent
  on parent.org_id=t.org_id
 and parent.code=t.parent_code
where child.org_id=t.org_id
  and child.code=t.code
  and t.parent_code is not null;

commit;

-- ACCOUNTS VERIFICATION
select
  count(*) as accounts_count,
  sum(case when parent_id is null then 1 else 0 end) as root_count,
  sum(case when allow_transactions then 1 else 0 end) as allow_tx_count,
  sum(case when is_postable then 1 else 0 end) as is_postable_count
from public.accounts
where org_id='d5789445-11e3-4ad6-9297-b56521675114'::uuid;

select count(*) as blank_english_name
from public.accounts
where org_id='d5789445-11e3-4ad6-9297-b56521675114'::uuid
  and (name is null or btrim(name)='');

select count(*) as blank_arabic_name
from public.accounts
where org_id='d5789445-11e3-4ad6-9297-b56521675114'::uuid
  and (name_ar is null or btrim(name_ar)='');
