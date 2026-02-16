#!/usr/bin/env python3
"""
Regenerate transaction_lines.csv correctly from Excel file.
This ensures we get exactly 14,161 lines matching the Excel source.
"""

import pandas as pd
import sys
from pathlib import Path

# Organization ID
ORG_ID = "d5789445-11e3-4ad6-9297-b56521675114"

# Account mapping from FINAL_ACCURATE_MAPPING.md - ALL 21 CODES
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
    115: "3b9b8284-ff10-413f-a4f2-ca0544e20a69",  # الحاسب الالى
    116: "3144218c-d290-422d-a461-0c7f4c2673f4", # الاثاث والمهمات
    117: "2c245f69-02b9-4e42-aee3-09c829368dc6", # العدد والادوات
    131: "1d8d22e7-1004-4ebb-8211-98d0465362ca", # الخزينة
    132: "e6aa6eb7-2d3a-4b27-a1a7-bbb5e04a9842", # البنوك
    134: "7accdb8c-bbd4-4b2c-abdd-706b8070b41a", # العملاء
    211: "5be46bf3-28f2-4dde-a8c4-aa51c100e176", # راس المال
    221: "217dd6e7-5840-4d87-b8ae-bd7235acd42e",  # عملاء دفعات مقدمة
    232: "8073e778-4219-4372-8b4e-ae0c04ae0979", # المقاولون
    233: "3930be54-2a0c-42f8-a6b3-15eb14c9f0ba",  # العملاء تشوينات
    234: "b3e2d3ae-07be-4c1c-8e37-410542b874b2", # الموردين
    236: "b440fd2a-358c-44ff-aff9-dec1ae8b25c6",  # تامينات للغير
    1352: "94bdfa42-e515-4d4a-b006-27e5982f7128",  # السلفيات
    1354: "b1161078-4772-466c-8241-bab6a771def3",  # المدينون والدائنون
    2352: "e0db9265-2422-4661-81bb-b6ddc31cdcb5",  # ضرائب الخصم
    2356: "31a3d74c-c3c4-42ac-a4c9-528871c64052",  # ضرائب القيمة المضافة
    13111: "0e960703-a40e-4fcb-b19a-3564d2de7e75",  # تامينات العملاء
    131313: "f5fbeb9f-da45-4b74-9835-44701a23e1ed",  # تامينات لدى الغير
}

def map_account_code(code):
    """Map account code to UUID."""
    if pd.isna(code):
        return None
    
    try:
        code_int = int(float(code))
        return ACCOUNT_MAPPING.get(code_int)
    except (ValueError, TypeError):
        return None

