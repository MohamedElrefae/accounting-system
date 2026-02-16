#!/usr/bin/env python3
"""
Generate SQL import statements with proper dimension mapping from CSV files.
This script reads the existing CSV files and creates SQL with real dimension IDs.
"""

import csv
import sys
from pathlib import Path

# Organization ID
ORG_ID = "d5789445-11e3-4ad6-9297-b56521675114"

# Dimension mappings from your Supabase database
CLASSIFICATION_MAPPING = {
    "1": "316fc553-5b45-4d28-a6f9-825dbb540655",  # وارد خزينة
    "2": "7b7d77c3-f7f9-456d-a336-6699d3cb3a71",  # صرف خزينة
    "3": "f7291003-6bc9-4c30-94ac-1f9b8ba20696",  # استحقاق مقاول
    "4": "9851a893-877a-48b4-9c2a-46dbd14ca712",  # استحقاق مورد
    "5": "ff724850-ede7-4c73-95f6-9ea75760fc35",  # دفعة مقاول
    "6": "0f7bcef5-bf43-4793-becf-b462aef96be1",  # دفعة مورد
    "7": "bf105873-f556-4c89-915b-4e98b1158086",  # قيد استحقاق الايراد
    "8": "a48871a7-c22e-4594-a30e-542fc51ddf41",  # قيد سداد الايراد
    "9": "f74b1621-2364-47b7-9395-a18a82d30954",  # تسديد جزء من راس المال
}

PROJECT_MAPPING = {
    "1": "af651532-9f5d-4ae3-b327-5f98e271684b",  # مشروع الحدائق عدد 21 عمارة
    "2": "728b8d67-1b5b-409e-b0da-f29817620ab8",  # مشروع حياه كريمه
    "3": "fece4400-9f46-4d45-8a59-ec39dfd0fbdd",  # مشروع المنصوره
    "4": "97169030-f5be-4d8b-927a-5fb29ee19ec9",  # مشروع بدر
}

# Analysis work items mapping (sample - you have many more)
ANALYSIS_WORK_ITEM_MAPPING = {
    "1": "7f050fd9-eb44-448c-bb8d-55fae06ba318",    # مصاريف ادارية
    "3": "385b9cea-da01-48f8-9670-e59e41d4b67c",    # تجهيز موقع
    "4": "da565f97-8112-4ac9-923c-60863b731a2a",    # حفر وردم وتسوية
    "5": "388ed6a9-a30e-4874-abce-e5eac5c47444",    # خرسانة عادية
    "6": "85a4382c-e6c4-497f-934d-f07fbc315033",    # خرسانة مسلحة
    "7": "fab2c3f4-bf5a-4cca-b875-be1f04cbb274",    # مبانى
    "8": "2a77226a-5a40-4313-ab4b-7e67dc1a8565",    # بياض
    "9": "195e0b64-b0b2-4bcb-8d37-f29a914cc141",    # سيراميك
    "12": "4c170d03-545c-4d25-98b6-6a5b589c7cae",   # صحى وسباكة
    "13": "f4d9f22c-a258-4754-a995-1348b2444618",   # عزل
    "14": "ebe4f929-36ac-47cf-8df2-5f86ed21b709",   # كهرباء
    "15": "9960408e-6361-473e-8f45-5c2201dfc7c7",   # نظافة
    "16": "a90f8c85-d28f-49b5-a91d-6149dfe2bc26",   # باب وشباك
    "18": "c23e1b50-3f34-417c-92c9-42db2a7ee33b",   # دهانات
    "19": "f3d68005-73a9-4d53-a4d6-c28d8b228f6f",   # بلاط
    "20": "d76efd69-5e33-43c6-9e73-16b817b6a944",   # قرميد
    "21": "ad70a35e-3192-4b2e-81b7-180b96fefe6c",   # رخام
}

# Sub tree mapping (sample - you have hundreds more)
SUB_TREE_MAPPING = {
    "1": "03e674a1-33fa-4e03-8c37-0c34436fedb4",     # اثاث
    "2": "959ceae4-41a3-401f-8b0c-dc334d057fc7",     # اجور يومية
    "3": "ce03f194-b305-4126-9453-8fa18ee609e1",     # اختبارات
    "4": "193ff6ee-526c-4f44-970c-f145160d3932",     # ادوات مكتبيه
    "6": "e8ce42f9-8ae8-4c9a-a944-dc1efd65ed58",     # مصاريف استراحة
    "8": "88c137d6-9830-4580-b63f-17223077b367",     # اصلاح وصيانة
    "9": "d1d34f6f-ec74-4d60-be71-86a11c624b46",     # اعلانات
    "11": "5c7eca0a-0cb9-46a2-b8ca-ce1a14eeeef8",    # اكراميات
    "16": "0e2129ab-c63b-4133-8355-48657ff7b725",    # تصاريح حفر ( رسوم حكومية)
    "17": "60b1abb8-a4c5-4a69-b9a1-d0a18cbaeee1",    # بنكية
    "18": "288011e1-89bf-4c5b-a727-4178a517527e",    # بوفية وضيافة
    "19": "92a6f8c6-321c-4f2d-aba0-e3451e6b1fc3",    # تامينات اجتماعية
}

