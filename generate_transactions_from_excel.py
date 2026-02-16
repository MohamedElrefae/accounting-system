#!/usr/bin/env python3
"""
Generate transactions table import SQL from Excel.
This reads the Excel file directly to get correct dates and transaction grouping.
"""

import pandas as pd
from pathlib import Path

ORG_ID = "d5789445-11e3-4ad6-9297-b56521675114"

def generate_transactions_sql():
    """Generate SQL to import transactions table from Excel."""
    
    excel_file = Path("transactions.xlsx")
    if not excel_file.exists():
        print(f"ERROR: {excel_file} not found")
        return False
    
    print(f"Reading Excel file: {excel_file}")
    
    # Read Excel - note the sheet name has trailing space
    df = pd.read_excel(excel_file, sheet_name='transactions ', header=0)
    
    # Strip whitespace from column names
    df.columns = df.columns.str.strip()
    
    print(f"✓ Read {len(df)} rows from Excel")
    
    # Remove invalid rows (same as CSV generation)
    df = df[df['entry no'].notna()].copy()
    df['entry no'] = pd.to_numeric(df['entry no'], errors='coerce')
    df = df[df['entry no'].notna()].copy()
    
    # Convert amounts to numeric
    df['debit'] = pd.to_numeric(df['debit'], errors='coerce').fillna(0)
    df['credit'] = pd.to_numeric(df['credit'], errors='coerce').fillna(0)
    
    # Filter out zero-amount rows (same as transaction_lines filtering)
    df_valid = df[~((df['debit'] == 0) & (df['credit'] == 0))].copy()
    
    print(f"✓ Valid rows after filtering: {len(df_valid)}")
    
    # Group by entry_no and entry_date to create transaction headers
    transactions = df_valid.groupby(['entry no', 'entry date']).agg({
        'debit': 'sum',
        'credit': 'sum',
        'description': 'first'
    }).reset_index()
    
    # Rename columns
    transactions = transactions.rename(columns={
        'entry no': 'entry_number',
        'entry date': 'entry_date',
        'debit': 'total_debits',
        'credit': 'total_credits'
    })
    
    print(f"✓ Unique transactions: {len(transactions)}")
    print(f"✓ Total debit: {transactions['total_debits'].sum():,.2f}")
    print(f"✓ Total credit: {transactions['total_credits'].sum():,.2f}")
    
    # Generate SQL
    output_file = Path("import_transactions.sql")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- Import Transactions Table\n")
        f.write(f"-- Organization ID: {ORG_ID}\n")
        f.write(f"-- Total transactions: {len(transactions)}\n")
        f.write(f"-- Generated from: {excel_file}\n\n")
        
        f.write("INSERT INTO transactions (\n")
        f.write("    entry_number,\n")
        f.write("    reference_number,\n")
        f.write("    entry_date,\n")
        f.write("    description,\n")
        f.write("    total_debits,\n")
        f.write("    total_credits,\n")
        f.write("    org_id\n")
        f.write(") VALUES\n")
        
        values_rows = []
        for idx, row in transactions.iterrows():
            # Escape single quotes in description
            desc = str(row['description']) if pd.notna(row['description']) else ''
            desc = desc.replace("'", "''")
            
            # Format date as YYYY-MM-DD
            entry_date = pd.to_datetime(row['entry_date']).strftime('%Y-%m-%d')
            
            # Convert entry_number to integer string (same value for both entry_number and reference_number)
            entry_num = str(int(row['entry_number']))
            
            values_row = f"    ('{entry_num}', '{entry_num}', '{entry_date}', '{desc}', {row['total_debits']}, {row['total_credits']}, '{ORG_ID}')"
            values_rows.append(values_row)
        
        f.write(",\n".join(values_rows))
        f.write(";\n\n")
        
        f.write("-- Verify import\n")
        f.write("SELECT \n")
        f.write("    COUNT(*) as transaction_count,\n")
        f.write("    SUM(total_debits) as total_debit,\n")
        f.write("    SUM(total_credits) as total_credit,\n")
        f.write("    SUM(total_debits) - SUM(total_credits) as balance\n")
        f.write(f"FROM transactions WHERE org_id = '{ORG_ID}';\n")
        f.write(f"-- Expected: {len(transactions)} transactions, {transactions['total_debits'].sum():,.2f} debit/credit, 0.00 balance\n")
    
    print(f"\n✅ Generated: {output_file}")
    print(f"✅ Ready to import {len(transactions)} transactions")
    
    return True

if __name__ == "__main__":
    import sys
    success = generate_transactions_sql()
    sys.exit(0 if success else 1)
