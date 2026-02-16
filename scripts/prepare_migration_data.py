#!/usr/bin/env python3
"""
Data Preparation Script for Excel Migration with Account Mapping

This script:
1. Loads Excel data from correct file location
2. Fetches account mappings from Supabase (using legacy_code field)
3. Maps Excel account codes to Supabase account IDs
4. Preserves all accounting dimensions (project, classification, work_analysis, sub_tree)
5. Generates prepared CSV files ready for Supabase import
6. Validates all mappings

Usage:
    python scripts/prepare_migration_data.py --org-id <org_id> --excel-file <path>
"""

import os
import sys
import csv
import json
import logging
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import pandas as pd

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from analyzer.excel_reader import ExcelReader
from analyzer.supabase_connection import SupabaseConnectionManager

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DataPreparationEngine:
    """Prepares Excel data for Supabase import with proper account mapping"""
    
    def __init__(self, supabase_manager: SupabaseConnectionManager, org_id: str):
        self.supabase = supabase_manager
        self.org_id = org_id
        self.account_mapping = {}  # excel_code -> account_id (UUID)
        self.mapping_stats = {
            'accounts': {'total': 0, 'mapped': 0, 'unmapped': []},
            'projects': {'total': 0, 'preserved': 0},
            'classifications': {'total': 0, 'preserved': 0},
            'work_items': {'total': 0, 'preserved': 0},
            'analysis_items': {'total': 0, 'preserved': 0},
            'sub_trees': {'total': 0, 'preserved': 0},
        }
    
    def export_reference_data(self) -> bool:
        """Load account mappings from Supabase using legacy_code field"""
        logger.info("Loading account mappings from Supabase...")
        
        try:
            # Fetch ALL accounts with id, code, and legacy_code
            logger.info("  Fetching accounts from Supabase...")
            response = self.supabase.client.table('accounts').select('id, code, legacy_code').eq('org_id', self.org_id).execute()
            
            # Build mapping: legacy_code -> account_id
            # The Excel file contains legacy_code values, we need to map them to account IDs
            for row in response.data:
                legacy_code = row.get('legacy_code')
                if legacy_code is not None:
                    # Convert to string for consistent matching
                    legacy_code_str = str(legacy_code).strip()
                    if legacy_code_str:  # Only add non-empty codes
                        self.account_mapping[legacy_code_str] = row['id']
            
            logger.info(f"  Loaded {len(self.account_mapping)} account mappings from legacy_code field")
            
            # Log sample mappings for verification
            if self.account_mapping:
                sample_mappings = list(self.account_mapping.items())[:5]
                logger.info(f"  Sample mappings: {sample_mappings}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to load account mappings: {e}")
            return False
    
    def map_account_code(self, excel_code: Optional[str]) -> Optional[str]:
        """Map Excel account code to Supabase account ID using legacy_code"""
        if excel_code is None or pd.isna(excel_code):
            return None
        
        code_str = str(excel_code).strip()
        if not code_str or code_str.lower() == 'nan':
            return None
        
        self.mapping_stats['accounts']['total'] += 1
        
        # Look up in mapping
        if code_str in self.account_mapping:
            self.mapping_stats['accounts']['mapped'] += 1
            return self.account_mapping[code_str]
        else:
            self.mapping_stats['accounts']['unmapped'].append(code_str)
            logger.warning(f"  Unmapped account code: {code_str}")
            return None
    
    def prepare_transactions(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare transactions data"""
        logger.info("Preparing transactions data...")
        
        # Group by entry_no and entry_date to get unique transactions
        trans_df = df.groupby(['entry no', 'entry date']).agg({
            'description': 'first'
        }).reset_index()
        
        # Rename columns to match database
        trans_df = trans_df.rename(columns={
            'entry no': 'entry_number',
            'entry date': 'entry_date',
            'description': 'description'
        })
        
        # Add org_id
        trans_df['org_id'] = self.org_id
        
        logger.info(f"  Prepared {len(trans_df)} unique transactions")
        return trans_df
    
    def prepare_transaction_lines(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare transaction lines data - map account codes, preserve other dimensions"""
        logger.info("Preparing transaction lines data...")
        
        lines_df = df.copy()
        
        # Map account codes to UUIDs using legacy_code
        logger.info("  Mapping account codes to Supabase IDs...")
        lines_df['account_id'] = lines_df['account code'].apply(
            lambda x: self.map_account_code(x)
        )
        
        # Preserve other dimension codes as-is
        logger.info("  Preserving project codes...")
        lines_df['project_code'] = lines_df['project code'].apply(
            lambda x: self._preserve_code(x, 'projects')
        )
        
        logger.info("  Preserving classification codes...")
        lines_df['classification_code'] = lines_df['transaction classification code'].apply(
            lambda x: self._preserve_code(x, 'classifications')
        )
        
        logger.info("  Preserving work analysis codes...")
        lines_df['work_analysis_code'] = lines_df['work analysis code'].apply(
            lambda x: self._preserve_code(x, 'work_items')
        )
        
        logger.info("  Preserving analysis work item codes...")
        lines_df['analysis_work_item_code'] = lines_df['work analysis code'].apply(
            lambda x: self._preserve_code(x, 'analysis_items')
        )
        
        logger.info("  Preserving sub tree codes...")
        lines_df['sub_tree_code'] = lines_df['sub_tree code'].apply(
            lambda x: self._preserve_code(x, 'sub_trees')
        )
        
        # Rename amount columns and handle description
        lines_df = lines_df.rename(columns={
            'debit': 'debit_amount',
            'credit': 'credit_amount'
        })
        
        # Use description from Excel, or notes if description is empty
        lines_df['line_description'] = lines_df['description'].fillna(lines_df.get('notes', ''))
        
        # Select only columns needed for database
        output_cols = [
            'entry no', 'entry date',  # For transaction linking
            'account_id', 'debit_amount', 'credit_amount', 'line_description',
            'project_code', 'classification_code', 'work_analysis_code',
            'analysis_work_item_code', 'sub_tree_code'
        ]
        
        lines_df = lines_df[[col for col in output_cols if col in lines_df.columns]]
        
        # Rename line_description back to description for database
        lines_df = lines_df.rename(columns={'line_description': 'description'})
        
        # Add org_id
        lines_df['org_id'] = self.org_id
        
        logger.info(f"  Prepared {len(lines_df)} transaction lines")
        return lines_df
    
    def _preserve_code(self, code: Optional[str], reference_type: str) -> Optional[str]:
        """Preserve code as-is from Excel"""
        if code is None or pd.isna(code):
            return None
        
        code_str = str(code).strip()
        if not code_str or code_str.lower() == 'nan':
            return None
        
        self.mapping_stats[reference_type]['total'] += 1
        self.mapping_stats[reference_type]['preserved'] += 1
        return code_str
    
    def validate_prepared_data(self, trans_df: pd.DataFrame, lines_df: pd.DataFrame) -> bool:
        """Validate prepared data"""
        logger.info("Validating prepared data...")
        
        errors = []
        
        # Check transactions
        if trans_df['entry_number'].isna().any():
            errors.append("Transactions: Missing entry_number")
        if trans_df['entry_date'].isna().any():
            errors.append("Transactions: Missing entry_date")
        
        # Check transaction lines - allow missing UUIDs since reference data may not exist
        if lines_df['debit_amount'].isna().all() and lines_df['credit_amount'].isna().all():
            errors.append("Transaction lines: All debit and credit amounts are missing")
        
        if errors:
            logger.error("Validation failed:")
            for error in errors:
                logger.error(f"  - {error}")
            return False
        
        logger.info("Validation passed")
        return True
    
    def export_prepared_csv(self, trans_df: pd.DataFrame, lines_df: pd.DataFrame, output_dir: Path) -> bool:
        """Export prepared data to CSV files"""
        logger.info(f"Exporting prepared CSV files to {output_dir}...")
        
        try:
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Export transactions
            trans_file = output_dir / "transactions_prepared.csv"
            trans_df.to_csv(trans_file, index=False)
            logger.info(f"  Exported transactions: {trans_file}")
            
            # Export transaction lines
            lines_file = output_dir / "transaction_lines_prepared.csv"
            lines_df.to_csv(lines_file, index=False)
            logger.info(f"  Exported transaction lines: {lines_file}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to export CSV files: {e}")
            return False
    
    def generate_mapping_report(self, output_dir: Path) -> bool:
        """Generate mapping statistics report"""
        logger.info("Generating mapping report...")
        
        try:
            report_file = output_dir / "mapping_report.json"
            
            # Convert int64 to int for JSON serialization
            report_data = {}
            for ref_type, stats in self.mapping_stats.items():
                if ref_type == 'accounts':
                    report_data[ref_type] = {
                        'total': int(stats['total']),
                        'mapped': int(stats['mapped']),
                        'unmapped': stats['unmapped']
                    }
                else:
                    report_data[ref_type] = {
                        'total': int(stats['total']),
                        'preserved': int(stats['preserved']),
                    }
            
            with open(report_file, 'w') as f:
                json.dump(report_data, f, indent=2)
            
            logger.info(f"  Mapping report: {report_file}")
            
            # Print summary
            print("\n" + "="*60)
            print("ACCOUNT MAPPING STATISTICS")
            print("="*60)
            acc_stats = self.mapping_stats['accounts']
            if acc_stats['total'] > 0:
                map_rate = (acc_stats['mapped'] / acc_stats['total'] * 100) if acc_stats['total'] > 0 else 0
                print(f"Accounts:        {acc_stats['mapped']:5}/{acc_stats['total']:5} ({map_rate:5.1f}%)")
                if acc_stats['unmapped']:
                    print(f"  Unmapped codes: {', '.join(str(c) for c in acc_stats['unmapped'][:5])}")
                    if len(acc_stats['unmapped']) > 5:
                        print(f"  ... and {len(acc_stats['unmapped']) - 5} more")
            
            print("\n" + "="*60)
            print("OTHER DIMENSIONS PRESERVED")
            print("="*60)
            for ref_type in ['projects', 'classifications', 'work_items', 'analysis_items', 'sub_trees']:
                stats = self.mapping_stats[ref_type]
                if stats['total'] > 0:
                    print(f"{ref_type:20} {stats['preserved']:5}/{stats['total']:5} preserved")
            print("="*60 + "\n")
            
            # Check for unmapped accounts
            if acc_stats['unmapped']:
                logger.warning(f"WARNING: {len(acc_stats['unmapped'])} unmapped account codes found!")
                logger.warning("These codes do not have legacy_code mappings in Supabase.")
                logger.warning("Please review and update account mappings before migration.")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to generate mapping report: {e}")
            return False


def main():
    parser = argparse.ArgumentParser(description='Prepare Excel data for Supabase migration')
    parser.add_argument('--org-id', required=True, help='Organization ID')
    parser.add_argument('--excel-file', default='C:\\5\\accounting-systemr5\\transactions.xlsx', help='Excel file path')
    parser.add_argument('--output-dir', default='data/prepared', help='Output directory for prepared CSV files')
    
    args = parser.parse_args()
    
    org_id = args.org_id
    excel_file = Path(args.excel_file)
    output_dir = Path(args.output_dir)
    
    logger.info(f"Data Preparation Engine")
    logger.info(f"  Organization ID: {org_id}")
    logger.info(f"  Excel file: {excel_file}")
    logger.info(f"  Output directory: {output_dir}")
    
    # Connect to Supabase
    logger.info("Connecting to Supabase...")
    supabase_manager = SupabaseConnectionManager()
    if not supabase_manager.connect():
        logger.error("Failed to connect to Supabase")
        return 1
    
    # Initialize preparation engine
    engine = DataPreparationEngine(supabase_manager, org_id)
    
    # Skip reference data export - we preserve codes as-is
    engine.export_reference_data()
    
    # Read Excel data directly from the transactions sheet
    logger.info(f"Reading Excel file: {excel_file}")
    try:
        df = pd.read_excel(excel_file, sheet_name='transactions ', header=0)
        # Strip whitespace from column names
        df.columns = df.columns.str.strip()
        logger.info(f"Read {len(df)} rows from Excel")
        logger.info(f"Columns: {list(df.columns)}")
    except Exception as e:
        logger.error(f"Failed to read Excel: {e}")
        return 1
    
    # Prepare data
    trans_df = engine.prepare_transactions(df)
    lines_df = engine.prepare_transaction_lines(df)
    
    # Validate
    if not engine.validate_prepared_data(trans_df, lines_df):
        logger.error("Data validation failed")
        return 1
    
    # Export CSV files
    if not engine.export_prepared_csv(trans_df, lines_df, output_dir):
        logger.error("Failed to export CSV files")
        return 1
    
    # Generate report
    if not engine.generate_mapping_report(output_dir):
        logger.error("Failed to generate mapping report")
        return 1
    
    logger.info("Data preparation complete!")
    print(f"\nPrepared CSV files are ready in: {output_dir}")
    print(f"Next step: Upload via Supabase Dashboard")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
