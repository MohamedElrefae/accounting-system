# Construction Chart of Accounts Migration - Implementation Guide

## Migration Status: ✅ COMPLETED

This document describes the successfully implemented construction-focused bilingual chart of accounts migration for the accounting system.

جاهز أدناه ملف Markdown تفصيلي كتوجيه واحد لعميل Warp ليقوم بـ: 1) استبدال ملف شجرة الحسابات الحالية بملف docs/chart_of_accounts.md وفق بنية 1000/2000 من 4 مستويات وبنفس حقول النظام العربي التي ذكرتها، و2) إنشاء ملف Excel لخريطة تحويل الأكواد (Crosswalk) بالحقول المحددة، مع نسخ احتياطية وخطوات تحقق بعد الكتابة. صُمّم المحتوى لقطاع المقاولات ويتضمن حسابات متخصصة مثل أعمال تحت التنفيذ، الأصول/الالتزامات التعاقدية وفق IFRS 15، واحتجازات الدفعات، إضافة لحسابات اقترحها التدقيق السابق لاستكمال المواءمة مع احتياجات المقاولات.[^10][^11][^12][^13]

## تعليمات لعميل Warp

انسخ الكتلة التالية بالكامل كوحي واحد إلى عميل Warp لتنفيذ المهام وإنشاء الملفين المطلوبين تلقائيًا مع عرض النتائج والتحقق النهائي بعد الكتابة.[^11][^10]

— BEGIN WARP PROMPT —
Task: Replace current Chart of Accounts and generate a Crosswalk Excel based on the updated Arabic-only structure (fields: الكود, الاسم, المستوى, الحالة, به معاملات, صافي). Keep backups, write files with UTF-8 (LF), and validate.

Actions:

1) Backup then write docs/chart_of_accounts.md with the exact Markdown table below.
2) Write data/coa_crosswalk.csv with the mapping table below, then convert it to data/coa_crosswalk.xlsx via Python (openpyxl or pandas).
3) Print a concise diff if docs/chart_of_accounts.md existed.
4) Open docs/chart_of_accounts.md in Markdown viewer (split pane) and confirm row counts for both tables.

File 1: docs/chart_of_accounts.md (write exactly the content between the dashed markers)

----- START FILE CONTENT -----

# شجرة الحسابات (مقاولات، 4 مستويات، 1000/2000) — Arabic fields only

الحقول: الكود | الاسم | المستوى | الحالة | به معاملات | صافي


