-- Calculated SQL for load_1_accounts.sql
TRUNCATE transaction_lines, transactions, accounts CASCADE;
INSERT INTO public.accounts (org_id, code, name, name_ar, category, is_postable, allow_transactions, is_standard, is_active, legacy_code, legacy_name, level, path) VALUES 
('d5789445-11e3-4ad6-9297-b56521675114', '1000', '', 'الأصول', 'asset', FALSE, FALSE, FALSE, TRUE, '1', 'الاصول', 0, '1000'),
('d5789445-11e3-4ad6-9297-b56521675114', '1110', '', 'أصول ثابتة (PPE)', 'asset', FALSE, FALSE, FALSE, TRUE, '11', 'الاصول الثابتة .', 0, '1110'),
('d5789445-11e3-4ad6-9297-b56521675114', '1100', '', 'أصول غير متداولة', 'asset', FALSE, FALSE, FALSE, TRUE, '12', 'الاصول طويلة الاجل', 0, '1100'),
('d5789445-11e3-4ad6-9297-b56521675114', '1200', '', 'أصول متداولة', 'asset', FALSE, FALSE, FALSE, TRUE, '13', 'الاصول المتداولة', 0, '1200'),
('d5789445-11e3-4ad6-9297-b56521675114', '111501', '', 'مجمع الاهلاك .', 'asset', FALSE, FALSE, FALSE, TRUE, '52', 'مجمع الاهلاك .', 0, '111501'),
('d5789445-11e3-4ad6-9297-b56521675114', '11101', '', 'الاراضى', 'asset', FALSE, FALSE, FALSE, TRUE, '111', 'الاراضى', 0, '11101'),
('d5789445-11e3-4ad6-9297-b56521675114', '11102', '', 'المبانى', 'asset', FALSE, FALSE, FALSE, TRUE, '112', 'المبانى', 0, '11102'),
('d5789445-11e3-4ad6-9297-b56521675114', '11103', '', 'السيارات', 'asset', FALSE, FALSE, FALSE, TRUE, '113', 'السيارات', 0, '11103'),
('d5789445-11e3-4ad6-9297-b56521675114', '11104', '', 'الالات والمعدات', 'asset', FALSE, FALSE, FALSE, TRUE, '114', 'الالات والمعدات', 0, '11104'),
('d5789445-11e3-4ad6-9297-b56521675114', '11105', '', 'الحاسب الالى', 'asset', TRUE, TRUE, FALSE, TRUE, '115', 'الحاسب الالى', 0, '11105'),
('d5789445-11e3-4ad6-9297-b56521675114', '11106', '', 'الاثاث والمهمات', 'asset', TRUE, TRUE, FALSE, TRUE, '116', 'الاثاث والمهمات', 0, '11106'),
('d5789445-11e3-4ad6-9297-b56521675114', '11107', '', 'العدد والادوات', 'asset', TRUE, TRUE, FALSE, TRUE, '117', 'العدد والادوات', 0, '11107'),
('d5789445-11e3-4ad6-9297-b56521675114', '11201', '', 'مشروعات تحت التنفيذ .', 'asset', FALSE, FALSE, FALSE, TRUE, '121', 'مشروعات تحت التنفيذ .', 0, '11201'),
('d5789445-11e3-4ad6-9297-b56521675114', '11301', '', 'الاستثمارات .', 'asset', FALSE, FALSE, FALSE, TRUE, '122', 'الاستثمارات .', 0, '11301'),
('d5789445-11e3-4ad6-9297-b56521675114', '11401', '', 'نفقات ايرادية مؤجلة .', 'asset', FALSE, FALSE, FALSE, TRUE, '123', 'نفقات ايرادية مؤجلة .', 0, '11401'),
('d5789445-11e3-4ad6-9297-b56521675114', '11501', '', 'اصول ضريبية مؤجلة .', 'asset', FALSE, FALSE, FALSE, TRUE, '124', 'اصول ضريبية مؤجلة .', 0, '11501'),
('d5789445-11e3-4ad6-9297-b56521675114', '12101', '', 'الخزينة .', 'asset', TRUE, TRUE, FALSE, TRUE, '131', 'الخزينة .', 0, '12101'),
('d5789445-11e3-4ad6-9297-b56521675114', '12102', '', 'الخزينة .', 'asset', TRUE, TRUE, FALSE, TRUE, '131', 'الخزينة .', 0, '12102'),
('d5789445-11e3-4ad6-9297-b56521675114', '12103', '', 'البنوك .', 'asset', TRUE, TRUE, FALSE, TRUE, '132', 'البنوك .', 0, '12103'),
('d5789445-11e3-4ad6-9297-b56521675114', '12104', '', 'الودائع .', 'asset', FALSE, FALSE, FALSE, TRUE, '133', 'الودائع .', 0, '12104'),
('d5789445-11e3-4ad6-9297-b56521675114', '12201', '', 'العملاء .', 'asset', TRUE, TRUE, FALSE, TRUE, '134', 'العملاء .', 0, '12201'),
('d5789445-11e3-4ad6-9297-b56521675114', '12301', '', 'الحسابات المدينة و الدائنة .', 'asset', FALSE, FALSE, FALSE, TRUE, '135', 'الحسابات المدينة و الدائنة .', 0, '12301'),
('d5789445-11e3-4ad6-9297-b56521675114', '12401', '', 'المقاولون دفعات مقدمه .', 'asset', FALSE, FALSE, FALSE, TRUE, '136', 'المقاولون دفعات مقدمه .', 0, '12401'),
('d5789445-11e3-4ad6-9297-b56521675114', '12402', '', 'المقاولون تشوينات .', 'asset', FALSE, FALSE, FALSE, TRUE, '137', 'المقاولون تشوينات .', 0, '12402'),
('d5789445-11e3-4ad6-9297-b56521675114', '12501', '', 'الاعتمادات المستندية .', 'asset', FALSE, FALSE, FALSE, TRUE, '138', 'الاعتمادات المستندية .', 0, '12501'),
('d5789445-11e3-4ad6-9297-b56521675114', '12601', '', 'اوراق القبض .', 'asset', FALSE, FALSE, FALSE, TRUE, '139', 'اوراق القبض .', 0, '12601'),
('d5789445-11e3-4ad6-9297-b56521675114', '111502', '', 'مجمع اهلاك المبانى', 'asset', FALSE, FALSE, FALSE, TRUE, '521', 'مجمع اهلاك المبانى', 0, '111502'),
('d5789445-11e3-4ad6-9297-b56521675114', '111503', '', 'مجمع اهلاك السيارات', 'asset', FALSE, FALSE, FALSE, TRUE, '522', 'مجمع اهلاك السيارات', 0, '111503'),
('d5789445-11e3-4ad6-9297-b56521675114', '111504', '', 'مجمع اهلاك الات المعدات', 'asset', FALSE, FALSE, FALSE, TRUE, '523', 'مجمع اهلاك الات المعدات', 0, '111504'),
('d5789445-11e3-4ad6-9297-b56521675114', '111505', '', 'مجمع اهلاك الحاسب الالى', 'asset', FALSE, FALSE, FALSE, TRUE, '524', 'مجمع اهلاك الحاسب الالى', 0, '111505'),
('d5789445-11e3-4ad6-9297-b56521675114', '111506', '', 'مجمع اهلاك الاثاث و المهمات', 'asset', FALSE, FALSE, FALSE, TRUE, '525', 'مجمع اهلاك الاثاث و المهمات', 0, '111506'),
('d5789445-11e3-4ad6-9297-b56521675114', '11202', '', 'تكوين سلعى', 'asset', FALSE, FALSE, FALSE, TRUE, '1211', 'تكوين سلعى', 0, '11202'),
('d5789445-11e3-4ad6-9297-b56521675114', '11203', '', 'انفاق استثمارى', 'asset', FALSE, FALSE, FALSE, TRUE, '1212', 'انفاق استثمارى', 0, '11203'),
('d5789445-11e3-4ad6-9297-b56521675114', '11302', '', 'استثمارات شركات شقيقة', 'asset', FALSE, FALSE, FALSE, TRUE, '1221', 'استثمارات شركات شقيقة', 0, '11302'),
('d5789445-11e3-4ad6-9297-b56521675114', '11303', '', 'استثمارات اخرى', 'asset', FALSE, FALSE, FALSE, TRUE, '1222', 'استثمارات اخرى', 0, '11303'),
('d5789445-11e3-4ad6-9297-b56521675114', '11304', '', 'استثمار فى اوراق مالية', 'asset', FALSE, FALSE, FALSE, TRUE, '1223', 'استثمار فى اوراق مالية', 0, '11304'),
('d5789445-11e3-4ad6-9297-b56521675114', '11305', '', 'استثمار اذون خزانة', 'asset', FALSE, FALSE, FALSE, TRUE, '1224', 'استثمار اذون خزانة', 0, '11305'),
('d5789445-11e3-4ad6-9297-b56521675114', '11306', '', 'استثمارات شركات التابعة', 'asset', FALSE, FALSE, FALSE, TRUE, '1225', 'استثمارات شركات التابعة', 0, '11306'),
('d5789445-11e3-4ad6-9297-b56521675114', '11307', '', 'صناديق استثمار', 'asset', FALSE, FALSE, FALSE, TRUE, '1226', 'صناديق استثمار', 0, '11307'),
('d5789445-11e3-4ad6-9297-b56521675114', '12105', '', 'خزينة نقدى', 'asset', FALSE, FALSE, FALSE, TRUE, '1311', 'خزينة نقدى', 0, '12105'),
('d5789445-11e3-4ad6-9297-b56521675114', '12106', '', 'خزينة شيكات', 'asset', FALSE, FALSE, FALSE, TRUE, '1312', 'خزينة شيكات', 0, '12106'),
('d5789445-11e3-4ad6-9297-b56521675114', '12107', '', 'عقود عمليات نسب التمام.', 'asset', FALSE, FALSE, FALSE, TRUE, '1313', 'عقود عمليات نسب التمام.', 0, '12107'),
('d5789445-11e3-4ad6-9297-b56521675114', '12108', '', 'الانخفاض فى ارصدة العملاء .', 'asset', FALSE, FALSE, FALSE, TRUE, '1314', 'الانخفاض فى ارصدة العملاء .', 0, '12108'),
('d5789445-11e3-4ad6-9297-b56521675114', '12109', '', 'الانخفاض فى قيم الاستثمارات .', 'asset', FALSE, FALSE, FALSE, TRUE, '1315', 'الانخفاض فى قيم الاستثمارات .', 0, '12109'),
('d5789445-11e3-4ad6-9297-b56521675114', '12110', '', 'الانخفاض فى ارصدة المدينون .', 'asset', FALSE, FALSE, FALSE, TRUE, '1316', 'الانخفاض فى ارصدة المدينون .', 0, '12110'),
('d5789445-11e3-4ad6-9297-b56521675114', '12111', '', 'مخصص انتفى الغرض منه .', 'asset', FALSE, FALSE, FALSE, TRUE, '1317', 'مخصص انتفى الغرض منه .', 0, '12111'),
('d5789445-11e3-4ad6-9297-b56521675114', '12112', '', 'مسدد من تحت حساب الاستثمار .', 'asset', FALSE, FALSE, FALSE, TRUE, '1318', 'مسدد من تحت حساب الاستثمار .', 0, '12112'),
('d5789445-11e3-4ad6-9297-b56521675114', '12202', '', 'العملاء - ضريبة القيمة المضافة .', 'asset', FALSE, FALSE, FALSE, TRUE, '1341', 'العملاء - ضريبة القيمة المضافة .', 0, '12202'),
('d5789445-11e3-4ad6-9297-b56521675114', '12302', '', 'الاجور المستحقة', 'asset', FALSE, FALSE, FALSE, TRUE, '1351', 'الاجور المستحقة', 0, '12302'),
('d5789445-11e3-4ad6-9297-b56521675114', '12303', '', 'العهد', 'asset', FALSE, FALSE, FALSE, TRUE, '1351', 'العهد', 0, '12303'),
('d5789445-11e3-4ad6-9297-b56521675114', '12304', '', 'السلفيات', 'asset', TRUE, TRUE, FALSE, TRUE, '1352', 'السلفيات', 0, '12304'),
('d5789445-11e3-4ad6-9297-b56521675114', '12305', '', 'السلفيات', 'asset', TRUE, TRUE, FALSE, TRUE, '1352', 'السلفيات', 0, '12305'),
('d5789445-11e3-4ad6-9297-b56521675114', '12306', '', 'المصاريف المقدمه', 'asset', FALSE, FALSE, FALSE, TRUE, '1353', 'المصاريف المقدمه', 0, '12306'),
('d5789445-11e3-4ad6-9297-b56521675114', '12307', '', 'المدينون والدائنون', 'asset', TRUE, TRUE, FALSE, TRUE, '1354', 'المدينون والدائنون', 0, '12307'),
('d5789445-11e3-4ad6-9297-b56521675114', '12308', '', 'ايرادات مستحقة', 'asset', FALSE, FALSE, FALSE, TRUE, '1355', 'ايرادات مستحقة', 0, '12308'),
('d5789445-11e3-4ad6-9297-b56521675114', '12309', '', 'صندوق الزمالة', 'asset', FALSE, FALSE, FALSE, TRUE, '1356', 'صندوق الزمالة', 0, '12309'),
('d5789445-11e3-4ad6-9297-b56521675114', '12310', '', 'تامينات اجتماعية', 'asset', FALSE, FALSE, FALSE, TRUE, '1357', 'تامينات اجتماعية', 0, '12310'),
('d5789445-11e3-4ad6-9297-b56521675114', '12311', '', 'صندوق الجزاءات', 'asset', FALSE, FALSE, FALSE, TRUE, '1358', 'صندوق الجزاءات', 0, '12311'),
('d5789445-11e3-4ad6-9297-b56521675114', '12312', '', 'ضرائب كسب العمل', 'asset', FALSE, FALSE, FALSE, TRUE, '1359', 'ضرائب كسب العمل', 0, '12312'),
('d5789445-11e3-4ad6-9297-b56521675114', '12113', '', 'تامينات العملاء', 'asset', TRUE, TRUE, FALSE, TRUE, '13111', 'تامينات العملاء', 0, '12113'),
('d5789445-11e3-4ad6-9297-b56521675114', '12114', '', 'تامينات جهات اخرى', 'asset', FALSE, FALSE, FALSE, TRUE, '13112', 'تامينات جهات اخرى', 0, '12114'),
('d5789445-11e3-4ad6-9297-b56521675114', '12115', '', 'تامين غطاء اعتمادات مستندية', 'asset', FALSE, FALSE, FALSE, TRUE, '13113', 'تامين غطاء اعتمادات مستندية', 0, '12115'),
('d5789445-11e3-4ad6-9297-b56521675114', '12116', '', 'تامين غطاء خطاب ضمان', 'asset', FALSE, FALSE, FALSE, TRUE, '13114', 'تامين غطاء خطاب ضمان', 0, '12116'),
('d5789445-11e3-4ad6-9297-b56521675114', '12117', '', 'تامين مصلحة الجمارك', 'asset', FALSE, FALSE, FALSE, TRUE, '13115', 'تامين مصلحة الجمارك', 0, '12117'),
('d5789445-11e3-4ad6-9297-b56521675114', '12118', '', 'اعمال تحت التنفيذ .', 'asset', FALSE, FALSE, FALSE, TRUE, '13116', 'اعمال تحت التنفيذ .', 0, '12118'),
('d5789445-11e3-4ad6-9297-b56521675114', '12313', '', 'المصاريف اداريه', 'asset', FALSE, FALSE, FALSE, TRUE, '13511', 'المصاريف اداريه', 0, '12313'),
('d5789445-11e3-4ad6-9297-b56521675114', '12314', '', 'صندوق النقابة', 'asset', FALSE, FALSE, FALSE, TRUE, '13512', 'صندوق النقابة', 0, '12314'),
('d5789445-11e3-4ad6-9297-b56521675114', '12315', '', 'الامانات', 'asset', FALSE, FALSE, FALSE, TRUE, '13513', 'الامانات', 0, '12315'),
('d5789445-11e3-4ad6-9297-b56521675114', '12316', '', 'دائنو التوزيعات', 'asset', FALSE, FALSE, FALSE, TRUE, '13516', 'دائنو التوزيعات', 0, '12316'),
('d5789445-11e3-4ad6-9297-b56521675114', '12317', '', 'ايرادات مقدمه', 'asset', FALSE, FALSE, FALSE, TRUE, '13518', 'ايرادات مقدمه', 0, '12317'),
('d5789445-11e3-4ad6-9297-b56521675114', '12318', '', 'المساهمة التكافلية', 'asset', FALSE, FALSE, FALSE, TRUE, '13519', 'المساهمة التكافلية', 0, '12318'),
('d5789445-11e3-4ad6-9297-b56521675114', '12319', '', 'صندوق تكريم الشهداء', 'asset', FALSE, FALSE, FALSE, TRUE, '13521', 'صندوق تكريم الشهداء', 0, '12319'),
('d5789445-11e3-4ad6-9297-b56521675114', '12320', '', 'تامينات اجتماعية عاملين', 'asset', FALSE, FALSE, FALSE, TRUE, '13571', 'تامينات اجتماعية عاملين', 0, '12320'),
('d5789445-11e3-4ad6-9297-b56521675114', '12321', '', 'تامينات اجتماعية شركة', 'asset', FALSE, FALSE, FALSE, TRUE, '13572', 'تامينات اجتماعية شركة', 0, '12321'),
('d5789445-11e3-4ad6-9297-b56521675114', '12322', '', 'ضرائب كسب العمل عمالة', 'asset', FALSE, FALSE, FALSE, TRUE, '13591', 'ضرائب كسب العمل عمالة', 0, '12322'),
('d5789445-11e3-4ad6-9297-b56521675114', '12323', '', 'ضرائب كسب العمل مرتبات', 'asset', FALSE, FALSE, FALSE, TRUE, '13592', 'ضرائب كسب العمل مرتبات', 0, '12323'),
('d5789445-11e3-4ad6-9297-b56521675114', '12324', '', 'ضرائب كسب العمل حوافز', 'asset', FALSE, FALSE, FALSE, TRUE, '13593', 'ضرائب كسب العمل حوافز', 0, '12324'),
('d5789445-11e3-4ad6-9297-b56521675114', '12325', '', 'ضرائب كسب عمل اعضاء مجلس الادارة', 'asset', FALSE, FALSE, FALSE, TRUE, '13594', 'ضرائب كسب عمل اعضاء مجلس الادارة', 0, '12325'),
('d5789445-11e3-4ad6-9297-b56521675114', '12119', '', 'سلامة اعمال', 'asset', FALSE, FALSE, FALSE, TRUE, '131111', 'سلامة اعمال', 0, '12119'),
('d5789445-11e3-4ad6-9297-b56521675114', '12120', '', 'ضمان نهائى', 'asset', FALSE, FALSE, FALSE, TRUE, '131112', 'ضمان نهائى', 0, '12120'),
('d5789445-11e3-4ad6-9297-b56521675114', '12121', '', 'مخاطر', 'asset', FALSE, FALSE, FALSE, TRUE, '131113', 'مخاطر', 0, '12121'),
('d5789445-11e3-4ad6-9297-b56521675114', '12122', '', 'تأمين إبتدائى', 'asset', FALSE, FALSE, FALSE, TRUE, '131114', 'تأمين إبتدائى', 0, '12122'),
('d5789445-11e3-4ad6-9297-b56521675114', '12123', '', 'تامينات لدى الغير .', 'asset', TRUE, TRUE, FALSE, TRUE, '131313', 'تامينات لدى الغير .', 0, '12123'),
('d5789445-11e3-4ad6-9297-b56521675114', '12326', '', 'مساهمو الشركة', 'asset', FALSE, FALSE, FALSE, TRUE, '135161', 'مساهمو الشركة', 0, '12326'),
('d5789445-11e3-4ad6-9297-b56521675114', '12327', '', 'حصة العاملين', 'asset', FALSE, FALSE, FALSE, TRUE, '135162', 'حصة العاملين', 0, '12327'),
('d5789445-11e3-4ad6-9297-b56521675114', '3000', '', 'حقوق الملكية', 'equity', FALSE, FALSE, FALSE, TRUE, '21', 'حقوق الملكية', 0, '3000'),
('d5789445-11e3-4ad6-9297-b56521675114', '33001', '', 'ارباح العام .', 'equity', FALSE, FALSE, FALSE, TRUE, '51', 'ارباح العام .', 0, '33001'),
('d5789445-11e3-4ad6-9297-b56521675114', '31001', '', 'راس المال .', 'equity', TRUE, TRUE, FALSE, TRUE, '211', 'راس المال .', 0, '31001'),
('d5789445-11e3-4ad6-9297-b56521675114', '33002', '', 'الارباح المجنبة .', 'equity', FALSE, FALSE, FALSE, TRUE, '212', 'الارباح المجنبة .', 0, '33002'),
('d5789445-11e3-4ad6-9297-b56521675114', '32001', '', 'الاحتياطى القانونى .', 'equity', FALSE, FALSE, FALSE, TRUE, '213', 'الاحتياطى القانونى .', 0, '32001'),
('d5789445-11e3-4ad6-9297-b56521675114', '33003', '', 'ارباح و خسائر تقييم استثمارات.', 'equity', FALSE, FALSE, FALSE, TRUE, '214', 'ارباح و خسائر تقييم استثمارات.', 0, '33003'),
('d5789445-11e3-4ad6-9297-b56521675114', '32002', '', 'مبالغ مجنبة لزيادة راس المال.', 'equity', FALSE, FALSE, FALSE, TRUE, '215', 'مبالغ مجنبة لزيادة راس المال.', 0, '32002'),
('d5789445-11e3-4ad6-9297-b56521675114', '5000', '', 'المصروفات والتكاليف', 'expense', FALSE, FALSE, FALSE, TRUE, '3', 'المصروفات', 0, '5000'),
('d5789445-11e3-4ad6-9297-b56521675114', '5710', '', 'مصروفات/بنود أخرى (Legacy 5 غير مصنفة)', 'expense', TRUE, TRUE, FALSE, TRUE, '5', 'حسابات اخرى', 0, '5710'),
('d5789445-11e3-4ad6-9297-b56521675114', '5100', '', 'تكاليف المشروعات/التشغيل', 'expense', TRUE, TRUE, FALSE, TRUE, '31', 'التكاليف .', 0, '5100'),
('d5789445-11e3-4ad6-9297-b56521675114', '5200', '', 'مصروفات عمومية وإدارية', 'expense', TRUE, TRUE, FALSE, TRUE, '32', 'المصاريف العمومية .', 0, '5200'),
('d5789445-11e3-4ad6-9297-b56521675114', '5300', '', 'تكاليف مشتركة', 'expense', TRUE, TRUE, FALSE, TRUE, '33', 'التكاليف المشتركة .', 0, '5300'),
('d5789445-11e3-4ad6-9297-b56521675114', '5400', '', 'إهلاك', 'expense', FALSE, FALSE, FALSE, TRUE, '35', 'الاهلاك .', 0, '5400'),
('d5789445-11e3-4ad6-9297-b56521675114', '5500', '', 'فروق تقييم عملة', 'expense', TRUE, TRUE, FALSE, TRUE, '36', 'فروق تقييم العملة .', 0, '5500'),
('d5789445-11e3-4ad6-9297-b56521675114', '5600', '', 'ضرائب دخل/مؤجلة', 'expense', FALSE, FALSE, FALSE, TRUE, '37', 'مصاريف ضريبة الدخل .', 0, '5600'),
('d5789445-11e3-4ad6-9297-b56521675114', '5700', '', 'مصروفات أخرى/مخصصات', 'expense', FALSE, FALSE, FALSE, TRUE, '39', 'مصاريف التزامات محتمله .', 0, '5700'),
('d5789445-11e3-4ad6-9297-b56521675114', '57101', '', 'مستندات برسم التحصيل .', 'expense', FALSE, FALSE, FALSE, TRUE, '53', 'مستندات برسم التحصيل .', 0, '57101'),
('d5789445-11e3-4ad6-9297-b56521675114', '52101', '', 'مصروفات بنكيه', 'expense', FALSE, FALSE, FALSE, TRUE, '58', 'مصروفات بنكيه', 0, '52101'),
('d5789445-11e3-4ad6-9297-b56521675114', '12701', '', 'المخزون', 'expense', FALSE, FALSE, FALSE, TRUE, '59', 'المخزون', 0, '12701'),
('d5789445-11e3-4ad6-9297-b56521675114', '54001', '', 'اهلاك المبانى', 'expense', FALSE, FALSE, FALSE, TRUE, '351', 'اهلاك المبانى', 0, '54001'),
('d5789445-11e3-4ad6-9297-b56521675114', '54002', '', 'اهلاك السيارات', 'expense', FALSE, FALSE, FALSE, TRUE, '352', 'اهلاك السيارات', 0, '54002'),
('d5789445-11e3-4ad6-9297-b56521675114', '54003', '', 'اهلاك الالات و المعدات', 'expense', FALSE, FALSE, FALSE, TRUE, '353', 'اهلاك الالات و المعدات', 0, '54003'),
('d5789445-11e3-4ad6-9297-b56521675114', '54004', '', 'اهلاك العدد و الادوات', 'expense', FALSE, FALSE, FALSE, TRUE, '354', 'اهلاك العدد و الادوات', 0, '54004'),
('d5789445-11e3-4ad6-9297-b56521675114', '54005', '', 'اهلاك الاثاث و مهمات', 'expense', FALSE, FALSE, FALSE, TRUE, '355', 'اهلاك الاثاث و مهمات', 0, '54005'),
('d5789445-11e3-4ad6-9297-b56521675114', '54006', '', 'اهلاك الحاسب الالى', 'expense', FALSE, FALSE, FALSE, TRUE, '356', 'اهلاك الحاسب الالى', 0, '54006'),
('d5789445-11e3-4ad6-9297-b56521675114', '52001', '', 'مصاريف التزامات اقرارات معدله .', 'expense', FALSE, FALSE, FALSE, TRUE, '391', 'مصاريف التزامات اقرارات معدله .', 0, '52001'),
('d5789445-11e3-4ad6-9297-b56521675114', '56001', '', 'مصروف ضريبة توزيعات ارباح الاستثمار .', 'expense', FALSE, FALSE, FALSE, TRUE, '392', 'مصروف ضريبة توزيعات ارباح الاستثمار .', 0, '56001'),
('d5789445-11e3-4ad6-9297-b56521675114', '52002', '', 'مصروف المساهمة التكافلية .', 'expense', FALSE, FALSE, FALSE, TRUE, '393', 'مصروف المساهمة التكافلية .', 0, '52002'),
('d5789445-11e3-4ad6-9297-b56521675114', '52003', '', 'مصروف ضرائب اذون خزانة محققة.', 'expense', FALSE, FALSE, FALSE, TRUE, '394', 'مصروف ضرائب اذون خزانة محققة.', 0, '52003'),
('d5789445-11e3-4ad6-9297-b56521675114', '2000', '', 'الالتزامات', 'liability', FALSE, FALSE, FALSE, TRUE, '2', 'الخصوم', 0, '2000'),
('d5789445-11e3-4ad6-9297-b56521675114', '2100', '', 'التزامات غير متداولة', 'liability', FALSE, FALSE, FALSE, TRUE, '22', 'الالتزامات طويلة الاجل', 0, '2100'),
('d5789445-11e3-4ad6-9297-b56521675114', '2200', '', 'التزامات متداولة', 'liability', FALSE, FALSE, FALSE, TRUE, '23', 'الالتزامات المتداولة', 0, '2200'),
('d5789445-11e3-4ad6-9297-b56521675114', '22101', '', 'موردين تحت التسوية .', 'liability', FALSE, FALSE, FALSE, TRUE, '55', 'موردين تحت التسوية .', 0, '22101'),
('d5789445-11e3-4ad6-9297-b56521675114', '22801', '', 'الدائنون', 'liability', FALSE, FALSE, FALSE, TRUE, '57', 'الدائنون', 0, '22801'),
('d5789445-11e3-4ad6-9297-b56521675114', '22201', '', 'عملاء دفعات مقدمة .', 'liability', TRUE, TRUE, FALSE, TRUE, '221', 'عملاء دفعات مقدمة .', 0, '22201'),
('d5789445-11e3-4ad6-9297-b56521675114', '22102', '', 'اوراق الدفع .', 'liability', FALSE, FALSE, FALSE, TRUE, '231', 'اوراق الدفع .', 0, '22102'),
('d5789445-11e3-4ad6-9297-b56521675114', '22103', '', 'المقاولون .', 'liability', TRUE, TRUE, FALSE, TRUE, '232', 'المقاولون .', 0, '22103'),
('d5789445-11e3-4ad6-9297-b56521675114', '22202', '', 'العملاء تشوينات .', 'liability', TRUE, TRUE, FALSE, TRUE, '233', 'العملاء تشوينات .', 0, '22202'),
('d5789445-11e3-4ad6-9297-b56521675114', '22104', '', 'الموردين .', 'liability', TRUE, TRUE, FALSE, TRUE, '234', 'الموردين .', 0, '22104'),
('d5789445-11e3-4ad6-9297-b56521675114', '22301', '', 'الضرائب .', 'liability', FALSE, FALSE, FALSE, TRUE, '235', 'الضرائب .', 0, '22301'),
('d5789445-11e3-4ad6-9297-b56521675114', '22701', '', 'تامينات للغير .', 'liability', TRUE, TRUE, FALSE, TRUE, '236', 'تامينات للغير .', 0, '22701'),
('d5789445-11e3-4ad6-9297-b56521675114', '22501', '', 'المخصصات .', 'liability', FALSE, FALSE, FALSE, TRUE, '237', 'المخصصات .', 0, '22501'),
('d5789445-11e3-4ad6-9297-b56521675114', '22001', '', 'تعديل القيم الدفترية للاسهم .', 'liability', FALSE, FALSE, FALSE, TRUE, '238', 'تعديل القيم الدفترية للاسهم .', 0, '22001'),
('d5789445-11e3-4ad6-9297-b56521675114', '22002', '', 'تعديل ارصدة المدينون .', 'liability', FALSE, FALSE, FALSE, TRUE, '239', 'تعديل ارصدة المدينون .', 0, '22002'),
('d5789445-11e3-4ad6-9297-b56521675114', '22105', '', 'مخصص ضريبة الدخل .', 'liability', FALSE, FALSE, FALSE, TRUE, '2311', 'مخصص ضريبة الدخل .', 0, '22105'),
('d5789445-11e3-4ad6-9297-b56521675114', '22106', '', 'مخصص التزامات ضريبية مؤجلة .', 'liability', FALSE, FALSE, FALSE, TRUE, '2312', 'مخصص التزامات ضريبية مؤجلة .', 0, '22106'),
('d5789445-11e3-4ad6-9297-b56521675114', '22107', '', 'مخصص التزامات محتمله .', 'liability', FALSE, FALSE, FALSE, TRUE, '2313', 'مخصص التزامات محتمله .', 0, '22107'),
('d5789445-11e3-4ad6-9297-b56521675114', '22108', '', 'عوائد اذون خزانة محققة .', 'liability', FALSE, FALSE, FALSE, TRUE, '2314', 'عوائد اذون خزانة محققة .', 0, '22108'),
('d5789445-11e3-4ad6-9297-b56521675114', '22109', '', 'مخازن تحويلات .', 'liability', FALSE, FALSE, FALSE, TRUE, '2316', 'مخازن تحويلات .', 0, '22109'),
('d5789445-11e3-4ad6-9297-b56521675114', '22110', '', 'مخصص المساهمة التكافلية .', 'liability', FALSE, FALSE, FALSE, TRUE, '2317', 'مخصص المساهمة التكافلية .', 0, '22110'),
('d5789445-11e3-4ad6-9297-b56521675114', '22203', '', 'عملاء تشوينات اعمال', 'liability', FALSE, FALSE, FALSE, TRUE, '2331', 'عملاء تشوينات اعمال', 0, '22203'),
('d5789445-11e3-4ad6-9297-b56521675114', '22204', '', 'عملاء تشوينات اصول ومواد خام', 'liability', FALSE, FALSE, FALSE, TRUE, '2332', 'عملاء تشوينات اصول ومواد خام', 0, '22204'),
('d5789445-11e3-4ad6-9297-b56521675114', '22205', '', 'عملاء تشوينات فروق اسعار', 'liability', FALSE, FALSE, FALSE, TRUE, '2333', 'عملاء تشوينات فروق اسعار', 0, '22205'),
('d5789445-11e3-4ad6-9297-b56521675114', '22302', '', 'ضرائب العملاء', 'liability', FALSE, FALSE, FALSE, TRUE, '2351', 'ضرائب العملاء', 0, '22302'),
('d5789445-11e3-4ad6-9297-b56521675114', '22303', '', 'ضرائب الخصم', 'liability', TRUE, TRUE, FALSE, TRUE, '2352', 'ضرائب الخصم', 0, '22303'),
('d5789445-11e3-4ad6-9297-b56521675114', '22304', '', 'دمغة توقيع', 'liability', FALSE, FALSE, FALSE, TRUE, '2353', 'دمغة توقيع', 0, '22304'),
('d5789445-11e3-4ad6-9297-b56521675114', '22305', '', 'دمغة نسبية', 'liability', FALSE, FALSE, FALSE, TRUE, '2354', 'دمغة نسبية', 0, '22305'),
('d5789445-11e3-4ad6-9297-b56521675114', '22306', '', 'ضرائب القيمة المضافة', 'liability', TRUE, TRUE, FALSE, TRUE, '2356', 'ضرائب القيمة المضافة', 0, '22306'),
('d5789445-11e3-4ad6-9297-b56521675114', '22307', '', 'ضرائب اذون خزانة غير محققة', 'liability', FALSE, FALSE, FALSE, TRUE, '2358', 'ضرائب اذون خزانة غير محققة', 0, '22307'),
('d5789445-11e3-4ad6-9297-b56521675114', '22308', '', 'ضرائب اذون خزانة محققة', 'liability', FALSE, FALSE, FALSE, TRUE, '2359', 'ضرائب اذون خزانة محققة', 0, '22308'),
('d5789445-11e3-4ad6-9297-b56521675114', '22502', '', 'مخصص ديون مشكوك فى تحصيلها - عملاء', 'liability', FALSE, FALSE, FALSE, TRUE, '2371', 'مخصص ديون مشكوك فى تحصيلها - عملاء', 0, '22502'),
('d5789445-11e3-4ad6-9297-b56521675114', '22309', '', 'دمغة حكومية', 'liability', FALSE, FALSE, FALSE, TRUE, '23511', 'دمغة حكومية', 0, '22309'),
('d5789445-11e3-4ad6-9297-b56521675114', '22310', '', 'ضريبة الدخل للاسخاص الاعتبارية', 'liability', FALSE, FALSE, FALSE, TRUE, '23512', 'ضريبة الدخل للاسخاص الاعتبارية', 0, '22310'),
('d5789445-11e3-4ad6-9297-b56521675114', '22311', '', 'ارباح تجارية وصناعية - رسوم جمركية', 'liability', FALSE, FALSE, FALSE, TRUE, '23513', 'ارباح تجارية وصناعية - رسوم جمركية', 0, '22311'),
('d5789445-11e3-4ad6-9297-b56521675114', '22312', '', 'الضريبة على توزيعات ارباح المساهمين', 'liability', FALSE, FALSE, FALSE, TRUE, '23514', 'الضريبة على توزيعات ارباح المساهمين', 0, '22312'),
('d5789445-11e3-4ad6-9297-b56521675114', '4000', '', 'الإيرادات', 'revenue', FALSE, FALSE, FALSE, TRUE, '4', 'الايرادات .', 0, '4000'),
('d5789445-11e3-4ad6-9297-b56521675114', '4100', '', 'إيرادات التشغيل/العقود', 'revenue', TRUE, TRUE, FALSE, TRUE, '41', 'ايرادات العمليات', 0, '4100'),
('d5789445-11e3-4ad6-9297-b56521675114', '4200', '', 'إيرادات أخرى', 'revenue', TRUE, TRUE, FALSE, TRUE, '42', 'ايرادات متنوعة', 0, '4200'),
('d5789445-11e3-4ad6-9297-b56521675114', '57102', '', 'ايراد ضريبى مؤجل  .', 'revenue', FALSE, FALSE, FALSE, TRUE, '51', 'ايراد ضريبى مؤجل  .', 0, '57102'),
('d5789445-11e3-4ad6-9297-b56521675114', '42101', '', 'ارباح وخسائر راسمالية.', 'revenue', TRUE, TRUE, FALSE, TRUE, '56', 'ارباح وخسائر راسمالية.', 0, '42101'),
('d5789445-11e3-4ad6-9297-b56521675114', '42001', '', '1', 'revenue', FALSE, FALSE, FALSE, TRUE, '421', '1', 0, '42001'),
('d5789445-11e3-4ad6-9297-b56521675114', '42002', '', '2', 'revenue', FALSE, FALSE, FALSE, TRUE, '422', '2', 0, '42002'),
('d5789445-11e3-4ad6-9297-b56521675114', '42003', '', '3', 'revenue', FALSE, FALSE, FALSE, TRUE, '423', '3', 0, '42003'),
('d5789445-11e3-4ad6-9297-b56521675114', '42004', '', '4', 'revenue', FALSE, FALSE, FALSE, TRUE, '424', '4', 0, '42004'),
('d5789445-11e3-4ad6-9297-b56521675114', '42005', '', '5', 'revenue', FALSE, FALSE, FALSE, TRUE, '425', '5', 0, '42005'),
('d5789445-11e3-4ad6-9297-b56521675114', '3100', '', 'رأس المال', 'equity', TRUE, TRUE, FALSE, TRUE, NULL, NULL, 0, '3100'),
('d5789445-11e3-4ad6-9297-b56521675114', '1210', '', 'نقدية وبنوك وودائع', 'asset', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '1210'),
('d5789445-11e3-4ad6-9297-b56521675114', '1220', '', 'عملاء وأوراق قبض', 'asset', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '1220'),
('d5789445-11e3-4ad6-9297-b56521675114', '1230', '', 'ذمم مدينة أخرى/سلف/مقدمات', 'asset', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '1230'),
('d5789445-11e3-4ad6-9297-b56521675114', '2210', '', 'موردون/مقاولون/أوراق دفع', 'liability', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '2210'),
('d5789445-11e3-4ad6-9297-b56521675114', '2220', '', 'دفعات مقدمة واحتجازات العملاء (Retention)', 'liability', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '2220'),
('d5789445-11e3-4ad6-9297-b56521675114', '2230', '', 'ضرائب مستحقة', 'liability', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '2230'),
('d5789445-11e3-4ad6-9297-b56521675114', '2270', '', 'تأمينات للغير/أمانات', 'liability', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '2270'),
('d5789445-11e3-4ad6-9297-b56521675114', '4210', '', 'أرباح/خسائر رأسمالية', 'revenue', TRUE, TRUE, FALSE, TRUE, NULL, NULL, 0, '4210'),
('d5789445-11e3-4ad6-9297-b56521675114', '1250', '', 'Header 1250', 'asset', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '1250'),
('d5789445-11e3-4ad6-9297-b56521675114', '2250', '', 'Header 2250', 'liability', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '2250'),
('d5789445-11e3-4ad6-9297-b56521675114', '1260', '', 'Header 1260', 'asset', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '1260'),
('d5789445-11e3-4ad6-9297-b56521675114', '5210', '', 'Header 5210', 'expense', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '5210'),
('d5789445-11e3-4ad6-9297-b56521675114', '1140', '', 'Header 1140', 'asset', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '1140'),
('d5789445-11e3-4ad6-9297-b56521675114', '3300', '', 'Header 3300', 'equity', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '3300'),
('d5789445-11e3-4ad6-9297-b56521675114', '1115', '', 'Header 1115', 'asset', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '1115'),
('d5789445-11e3-4ad6-9297-b56521675114', '1270', '', 'Header 1270', 'expense', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '1270'),
('d5789445-11e3-4ad6-9297-b56521675114', '1240', '', 'Header 1240', 'asset', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '1240'),
('d5789445-11e3-4ad6-9297-b56521675114', '3200', '', 'Header 3200', 'equity', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '3200'),
('d5789445-11e3-4ad6-9297-b56521675114', '2280', '', 'Header 2280', 'liability', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '2280'),
('d5789445-11e3-4ad6-9297-b56521675114', '1120', '', 'Header 1120', 'asset', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '1120'),
('d5789445-11e3-4ad6-9297-b56521675114', '1150', '', 'Header 1150', 'asset', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '1150'),
('d5789445-11e3-4ad6-9297-b56521675114', '1130', '', 'Header 1130', 'asset', FALSE, FALSE, FALSE, TRUE, NULL, NULL, 0, '1130')
ON CONFLICT (org_id, code) DO NOTHING;
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1100') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1110';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1100';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1200';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1115') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '111501';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1110') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11101';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1110') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11102';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1110') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11103';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1110') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11104';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1110') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11105';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1110') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11106';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1110') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11107';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1120') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11201';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1130') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11301';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1140') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11401';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1150') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11501';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12101';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12102';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12103';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12104';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1220') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12201';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12301';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1240') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12401';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1240') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12402';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1250') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12501';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1260') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12601';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1115') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '111502';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1115') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '111503';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1115') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '111504';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1115') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '111505';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1115') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '111506';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1120') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11202';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1120') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11203';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1130') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11302';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1130') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11303';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1130') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11304';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1130') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11305';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1130') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11306';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1130') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '11307';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12105';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12106';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12107';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12108';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12109';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12110';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12111';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12112';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1220') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12202';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12302';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12303';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12304';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12305';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12306';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12307';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12308';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12309';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12310';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12311';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12312';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12113';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12114';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12115';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12116';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12117';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12118';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12313';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12314';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12315';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12316';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12317';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12318';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12319';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12320';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12321';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12322';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12323';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12324';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12325';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12119';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12120';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12121';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12122';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12123';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12326';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12327';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '3300') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '33001';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '3100') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '31001';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '3300') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '33002';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '3200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '32001';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '3300') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '33003';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '3200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '32002';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5700') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5710';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5100';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5200';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5300';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5400';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5500';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5600';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5700';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5710') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '57101';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '52101';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1270') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '12701';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5400') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '54001';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5400') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '54002';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5400') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '54003';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5400') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '54004';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5400') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '54005';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5400') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '54006';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '52001';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5600') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '56001';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '52002';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '52003';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2100';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2200';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22101';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2280') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22801';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2220') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22201';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22102';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22103';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2220') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22202';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22104';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22301';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2270') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22701';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2250') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22501';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22001';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22002';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22105';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22106';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22107';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22108';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22109';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22110';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2220') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22203';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2220') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22204';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2220') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22205';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22302';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22303';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22304';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22305';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22306';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22307';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22308';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2250') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22502';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22309';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22310';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22311';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2230') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '22312';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4100';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4200';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5710') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '57102';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4210') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '42101';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '42001';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '42002';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '42003';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '42004';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '42005';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '3000') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '3100';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1210';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1220';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1230';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2210';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2220';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2230';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2270';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '4210';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1250';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2250';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1260';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '5210';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1100') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1140';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '3300') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '3300';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1100') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1115';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1270';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1240';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '3200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '3200';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2200') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '2280';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1100') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1120';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1100') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1150';
UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1100') WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' AND code = '1130';
