#!/usr/bin/env python3
"""
Fix the column list in all transaction_lines SQL files to include row_num
"""

import os
import glob
import re

def fix_sql_files():
    """Fix all SQL files in the transaction_lines_split directory"""
    
    # Find all SQL files
    sql_files = glob.glob('transaction_lines_split/import_transaction_lines_part_*.sql')
    
    if not sql_files:
        print("No SQL files found in transaction_lines_split directory!")
        return
    
    print(f"Found {len(sql_files)} SQL files to fix")
    
    # Pattern to match the column list
    pattern = r'\) AS temp_lines\(\s*transaction_ref,'
    replacement = r') AS temp_lines(\n    row_num,\n    transaction_ref,'
    
    fixed_count = 0
    for sql_file in sorted(sql_files):
        try:
            # Read the file
            with open(sql_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if it needs fixing (doesn't already have row_num)
            if re.search(pattern, content) and 'row_num,' not in content:
                # Replace the column list
                new_content = re.sub(pattern, replacement, content)
                
                # Write back
                with open(sql_file, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                
                fixed_count += 1
                print(f"✅ Fixed: {os.path.basename(sql_file)}")
            else:
                if 'row_num,' in content:
                    print(f"⏭️  Skipped (already has row_num): {os.path.basename(sql_file)}")
                else:
                    print(f"⏭️  Skipped (pattern not found): {os.path.basename(sql_file)}")
        
        except Exception as e:
            print(f"❌ Error fixing {sql_file}: {e}")
    
    print(f"\n✅ SUCCESS!")
    print(f"Fixed {fixed_count} out of {len(sql_files)} files")
    print(f"\nThe SQL files now have the correct column list with row_num as the first column.")
    print(f"You can now run them in Supabase SQL Editor.")

if __name__ == "__main__":
    fix_sql_files()