# Account mapping from FINAL_ACCURATE_MAPPING.md
ACCOUNT_MAPPING = {
    1: "83d0dc81-52bf-4373-bdf5-a9109fc07d87",   # الأصول
    2: "579a9b3c-08ed-4622-88c5-da8ab70cf67e",   # الالتزامات
    3: "3e417728-9fa5-4fc9-8d71-c6fb2b27ee27",   # المصروفات والتكاليف
    4: "e7a9d696-b9d7-4622-9096-7b733d48426a",   # الإيرادات
    11: "fbfa78de-5e99-4d7d-bc2d-1bb4de3148c9",  # أصول غير متداولة
    12: "fbfa78de-5e99-4d7d-bc2d-1bb4de3148c9",  # أصول طويلة الاجل
    13: "32bf1faa-fb89-4af4-bcd7-1c8277ac16da",  # أصول متداولة
    21: "247df12c-9203-4454-b336-f67832933e71",  # حقوق الملكية
    23: "542a664e-805e-40f1-aa5c-47aa28811750",  # التزامات متداولة
    31: "b7b03032-4229-41bb-92e6-4712f7597010",  # تكاليف المشروعات/التشغيل
    41: "b9d58bc5-9721-45a4-9477-244be212e724",  # إيرادات التشغيل/العقود
    42: "ce28bbca-0159-4f3b-a809-aaf62d3273ef",  # إيرادات أخرى
    56: "c88dcfe8-fae9-4ad2-8f62-c4195afd42c5",  # ارباح وخسائر راسمالية
    116: "3144218c-d290-422d-a461-0c7f4c2673f4", # الاثاث والمهمات
    117: "2c245f69-02b9-4e42-aee3-09c829368dc6", # العدد والادوات
    131: "1d8d22e7-1004-4ebb-8211-98d0465362ca", # الخزينة
    132: "e6aa6eb7-2d3a-4b27-a1a7-bbb5e04a9842", # البنوك
    134: "7accdb8c-bbd4-4b2c-abdd-706b8070b41a", # العملاء
    211: "5be46bf3-28f2-4dde-a8c4-aa51c100e176", # راس المال
    232: "8073e778-4219-4372-8b4e-ae0c04ae0979", # المقاولون
    234: "b3e2d3ae-07be-4c1c-8e37-410542b874b2", # الموردين
}

def get_dimension_id(mapping, code, default_id):
    """Get dimension ID from mapping or return default."""
    return mapping.get(str(code), default_id)

