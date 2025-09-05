<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# <q>الشجرة مبنية على أفضل ممارسات ترقيم 1000/2000 وعلى احتياجات المقاولات (WIP، Retainage، أصول/التزامات تعاقدية IFRS 15) بما يسهل التقارير والفهرسة مع نمو الحسابات.</q> tree of account in my app and entire app use ar/en language  so modify your md file has two columns name Arabic  name English instead

جاهز أدناه أمر واحد لعميل Warp Agent يستبدل الملف بجدول Markdown ثنائي الأعمدة يحوي شجرة الحسابات (أربع مستويات بنمط 1000/2000) بأسماء عربية/إنجليزية فقط كما طُلب، مع نسخة احتياطية تلقائيًا قبل الاستبدال. الشجرة تراعي خصوصيات المقاولات مثل أعمال تحت التنفيذ، الأصول/الالتزامات التعاقدية IFRS 15، واحتجازات الدفعات Retainage ضمن بنية ترقيم عملية في قطاع البناء.[^1][^2][^3][^4]

## Warp prompt

انسخ المقطع التالي كاملًا إلى وكيل Warp لتنفيذ إنشاء/استبدال الملف docs/chart_of_accounts.md بترميز UTF-8 وجدولة عمودين (العربية | English) دون أبعاد تحليلية، مع فتحه في عارض Markdown بعد الحفظ [^1][^2].

— BEGIN WARP PROMPT —
Task: Replace the current Chart of Accounts with a bilingual (Arabic/English) 4-level 1000/2000 construction-ready tree in a single Markdown file, using exactly two columns: Arabic name and English name.

Requirements:

- Create or overwrite file at: docs/chart_of_accounts.md
- If file exists, back it up as: docs/chart_of_accounts.backup.md
- Use UTF-8 encoding, Unix LF line endings, no trailing spaces
- The table must have exactly two columns with headers: العربية | English
- Include codes inside each cell alongside the account name (e.g., “1000 الأصول” | “1000 Assets”)
- No analytic/dimension accounts; all detail is within the 4-digit code levels
- After writing the file, open it in Warp’s Markdown viewer

File content to write (include only the text between the dashed markers):

----- START FILE CONTENT -----

# دليل الحسابات (مقاولات، 4 مستويات، 1000/2000) — ثنائي اللغة

