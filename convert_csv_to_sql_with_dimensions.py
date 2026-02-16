#!/usr/bin/env python3
"""
CONVERT CSV TO SQL WITH DIMENSION MAPPING (20 FILES)

This script:
1. Reads transaction_lines.csv
2. Generates 20 smaller SQL files that map dimension codes to UUIDs using database JOINs
3. Each file is ~700 lines to avoid Supabase SQL Editor timeout
4. Bypasses RLS issues by running SQL directly in database

NO SUPABASE CONNECTION NEEDED - Pure SQL generation
"""

import pandas as pd
from pathlib import Path

# Configuration
ORG_ID = "d5789445-11e3-4ad6-9297-b56521675114"
NUM_SQL_FILES = 20  # Split into 20 smaller files for Supabase SQL Editor

def clean_code(value):
    """Convert CSV code (7.0) to clean string (7)."""
    if pd.isna(value) or value == '' or value is None:
        return None
    # Remove .0 suffix: "7.0" -> "7", "30000.0" -> "30000"
    code_str = str(value)
    if '.' in code_str:
        code_str = code_str.split('.')[0]
    return code_str

def escape_sql_string(s):
    """Escape single quotes for SQL."""
    if pd.isna(s) or s is None:
        return ''
    return str(s).replace("'", "''")