| الكود | الاسم | المستوى | الحالة | به معاملات | صافي |
| --: | :-- | --: | :-- | :-- | --: |
| 1000 | الأصول | 1 | active | لا | 0 |
| 1100 | النقدية وما في حكمها | 2 | active | لا | 0 |
| 1110 | الخزينة | 3 | active | لا | 0 |
| 1111 | صندوق النثرية | 4 | active | لا | 0 |
| 1112 | نقدية في الخزنة الرئيسية | 4 | active | لا | 0 |
| 1120 | البنوك | 3 | active | لا | 0 |
| 1121 | الحساب المصرفي التشغيلي الرئيسي | 4 | active | لا | 0 |
| 1122 | حساب مصرفي للرواتب | 4 | active | لا | 0 |
| 1123 | حساب مصرفي لمدفوعات المشاريع | 4 | active | لا | 0 |
| 1130 | نقدية مقيدة / هوامش ضمان | 3 | active | لا | 0 |
| 1131 | حساب ودائع ضمان الأداء | 4 | active | لا | 0 |
| 1132 | حساب ودائع ضمان العطاءات | 4 | active | لا | 0 |
| 1200 | الذمم والأصول المتداولة الأخرى | 2 | active | لا | 0 |
| 1210 | ذمم تجارية - العملاء | 3 | active | لا | 0 |
| 1220 | مستحقات محتجزة من العقود | 3 | active | لا | 0 |
| 1230 | سلف دفعة للموردين | 3 | active | لا | 0 |
| 1240 | أصول تعاقدية – إيراد غير مفوتر | 3 | active | لا | 0 |
| 1245 | ضريبة مدخلات قابلة للاسترداد | 3 | active | لا | 0 |
| 1270 | مدينون متنوعون | 3 | active | لا | 0 |
| 1280 | سلف موظفين | 3 | active | لا | 0 |
| 1300 | المخزون والمواد | 2 | active | لا | 0 |
| 1310 | مخزون المواد الخام | 3 | active | لا | 0 |
| 1320 | مخزون مواد البناء | 3 | active | لا | 0 |
| 1330 | مخزون الأدوات والمعدات | 3 | active | لا | 0 |
| 1340 | مواد لدى مواقع العملاء (تشوينات) | 3 | active | لا | 0 |
| 1400 | الممتلكات والآلات والمعدات | 2 | active | لا | 0 |
| 1410 | الأثاث والتجهيزات | 3 | active | لا | 0 |
| 1420 | الآلات والمعدات | 3 | active | لا | 0 |
| 1430 | أجهزة الحاسب | 3 | active | لا | 0 |
| 1490 | مجمعات الإهلاك | 3 | active | لا | 0 |
| 1600 | أعمال تحت التنفيذ | 2 | active | لا | 0 |
| 1610 | أعمال تحت التنفيذ - تخصيص تكلفة العمالة | 3 | active | لا | 0 |
| 1620 | أعمال تحت التنفيذ - تخصيص تكلفة المواد | 3 | active | لا | 0 |
| 1630 | أعمال تحت التنفيذ - تخصيص تكلفة المقاولين | 3 | active | لا | 0 |
| 1640 | أعمال تحت التنفيذ - تخصيص تكلفة المعدات | 3 | active | لا | 0 |
| 2000 | الخصوم | 1 | active | لا | 0 |
| 2100 | الدائنون التجاريون ومقاولو الباطن | 2 | active | لا | 0 |
| 2110 | ذمم تجارية - موردي المواد | 3 | active | لا | 0 |
| 2120 | حساب مستحقات مقاولي الباطن | 3 | active | لا | 0 |
| 2130 | مبالغ محتجزة لعقود الدفع | 3 | active | لا | 0 |
| 2140 | دائنون متنوعون | 3 | active | لا | 0 |
| 2200 | التزامات قصيرة الأجل | 2 | active | لا | 0 |
| 2210 | مصروفات عامة مستحقة | 3 | active | لا | 0 |
| 2220 | رواتب الموظفين المستحقة | 3 | active | لا | 0 |
| 2230 | دفعات مقدمة من العملاء / التزامات تعاقدية | 3 | active | لا | 0 |
| 2400 | ضرائب ورسوم | 2 | active | لا | 0 |
| 2410 | ضريبة القيمة المضافة على المخرجات | 3 | active | لا | 0 |
| 2420 | ضريبة دخل الشركات المستحقة | 3 | active | لا | 0 |
| 2430 | ضرائب استقطاع عند المنبع مستحقة | 3 | active | لا | 0 |
| 2600 | قروض وتمويل | 2 | active | لا | 0 |
| 3000 | حقوق الملكية | 1 | active | لا | 0 |
| 3100 | رأس المال والاحتياطيات | 2 | active | لا | 0 |
| 3300 | الأرباح المحتجزة والنتائج | 2 | active | لا | 0 |
| 3350 | حسابات جارية مساهمين | 2 | active | لا | 0 |
| 4000 | الإيرادات | 1 | active | لا | 0 |
| 4100 | إيرادات عقود المقاولات | 2 | active | لا | 0 |
| 4110 | إيرادات العقود الإنشائية الأساسية | 3 | active | لا | 0 |
| 4120 | حساب إيرادات أوامر التغيير | 3 | active | لا | 0 |
| 4200 | إيرادات أخرى | 2 | active | لا | 0 |
| 4210 | دخل إيجار المعدات | 3 | active | لا | 0 |
| 4300 | إيرادات عكسية (خصومات/مردودات) | 2 | active | لا | 0 |
| 4310 | خصومات تعاقدية | 3 | active | لا | 0 |
| 4320 | مردودات / تسويات فوترة | 3 | active | لا | 0 |
| 5000 | التكاليف والمصروفات | 1 | active | لا | 0 |
| 5100 | تكاليف تنفيذ مباشرة | 2 | active | لا | 0 |
| 5110 | تكاليف العمالة المباشرة | 3 | active | لا | 0 |
| 5120 | تكاليف المواد المباشرة | 3 | active | لا | 0 |
| 5130 | تكاليف خدمات مقاولي الباطن | 3 | active | لا | 0 |
| 5140 | مصروفات إيجار المعدات | 3 | active | لا | 0 |
| 5200 | مصروفات تشغيل وإدارية | 2 | active | لا | 0 |
| 5210 | رواتب الموظفين الإداريين | 3 | active | لا | 0 |
| 5220 | مصروفات إيجار المكاتب | 3 | active | لا | 0 |
| 5230 | الخدمات العامة والمرافق | 3 | active | لا | 0 |
| 5260 | مصروفات وعمولات بنكية | 3 | active | لا | 0 |
| 5290 | مصروف إهلاك | 3 | active | لا | 0 |
| 5900 | مصروفات أخرى | 2 | active | لا | 0 |

