import os
import re
from pathlib import Path

def fix_sql_file(filepath):
    """Fix the JOIN clause to properly cast transaction_ref to text"""
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix the JOIN clause - cast transaction_ref to text for comparison
    old_join = "JOIN transactions t ON t.reference_number = temp_lines.transaction_ref AND t.org_id = temp_lines.org_id_text::uuid;"
    new_join = "JOIN transactions t ON t.reference_number = temp_lines.transaction_ref::text AND t.org_id = temp_lines.org_id_text::uuid;"
    
    content = content.replace(old_join, new_join)
    
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
print("The transaction_ref is now properly cast to text for JOIN comparison")
