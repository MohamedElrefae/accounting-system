-- Migration Script: Replace Chart of Accounts with Arabic Version (Fixed)
-- Created: 2025-08-24
-- Source: chart-of-accounts.txt
-- This script will completely replace the existing chart of accounts with correct enum values

BEGIN;

-- Step 1: Clear existing accounts (safe since no transactions exist)
DELETE FROM accounts WHERE org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145';

-- Step 2: Insert new Arabic chart of accounts
-- Level 1 Accounts (Main Categories)
INSERT INTO accounts (id, org_id, code, name, name_ar, level, category, parent_id, is_postable, status, created_at, updated_at) VALUES
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '1', 'الاصول', 'الاصول', 1, 'asset', NULL, false, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '2', 'حقوق الملكية والالتزامات', 'حقوق الملكية والالتزامات', 1, 'liability', NULL, false, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '3', 'الايرادات', 'الايرادات', 1, 'revenue', NULL, false, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4', 'المصروفات', 'المصروفات', 1, 'expense', NULL, false, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '5', 'الارباح والخسائر', 'الارباح والخسائر', 1, 'expense', NULL, false, 'active', now(), now());

-- Level 2 Accounts (Sub-categories)
INSERT INTO accounts (id, org_id, code, name, name_ar, level, category, parent_id, is_postable, status, created_at, updated_at) VALUES
-- Assets Level 2
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '11', 'الاصول الغير متداولة ( طويلة الاجل )', 'الاصول الغير متداولة ( طويلة الاجل )', 2, 'asset', (SELECT id FROM accounts WHERE code = '1' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), false, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '12', 'الاصول متداولة ( قصيرة الاجل )', 'الاصول متداولة ( قصيرة الاجل )', 2, 'asset', (SELECT id FROM accounts WHERE code = '1' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), false, 'active', now(), now()),

-- Equity & Liabilities Level 2
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '21', 'حقوق الملكية', 'حقوق الملكية', 2, 'equity', (SELECT id FROM accounts WHERE code = '2' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), false, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '22', 'الالتزامات الغير متداولة ( طويلة الاجل )', 'الالتزامات الغير متداولة ( طويلة الاجل )', 2, 'liability', (SELECT id FROM accounts WHERE code = '2' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), false, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '23', 'الالتزامات المتداولة ( قصيرة الاجل )', 'الالتزامات المتداولة ( قصيرة الاجل )', 2, 'liability', (SELECT id FROM accounts WHERE code = '2' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), false, 'active', now(), now()),

-- Revenue Level 2
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '31', 'ايرادات النشاط', 'ايرادات النشاط', 2, 'revenue', (SELECT id FROM accounts WHERE code = '3' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), false, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '32', 'ايرادات متنوعة', 'ايرادات متنوعة', 2, 'revenue', (SELECT id FROM accounts WHERE code = '3' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), false, 'active', now(), now()),

-- Expenses Level 2
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '41', 'تكلفة الايرادات', 'تكلفة الايرادات', 2, 'expense', (SELECT id FROM accounts WHERE code = '4' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), false, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '42', 'مصاريف عمومية', 'مصاريف عمومية', 2, 'expense', (SELECT id FROM accounts WHERE code = '4' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), false, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '43', 'مصاريف تسويقية', 'مصاريف تسويقية', 2, 'expense', (SELECT id FROM accounts WHERE code = '4' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), false, 'active', now(), now());