----- END FILE CONTENT -----

File 2: data/coa_crosswalk.csv (write exactly the content between the dashed markers)

----- START CSV -----
old_code,old_name,new_code,new_name,mapping_status,note
134,العملاء,1210,ذمم تجارية - العملاء,matched,مطابقة مباشرة
41,ايرادات العمليات,4110,إيرادات العقود الإنشائية الأساسية,changed,تفصيل أدق لإيراد المقاولات
31,التكاليف,5100,تكاليف تنفيذ مباشرة,matched,مطابقة مباشرة
2352,ضرائب الخصم,2430,ضرائب استقطاع عند المنبع مستحقة,added,إضافة حساب للاستقطاع
13111,تامينات العملاء,1220,مستحقات محتجزة من العقود,matched,تطابق وظيفة الاحتجازات لدى العملاء
2351,ضرائب العملاء,2410,ضريبة القيمة المضافة على المخرجات,matched,مطابقة لطبيعة الضريبة بالمخرجات
221,عملاء دفعات مقدمة,2230,دفعات مقدمة من العملاء / التزامات تعاقدية,added,إضافة التزام تعاقدي (Overbilling)
132,البنوك,1120,البنوك,matched,مطابقة مباشرة
233,العملاء تشوينات,1340,مواد لدى مواقع العملاء (تشوينات),added,إضافة فصل للمخزون بالمواقع
1352,السلفيات,1280,سلف موظفين,added,فصل سلف الموظفين عن سلف الموردين
211,راس المال,3100,رأس المال والاحتياطيات,matched,مطابقة مجموعة حقوق الملكية
135161,مساهمو الشركة,3350,حسابات جارية مساهمين,matched,مطابقة مباشرة
57,الدائنون,2140,دائنون متنوعون,added,فصل الدائنين المتنوعين عن الاحتجازات
131,الخزينة,1110,الخزينة,matched,مطابقة مباشرة
234,الموردين,2110,ذمم تجارية - موردي المواد,matched,مطابقة مباشرة
232,المقاولون,2120,حساب مستحقات مقاولي الباطن,matched,مطابقة مباشرة
58,مصروفات بنكيه,5260,مصروفات وعمولات بنكية,added,إضافة مصروفات بنكية ضمن التشغيل
116,الاثاث والمهمات,1410,الأثاث والتجهيزات,added,تفصيل الأصول الثابتة
1354,المدينون والدائنون,1270/2140,مدينون متنوعون / دائنون متنوعون,split,فصل حسب طبيعة الرصيد
13116,اعمال تحت التنفيذ,1600,أعمال تحت التنفيذ,matched,مطابقة مباشرة
115,الحاسب الالى,1430,أجهزة الحاسب,added,تفصيل الأصول الثابتة
114,الالات والمعدات,1420,الآلات والمعدات,added,تفصيل الأصول الثابتة
----- END CSV -----