def generate_sql_file(df_chunk, part_num, total_parts, output_dir, org_id):
    """Generate a single SQL file for a chunk of data."""
    output_file = output_dir / f"import_transaction_lines_part_{part_num:02d}.sql"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        # Header
        f.write("-- ============================================================================\n")
        f.write(f"-- TRANSACTION LINES IMPORT WITH DIMENSIONS - PART {part_num}/{total_parts}\n")
        f.write("-- ============================================================================\n")
        f.write(f"-- Lines in this file: {len(df_chunk):,}\n")
        f.write(f"-- Total debit: {df_chunk['debit_amount'].sum():,.2f}\n")
        f.write(f"-- Total credit: {df_chunk['credit_amount'].sum():,.2f}\n")
        f.write(f"-- Organization ID: {org_id}\n")
        f.write("--\n")
        f.write("-- This SQL:\n")
        f.write("-- 1. Creates temp table with CSV data\n")
        f.write("-- 2. Maps dimension codes to UUIDs using your dimension tables\n")
        f.write("-- 3. Inserts transaction_lines with proper dimensions\n")
        f.write("-- 4. Verifies this chunk\n")
        f.write("--\n")
        f.write("-- RUN THIS IN SUPABASE SQL EDITOR\n")
        f.write("-- ============================================================================\n\n")
        
        # Create temp table
        f.write("-- Step 1: Create temporary table with CSV data\n")
        f.write(f"DROP TABLE IF EXISTS temp_csv_part_{part_num};\n\n")
        f.write(f"CREATE TEMP TABLE temp_csv_part_{part_num} (\n")
        f.write("    row_num INTEGER,\n")
        f.write("    txn_ref TEXT,\n")
        f.write("    account_id UUID,\n")
        f.write("    classification_code TEXT,\n")
        f.write("    project_code TEXT,\n")
        f.write("    analysis_code TEXT,\n")
        f.write("    subtree_code TEXT,\n")
        f.write("    debit_amount NUMERIC,\n")
        f.write("    credit_amount NUMERIC,\n")
        f.write("    description TEXT,\n")
        f.write("    org_id UUID\n")
        f.write(");\n\n")
        
        # Insert CSV data
        f.write("-- Step 2: Load CSV data into temp table\n")
        f.write(f"INSERT INTO temp_csv_part_{part_num} VALUES\n")
        
        values_rows = []
        for idx, row in df_chunk.iterrows():
            # Extract transaction reference number
            txn_ref = row['transaction_id'].split('-')[0].replace('TXN', '').lstrip('0') or '0'
            
            # Clean dimension codes
            class_code = clean_code(row['classification_id'])
            proj_code = clean_code(row['project_id'])
            anal_code = clean_code(row['analysis_work_item_id'])
            sub_code = clean_code(row['sub_tree_id'])
            
            # Escape description
            desc = escape_sql_string(row['description'])
            
            # Build VALUES row
            row_num = idx + 1
            
            # Format dimension codes
            class_val = 'NULL' if class_code is None else f"'{class_code}'"
            proj_val = 'NULL' if proj_code is None else f"'{proj_code}'"
            anal_val = 'NULL' if anal_code is None else f"'{anal_code}'"
            sub_val = 'NULL' if sub_code is None else f"'{sub_code}'"
            
            values_row = f"    ({row_num}, '{txn_ref}', '{row['account_id']}', {class_val}, {proj_val}, {anal_val}, {sub_val}, {row['debit_amount']}, {row['credit_amount']}, '{desc}', '{org_id}')"
            
            values_rows.append(values_row)
        
        # Write all VALUES
        f.write(",\n".join(values_rows))
        f.write(";\n\n")
        
        # Insert with dimension mapping
        f.write("-- Step 3: Insert transaction_lines with dimension mapping\n")
        f.write("INSERT INTO transaction_lines (\n")
        f.write("    transaction_id,\n")
        f.write("    line_no,\n")
        f.write("    account_id,\n")
        f.write("    classification_id,\n")
        f.write("    project_id,\n")
        f.write("    analysis_work_item_id,\n")
        f.write("    sub_tree_id,\n")
        f.write("    debit_amount,\n")
        f.write("    credit_amount,\n")
        f.write("    description,\n")
        f.write("    org_id\n")
        f.write(")\n")
        f.write("SELECT \n")
        f.write("    t.id as transaction_id,\n")
        f.write("    COALESCE((SELECT MAX(line_no) FROM transaction_lines WHERE transaction_id = t.id), 0) + \n")
        f.write("        ROW_NUMBER() OVER (PARTITION BY t.id ORDER BY csv.row_num) as line_no,\n")
        f.write("    csv.account_id,\n")
        f.write("    class_map.id as classification_id,\n")
        f.write("    proj_map.id as project_id,\n")
        f.write("    anal_map.id as analysis_work_item_id,\n")
        f.write("    sub_map.id as sub_tree_id,\n")
        f.write("    csv.debit_amount,\n")
        f.write("    csv.credit_amount,\n")
        f.write("    csv.description,\n")
        f.write("    csv.org_id\n")
        f.write(f"FROM temp_csv_part_{part_num} csv\n")
        f.write("JOIN transactions t \n")
        f.write("    ON t.reference_number = csv.txn_ref \n")
        f.write("    AND t.org_id = csv.org_id\n")
        f.write("LEFT JOIN transaction_classifications class_map \n")
        f.write("    ON CAST(class_map.code AS TEXT) = csv.classification_code \n")
        f.write("    AND class_map.org_id = csv.org_id\n")
        f.write("LEFT JOIN projects proj_map \n")
        f.write("    ON CAST(proj_map.code AS TEXT) = csv.project_code \n")
        f.write("    AND proj_map.org_id = csv.org_id\n")
        f.write("LEFT JOIN analysis_work_items anal_map \n")
        f.write("    ON CAST(anal_map.code AS TEXT) = csv.analysis_code \n")
        f.write("    AND anal_map.org_id = csv.org_id\n")
        f.write("LEFT JOIN sub_tree sub_map \n")
        f.write("    ON CAST(sub_map.code AS TEXT) = csv.subtree_code \n")
        f.write("    AND sub_map.org_id = csv.org_id;\n\n")
        
        # Verification for this chunk
        f.write("-- Step 4: Verify this chunk\n")
        f.write("DO $$\n")
        f.write("DECLARE\n")
        f.write("    v_count INTEGER;\n")
        f.write("    v_debit NUMERIC;\n")
        f.write("    v_credit NUMERIC;\n")
        f.write("BEGIN\n")
        f.write("    SELECT COUNT(*) INTO v_count FROM transaction_lines \n")
        f.write(f"    WHERE org_id = '{org_id}';\n\n")
        f.write("    RAISE NOTICE '=========================================';\n")
        f.write(f"    RAISE NOTICE 'PART {part_num}/{total_parts} IMPORTED';\n")
        f.write("    RAISE NOTICE '=========================================';\n")
        f.write(f"    RAISE NOTICE 'Lines in this part: {len(df_chunk)}';\n")
        f.write("    RAISE NOTICE 'Total lines so far: %', v_count;\n")
        f.write("    RAISE NOTICE '';\n")
        f.write("END $$;\n\n")
        
        # Cleanup
        f.write("-- Step 5: Cleanup\n")
        f.write(f"DROP TABLE IF EXISTS temp_csv_part_{part_num};\n")
    
    return output_file

