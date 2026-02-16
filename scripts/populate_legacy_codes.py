#!/usr/bin/env python3
"""
Populate legacy_code values in Supabase accounts table from CSV file.
Maps CSV 'code' (new mapped code) to Supabase 'legacy_code' column.
This fixes the account mapping issue.
"""

import csv
import sys
from pathlib import Path

def generate_update_sql(csv_file_path):
    """
    Generate SQL UPDATE statements from CSV data.
    Maps: CSV 'code' column -> Supabase 'legacy_code' column
    """
    
    updates = []
    
    try:
        with open(csv_file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                code = row.get('code', '').strip()  # New mapped code from CSV
                legacy_code = row.get('legacy_code', '').strip()  # Old code from CSV
                org_id = row.get('org_id', '').strip()
                
                # Only process rows with both code and legacy_code
                if code and legacy_code and org_id:
                    # Escape single quotes in code
                    code_escaped = code.replace("'", "''")
                    
                    # Update: Set legacy_code in Supabase to the CSV 'code' value
                    update_stmt = f"""UPDATE accounts 
SET legacy_code = '{code_escaped}'
WHERE code = '{legacy_code}' 
  AND org_id = '{org_id}';"""
                    
                    updates.append(update_stmt)
        
        return updates
    
    except FileNotFoundError:
        print(f"Error: File not found: {csv_file_path}")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        sys.exit(1)

def main():
    csv_path = Path("C:/5/accounting-systemr5/accounts_rows.csv")
    
    if not csv_path.exists():
        print(f"Error: CSV file not found at {csv_path}")
        sys.exit(1)
    
    print(f"Reading CSV from: {csv_path}")
    print("Mapping: CSV 'code' (new mapped) -> Supabase 'legacy_code'")
    updates = generate_update_sql(str(csv_path))
    
    print(f"\nGenerated {len(updates)} UPDATE statements")
    
    # Write to SQL file
    output_file = Path("sql/populate_legacy_codes_generated.sql")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- Auto-generated SQL to populate legacy_code values\n")
        f.write("-- Maps CSV 'code' (new mapped codes) to Supabase 'legacy_code' column\n")
        f.write("-- Generated from accounts_rows.csv\n\n")
        f.write("BEGIN;\n\n")
        
        for update in updates:
            f.write(update)
            f.write("\n\n")
        
        f.write("-- Verify the updates\n")
        f.write("SELECT COUNT(*) as total_with_legacy_code FROM accounts WHERE legacy_code IS NOT NULL;\n")
        f.write("SELECT COUNT(*) as still_null FROM accounts WHERE legacy_code IS NULL;\n")
        f.write("SELECT code, legacy_code FROM accounts LIMIT 20;\n\n")
        f.write("COMMIT;\n")
    
    print(f"SQL file generated: {output_file}")
    print(f"\nFirst 5 updates:")
    for update in updates[:5]:
        print(update)
        print()

if __name__ == "__main__":
    main()
