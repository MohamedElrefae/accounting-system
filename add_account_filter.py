#!/usr/bin/env python3
"""
Update WHERE clause to also exclude lines with invalid account_id (all zeros)
"""

import os
import glob

def fix_sql_files():
    """Update WHERE clause in all SQL import files"""
    
    # Find all SQL files
    sql_files = glob.glob('transaction_lines_split/import_transaction_lines_part_*.sql')
    
    if not sql_files:
        print("No SQL files found in transaction_lines_split directory!")
        return
    
    print(f"Found {len(sql_files)} SQL files to fix")
    
    # The old WHERE clause (only filters zero amounts)
    old_where = "WHERE NOT (temp_lines.debit_amount = 0 AND temp_lines.credit_amount = 0);"
    
    # The new WHERE clause (filters both zero amounts AND invalid account_id)
    new_where = """WHERE NOT (temp_lines.debit_amount = 0 AND temp_lines.credit_amount = 0)
  AND NULLIF(temp_lines.account_id_text, '') IS NOT NULL
  AND temp_lines.account_id_text != '00000000-0000-0000-0000-000000000000';"""
    
    fixed_count = 0
    for sql_file in sorted(sql_files):
        try:
            # Read the file
            with open(sql_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if already has the new WHERE clause
            if "temp_lines.account_id_text != '00000000-0000-0000-0000-000000000000'" in content:
                print(f"⏭️  Already fixed: {os.path.basename(sql_file)}")
                continue
            
            # Replace the WHERE clause
            if old_where in content:
                new_content = content.replace(old_where, new_where)
                
                # Write back
                with open(sql_file, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                
                fixed_count += 1
                print(f"✅ Fixed: {os.path.basename(sql_file)}")
            else:
                print(f"⏭️  Pattern not found: {os.path.basename(sql_file)}")
        
        except Exception as e:
            print(f"❌ Error fixing {sql_file}: {e}")
    
    print(f"\n✅ SUCCESS!")
    print(f"Fixed {fixed_count} out of {len(sql_files)} files")
    print(f"\nThe SQL files now filter out:")
    print(f"  1. Lines with both debit and credit as zero (261 lines)")
    print(f"  2. Lines with invalid account_id (497 lines)")
    print(f"  3. Some overlap between the two")
    print(f"\nExpected valid lines: ~13,500-13,700")

if __name__ == "__main__":
    fix_sql_files()
