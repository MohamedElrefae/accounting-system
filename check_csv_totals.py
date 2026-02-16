#!/usr/bin/env python3
import pandas as pd

df = pd.read_csv('transaction_lines.csv')

print(f'Total rows in CSV: {len(df)}')
print(f'Total debits: {df["debit_amount"].sum():,.2f}')
print(f'Total credits: {df["credit_amount"].sum():,.2f}')

# Check rows that will be filtered
zero_rows = df[(df['debit_amount'] == 0) & (df['credit_amount'] == 0)]
print(f'Rows with zero amounts: {len(zero_rows)}')

invalid_account = df[df['account_id'].isna() | (df['account_id'] == '00000000-0000-0000-0000-000000000000')]
print(f'Rows with invalid account: {len(invalid_account)}')

# Calculate valid rows (after filtering)
valid_rows = df[
    ~((df['debit_amount'] == 0) & (df['credit_amount'] == 0)) &
    ~(df['account_id'].isna() | (df['account_id'] == '00000000-0000-0000-0000-000000000000'))
]

print(f'\nValid rows after filtering: {len(valid_rows)}')
print(f'Valid debits: {valid_rows["debit_amount"].sum():,.2f}')
print(f'Valid credits: {valid_rows["credit_amount"].sum():,.2f}')
print(f'Difference: {valid_rows["debit_amount"].sum() - valid_rows["credit_amount"].sum():,.2f}')
