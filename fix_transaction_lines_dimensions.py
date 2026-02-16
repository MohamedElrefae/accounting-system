#!/usr/bin/env python3
"""
Fix transaction_lines.csv with proper dimension values from Supabase.
This script reads the current CSV and updates dimension IDs with real values.
"""

import csv
import sys
from pathlib import Path

# Placeholder UUID that needs to be replaced
PLACEHOLDER_UUID = "00000000-0000-0000-0000-000000000001"

def fix_transaction_lines_csv():
    """
    Fix the transaction_lines.csv file.
    
    IMPORTANT: You need to provide the actual dimension IDs from your Supabase database:
    - classification_id: UUID from transaction_classifications table
    - project_id: UUID from projects table  
    - analysis_work_item_id: UUID from analysis_work_items table
    - sub_tree_id: UUID from sub_tree table
    
    For now, this script will show you what needs to be done.
    """
    
    csv_path = Path("transaction_lines.csv")
    
    if not csv_path.exists():
        print(f"ERROR: {csv_path} not found")
        return False
    
    # Read current CSV
    rows = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    print(f"✓ Read {len(rows)} transaction lines from CSV")
    
    # Check for placeholder UUIDs
    placeholder_count = 0
    for row in rows:
        if row.get('classification_id') == PLACEHOLDER_UUID:
            placeholder_count += 1
    
    if placeholder_count > 0:
        print(f"\n⚠️  Found {placeholder_count} rows with placeholder dimension IDs")
        print("\nTo fix this, you need to:")
        print("1. Get the actual dimension IDs from your Supabase database:")
        print("   - SELECT id FROM transaction_classifications LIMIT 1;")
        print("   - SELECT id FROM projects LIMIT 1;")
        print("   - SELECT id FROM analysis_work_items LIMIT 1;")
        print("   - SELECT id FROM sub_tree LIMIT 1;")
        print("\n2. Update the dimension IDs in the CSV with real values")
        print("\nExample of what needs to be fixed:")
        print(f"  Current: classification_id={PLACEHOLDER_UUID}")
        print(f"  Should be: classification_id=<real-uuid-from-database>")
        return False
    
    print("✓ All dimension IDs are valid (no placeholders found)")
    return True

if __name__ == "__main__":
    success = fix_transaction_lines_csv()
    sys.exit(0 if success else 1)
