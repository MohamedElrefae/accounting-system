#!/usr/bin/env python3
"""
Split the large transaction_lines SQL into 30 smaller files for Supabase SQL Editor
Fixed version that properly handles the SQL structure
"""

import re
import os

def split_transaction_lines_sql():
    """Split the import_transactions_complete.sql file into smaller chunks"""
    
    # Read the original file
    with open('import_transactions_complete.sql', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the transaction lines section - look for the actual INSERT statement
    lines_pattern = r"INSERT INTO transaction_lines.*?VALUES\s*\n(.*?)(?=\n\n|\n--|\nSELECT|\Z)"
    match = re.search(lines_pattern, content, re.DOTALL)
    
    if not match:
        print("Could not find transaction lines INSERT statement!")
        return
    
    values_section = match.group(1).strip()
    
    # Split the values by lines, each line should be a complete record
    lines = []
    current_line = ""
    paren_count = 0
    
    for char in values_section:
        current_line += char
        if char == '(':
            paren_count += 1
        elif char == ')':
            paren_count -= 1
            if paren_count == 0 and (current_line.strip().endswith('),') or current_line.strip().endswith(');')):
                # Complete record found
                line = current_line.strip()
                if line.endswith(','):
                    line = line[:-1]  # Remove trailing comma
                if line.endswith(';'):
                    line = line[:-1]  # Remove trailing semicolon
                lines.append(line)
                current_line = ""
    
    # Handle any remaining content
    if current_line.strip():
        line = current_line.strip()
        if line.endswith(','):
            line = line[:-1]
        if line.endswith(';'):
            line = line[:-1]
        lines.append(line)
    
    print(f"Found {len(lines)} transaction line records")
    
    # Calculate records per file (aim for 30 files)
    records_per_file = max(1, len(lines) // 30)
    if len(lines) % 30 > 0:
        records_per_file += 1
    
    print(f"Will create files with approximately {records_per_file} records each")
    
    # Create output directory
    os.makedirs('transaction_lines_split', exist_ok=True)
    
    # Split into files
    file_count = 0
    for i in range(0, len(lines), records_per_file):
        file_count += 1
        chunk_lines = lines[i:i + records_per_file]
        
        # Create the SQL content for this chunk
        sql_content = f"""-- Transaction Lines Import - Part {file_count} of {min(30, (len(lines) + records_per_file - 1) // records_per_file)}
-- Records {i+1} to {min(i + len(chunk_lines), len(lines))}
-- Organization ID: d5789445-11e3-4ad6-9297-b56521675114

INSERT INTO transaction_lines (
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
)
SELECT 
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
    temp_lines.org_id
FROM (
    VALUES
{',\n'.join(chunk_lines)}
) AS temp_lines(transaction_ref, account_id, classification_id, project_id, analysis_work_item_id, sub_tree_id, debit_amount, credit_amount, description, notes, org_id)
JOIN transactions t ON t.reference_number = temp_lines.transaction_ref AND t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Verification query for this batch
SELECT 
    COUNT(*) as imported_lines_this_batch
FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
AND created_at >= NOW() - INTERVAL '1 minute';
"""
        
        # Write to file
        filename = f'transaction_lines_split/import_transaction_lines_part_{file_count:02d}.sql'
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(sql_content)
        
        print(f"Created {filename} with {len(chunk_lines)} records")
    
    # Create a master execution script
    master_script = f"""-- TRANSACTION LINES IMPORT MASTER SCRIPT
-- Run these files in order in Supabase SQL Editor
-- Total files: {file_count}
-- Total records: {len(lines)}

-- IMPORTANT: Transactions were imported successfully (less than 3000 records)
-- Now import the transaction lines in batches

-- Run these transaction lines files in order:
"""
    
    for i in range(1, file_count + 1):
        master_script += f"-- {i}. import_transaction_lines_part_{i:02d}.sql ({records_per_file if i < file_count else len(lines) % records_per_file or records_per_file} records)\n"
    
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
-- total_transaction_lines: {len(lines)}
-- total_debits should equal total_credits

-- Check transaction balance
SELECT 
    t.reference_number,
    t.total_debit,
    t.total_credit,
    SUM(tl.debit_amount) as line_debits,
    SUM(tl.credit_amount) as line_credits,
    CASE 
        WHEN t.total_debit = SUM(tl.debit_amount) AND t.total_credit = SUM(tl.credit_amount) 
        THEN 'BALANCED' 
        ELSE 'UNBALANCED' 
    END as status
FROM transactions t
JOIN transaction_lines tl ON t.id = tl.transaction_id
WHERE t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
GROUP BY t.id, t.reference_number, t.total_debit, t.total_credit
HAVING t.total_debit != SUM(tl.debit_amount) OR t.total_credit != SUM(tl.credit_amount)
LIMIT 10;

-- If the above query returns no rows, all transactions are properly balanced!
"""
    
    with open('transaction_lines_split/00_MASTER_IMPORT_GUIDE.sql', 'w', encoding='utf-8') as f:
        f.write(master_script)
    
    print(f"\n✅ SUCCESS!")
    print(f"Created {file_count} SQL files in 'transaction_lines_split/' directory")
    print(f"Each file contains approximately {records_per_file} records")
    print(f"Total records split: {len(lines)}")
    print(f"\nNext steps:")
    print(f"1. Open the 'transaction_lines_split' folder")
    print(f"2. Start with '00_MASTER_IMPORT_GUIDE.sql' for instructions")
    print(f"3. Run each part file (01, 02, 03...) in Supabase SQL Editor")
    print(f"4. Each file should run safely within Supabase limits")

if __name__ == "__main__":
    split_transaction_lines_sql()