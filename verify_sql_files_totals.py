#!/usr/bin/env python3
"""
Verify that all 30 SQL import files will produce the expected totals.
This script reads all SQL files and calculates:
- Total number of lines
- Total debit amount
- Total credit amount
"""

import re
import os
from decimal import Decimal

def extract_values_from_sql_file(filepath):
    """Extract all VALUES rows from a SQL file and parse amounts."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the VALUES section
    values_match = re.search(r'VALUES\s*\n(.*?)\) AS temp_lines', content, re.DOTALL)
    if not values_match:
        print(f"WARNING: Could not find VALUES section in {filepath}")
        return []
    
    values_section = values_match.group(1)
    
    # Parse each row - format: (row_num, txn_ref, account_id, ..., debit, credit, ...)
    # We need to extract debit_amount (position 7) and credit_amount (position 8)
    rows = []
    pattern = r'\((\d+),\s*\'([^\']*)\',\s*\'([^\']*)\',\s*\'([^\']*)\',\s*\'([^\']*)\',\s*\'([^\']*)\',\s*\'([^\']*)\',\s*([\d.]+),\s*([\d.]+),'
    
    for match in re.finditer(pattern, values_section):
        row_num = int(match.group(1))
        txn_ref = match.group(2)
        account_id = match.group(3)
        debit = Decimal(match.group(8))
        credit = Decimal(match.group(9))
        
        # Check if this row will be filtered by WHERE clause
        # Filter conditions:
        # 1. Both debit and credit are zero
        # 2. account_id is NULL or empty
        # 3. account_id is all-zeros UUID
        
        if debit == 0 and credit == 0:
            continue  # Filtered out
        
        if not account_id or account_id == '00000000-0000-0000-0000-000000000000':
            continue  # Filtered out
        
        rows.append({
            'row_num': row_num,
            'txn_ref': txn_ref,
            'account_id': account_id,
            'debit': debit,
            'credit': credit
        })
    
    return rows

def main():
    print("=" * 80)
    print("VERIFYING ALL 30 SQL IMPORT FILES")
    print("=" * 80)
    print()
    
    total_lines = 0
    total_debits = Decimal('0')
    total_credits = Decimal('0')
    
    files_dir = 'transaction_lines_split'
    
    for i in range(1, 31):
        filename = f'import_transaction_lines_part_{i:02d}.sql'
        filepath = os.path.join(files_dir, filename)
        
        if not os.path.exists(filepath):
            print(f"ERROR: File not found: {filepath}")
            continue
        
        rows = extract_values_from_sql_file(filepath)
        
        file_debits = sum(row['debit'] for row in rows)
        file_credits = sum(row['credit'] for row in rows)
        
        total_lines += len(rows)
        total_debits += file_debits
        total_credits += file_credits
        
        print(f"Part {i:02d}: {len(rows):5d} lines | Debits: {file_debits:15,.2f} | Credits: {file_credits:15,.2f}")
    
    print()
    print("=" * 80)
    print("TOTALS AFTER IMPORT")
    print("=" * 80)
    print(f"Total Lines:   {total_lines:,}")
    print(f"Total Debits:  {total_debits:,.2f}")
    print(f"Total Credits: {total_credits:,.2f}")
    print(f"Difference:    {total_debits - total_credits:,.2f}")
    print()
    print("=" * 80)
    print("EXPECTED VALUES (from Excel)")
    print("=" * 80)
    print(f"Expected Lines:   14,161")
    print(f"Expected Balance: 905,925,674.8")
    print()
    print("=" * 80)
    print("VERIFICATION RESULTS")
    print("=" * 80)
    
    expected_lines = 14161
    expected_balance = Decimal('905925674.8')
    
    lines_match = total_lines == expected_lines
    balance_match = abs(total_debits - expected_balance) < Decimal('0.01') and abs(total_credits - expected_balance) < Decimal('0.01')
    balanced = abs(total_debits - total_credits) < Decimal('0.01')
    
    print(f"✓ Lines count matches:     {lines_match} ({total_lines} vs {expected_lines})")
    print(f"✓ Balance matches:         {balance_match} ({total_debits:,.2f} vs {expected_balance:,.2f})")
    print(f"✓ Debits = Credits:        {balanced} (difference: {total_debits - total_credits:,.2f})")
    print()
    
    if lines_match and balance_match and balanced:
        print("✅ ALL CHECKS PASSED - SQL files are correct!")
    else:
        print("❌ VERIFICATION FAILED - SQL files need correction")
        if not lines_match:
            print(f"   - Line count mismatch: {total_lines - expected_lines:+,} lines")
        if not balance_match:
            print(f"   - Balance mismatch: {total_debits - expected_balance:+,.2f}")
        if not balanced:
            print(f"   - Not balanced: {total_debits - total_credits:+,.2f}")
    
    print("=" * 80)

if __name__ == '__main__':
    main()
