#!/usr/bin/env python3
"""
Fix the UUID casting issue in the split SQL files - Simple approach
"""

import os

def fix_uuid_casting_in_files():
    """Fix UUID casting in all split SQL files"""
    
    split_dir = 'transaction_lines_split'
    
    if not os.path.exists(split_dir):
        print("transaction_lines_split directory not found!")
        return
    
    # Get all part files
    part_files = [f for f in os.listdir(split_dir) if f.startswith('import_transaction_lines_part_')]
    part_files.sort()
    
    print(f"Found {len(part_files)} files to fix")
    
    for filename in part_files:
        filepath = os.path.join(split_dir, filename)
        
        # Read the file
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Simple string replacements to fix UUID casting
        
        # Fix the temp_lines column names
        content = content.replace(
            ") AS temp_lines(transaction_ref, account_id, classification_id, project_id, analysis_work_item_id, sub_tree_id, debit_amount, credit_amount, description, notes, org_id)",
            """) AS temp_lines(
    transaction_ref, 
    account_id_text, 
    classification_id_text, 
    project_id_text, 
    analysis_work_item_id_text, 
    sub_tree_id_text, 
    debit_amount, 
    credit_amount, 
    description, 
    notes, 
    org_id_text
)"""
        )
        
        # Fix the SELECT part to cast UUIDs
        old_select = """SELECT 
    t.id as transaction_id,
    temp_lines.account_id,
    temp_lines.classification_id,
    temp_lines.project_id,
    temp_lines.analysis_work_item_id,
    temp_lines.sub_tree_id,
    temp_lines.debit_amount,
    temp_lines.credit_amount,
    temp_lines.description,
    temp_lines.notes,
    temp_lines.org_id"""
        
        new_select = """SELECT 
    t.id as transaction_id,
    temp_lines.account_id_text::uuid as account_id,
    temp_lines.classification_id_text::uuid as classification_id,
    temp_lines.project_id_text::uuid as project_id,
    temp_lines.analysis_work_item_id_text::uuid as analysis_work_item_id,
    temp_lines.sub_tree_id_text::uuid as sub_tree_id,
    temp_lines.debit_amount,
    temp_lines.credit_amount,
    temp_lines.description,
    temp_lines.notes,
    temp_lines.org_id_text::uuid as org_id"""
        
        content = content.replace(old_select, new_select)
        
        # Fix the JOIN condition
        content = content.replace(
            "JOIN transactions t ON t.reference_number = temp_lines.transaction_ref AND t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114';",
            "JOIN transactions t ON t.reference_number = temp_lines.transaction_ref AND t.org_id = temp_lines.org_id_text::uuid;"
        )
        
        # Write the fixed content back
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Fixed {filename}")
    
    print(f"\n✅ Fixed UUID casting in {len(part_files)} files")
    print("The files now properly cast text values to UUID type")
    print("\nYou can now run the import files in Supabase SQL Editor!")

if __name__ == "__main__":
    fix_uuid_casting_in_files()