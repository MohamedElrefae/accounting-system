#!/usr/bin/env python3
"""
Phase 0 Task 0.5: Transaction Balance Audit

Groups Excel rows by transaction (entry_no), calculates total debits and credits,
identifies unbalanced transactions, and presents options for handling.
"""

import os
import csv
import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    import pandas as pd
    from dotenv import load_dotenv
except ImportError as e:
    logger.error(f"Missing required package: {e}")
    logger.error("Install with: pip install pandas python-dotenv")
    sys.exit(1)

load_dotenv()

EXCEL_FILE_PATH = os.getenv('EXCEL_FILE_PATH')
BALANCE_TOLERANCE = 0.01  # Allow 0.01 difference due to rounding


class TransactionBalanceAuditor:
    """Audits transaction balance in Excel data."""
    
    def __init__(self, excel_path: str):
        """Initialize auditor."""
        self.excel_path = excel_path
        self.data = None
        self.transactions = {}
        self.balanced_transactions = []
        self.unbalanced_transactions = []
        self.handling_decision = None
    
    def load_excel_data(self) -> bool:
        """Load Excel data."""
        try:
            self.data = pd.read_excel(self.excel_path, sheet_name="transactions ", header=0)
            logger.info(f"✓ Loaded {len(self.data)} rows from Excel")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to load Excel: {e}")
            return False
    
    def group_transactions(self) -> bool:
        """Group rows by transaction (entry_no, entry_date)."""
        try:
            # Convert debit and credit to numeric
            self.data['مدين'] = pd.to_numeric(self.data['مدين'], errors='coerce').fillna(0)
            self.data['دائن'] = pd.to_numeric(self.data['دائن'], errors='coerce').fillna(0)
            
            # Group by entry_no and entry_date
            for (entry_no, entry_date), group in self.data.groupby(['entry no', 'entry date']):
                total_debit = group['مدين'].sum()
                total_credit = group['دائن'].sum()
                
                self.transactions[str(entry_no)] = {
                    'entry_no': str(entry_no),
                    'entry_date': str(entry_date),
                    'line_count': len(group),
                    'total_debit': round(total_debit, 2),
                    'total_credit': round(total_credit, 2),
                    'difference': round(total_debit - total_credit, 2),
                    'is_balanced': abs(total_debit - total_credit) <= BALANCE_TOLERANCE
                }
            
            logger.info(f"✓ Grouped into {len(self.transactions)} transactions")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to group transactions: {e}")
            return False
    
    def audit_balance(self) -> bool:
        """Audit transaction balance."""
        logger.info("Auditing transaction balance...")
        
        for entry_no, transaction in self.transactions.items():
            if transaction['is_balanced']:
                self.balanced_transactions.append(transaction)
            else:
                self.unbalanced_transactions.append(transaction)
        
        logger.info(f"✓ Balanced transactions: {len(self.balanced_transactions)}")
        logger.info(f"✗ Unbalanced transactions: {len(self.unbalanced_transactions)}")
        
        if self.unbalanced_transactions:
            logger.warning("")
            logger.warning("Unbalanced transactions found:")
            for trans in sorted(self.unbalanced_transactions, key=lambda x: x['entry_no'])[:10]:
                logger.warning(f"  Entry {trans['entry_no']}: Debit={trans['total_debit']}, Credit={trans['total_credit']}, Diff={trans['difference']}")
            
            if len(self.unbalanced_transactions) > 10:
                logger.warning(f"  ... and {len(self.unbalanced_transactions) - 10} more")
        
        return True
    
    def display_unbalanced_transactions(self):
        """Display unbalanced transactions."""
        if not self.unbalanced_transactions:
            logger.info("✓ All transactions are balanced!")
            return
        
        logger.info("")
        logger.info("=" * 100)
        logger.info("UNBALANCED TRANSACTIONS")
        logger.info("=" * 100)
        logger.info("")
        
        logger.info("| Entry No | Entry Date | Lines | Debit | Credit | Difference |")
        logger.info("|----------|------------|-------|-------|--------|------------|")
        
        for trans in sorted(self.unbalanced_transactions, key=lambda x: x['entry_no']):
            logger.info(f"| {trans['entry_no']} | {trans['entry_date']} | {trans['line_count']} | {trans['total_debit']} | {trans['total_credit']} | {trans['difference']} |")
        
        logger.info("")
    
    def prompt_user_for_decision(self) -> bool:
        """Prompt user for handling decision."""
        if not self.unbalanced_transactions:
            logger.info("✓ No unbalanced transactions - proceeding with migration")
            self.handling_decision = 'proceed'
            return True
        
        self.display_unbalanced_transactions()
        
        logger.info("=" * 100)
        logger.info("HANDLING OPTIONS")
        logger.info("=" * 100)
        logger.info("")
        logger.info("Option A: Fix in Excel (RECOMMENDED)")
        logger.info("  - Fix the unbalanced transactions in Excel")
        logger.info("  - Re-upload the Excel file")
        logger.info("  - Re-run this audit")
        logger.info("")
        logger.info("Option B: Approve Override")
        logger.info("  - Accept the unbalanced transactions as-is")
        logger.info("  - System will auto-balance by adding entries to suspense account")
        logger.info("  - WARNING: This may affect financial reporting accuracy")
        logger.info("")
        logger.info("Option C: Skip Unbalanced Transactions")
        logger.info("  - Skip unbalanced transactions during migration")
        logger.info("  - Only migrate balanced transactions")
        logger.info("  - WARNING: This will result in data loss")
        logger.info("")
        
        while True:
            choice = input("Select option (A/B/C): ").strip().upper()
            
            if choice == 'A':
                logger.info("✓ User selected: Fix in Excel")
                logger.info("Please fix the unbalanced transactions in Excel and re-run this audit.")
                self.handling_decision = 'fix_in_excel'
                return False  # Stop here, user needs to fix Excel
            
            elif choice == 'B':
                logger.info("✓ User selected: Approve Override")
                logger.info("⚠ WARNING: Proceeding with unbalanced transactions")
                logger.info("   System will auto-balance using suspense account")
                self.handling_decision = 'auto_balance'
                return True
            
            elif choice == 'C':
                logger.info("✓ User selected: Skip Unbalanced Transactions")
                logger.info("⚠ WARNING: Unbalanced transactions will be skipped")
                self.handling_decision = 'skip'
                return True
            
            else:
                logger.info("Please enter A, B, or C")
    
    def export_unbalanced_csv(self, output_path: str) -> bool:
        """Export unbalanced transactions to CSV."""
        try:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=[
                    'entry_no', 'entry_date', 'line_count', 'total_debit', 
                    'total_credit', 'difference', 'is_balanced'
                ])
                writer.writeheader()
                
                for trans in sorted(self.unbalanced_transactions, key=lambda x: x['entry_no']):
                    writer.writerow(trans)
            
            logger.info(f"✓ Exported unbalanced transactions to: {output_path}")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to export CSV: {e}")
            return False
    
    def export_handling_decision_json(self, output_path: str) -> bool:
        """Export handling decision to JSON."""
        try:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            decision_data = {
                'timestamp': datetime.now().isoformat(),
                'total_transactions': len(self.transactions),
                'balanced_transactions': len(self.balanced_transactions),
                'unbalanced_transactions': len(self.unbalanced_transactions),
                'handling_decision': self.handling_decision,
                'balance_tolerance': BALANCE_TOLERANCE
            }
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(decision_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"✓ Exported handling decision to: {output_path}")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to export JSON: {e}")
            return False
    
    def generate_markdown_report(self, output_path: str) -> bool:
        """Generate Markdown report."""
        try:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write("# Transaction Balance Audit Report\n\n")
                f.write(f"**Generated**: {datetime.now().isoformat()}\n\n")
                
                f.write("## Summary\n\n")
                f.write(f"- **Total Transactions**: {len(self.transactions)}\n")
                f.write(f"- **Balanced**: {len(self.balanced_transactions)}\n")
                f.write(f"- **Unbalanced**: {len(self.unbalanced_transactions)}\n")
                f.write(f"- **Balance Tolerance**: {BALANCE_TOLERANCE}\n")
                f.write(f"- **Handling Decision**: {self.handling_decision}\n\n")
                
                if self.unbalanced_transactions:
                    f.write("## Unbalanced Transactions\n\n")
                    f.write("| Entry No | Entry Date | Lines | Debit | Credit | Difference |\n")
                    f.write("|----------|------------|-------|-------|--------|------------|\n")
                    
                    for trans in sorted(self.unbalanced_transactions, key=lambda x: x['entry_no']):
                        f.write(f"| {trans['entry_no']} | {trans['entry_date']} | {trans['line_count']} | {trans['total_debit']} | {trans['total_credit']} | {trans['difference']} |\n")
                    
                    f.write("\n")
                
                f.write("## Handling Strategy\n\n")
                
                if self.handling_decision == 'auto_balance':
                    f.write("**Auto-Balance**: System will add balancing entries to suspense account\n\n")
                    f.write("For each unbalanced transaction:\n")
                    f.write("- If Debit > Credit: Add credit entry to suspense account\n")
                    f.write("- If Credit > Debit: Add debit entry to suspense account\n")
                    f.write("- All auto-balancing entries will be logged for audit\n\n")
                
                elif self.handling_decision == 'skip':
                    f.write("**Skip**: Unbalanced transactions will be skipped during migration\n\n")
                    f.write("Only balanced transactions will be migrated.\n")
                    f.write("Unbalanced transactions will be logged for manual review.\n\n")
                
                elif self.handling_decision == 'fix_in_excel':
                    f.write("**Fix in Excel**: User will fix unbalanced transactions in Excel\n\n")
                    f.write("Migration will not proceed until all transactions are balanced.\n\n")
            
            logger.info(f"✓ Generated Markdown report: {output_path}")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to generate Markdown: {e}")
            return False


