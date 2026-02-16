#!/usr/bin/env python3
"""
COMPREHENSIVE TRANSACTION LINES IMPORT WITH DIMENSION MAPPING - FIXED

This script:
1. Queries Supabase to get dimension code→UUID mappings
2. Generates SQL with proper UUID values for dimensions
3. Includes comprehensive verification at every step
4. Ensures accounting data integrity

CRITICAL FIX: Database stores codes as integers/varchar (7, "1", "93")
              CSV has codes as floats (7.0, 1.0, 93.0)
              We strip .0 from CSV to match database format

CRITICAL: This is a single-step import with proper dimension mapping.
No separate UPDATE needed - dimensions are correct from the start.
"""

import pandas as pd
import math
import os
from pathlib import Path
from supabase import create_client, Client

# Configuration
ORG_ID = "d5789445-11e3-4ad6-9297-b56521675114"
NUM_FILES = 20

# Supabase connection (from .env.local)
def get_supabase_client():
    """Get Supabase client from environment variables."""
    url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("VITE_SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("ERROR: Supabase credentials not found in environment")
        print("Please ensure .env.local has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY")
        return None
    
    return create_client(url, key)

def fetch_dimension_mappings(supabase: Client):
    """Fetch all dimension code→UUID mappings from Supabase."""
    
    print("\n=== FETCHING DIMENSION MAPPINGS FROM SUPABASE ===")
    
    mappings = {
        'classification': {},
        'project': {},
        'analysis_work_item': {},
        'sub_tree': {}
    }
    
    try:
        # Transaction Classifications
        print("Fetching transaction_classifications...")
        response = supabase.table('transaction_classifications')\
            .select('id, code')\
            .eq('org_id', ORG_ID)\
            .execute()
        
        for row in response.data:
            # Store code as string (database has integer: 7, 8, 9)
            code = str(row['code']) if row['code'] is not None else None
            if code:
                mappings['classification'][code] = row['id']
                print(f"  Classification: code={code} -> {row['id']}")
        
        print(f"  ✓ Found {len(mappings['classification'])} classifications")
        
        # Projects
        print("Fetching projects...")
        response = supabase.table('projects')\
            .select('id, code')\
            .eq('org_id', ORG_ID)\
            .execute()
        
        for row in response.data:
            # Store code as string (database has varchar: "0", "1", "2")
            code = str(row['code']) if row['code'] is not None else None
            if code:
                mappings['project'][code] = row['id']
                print(f"  Project: code={code} -> {row['id']}")
        
        print(f"  ✓ Found {len(mappings['project'])} projects")
        
        # Analysis Work Items
        print("Fetching analysis_work_items...")
        response = supabase.table('analysis_work_items')\
            .select('id, code')\
            .eq('org_id', ORG_ID)\
            .execute()
        
        for row in response.data:
            # Store code as string (database has text: "1", "12", "30000")
            code = str(row['code']) if row['code'] is not None else None
            if code:
                mappings['analysis_work_item'][code] = row['id']
                print(f"  Analysis: code={code} -> {row['id']}")
        
        print(f"  ✓ Found {len(mappings['analysis_work_item'])} analysis work items")
        
        # Sub Tree
        print("Fetching sub_tree...")
        response = supabase.table('sub_tree')\
            .select('id, code')\
            .eq('org_id', ORG_ID)\
            .execute()
        
        for row in response.data:
            # Store code as string (database has text: "93", "30000", "5174")
            code = str(row['code']) if row['code'] is not None else None
            if code:
                mappings['sub_tree'][code] = row['id']
                print(f"  SubTree: code={code} -> {row['id']}")
        
        print(f"  ✓ Found {len(mappings['sub_tree'])} sub tree items")
        
        return mappings
        
    except Exception as e:
        print(f"ERROR fetching dimension mappings: {e}")
        import traceback
        traceback.print_exc()
        return None

def map_dimension_code_to_uuid(code, dimension_type, mappings):
    """Map a dimension code to its UUID, or return NULL if not found."""
    
    if pd.isna(code) or code == '' or code is None:
        return 'NULL'
    
    # Convert CSV value (e.g., "7.0") to clean code
    # Remove .0 suffix if present: "7.0" -> "7", "30000.0" -> "30000"
    code_str = str(code)
    if '.' in code_str:
        # Split on decimal and take integer part
        code_str = code_str.split('.')[0]
    
    # Look up in mappings
    uuid = mappings[dimension_type].get(code_str)
    
    if uuid:
        return f"'{uuid}'"
    else:
        # Code not found - return NULL and warn
        print(f"  ⚠️  WARNING: {dimension_type} code '{code_str}' (from CSV '{code}') not found in database")
        return 'NULL'

def generate_sql_files_with_dimensions(mappings):
    """Generate SQL files with proper dimension UUID mapping."""
    
    csv_file = Path("transaction_lines.csv")
    if not csv_file.exists():
        print(f"ERROR: {csv_file} not found")
        return False
    
    print(f"\n=== READING CSV ===")
    df = pd.read_csv(csv_file)
    
    print(f"Total rows in CSV: {len(df)}")
    print(f"Total debit in CSV: {df['debit_amount'].sum():,.2f}")
    print(f"Total credit in CSV: {df['credit_amount'].sum():,.2f}")
    
    # Filter invalid rows
    print("\n=== FILTERING INVALID ROWS ===")
    before_count = len(df)
    
    df_valid = df[
        (df['account_id'].notna()) &
        (df['account_id'] != '00000000-0000-0000-0000-000000000000') &
        ~((df['debit_amount'] == 0) & (df['credit_amount'] == 0))
    ].copy()
    
    after_count = len(df_valid)
    print(f"Filtered out: {before_count - after_count} rows")
    print(f"Valid rows: {after_count}")
    print(f"Valid debit: {df_valid['debit_amount'].sum():,.2f}")
    print(f"Valid credit: {df_valid['credit_amount'].sum():,.2f}")
    
    # Verify expected totals
    expected_lines = 13963
    expected_total = 905925674.84
    
    if after_count != expected_lines:
        print(f"⚠️  WARNING: Expected {expected_lines} lines, got {after_count}")
    
    if abs(df_valid['debit_amount'].sum() - expected_total) > 0.01:
        print(f"⚠️  WARNING: Debit total mismatch")
        return False
    
    if abs(df_valid['credit_amount'].sum() - expected_total) > 0.01:
        print(f"⚠️  WARNING: Credit total mismatch")
        return False
    
    # Calculate lines per file
    lines_per_file = math.ceil(len(df_valid) / NUM_FILES)
    
    print(f"\n=== GENERATING {NUM_FILES} SQL FILES WITH DIMENSION MAPPING ===")
    print(f"Lines per file: ~{lines_per_file}")
    
    # Create output directory
    output_dir = Path("transaction_lines_split")
    output_dir.mkdir(exist_ok=True)
    
    # Track statistics
    total_lines_generated = 0
    total_debit_generated = 0
    total_credit_generated = 0
    dimension_stats = {
        'classification': {'mapped': 0, 'null': 0},
        'project': {'mapped': 0, 'null': 0},
        'analysis_work_item': {'mapped': 0, 'null': 0},
        'sub_tree': {'mapped': 0, 'null': 0}
    }
    
    # Generate files
    for file_num in range(1, NUM_FILES + 1):
        start_idx = (file_num - 1) * lines_per_file
        end_idx = min(start_idx + lines_per_file, len(df_valid))
        
        chunk = df_valid.iloc[start_idx:end_idx]
        
        chunk_debit = chunk['debit_amount'].sum()
        chunk_credit = chunk['credit_amount'].sum()
        
        total_lines_generated += len(chunk)
        total_debit_generated += chunk_debit
        total_credit_generated += chunk_credit
        
        output_file = output_dir / f"import_transaction_lines_part_{file_num:02d}.sql"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"-- Transaction Lines Import - Part {file_num:02d} of {NUM_FILES}\n")
            f.write(f"-- Lines {start_idx + 1} to {end_idx} of {len(df_valid)}\n")
            f.write(f"-- Organization ID: {ORG_ID}\n")
            f.write(f"-- WITH PROPER DIMENSION UUID MAPPING (FIXED)\n")
            f.write(f"-- Chunk lines: {len(chunk)}\n")
            f.write(f"-- Chunk debit: {chunk_debit:,.2f}\n")
            f.write(f"-- Chunk credit: {chunk_credit:,.2f}\n\n")
            
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
            f.write("    COALESCE((SELECT MAX(line_no) FROM transaction_lines WHERE transaction_id = t.id), 0) + temp_lines.row_num as line_no,\n")
            f.write("    temp_lines.account_id::uuid,\n")
            f.write("    temp_lines.classification_id::uuid,\n")
            f.write("    temp_lines.project_id::uuid,\n")
            f.write("    temp_lines.analysis_work_item_id::uuid,\n")
            f.write("    temp_lines.sub_tree_id::uuid,\n")
            f.write("    temp_lines.debit_amount,\n")
            f.write("    temp_lines.credit_amount,\n")
            f.write("    temp_lines.description,\n")
            f.write("    temp_lines.org_id::uuid\n")
            f.write("FROM (\n")
            f.write("    VALUES\n")
            
            # Generate VALUES rows with dimension mapping
            values_rows = []
            for idx, row in chunk.iterrows():
                txn_ref = row['transaction_id'].split('-')[0].replace('TXN', '').lstrip('0') or '0'
                
                desc = str(row['description']) if pd.notna(row['description']) else ''
                desc = desc.replace("'", "''")
                
                row_num = (idx - start_idx) + 1
                
                # Map dimension codes to UUIDs
                classification_uuid = map_dimension_code_to_uuid(row['classification_id'], 'classification', mappings)
                project_uuid = map_dimension_code_to_uuid(row['project_id'], 'project', mappings)
                analysis_uuid = map_dimension_code_to_uuid(row['analysis_work_item_id'], 'analysis_work_item', mappings)
                sub_tree_uuid = map_dimension_code_to_uuid(row['sub_tree_id'], 'sub_tree', mappings)
                
                # Track statistics
                if classification_uuid != 'NULL':
                    dimension_stats['classification']['mapped'] += 1
                else:
                    dimension_stats['classification']['null'] += 1
                
                if project_uuid != 'NULL':
                    dimension_stats['project']['mapped'] += 1
                else:
                    dimension_stats['project']['null'] += 1
                
                if analysis_uuid != 'NULL':
                    dimension_stats['analysis_work_item']['mapped'] += 1
                else:
                    dimension_stats['analysis_work_item']['null'] += 1
                
                if sub_tree_uuid != 'NULL':
                    dimension_stats['sub_tree']['mapped'] += 1
                else:
                    dimension_stats['sub_tree']['null'] += 1
                
                values_row = f"        ({row_num}, '{txn_ref}', '{row['account_id']}', {classification_uuid}, {project_uuid}, {analysis_uuid}, {sub_tree_uuid}, {row['debit_amount']}, {row['credit_amount']}, '{desc}', '{ORG_ID}')"
                values_rows.append(values_row)
            
            f.write(",\n".join(values_rows))
            f.write("\n) AS temp_lines(row_num, txn_ref, account_id, classification_id, project_id, analysis_work_item_id, sub_tree_id, debit_amount, credit_amount, description, org_id)\n")
            f.write("JOIN transactions t ON t.reference_number = temp_lines.txn_ref AND t.org_id = temp_lines.org_id::uuid\n")
            f.write("WHERE temp_lines.account_id IS NOT NULL\n")
            f.write("  AND temp_lines.account_id != '00000000-0000-0000-0000-000000000000'\n")
            f.write("  AND NOT (temp_lines.debit_amount = 0 AND temp_lines.credit_amount = 0);\n\n")
            
            f.write(f"-- Verify this chunk\n")
            f.write(f"-- Expected: {len(chunk)} lines, {chunk_debit:,.2f} debit, {chunk_credit:,.2f} credit\n")
        
        print(f"✓ Part {file_num:02d}: {len(chunk):,} lines")
    
    # Final verification
    print(f"\n=== GENERATION COMPLETE ===")
    print(f"Total lines: {total_lines_generated:,}")
    print(f"Total debit: {total_debit_generated:,.2f}")
    print(f"Total credit: {total_credit_generated:,.2f}")
    print(f"Balance: {total_debit_generated - total_credit_generated:,.2f}")
    
    print(f"\n=== DIMENSION MAPPING STATISTICS ===")
    for dim_type, stats in dimension_stats.items():
        total = stats['mapped'] + stats['null']
        pct = (stats['mapped'] / total * 100) if total > 0 else 0
        print(f"{dim_type}:")
        print(f"  Mapped: {stats['mapped']:,} ({pct:.1f}%)")
        print(f"  NULL: {stats['null']:,}")
    
    # Verify totals
    if total_lines_generated != expected_lines:
        print(f"\n❌ Line count mismatch")
        return False
    
    if abs(total_debit_generated - expected_total) > 0.01:
        print(f"\n❌ Debit total mismatch")
        return False
    
    if abs(total_credit_generated - expected_total) > 0.01:
        print(f"\n❌ Credit total mismatch")
        return False
    
    print(f"\n✅ ALL VERIFICATIONS PASSED")
    print(f"\n📁 Files ready in: {output_dir}/")
    print(f"\n💡 IMPORT ORDER:")
    print(f"   1. import_transactions.sql")
    print(f"   2. import_transaction_lines_part_01.sql through part_20.sql")
    
    return True

def main():
    """Main execution function."""
    
    print("=" * 70)
    print("TRANSACTION LINES IMPORT WITH DIMENSION MAPPING (FIXED)")
    print("=" * 70)
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv('.env.local')
    
    # Get Supabase client
    supabase = get_supabase_client()
    if not supabase:
        return False
    
    # Fetch dimension mappings
    mappings = fetch_dimension_mappings(supabase)
    if not mappings:
        return False
    
    # Generate SQL files
    success = generate_sql_files_with_dimensions(mappings)
    
    if success:
        print("\n" + "=" * 70)
        print("SUCCESS - SQL FILES GENERATED WITH PROPER DIMENSION MAPPING")
        print("=" * 70)
    else:
        print("\n" + "=" * 70)
        print("FAILED - PLEASE CHECK ERRORS ABOVE")
        print("=" * 70)
    
    return success

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
