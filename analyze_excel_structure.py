import openpyxl
import pandas as pd

# Load the Excel file
file_path = r'C:\5\accounting-systemr5\transactions.xlsx'
wb = openpyxl.load_workbook(file_path)

# Get sheet names
print('=== SHEET NAMES ===')
for sheet in wb.sheetnames:
    print(f'  - {sheet}')

# Read the transactions sheet
df = pd.read_excel(file_path, sheet_name='transactions ', header=0)

print('\n=== EXCEL STRUCTURE ===')
print(f'Total rows: {len(df)}')
print(f'Total columns: {len(df.columns)}')

print('\n=== COLUMN NAMES (AS READ) ===')
for i, col in enumerate(df.columns, 1):
    print(f'{i}. {repr(col)}')

print('\n=== FIRST 3 ROWS ===')
print(df.head(3).to_string())

print('\n=== DATA TYPES ===')
print(df.dtypes)

print('\n=== UNIQUE VALUES (SAMPLE) ===')
if len(df.columns) > 4:
    print(f'Unique account codes: {df.iloc[:, 4].nunique()}')
if len(df.columns) > 2:
    print(f'Unique entry_no: {df.iloc[:, 2].nunique()}')
