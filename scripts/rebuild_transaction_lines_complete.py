#!/usr/bin/env python3
"""
Complete Transaction Lines Rebuild Script

This script:
1. Reads the malformed transaction_lines_prepared.csv
2. Identifies account codes in debit_amount/credit_amount columns
3. Maps them to new codes using accounts_rows.csv
4. Rebuilds the CSV with correct structure and remapped codes

Usage:
    python scripts/rebuild_transaction_lines_complete.py
"""

import os
import sys
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TransactionLinesRebuilder:
    """Rebuilds transaction lines with correct structure and remapped codes"""
    
    def __init__(self):
        self.account_mapping = {}  # legacy_code -> new_code
        self.stats = {
            'total_lines': 0,
            'remapped': 0,
            'unmapped': 0,
            'unmapped_codes': [],
            'lines_with_debit_code': 0,
            'lines_with_credit_code': 0,
        }
    
    def load_account_mapping(self, accounts_file: Path) -> bool:
        """Load account mapping from accounts_rows.csv"""
        logger.info(f"Loading account mapping from {accounts_file}...")
        
        try:
            df = pd.read_csv(accounts_file)
            
            if 'code' not in df.columns or 'legacy_code' not in df.columns:
                logger.error(f"Missing required columns. Found: {list(df.columns)}")
                return False
            
            # Build mapping: legacy_code -> code
            for idx, row in df.iterrows():
                legacy_code_raw = row['legacy_code']
                new_code_raw = row['code']
                
                if pd.notna(legacy_code_raw):
                    if isinstance(legacy_code_raw, float):
                        legacy_code = str(int(legacy_code_raw))
                    else:
                        legacy_code = str(legacy_code_raw).strip()
                else:
                    legacy_code = None
                
                if pd.notna(new_code_raw):
                    if isinstance(new_code_raw, float):
                        new_code = str(int(new_code_raw))
                    else:
                        new_code = str(new_code_raw).strip()
                else:
                    new_code = None
                
                if legacy_code and new_code and legacy_code.lower() != 'nan':
                    self.account_mapping[legacy_code] = new_code
            
            logger.info(f"Loaded {len(self.account_mapping)} account mappings")
            
            if self.account_mapping:
                sample = list(self.account_mapping.items())[:5]
                logger.info(f"Sample mappings:")
                for legacy, new in sample:
                    logger.info(f"  {legacy} -> {new}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to load account mapping: {e}")
            return False
    
    def is_account_code(self, value) -> bool:
        """Check if a value looks like an account code"""
        if pd.isna(value):
            return False
        
        val_str = str(value).strip()
        if not val_str or val_str.lower() == 'nan':
            return False
        
        # Account codes are numeric strings
        try:
            float(val_str)
            return True
        except:
            return False
    
    def extract_account_code(self, value) -> Optional[str]:
        """Extract account code from a value"""
        if not self.is_account_code(value):
            return None
        
        val_str = str(value).strip()
        
        # If it's a float, convert to int first
        try:
            if '.' in val_str:
                return str(int(float(val_str)))
            else:
                return val_str
        except:
            return val_str
    
    def remap_code(self, code: Optional[str]) -> Optional[str]:
        """Remap a code using the account mapping"""
        if not code:
            return None
        
        code_str = str(code).strip()
        if not code_str or code_str.lower() == 'nan':
            return None
        
        if code_str in self.account_mapping:
            self.stats['remapped'] += 1
            return self.account_mapping[code_str]
        else:
            self.stats['unmapped'] += 1
            if code_str not in self.stats['unmapped_codes']:
                self.stats['unmapped_codes'].append(code_str)
            return code_str  # Keep original if not found
    
    def rebuild_transaction_lines(self, input_file: Path, output_file: Path) -> bool:
        """Rebuild transaction lines with correct structure"""
        logger.info(f"Reading transaction lines from {input_file}...")
        
        try:
            df = pd.read_csv(input_file)
            
            logger.info(f"Read {len(df)} transaction lines")
            logger.info(f"Columns: {list(df.columns)}")
            
            # Analyze the data structure
            logger.info("Analyzing data structure...")
            
            # The account codes appear to be in debit_amount or credit_amount
            # We need to extract them and put them in account_id
            
            rebuilt_rows = []
            
            for idx, row in df.iterrows():
                self.stats['total_lines'] += 1
                
                # Extract account code from debit_amount or credit_amount
                debit_val = row.get('debit_amount')
                credit_val = row.get('credit_amount')
                
                account_code = None
                debit_amount = None
                credit_amount = None
                
                # Check if debit_amount contains an account code
                if self.is_account_code(debit_val):
                    account_code = self.extract_account_code(debit_val)
                    self.stats['lines_with_debit_code'] += 1
                    # The actual debit amount should be in credit_amount or elsewhere
                    if self.is_account_code(credit_val):
                        # Both are codes - this is ambiguous
                        credit_amount = credit_val
                    else:
                        credit_amount = credit_val
                
                # Check if credit_amount contains an account code
                elif self.is_account_code(credit_val):
                    account_code = self.extract_account_code(credit_val)
                    self.stats['lines_with_credit_code'] += 1
                    debit_amount = debit_val
                
                else:
                    # Neither contains a code - use as-is
                    debit_amount = debit_val
                    credit_amount = credit_val
                
                # Remap the account code
                if account_code:
                    account_code = self.remap_code(account_code)
                
                # Build the rebuilt row
                rebuilt_row = {
                    'entry_no': row.get('entry no'),
                    'entry_date': row.get('entry date'),
                    'account_id': account_code,
                    'debit_amount': debit_amount,
                    'credit_amount': credit_amount,
                    'description': row.get('description'),
                    'project_code': row.get('project_code'),
                    'classification_code': row.get('classification_code'),
                    'work_analysis_code': row.get('work_analysis_code'),
                    'analysis_work_item_code': row.get('analysis_work_item_code'),
                    'sub_tree_code': row.get('sub_tree_code'),
                    'org_id': row.get('org_id'),
                }
                
                rebuilt_rows.append(rebuilt_row)
            
            # Create new dataframe
            rebuilt_df = pd.DataFrame(rebuilt_rows)
            
            # Export to CSV
            logger.info(f"Writing rebuilt transaction lines to {output_file}...")
            rebuilt_df.to_csv(output_file, index=False)
            
            logger.info(f"Successfully rebuilt transaction lines")
            return True
            
        except Exception as e:
            logger.error(f"Failed to rebuild transaction lines: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def print_statistics(self):
        """Print rebuild statistics"""
        print("\n" + "="*70)
        print("TRANSACTION LINES REBUILD STATISTICS")
        print("="*70)
        print(f"Total transaction lines:     {self.stats['total_lines']}")
        print(f"Lines with debit code:       {self.stats['lines_with_debit_code']}")
        print(f"Lines with credit code:      {self.stats['lines_with_credit_code']}")
        print(f"\nAccount Code Remapping:")
        print(f"  Successfully remapped:     {self.stats['remapped']}")
        print(f"  Not remapped (kept as-is): {self.stats['unmapped']}")
        
        if self.stats['remapped'] > 0:
            remap_rate = (self.stats['remapped'] / (self.stats['remapped'] + self.stats['unmapped']) * 100) if (self.stats['remapped'] + self.stats['unmapped']) > 0 else 0
            print(f"  Remap success rate:        {remap_rate:.1f}%")
        
        if self.stats['unmapped_codes']:
            print(f"\nCodes not found in mapping ({len(self.stats['unmapped_codes'])}):")
            for code in self.stats['unmapped_codes'][:10]:
                print(f"  - {code}")
            if len(self.stats['unmapped_codes']) > 10:
                print(f"  ... and {len(self.stats['unmapped_codes']) - 10} more")
        
        print("="*70 + "\n")


def main():
    # Define file paths
    accounts_file = Path('accounts_rows.csv')
    input_file = Path('data/prepared/transaction_lines_prepared.csv')
    output_file = Path('data/prepared/transaction_lines_prepared_rebuilt.csv')
    
    logger.info("Transaction Lines Rebuild Engine")
    logger.info(f"  Accounts file: {accounts_file}")
    logger.info(f"  Input file: {input_file}")
    logger.info(f"  Output file: {output_file}")
    
    # Verify input files exist
    if not accounts_file.exists():
        logger.error(f"Accounts file not found: {accounts_file}")
        return 1
    
    if not input_file.exists():
        logger.error(f"Transaction lines file not found: {input_file}")
        return 1
    
    # Initialize rebuilder
    rebuilder = TransactionLinesRebuilder()
    
    # Load account mapping
    if not rebuilder.load_account_mapping(accounts_file):
        logger.error("Failed to load account mapping")
        return 1
    
    # Rebuild transaction lines
    if not rebuilder.rebuild_transaction_lines(input_file, output_file):
        logger.error("Failed to rebuild transaction lines")
        return 1
    
    # Print statistics
    rebuilder.print_statistics()
    
    logger.info(f"Rebuilt file saved to: {output_file}")
    logger.info("Rebuild complete!")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
