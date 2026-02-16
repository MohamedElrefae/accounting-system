#!/usr/bin/env python3
"""
Fix Part 30 SQL file by removing invalid rows and duplicate closing sections.
"""

def fix_part_30():
    input_file = 'transaction_lines_split/import_transaction_lines_part_30.sql'
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find the line with row 386 (last valid row before invalid data)
    # Then skip all invalid rows (387-449) and the first incorrect closing section
    # Keep only the correct closing section with proper column list and WHERE clause
    
    output_lines = []
    skip_mode = False
    found_last_valid = False
    
    for i, line in enumerate(lines):
        # Look for row 386 (last valid row)
        if "(386, '3774', '5be46bf3-28f2-4dde-a8c4-aa51c100e176'" in line:
            output_lines.append(line)
            found_last_valid = True
            skip_mode = True
            continue
        
        # If we're in skip mode, look for the SECOND closing section (the correct one)
        if skip_mode:
            # Look for the correct closing section that starts with ") AS temp_lines("
            # and has "row_num" as the first column
            if ") AS temp_lines(" in line and "row_num," in line:
                # Found the correct closing section, stop skipping
                skip_mode = False
                output_lines.append(line)
                continue
            else:
                # Skip this line (it's part of invalid data or first incorrect closing)
                continue
        
        # Normal mode: keep the line
        output_lines.append(line)
    
    # Write the fixed file
    with open(input_file, 'w', encoding='utf-8') as f:
        f.writelines(output_lines)
    
    print(f"✓ Fixed {input_file}")
    print(f"  - Removed invalid rows 387-449 (all with txn_ref='0' and invalid account_id)")
    print(f"  - Removed duplicate/incorrect closing section")
    print(f"  - Kept correct closing with row_num column and WHERE clause")

if __name__ == '__main__':
    fix_part_30()
