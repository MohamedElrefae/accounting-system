import csv
import os
from collections import defaultdict
from datetime import datetime

# Configuration
CSV_FILE_PATH = r'C:\5\accounting-systemr5\1\Manager_v4_Transactions_Mapped_upto15000.csv'
OUTPUT_TRANS_SQL = 'load_transactions_v4.sql'
OUTPUT_LINES_SQL = 'load_transaction_lines_v4.sql'
ORG_ID = 'd5789445-11e3-4ad6-9297-b56521675114'

def escape_sql(val):
    if val is None or val == '':
        return 'NULL'
    # Escape single quotes
    return "'" + str(val).replace("'", "''") + "'"

def parse_date(date_str):
    try:
        # Assuming format YYYY-MM-DD HH:MM:SS or similar
        # If it contains space, take first part
        if ' ' in date_str:
            date_str = date_str.split(' ')[0]
        return date_str
    except Exception:
        return None

def main():
    transactions = {} # Key: EntryNo, Value: {header items + lines list}
    
    print(f"Reading {CSV_FILE_PATH}...")
    
    with open(CSV_FILE_PATH, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            entry_no = row['EntryNo'].strip()
            if not entry_no:
                continue
                
            entry_date = parse_date(row['EntryDate'])
            narration = row['Narration']
            
            # Line details
            new_code = row['NewCode']
            debit = float(row['Debit'] or 0)
            credit = float(row['Credit'] or 0)
            
            if entry_no not in transactions:
                transactions[entry_no] = {
                    'entry_no': entry_no,
                    'entry_date': entry_date,
                    'description': narration,
                    'total_debits': 0.0,
                    'total_credits': 0.0,
                    'lines': []
                }
            
            transactions[entry_no]['total_debits'] += debit
            transactions[entry_no]['total_credits'] += credit
            transactions[entry_no]['lines'].append({
                'account_code': new_code,
                'description': narration,
                'debit': debit,
                'credit': credit
            })

    print(f"Found {len(transactions)} unique transactions.")

    # Generate Transactions SQL
    print(f"Generating {OUTPUT_TRANS_SQL}...")
    with open(OUTPUT_TRANS_SQL, 'w', encoding='utf-8') as f_tx:
        f_tx.write("-- Loading Transactions\n")
        f_tx.write(f"INSERT INTO public.transactions (org_id, reference_number, entry_number, entry_date, description, total_debits, total_credits, lines_total_count, created_at, updated_at, is_posted, status) VALUES\n")
        
        tx_values = []
        for i, (entry_no, tx) in enumerate(transactions.items()):
            # Using reference_number AND entry_number from EntryNo
            
            val = f"('{ORG_ID}', {escape_sql(entry_no)}, {escape_sql(entry_no)}, {escape_sql(tx['entry_date'])}, {escape_sql(tx['description'])}, {tx['total_debits']}, {tx['total_credits']}, {len(tx['lines'])}, NOW(), NOW(), true, 'posted')"
            tx_values.append(val)
            
            if (i + 1) % 50 == 0:
                f_tx.write(",\n".join(tx_values) + ";\n")
                f_tx.write(f"INSERT INTO public.transactions (org_id, reference_number, entry_number, entry_date, description, total_debits, total_credits, lines_total_count, created_at, updated_at, is_posted, status) VALUES\n")
                tx_values = []
        
        if tx_values:
            f_tx.write(",\n".join(tx_values) + ";\n")

    # Generate Lines SQL
    print(f"Generating {OUTPUT_LINES_SQL}...")
    with open(OUTPUT_LINES_SQL, 'w', encoding='utf-8') as f_ln:
        f_ln.write("-- Loading Transaction Lines\n")
        
        # We will do chunks of 50 lines
        batch_size = 50
        current_batch = []
        
        count = 0
        for entry_no, tx in transactions.items():
            for idx, line in enumerate(tx['lines']):
                line_no = idx + 1
                
                # Subqueries for FKs
                # Transaction ID lookup: (SELECT id FROM transactions WHERE org_id=... AND reference_number=...)
                tx_lookup = f"(SELECT id FROM public.transactions WHERE org_id = '{ORG_ID}' AND reference_number = {escape_sql(entry_no)})"
                
                # Account ID lookup: (SELECT id FROM accounts WHERE org_id=... AND code=...)
                if line['account_code']:
                    acc_lookup = f"(SELECT id FROM public.accounts WHERE org_id = '{ORG_ID}' AND code = {escape_sql(line['account_code'])})"
                else:
                    acc_lookup = "NULL"

                val = f"('{ORG_ID}', {tx_lookup}, {acc_lookup}, {line_no}, {line['debit']}, {line['credit']}, {escape_sql(line['description'])})"
                current_batch.append(val)
                count += 1
                
                if len(current_batch) >= batch_size:
                     f_ln.write("INSERT INTO public.transaction_lines (org_id, transaction_id, account_id, line_no, debit_amount, credit_amount, description) VALUES\n")
                     f_ln.write(",\n".join(current_batch) + ";\n")
                     current_batch = []
        
        if current_batch:
            f_ln.write("INSERT INTO public.transaction_lines (org_id, transaction_id, account_id, line_no, debit_amount, credit_amount, description) VALUES\n")
            f_ln.write(",\n".join(current_batch) + ";\n")

    print(f"Done. Processed {count} lines.")

if __name__ == "__main__":
    main()
