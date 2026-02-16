import csv
import uuid
from datetime import datetime

ORG_ID = 'd5789445-11e3-4ad6-9297-b56521675114'
MAPPING_FILE = r'1\KIRO_v4_Legacy_to_New_Mapping.csv'
ACCOUNTS_STAGE_FILE = 'ORG_d578_accounts_stage.csv'
TRANSACTIONS_FILE = 'KIRO_SUPABASE_transactions_stage.csv'
LINES_FILE = 'KIRO_SUPABASE_transaction_lines_stage.csv'
OUTPUT_SQL = 'load_all_data.sql'

def escape_sql(val):
    if val is None or val == '' or str(val).lower() == 'nan':
        return 'NULL'
    val_str = str(val).replace("'", "''")
    return f"'{val_str}'"

def get_category(new_type):
    cat_map = {
        'ASSET': 'asset',
        'LIAB': 'liability',
        'EQUITY': 'equity',
        'REV': 'revenue',
        'EXP': 'expense'
    }
    return cat_map.get(new_type, 'expense')

def main():
    # 1. Read Accounts
    accounts = {} # code -> dict
    
    # Read Mapping
    with open(MAPPING_FILE, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = row['NewCode']
            category = get_category(row['NewType'])
            parent_code = row['NewParentCode']
            if parent_code:
                try:
                    parent_code = str(int(float(parent_code)))
                except:
                    parent_code = ''
            
            # Use NewAccountName for name_ar
            name_ar = row['NewAccountName']
            is_postable = (row['NewPosting'] == '1')
            
            if code not in accounts:
                accounts[code] = {
                    'code': code,
                    'name_ar': name_ar,
                    'category': category,
                    'parent_code': parent_code,
                    'is_postable': is_postable,
                    'legacy_code': row['LegacyCode'],
                    'legacy_name': row['LegacyName']
                }

    # Read Stage for attributes or missing
    with open(ACCOUNTS_STAGE_FILE, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = row['code']
            if code not in accounts:
                 accounts[code] = {
                    'code': code,
                    'name_ar': row['name_ar'],
                    'category': row['category'],
                    'parent_code': row.get('parent_code', ''),
                    'is_postable': (row['is_postable'] == 'True'),
                    'legacy_code': row['legacy_code'],
                    'legacy_name': row['legacy_name']
                }

    # Identify Missing Parents
    # Collect all parents referenced
    referenced_parents = set()
    for code, acc in accounts.items():
        if acc['parent_code']:
            referenced_parents.add(acc['parent_code'])
    
    missing_parents = referenced_parents - set(accounts.keys())
    
    for mp in missing_parents:
        # Create a placeholder parent
        # Infer category from children
        children = [a for a in accounts.values() if a['parent_code'] == mp]
        if children:
            cat = children[0]['category']
        else:
            cat = 'asset' # fallback
            
        # Infer parent of this missing parent
        # e.g. 1115 -> 1100
        parent_of_mp = ''
        if len(mp) == 4:
            parent_of_mp = mp[:2] + '00'
        elif len(mp) == 5:
            # e.g. 11101 -> 1110?
            parent_of_mp = mp[:4]
        # Check if inferred parent exists or is also generating.. simple logic for now
        
        accounts[mp] = {
            'code': mp,
            'name_ar': f"Header {mp}",
            'category': cat,
            'parent_code': parent_of_mp,
            'is_postable': False,
            'legacy_code': '',
            'legacy_name': ''
        }
        print(f"Generated missing parent: {mp} (parent: {parent_of_mp})")

    # ... (accounts generation code remains same)
    
    
    # Updated helper to write chunks with multi-row INSERTs
    def write_sql_file(filename, statements):
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"-- Calculated SQL for {filename}\n")
            for stmt in statements:
                f.write(stmt + "\n")

    # 1. Accounts SQL (keep single inserts for safety on conflict but batching is possible)
    # Accounts are small enough (<300 rows). One file is fine.
    acc_stmts = []
    acc_stmts.append(f"TRUNCATE transaction_lines, transactions, accounts CASCADE;")
    
    # We can use multi-row insert for accounts too if we want, but ON CONFLICT works per row in Postgres 9.5+
    # ON CONFLICT DO NOTHING implies we can batch.
    
    # Let's batch accounts to 100 per insert
    acc_values = []
    for code, acc in accounts.items():
        name_en = ''
        legacy_code = escape_sql(acc['legacy_code'])
        legacy_name = escape_sql(acc['legacy_name'])
        name_ar = escape_sql(acc['name_ar'])
        cat = escape_sql(acc['category'])
        is_postable = 'TRUE' if acc['is_postable'] else 'FALSE'
        
        val = f"('{ORG_ID}', '{code}', '', {name_ar}, {cat}, {is_postable}, {is_postable}, FALSE, TRUE, {legacy_code}, {legacy_name}, 0, '{code}')"
        acc_values.append(val)
        
    if acc_values:
        stmt = "INSERT INTO public.accounts (org_id, code, name, name_ar, category, is_postable, allow_transactions, is_standard, is_active, legacy_code, legacy_name, level, path) VALUES \n" + ",\n".join(acc_values) + "\nON CONFLICT (org_id, code) DO NOTHING;"
        acc_stmts.append(stmt)

    # Parent updates
    for code, acc in accounts.items():
        p_code = acc['parent_code']
        if p_code and p_code in accounts:
            acc_stmts.append(f"UPDATE public.accounts SET parent_id = (SELECT id FROM public.accounts WHERE org_id = '{ORG_ID}' AND code = '{p_code}') WHERE org_id = '{ORG_ID}' AND code = '{code}';")
    
    write_sql_file('load_1_accounts.sql', acc_stmts)

    # 2. Transactions SQL - Multi-row
    # Group by 500
    tx_rows = []
    with open(TRANSACTIONS_FILE, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            entry_num = row['entry_number']
            entry_date = row['entry_date']
            desc = escape_sql(row['description'])
            notes = escape_sql(row['notes'])
            desc_ar = escape_sql(row.get('description_ar', ''))
            notes_ar = escape_sql(row.get('notes_ar', ''))
            
            if 'nan' in str(row['total_debits']).lower(): row['total_debits'] = 0
            if 'nan' in str(row['total_credits']).lower(): row['total_credits'] = 0
            
            total_dr = row['total_debits'] if row['total_debits'] else 0
            total_cr = row['total_credits'] if row['total_credits'] else 0
            
            is_posted_val = str(row.get('is_posted', '')).lower()
            is_posted = 'TRUE' if is_posted_val == 'true' or is_posted_val == '1' else 'FALSE'
            posted_at = 'NOW()' if is_posted == 'TRUE' else 'NULL'

            ref_num = escape_sql(entry_num)
            entry_num_sql = escape_sql(entry_num)
            
            val = f"('{ORG_ID}', {entry_num_sql}, '{entry_date}', {desc}, {notes}, {desc_ar}, {notes_ar}, {total_dr}, {total_cr}, {is_posted}, {posted_at}, {ref_num}, 'approved', 'approved', 'line_based', 'c72f37f7-b153-4ddd-a7b8-75e43df30477')"
            tx_rows.append(val)
            
    chunk_size = 500
    for i in range(0, len(tx_rows), chunk_size):
        chunk = tx_rows[i:i + chunk_size]
        stmt = "INSERT INTO public.transactions (org_id, entry_number, entry_date, description, notes, description_ar, notes_ar, total_debits, total_credits, is_posted, posted_at, reference_number, approval_status, status, approval_method, created_by) VALUES \n" + ",\n".join(chunk) + "\nON CONFLICT (org_id, entry_number, entry_date) DO NOTHING;"
        write_sql_file(f'load_2_transactions_part{i//chunk_size + 1}.sql', [stmt])

    # 3. Transaction Lines SQL - Multi-row? 
    # Problem: lines need transaction_id and account_id which are looked up.
    # Subqueries can't be used easily in VALUES list in standard multi-row insert: VALUES ((SELECT..), ...), ((SELECT..), ...) IS valid in Postgres!
    # "VALUES (1, (SELECT id FROM ...)), (2, (SELECT ...))" works.
    
    line_rows = []
    
    with open(LINES_FILE, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            tx_key = row.get('tx_key', '')
            if '|' not in tx_key: continue
            entry_num_val, entry_date_val = tx_key.split('|')
            
            acc_code = row['account_code']
            line_no = row['line_no']
            desc = escape_sql(row['description'])
            dr = row['debit_amount'] if row['debit_amount'] else 0
            cr = row['credit_amount'] if row['credit_amount'] else 0
            
            # Subqueries for the lookups
            tx_lookup = f"(SELECT id FROM public.transactions WHERE org_id = '{ORG_ID}' AND entry_number = '{entry_num_val}' AND entry_date = '{entry_date_val}')"
            acc_lookup = f"(SELECT id FROM public.accounts WHERE org_id = '{ORG_ID}' AND code = '{acc_code}')"
            
            val = f"('{ORG_ID}', {tx_lookup}, {acc_lookup}, {line_no}, {dr}, {cr}, {desc})"
            line_rows.append(val)

    # Split lines into chunks of 1000
    chunk_size = 1000
    for i in range(0, len(line_rows), chunk_size):
        chunk = line_rows[i:i + chunk_size]
        stmt = "INSERT INTO public.transaction_lines (org_id, transaction_id, account_id, line_no, debit_amount, credit_amount, description) VALUES \n" + ",\n".join(chunk) + ";"
        write_sql_file(f'load_3_lines_part{i//chunk_size + 1}.sql', [stmt])



if __name__ == '__main__':
    main()