| العربية | English |
| :-- | :-- |
| 1000 الأصول | 1000 Assets |
| 1100 النقدية وما في حكمها | 1100 Cash and Cash Equivalents |
| 1110 الخزينة | 1110 Cash on Hand |
| 1111 الخزينة الرئيسية | 1111 Main Cash |
| 1112 عهدة صندوق صغير | 1112 Petty Cash |
| 1120 البنوك | 1120 Banks |
| 1121 بنك أ - جاري | 1121 Bank A - Current |
| 1122 بنك ب - جاري | 1122 Bank B - Current |
| 1130 نقدية مقيدة / هوامش ضمان | 1130 Restricted Cash / Guarantee Margins |
| 1131 هامش خطاب ضمان ابتدائي/أداء | 1131 Bid/Performance Guarantee Margin |
| 1200 الذمم والأصول المتداولة الأخرى | 1200 Receivables and Other Current Assets |
| 1210 العملاء التجاريون | 1210 Trade Receivables (Customers) |
| 1211 عملاء محليون | 1211 Domestic Customers |
| 1212 عملاء خارجيون | 1212 Foreign Customers |
| 1220 أوراق قبض | 1220 Notes Receivable |
| 1221 شيكات تحت التحصيل | 1221 Checks Under Collection |
| 1230 احتجازات مستحقة لدى العملاء | 1230 Retentions Receivable (From Customers) |
| 1231 احتجازات قيد الإفراج النهائي | 1231 Retentions Pending Final Acceptance |
| 1240 أصول تعاقدية – إيراد غير مفوتر | 1240 Contract Assets – Unbilled Revenue (Underbilling) |
| 1241 إيراد معترف غير مفوتر | 1241 Recognized Revenue Not Yet Invoiced |
| 1245 ضريبة مدخلات قابلة للاسترداد | 1245 Input VAT Recoverable |
| 1246 ضرائب أخرى قابلة للاسترداد | 1246 Other Recoverable Taxes |
| 1280 سلف موظفين | 1280 Employee Advances |
| 1281 عهد مواقع/سلف مواقع | 1281 Site Advances / Custodies |
| 1300 المخزون والمواد | 1300 Inventory and Materials |
| 1310 مواد ومهمات المواقع | 1310 Site Materials and Supplies |
| 1311 خرسانة | 1311 Ready-Mix Concrete |
| 1312 حديد تسليح | 1312 Rebar Steel |
| 1330 مواد لدى مواقع العملاء (تشوينات) | 1330 Materials at Client Sites (Laydown/Stockpiles) |
| 1331 مشروع أ – تشوينات | 1331 Project A – Laydown |
| 1400 الممتلكات والآلات والمعدات | 1400 Property, Plant and Equipment |
| 1410 أثاث وتجهيزات | 1410 Furniture and Fixtures |
| 1411 أثاث مكاتب | 1411 Office Furniture |
| 1420 آلات ومعدات | 1420 Plant and Machinery |
| 1421 حفارات | 1421 Excavators |
| 1422 رافعات | 1422 Cranes |
| 1430 أجهزة الحاسب | 1430 IT Equipment |
| 1431 خوادم وشبكات | 1431 Servers and Network |
| 1490 مجمعات الإهلاك | 1490 Accumulated Depreciation |
| 1491 مجمع إهلاك – معدات | 1491 Acc. Depreciation – Machinery |
| 1600 أعمال تحت التنفيذ | 1600 Work in Progress (WIP) |
| 1601 أعمال تحت التنفيذ – مشروع أ | 1601 WIP – Project A |
| 1602 أعمال تحت التنفيذ – مشروع ب | 1602 WIP – Project B |
| 2000 الخصوم | 2000 Liabilities |
| 2100 الدائنون التجاريون ومقاولو الباطن | 2100 Trade Payables and Subcontractors |
| 2110 الموردون | 2110 Suppliers |
| 2111 موردو مواد | 2111 Material Suppliers |
| 2112 موردو خدمات | 2112 Service Suppliers |
| 2120 مقاولو باطن | 2120 Subcontractors |
| 2121 مقاول أ | 2121 Subcontractor A |
| 2130 دائنون متنوعون | 2130 Other Payables |
| 2131 رسوم ومصاريف مستحقة | 2131 Accrued Fees and Charges |
| 2140 احتجازات مستحقة للموردين/المقاولين | 2140 Retentions Payable (To Suppliers/Subcontractors) |
| 2141 احتجازات قيد الإفراج | 2141 Retentions Pending Release |
| 2200 التزامات قصيرة الأجل | 2200 Short-Term Liabilities |
| 2210 مصروفات مستحقة | 2210 Accrued Expenses |
| 2211 رواتب ومزايا مستحقة | 2211 Accrued Payroll and Benefits |
| 2220 دفعات مقدمة من العملاء / التزامات تعاقدية (فوترة زائدة) | 2220 Customer Advances / Contract Liabilities (Overbilling) |
| 2221 دفعة مقدمة – مشروع أ | 2221 Advance – Project A |
| 2400 ضرائب ورسوم | 2400 Taxes and Duties |
| 2430 ضريبة القيمة المضافة | 2430 VAT Taxes |
| 2431 ضريبة مخرجات مستحقة | 2431 Output VAT Payable |
| 2432 ضرائب استقطاع مستحقة | 2432 Withholding Taxes Payable |
| 2433 رسوم حكومية أخرى | 2433 Other Government Fees |
| 2600 قروض وتمويل | 2600 Loans and Borrowings |
| 2610 قروض قصيرة الأجل | 2610 Short-Term Loans |
| 2611 القسط المستحق من قروض طويلة الأجل | 2611 Current Maturity of LT Loans |
| 2620 قروض طويلة الأجل | 2620 Long-Term Loans |
| 2621 قرض بنكي – طويل الأجل | 2621 Bank Loan – Long Term |
| 3000 حقوق الملكية | 3000 Equity |
| 3100 رأس المال والاحتياطيات | 3100 Capital and Reserves |
| 3110 رأس المال المدفوع | 3110 Paid-in Capital |
| 3111 رأس مال – مساهم أ | 3111 Capital – Shareholder A |
| 3120 علاوة إصدار / احتياطيات نظامية | 3120 Share Premium / Legal Reserves |
| 3121 احتياطي نظامي | 3121 Legal Reserve |
| 3300 الأرباح المحتجزة والنتائج | 3300 Retained Earnings and Results |
| 3310 أرباح/خسائر مرحّلة | 3310 Retained Earnings / Losses |
| 3311 نتائج سنوات سابقة | 3311 Prior Years’ Results |
| 3320 أرباح الفترة | 3320 Current Period Profit |
| 3321 أرباح قبل التوزيع | 3321 Profit Before Distribution |
| 3350 حسابات جارية مساهمين | 3350 Shareholders’ Current Accounts |
| 3351 جاري مساهم أ | 3351 Current Account – Shareholder A |
| 3352 جاري مساهم ب | 3352 Current Account – Shareholder B |
| 4000 الإيرادات | 4000 Revenue |
| 4100 إيرادات عقود المقاولات | 4100 Construction Contract Revenue |
| 4110 إيرادات تقدم الأعمال | 4110 Progress Billings Revenue |
| 4111 إيرادات – مشروع أ | 4111 Revenue – Project A |
| 4120 أوامر تغيير | 4120 Variation Orders (Change Orders) |
| 4121 أوامر تغيير – مشروع أ | 4121 Variation Orders – Project A |
| 4130 مطالبات وتعويضات | 4130 Claims and Compensations |
| 4131 مطالبات – مشروع أ | 4131 Claims – Project A |
| 4200 إيرادات أخرى | 4200 Other Revenue |
| 4210 إيراد تأجير معدات | 4210 Equipment Rental Income |
| 4211 تأجير لمشاريع خارجية | 4211 External Project Rentals |
| 4220 خدمات صيانة وضمان | 4220 Maintenance and Warranty Services |
| 4221 عقود صيانة سنوية | 4221 Annual Maintenance Contracts |
| 4300 إيرادات عكسية (خصومات/مردودات) | 4300 Contra Revenue (Discounts/Returns) |
| 4310 خصومات تعاقدية | 4310 Contractual Discounts |
| 4311 خصومات تقدم | 4311 Progress Discounts |
| 4320 مردودات / تسويات فوترة | 4320 Returns / Billing Adjustments |
| 4321 تسويات قياس | 4321 Measurement Adjustments |
| 5000 التكاليف والمصروفات | 5000 Costs and Expenses |
| 5100 تكاليف تنفيذ مباشرة | 5100 Direct Construction Costs |
| 5110 مواد مواقع | 5110 Site Materials |
| 5111 خرسانة | 5111 Concrete |
| 5112 حديد تسليح | 5112 Rebar |
| 5120 تكاليف مقاولي الباطن | 5120 Subcontracting Costs |
| 5121 مقاول أ | 5121 Subcontractor A |
| 5130 أجور مباشرة مواقع | 5130 Direct Site Labor |
| 5131 عمالة مؤقتة مواقع | 5131 Temporary Site Labor |
| 5140 تشغيل/إيجار معدات | 5140 Equipment Operation / Rental |
| 5141 إيجار معدات ثقيلة | 5141 Heavy Equipment Rentals |
| 5160 تعبئة وتحريك | 5160 Mobilization / Demobilization |
| 5161 نقل معدات للموقع | 5161 Equipment Transport to Site |
| 5170 نقل ولوجستيات مواقع | 5170 Site Logistics and Transportation |
| 5171 شحن داخلي للمشاريع | 5171 Domestic Freight – Projects |
| 5200 مصروفات تشغيل وإدارية | 5200 Operating and Administrative Expenses |
| 5210 إيجار مقرات | 5210 Office Rent |
| 5211 إيجار المكتب الرئيسي | 5211 HQ Office Lease |
| 5220 رواتب إدارية | 5220 Administrative Salaries |
| 5221 إدارة المشاريع والإداريين | 5221 PMO and Admin Staff |
| 5230 خدمات ومرافق | 5230 Utilities and Services |
| 5231 كهرباء ومياه | 5231 Electricity and Water |
| 5240 اتصالات وإنترنت | 5240 Telecom and Internet |
| 5241 اشتراكات إنترنت وهواتف | 5241 Internet and Phone Plans |
| 5250 رسوم مهنية واستشارات | 5250 Professional and Advisory Fees |
| 5251 أتعاب استشاريين ومدققين | 5251 Consultants and Auditors |
| 5260 مصروفات وعمولات بنكية | 5260 Bank Fees and Charges |
| 5261 عمولات تحويل وكشف حساب | 5261 Transfers and Statements Fees |
| 5290 مصروف إهلاك | 5290 Depreciation Expense |
| 5291 إهلاك – معدات | 5291 Depreciation – Machinery |
| 5900 مصروفات أخرى | 5900 Other Expenses |
| 5910 فروقات عملات | 5910 Foreign Exchange Differences |
| 5911 فروقات تقييم بنكية | 5911 Bank Revaluation Differences |
| 5990 مصروفات غير متكررة | 5990 Non-Recurring Expenses |
| 5991 تكاليف إنهاء عقد | 5991 Contract Termination Costs |

