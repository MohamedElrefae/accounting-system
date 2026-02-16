import csv
import io

data = """code,parent_code,name,name_ar,category,allow_transactions,is_postable,is_standard,legacy_code,legacy_name,level_hint
1000,,1000,الأصول,asset,False,False,False,,,1
1000,,1000,الأصول,asset,False,False,False,1,الاصول,1
2000,,2000,الالتزامات,liability,False,False,False,,,1
2000,,2000,الالتزامات,liability,False,False,False,2,الخصوم,1
3000,,3000,حقوق الملكية,equity,False,False,False,,,1
3000,,3000,حقوق الملكية,equity,False,False,False,21,حقوق الملكية,1
4000,,4000,الإيرادات,revenue,False,False,False,,,1
4000,,4000,الإيرادات,revenue,False,False,False,4,الايرادات .,1
5000,,5000,المصروفات والتكاليف,expense,False,False,False,,,1
5000,,5000,المصروفات والتكاليف,expense,False,False,False,3,المصروفات,1
1100,1000,1100,أصول غير متداولة,asset,False,False,False,,,2
1100,1000,1100,أصول غير متداولة,asset,False,False,False,12,الاصول طويلة الاجل,2
1200,1000,1200,أصول متداولة,asset,False,False,False,,,2
1200,1000,1200,أصول متداولة,asset,False,False,False,13,الاصول المتداولة,2
2200,2000,2200,التزامات متداولة,liability,False,False,False,,,2
2200,2000,2200,التزامات متداولة,liability,False,False,False,23,الالتزامات المتداولة,2
3100,3000,3100,رأس المال,equity,True,True,False,,,2
4100,4000,4100,إيرادات التشغيل/العقود,revenue,True,True,False,,,2
4100,4000,4100,إيرادات التشغيل/العقود,revenue,True,True,False,41,ايرادات العمليات,2
4200,4000,4200,إيرادات أخرى,revenue,True,True,False,,,2
4200,4000,4200,إيرادات أخرى,revenue,True,True,False,42,ايرادات متنوعة,2
5100,5000,5100,تكاليف المشروعات/التشغيل,expense,True,True,False,,,2
5100,5000,5100,تكاليف المشروعات/التشغيل,expense,True,True,False,31,التكاليف .,2
1110,1100,1110,أصول ثابتة (PPE),asset,False,False,False,,,3
1110,1100,1110,أصول ثابتة (PPE),asset,False,False,False,11,الاصول الثابتة .,3
1210,1200,1210,نقدية وبنوك وودائع,asset,False,False,False,,,3
1220,1200,1220,عملاء وأوراق قبض,asset,False,False,False,,,3
1230,1200,1230,ذمم مدينة أخرى/سلف/مقدمات,asset,False,False,False,,,3
2210,2200,2210,موردون/مقاولون/أوراق دفع,liability,False,False,False,,,3
2220,2200,2220,دفعات مقدمة واحتجازات العملاء (Retention),liability,False,False,False,,,3
2230,2200,2230,ضرائب مستحقة,liability,False,False,False,,,3
2270,2200,2270,تأمينات للغير/أمانات,liability,False,False,False,,,3
4210,4200,4210,أرباح/خسائر رأسمالية,revenue,True,True,False,,,3
31001,3100,31001,راس المال .,equity,True,True,False,211,راس المال .,3
11105,1110,11105,الحاسب الالى,asset,True,True,False,115,الحاسب الالى,4
11106,1110,11106,الاثاث والمهمات,asset,True,True,False,116,الاثاث والمهمات,4
11107,1110,11107,العدد والادوات,asset,True,True,False,117,العدد والادوات,4
12101,1210,12101,الخزينة .,asset,True,True,False,131,الخزينة .,4
12103,1210,12103,البنوك .,asset,True,True,False,132,البنوك .,4
12113,1210,12113,تامينات العملاء,asset,True,True,False,13111,تامينات العملاء,4
12123,1210,12123,تامينات لدى الغير .,asset,True,True,False,131313,تامينات لدى الغير .,4
12201,1220,12201,العملاء .,asset,True,True,False,134,العملاء .,4
12304,1230,12304,السلفيات,asset,True,True,False,1352,السلفيات,4
12307,1230,12307,المدينون والدائنون,asset,True,True,False,1354,المدينون والدائنون,4
22103,2210,22103,المقاولون .,liability,True,True,False,232,المقاولون .,4
22104,2210,22104,الموردين .,liability,True,True,False,234,الموردين .,4
22201,2220,22201,عملاء دفعات مقدمة .,liability,True,True,False,221,عملاء دفعات مقدمة .,4
22202,2220,22202,العملاء تشوينات .,liability,True,True,False,233,العملاء تشوينات .,4
22303,2230,22303,ضرائب الخصم,liability,True,True,False,2352,ضرائب الخصم,4
22306,2230,22306,ضرائب القيمة المضافة,liability,True,True,False,2356,ضرائب القيمة المضافة,4
22701,2270,22701,تامينات للغير .,liability,True,True,False,236,تامينات للغير .,4
42101,4210,42101,ارباح وخسائر راسمالية.,revenue,True,True,False,56,ارباح وخسائر راسمالية.,4"""

reader = csv.DictReader(io.StringIO(data))
unique_accounts = {}

# Process rows to prefer legacy info
for row in reader:
    code = row['code']
    if code in unique_accounts:
        # If current has legacy info, replace existing if existing doesn't
        if row['legacy_code'] and not unique_accounts[code]['legacy_code']:
            unique_accounts[code] = row
    else:
        unique_accounts[code] = row

ORG_ID = 'd5789445-11e3-4ad6-9297-b56521675114'

values = []
parent_updates = []

for code, row in unique_accounts.items():
    name = row['name'].replace("'", "''") 
    name_ar = row['name_ar'].replace("'", "''")
    category = row['category']
    allow_tx = 'true' if row['allow_transactions'] == 'True' else 'false'
    is_postable = 'true' if row['is_postable'] == 'True' else 'false'
    is_standard = 'true' if row['is_standard'] == 'True' else 'false'
    
    # Handle optional legacy fields
    legacy_code_val = f"'{row['legacy_code']}'" if row.get('legacy_code') else 'NULL'
    legacy_name_val = f"'{row['legacy_name'].replace("'", "''")}'" if row.get('legacy_name') else 'NULL'
    
    values.append(f"('{ORG_ID}', '{code}', '{name}', '{name_ar}', '{category}', {allow_tx}, {is_postable}, {is_standard}, {legacy_code_val}, {legacy_name_val})")
    
    if row.get('parent_code'):
        parent_updates.append((code, row['parent_code']))

# Construct SQL
with open('accounts.sql', 'w', encoding='utf-8') as f:
    f.write("BEGIN;\n")
    f.write(f"INSERT INTO accounts (org_id, code, name, name_ar, category, allow_transactions, is_postable, is_standard, legacy_code, legacy_name) VALUES\n")
    f.write(",\n".join(values) + ";\n")

    # Parent updates
    for code, parent_code in parent_updates:
        f.write(f"UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE org_id = '{ORG_ID}' AND code = '{parent_code}') WHERE org_id = '{ORG_ID}' AND code = '{code}';\n")

    f.write("COMMIT;\n")
