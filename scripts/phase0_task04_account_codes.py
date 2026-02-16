#!/usr/bin/env python3
"""
Phase 0 Task 0.4: Account Code Verification

Extracts unique account codes from Excel, queries Supabase for legacy_code mappings,
identifies unmapped codes, and presents interactive prompt for manual mapping if needed.
"""

import os
import json
import csv
import sys
from pathlib import Path
from typing import Dict, List, Set, Optional, Tuple
from datetime import datetime
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    import pandas as pd
    from supabase import create_client, Client
    from dotenv import load_dotenv
except ImportError as e:
    logger.error(f"Missing required package: {e}")
    logger.error("Install with: pip install pandas supabase-py python-dotenv")
    sys.exit(1)

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
EXCEL_FILE_PATH = os.getenv('EXCEL_FILE_PATH')


class AccountCodeVerifier:
    """Verifies and maps account codes between Excel and Supabase."""
    
    def __init__(self, excel_path: str, supabase_url: str, supabase_key: str):
        """Initialize verifier."""
        self.excel_path = excel_path
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.supabase_client: Optional[Client] = None
        self.excel_codes: Set[str] = set()
        self.supabase_accounts: Dict[str, Dict] = {}
        self.mapping: Dict[str, Dict] = {}
        self.unmapped_codes: List[str] = []
        self.manual_mappings: Dict[str, str] = {}
    
    def connect_supabase(self) -> bool:
        """Connect to Supabase."""
        try:
            self.supabase_client = create_client(self.supabase_url, self.supabase_key)
            logger.info("✓ Connected to Supabase")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to connect to Supabase: {e}")
            return False
    
    def extract_excel_codes(self) -> bool:
        """Extract unique account codes from Excel."""
        try:
            df = pd.read_excel(self.excel_path, sheet_name="transactions ", header=0)
            
            # Extract account codes from 'account code' column
            codes = df['account code'].dropna().unique()
            self.excel_codes = set(str(code).strip() for code in codes)
            
            logger.info(f"✓ Extracted {len(self.excel_codes)} unique account codes from Excel")
            logger.info(f"  Codes: {sorted(self.excel_codes)}")
            
            return True
        except Exception as e:
            logger.error(f"✗ Failed to extract Excel codes: {e}")
            return False
    
    def load_supabase_accounts(self) -> bool:
        """Load all accounts from Supabase with legacy_code field."""
        try:
            # Query accounts table
            response = self.supabase_client.table('accounts').select('id, code, name, legacy_code, legacy_name').execute()
            
            if not response.data:
                logger.warning("⚠ No accounts found in Supabase")
                return True
            
            # Build lookup dictionary
            for account in response.data:
                account_id = account.get('id')
                legacy_code = account.get('legacy_code')
                
                if legacy_code:
                    self.supabase_accounts[str(legacy_code).strip()] = {
                        'id': account_id,
                        'code': account.get('code'),
                        'name': account.get('name'),
                        'legacy_code': legacy_code,
                        'legacy_name': account.get('legacy_name')
                    }
            
            logger.info(f"✓ Loaded {len(self.supabase_accounts)} accounts from Supabase")
            logger.info(f"  Legacy codes: {sorted(self.supabase_accounts.keys())}")
            
            return True
        except Exception as e:
            logger.error(f"✗ Failed to load Supabase accounts: {e}")
            return False
    
    def map_codes(self) -> bool:
        """Map Excel codes to Supabase accounts."""
        logger.info("Mapping account codes...")
        
        for excel_code in sorted(self.excel_codes):
            if excel_code in self.supabase_accounts:
                account = self.supabase_accounts[excel_code]
                self.mapping[excel_code] = {
                    'excel_code': excel_code,
                    'legacy_code': account['legacy_code'],
                    'current_code': account['code'],
                    'account_name': account['name'],
                    'account_id': account['id'],
                    'mapping_status': 'MAPPED',
                    'mapping_confidence': 1.0
                }
                logger.info(f"  ✓ {excel_code} → {account['code']} ({account['name']})")
            else:
                self.unmapped_codes.append(excel_code)
                logger.warning(f"  ✗ {excel_code} → UNMAPPED")
        
        logger.info(f"\n✓ Mapped {len(self.mapping)} codes")
        logger.info(f"✗ Unmapped {len(self.unmapped_codes)} codes")
        
        return True
    
    def display_unmapped_codes(self):
        """Display unmapped codes and available accounts."""
        if not self.unmapped_codes:
            logger.info("✓ All account codes are mapped!")
            return
        
        logger.info("")
        logger.info("=" * 100)
        logger.info("UNMAPPED ACCOUNT CODES")
        logger.info("=" * 100)
        logger.info("")
        
        for unmapped_code in self.unmapped_codes:
            logger.info(f"Unmapped code: {unmapped_code}")
            logger.info("")
            logger.info("Available accounts in Supabase:")
            logger.info("")
            
            accounts_list = sorted(self.supabase_accounts.values(), key=lambda x: x['code'])
            for i, account in enumerate(accounts_list, 1):
                logger.info(f"  {i}. Code: {account['code']} | Name: {account['name']} | Legacy: {account['legacy_code']}")
            
            logger.info("")
    
    def prompt_user_for_mapping(self) -> bool:
        """Interactive prompt for user to select correct account for unmapped codes."""
        if not self.unmapped_codes:
            return True
        
        self.display_unmapped_codes()
        
        for unmapped_code in self.unmapped_codes:
            logger.info(f"Mapping unmapped code: {unmapped_code}")
            logger.info("")
            
            accounts_list = sorted(self.supabase_accounts.values(), key=lambda x: x['code'])
            
            while True:
                try:
                    choice = input(f"Select account for {unmapped_code} (1-{len(accounts_list)}) or 's' to skip: ").strip()
                    
                    if choice.lower() == 's':
                        logger.info(f"  Skipping {unmapped_code}")
                        break
                    
                    choice_num = int(choice)
                    if 1 <= choice_num <= len(accounts_list):
                        selected_account = accounts_list[choice_num - 1]
                        self.manual_mappings[unmapped_code] = selected_account['id']
                        self.mapping[unmapped_code] = {
                            'excel_code': unmapped_code,
                            'legacy_code': selected_account['legacy_code'],
                            'current_code': selected_account['code'],
                            'account_name': selected_account['name'],
                            'account_id': selected_account['id'],
                            'mapping_status': 'MANUAL',
                            'mapping_confidence': 0.5
                        }
                        logger.info(f"  ✓ Mapped {unmapped_code} → {selected_account['code']}")
                        break
                    else:
                        logger.info(f"Please enter a number between 1 and {len(accounts_list)}")
                except ValueError:
                    logger.info("Invalid input. Please enter a number or 's' to skip.")
            
            logger.info("")
        
        return True
    
    def export_mapping_csv(self, output_path: str) -> bool:
        """Export mapping to CSV file."""
        try:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=[
                    'excel_code', 'legacy_code', 'current_code', 'account_name', 
                    'account_id', 'mapping_status', 'mapping_confidence'
                ])
                writer.writeheader()
                
                for mapping in sorted(self.mapping.values(), key=lambda x: x['excel_code']):
                    writer.writerow(mapping)
            
            logger.info(f"✓ Exported mapping to: {output_path}")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to export mapping CSV: {e}")
            return False
    
    def export_manual_mappings_json(self, output_path: str) -> bool:
        """Export manual mappings to JSON file."""
        if not self.manual_mappings:
            logger.info("No manual mappings to export")
            return True
        
        try:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(self.manual_mappings, f, indent=2, ensure_ascii=False)
            
            logger.info(f"✓ Exported manual mappings to: {output_path}")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to export manual mappings: {e}")
            return False
    
    def generate_markdown_report(self, output_path: str) -> bool:
        """Generate Markdown report of account mappings."""
        try:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write("# Account Code Mapping Report\n\n")
                f.write(f"**Generated**: {datetime.now().isoformat()}\n\n")
                
                f.write("## Summary\n\n")
                f.write(f"- **Total Excel Codes**: {len(self.excel_codes)}\n")
                f.write(f"- **Mapped**: {len(self.mapping)}\n")
                f.write(f"- **Unmapped**: {len(self.unmapped_codes)}\n")
                f.write(f"- **Manual Mappings**: {len(self.manual_mappings)}\n\n")
                
                f.write("## Mapping Details\n\n")
                f.write("| Excel Code | Legacy Code | Current Code | Account Name | Status | Confidence |\n")
                f.write("|------------|-------------|--------------|--------------|--------|------------|\n")
                
                for mapping in sorted(self.mapping.values(), key=lambda x: x['excel_code']):
                    f.write(f"| {mapping['excel_code']} | {mapping['legacy_code']} | {mapping['current_code']} | {mapping['account_name']} | {mapping['mapping_status']} | {mapping['mapping_confidence']} |\n")
                
                if self.unmapped_codes:
                    f.write("\n## Unmapped Codes\n\n")
                    for code in sorted(self.unmapped_codes):
                        f.write(f"- {code}\n")
                
                if self.manual_mappings:
                    f.write("\n## Manual Mappings\n\n")
                    for excel_code, account_id in sorted(self.manual_mappings.items()):
                        f.write(f"- {excel_code} → {account_id}\n")
            
            logger.info(f"✓ Generated Markdown report: {output_path}")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to generate Markdown: {e}")
            return False


