"""
Migration Executor for Excel Data Migration to Supabase

This module provides the core migration functionality:
- Dry-run mode (simulate without database writes)
- Batch insert with configurable batch size
- Process in order: transactions first, then transaction_lines
- Track progress with tqdm progress bar
- Log each batch: records_attempted, records_succeeded, records_failed
- Continue on errors (log and skip failed records)
- Generate migration summary report
"""

import logging
import json
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime
import pandas as pd
from tqdm import tqdm
import backoff

from src.analyzer.supabase_connection import SupabaseConnectionManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class BatchResult:
    """Result of a single batch operation"""
    batch_number: int
    table_name: str
    records_attempted: int
    records_succeeded: int = 0
    records_failed: int = 0
    failed_records: List[Dict[str, Any]] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    execution_time: float = 0.0


@dataclass
class MigrationSummary:
    """Summary of migration execution"""
    success: bool
    dry_run: bool
    start_time: datetime
    end_time: Optional[datetime] = None
    total_execution_time: float = 0.0
    
    # Transaction statistics
    transactions_attempted: int = 0
    transactions_succeeded: int = 0
    transactions_failed: int = 0
    
    # Transaction line statistics
    lines_attempted: int = 0
    lines_succeeded: int = 0
    lines_failed: int = 0
    
    # Batch statistics
    transaction_batches: List[BatchResult] = field(default_factory=list)
    line_batches: List[BatchResult] = field(default_factory=list)
    
    # Error tracking
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


