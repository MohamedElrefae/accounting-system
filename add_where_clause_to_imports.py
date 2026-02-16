#!/usr/bin/env python3
"""
Add WHERE clause to filter out lines with both debit and credit as zero
"""

import os
import glob

def fix_sql_files():
    """Add WHERE clause to all SQL import files"""
    
    # Find all SQL files
    sql_files = glob.glob('transaction_lines_split/import_transaction_lines_part_*.sql')
    
    if not sql_files:
        print("No SQL files found in transaction_lines_split directory!")
        return
    
    print(f"Found {len(sql_files)} SQL files to fix")
    
    # The old ending (without WHERE clause)
    old_ending = "JOIN transactions t ON t.reference_number = temp_lines.transaction_ref::text AND t.org_id = NULLIF(temp_lines.org_id_text, '')::uuid;"
    
    # The new ending (with WHERE clause)
    new_ending = """JOIN transactions t ON t.reference_number = temp_lines.transaction_ref::text AND t.org_id = NULLIF(temp_lines.org_id_text, '')::uuid
WHERE NOT (temp_lines.debit_amount = 0 AND temp_lines.credit_amount = 0);"""
    
    fixed_count = 0
    for sql_file in sorted(sql_files):
        try:
            # Read the file
            with open(sql_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if already has WHERE clause
            if 'WHERE NOT (temp_lines.debit_amount = 0 AND temp_lines.credit_amount = 0)' in content:
                print(f"⏭️  Already fixed: {os.path.basename(sql_file)}")
                continue
            
            # Replace the ending
            if old_ending in content:
                new_content = content.replace(old_ending, new_ending)
                
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
    print(f"\nThe SQL files now have a WHERE clause to exclude lines with both debit and credit as zero.")
    print(f"This prevents violations of the chk_tl_one_side_positive constraint.")

if __name__ == "__main__":
    fix_sql_files()