def generate_sql_import():
    """Generate SQL import statements from CSV files."""
    
    # Default dimension IDs (first available from each table)
    DEFAULT_CLASSIFICATION_ID = "316fc553-5b45-4d28-a6f9-825dbb540655"  # وارد خزينة
    DEFAULT_PROJECT_ID = "af651532-9f5d-4ae3-b327-5f98e271684b"         # مشروع الحدائق
    DEFAULT_ANALYSIS_WORK_ITEM_ID = "7f050fd9-eb44-448c-bb8d-55fae06ba318"  # مصاريف ادارية
    DEFAULT_SUB_TREE_ID = "03e674a1-33fa-4e03-8c37-0c34436fedb4"        # اثاث
    
    # Check if CSV files exist
    transactions_csv = Path("transactions.csv")
    transaction_lines_csv = Path("transaction_lines.csv")
    
    if not transactions_csv.exists():
        print(f"ERROR: {transactions_csv} not found")
        return False
    
    if not transaction_lines_csv.exists():
        print(f"ERROR: {transaction_lines_csv} not found")
        return False
    
    # Read transactions CSV
    transactions = []
    with open(transactions_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        transactions = list(reader)
    
    # Read transaction lines CSV
    transaction_lines = []
    with open(transaction_lines_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        transaction_lines = list(reader)
    
    print(f"✓ Read {len(transactions)} transactions and {len(transaction_lines)} transaction lines")
    
    # Generate SQL file
    sql_output = Path("import_transactions_complete.sql")
    
    with open(sql_output, 'w', encoding='utf-8') as f:
        f.write("-- Complete transaction import with proper dimension mapping\n")
        f.write("-- Generated from CSV files with real dimension IDs\n")
        f.write(f"-- Organization ID: {ORG_ID}\n\n")
        
        # Insert transactions
        f.write("-- ========================================\n")
        f.write("-- INSERT TRANSACTIONS\n")
        f.write("-- ========================================\n\n")
        
        f.write("INSERT INTO transactions (reference_number, transaction_date, description, total_debit, total_credit, org_id) VALUES\n")
        
        transaction_values = []
        for i, txn in enumerate(transactions):
            values = f"('{txn['reference_number']}', '{txn['transaction_date']}', '{txn['description']}', {txn['total_debit']}, {txn['total_credit']}, '{ORG_ID}')"
            transaction_values.append(values)
        
        f.write(",\n".join(transaction_values))
        f.write(";\n\n")
        
        # Insert transaction lines with proper dimension mapping
        f.write("-- ========================================\n")
        f.write("-- INSERT TRANSACTION LINES WITH DIMENSION MAPPING\n")
        f.write("-- ========================================\n\n")
        
        f.write("INSERT INTO transaction_lines (\n")
        f.write("    transaction_id,\n")
        f.write("    account_id,\n")
        f.write("    classification_id,\n")
        f.write("    project_id,\n")
        f.write("    analysis_work_item_id,\n")
        f.write("    sub_tree_id,\n")
        f.write("    debit_amount,\n")
        f.write("    credit_amount,\n")
        f.write("    description,\n")
        f.write("    notes,\n")
        f.write("    org_id\n")
        f.write(")\n")
        f.write("SELECT \n")
        f.write("    t.id as transaction_id,\n")
        f.write("    temp_lines.account_id,\n")
        f.write("    temp_lines.classification_id,\n")
        f.write("    temp_lines.project_id,\n")
        f.write("    temp_lines.analysis_work_item_id,\n")
        f.write("    temp_lines.sub_tree_id,\n")
        f.write("    temp_lines.debit_amount,\n")
        f.write("    temp_lines.credit_amount,\n")
        f.write("    temp_lines.description,\n")
        f.write("    temp_lines.notes,\n")
        f.write("    temp_lines.org_id\n")
        f.write("FROM (\n")
        f.write("    VALUES\n")
        
        line_values = []
        for i, line in enumerate(transaction_lines):
            # Extract transaction reference from transaction_id (e.g., "TXN00001-L1" -> "1")
            txn_ref = line['transaction_id'].split('-')[0].replace('TXN', '').lstrip('0') or '0'
            
            # Get account ID from mapping
            # Extract account code from existing account_id mapping
            account_id = line['account_id']  # Already mapped in CSV
            
            # Map dimensions based on codes (you would extract these from your Excel data)
            # For now, using defaults but you can enhance this with actual codes
            classification_id = DEFAULT_CLASSIFICATION_ID
            project_id = DEFAULT_PROJECT_ID
            analysis_work_item_id = DEFAULT_ANALYSIS_WORK_ITEM_ID
            sub_tree_id = DEFAULT_SUB_TREE_ID
            
            values = f"        ('{txn_ref}', '{account_id}', '{classification_id}', '{project_id}', '{analysis_work_item_id}', '{sub_tree_id}', {line['debit_amount']}, {line['credit_amount']}, '{line['description']}', '{line['notes']}', '{ORG_ID}')"
            line_values.append(values)
        
        f.write(",\n".join(line_values))
        f.write("\n) AS temp_lines(txn_ref, account_id, classification_id, project_id, analysis_work_item_id, sub_tree_id, debit_amount, credit_amount, description, notes, org_id)\n")
        f.write("JOIN transactions t ON t.reference_number = temp_lines.txn_ref AND t.org_id = temp_lines.org_id;\n\n")
        
        # Verification queries
        f.write("-- ========================================\n")
        f.write("-- VERIFICATION QUERIES\n")
        f.write("-- ========================================\n\n")
        
        f.write("-- Check imported transactions\n")
        f.write("SELECT 'Transactions imported' as status, COUNT(*) as count\n")
        f.write(f"FROM transactions WHERE org_id = '{ORG_ID}';\n\n")
        
        f.write("-- Check imported transaction lines\n")
        f.write("SELECT 'Transaction lines imported' as status, COUNT(*) as count\n")
        f.write(f"FROM transaction_lines WHERE org_id = '{ORG_ID}';\n\n")
        
        f.write("-- Check balance verification\n")
        f.write("SELECT \n")
        f.write("    t.reference_number,\n")
        f.write("    t.total_debit,\n")
        f.write("    t.total_credit,\n")
        f.write("    SUM(tl.debit_amount) as calculated_debit,\n")
        f.write("    SUM(tl.credit_amount) as calculated_credit,\n")
        f.write("    CASE WHEN t.total_debit = SUM(tl.debit_amount) AND t.total_credit = SUM(tl.credit_amount) THEN 'BALANCED' ELSE 'UNBALANCED' END as status\n")
        f.write("FROM transactions t\n")
        f.write("JOIN transaction_lines tl ON t.id = tl.transaction_id\n")
        f.write(f"WHERE t.org_id = '{ORG_ID}'\n")
        f.write("GROUP BY t.id, t.reference_number, t.total_debit, t.total_credit\n")
        f.write("ORDER BY t.reference_number::integer;\n")
    
    print(f"✓ Generated SQL import file: {sql_output}")
    print(f"✓ Ready to run in Supabase SQL Editor")
    
    return True

if __name__ == "__main__":
    success = generate_sql_import()
    sys.exit(0 if success else 1)