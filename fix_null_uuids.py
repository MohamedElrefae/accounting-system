import os
import re
from pathlib import Path

def fix_sql_file(filepath):
    """Fix UUID casting to handle empty strings by converting them to NULL"""
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix all UUID column castings to use NULLIF for empty strings
    # This converts empty strings to NULL before casting to UUID
    
    replacements = [
        # account_id
        ("temp_lines.account_id_text::uuid as account_id,", 
         "NULLIF(temp_lines.account_id_text, '')::uuid as account_id,"),
        
        # classification_id  
        ("temp_lines.classification_id_text::uuid as classification_id,",
         "NULLIF(temp_lines.classification_id_text, '')::uuid as classification_id,"),
        
        # project_id
        ("temp_lines.project_id_text::uuid as project_id,",
         "NULLIF(temp_lines.project_id_text, '')::uuid as project_id,"),
        
        # analysis_work_item_id
        ("temp_lines.analysis_work_item_id_text::uuid as analysis_work_item_id,",
         "NULLIF(temp_lines.analysis_work_item_id_text, '')::uuid as analysis_work_item_id,"),
        
        # sub_tree_id
        ("temp_lines.sub_tree_id_text::uuid as sub_tree_id,",
         "NULLIF(temp_lines.sub_tree_id_text, '')::uuid as sub_tree_id,"),
        
        # org_id
        ("temp_lines.org_id_text::uuid as org_id",
         "NULLIF(temp_lines.org_id_text, '')::uuid as org_id"),
        
        # Also fix the JOIN clause
        ("AND t.org_id = temp_lines.org_id_text::uuid;",
         "AND t.org_id = NULLIF(temp_lines.org_id_text, '')::uuid;")
    ]
    
    for old, new in replacements:
        content = content.replace(old, new)
    
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
print("UUID columns now use NULLIF to handle empty strings (converts '' to NULL before casting)")