def main():
    """Main execution function."""
    logger.info("=" * 100)
    logger.info("Phase 0 Task 0.4: Account Code Verification")
    logger.info("=" * 100)
    logger.info("")
    
    # Validate environment
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("✗ Missing Supabase credentials in .env")
        return False
    
    if not EXCEL_FILE_PATH:
        logger.error("✗ Missing EXCEL_FILE_PATH in .env")
        return False
    
    # Create verifier
    verifier = AccountCodeVerifier(EXCEL_FILE_PATH, SUPABASE_URL, SUPABASE_KEY)
    
    # Connect to Supabase
    if not verifier.connect_supabase():
        return False
    
    # Extract Excel codes
    if not verifier.extract_excel_codes():
        return False
    
    # Load Supabase accounts
    if not verifier.load_supabase_accounts():
        return False
    
    # Map codes
    if not verifier.map_codes():
        return False
    
    # Prompt for manual mapping if needed
    if verifier.unmapped_codes:
        if not verifier.prompt_user_for_mapping():
            return False
    
    # Export results
    csv_path = "reports/account_mapping.csv"
    json_path = "config/manual_account_mappings.json"
    md_path = "reports/account_mapping.md"
    
    success = True
    success = verifier.export_mapping_csv(csv_path) and success
    success = verifier.export_manual_mappings_json(json_path) and success
    success = verifier.generate_markdown_report(md_path) and success
    
    if success:
        logger.info("\n" + "=" * 100)
        logger.info("✓ Phase 0 Task 0.4 COMPLETED")
        logger.info("=" * 100)
        logger.info(f"Mapping exported to:")
        logger.info(f"  - {csv_path}")
        logger.info(f"  - {md_path}")
        if verifier.manual_mappings:
            logger.info(f"  - {json_path}")
        return True
    else:
        logger.error("\n" + "=" * 100)
        logger.error("✗ Phase 0 Task 0.4 FAILED")
        logger.error("=" * 100)
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
