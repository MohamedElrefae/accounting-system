#!/usr/bin/env python3
"""
Remap account codes in transaction_lines_prepared.csv
Maps legacy codes to new mapped codes using accounts_rows.csv as reference.

Mapping logic:
- Read accounts_rows.csv to build mapping: legacy_code -> code (new mapped)
- Read transaction_lines_prepared.csv
- Replace account_id (currently has legacy codes) with new mapped codes
- Write updated CSV
"""

import csv
import sys
from pathlib import Path
from collections import defaultdict

def build_mapping(accounts_csv_path):
    """Build mapping from legacy_code to new code from accounts_rows.csv"""
    mapping = {}
    
    try:
        with open(accounts_csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                code = row.get('code', '').strip()
                legacy_code = row.get('legacy_code', '').strip()
                
                # Map: legacy_code -> new code
                if code and legacy_code:
                    mapping[legacy_code] = code
        
        return mapping
    
    except FileNotFoundError:
        print(f"Error: File not found: {accounts_csv_path}")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading accounts CSV: {e}")
        sys.exit(1)

def remap_transactions(input_csv_path, output_csv_path, mapping):
    """Remap account_id in transaction_lines_prepared.csv"""
    
    stats = {
        'total_rows': 0,
        'remapped': 0,
        'not_found': 0,
        'empty': 0,
        'unmapped_codes': defaultdict(int)
    }
    
    try:
        with open(input_csv_path, 'r', encoding='utf-8') as infile, \
             open(output_csv_path, 'w', encoding='utf-8', newline='') as outfile:
            
            reader = csv.DictReader(infile)
            writer = csv.DictWriter(outfile, fieldnames=reader.fieldnames)
            
            writer.writeheader()
            
            for row in reader:
                stats['total_rows'] += 1
                
                account_id = row.get('account_id', '').strip()
                
                if not account_id:
                    # Empty account_id, keep as is
                    stats['empty'] += 1
                    writer.writerow(row)
                elif account_id in mapping:
                    # Found mapping, replace with new code
                    row['account_id'] = mapping[account_id]
                    stats['remapped'] += 1
                    writer.writerow(row)
                else:
                    # No mapping found, keep original
                    stats['not_found'] += 1
                    stats['unmapped_codes'][account_id] += 1
                    writer.writerow(row)
        
        return stats
    
    except Exception as e:
        print(f"Error processing transactions CSV: {e}")
        sys.exit(1)

def main():
    accounts_path = Path("C:/5/accounting-systemr5/accounts_rows.csv")
    input_path = Path("C:/5/accounting-systemr5/data/prepared/transaction_lines_prepared.csv")
    output_path = Path("C:/5/accounting-systemr5/data/prepared/transaction_lines_prepared_remapped.csv")
    
    if not accounts_path.exists():
        print(f"Error: Accounts file not found at {accounts_path}")
        sys.exit(1)
    
    if not input_path.exists():
        print(f"Error: Transaction file not found at {input_path}")
        sys.exit(1)
    
    print("=" * 70)
    print("ACCOUNT CODE REMAPPING TOOL")
    print("=" * 70)
    print(f"\nReading mapping from: {accounts_path}")
    
    # Build mapping
    mapping = build_mapping(str(accounts_path))
    print(f"Loaded {len(mapping)} account code mappings")
    print(f"\nSample mappings (legacy -> new):")
    for i, (legacy, new) in enumerate(list(mapping.items())[:5]):
        print(f"  {legacy} -> {new}")
    
    print(f"\nProcessing transactions from: {input_path}")
    print(f"Output will be saved to: {output_path}")
    
    # Remap transactions
    stats = remap_transactions(str(input_path), str(output_path), mapping)
    
    print("\n" + "=" * 70)
    print("REMAPPING RESULTS")
    print("=" * 70)
    print(f"Total rows processed:     {stats['total_rows']}")
    print(f"Rows remapped:            {stats['remapped']}")
    print(f"Rows with empty account:  {stats['empty']}")
    print(f"Rows with unmapped codes: {stats['not_found']}")
    
    if stats['unmapped_codes']:
        print(f"\nUnmapped account codes found:")
        for code, count in sorted(stats['unmapped_codes'].items()):
            print(f"  {code}: {count} occurrences")
    
    print(f"\nRemapped file created: {output_path}")
    print("\nVerification: Compare the two files to ensure mapping is correct")
    print("=" * 70)

if __name__ == "__main__":
    main()
