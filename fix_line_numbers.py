import os
import re
from pathlib import Path

def fix_sql_file(filepath):
    """Fix a single SQL file to add line_no column and generate sequential line numbers"""
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace the INSERT statement to include line_no
    old_insert = """INSERT INTO transaction_lines (
    transaction_id,
    account_id,
    classification_id,
    project_id,
    analysis_work_item_id,
    sub_tree_id,
    debit_amount,
    credit_amount,
    description,
    notes,
    org_id
)"""
    
    new_insert = """INSERT INTO transaction_lines (
    transaction_id,
    line_no,
    account_id,
    classification_id,
    project_id,
    analysis_work_item_id,
    sub_tree_id,
    debit_amount,
    credit_amount,
    description,
    notes,
    org_id
)"""
    
    content = content.replace(old_insert, new_insert)
    
    # Update the SELECT to include line_no with ROW_NUMBER
    old_select = """SELECT 
    t.id as transaction_id,
    temp_lines.account_id_text::uuid as account_id,"""
    
    new_select = """SELECT 
    t.id as transaction_id,
    ROW_NUMBER() OVER (PARTITION BY t.id ORDER BY temp_lines.row_num) as line_no,
    temp_lines.account_id_text::uuid as account_id,"""
    
    content = content.replace(old_select, new_select)
    
    # Update the temp table to include transaction_ref and row_num
    old_values_start = "FROM (\n    VALUES"
    new_values_start = "FROM (\n    VALUES"
    
    # Find the VALUES section and add row numbers
    values_pattern = r"FROM \(\s*VALUES\s*\n(.*?)\) AS temp_lines"
    match = re.search(values_pattern, content, re.DOTALL)
    
    if match:
        values_section = match.group(1)
        lines = values_section.strip().split('\n')
        
        new_lines = []
        row_num = 1
        for line in lines:
            if line.strip().startswith('('):
                # Add row number as first column in each row
                modified_line = line.replace('(', f'({row_num}, ', 1)
                new_lines.append(modified_line)
                row_num += 1
            else:
                new_lines.append(line)
        
        new_values_section = '\n'.join(new_lines)
        
        # Update the temp table column definition
        old_temp_def = ") AS temp_lines (transaction_ref, account_id_text, classification_id_text, project_id_text, analysis_work_item_id_text, sub_tree_id_text, debit_amount, credit_amount, description, notes, org_id_text)"
        new_temp_def = ") AS temp_lines (row_num, transaction_ref, account_id_text, classification_id_text, project_id_text, analysis_work_item_id_text, sub_tree_id_text, debit_amount, credit_amount, description, notes, org_id_text)"
        
        content = re.sub(
            r"\) AS temp_lines \([^)]+\)",
            new_temp_def,
            content
        )
        
        # Replace the values section
        content = re.sub(
            values_pattern,
            f"FROM (\n    VALUES\n{new_values_section}\n) AS temp_lines",
            content,
            flags=re.DOTALL
        )
    
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
print("Files now include line_no column with sequential numbering per transaction")