def main():
    """Main execution function."""
    logger.info("=" * 100)
    logger.info("Phase 0 Task 0.5: Transaction Balance Audit")
    logger.info("=" * 100)
    logger.info("")
    
    # Validate environment
    if not EXCEL_FILE_PATH:
        logger.error("✗ EXCEL_FILE_PATH not set in .env")
        return False
    
    # Create auditor
    auditor = TransactionBalanceAuditor(EXCEL_FILE_PATH)
    
    # Load data
    if not auditor.load_excel_data():
        return False
    
    # Group transactions
    if not auditor.group_transactions():
        return False
    
    # Audit balance
    if not auditor.audit_balance():
        return False
    
    # Prompt user for decision
    if not auditor.prompt_user_for_decision():
        logger.error("\n" + "=" * 100)
        logger.error("✗ Phase 0 Task 0.5 STOPPED - User needs to fix Excel")
        logger.error("=" * 100)
        return False
    
    # Export results
    csv_path = "reports/unbalanced_transactions.csv"
    json_path = "config/unbalanced_handling.json"
    md_path = "reports/balance_audit.md"
    
    success = True
    if auditor.unbalanced_transactions:
        success = auditor.export_unbalanced_csv(csv_path) and success
    success = auditor.export_handling_decision_json(json_path) and success
    success = auditor.generate_markdown_report(md_path) and success
    
    if success:
        logger.info("\n" + "=" * 100)
        logger.info("✓ Phase 0 Task 0.5 COMPLETED")
        logger.info("=" * 100)
        logger.info(f"Audit results exported to:")
        if auditor.unbalanced_transactions:
            logger.info(f"  - {csv_path}")
        logger.info(f"  - {json_path}")
        logger.info(f"  - {md_path}")
        return True
    else:
        logger.error("\n" + "=" * 100)
        logger.error("✗ Phase 0 Task 0.5 FAILED")
        logger.error("=" * 100)
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