def main():
    print("="*70)
    print("CONVERT CSV TO SQL WITH DIMENSION MAPPING (20 FILES)")
    print("="*70)
    
    csv_file = Path("transaction_lines.csv")
    if not csv_file.exists():
        print(f"\n❌ ERROR: {csv_file} not found")
        return False
    
    print(f"\n📖 Reading CSV...")
    df = pd.read_csv(csv_file)
    
    print(f"   Total rows: {len(df):,}")
    print(f"   Total debit: {df['debit_amount'].sum():,.2f}")
    print(f"   Total credit: {df['credit_amount'].sum():,.2f}")
    
    # Filter invalid rows
    print(f"\n🔍 Filtering invalid rows...")
    df_valid = df[
        (df['account_id'].notna()) &
        (df['account_id'] != '00000000-0000-0000-0000-000000000000') &
        ~((df['debit_amount'] == 0) & (df['credit_amount'] == 0))
    ].copy()
    
    print(f"   Valid rows: {len(df_valid):,}")
    print(f"   Filtered out: {len(df) - len(df_valid):,}")
    
    # Create output directory
    output_dir = Path("transaction_lines_split")
    output_dir.mkdir(exist_ok=True)
    
    # Split into chunks
    print(f"\n📝 Generating {NUM_SQL_FILES} SQL files...")
    chunk_size = len(df_valid) // NUM_SQL_FILES + (1 if len(df_valid) % NUM_SQL_FILES else 0)
    
    generated_files = []
    for i in range(NUM_SQL_FILES):
        start_idx = i * chunk_size
        end_idx = min((i + 1) * chunk_size, len(df_valid))
        
        if start_idx >= len(df_valid):
            break
            
        df_chunk = df_valid.iloc[start_idx:end_idx]
        part_num = i + 1
        
        output_file = generate_sql_file(df_chunk, part_num, NUM_SQL_FILES, output_dir, ORG_ID)
        generated_files.append(output_file)
        
        print(f"   ✅ Part {part_num:02d}: {len(df_chunk):,} lines → {output_file.name}")
    
    # Generate final verification SQL
    print(f"\n📝 Generating final verification SQL...")
    verify_file = output_dir / "verify_all_imports.sql"
    
    with open(verify_file, 'w', encoding='utf-8') as f:
        f.write("-- ============================================================================\n")
        f.write("-- FINAL VERIFICATION - RUN AFTER ALL PARTS\n")
        f.write("-- ============================================================================\n\n")
        f.write("DO $$\n")
        f.write("DECLARE\n")
        f.write("    v_count INTEGER;\n")
        f.write("    v_debit NUMERIC;\n")
        f.write("    v_credit NUMERIC;\n")
        f.write("    v_balance NUMERIC;\n")
        f.write("    v_with_class INTEGER;\n")
        f.write("    v_with_proj INTEGER;\n")
        f.write("    v_with_anal INTEGER;\n")
        f.write("    v_with_sub INTEGER;\n")
        f.write("BEGIN\n")
        f.write("    SELECT \n")
        f.write("        COUNT(*),\n")
        f.write("        SUM(debit_amount),\n")
        f.write("        SUM(credit_amount),\n")
        f.write("        SUM(debit_amount) - SUM(credit_amount),\n")
        f.write("        COUNT(CASE WHEN classification_id IS NOT NULL THEN 1 END),\n")
        f.write("        COUNT(CASE WHEN project_id IS NOT NULL THEN 1 END),\n")
        f.write("        COUNT(CASE WHEN analysis_work_item_id IS NOT NULL THEN 1 END),\n")
        f.write("        COUNT(CASE WHEN sub_tree_id IS NOT NULL THEN 1 END)\n")
        f.write("    INTO v_count, v_debit, v_credit, v_balance, v_with_class, v_with_proj, v_with_anal, v_with_sub\n")
        f.write(f"    FROM transaction_lines WHERE org_id = '{ORG_ID}';\n\n")
        f.write("    RAISE NOTICE '=========================================';\n")
        f.write("    RAISE NOTICE 'FINAL IMPORT VERIFICATION';\n")
        f.write("    RAISE NOTICE '=========================================';\n")
        f.write("    RAISE NOTICE 'Total lines: %', v_count;\n")
        f.write("    RAISE NOTICE 'Total debit: %', v_debit;\n")
        f.write("    RAISE NOTICE 'Total credit: %', v_credit;\n")
        f.write("    RAISE NOTICE 'Balance: %', v_balance;\n")
        f.write("    RAISE NOTICE '';\n")
        f.write("    RAISE NOTICE 'Dimension Coverage:';\n")
        f.write("    RAISE NOTICE '  Classification: % (%.1f%%)', v_with_class, (v_with_class::NUMERIC / v_count * 100);\n")
        f.write("    RAISE NOTICE '  Project: % (%.1f%%)', v_with_proj, (v_with_proj::NUMERIC / v_count * 100);\n")
        f.write("    RAISE NOTICE '  Analysis: % (%.1f%%)', v_with_anal, (v_with_anal::NUMERIC / v_count * 100);\n")
        f.write("    RAISE NOTICE '  Sub-tree: % (%.1f%%)', v_with_sub, (v_with_sub::NUMERIC / v_count * 100);\n")
        f.write("    RAISE NOTICE '';\n\n")
        f.write(f"    IF v_count != {len(df_valid)} THEN\n")
        f.write(f"        RAISE EXCEPTION 'Line count mismatch: expected {len(df_valid)}, got %', v_count;\n")
        f.write("    END IF;\n\n")
        f.write(f"    IF ABS(v_debit - {df_valid['debit_amount'].sum()}) > 0.01 THEN\n")
        f.write("        RAISE EXCEPTION 'Debit total mismatch';\n")
        f.write("    END IF;\n\n")
        f.write(f"    IF ABS(v_credit - {df_valid['credit_amount'].sum()}) > 0.01 THEN\n")
        f.write("        RAISE EXCEPTION 'Credit total mismatch';\n")
        f.write("    END IF;\n\n")
        f.write("    IF ABS(v_balance) > 0.01 THEN\n")
        f.write("        RAISE EXCEPTION 'Transactions not balanced: %', v_balance;\n")
        f.write("    END IF;\n\n")
        f.write("    RAISE NOTICE '✅ ALL VERIFICATIONS PASSED';\n")
        f.write("    RAISE NOTICE '';\n")
        f.write("END $$;\n")
    
    print(f"\n✅ Generated {len(generated_files)} SQL files in {output_dir}/")
    print(f"✅ Generated verification file: {verify_file.name}")
    
    print(f"\n📊 SUMMARY:")
    print(f"   Total valid lines: {len(df_valid):,}")
    print(f"   Total debit: {df_valid['debit_amount'].sum():,.2f}")
    print(f"   Total credit: {df_valid['credit_amount'].sum():,.2f}")
    print(f"   Files generated: {len(generated_files)}")
    print(f"   Lines per file: ~{chunk_size:,}")
    
    print(f"\n📋 NEXT STEPS:")
    print(f"   1. Open Supabase SQL Editor")
    print(f"   2. Run files in order: part_01.sql, part_02.sql, ..., part_{len(generated_files):02d}.sql")
    print(f"   3. After all parts, run: {verify_file.name}")
    print(f"   4. Check the final verification output")
    print(f"\n💡 Each file is small (~700 lines) to avoid Supabase SQL Editor timeout")
    print(f"💡 Dimensions are mapped directly in database, bypassing RLS issues")
    
    return True

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
