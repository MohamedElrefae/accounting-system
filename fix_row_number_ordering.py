import os
import re
from pathlib import Path

def fix_sql_file(filepath):
    """Fix the ROW_NUMBER window function to not reference row_num"""
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix the ROW_NUMBER clause - remove the ORDER BY temp_lines.row_num
    # Since rows are already in order in the VALUES, we can just use an empty ORDER BY or a constant
    old_row_number = "ROW_NUMBER() OVER (PARTITION BY t.id ORDER BY temp_lines.row_num) as line_no,"
    new_row_number = "ROW_NUMBER() OVER (PARTITION BY t.id ORDER BY (SELECT NULL)) as line_no,"
    
    content = content.replace(old_row_number, new_row_number)
    
    # Write the fixed content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return True

# Process all files
split_dir = Path('transaction_lines_split')
files = sorted(split_dir.glob('import_transaction_lines_part_*.sql'))

print(f"Found {len(files)} files to fix")

for filepath in files:
    try:
        fix_sql_file(filepath)
        print(f"Fixed {filepath.name}")
    except Exception as e:
        print(f"Error fixing {filepath.name}: {e}")

print("\n✅ All files fixed!")
print("ROW_NUMBER now uses natural row order within each transaction")
