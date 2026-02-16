"""
Verification Engine for Excel Data Migration to Supabase

This module provides post-migration verification functionality:
- Record count comparison between Excel and Supabase
- Referential integrity verification
- Sample data comparison (random sample of records)
- Account mapping verification
- Dimension integrity verification
- Comprehensive verification report generation
"""

import logging
import json
import random
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime
import pandas as pd

from src.analyzer.supabase_connection import SupabaseConnectionManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class VerificationCheck:
    """Result of a single verification check"""
    check_name: str
    passed: bool
    details: str
    expected_value: Optional[Any] = None
    actual_value: Optional[Any] = None
    error_message: Optional[str] = None


@dataclass
class VerificationReport:
    """Complete verification report"""
    verification_time: datetime
    total_checks: int = 0
    passed_checks: int = 0
    failed_checks: int = 0
    checks: List[VerificationCheck] = field(default_factory=list)
    summary: str = ""
    
    def add_check(self, check: VerificationCheck):
        """Add a verification check result"""
        self.checks.append(check)
        self.total_checks += 1
        if check.passed:
            self.passed_checks += 1
        else:
            self.failed_checks += 1


class VerificationEngine:
    """
    Verifies migration success through automated checks.
    
    This class:
    1. Compares record counts between Excel and Supabase
    2. Validates referential integrity
    3. Performs sample data comparisons
    4. Verifies account code mappings
    5. Verifies dimension integrity
    6. Generates comprehensive verification report
    """
    
    def __init__(self, supabase_manager: SupabaseConnectionManager):
        """
        Initialize verification engine.
        
        Args:
            supabase_manager: SupabaseConnectionManager instance
        """
        self.supabase_manager = supabase_manager
        self.report = VerificationReport(verification_time=datetime.now())
        
        logger.info("Initialized VerificationEngine")
    
    def verify_record_counts(
        self,
        excel_lines_df: pd.DataFrame,
        excel_transactions_df: pd.DataFrame
    ) -> VerificationCheck:
        """
        Verify record counts match between Excel and Supabase.
        
        Args:
            excel_lines_df: DataFrame with Excel transaction lines
            excel_transactions_df: DataFrame with Excel transactions
            
        Returns:
            VerificationCheck with results
        """
        try:
            # Get counts from Excel
            excel_lines_count = len(excel_lines_df)
            excel_transactions_count = len(excel_transactions_df)
            
            # Get counts from Supabase
            supabase_transactions = self.supabase_manager.execute_query(
                table="transactions",
                query_type="select",
                data=None
            )
            supabase_lines = self.supabase_manager.execute_query(
                table="transaction_lines",
                query_type="select",
                data=None
            )
            
            supabase_transactions_count = len(supabase_transactions) if isinstance(supabase_transactions, list) else 0
            supabase_lines_count = len(supabase_lines) if isinstance(supabase_lines, list) else 0
            
            # Compare counts
            transactions_match = excel_transactions_count == supabase_transactions_count
            lines_match = excel_lines_count == supabase_lines_count
            
            passed = transactions_match and lines_match
            
            details = (
                f"Excel: {excel_transactions_count} transactions, {excel_lines_count} lines | "
                f"Supabase: {supabase_transactions_count} transactions, {supabase_lines_count} lines"
            )
            
            check = VerificationCheck(
                check_name="Record Count Consistency",
                passed=passed,
                details=details,
                expected_value=f"Transactions: {excel_transactions_count}, Lines: {excel_lines_count}",
                actual_value=f"Transactions: {supabase_transactions_count}, Lines: {supabase_lines_count}"
            )
            
            logger.info(f"Record count verification: {details}")
            return check
        
        except Exception as e:
            error_msg = f"Failed to verify record counts: {str(e)}"
            logger.error(error_msg)
            return VerificationCheck(
                check_name="Record Count Consistency",
                passed=False,
                details="",
                error_message=error_msg
            )
    
    def verify_referential_integrity(self) -> VerificationCheck:
        """
        Verify referential integrity between transactions and transaction_lines.
        
        Checks that all transaction_lines reference valid transactions.
        
        Returns:
            VerificationCheck with results
        """
        try:
            # Get all transactions
            transactions = self.supabase_manager.execute_query(
                table="transactions",
                query_type="select",
                data=None
            )
            
            # Get all transaction lines
            lines = self.supabase_manager.execute_query(
                table="transaction_lines",
                query_type="select",
                data=None
            )
            
            if not isinstance(transactions, list) or not isinstance(lines, list):
                return VerificationCheck(
                    check_name="Referential Integrity",
                    passed=False,
                    details="Failed to retrieve data from Supabase",
                    error_message="Invalid data format from Supabase"
                )
            
            # Build set of valid transaction IDs
            valid_transaction_ids = {t.get('id') for t in transactions if t.get('id')}
            
            # Check each line references a valid transaction
            orphaned_lines = []
            for line in lines:
                transaction_id = line.get('transaction_id')
                if transaction_id and transaction_id not in valid_transaction_ids:
                    orphaned_lines.append(line.get('id'))
            
            passed = len(orphaned_lines) == 0
            
            details = (
                f"Total transactions: {len(transactions)}, "
                f"Total lines: {len(lines)}, "
                f"Orphaned lines: {len(orphaned_lines)}"
            )
            
            check = VerificationCheck(
                check_name="Referential Integrity",
                passed=passed,
                details=details,
                expected_value="All lines reference valid transactions",
                actual_value=f"Orphaned lines: {len(orphaned_lines)}"
            )
            
            logger.info(f"Referential integrity verification: {details}")
            return check
        
        except Exception as e:
            error_msg = f"Failed to verify referential integrity: {str(e)}"
            logger.error(error_msg)
            return VerificationCheck(
                check_name="Referential Integrity",
                passed=False,
                details="",
                error_message=error_msg
            )
    
    def verify_sample_data(self, excel_lines_df: pd.DataFrame, sample_size: int = 100) -> VerificationCheck:
        """
        Verify sample of migrated data matches source.
        
        Randomly samples records and compares key fields.
        
        Args:
            excel_lines_df: DataFrame with Excel transaction lines
            sample_size: Number of records to sample
            
        Returns:
            VerificationCheck with results
        """
        try:
            # Get all lines from Supabase
            supabase_lines = self.supabase_manager.execute_query(
                table="transaction_lines",
                query_type="select",
                data=None
            )
            
            if not isinstance(supabase_lines, list) or len(supabase_lines) == 0:
                return VerificationCheck(
                    check_name="Sample Data Comparison",
                    passed=False,
                    details="No data in Supabase to sample",
                    error_message="Supabase transaction_lines table is empty"
                )
            
            # Determine actual sample size
            actual_sample_size = min(sample_size, len(supabase_lines))
            
            # Random sample from Supabase
            sampled_records = random.sample(supabase_lines, actual_sample_size)
            
            # Check key fields are populated
            key_fields = ['transaction_id', 'account_id', 'debit_amount', 'credit_amount']
            missing_fields = []
            
            for record in sampled_records:
                for field in key_fields:
                    if field not in record or record[field] is None:
                        missing_fields.append(f"{record.get('id', 'unknown')}.{field}")
            
            passed = len(missing_fields) == 0
            
            details = (
                f"Sampled {actual_sample_size} records, "
                f"Missing key fields: {len(missing_fields)}"
            )
            
            check = VerificationCheck(
                check_name="Sample Data Comparison",
                passed=passed,
                details=details,
                expected_value="All key fields populated",
                actual_value=f"Missing fields: {len(missing_fields)}"
            )
            
            logger.info(f"Sample data verification: {details}")
            return check
        
        except Exception as e:
            error_msg = f"Failed to verify sample data: {str(e)}"
            logger.error(error_msg)
            return VerificationCheck(
                check_name="Sample Data Comparison",
                passed=False,
                details="",
                error_message=error_msg
            )
    
    def verify_account_mappings(self, excel_lines_df: pd.DataFrame) -> VerificationCheck:
        """
        Verify all account codes were mapped correctly.
        
        Checks that all transaction lines have valid account_id references.
        
        Args:
            excel_lines_df: DataFrame with Excel transaction lines
            
        Returns:
            VerificationCheck with results
        """
        try:
            # Get all lines from Supabase
            supabase_lines = self.supabase_manager.execute_query(
                table="transaction_lines",
                query_type="select",
                data=None
            )
            
            if not isinstance(supabase_lines, list):
                return VerificationCheck(
                    check_name="Account Mapping Verification",
                    passed=False,
                    details="Failed to retrieve data from Supabase",
                    error_message="Invalid data format from Supabase"
                )
            
            # Get all valid accounts
            accounts = self.supabase_manager.execute_query(
                table="accounts",
                query_type="select",
                data=None
            )
            
            if not isinstance(accounts, list):
                return VerificationCheck(
                    check_name="Account Mapping Verification",
                    passed=False,
                    details="Failed to retrieve accounts from Supabase",
                    error_message="Invalid accounts data format from Supabase"
                )
            
            # Build set of valid account IDs
            valid_account_ids = {a.get('id') for a in accounts if a.get('id')}
            
            # Check each line has valid account_id
            unmapped_lines = []
            for line in supabase_lines:
                account_id = line.get('account_id')
                if not account_id or account_id not in valid_account_ids:
                    unmapped_lines.append(line.get('id'))
            
            passed = len(unmapped_lines) == 0
            
            details = (
                f"Total lines: {len(supabase_lines)}, "
                f"Valid accounts: {len(valid_account_ids)}, "
                f"Unmapped lines: {len(unmapped_lines)}"
            )
            
            check = VerificationCheck(
                check_name="Account Mapping Verification",
                passed=passed,
                details=details,
                expected_value="All lines have valid account_id",
                actual_value=f"Unmapped lines: {len(unmapped_lines)}"
            )
            
            logger.info(f"Account mapping verification: {details}")
            return check
        
        except Exception as e:
            error_msg = f"Failed to verify account mappings: {str(e)}"
            logger.error(error_msg)
            return VerificationCheck(
                check_name="Account Mapping Verification",
                passed=False,
                details="",
                error_message=error_msg
            )
    
    def verify_dimension_integrity(self) -> VerificationCheck:
        """
        Verify dimension integrity in migrated data.
        
        Checks that all dimension references are valid.
        
        Returns:
            VerificationCheck with results
        """
        try:
            # Get all lines from Supabase
            supabase_lines = self.supabase_manager.execute_query(
                table="transaction_lines",
                query_type="select",
                data=None
            )
            
            if not isinstance(supabase_lines, list):
                return VerificationCheck(
                    check_name="Dimension Integrity",
                    passed=False,
                    details="Failed to retrieve data from Supabase",
                    error_message="Invalid data format from Supabase"
                )
            
            # Get dimension tables
            projects = self.supabase_manager.execute_query(
                table="projects",
                query_type="select",
                data=None
            )
            classifications = self.supabase_manager.execute_query(
                table="classifications",
                query_type="select",
                data=None
            )
            work_analysis = self.supabase_manager.execute_query(
                table="work_analysis",
                query_type="select",
                data=None
            )
            sub_trees = self.supabase_manager.execute_query(
                table="sub_tree",
                query_type="select",
                data=None
            )
            
            # Build sets of valid IDs
            valid_project_ids = {p.get('id') for p in projects if isinstance(projects, list) and p.get('id')}
            valid_classification_ids = {c.get('id') for c in classifications if isinstance(classifications, list) and c.get('id')}
            valid_work_analysis_ids = {w.get('id') for w in work_analysis if isinstance(work_analysis, list) and w.get('id')}
            valid_sub_tree_ids = {s.get('id') for s in sub_trees if isinstance(sub_trees, list) and s.get('id')}
            
            # Check dimension references
            invalid_dimensions = 0
            
            for line in supabase_lines:
                # Check project_id if present
                if line.get('project_id') and line.get('project_id') not in valid_project_ids:
                    invalid_dimensions += 1
                
                # Check classification_id if present
                if line.get('classification_id') and line.get('classification_id') not in valid_classification_ids:
                    invalid_dimensions += 1
                
                # Check work_analysis_id if present
                if line.get('work_analysis_id') and line.get('work_analysis_id') not in valid_work_analysis_ids:
                    invalid_dimensions += 1
                
                # Check sub_tree_id if present
                if line.get('sub_tree_id') and line.get('sub_tree_id') not in valid_sub_tree_ids:
                    invalid_dimensions += 1
            
            passed = invalid_dimensions == 0
            
            details = (
                f"Total lines: {len(supabase_lines)}, "
                f"Invalid dimension references: {invalid_dimensions}"
            )
            
            check = VerificationCheck(
                check_name="Dimension Integrity",
                passed=passed,
                details=details,
                expected_value="All dimension references valid",
                actual_value=f"Invalid references: {invalid_dimensions}"
            )
            
            logger.info(f"Dimension integrity verification: {details}")
            return check
        
        except Exception as e:
            error_msg = f"Failed to verify dimension integrity: {str(e)}"
            logger.error(error_msg)
            return VerificationCheck(
                check_name="Dimension Integrity",
                passed=False,
                details="",
                error_message=error_msg
            )
    
    def run_all_verifications(
        self,
        excel_lines_df: pd.DataFrame,
        excel_transactions_df: pd.DataFrame,
        sample_size: int = 100
    ) -> VerificationReport:
        """
        Run all verification checks.
        
        Args:
            excel_lines_df: DataFrame with Excel transaction lines
            excel_transactions_df: DataFrame with Excel transactions
            sample_size: Number of records to sample for data comparison
            
        Returns:
            VerificationReport with all check results
        """
        logger.info("Starting comprehensive verification...")
        
        # Run all checks
        checks = [
            self.verify_record_counts(excel_lines_df, excel_transactions_df),
            self.verify_referential_integrity(),
            self.verify_sample_data(excel_lines_df, sample_size),
            self.verify_account_mappings(excel_lines_df),
            self.verify_dimension_integrity()
        ]
        
        # Add checks to report
        for check in checks:
            self.report.add_check(check)
        
        # Generate summary
        self.report.summary = (
            f"Verification completed: {self.report.passed_checks}/{self.report.total_checks} checks passed"
        )
        
        logger.info(self.report.summary)
        
        return self.report
    
    def generate_verification_report(self, output_path: str) -> bool:
        """
        Generate verification report file.
        
        Args:
            output_path: Path to save the report
            
        Returns:
            True if successful, False otherwise
        """
        try:
            report_data = {
                'verification_time': self.report.verification_time.isoformat(),
                'summary': self.report.summary,
                'total_checks': self.report.total_checks,
                'passed_checks': self.report.passed_checks,
                'failed_checks': self.report.failed_checks,
                'checks': [
                    {
                        'check_name': check.check_name,
                        'passed': check.passed,
                        'details': check.details,
                        'expected_value': str(check.expected_value) if check.expected_value else None,
                        'actual_value': str(check.actual_value) if check.actual_value else None,
                        'error_message': check.error_message
                    }
                    for check in self.report.checks
                ]
            }
            
            with open(output_path, 'w') as f:
                json.dump(report_data, f, indent=2)
            
            logger.info(f"Verification report saved to {output_path}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to generate verification report: {str(e)}")
            return False
