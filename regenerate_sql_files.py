#!/usr/bin/env python3
"""
Regenerate all 30 SQL import files from the corrected CSV.
This will produce SQL files that import exactly 13,963 valid lines with balance 905,925,674.84
"""

import pandas as pd
import math
from pathlib import Path

# Organization ID
ORG_ID = "d5789445-11e3-4ad6-9297-b56521675114"

# Lines per file
LINES_PER_FILE = 500

def regenerate_sql_files():
    """Regenerate all 30 SQL files from corrected CSV."""
    
    csv_file = Path("transaction_lines.csv")
    if not csv_file.exists():
        print(f"ERROR: {csv_file} not found")
        return False
    
    print(f"Reading CSV: {csv_file}")
    df = pd.read_csv(csv_file)
    
    print(f"✓ Read {len(df)} rows from CSV")
    print(f"✓ Total debit: {df['debit_amount'].sum():,.2f}")
    print(f"✓ Total credit: {df['credit_amount'].sum():,.2f}")
    
    # Filter out invalid rows (same as SQL WHERE clause)
    print("\nFiltering invalid rows...")
    before_count = len(df)
    df = df[
        (df['account_id'].notna()) &
        (df['account_id'] != '00000000-0000-0000-0000-000000000000') &
        ~((df['debit_amount'] == 0) & (df['credit_amount'] == 0))
    ].copy()
    after_count = len(df)
    print(f"Filtered out {before_count - after_count} invalid rows")
    print(f"Valid rows: {after_count}")
    print(f"Valid debit: {df['debit_amount'].sum():,.2f}")
    print(f"Valid credit: {df['credit_amount'].sum():,.2f}")
    
    # Calculate number of files needed
    num_files = math.ceil(len(df) / LINES_PER_FILE)
    print(f"\nGenerating {num_files} SQL files ({LINES_PER_FILE} lines per file)...")
    
    # Create output directory
    output_dir = Path("transaction_lines_split")
    output_dir.mkdir(exist_ok=True)
    
    # Split into files
    for file_num in range(1, num_files + 1):
        start_idx = (file_num - 1) * LINES_PER_FILE
        end_idx = min(start_idx + LINES_PER_FILE, len(df))
        
        chunk = df.iloc[start_idx:end_idx]
        
        output_file = output_dir / f"import_transaction_lines_part_{file_num:02d}.sql"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"-- Transaction Lines Import - Part {file_num:02d}\n")
            f.write(f"-- Lines {start_idx + 1} to {end_idx} of {len(df)}\n")
            f.write(f"-- Organization ID: {ORG_ID}\n\n")
            
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
                
                # Row number within this chunk
                row_num = (idx - start_idx) + 1
                
                values_row = f"        ({row_num}, '{txn_ref}', '{row['account_id']}', {row['debit_amount']}, {row['credit_amount']}, '{desc}', '{ORG_ID}')"
                values_rows.append(values_row)
            
            f.write(",\n".join(values_rows))
            f.write("\n) AS temp_lines(row_num, txn_ref, account_id, debit_amount, credit_amount, description, org_id)\n")
            f.write("JOIN transactions t ON t.reference_number = temp_lines.txn_ref AND t.org_id = temp_lines.org_id::uuid\n")
            f.write("WHERE temp_lines.account_id IS NOT NULL\n")
            f.write("  AND temp_lines.account_id != '00000000-0000-0000-0000-000000000000'\n")
            f.write("  AND NOT (temp_lines.debit_amount = 0 AND temp_lines.credit_amount = 0);\n")
        
        print(f"✓ Generated: {output_file} ({len(chunk)} lines)")
    
    print(f"\n✅ Successfully generated {num_files} SQL files")
    print(f"✅ Total valid lines: {len(df)}")
    print(f"✅ Total debit: {df['debit_amount'].sum():,.2f}")
    print(f"✅ Total credit: {df['credit_amount'].sum():,.2f}")
    print(f"✅ Balance: {df['debit_amount'].sum() - df['credit_amount'].sum():,.2f}")
    
    return True

if __name__ == "__main__":
    import sys
    success = regenerate_sql_files()
    sys.exit(0 if success else 1)
