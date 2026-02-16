BEGIN;
INSERT INTO accounts (org_id, code, name, name_ar, category, allow_transactions, is_postable, is_standard, legacy_code, legacy_name) VALUES
('d5789445-11e3-4ad6-9297-b56521675114', '1000', '1000', 'الأصول', 'asset', false, false, false, '1', 'الاصول'),
('d5789445-11e3-4ad6-9297-b56521675114', '2000', '2000', 'الالتزامات', 'liability', false, false, false, '2', 'الخصوم'),
('d5789445-11e3-4ad6-9297-b56521675114', '3000', '3000', 'حقوق الملكية', 'equity', false, false, false, '21', 'حقوق الملكية'),
('d5789445-11e3-4ad6-9297-b56521675114', '4000', '4000', 'الإيرادات', 'revenue', false, false, false, '4', 'الايرادات .'),
('d5789445-11e3-4ad6-9297-b56521675114', '5000', '5000', 'المصروفات والتكاليف', 'expense', false, false, false, '3', 'المصروفات'),
('d5789445-11e3-4ad6-9297-b56521675114', '1100', '1100', 'أصول غير متداولة', 'asset', false, false, false, '12', 'الاصول طويلة الاجل'),
('d5789445-11e3-4ad6-9297-b56521675114', '1200', '1200', 'أصول متداولة', 'asset', false, false, false, '13', 'الاصول المتداولة'),
('d5789445-11e3-4ad6-9297-b56521675114', '2200', '2200', 'التزامات متداولة', 'liability', false, false, false, '23', 'الالتزامات المتداولة'),
('d5789445-11e3-4ad6-9297-b56521675114', '3100', '3100', 'رأس المال', 'equity', true, true, false, NULL, NULL),
('d5789445-11e3-4ad6-9297-b56521675114', '4100', '4100', 'إيرادات التشغيل/العقود', 'revenue', true, true, false, '41', 'ايرادات العمليات'),
('d5789445-11e3-4ad6-9297-b56521675114', '4200', '4200', 'إيرادات أخرى', 'revenue', true, true, false, '42', 'ايرادات متنوعة'),
('d5789445-11e3-4ad6-9297-b56521675114', '5100', '5100', 'تكاليف المشروعات/التشغيل', 'expense', true, true, false, '31', 'التكاليف .'),
('d5789445-11e3-4ad6-9297-b56521675114', '1110', '1110', 'أصول ثابتة (PPE)', 'asset', false, false, false, '11', 'الاصول الثابتة .'),
('d5789445-11e3-4ad6-9297-b56521675114', '1210', '1210', 'نقدية وبنوك وودائع', 'asset', false, false, false, NULL, NULL),
('d5789445-11e3-4ad6-9297-b56521675114', '1220', '1220', 'عملاء وأوراق قبض', 'asset', false, false, false, NULL, NULL),
('d5789445-11e3-4ad6-9297-b56521675114', '1230', '1230', 'ذمم مدينة أخرى/سلف/مقدمات', 'asset', false, false, false, NULL, NULL),
('d5789445-11e3-4ad6-9297-b56521675114', '2210', '2210', 'موردون/مقاولون/أوراق دفع', 'liability', false, false, false, NULL, NULL),
('d5789445-11e3-4ad6-9297-b56521675114', '2220', '2220', 'دفعات مقدمة واحتجازات العملاء (Retention)', 'liability', false, false, false, NULL, NULL),
('d5789445-11e3-4ad6-9297-b56521675114', '2230', '2230', 'ضرائب مستحقة', 'liability', false, false, false, NULL, NULL),
('d5789445-11e3-4ad6-9297-b56521675114', '2270', '2270', 'تأمينات للغير/أمانات', 'liability', false, false, false, NULL, NULL),
('d5789445-11e3-4ad6-9297-b56521675114', '4210', '4210', 'أرباح/خسائر رأسمالية', 'revenue', true, true, false, NULL, NULL),
('d5789445-11e3-4ad6-9297-b56521675114', '31001', '31001', 'راس المال .', 'equity', true, true, false, '211', 'راس المال .'),
('d5789445-11e3-4ad6-9297-b56521675114', '11105', '11105', 'الحاسب الالى', 'asset', true, true, false, '115', 'الحاسب الالى'),
('d5789445-11e3-4ad6-9297-b56521675114', '11106', '11106', 'الاثاث والمهمات', 'asset', true, true, false, '116', 'الاثاث والمهمات'),
('d5789445-11e3-4ad6-9297-b56521675114', '11107', '11107', 'العدد والادوات', 'asset', true, true, false, '117', 'العدد والادوات'),
('d5789445-11e3-4ad6-9297-b56521675114', '12101', '12101', 'الخزينة .', 'asset', true, true, false, '131', 'الخزينة .'),
('d5789445-11e3-4ad6-9297-b56521675114', '12103', '12103', 'البنوك .', 'asset', true, true, false, '132', 'البنوك .'),
('d5789445-11e3-4ad6-9297-b56521675114', '12113', '12113', 'تامينات العملاء', 'asset', true, true, false, '13111', 'تامينات العملاء'),
('d5789445-11e3-4ad6-9297-b56521675114', '12123', '12123', 'تامينات لدى الغير .', 'asset', true, true, false, '131313', 'تامينات لدى الغير .'),
('d5789445-11e3-4ad6-9297-b56521675114', '12201', '12201', 'العملاء .', 'asset', true, true, false, '134', 'العملاء .'),
('d5789445-11e3-4ad6-9297-b56521675114', '12304', '12304', 'السلفيات', 'asset', true, true, false, '1352', 'السلفيات'),
('d5789445-11e3-4ad6-9297-b56521675114', '12307', '12307', 'المدينون والدائنون', 'asset', true, true, false, '1354', 'المدينون والدائنون'),
('d5789445-11e3-4ad6-9297-b56521675114', '22103', '22103', 'المقاولون .', 'liability', true, true, false, '232', 'المقاولون .'),
('d5789445-11e3-4ad6-9297-b56521675114', '22104', '22104', 'الموردين .', 'liability', true, true, false, '234', 'الموردين .'),
('d5789445-11e3-4ad6-9297-b56521675114', '22201', '22201', 'عملاء دفعات مقدمة .', 'liability', true, true, false, '221', 'عملاء دفعات مقدمة .'),
('d5789445-11e3-4ad6-9297-b56521675114', '22202', '22202', 'العملاء تشوينات .', 'liability', true, true, false, '233', 'العملاء تشوينات .'),
('d5789445-11e3-4ad6-9297-b56521675114', '22303', '22303', 'ضرائب الخصم', 'liability', true, true, false, '2352', 'ضرائب الخصم'),
('d5789445-11e3-4ad6-9297-b56521675114', '22306', '22306', 'ضرائب القيمة المضافة', 'liability', true, true, false, '2356', 'ضرائب القيمة المضافة'),
('d5789445-11e3-4ad6-9297-b56521675114', '22701', '22701', 'تامينات للغير .', 'liability', true, true, false, '236', 'تامينات للغير .'),
('d5789445-11e3-4ad6-9297-b56521675114', '42101', '42101', 'ارباح وخسائر راسمالية.', 'revenue', true, true, false, '56', 'ارباح وخسائر راسمالية.');
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1100';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1200';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2200';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '3000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '3100';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4100';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4200';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5100';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1100') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1110';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1220';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2210';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2220';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2230';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2270';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4210';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '3100') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '31001';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1110') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11105';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1110') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11106';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1110') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11107';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12101';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12103';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12113';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12123';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1220') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12201';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12304';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12307';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22103';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22104';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2220') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22201';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2220') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22202';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22303';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22306';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2270') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22701';
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '42101';
COMMIT;
