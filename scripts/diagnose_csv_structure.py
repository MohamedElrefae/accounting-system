#!/usr/bin/env python3
"""
Diagnose the actual structure of transaction_lines_prepared.csv
"""

import csv
from pathlib import Path

csv_path = Path("C:/5/accounting-systemr5/data/prepared/transaction_lines_prepared.csv")

print("=" * 80)
print("CSV STRUCTURE DIAGNOSIS")
print("=" * 80)

with open(csv_path, 'r', encoding='utf-8') as f:
    # Read first few lines as raw text
    print("\nFirst 3 raw lines:")
    f.seek(0)
    for i in range(3):
        line = f.readline()
        print(f"Line {i+1}: {line[:150]}...")
    
    # Now read with CSV reader
    print("\n" + "=" * 80)
    print("CSV READER ANALYSIS")
    print("=" * 80)
    
    f.seek(0)
    reader = csv.reader(f)
    
    # Get headers
    headers = next(reader)
    print(f"\nNumber of columns: {len(headers)}")
    print("\nColumn headers:")
    for i, h in enumerate(headers):
        print(f"  [{i}] {h}")
    
    # Get first 3 data rows
    print("\nFirst 3 data rows:")
    for row_num in range(3):
        row = next(reader)
        print(f"\nRow {row_num + 1} ({len(row)} columns):")
        for i, val in enumerate(row):
            col_name = headers[i] if i < len(headers) else f"EXTRA_{i}"
            print(f"  [{i}] {col_name}: '{val}'")