----- END FILE CONTENT -----

## Level 4 bilingual quick list (Arabic | English)

| العربية | English |
| :-- | :-- |
| 1111 الخزينة الرئيسية | 1111 Main Cash |
| 1112 عهدة صندوق صغير | 1112 Petty Cash |
| 1121 بنك أ - جاري | 1121 Bank A - Current |
| 1122 بنك ب - جاري | 1122 Bank B - Current |
| 1131 هامش خطاب ضمان ابتدائي/أداء | 1131 Bid/Performance Guarantee Margin |
| 1211 عملاء محليون | 1211 Domestic Customers |
| 1212 عملاء خارجيون | 1212 Foreign Customers |
| 1231 احتجازات قيد الإفراج النهائي | 1231 Retentions Pending Final Acceptance |
| 1241 إيراد معترف غير مفوتر | 1241 Recognized Revenue Not Yet Invoiced |
| 1281 عهد مواقع/سلف مواقع | 1281 Site Advances / Custodies |
| 1311 خرسانة | 1311 Ready-Mix Concrete |
| 1312 حديد تسليح | 1312 Rebar Steel |
| 1331 مشروع أ – تشوينات | 1331 Project A – Laydown |
| 1411 أثاث مكاتب | 1411 Office Furniture |
| 1421 حفارات | 1421 Excavators |
| 1422 رافعات | 1422 Cranes |
| 1431 خوادم وشبكات | 1431 Servers and Network |
| 1491 مجمع إهلاك – معدات | 1491 Acc. Depreciation – Machinery |
| 1601 أعمال تحت التنفيذ – مشروع أ | 1601 WIP – Project A |
| 1602 أعمال تحت التنفيذ – مشروع ب | 1602 WIP – Project B |
| 2111 موردو مواد | 2111 Material Suppliers |
| 2112 موردو خدمات | 2112 Service Suppliers |
| 2121 مقاول أ | 2121 Subcontractor A |
| 2141 احتجازات قيد الإفراج | 2141 Retentions Pending Release |
| 2211 رواتب ومزايا مستحقة | 2211 Accrued Payroll and Benefits |
| 2221 دفعة مقدمة – مشروع أ | 2221 Advance – Project A |
| 2431 ضريبة مخرجات مستحقة | 2431 Output VAT Payable |
| 2432 ضرائب استقطاع مستحقة | 2432 Withholding Taxes Payable |
| 2433 رسوم حكومية أخرى | 2433 Other Government Fees |
| 2611 القسط المستحق من قروض طويلة الأجل | 2611 Current Maturity of LT Loans |
| 2621 قرض بنكي – طويل الأجل | 2621 Bank Loan – Long Term |
| 3111 رأس مال – مساهم أ | 3111 Capital – Shareholder A |
| 3121 احتياطي نظامي | 3121 Legal Reserve |
| 3311 نتائج سنوات سابقة | 3311 Prior Years’ Results |
| 3321 أرباح قبل التوزيع | 3321 Profit Before Distribution |
| 3351 جاري مساهم أ | 3351 Current Account – Shareholder A |
| 3352 جاري مساهم ب | 3352 Current Account – Shareholder B |
| 4111 إيرادات – مشروع أ | 4111 Revenue – Project A |
| 4121 أوامر تغيير – مشروع أ | 4121 Variation Orders – Project A |
| 4131 مطالبات – مشروع أ | 4131 Claims – Project A |
| 4211 تأجير لمشاريع خارجية | 4211 External Project Rentals |
| 4221 عقود صيانة سنوية | 4221 Annual Maintenance Contracts |
| 4311 خصومات تقدم | 4311 Progress Discounts |
| 4321 تسويات قياس | 4321 Measurement Adjustments |
| 5111 خرسانة | 5111 Concrete |
| 5112 حديد تسليح | 5112 Rebar |
| 5121 مقاول أ | 5121 Subcontractor A |
| 5131 عمالة مؤقتة مواقع | 5131 Temporary Site Labor |
| 5141 إيجار معدات ثقيلة | 5141 Heavy Equipment Rentals |
| 5161 نقل معدات للموقع | 5161 Equipment Transport to Site |
| 5171 شحن داخلي للمشاريع | 5171 Domestic Freight – Projects |
| 5211 إيجار المكتب الرئيسي | 5211 HQ Office Lease |
| 5221 إدارة المشاريع والإداريين | 5221 PMO and Admin Staff |
| 5231 كهرباء ومياه | 5231 Electricity and Water |
| 5241 اشتراكات إنترنت وهواتف | 5241 Internet and Phone Plans |
| 5251 أتعاب استشاريين ومدققين | 5251 Consultants and Auditors |
| 5261 عمولات تحويل وكشف حساب | 5261 Transfers and Statements Fees |
| 5291 إهلاك – معدات | 5291 Depreciation – Machinery |
| 5911 فروقات تقييم بنكية | 5911 Bank Revaluation Differences |
| 5991 تكاليف إنهاء عقد | 5991 Contract Termination Costs |

