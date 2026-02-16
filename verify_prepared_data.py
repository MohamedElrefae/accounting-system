#!/usr/bin/env python3
import pandas as pd

# Check transactions
print("="*70)
print("TRANSACTIONS PREPARED")
print("="*70)
trans_df = pd.read_csv('data/prepared/transactions_prepared.csv', nrows=5)
print(f"Total transactions: {len(pd.read_csv('data/prepared/transactions_prepared.csv'))}")
print("\nFirst 5 transactions:")
print(trans_df.to_string())

# Check transaction lines
print("\n" + "="*70)
print("TRANSACTION LINES PREPARED")
print("="*70)
lines_df = pd.read_csv('data/prepared/transaction_lines_prepared.csv', nrows=5)
print(f"Total transaction lines: {len(pd.read_csv('data/prepared/transaction_lines_prepared.csv'))}")
print("\nFirst 5 transaction lines:")
print(lines_df.to_string())

print("\n" + "="*70)
print("COLUMNS IN TRANSACTION LINES")
print("="*70)
print(list(lines_df.columns))

# Check for data presence
print("\n" + "="*70)
print("DATA PRESENCE CHECK")
print("="*70)
all_lines = pd.read_csv('data/prepared/transaction_lines_prepared.csv')
print(f"Rows with account_code: {all_lines['account_code'].notna().sum()}")
print(f"Rows with project_code: {all_lines['project_code'].notna().sum()}")
print(f"Rows with classification_code: {all_lines['classification_code'].notna().sum()}")
print(f"Rows with work_analysis_code: {all_lines['work_analysis_code'].notna().sum()}")
print(f"Rows with analysis_work_item_code: {all_lines['analysis_work_item_code'].notna().sum()}")
print(f"Rows with sub_tree_code: {all_lines['sub_tree_code'].notna().sum()}")
print(f"Rows with debit_amount: {all_lines['debit_amount'].notna().sum()}")
print(f"Rows with credit_amount: {all_lines['credit_amount'].notna().sum()}")
