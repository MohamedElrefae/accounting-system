#!/usr/bin/env python3
"""
Fix SQL files to exclude lines where both debit and credit are zero
These lines violate the chk_tl_one_side_positive constraint
"""

import os
import glob
import re

def fix_sql_files():
    """Fix all SQL files to filter out zero lines"""
    
    # Find all SQL files
    sql_files = glob.glob('transaction_lines_split/import_transaction_lines_part_*.sql')
    
    if not sql_files:
        print("No SQL files found in transaction_lines_split directory!")
        return
    
    print(f"Found {len(sql_files)} SQL files to fix")
    
    fixed_count = 0
    total_lines_removed = 0
    
    for sql_file in sorted(sql_files):
        try:
            # Read the file
            with open(sql_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find the VALUES section
            values_pattern = r'VALUES\s*\n(.*?)\) AS temp_lines'
            match = re.search(values_pattern, content, re.DOTALL)
            
            if not match:
                print(f"⏭️  Skipped (no VALUES found): {os.path.basename(sql_file)}")
                continue
            
            values_section = match.group(1)
            
            # Split into individual lines
            lines = []
            current_line = ""
            paren_count = 0
            
            for char in values_section:
                current_line += char
                if char == '(':
                    paren_count += 1
                elif char == ')':
                    paren_count -= 1
                    if paren_count == 0:
                        # Complete record found
                        line = current_line.strip()
                        if line.startswith('('):
                            lines.append(line)
                        current_line = ""
            
            # Filter out lines with both debit and credit as 0.00
            filtered_lines = []
            removed_count = 0
            
            for line in lines:
                # Extract the debit and credit amounts (they are the 8th and 9th values)
                # Format: (row_num, 'txn_ref', 'account', 'class', 'proj', 'work', 'sub', debit, credit, ...)
                values = re.findall(r"'[^']*'|[\d.]+", line)
                
                if len(values) >= 9:
                    try:
                        debit = float(values[7])
                        credit = float(values[8])
                        
                        # Skip lines where both are zero
                        if debit == 0.0 and credit == 0.0:
                            removed_count += 1
                            continue
                    except (ValueError, IndexError):
                        pass  # Keep the line if we can't parse it
                
                filtered_lines.append(line)
            
            if removed_count == 0:
                print(f"⏭️  No changes needed: {os.path.basename(sql_file)}")
                continue
            
            # Rebuild the VALUES section
            new_values = ',\n'.join(filtered_lines)
            
            # Replace in content
            new_content = re.sub(
                values_pattern,
                f'VALUES\n{new_values}\n) AS temp_lines',
                content,
                flags=re.DOTALL
            )
            
            # Update the record count in the header comment
            # Find the current count
            header_match = re.search(r'-- Records (\d+) to (\d+)', new_content)
            if header_match:
                start_num = int(header_match.group(1))
                old_end_num = int(header_match.group(2))
                new_end_num = start_num + len(filtered_lines) - 1
                new_content = re.sub(
                    r'-- Records \d+ to \d+',
                    f'-- Records {start_num} to {new_end_num}',
                    new_content
                )
            
            # Write back
            with open(sql_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            fixed_count += 1
            total_lines_removed += removed_count
            print(f"✅ Fixed: {os.path.basename(sql_file)} (removed {removed_count} zero lines)")
        
        except Exception as e:
            print(f"❌ Error fixing {sql_file}: {e}")
    
    print(f"\n✅ SUCCESS!")
    print(f"Fixed {fixed_count} out of {len(sql_files)} files")
    print(f"Total lines removed: {total_lines_removed}")
    print(f"\nThe SQL files now exclude lines with both debit and credit as zero.")
    print(f"These lines would have violated the chk_tl_one_side_positive constraint.")

if __name__ == "__main__":
    fix_sql_files()
