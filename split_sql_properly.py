#!/usr/bin/env python3
"""
Split the large transaction_lines SQL into 30 smaller files for Supabase SQL Editor
Properly handles the SELECT...VALUES structure
"""

import re
import os

def split_transaction_lines_sql():
    """Split the import_transactions_complete.sql file into smaller chunks"""
    
    # Read the original file
    with open('import_transactions_complete.sql', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the transaction lines section
    start_marker = "INSERT INTO transaction_lines"
    start_pos = content.find(start_marker)
    
    if start_pos == -1:
        print("Could not find transaction lines INSERT statement!")
        return
    
    # Extract everything from the INSERT statement onwards
    lines_section = content[start_pos:]
    
    # Find the VALUES section
    values_start = lines_section.find("VALUES")
    if values_start == -1:
        print("Could not find VALUES clause!")
        return
    
    # Extract the part before VALUES (the INSERT and SELECT structure)
    insert_select_part = lines_section[:values_start + 6]  # Include "VALUES"
    
    # Extract the values part
    values_part = lines_section[values_start + 6:].strip()
    
    # Remove the final semicolon and any trailing content
    if values_part.endswith(';'):
        values_part = values_part[:-1]
    
    # Split the values by complete tuples
    # Each tuple starts with ( and ends with ), and may span multiple lines
    tuples = []
    current_tuple = ""
    paren_count = 0
    in_string = False
    escape_next = False
    
    i = 0
    while i < len(values_part):
        char = values_part[i]
        
        if escape_next:
            current_tuple += char
            escape_next = False
        elif char == '\\':
            current_tuple += char
            escape_next = True
        elif char == "'" and not escape_next:
            current_tuple += char
            in_string = not in_string
        elif not in_string:
            if char == '(':
                paren_count += 1
                current_tuple += char
            elif char == ')':
                paren_count -= 1
                current_tuple += char
                if paren_count == 0:
                    # Complete tuple found
                    tuples.append(current_tuple.strip())
                    current_tuple = ""
                    # Skip any comma and whitespace after the tuple
                    i += 1
                    while i < len(values_part) and values_part[i] in ', \n\t':
                        i += 1
                    i -= 1  # Adjust for the increment at the end of the loop
            else:
                current_tuple += char
        else:
            current_tuple += char
        
        i += 1
    
    # Handle any remaining content
    if current_tuple.strip():
        tuples.append(current_tuple.strip())
    
    print(f"Found {len(tuples)} transaction line records")
    
    # Calculate records per file (aim for 30 files)
    records_per_file = max(1, len(tuples) // 30)
    if len(tuples) % 30 > 0:
        records_per_file += 1
    
    print(f"Will create files with approximately {records_per_file} records each")
    
    # Create output directory
    os.makedirs('transaction_lines_split', exist_ok=True)
    
    # Split into files
    file_count = 0
    for i in range(0, len(tuples), records_per_file):
        file_count += 1
        chunk_tuples = tuples[i:i + records_per_file]
        
        # Create the SQL content for this chunk
        sql_content = f"""-- Transaction Lines Import - Part {file_count} of {min(30, (len(tuples) + records_per_file - 1) // records_per_file)}
-- Records {i+1} to {min(i + len(chunk_tuples), len(tuples))}
-- Organization ID: d5789445-11e3-4ad6-9297-b56521675114

{insert_select_part}
{',\n'.join(chunk_tuples)}
) AS temp_lines(transaction_ref, account_id, classification_id, project_id, analysis_work_item_id, sub_tree_id, debit_amount, credit_amount, description, notes, org_id)
JOIN transactions t ON t.reference_number = temp_lines.transaction_ref AND t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Verification query for this batch
SELECT 
    COUNT(*) as imported_lines_this_batch,
    SUM(debit_amount) as batch_debits,
    SUM(credit_amount) as batch_credits
FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
AND created_at >= NOW() - INTERVAL '1 minute';
"""
        
        # Write to file
        filename = f'transaction_lines_split/import_transaction_lines_part_{file_count:02d}.sql'
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(sql_content)
        
        print(f"Created {filename} with {len(chunk_tuples)} records")
    
    # Create a master execution script
    master_script = f"""-- TRANSACTION LINES IMPORT MASTER SCRIPT
-- Run these files in order in Supabase SQL Editor
-- Total files: {file_count}
-- Total records: {len(tuples)}

-- IMPORTANT: Transactions were imported successfully (less than 3000 records)
-- Now import the transaction lines in batches

-- INSTRUCTIONS:
-- 1. Copy and paste each file's content into Supabase SQL Editor
-- 2. Run them in order (part 01, then 02, then 03, etc.)
-- 3. Each file should complete successfully
-- 4. Run the final verification at the end

-- Run these transaction lines files in order:
"""
    
    for i in range(1, file_count + 1):
        records_in_file = records_per_file if i < file_count else len(tuples) - (i-1) * records_per_file
        master_script += f"-- {i:2d}. import_transaction_lines_part_{i:02d}.sql ({records_in_file} records)\n"
    
    master_script += f"""
-- After importing all files, run this final verification:
SELECT 
    COUNT(*) as total_transaction_lines,
    COUNT(DISTINCT transaction_id) as unique_transactions,
    SUM(debit_amount) as total_debits,
    SUM(credit_amount) as total_credits,
    MIN(created_at) as first_import,
    MAX(created_at) as last_import
FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Expected results:
-- total_transaction_lines: {len(tuples)}
-- total_debits should equal total_credits

-- Check for any unbalanced transactions:
SELECT 
    t.reference_number,
    t.total_debit,
    t.total_credit,
    SUM(tl.debit_amount) as line_debits,
    SUM(tl.credit_amount) as line_credits,
    CASE 
        WHEN ABS(t.total_debit - SUM(tl.debit_amount)) < 0.01 AND ABS(t.total_credit - SUM(tl.credit_amount)) < 0.01
        THEN 'BALANCED' 
        ELSE 'UNBALANCED' 
    END as status
FROM transactions t
JOIN transaction_lines tl ON t.id = tl.transaction_id
WHERE t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
GROUP BY t.id, t.reference_number, t.total_debit, t.total_credit
HAVING ABS(t.total_debit - SUM(tl.debit_amount)) >= 0.01 OR ABS(t.total_credit - SUM(tl.credit_amount)) >= 0.01
LIMIT 10;

-- If the above query returns no rows, all transactions are properly balanced!

-- Summary by account:
SELECT 
    a.code,
    a.name,
    COUNT(*) as line_count,
    SUM(tl.debit_amount) as total_debits,
    SUM(tl.credit_amount) as total_credits
FROM transaction_lines tl
JOIN accounts a ON tl.account_id = a.id
WHERE tl.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
GROUP BY a.id, a.code, a.name
ORDER BY total_debits + total_credits DESC
LIMIT 20;
"""
    
    with open('transaction_lines_split/00_MASTER_IMPORT_GUIDE.sql', 'w', encoding='utf-8') as f:
        f.write(master_script)
    
    print(f"\n✅ SUCCESS!")
    print(f"Created {file_count} SQL files in 'transaction_lines_split/' directory")
    print(f"Each file contains approximately {records_per_file} records")
    print(f"Total records split: {len(tuples)}")
    print(f"\nNext steps:")
    print(f"1. Open the 'transaction_lines_split' folder")
    print(f"2. Start with '00_MASTER_IMPORT_GUIDE.sql' for instructions")
    print(f"3. Run each part file (01, 02, 03...) in Supabase SQL Editor")
    print(f"4. Each file should run safely within Supabase limits")

if __name__ == "__main__":
    split_transaction_lines_sql()