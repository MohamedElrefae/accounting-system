#!/usr/bin/env python3
"""
Fix line_no generation to handle existing lines and avoid duplicates
"""

import os
import glob
import re

def fix_sql_files():
    """Update all SQL files to use ON CONFLICT for line_no duplicates"""
    
    # Find all SQL files
    sql_files = glob.glob('transaction_lines_split/import_transaction_lines_part_*.sql')
    
    if not sql_files:
        print("No SQL files found in transaction_lines_split directory!")
        return
    
    print(f"Found {len(sql_files)} SQL files to fix")
    
    # Find the ROW_NUMBER line and replace it with a better approach
    old_row_number = "    ROW_NUMBER() OVER (PARTITION BY t.id ORDER BY (SELECT NULL)) as line_no,"
    
    # New approach: Calculate line_no based on existing lines + row_num
    new_row_number = """    COALESCE(
        (SELECT MAX(line_no) FROM transaction_lines WHERE transaction_id = t.id),
        0
    ) + temp_lines.row_num as line_no,"""
    
    fixed_count = 0
    for sql_file in sorted(sql_files):
        try:
            # Read the file
            with open(sql_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if already fixed
            if "SELECT MAX(line_no) FROM transaction_lines" in content:
                print(f"⏭️  Already fixed: {os.path.basename(sql_file)}")
                continue
            
            # Replace the ROW_NUMBER calculation
            if old_row_number in content:
                new_content = content.replace(old_row_number, new_row_number)
                
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
    print(f"\nThe SQL files now calculate line_no based on existing lines in the database.")
    print(f"This prevents duplicate key violations when running multiple import files.")
    print(f"\nIMPORTANT: You need to re-run Part 02 and continue with the remaining files.")

if __name__ == "__main__":
    fix_sql_files()