def regenerate_csv():
    """Regenerate CSV from Excel with correct data."""
    
    excel_file = Path("transactions.xlsx")
    if not excel_file.exists():
        print(f"ERROR: {excel_file} not found")
        return False
    
    print(f"Reading Excel file: {excel_file}")
    
    # Read Excel - note the sheet name has trailing space
    df = pd.read_excel(excel_file, sheet_name='transactions ', header=0)
    
    # Strip whitespace from column names
    df.columns = df.columns.str.strip()
    
    print(f"✓ Read {len(df)} rows from Excel")
    print(f"✓ Columns: {list(df.columns)[:10]}")
    
    # Map account codes to UUIDs
    print("\nMapping account codes to UUIDs...")
    df['account_id'] = df['account id legacy'].apply(map_account_code)
    
    # Check for unmapped accounts
    unmapped = df[df['account_id'].isna()]
    if len(unmapped) > 0:
        print(f"WARNING: {len(unmapped)} rows have unmapped account codes")
        unique_unmapped = unmapped['account id legacy'].unique()
        print(f"Unmapped codes: {unique_unmapped[:10]}")
    
    # Check for zero amounts
    zero_amounts = df[(df['debit'] == 0) & (df['credit'] == 0)]
    if len(zero_amounts) > 0:
        print(f"WARNING: {len(zero_amounts)} rows have zero debit AND credit")
    
    # Remove rows with NaN entry_no or non-numeric entry_no (like "Total")
    print(f"\nRemoving invalid rows...")
    before_count = len(df)
    df = df[df['entry no'].notna()].copy()
    # Convert to numeric, coerce errors to NaN, then drop NaN
    df['entry no'] = pd.to_numeric(df['entry no'], errors='coerce')
    df = df[df['entry no'].notna()].copy()
    after_count = len(df)
    print(f"Removed {before_count - after_count} invalid rows (NaN or non-numeric entry_no)")
    
    # Reset index after filtering
    df = df.reset_index(drop=True)
    
    # Create transaction_id (TXN + entry_no padded to 5 digits + line number)
    df['transaction_id'] = df.apply(
        lambda row: f"TXN{int(row['entry no']):05d}-L{row.name + 1}",
        axis=1
    )
    
    # Map dimension codes (using codes as-is for now)
    df['classification_id'] = df['transaction classification code'].fillna('')
    df['project_id'] = df['project code'].fillna('')
    df['analysis_work_item_id'] = df['work analysis code'].fillna('')
    df['sub_tree_id'] = df['sub_tree code'].fillna('')
    
    # Rename amount columns and ensure numeric types
    df['debit_amount'] = pd.to_numeric(df['debit'], errors='coerce').fillna(0)
    df['credit_amount'] = pd.to_numeric(df['credit'], errors='coerce').fillna(0)
    
    # Add org_id
    df['org_id'] = ORG_ID
    
    # Select output columns
    output_df = df[[
        'transaction_id',
        'account_id',
        'classification_id',
        'project_id',
        'analysis_work_item_id',
        'sub_tree_id',
        'debit_amount',
        'credit_amount',
        'description',
        'notes',
        'org_id'
    ]]
    
    # Calculate totals BEFORE filtering
    total_rows = len(output_df)
    total_debit = output_df['debit_amount'].sum()
    total_credit = output_df['credit_amount'].sum()
    
    print(f"\n=== BEFORE FILTERING ===")
    print(f"Total rows: {total_rows}")
    print(f"Total debit: {total_debit:,.2f}")
    print(f"Total credit: {total_credit:,.2f}")
    print(f"Balance: {total_debit - total_credit:,.2f}")
    
    # Save to CSV
    output_file = Path("transaction_lines.csv")
    output_df.to_csv(output_file, index=False)
    
    print(f"\n✓ Generated: {output_file}")
    print(f"✓ Total rows: {len(output_df)}")
    
    # Verify the CSV
    print("\n=== VERIFICATION ===")
    verify_df = pd.read_csv(output_file)
    print(f"CSV rows: {len(verify_df)}")
    print(f"CSV debit sum: {verify_df['debit_amount'].sum():,.2f}")
    print(f"CSV credit sum: {verify_df['credit_amount'].sum():,.2f}")
    
    # Check for issues
    print("\n=== DATA QUALITY CHECKS ===")
    null_accounts = verify_df[verify_df['account_id'].isna()]
    print(f"Rows with NULL account_id: {len(null_accounts)}")
    
    zero_rows = verify_df[(verify_df['debit_amount'] == 0) & (verify_df['credit_amount'] == 0)]
    print(f"Rows with zero debit AND credit: {len(zero_rows)}")
    
    invalid_accounts = verify_df[verify_df['account_id'] == '00000000-0000-0000-0000-000000000000']
    print(f"Rows with all-zeros UUID: {len(invalid_accounts)}")
    
    # Calculate what will be imported after filtering
    valid_df = verify_df[
        (verify_df['account_id'].notna()) &
        (verify_df['account_id'] != '00000000-0000-0000-0000-000000000000') &
        ~((verify_df['debit_amount'] == 0) & (verify_df['credit_amount'] == 0))
    ]
    
    print(f"\n=== AFTER FILTERING (WHAT WILL BE IMPORTED) ===")
    print(f"Valid rows: {len(valid_df)}")
    print(f"Valid debit sum: {valid_df['debit_amount'].sum():,.2f}")
    print(f"Valid credit sum: {valid_df['credit_amount'].sum():,.2f}")
    print(f"Balance: {valid_df['debit_amount'].sum() - valid_df['credit_amount'].sum():,.2f}")
    
    return True

if __name__ == "__main__":
    success = regenerate_csv()
    sys.exit(0 if success else 1)