Validation:

- If a previous version existed, print a concise diff to confirm replacement
- Open docs/chart_of_accounts.md in Warp’s Markdown viewer in a split pane

— END WARP PROMPT —
[^2][^1]

## ملاحظات

- اختيار البنود المتخصصة (WIP، Retentions، Contract assets/liabilities) مبني على ممارسات قطاع المقاولات ومتطلبات الاعتراف بالإيراد بموجب IFRS 15، مع ملاءمة البنية إلى بيئة تنفيذ مشاريع طويلة الأجل.[^3][^4]
- يمكن لاحقًا تخصيص أسماء المستوى الرابع للمشاريع/البنوك/الموردين الفعلية مع الحفاظ على نفس ترقيم 1000/2000 لضمان الاتساق داخليًا وخلال التقارير.[^5][^6]

<div style="text-align: center">⁂</div>

[^1]: https://docs.warp.dev/agents/using-agents

[^2]: https://docs.warp.dev/terminal/more-features/markdown-viewer

[^3]: https://www.accaglobal.com/middle-east/en/student/exam-support-resources/fundamentals-exams-study-resources/f7/technical-articles/assets-liabilities.html

[^4]: https://vencru.com/blog/chart-of-accounts-for-a-construction-company-detailed-guide/

[^5]: https://www.jmco.com/articles/construction/chart-of-accounts-simple-overview/

[^6]: https://crewcost.com/blog/how-to-build-a-chart-of-accounts-for-a-construction-company/

