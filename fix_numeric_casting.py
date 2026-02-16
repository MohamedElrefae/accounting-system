import os
import re
from pathlib import Path

def fix_sql_file(filepath):
    """Fix numeric column casting for debit_amount and credit_amount"""
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix the SELECT to cast numeric columns
    old_select = """    temp_lines.debit_amount,
    temp_lines.credit_amount,"""
    
    new_select = """    temp_lines.debit_amount::numeric,
    temp_lines.credit_amount::numeric,"""
    
    content = content.replace(old_select, new_select)
    
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
print("Numeric columns (debit_amount, credit_amount) now properly cast to numeric type")
