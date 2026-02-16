#!/usr/bin/env python3
"""
Complete Account Code Remapping Script

This script:
1. Reads accounts_rows.csv (contains code and legacy_code mappings)
2. Reads transaction_lines_prepared.csv (contains old account_id values)
3. Creates a complete new transaction_lines_prepared.csv with remapped codes
4. Preserves all other columns and data integrity

Usage:
    python scripts/remap_account_codes_complete.py
"""

import os
import sys
import csv
import logging
from pathlib import Path
from typing import Dict, List, Optional
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AccountCodeRemapper:
    """Remaps account codes in transaction lines using accounts mapping"""
    
    def __init__(self):
        self.account_mapping = {}  # legacy_code -> new_code
        self.stats = {
            'total_lines': 0,
            'remapped': 0,
            'unmapped': 0,
            'unmapped_codes': []
        }
    
    def load_account_mapping(self, accounts_file: Path) -> bool:
        """Load account mapping from accounts_rows.csv"""
        logger.info(f"Loading account mapping from {accounts_file}...")
        
        try:
            df = pd.read_csv(accounts_file)
            
            # Verify required columns exist
            if 'code' not in df.columns or 'legacy_code' not in df.columns:
                logger.error(f"Missing required columns. Found: {list(df.columns)}")
                return False
            
            # Build mapping: legacy_code -> code
            # Handle both string and numeric formats
            for idx, row in df.iterrows():
                legacy_code_raw = row['legacy_code']
                new_code_raw = row['code']
                
                # Convert to string, handling NaN and numeric values
                if pd.notna(legacy_code_raw):
                    # If it's a float, convert to int first, then to string
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
            
            # Show sample mappings
            if self.account_mapping:
                sample = list(self.account_mapping.items())[:5]
                logger.info(f"Sample mappings:")
                for legacy, new in sample:
                    logger.info(f"  {legacy} -> {new}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to load account mapping: {e}")
            return False
    
    def remap_transaction_lines(self, input_file: Path, output_file: Path) -> bool:
        """Remap account codes in transaction lines"""
        logger.info(f"Reading transaction lines from {input_file}...")
        
        try:
            df = pd.read_csv(input_file)
            
            # Verify required column exists
            if 'account_id' not in df.columns:
                logger.error(f"Missing 'account_id' column. Found: {list(df.columns)}")
                return False
            
            logger.info(f"Read {len(df)} transaction lines")
            logger.info(f"Columns: {list(df.columns)}")
            
            # Remap account_id column
            logger.info("Remapping account codes...")
            
            remapped_codes = []
            for idx, row in df.iterrows():
                old_code_raw = row['account_id']
                
                # Convert to string, handling NaN and numeric values
                if pd.notna(old_code_raw):
                    if isinstance(old_code_raw, float):
                        old_code = str(int(old_code_raw))
                    else:
                        old_code = str(old_code_raw).strip()
                else:
                    old_code = None
                
                self.stats['total_lines'] += 1
                
                if old_code and old_code.lower() != 'nan':
                    if old_code in self.account_mapping:
                        new_code = self.account_mapping[old_code]
                        remapped_codes.append(new_code)
                        self.stats['remapped'] += 1
                    else:
                        # Code not found in mapping - keep as-is
                        remapped_codes.append(old_code)
                        self.stats['unmapped'] += 1
                        if old_code not in self.stats['unmapped_codes']:
                            self.stats['unmapped_codes'].append(old_code)
                else:
                    # Empty or NaN - keep as-is
                    remapped_codes.append(old_code if old_code else None)
                    self.stats['unmapped'] += 1
            
            # Update dataframe with remapped codes
            df['account_id'] = remapped_codes
            
            # Export to new CSV
            logger.info(f"Writing remapped transaction lines to {output_file}...")
            df.to_csv(output_file, index=False)
            
            logger.info(f"Successfully remapped transaction lines")
            return True
            
        except Exception as e:
            logger.error(f"Failed to remap transaction lines: {e}")
            return False
    
    def print_statistics(self):
        """Print remapping statistics"""
        print("\n" + "="*70)
        print("ACCOUNT CODE REMAPPING STATISTICS")
        print("="*70)
        print(f"Total transaction lines:  {self.stats['total_lines']}")
        print(f"Successfully remapped:    {self.stats['remapped']}")
        print(f"Not remapped (kept as-is):{self.stats['unmapped']}")
        
        if self.stats['remapped'] > 0:
            remap_rate = (self.stats['remapped'] / self.stats['total_lines'] * 100)
            print(f"Remap success rate:       {remap_rate:.1f}%")
        
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
    output_file = Path('data/prepared/transaction_lines_prepared_remapped.csv')
    
    logger.info("Account Code Remapping Engine")
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
    
    # Initialize remapper
    remapper = AccountCodeRemapper()
    
    # Load account mapping
    if not remapper.load_account_mapping(accounts_file):
        logger.error("Failed to load account mapping")
        return 1
    
    # Remap transaction lines
    if not remapper.remap_transaction_lines(input_file, output_file):
        logger.error("Failed to remap transaction lines")
        return 1
    
    # Print statistics
    remapper.print_statistics()
    
    logger.info(f"Remapped file saved to: {output_file}")
    logger.info("Remapping complete!")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