Conversion (CSV→XLSX):

- Use Python to read data/coa_crosswalk.csv and write data/coa_crosswalk.xlsx (same columns, first row as headers).
- Print row count and a preview (first 5 rows) after conversion.

Validation:

- If docs/chart_of_accounts.md existed, print a short unified diff.
- Open docs/chart_of_accounts.md in Markdown viewer (split pane).
- Print counts: total COA rows (excluding header) and total crosswalk rows.

— END WARP PROMPT —
[^10][^11]

## ملاحظات تنفيذية

- أُدرجت الحسابات المتخصصة للمقاولات (مثل الأصول التعاقدية 1240، الاحتجازات لدى العملاء 1220، الاحتجازات الدائنة 2130، ودفعات العملاء المقدّمة 2230) لضمان اتساق القياس والعرض مع منهجية الاعتراف بالإيراد بالعقود الطويلة وفق IFRS 15، إضافةً لحسابات الضرائب بما في ذلك المدخلات القابلة للاسترداد والاستقطاع عند المنبع.[^12][^13]
- صيغت الجداول لتتوافق مع حقول نظام الاستيراد العربي لديك: الكود، الاسم، المستوى، الحالة، به معاملات، صافي، مع ضبط جميع الحسابات الجديدة على نشطة وبدون معاملات وصافي 0 كبداية، ويمكن تغيير الحالة قبل الاستيراد إن لزم حسب سياسة النشر المرحلي للحسابات الجديدة.[^14][^15]
- يتضمن ملف Excel خريطة التحويل الكاملة وفق أفضل ممارسات “Crosswalk” لتوثيق حالة الربط لكل بند (مطابق/مضاف/مجزأ)، ما يسهل القيود التحويلية والمراجعة اللاحقة، ويُنصح بالاحتفاظ به في مستودع الإعدادات كمرجع تدقيقي.[^15][^14]
<span style="display:none">[^1][^2][^3][^4][^5][^6][^7][^8][^9]</span>

<div style="text-align: center">⁂</div>

[^1]: https://www.daftra.com/templates/نموذج-شجرة-الحسابات

[^2]: https://acc-arab.com/2024/11/chart-of-accounts.html

[^3]: https://www.th3accountant.com/2023/02/chart-accounts.html

[^4]: https://www.daftra.com/templates/نموذج-دليل-الحسابات

[^5]: https://acc-arab.com/2022/06/accounts-tree-acontracting.html

[^6]: https://clickup.com/ar/blog/229022/excel-timeline-templates

[^7]: https://getvom.com/حمله-الآن-دليل-حسابات-لشركة-مقاولات-excel/

[^8]: https://www.smartsheet.com/free-sales-plan-templates-excel-and-word

[^9]: https://zadaacc.com/شجرة-الحسابات-دليل-محاسبي/

[^10]: https://docs.warp.dev/agents/using-agents

[^11]: https://docs.warp.dev/terminal/more-features/markdown-viewer

[^12]: https://www.accaglobal.com/middle-east/en/student/exam-support-resources/fundamentals-exams-study-resources/f7/technical-articles/assets-liabilities.html

[^13]: https://www.revenuehub.org/article/presentation-and-disclosure-of-retainage-for-construction-contractors

[^14]: https://www.brex.com/spend-trends/cash-flow-management/chart-of-accounts

[^15]: https://fiscal.gmu.edu/wp-content/uploads/Crosswalk-Tool-Quick-Guide.pdf