-- Level 3 Accounts (Sub-sub-categories)
INSERT INTO accounts (id, org_id, code, name, name_ar, level, category, parent_id, is_postable, status, created_at, updated_at) VALUES
-- Fixed Assets Level 3
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '1101', 'الاصول الثابتة', 'الاصول الثابتة', 3, 'asset', (SELECT id FROM accounts WHERE code = '11' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), false, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '1102', 'مشروعات تحت التنفيذ', 'مشروعات تحت التنفيذ', 3, 'asset', (SELECT id FROM accounts WHERE code = '11' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), false, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '1103', 'استثمارت فى شركات شقيقة', 'استثمارت فى شركات شقيقة', 3, 'asset', (SELECT id FROM accounts WHERE code = '11' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '1104', 'اصول ضريبية مؤجلة', 'اصول ضريبية مؤجلة', 3, 'asset', (SELECT id FROM accounts WHERE code = '11' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),

-- Current Assets Level 3
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '1201', 'النقدية وما فى حكمها', 'النقدية وما فى حكمها', 3, 'asset', (SELECT id FROM accounts WHERE code = '12' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), false, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '1202', 'اوراق القبض', 'اوراق القبض', 3, 'asset', (SELECT id FROM accounts WHERE code = '12' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '1203', 'جارى المساهمين', 'جارى المساهمين', 3, 'asset', (SELECT id FROM accounts WHERE code = '12' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), false, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '1204', 'ودائع لاجل', 'ودائع لاجل', 3, 'asset', (SELECT id FROM accounts WHERE code = '12' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '1205', 'الارصدة المدينة', 'الارصدة المدينة', 3, 'asset', (SELECT id FROM accounts WHERE code = '12' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), false, 'active', now(), now()),

-- Equity Level 3
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '2101', 'راس المال', 'راس المال', 3, 'equity', (SELECT id FROM accounts WHERE code = '21' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '2102', 'الاحتياطى القانونى', 'الاحتياطى القانونى', 3, 'equity', (SELECT id FROM accounts WHERE code = '21' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '2103', 'ارباح ( خسائر ) العام', 'ارباح ( خسائر ) العام', 3, 'equity', (SELECT id FROM accounts WHERE code = '21' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '2104', 'ارباح ( خسائر ) مرحلة', 'ارباح ( خسائر ) مرحلة', 3, 'equity', (SELECT id FROM accounts WHERE code = '21' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),

-- Long-term Liabilities Level 3
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '2201', 'البنوك الدائنة', 'البنوك الدائنة', 3, 'liability', (SELECT id FROM accounts WHERE code = '22' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '2202', 'التزامات ضريبية مؤجلة', 'التزامات ضريبية مؤجلة', 3, 'liability', (SELECT id FROM accounts WHERE code = '22' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),

-- Current Liabilities Level 3
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '2301', 'اوراق الدفع', 'اوراق الدفع', 3, 'liability', (SELECT id FROM accounts WHERE code = '23' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '2302', 'الموردين', 'الموردين', 3, 'liability', (SELECT id FROM accounts WHERE code = '23' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), false, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '2303', 'جارى المساهمين', 'جارى المساهمين', 3, 'liability', (SELECT id FROM accounts WHERE code = '23' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), false, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '2304', 'الارصدة الدائنة', 'الارصدة الدائنة', 3, 'liability', (SELECT id FROM accounts WHERE code = '23' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), false, 'active', now(), now()),

-- Revenue Level 3
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '3101', 'ايرادات التصميمات الهندسية', 'ايرادات التصميمات الهندسية', 3, 'revenue', (SELECT id FROM accounts WHERE code = '31' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '3102', 'ايرادات الاشراف على التنفيذ', 'ايرادات الاشراف على التنفيذ', 3, 'revenue', (SELECT id FROM accounts WHERE code = '31' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '3103', 'ايرادات اعادة الهيكلة و دراسات الجدوى', 'ايرادات اعادة الهيكلة و دراسات الجدوى', 3, 'revenue', (SELECT id FROM accounts WHERE code = '31' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),

-- Other Revenue Level 3
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '3201', 'فوائد ودائع لاجل', 'فوائد ودائع لاجل', 3, 'revenue', (SELECT id FROM accounts WHERE code = '32' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '3202', 'فوائد حساب جارى', 'فوائد حساب جارى', 3, 'revenue', (SELECT id FROM accounts WHERE code = '32' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '3203', 'الخصم المكتسب', 'الخصم المكتسب', 3, 'revenue', (SELECT id FROM accounts WHERE code = '32' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '3204', 'فروق تقييم عملة', 'فروق تقييم عملة', 3, 'revenue', (SELECT id FROM accounts WHERE code = '32' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '3205', 'فوائد استثمارات', 'فوائد استثمارات', 3, 'revenue', (SELECT id FROM accounts WHERE code = '32' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),

-- Cost of Revenue Level 3
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4101', 'المرتبات', 'المرتبات', 3, 'expense', (SELECT id FROM accounts WHERE code = '41' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4102', 'ادوات ومستلزمات هندسية', 'ادوات ومستلزمات هندسية', 3, 'expense', (SELECT id FROM accounts WHERE code = '41' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4103', 'مستلزمات كمبيوتر', 'مستلزمات كمبيوتر', 3, 'expense', (SELECT id FROM accounts WHERE code = '41' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4104', 'التأمينات الاجتماعية', 'التأمينات الاجتماعية', 3, 'expense', (SELECT id FROM accounts WHERE code = '41' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4105', 'تأمينات المقاولات', 'تأمينات المقاولات', 3, 'expense', (SELECT id FROM accounts WHERE code = '41' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4106', 'صندوق طوارئ العاملين', 'صندوق طوارئ العاملين', 3, 'expense', (SELECT id FROM accounts WHERE code = '41' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4107', 'الانتقالات', 'الانتقالات', 3, 'expense', (SELECT id FROM accounts WHERE code = '41' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now());

-- Level 4 Accounts (Detailed accounts)
-- Fixed Assets Level 4
INSERT INTO accounts (id, org_id, code, name, name_ar, level, category, parent_id, is_postable, status, created_at, updated_at) VALUES
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '110101', 'المبانى', 'المبانى', 4, 'asset', (SELECT id FROM accounts WHERE code = '1101' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '110102', 'شهادات الايزو', 'شهادات الايزو', 4, 'asset', (SELECT id FROM accounts WHERE code = '1101' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '110103', 'اثاث وتجهيزات', 'اثاث وتجهيزات', 4, 'asset', (SELECT id FROM accounts WHERE code = '1101' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '110104', 'اجهزة وبرامج الحاسب', 'اجهزة وبرامج الحاسب', 4, 'asset', (SELECT id FROM accounts WHERE code = '1101' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '110105', 'اجهزة كهربائية', 'اجهزة كهربائية', 4, 'asset', (SELECT id FROM accounts WHERE code = '1101' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '110106', 'كرنفانات', 'كرنفانات', 4, 'asset', (SELECT id FROM accounts WHERE code = '1101' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now());

-- Projects in Progress Level 4
INSERT INTO accounts (id, org_id, code, name, name_ar, level, category, parent_id, is_postable, status, created_at, updated_at) VALUES
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '110201', 'مشروعات تحت التنفيذ مشروع جيفيرا', 'مشروعات تحت التنفيذ مشروع جيفيرا', 4, 'asset', (SELECT id FROM accounts WHERE code = '1102' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '110202', 'مشروعات تحت التنفيذ مشروع السعودية', 'مشروعات تحت التنفيذ مشروع السعودية', 4, 'asset', (SELECT id FROM accounts WHERE code = '1102' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '110203', 'مشروعات تحت التنفيذ مشروع BMA', 'مشروعات تحت التنفيذ مشروع BMA', 4, 'asset', (SELECT id FROM accounts WHERE code = '1102' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now());

-- Cash and Equivalents Level 4
INSERT INTO accounts (id, org_id, code, name, name_ar, level, category, parent_id, is_postable, status, created_at, updated_at) VALUES
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '120101', 'الصندوق', 'الصندوق', 4, 'asset', (SELECT id FROM accounts WHERE code = '1201' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '120102', 'البنك التجارى الدولى CIB', 'البنك التجارى الدولى CIB', 4, 'asset', (SELECT id FROM accounts WHERE code = '1201' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '120103', 'البنك الاهلى المصرى - جارى جنيه', 'البنك الاهلى المصرى - جارى جنيه', 4, 'asset', (SELECT id FROM accounts WHERE code = '1201' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '120104', 'البنك الاهلى المصرى - جارى دولار $', 'البنك الاهلى المصرى - جارى دولار $', 4, 'asset', (SELECT id FROM accounts WHERE code = '1201' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '120105', 'البنك الاهلى المصرى - جارى يورو', 'البنك الاهلى المصرى - جارى يورو', 4, 'asset', (SELECT id FROM accounts WHERE code = '1201' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '120106', 'بنك قطر الوطنى الاهلى QNB', 'بنك قطر الوطنى الاهلى QNB', 4, 'asset', (SELECT id FROM accounts WHERE code = '1201' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '120107', 'البنك العربى الافريقى', 'البنك العربى الافريقى', 4, 'asset', (SELECT id FROM accounts WHERE code = '1201' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now());

-- Shareholders Accounts Level 4
INSERT INTO accounts (id, org_id, code, name, name_ar, level, category, parent_id, is_postable, status, created_at, updated_at) VALUES
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '120301', 'جارى المساهمين - د أحمد البيطار', 'جارى المساهمين - د أحمد البيطار', 4, 'asset', (SELECT id FROM accounts WHERE code = '1203' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '120302', 'جارى المساهمين - أ محمد السيد', 'جارى المساهمين - أ محمد السيد', 4, 'asset', (SELECT id FROM accounts WHERE code = '1203' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '120303', 'جارى المساهمين - د امنية رضا', 'جارى المساهمين - د امنية رضا', 4, 'asset', (SELECT id FROM accounts WHERE code = '1203' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now());

-- Debit Balances Level 4
INSERT INTO accounts (id, org_id, code, name, name_ar, level, category, parent_id, is_postable, status, created_at, updated_at) VALUES
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '120501', 'مصلحة الضرائب المصرية - ضرائب الدخل', 'مصلحة الضرائب المصرية - ضرائب الدخل', 4, 'asset', (SELECT id FROM accounts WHERE code = '1205' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '120502', 'ضرائب القيمة المضافة', 'ضرائب القيمة المضافة', 4, 'asset', (SELECT id FROM accounts WHERE code = '1205' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '120503', 'ضرائب الخصم والاضافة', 'ضرائب الخصم والاضافة', 4, 'asset', (SELECT id FROM accounts WHERE code = '1205' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '120504', 'ضرائب الاجور والمرتبات ( كسب العمل )', 'ضرائب الاجور والمرتبات ( كسب العمل )', 4, 'asset', (SELECT id FROM accounts WHERE code = '1205' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '120505', 'هيئة التأمينات الاجتماعاية', 'هيئة التأمينات الاجتماعاية', 4, 'asset', (SELECT id FROM accounts WHERE code = '1205' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '120506', 'هيئة التأمين الصحى الشامل', 'هيئة التأمين الصحى الشامل', 4, 'asset', (SELECT id FROM accounts WHERE code = '1205' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '120507', 'ضرائب المنبع', 'ضرائب المنبع', 4, 'asset', (SELECT id FROM accounts WHERE code = '1205' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now());

-- Suppliers Level 4
INSERT INTO accounts (id, org_id, code, name, name_ar, level, category, parent_id, is_postable, status, created_at, updated_at) VALUES
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '230201', 'ماستر سرفيس', 'ماستر سرفيس', 4, 'liability', (SELECT id FROM accounts WHERE code = '2302' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '230202', 'مكتبة سمير وعلى', 'مكتبة سمير وعلى', 4, 'liability', (SELECT id FROM accounts WHERE code = '2302' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '230203', 'الفتح للاحبار', 'الفتح للاحبار', 4, 'liability', (SELECT id FROM accounts WHERE code = '2302' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now());

-- Shareholders Liabilities Level 4
INSERT INTO accounts (id, org_id, code, name, name_ar, level, category, parent_id, is_postable, status, created_at, updated_at) VALUES
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '230301', 'جارى المساهمين - د أحمد البيطار', 'جارى المساهمين - د أحمد البيطار', 4, 'liability', (SELECT id FROM accounts WHERE code = '2303' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '230302', 'جارى المساهمين - أ محمد السيد', 'جارى المساهمين - أ محمد السيد', 4, 'liability', (SELECT id FROM accounts WHERE code = '2303' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '230303', 'جارى المساهمين - د امنية رضا', 'جارى المساهمين - د امنية رضا', 4, 'liability', (SELECT id FROM accounts WHERE code = '2303' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now());

-- Credit Balances Level 4
INSERT INTO accounts (id, org_id, code, name, name_ar, level, category, parent_id, is_postable, status, created_at, updated_at) VALUES
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '230401', 'مصلحة الضرائب المصرية - ضرائب الدخل', 'مصلحة الضرائب المصرية - ضرائب الدخل', 4, 'liability', (SELECT id FROM accounts WHERE code = '2304' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '230402', 'ضرائب القيمة المضافة', 'ضرائب القيمة المضافة', 4, 'liability', (SELECT id FROM accounts WHERE code = '2304' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '230403', 'ضرائب الخصم والاضافة', 'ضرائب الخصم والاضافة', 4, 'liability', (SELECT id FROM accounts WHERE code = '2304' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '230404', 'ضرائب الاجور والمرتبات ( كسب العمل )', 'ضرائب الاجور والمرتبات ( كسب العمل )', 4, 'liability', (SELECT id FROM accounts WHERE code = '2304' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '230405', 'هيئة التأمينات الاجتماعاية', 'هيئة التأمينات الاجتماعاية', 4, 'liability', (SELECT id FROM accounts WHERE code = '2304' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '230406', 'هيئة التأمين الصحى الشامل', 'هيئة التأمين الصحى الشامل', 4, 'liability', (SELECT id FROM accounts WHERE code = '2304' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '230407', 'الدائنين', 'الدائنين', 4, 'liability', (SELECT id FROM accounts WHERE code = '2304' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now());

-- General Expenses Level 3
INSERT INTO accounts (id, org_id, code, name, name_ar, level, category, parent_id, is_postable, status, created_at, updated_at) VALUES
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4201', 'ضيافه وبوفيه', 'ضيافه وبوفيه', 3, 'expense', (SELECT id FROM accounts WHERE code = '42' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4202', 'بريد ودمغات', 'بريد ودمغات', 3, 'expense', (SELECT id FROM accounts WHERE code = '42' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4203', 'فروق عملة', 'فروق عملة', 3, 'expense', (SELECT id FROM accounts WHERE code = '42' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4204', 'هدايا واكراميات', 'هدايا واكراميات', 3, 'expense', (SELECT id FROM accounts WHERE code = '42' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4205', 'سيارات', 'سيارات', 3, 'expense', (SELECT id FROM accounts WHERE code = '42' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4206', 'صيانة', 'صيانة', 3, 'expense', (SELECT id FROM accounts WHERE code = '42' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4207', 'الكهرباء', 'الكهرباء', 3, 'expense', (SELECT id FROM accounts WHERE code = '42' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4208', 'التليفونات', 'التليفونات', 3, 'expense', (SELECT id FROM accounts WHERE code = '42' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4209', 'الغاز والمياه', 'الغاز والمياه', 3, 'expense', (SELECT id FROM accounts WHERE code = '42' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4210', 'نثرية', 'نثرية', 3, 'expense', (SELECT id FROM accounts WHERE code = '42' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4211', 'الايجار', 'الايجار', 3, 'expense', (SELECT id FROM accounts WHERE code = '42' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4212', 'اتعاب محامى', 'اتعاب محامى', 3, 'expense', (SELECT id FROM accounts WHERE code = '42' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4213', 'اتعاب مراجعة - المحاسب القانونى', 'اتعاب مراجعة - المحاسب القانونى', 3, 'expense', (SELECT id FROM accounts WHERE code = '42' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4214', 'خصم مسموح به', 'خصم مسموح به', 3, 'expense', (SELECT id FROM accounts WHERE code = '42' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4215', 'اهلاك الاصول الثابتة', 'اهلاك الاصول الثابتة', 3, 'expense', (SELECT id FROM accounts WHERE code = '42' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4216', 'مساهمة تكافلية', 'مساهمة تكافلية', 3, 'expense', (SELECT id FROM accounts WHERE code = '42' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now());

-- Marketing Expenses Level 3
INSERT INTO accounts (id, org_id, code, name, name_ar, level, category, parent_id, is_postable, status, created_at, updated_at) VALUES
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4301', 'مصاريف اعلانات', 'مصاريف اعلانات', 3, 'expense', (SELECT id FROM accounts WHERE code = '43' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4302', 'بحوث تسويقية', 'بحوث تسويقية', 3, 'expense', (SELECT id FROM accounts WHERE code = '43' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now()),
(gen_random_uuid(), '4cbba543-eb9c-4f32-9c77-155201f7e145', '4303', 'دورات تدريبية', 'دورات تدريبية', 3, 'expense', (SELECT id FROM accounts WHERE code = '43' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'), true, 'active', now(), now());

COMMIT;

-- Final verification query
SELECT 
    level,
    COUNT(*) as account_count,
    STRING_AGG(DISTINCT category, ', ') as categories
FROM accounts 
WHERE org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145'
GROUP BY level
ORDER BY level;
