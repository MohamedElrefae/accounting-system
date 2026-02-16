#!/usr/bin/env python3
"""
Split the large transaction_lines SQL into 30 smaller files for Supabase SQL Editor
"""

import re
import os

def split_transaction_lines_sql():
    """Split the import_transactions_complete.sql file into smaller chunks"""
    
    # Read the original file
    with open('import_transactions_complete.sql', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the transaction lines section
    lines_start = content.find("-- INSERT TRANSACTION LINES")
    if lines_start == -1:
        lines_start = content.find("INSERT INTO transaction_lines")
    
    if lines_start == -1:
        print("Could not find transaction lines section!")
        return
    
    # Extract the transaction lines part
    lines_section = content[lines_start:]
    
    # Find all INSERT statements for transaction_lines
    insert_pattern = r"INSERT INTO transaction_lines.*?VALUES\s*"
    values_pattern = r"\([^)]*\)(?:,\s*\([^)]*\))*"
    
    # Find the INSERT statement
    insert_match = re.search(insert_pattern, lines_section, re.DOTALL)
    if not insert_match:
        print("Could not find INSERT INTO transaction_lines statement!")
        return
    
    insert_statement = insert_match.group(0)
    
    # Find all value tuples
    values_start = insert_match.end()
    values_section = lines_section[values_start:]
    
    # Split by individual value tuples
    # Look for patterns like ('value1', 'value2', ...), 
    tuple_pattern = r"\([^)]+\)"
    tuples = re.findall(tuple_pattern, values_section)
    
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

{insert_statement}
{',\n'.join(chunk_tuples)};

-- Verification query for this batch
SELECT 
    COUNT(*) as imported_lines,
    MIN(created_at) as first_record,
    MAX(created_at) as last_record
FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
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

-- IMPORTANT: Run the transaction import first if you haven't already:
-- The transactions were imported successfully with less than 3000 records

-- Then run these transaction lines files in order:
"""
    
    for i in range(1, file_count + 1):
        master_script += f"-- {i}. import_transaction_lines_part_{i:02d}.sql\n"
    
    master_script += f"""
-- After importing all files, run this verification:
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