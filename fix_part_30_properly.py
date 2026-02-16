#!/usr/bin/env python3
"""
Fix Part 30 SQL file - remove invalid rows and add correct closing section.
"""

def fix_part_30():
    input_file = 'transaction_lines_split/import_transaction_lines_part_30.sql'
    
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the last valid row (row 386)
    last_valid_marker = "(386, '3774', '5be46bf3-28f2-4dde-a8c4-aa51c100e176', '316fc553-5b45-4d28-a6f9-825dbb540655', 'af651532-9f5d-4ae3-b327-5f98e271684b', '7f050fd9-eb44-448c-bb8d-55fae06ba318', '03e674a1-33fa-4e03-8c37-0c34436fedb4', 0.00, 2003000.00, 'اقفال وارد اضافات راس المال من الخارج', '', 'd5789445-11e3-4ad6-9297-b56521675114'),"
    
    # Find where this row ends
    idx = content.find(last_valid_marker)
    if idx == -1:
        print("ERROR: Could not find row 386")
        return
    
    # Find the end of this line (including the comma and newline)
    end_idx = content.find('\n', idx) + 1
    
    # Keep everything up to and including row 386
    fixed_content = content[:end_idx]
    
    # Add the correct closing section
    closing_section = """) AS temp_lines(
    row_num,
    txn_ref, 
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
)
JOIN transactions t ON t.reference_number = temp_lines.txn_ref AND t.org_id = temp_lines.org_id
WHERE NOT (temp_lines.debit_amount = 0 AND temp_lines.credit_amount = 0)
  AND temp_lines.account_id IS NOT NULL
  AND temp_lines.account_id != '00000000-0000-0000-0000-000000000000';

-- Verification query for this batch
SELECT 
    COUNT(*) as imported_lines_this_batch,
    SUM(debit_amount) as batch_debits,
    SUM(credit_amount) as batch_credits
FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
AND created_at >= NOW() - INTERVAL '1 minute';
"""
    
    fixed_content += closing_section
    
    # Write the fixed file
    with open(input_file, 'w', encoding='utf-8') as f:
        f.write(fixed_content)
    
    print(f"✓ Fixed {input_file}")
    print(f"  - Removed invalid rows 387-449")
    print(f"  - Added correct closing section with row_num column")
    print(f"  - Added WHERE clause to filter invalid data")
    print(f"  - File now ends at row 386 with proper SQL closing")

if __name__ == '__main__':
    fix_part_30()