class MigrationExecutor:
    """
    Executes the migration of Excel data to Supabase.
    
    This class:
    1. Implements dry-run mode (simulate without database writes)
    2. Implements batch insert with configurable batch size
    3. Processes in order: transactions first, then transaction_lines
    4. Tracks progress with tqdm progress bar
    5. Logs each batch: records_attempted, records_succeeded, records_failed
    6. Continues on errors (logs and skips failed records)
    7. Generates migration summary report
    """
    
    def __init__(
        self,
        supabase_manager: SupabaseConnectionManager,
        batch_size: int = 100,
        dry_run: bool = True,
        org_id: str = None
    ):
        """
        Initialize migration executor.
        
        Args:
            supabase_manager: SupabaseConnectionManager instance
            batch_size: Number of records per batch (default: 100)
            dry_run: If True, simulate without database writes (default: True)
            org_id: Organization ID to assign to all records (required for RLS)
        """
        self.supabase_manager = supabase_manager
        self.batch_size = batch_size
        self.dry_run = dry_run
        self.org_id = org_id
        self.summary = MigrationSummary(
            success=False,
            dry_run=dry_run,
            start_time=datetime.now()
        )
        
        logger.info(
            f"Initialized MigrationExecutor: batch_size={batch_size}, "
            f"dry_run={dry_run}, org_id={org_id}"
        )
    
    def migrate_transactions(
        self,
        transactions_df: pd.DataFrame
    ) -> Tuple[bool, List[BatchResult]]:
        """
        Migrate transaction headers to Supabase.
        
        Args:
            transactions_df: DataFrame with transaction headers
            
        Returns:
            Tuple of (success: bool, batch_results: List[BatchResult])
        """
        logger.info(f"Starting transaction migration: {len(transactions_df)} records")
        
        if transactions_df.empty:
            logger.warning("No transactions to migrate")
            return True, []
        
        batch_results = []
        total_batches = (len(transactions_df) + self.batch_size - 1) // self.batch_size
        
        with tqdm(
            total=len(transactions_df),
            desc="Migrating Transactions",
            unit="records"
        ) as pbar:
            for batch_num in range(total_batches):
                start_idx = batch_num * self.batch_size
                end_idx = min(start_idx + self.batch_size, len(transactions_df))
                batch_df = transactions_df.iloc[start_idx:end_idx]
                
                batch_result = self._process_batch(
                    batch_num=batch_num + 1,
                    table_name="transactions",
                    batch_df=batch_df
                )
                
                batch_results.append(batch_result)
                
                # Update summary
                self.summary.transactions_attempted += batch_result.records_attempted
                self.summary.transactions_succeeded += batch_result.records_succeeded
                self.summary.transactions_failed += batch_result.records_failed
                self.summary.transaction_batches.append(batch_result)
                
                # Update progress bar
                pbar.update(batch_result.records_attempted)
                pbar.set_postfix({
                    'succeeded': batch_result.records_succeeded,
                    'failed': batch_result.records_failed
                })
                
                # Log batch result
                logger.info(
                    f"Batch {batch_num + 1}/{total_batches}: "
                    f"attempted={batch_result.records_attempted}, "
                    f"succeeded={batch_result.records_succeeded}, "
                    f"failed={batch_result.records_failed}"
                )
        
        success = self.summary.transactions_failed == 0
        logger.info(
            f"Transaction migration complete: "
            f"succeeded={self.summary.transactions_succeeded}, "
            f"failed={self.summary.transactions_failed}"
        )
        
        return success, batch_results
    
    def migrate_transaction_lines(
        self,
        lines_df: pd.DataFrame
    ) -> Tuple[bool, List[BatchResult]]:
        """
        Migrate transaction lines to Supabase.
        
        Args:
            lines_df: DataFrame with transaction lines
            
        Returns:
            Tuple of (success: bool, batch_results: List[BatchResult])
        """
        logger.info(f"Starting transaction lines migration: {len(lines_df)} records")
        
        if lines_df.empty:
            logger.warning("No transaction lines to migrate")
            return True, []
        
        batch_results = []
        total_batches = (len(lines_df) + self.batch_size - 1) // self.batch_size
        
        with tqdm(
            total=len(lines_df),
            desc="Migrating Transaction Lines",
            unit="records"
        ) as pbar:
            for batch_num in range(total_batches):
                start_idx = batch_num * self.batch_size
                end_idx = min(start_idx + self.batch_size, len(lines_df))
                batch_df = lines_df.iloc[start_idx:end_idx]
                
                batch_result = self._process_batch(
                    batch_num=batch_num + 1,
                    table_name="transaction_lines",
                    batch_df=batch_df
                )
                
                batch_results.append(batch_result)
                
                # Update summary
                self.summary.lines_attempted += batch_result.records_attempted
                self.summary.lines_succeeded += batch_result.records_succeeded
                self.summary.lines_failed += batch_result.records_failed
                self.summary.line_batches.append(batch_result)
                
                # Update progress bar
                pbar.update(batch_result.records_attempted)
                pbar.set_postfix({
                    'succeeded': batch_result.records_succeeded,
                    'failed': batch_result.records_failed
                })
                
                # Log batch result
                logger.info(
                    f"Batch {batch_num + 1}/{total_batches}: "
                    f"attempted={batch_result.records_attempted}, "
                    f"succeeded={batch_result.records_succeeded}, "
                    f"failed={batch_result.records_failed}"
                )
        
        success = self.summary.lines_failed == 0
        logger.info(
            f"Transaction lines migration complete: "
            f"succeeded={self.summary.lines_succeeded}, "
            f"failed={self.summary.lines_failed}"
        )
        
        return success, batch_results
    
    def _process_batch(
        self,
        batch_num: int,
        table_name: str,
        batch_df: pd.DataFrame
    ) -> BatchResult:
        """
        Process a single batch of records.
        
        Args:
            batch_num: Batch number for logging
            table_name: Name of the table to insert into
            batch_df: DataFrame with records to insert
            
        Returns:
            BatchResult with execution details
        """
        import time
        start_time = time.time()
        
        batch_result = BatchResult(
            batch_number=batch_num,
            table_name=table_name,
            records_attempted=len(batch_df)
        )
        
        if self.dry_run:
            # In dry-run mode, simulate success for all records
            batch_result.records_succeeded = len(batch_df)
            batch_result.records_failed = 0
            logger.debug(f"DRY-RUN: Would insert {len(batch_df)} records into {table_name}")
        else:
            # In execute mode, attempt to insert records
            batch_result = self._insert_batch(
                batch_result=batch_result,
                table_name=table_name,
                batch_df=batch_df
            )
        
        batch_result.execution_time = time.time() - start_time
        return batch_result
    
    @backoff.on_exception(
        backoff.expo,
        Exception,
        max_tries=3,
        logger=logger
    )
    def _insert_batch(
        self,
        batch_result: BatchResult,
        table_name: str,
        batch_df: pd.DataFrame
    ) -> BatchResult:
        """
        Insert a batch of records into Supabase.
        
        Uses exponential backoff for retries on transient failures.
        
        Args:
            batch_result: BatchResult to update
            table_name: Name of the table to insert into
            batch_df: DataFrame with records to insert
            
        Returns:
            Updated BatchResult
        """
        try:
            # Convert DataFrame to list of dictionaries
            records = batch_df.to_dict('records')
            
            # Attempt to insert all records
            for idx, record in enumerate(records):
                try:
                    # Clean record: remove NaN values and convert to appropriate types
                    clean_record = self._clean_record(record, table_name=table_name)
                    
                    # Insert record
                    self.supabase_manager.execute_query(
                        table=table_name,
                        query_type="insert",
                        data=clean_record
                    )
                    
                    batch_result.records_succeeded += 1
                    
                except Exception as e:
                    batch_result.records_failed += 1
                    error_msg = f"Row {idx}: {str(e)}"
                    batch_result.errors.append(error_msg)
                    batch_result.failed_records.append({
                        'row_index': idx,
                        'record': record,
                        'error': str(e)
                    })
                    logger.warning(f"Failed to insert record in {table_name}: {error_msg}")
                    # Continue with next record
                    continue
        
        except Exception as e:
            # Batch-level error
            batch_result.records_failed = len(batch_df)
            batch_result.records_succeeded = 0
            error_msg = f"Batch-level error: {str(e)}"
            batch_result.errors.append(error_msg)
            logger.error(f"Batch insert failed for {table_name}: {error_msg}")
        
        return batch_result
    
    def _clean_record(self, record: Dict[str, Any], table_name: str = None) -> Dict[str, Any]:
        """
        Clean a record for database insertion.
        
        - Remove NaN values
        - Convert datetime objects to ISO format strings
        - Convert numpy types to Python types
        - Add org_id if not present (required for RLS)
        - Filter columns based on table schema
        - Map Excel column names to Supabase column names
        
        Args:
            record: Record dictionary
            table_name: Name of the table being inserted into (for column filtering)
            
        Returns:
            Cleaned record dictionary
        """
        import numpy as np
        
        # Column name mapping from Excel to Supabase (ACTUAL SCHEMA)
        # Note: Mapping depends on table context - handled below
        column_mapping = {
            'entry no': 'entry_number' if table_name == 'transactions' else 'entry_no',  # entry_number for transactions, entry_no for lines
            'entry date': 'entry_date',
            'description': 'description',  # Maps to description (NOT NULL column)
            'account code': 'account_code',
            'account name': 'account_name',
            'transaction classification code': 'transaction_classification_code',
            'classification code': 'classification_code',
            'classification name': 'classification_name',
            'project code': 'project_code',
            'project name': 'project_name',
            'work analysis code': 'work_analysis_code',
            'work analysis name': 'work_analysis_name',
            'sub_tree code': 'sub_tree_code',
            'sub_tree name': 'sub_tree_name',
            'debit': 'debit_amount',  # Maps to debit_amount
            'credit': 'credit_amount',  # Maps to credit_amount
            'notes': 'description'  # Maps to description field (fallback)
        }
        
        # Define valid columns for each table based on ACTUAL Supabase schema
        # CRITICAL: Only include columns that can be inserted from Excel
        valid_columns = {
            'transactions': {
                'entry_number',  # From Excel: "entry no"
                'entry_date',    # From Excel: "entry date"
                'description',   # From Excel: "description" (NOT NULL column)
                'org_id'         # Added by migration (required for RLS)
            },
            'transaction_lines': {
                'entry_no',      # Links to transaction header (from Excel: "entry no")
                'account_code',  # From Excel: "account code"
                'account_name',  # From Excel: "account name"
                'transaction_classification_code',  # From Excel: "transaction classification code"
                'classification_code',  # From Excel: "classification code"
                'classification_name',  # From Excel: "classification name"
                'project_code',  # From Excel: "project code"
                'project_name',  # From Excel: "project name"
                'work_analysis_code',  # From Excel: "work analysis code"
                'work_analysis_name',  # From Excel: "work analysis name"
                'sub_tree_code',  # From Excel: "sub_tree code"
                'sub_tree_name',  # From Excel: "sub_tree name"
                'debit_amount',  # From Excel: "debit"
                'credit_amount',  # From Excel: "credit"
                'description',   # From Excel: "notes"
                'org_id'         # Added by migration (required for RLS)
            }
        }
        
        cleaned = {}
        allowed_cols = valid_columns.get(table_name, set())
        
        for key, value in record.items():
            # Map Excel column name to Supabase column name
            mapped_key = column_mapping.get(key, key)
            
            # Skip columns not valid for this table
            if table_name and allowed_cols and mapped_key not in allowed_cols:
                continue
            
            # Skip NaN values
            if pd.isna(value):
                continue
            
            # Convert datetime to ISO format string
            if isinstance(value, datetime):
                cleaned[mapped_key] = value.isoformat()
            # Convert numpy types to Python types
            elif isinstance(value, (np.integer, np.floating)):
                cleaned[mapped_key] = value.item()
            elif isinstance(value, np.bool_):
                cleaned[mapped_key] = bool(value)
            else:
                cleaned[mapped_key] = value
        
        # Ensure org_id is set (required for RLS policies)
        if self.org_id and 'org_id' not in cleaned:
            cleaned['org_id'] = self.org_id
        
        return cleaned
    
    def extract_dimensions(self, lines_df: pd.DataFrame) -> Dict[str, List[str]]:
        """
        Extract all unique dimension values from transaction lines.
        
        Identifies all unique values for each dimension type:
        - project_code
        - classification_code
        - work_analysis_code
        - sub_tree_code
        
        Args:
            lines_df: DataFrame with transaction lines
            
        Returns:
            Dictionary with dimension_type -> list of unique codes
        """
        dimensions = {
            'project_codes': [],
            'classification_codes': [],
            'work_analysis_codes': [],
            'sub_tree_codes': []
        }
        
        # Extract unique project codes
        if 'project_code' in lines_df.columns:
            project_codes = lines_df['project_code'].dropna().unique().tolist()
            dimensions['project_codes'] = [str(code) for code in project_codes if code]
        
        # Extract unique classification codes
        if 'classification_code' in lines_df.columns:
            classification_codes = lines_df['classification_code'].dropna().unique().tolist()
            dimensions['classification_codes'] = [str(code) for code in classification_codes if code]
        
        # Extract unique work analysis codes
        if 'work_analysis_code' in lines_df.columns:
            work_analysis_codes = lines_df['work_analysis_code'].dropna().unique().tolist()
            dimensions['work_analysis_codes'] = [str(code) for code in work_analysis_codes if code]
        
        # Extract unique sub_tree codes
        if 'sub_tree_code' in lines_df.columns:
            sub_tree_codes = lines_df['sub_tree_code'].dropna().unique().tolist()
            dimensions['sub_tree_codes'] = [str(code) for code in sub_tree_codes if code]
        
        logger.info(
            f"Extracted dimensions: "
            f"projects={len(dimensions['project_codes'])}, "
            f"classifications={len(dimensions['classification_codes'])}, "
            f"work_analysis={len(dimensions['work_analysis_codes'])}, "
            f"sub_trees={len(dimensions['sub_tree_codes'])}"
        )
        
        return dimensions
    
    def map_dimensions_to_supabase(
        self,
        lines_df: pd.DataFrame,
        dimension_mapper: Optional[Any] = None
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Map dimension codes from Excel to Supabase IDs.
        
        Uses DimensionMapper to convert dimension codes to Supabase IDs.
        Preserves all dimension values during migration.
        
        Args:
            lines_df: DataFrame with transaction lines
            dimension_mapper: DimensionMapper instance (optional)
            
        Returns:
            Tuple of (mapped_df: DataFrame, mapping_report: Dict)
        """
        if dimension_mapper is None:
            logger.warning("No dimension mapper provided, skipping dimension mapping")
            return lines_df, {'status': 'skipped', 'reason': 'no_mapper'}
        
        mapped_df = lines_df.copy()
        mapping_report = {
            'status': 'completed',
            'dimensions_mapped': {},
            'unmapped_dimensions': {},
            'warnings': []
        }
        
        # Map project codes
        if 'project_code' in mapped_df.columns:
            try:
                mapped_df['project_id'] = mapped_df['project_code'].apply(
                    lambda x: dimension_mapper.map_project_code(x) if pd.notna(x) else None
                )
                unmapped_projects = mapped_df[
                    (mapped_df['project_code'].notna()) & 
                    (mapped_df['project_id'].isna())
                ]['project_code'].unique()
                
                if len(unmapped_projects) > 0:
                    mapping_report['unmapped_dimensions']['projects'] = unmapped_projects.tolist()
                    mapping_report['warnings'].append(
                        f"Found {len(unmapped_projects)} unmapped project codes"
                    )
                else:
                    mapping_report['dimensions_mapped']['projects'] = 'all_mapped'
                
                logger.info(f"Mapped project codes: {len(mapped_df['project_id'].dropna())} records")
            except Exception as e:
                logger.error(f"Failed to map project codes: {str(e)}")
                mapping_report['warnings'].append(f"Project mapping error: {str(e)}")
        
        # Map classification codes
        if 'classification_code' in mapped_df.columns:
            try:
                mapped_df['classification_id'] = mapped_df['classification_code'].apply(
                    lambda x: dimension_mapper.map_classification_code(x) if pd.notna(x) else None
                )
                unmapped_classifications = mapped_df[
                    (mapped_df['classification_code'].notna()) & 
                    (mapped_df['classification_id'].isna())
                ]['classification_code'].unique()
                
                if len(unmapped_classifications) > 0:
                    mapping_report['unmapped_dimensions']['classifications'] = unmapped_classifications.tolist()
                    mapping_report['warnings'].append(
                        f"Found {len(unmapped_classifications)} unmapped classification codes"
                    )
                else:
                    mapping_report['dimensions_mapped']['classifications'] = 'all_mapped'
                
                logger.info(f"Mapped classification codes: {len(mapped_df['classification_id'].dropna())} records")
            except Exception as e:
                logger.error(f"Failed to map classification codes: {str(e)}")
                mapping_report['warnings'].append(f"Classification mapping error: {str(e)}")
        
        # Map work analysis codes
        if 'work_analysis_code' in mapped_df.columns:
            try:
                mapped_df['work_analysis_id'] = mapped_df['work_analysis_code'].apply(
                    lambda x: dimension_mapper.map_work_analysis_code(x) if pd.notna(x) else None
                )
                unmapped_work_analysis = mapped_df[
                    (mapped_df['work_analysis_code'].notna()) & 
                    (mapped_df['work_analysis_id'].isna())
                ]['work_analysis_code'].unique()
                
                if len(unmapped_work_analysis) > 0:
                    mapping_report['unmapped_dimensions']['work_analysis'] = unmapped_work_analysis.tolist()
                    mapping_report['warnings'].append(
                        f"Found {len(unmapped_work_analysis)} unmapped work analysis codes"
                    )
                else:
                    mapping_report['dimensions_mapped']['work_analysis'] = 'all_mapped'
                
                logger.info(f"Mapped work analysis codes: {len(mapped_df['work_analysis_id'].dropna())} records")
            except Exception as e:
                logger.error(f"Failed to map work analysis codes: {str(e)}")
                mapping_report['warnings'].append(f"Work analysis mapping error: {str(e)}")
        
        # Map sub_tree codes
        if 'sub_tree_code' in mapped_df.columns:
            try:
                mapped_df['sub_tree_id'] = mapped_df['sub_tree_code'].apply(
                    lambda x: dimension_mapper.map_sub_tree_code(x) if pd.notna(x) else None
                )
                unmapped_sub_trees = mapped_df[
                    (mapped_df['sub_tree_code'].notna()) & 
                    (mapped_df['sub_tree_id'].isna())
                ]['sub_tree_code'].unique()
                
                if len(unmapped_sub_trees) > 0:
                    mapping_report['unmapped_dimensions']['sub_trees'] = unmapped_sub_trees.tolist()
                    mapping_report['warnings'].append(
                        f"Found {len(unmapped_sub_trees)} unmapped sub_tree codes"
                    )
                else:
                    mapping_report['dimensions_mapped']['sub_trees'] = 'all_mapped'
                
                logger.info(f"Mapped sub_tree codes: {len(mapped_df['sub_tree_id'].dropna())} records")
            except Exception as e:
                logger.error(f"Failed to map sub_tree codes: {str(e)}")
                mapping_report['warnings'].append(f"Sub_tree mapping error: {str(e)}")
        
        return mapped_df, mapping_report
    
    def detect_missing_dimensions(self, lines_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Detect missing dimensions in Supabase that exist in Excel.
        
        Identifies dimension values that don't have corresponding entries
        in the Supabase dimension tables.
        
        Args:
            lines_df: DataFrame with transaction lines
            
        Returns:
            Dictionary with missing dimensions by type
        """
        missing_report = {
            'missing_dimensions': {},
            'total_missing': 0
        }
        
        # Check for missing project dimensions
        if 'project_id' in lines_df.columns:
            missing_projects = lines_df[
                (lines_df['project_code'].notna()) & 
                (lines_df['project_id'].isna())
            ]['project_code'].unique()
            
            if len(missing_projects) > 0:
                missing_report['missing_dimensions']['projects'] = missing_projects.tolist()
                missing_report['total_missing'] += len(missing_projects)
        
        # Check for missing classification dimensions
        if 'classification_id' in lines_df.columns:
            missing_classifications = lines_df[
                (lines_df['classification_code'].notna()) & 
                (lines_df['classification_id'].isna())
            ]['classification_code'].unique()
            
            if len(missing_classifications) > 0:
                missing_report['missing_dimensions']['classifications'] = missing_classifications.tolist()
                missing_report['total_missing'] += len(missing_classifications)
        
        # Check for missing work analysis dimensions
        if 'work_analysis_id' in lines_df.columns:
            missing_work_analysis = lines_df[
                (lines_df['work_analysis_code'].notna()) & 
                (lines_df['work_analysis_id'].isna())
            ]['work_analysis_code'].unique()
            
            if len(missing_work_analysis) > 0:
                missing_report['missing_dimensions']['work_analysis'] = missing_work_analysis.tolist()
                missing_report['total_missing'] += len(missing_work_analysis)
        
        # Check for missing sub_tree dimensions
        if 'sub_tree_id' in lines_df.columns:
            missing_sub_trees = lines_df[
                (lines_df['sub_tree_code'].notna()) & 
                (lines_df['sub_tree_id'].isna())
            ]['sub_tree_code'].unique()
            
            if len(missing_sub_trees) > 0:
                missing_report['missing_dimensions']['sub_trees'] = missing_sub_trees.tolist()
                missing_report['total_missing'] += len(missing_sub_trees)
        
        if missing_report['total_missing'] > 0:
            logger.warning(f"Found {missing_report['total_missing']} missing dimensions in Supabase")
        else:
            logger.info("All dimensions found in Supabase")
        
        return missing_report
    
    def generate_migration_report(self, output_path: str) -> bool:
        """
        Generate migration summary report.
        
        Args:
            output_path: Path to save the report
            
        Returns:
            True if report was generated successfully
        """
        try:
            self.summary.end_time = datetime.now()
            self.summary.total_execution_time = (
                self.summary.end_time - self.summary.start_time
            ).total_seconds()
            
            # Determine overall success
            self.summary.success = (
                self.summary.transactions_failed == 0 and
                self.summary.lines_failed == 0
            )
            
            # Create report content
            report = self._create_report_content()
            
            # Write to file
            with open(output_path, 'w') as f:
                f.write(report)
            
            logger.info(f"Migration report generated: {output_path}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to generate migration report: {str(e)}")
            return False
    
    def _create_report_content(self) -> str:
        """
        Create migration report content.
        
        Returns:
            Report content as string
        """
        lines = []
        lines.append("=" * 80)
        lines.append("MIGRATION EXECUTION REPORT")
        lines.append("=" * 80)
        lines.append("")
        
        # Header information
        lines.append("EXECUTION SUMMARY")
        lines.append("-" * 80)
        lines.append(f"Mode: {'DRY-RUN' if self.summary.dry_run else 'EXECUTE'}")
        lines.append(f"Status: {'SUCCESS' if self.summary.success else 'FAILED'}")
        lines.append(f"Start Time: {self.summary.start_time.isoformat()}")
        lines.append(f"End Time: {self.summary.end_time.isoformat() if self.summary.end_time else 'N/A'}")
        lines.append(f"Total Execution Time: {self.summary.total_execution_time:.2f} seconds")
        lines.append("")
        
        # Transaction statistics
        lines.append("TRANSACTION STATISTICS")
        lines.append("-" * 80)
        lines.append(f"Total Attempted: {self.summary.transactions_attempted}")
        lines.append(f"Total Succeeded: {self.summary.transactions_succeeded}")
        lines.append(f"Total Failed: {self.summary.transactions_failed}")
        if self.summary.transactions_attempted > 0:
            success_rate = (
                self.summary.transactions_succeeded / self.summary.transactions_attempted * 100
            )
            lines.append(f"Success Rate: {success_rate:.2f}%")
        lines.append("")
        
        # Transaction line statistics
        lines.append("TRANSACTION LINE STATISTICS")
        lines.append("-" * 80)
        lines.append(f"Total Attempted: {self.summary.lines_attempted}")
        lines.append(f"Total Succeeded: {self.summary.lines_succeeded}")
        lines.append(f"Total Failed: {self.summary.lines_failed}")
        if self.summary.lines_attempted > 0:
            success_rate = (
                self.summary.lines_succeeded / self.summary.lines_attempted * 100
            )
            lines.append(f"Success Rate: {success_rate:.2f}%")
        lines.append("")
        
        # Batch details
        if self.summary.transaction_batches:
            lines.append("TRANSACTION BATCH DETAILS")
            lines.append("-" * 80)
            for batch in self.summary.transaction_batches:
                lines.append(
                    f"Batch {batch.batch_number}: "
                    f"attempted={batch.records_attempted}, "
                    f"succeeded={batch.records_succeeded}, "
                    f"failed={batch.records_failed}, "
                    f"time={batch.execution_time:.2f}s"
                )
            lines.append("")
        
        if self.summary.line_batches:
            lines.append("TRANSACTION LINE BATCH DETAILS")
            lines.append("-" * 80)
            for batch in self.summary.line_batches:
                lines.append(
                    f"Batch {batch.batch_number}: "
                    f"attempted={batch.records_attempted}, "
                    f"succeeded={batch.records_succeeded}, "
                    f"failed={batch.records_failed}, "
                    f"time={batch.execution_time:.2f}s"
                )
            lines.append("")
        
        # Errors
        if self.summary.errors:
            lines.append("ERRORS")
            lines.append("-" * 80)
            for error in self.summary.errors:
                lines.append(f"- {error}")
            lines.append("")
        
        # Warnings
        if self.summary.warnings:
            lines.append("WARNINGS")
            lines.append("-" * 80)
            for warning in self.summary.warnings:
                lines.append(f"- {warning}")
            lines.append("")
        
        lines.append("=" * 80)
        
        return "\n".join(lines)
    
    def get_summary(self) -> MigrationSummary:
        """
        Get migration summary.
        
        Returns:
            MigrationSummary object
        """
        return self.summary
    
    def export_summary_json(self, output_path: str) -> bool:
        """
        Export migration summary as JSON.
        
        Args:
            output_path: Path to save the JSON file
            
        Returns:
            True if export was successful
        """
        try:
            # Convert summary to dictionary
            summary_dict = {
                'success': self.summary.success,
                'dry_run': self.summary.dry_run,
                'start_time': self.summary.start_time.isoformat(),
                'end_time': self.summary.end_time.isoformat() if self.summary.end_time else None,
                'total_execution_time': self.summary.total_execution_time,
                'transactions': {
                    'attempted': self.summary.transactions_attempted,
                    'succeeded': self.summary.transactions_succeeded,
                    'failed': self.summary.transactions_failed,
                },
                'lines': {
                    'attempted': self.summary.lines_attempted,
                    'succeeded': self.summary.lines_succeeded,
                    'failed': self.summary.lines_failed,
                },
                'batch_count': {
                    'transaction_batches': len(self.summary.transaction_batches),
                    'line_batches': len(self.summary.line_batches),
                },
                'errors': self.summary.errors,
                'warnings': self.summary.warnings,
            }
            
            # Write to file
            with open(output_path, 'w') as f:
                json.dump(summary_dict, f, indent=2)
            
            logger.info(f"Migration summary exported to JSON: {output_path}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to export migration summary: {str(e)}")
            return False


    def create_backup(self, backup_path: str) -> Tuple[bool, str]:
        """
        Create a backup of current Supabase data before migration.
        
        Exports transactions and transaction_lines tables to JSON files.
        
        Args:
            backup_path: Directory path to store backup files
            
        Returns:
            Tuple of (success: bool, backup_info: str)
        """
        import os
        from pathlib import Path
        
        try:
            # Create backup directory if it doesn't exist
            Path(backup_path).mkdir(parents=True, exist_ok=True)
            
            # Create timestamp for backup
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Backup transactions table
            logger.info("Backing up transactions table...")
            transactions_backup_file = os.path.join(
                backup_path,
                f"transactions_backup_{timestamp}.json"
            )
            
            try:
                transactions_data = self.supabase_manager.execute_query(
                    table="transactions",
                    query_type="select",
                    data=None
                )
                
                with open(transactions_backup_file, 'w') as f:
                    json.dump(transactions_data, f, indent=2, default=str)
                
                logger.info(f"Transactions backup created: {transactions_backup_file}")
            except Exception as e:
                logger.error(f"Failed to backup transactions: {str(e)}")
                return False, f"Failed to backup transactions: {str(e)}"
            
            # Backup transaction_lines table
            logger.info("Backing up transaction_lines table...")
            lines_backup_file = os.path.join(
                backup_path,
                f"transaction_lines_backup_{timestamp}.json"
            )
            
            try:
                lines_data = self.supabase_manager.execute_query(
                    table="transaction_lines",
                    query_type="select",
                    data=None
                )
                
                with open(lines_backup_file, 'w') as f:
                    json.dump(lines_data, f, indent=2, default=str)
                
                logger.info(f"Transaction lines backup created: {lines_backup_file}")
            except Exception as e:
                logger.error(f"Failed to backup transaction_lines: {str(e)}")
                return False, f"Failed to backup transaction_lines: {str(e)}"
            
            # Create backup metadata
            backup_metadata = {
                'timestamp': timestamp,
                'backup_time': datetime.now().isoformat(),
                'transactions_file': transactions_backup_file,
                'transaction_lines_file': lines_backup_file,
                'transactions_count': len(transactions_data) if isinstance(transactions_data, list) else 0,
                'transaction_lines_count': len(lines_data) if isinstance(lines_data, list) else 0,
            }
            
            metadata_file = os.path.join(
                backup_path,
                f"backup_metadata_{timestamp}.json"
            )
            
            with open(metadata_file, 'w') as f:
                json.dump(backup_metadata, f, indent=2)
            
            logger.info(f"Backup metadata created: {metadata_file}")
            
            backup_info = (
                f"Backup created successfully:\n"
                f"  Transactions: {backup_metadata['transactions_count']} records\n"
                f"  Transaction Lines: {backup_metadata['transaction_lines_count']} records\n"
                f"  Backup Path: {backup_path}\n"
                f"  Timestamp: {timestamp}"
            )
            
            return True, backup_info
        
        except Exception as e:
            error_msg = f"Backup creation failed: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
    
    def rollback(self, backup_path: str, backup_timestamp: str) -> Tuple[bool, str]:
        """
        Rollback migration by restoring from backup.
        
        Deletes all records created during migration and restores from backup JSON.
        
        Args:
            backup_path: Directory path where backup files are stored
            backup_timestamp: Timestamp of the backup to restore (format: YYYYMMDD_HHMMSS)
            
        Returns:
            Tuple of (success: bool, message: str)
        """
        import os
        
        try:
            logger.info(f"Starting rollback from backup: {backup_timestamp}")
            
            # Construct backup file paths
            transactions_backup_file = os.path.join(
                backup_path,
                f"transactions_backup_{backup_timestamp}.json"
            )
            lines_backup_file = os.path.join(
                backup_path,
                f"transaction_lines_backup_{backup_timestamp}.json"
            )
            
            # Verify backup files exist
            if not os.path.exists(transactions_backup_file):
                error_msg = f"Transactions backup file not found: {transactions_backup_file}"
                logger.error(error_msg)
                return False, error_msg
            
            if not os.path.exists(lines_backup_file):
                error_msg = f"Transaction lines backup file not found: {lines_backup_file}"
                logger.error(error_msg)
                return False, error_msg
            
            # Step 1: Delete all records from transaction_lines table
            logger.info("Deleting all records from transaction_lines table...")
            try:
                self.supabase_manager.execute_query(
                    table="transaction_lines",
                    query_type="delete",
                    data=None
                )
                logger.info("Transaction lines table cleared")
            except Exception as e:
                logger.warning(f"Failed to clear transaction_lines: {str(e)}")
                # Continue anyway, as some records might have been deleted
            
            # Step 2: Delete all records from transactions table
            logger.info("Deleting all records from transactions table...")
            try:
                self.supabase_manager.execute_query(
                    table="transactions",
                    query_type="delete",
                    data=None
                )
                logger.info("Transactions table cleared")
            except Exception as e:
                logger.warning(f"Failed to clear transactions: {str(e)}")
                # Continue anyway, as some records might have been deleted
            
            # Step 3: Restore transactions from backup
            logger.info("Restoring transactions from backup...")
            try:
                with open(transactions_backup_file, 'r') as f:
                    transactions_data = json.load(f)
                
                if transactions_data:
                    for record in transactions_data:
                        self.supabase_manager.execute_query(
                            table="transactions",
                            query_type="insert",
                            data=record
                        )
                    logger.info(f"Restored {len(transactions_data)} transactions")
            except Exception as e:
                error_msg = f"Failed to restore transactions: {str(e)}"
                logger.error(error_msg)
                return False, error_msg
            
            # Step 4: Restore transaction_lines from backup
            logger.info("Restoring transaction_lines from backup...")
            try:
                with open(lines_backup_file, 'r') as f:
                    lines_data = json.load(f)
                
                if lines_data:
                    for record in lines_data:
                        self.supabase_manager.execute_query(
                            table="transaction_lines",
                            query_type="insert",
                            data=record
                        )
                    logger.info(f"Restored {len(lines_data)} transaction lines")
            except Exception as e:
                error_msg = f"Failed to restore transaction_lines: {str(e)}"
                logger.error(error_msg)
                return False, error_msg
            
            # Step 5: Verify restoration
            logger.info("Verifying restoration...")
            try:
                restored_transactions = self.supabase_manager.execute_query(
                    table="transactions",
                    query_type="select",
                    data=None
                )
                restored_lines = self.supabase_manager.execute_query(
                    table="transaction_lines",
                    query_type="select",
                    data=None
                )
                
                transactions_count = len(restored_transactions) if isinstance(restored_transactions, list) else 0
                lines_count = len(restored_lines) if isinstance(restored_lines, list) else 0
                
                logger.info(
                    f"Restoration verification: "
                    f"transactions={transactions_count}, "
                    f"transaction_lines={lines_count}"
                )
                
                success_msg = (
                    f"Rollback completed successfully:\n"
                    f"  Transactions restored: {transactions_count} records\n"
                    f"  Transaction lines restored: {lines_count} records\n"
                    f"  Backup timestamp: {backup_timestamp}"
                )
                
                return True, success_msg
            
            except Exception as e:
                error_msg = f"Failed to verify restoration: {str(e)}"
                logger.error(error_msg)
                return False, error_msg
        
        except Exception as e:
            error_msg = f"Rollback failed: {str(e)}"
            logger.error(error_msg)
            return False, error_msg


def create_migration_executor(
    supabase_manager: SupabaseConnectionManager,
    batch_size: int = 100,
    dry_run: bool = True,
    org_id: str = None
) -> MigrationExecutor:
    """
    Factory function to create a MigrationExecutor instance.
    
    Args:
        supabase_manager: SupabaseConnectionManager instance
        batch_size: Number of records per batch (default: 100)
        dry_run: If True, simulate without database writes (default: True)
        org_id: Organization ID to assign to all records (required for RLS)
        
    Returns:
        MigrationExecutor instance
    """
    return MigrationExecutor(
        supabase_manager=supabase_manager,
        batch_size=batch_size,
        dry_run=dry_run,
        org_id=org_id
    )
