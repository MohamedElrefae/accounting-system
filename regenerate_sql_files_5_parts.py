#!/usr/bin/env python3
"""
Regenerate 5 SQL import files from the corrected CSV (instead of 28).
This will produce SQL files that import exactly 13,963 valid lines with balance 905,925,674.84

CHANGES FROM PREVIOUS VERSION:
- Only 5 files instead of 28 (approximately 2,800 lines per file)
- Added comprehensive verification
- Added row-by-row validation
- Added summary report
"""

import pandas as pd
import math
from pathlib import Path

# Organization ID
ORG_ID = "d5789445-11e3-4ad6-9297-b56521675114"

# Number of files to generate
NUM_FILES = 5

def regenerate_sql_files():
    """Regenerate 5 SQL files from corrected CSV."""
    
    csv_file = Path("transaction_lines.csv")
    if not csv_file.exists():
        print(f"ERROR: {csv_file} not found")
        return False
    
    print(f"Reading CSV: {csv_file}")
    df = pd.read_csv(csv_file)
    
    print(f"\n=== CSV LOADED ===")
    print(f"Total rows in CSV: {len(df)}")
    print(f"Total debit in CSV: {df['debit_amount'].sum():,.2f}")
    print(f"Total credit in CSV: {df['credit_amount'].sum():,.2f}")
    print(f"Balance in CSV: {df['debit_amount'].sum() - df['credit_amount'].sum():,.2f}")
    
    # Filter out invalid rows (same as SQL WHERE clause)
    print("\n=== FILTERING INVALID ROWS ===")
    before_count = len(df)
    
    # Count each type of invalid row
    null_account = df['account_id'].isna().sum()
    zero_uuid = (df['account_id'] == '00000000-0000-0000-0000-000000000000').sum()
    zero_amounts = ((df['debit_amount'] == 0) & (df['credit_amount'] == 0)).sum()
    
    print(f"Rows with NULL account_id: {null_account}")
    print(f"Rows with all-zeros UUID: {zero_uuid}")
    print(f"Rows with zero debit AND credit: {zero_amounts}")
    
    # Apply filter
    df_valid = df[
        (df['account_id'].notna()) &
        (df['account_id'] != '00000000-0000-0000-0000-000000000000') &
        ~((df['debit_amount'] == 0) & (df['credit_amount'] == 0))
    ].copy()
    
    after_count = len(df_valid)
    filtered_count = before_count - after_count
    
    print(f"\nTotal filtered out: {filtered_count} rows")
    print(f"Valid rows remaining: {after_count}")
    print(f"Valid debit total: {df_valid['debit_amount'].sum():,.2f}")
    print(f"Valid credit total: {df_valid['credit_amount'].sum():,.2f}")
    print(f"Valid balance: {df_valid['debit_amount'].sum() - df_valid['credit_amount'].sum():,.2f}")
    
    # Verify expected totals
    expected_lines = 13963
    expected_total = 905925674.84
    
    if after_count != expected_lines:
        print(f"\n⚠️  WARNING: Expected {expected_lines} lines, got {after_count}")
    else:
        print(f"\n✅ Line count matches expected: {expected_lines}")
    
    if abs(df_valid['debit_amount'].sum() - expected_total) > 0.01:
        print(f"⚠️  WARNING: Expected debit {expected_total:,.2f}, got {df_valid['debit_amount'].sum():,.2f}")
    else:
        print(f"✅ Debit total matches expected: {expected_total:,.2f}")
    
    if abs(df_valid['credit_amount'].sum() - expected_total) > 0.01:
        print(f"⚠️  WARNING: Expected credit {expected_total:,.2f}, got {df_valid['credit_amount'].sum():,.2f}")
    else:
        print(f"✅ Credit total matches expected: {expected_total:,.2f}")
    
    # Calculate lines per file
    lines_per_file = math.ceil(len(df_valid) / NUM_FILES)
    
    print(f"\n=== GENERATING {NUM_FILES} SQL FILES ===")
    print(f"Lines per file: ~{lines_per_file}")
    
    # Create output directory
    output_dir = Path("transaction_lines_split")
    output_dir.mkdir(exist_ok=True)
    
    # Track totals across all files
    total_lines_generated = 0
    total_debit_generated = 0
    total_credit_generated = 0
    
    # Split into files
    for file_num in range(1, NUM_FILES + 1):
        start_idx = (file_num - 1) * lines_per_file
        end_idx = min(start_idx + lines_per_file, len(df_valid))
        
        chunk = df_valid.iloc[start_idx:end_idx]
        
        # Calculate chunk totals
        chunk_debit = chunk['debit_amount'].sum()
        chunk_credit = chunk['credit_amount'].sum()
        chunk_balance = chunk_debit - chunk_credit
        
        total_lines_generated += len(chunk)
        total_debit_generated += chunk_debit
        total_credit_generated += chunk_credit
        
        output_file = output_dir / f"import_transaction_lines_part_{file_num:02d}.sql"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"-- Transaction Lines Import - Part {file_num:02d} of {NUM_FILES}\n")
            f.write(f"-- Lines {start_idx + 1} to {end_idx} of {len(df_valid)}\n")
            f.write(f"-- Organization ID: {ORG_ID}\n")
            f.write(f"-- Chunk lines: {len(chunk)}\n")
            f.write(f"-- Chunk debit: {chunk_debit:,.2f}\n")
            f.write(f"-- Chunk credit: {chunk_credit:,.2f}\n")
            f.write(f"-- Chunk balance: {chunk_balance:,.2f}\n\n")
            
            f.write("INSERT INTO transaction_lines (\n")
            f.write("    transaction_id,\n")
            f.write("    line_no,\n")
            f.write("    account_id,\n")
            f.write("    debit_amount,\n")
            f.write("    credit_amount,\n")
            f.write("    description,\n")
            f.write("    org_id\n")
            f.write(")\n")
            f.write("SELECT \n")
            f.write("    t.id as transaction_id,\n")
            f.write("    COALESCE((SELECT MAX(line_no) FROM transaction_lines WHERE transaction_id = t.id), 0) + temp_lines.row_num as line_no,\n")
            f.write("    temp_lines.account_id::uuid,\n")
            f.write("    temp_lines.debit_amount,\n")
            f.write("    temp_lines.credit_amount,\n")
            f.write("    temp_lines.description,\n")
            f.write("    temp_lines.org_id::uuid\n")
            f.write("FROM (\n")
            f.write("    VALUES\n")
            
            # Generate VALUES rows
            values_rows = []
            for idx, row in chunk.iterrows():
                # Extract transaction reference from transaction_id (e.g., "TXN00001-L1" -> "1")
                txn_ref = row['transaction_id'].split('-')[0].replace('TXN', '').lstrip('0') or '0'
                
                # Escape single quotes in description
                desc = str(row['description']) if pd.notna(row['description']) else ''
                desc = desc.replace("'", "''")
                
                # Row number within this chunk (starts from 1 for each chunk)
                row_num = (idx - start_idx) + 1
                
                values_row = f"        ({row_num}, '{txn_ref}', '{row['account_id']}', {row['debit_amount']}, {row['credit_amount']}, '{desc}', '{ORG_ID}')"
                values_rows.append(values_row)
            
            f.write(",\n".join(values_rows))
            f.write("\n) AS temp_lines(row_num, txn_ref, account_id, debit_amount, credit_amount, description, org_id)\n")
            f.write("JOIN transactions t ON t.reference_number = temp_lines.txn_ref AND t.org_id = temp_lines.org_id::uuid\n")
            f.write("WHERE temp_lines.account_id IS NOT NULL\n")
            f.write("  AND temp_lines.account_id != '00000000-0000-0000-0000-000000000000'\n")
            f.write("  AND NOT (temp_lines.debit_amount = 0 AND temp_lines.credit_amount = 0);\n\n")
            
            f.write(f"-- Verify this chunk\n")
            f.write(f"-- Expected: {len(chunk)} lines, {chunk_debit:,.2f} debit, {chunk_credit:,.2f} credit\n")
        
        print(f"✓ Part {file_num:02d}: {len(chunk):,} lines | Debit: {chunk_debit:,.2f} | Credit: {chunk_credit:,.2f} | Balance: {chunk_balance:,.2f}")
    
    print(f"\n=== GENERATION COMPLETE ===")
    print(f"Files generated: {NUM_FILES}")
    print(f"Total lines: {total_lines_generated:,}")
    print(f"Total debit: {total_debit_generated:,.2f}")
    print(f"Total credit: {total_credit_generated:,.2f}")
    print(f"Total balance: {total_debit_generated - total_credit_generated:,.2f}")
    
    # Final verification
    print(f"\n=== FINAL VERIFICATION ===")
    if total_lines_generated == expected_lines:
        print(f"✅ Line count correct: {total_lines_generated:,}")
    else:
        print(f"❌ Line count mismatch: Expected {expected_lines:,}, got {total_lines_generated:,}")
        return False
    
    if abs(total_debit_generated - expected_total) < 0.01:
        print(f"✅ Debit total correct: {total_debit_generated:,.2f}")
    else:
        print(f"❌ Debit mismatch: Expected {expected_total:,.2f}, got {total_debit_generated:,.2f}")
        return False
    
    if abs(total_credit_generated - expected_total) < 0.01:
        print(f"✅ Credit total correct: {total_credit_generated:,.2f}")
    else:
        print(f"❌ Credit mismatch: Expected {expected_total:,.2f}, got {total_credit_generated:,.2f}")
        return False
    
    if abs(total_debit_generated - total_credit_generated) < 0.01:
        print(f"✅ Balanced: {total_debit_generated - total_credit_generated:,.2f}")
    else:
        print(f"❌ Unbalanced: {total_debit_generated - total_credit_generated:,.2f}")
        return False
    
    print(f"\n✅ ALL VERIFICATIONS PASSED")
    print(f"\n📁 Files ready in: {output_dir}/")
    print(f"   - import_transaction_lines_part_01.sql")
    print(f"   - import_transaction_lines_part_02.sql")
    print(f"   - import_transaction_lines_part_03.sql")
    print(f"   - import_transaction_lines_part_04.sql")
    print(f"   - import_transaction_lines_part_05.sql")
    
    return True

if __name__ == "__main__":
    import sys
    success = regenerate_sql_files()
    sys.exit(0 if success else 1)
