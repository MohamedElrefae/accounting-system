#!/usr/bin/env python3
"""
Excel to Supabase Migration CLI

Command-line interface for running the complete migration workflow.
Supports dry-run mode, batch size configuration, and full orchestration.

Usage:
    python migrate.py --mode dry-run --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
    python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
    python migrate.py validate
    python migrate.py backup
    python migrate.py rollback --backup-timestamp 20260213_143022
"""

import argparse
import json
import sys
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Tuple
import logging

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv(override=True)

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

# Import with graceful fallback for missing modules
try:
    from executor.migration_executor import create_migration_executor, MigrationExecutor
except ImportError:
    create_migration_executor = None
    MigrationExecutor = None

try:
    from analyzer.data_validator import DataValidator
except ImportError:
    DataValidator = None

try:
    from analyzer.excel_reader import ExcelReader
except ImportError:
    ExcelReader = None

try:
    from analyzer.supabase_connection import SupabaseConnectionManager
except ImportError:
    SupabaseConnectionManager = None

try:
    from services.schema_manager import SchemaManager
except ImportError:
    SchemaManager = None


class MigrationCLI:
    """Command-line interface for Excel to Supabase migration."""
    
    def __init__(self):
        """Initialize CLI with configuration."""
        self.config_dir = Path("config")
        self.reports_dir = Path("reports")
        self.backups_dir = Path("backups")
        self.excel_file = Path("transactions.xlsx")
        
        # Ensure directories exist
        self.backups_dir.mkdir(exist_ok=True)
        self.reports_dir.mkdir(exist_ok=True)
        
    def validate_command(self, args: argparse.Namespace) -> int:
        """
        Validate Excel data without migration.
        
        Args:
            args: Command-line arguments
            
        Returns:
            Exit code (0 = success, 1 = failure)
        """
        logger.info("Starting validation...")
        
        try:
            # Load Excel data
            logger.info(f"Reading Excel file: {self.excel_file}")
            excel_reader = ExcelReader(str(self.excel_file))
            result = excel_reader.read_transactions_sheet()
            if not result.success:
                error_msg = "; ".join(result.errors) if result.errors else "Unknown error"
                logger.error(f"Failed to read Excel: {error_msg}")
                print(f"\n✗ Failed to read Excel: {error_msg}\n")
                return 1
            df = result.data
            logger.info(f"Loaded {len(df)} records from Excel")
            
            # Validate data
            logger.info("Validating data...")
            validator = DataValidator()
            validation_report = validator.validate(df)
            
            # Generate report
            report_path = self.reports_dir / "validation_report.json"
            with open(report_path, 'w') as f:
                json.dump(validation_report, f, indent=2, default=str)
            logger.info(f"Validation report saved to {report_path}")
            
            # Summary
            error_count = len([e for e in validation_report.get('errors', []) if e['level'] == 'ERROR'])
            warning_count = len([e for e in validation_report.get('errors', []) if e['level'] == 'WARNING'])
            
            print(f"\n{'='*60}")
            print(f"VALIDATION SUMMARY")
            print(f"{'='*60}")
            print(f"Records validated: {validation_report['total_records']}")
            print(f"Errors: {error_count}")
            print(f"Warnings: {warning_count}")
            print(f"Status: {'PASS' if error_count == 0 else 'FAIL'}")
            print(f"Report: {report_path}")
            print(f"{'='*60}\n")
            
            return 0 if error_count == 0 else 1
            
        except Exception as e:
            logger.error(f"Validation failed: {e}", exc_info=True)
            return 1
    
    def backup_command(self, args: argparse.Namespace) -> int:
        """
        Create backup of current Supabase data.
        
        Args:
            args: Command-line arguments
            
        Returns:
            Exit code (0 = success, 1 = failure)
        """
        logger.info("Starting backup...")
        
        try:
            # Initialize Supabase connection
            logger.info("Initializing Supabase connection...")
            supabase_manager = SupabaseConnectionManager()
            if not supabase_manager.connect():
                logger.error("Failed to connect to Supabase")
                print("\nFailed to connect to Supabase. Check your .env configuration.\n")
                return 1
            
            executor = create_migration_executor(supabase_manager, dry_run=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = self.backups_dir / f"pre_migration_{timestamp}.json"
            
            success, message = executor.create_backup(str(backup_path))
            
            if success:
                logger.info(f"Backup created: {backup_path}")
                print(f"\n{'='*60}")
                print(f"BACKUP SUCCESSFUL")
                print(f"{'='*60}")
                print(f"Backup file: {backup_path}")
                print(f"Timestamp: {timestamp}")
                print(f"{'='*60}\n")
                return 0
            else:
                logger.error(f"Backup failed: {message}")
                print(f"\nBackup failed: {message}\n")
                return 1
                
        except Exception as e:
            logger.error(f"Backup command failed: {e}", exc_info=True)
            return 1
    
    def rollback_command(self, args: argparse.Namespace) -> int:
        """
        Rollback migration from backup.
        
        Args:
            args: Command-line arguments with backup_timestamp
            
        Returns:
            Exit code (0 = success, 1 = failure)
        """
        if not args.backup_timestamp:
            logger.error("--backup-timestamp required for rollback")
            print("Error: --backup-timestamp required for rollback")
            print("Example: python migrate.py rollback --backup-timestamp 20260213_143022")
            return 1
        
        logger.info(f"Starting rollback from backup: {args.backup_timestamp}")
        
        try:
            # Initialize Supabase connection
            logger.info("Initializing Supabase connection...")
            supabase_manager = SupabaseConnectionManager()
            if not supabase_manager.connect():
                logger.error("Failed to connect to Supabase")
                print("\nFailed to connect to Supabase. Check your .env configuration.\n")
                return 1
            
            executor = create_migration_executor(supabase_manager, dry_run=True)
            backup_path = self.backups_dir / f"pre_migration_{args.backup_timestamp}.json"
            
            if not backup_path.exists():
                logger.error(f"Backup file not found: {backup_path}")
                print(f"\nBackup file not found: {backup_path}\n")
                return 1
            
            # Confirm rollback
            print(f"\n{'='*60}")
            print(f"ROLLBACK CONFIRMATION")
            print(f"{'='*60}")
            print(f"Backup file: {backup_path}")
            print(f"This will restore data from the backup.")
            response = input("Continue with rollback? (yes/no): ").strip().lower()
            
            if response != 'yes':
                print("Rollback cancelled.")
                return 0
            
            success, message = executor.rollback(str(backup_path), args.backup_timestamp)
            
            if success:
                logger.info(f"Rollback completed: {message}")
                print(f"\n{'='*60}")
                print(f"ROLLBACK SUCCESSFUL")
                print(f"{'='*60}")
                print(f"Message: {message}")
                print(f"{'='*60}\n")
                return 0
            else:
                logger.error(f"Rollback failed: {message}")
                print(f"\nRollback failed: {message}\n")
                return 1
                
        except Exception as e:
            logger.error(f"Rollback command failed: {e}", exc_info=True)
            return 1
    
    def migrate_command(self, args: argparse.Namespace) -> int:
        """
        Execute migration with specified mode.
        
        Args:
            args: Command-line arguments with mode and batch_size
            
        Returns:
            Exit code (0 = success, 1 = failure)
        """
        mode = args.mode.lower()
        batch_size = args.batch_size
        dry_run = mode == 'dry-run'
        
        logger.info(f"Starting migration in {mode} mode (batch_size={batch_size})")
        
        try:
            # Initialize Supabase connection (skip for dry-run if connection fails)
            supabase_manager = None
            if not dry_run:
                logger.info("Initializing Supabase connection...")
                supabase_manager = SupabaseConnectionManager()
                if not supabase_manager.connect():
                    logger.error("Failed to connect to Supabase")
                    print("\nFailed to connect to Supabase. Check your .env configuration.\n")
                    return 1
                logger.info("Supabase connection established")
            else:
                logger.info("Skipping Supabase connection for dry-run mode")
            
            # Step 1: Validate data
            logger.info("Step 1/4: Validating data...")
            excel_reader = ExcelReader(str(self.excel_file))
            result = excel_reader.read_transactions_sheet()
            if not result.success:
                error_msg = "; ".join(result.errors) if result.errors else "Unknown error"
                logger.error(f"Failed to read Excel: {error_msg}")
                print(f"\nFailed to read Excel: {error_msg}\n")
                return 1
            df = result.data
            
            validator = DataValidator()
            validation_report = validator.validate(df)
            error_count = len([e for e in validation_report.get('errors', []) if e['level'] == 'ERROR'])
            
            if error_count > 0:
                logger.error(f"Validation failed with {error_count} errors")
                print(f"\nValidation failed with {error_count} errors")
                print(f"Run 'python migrate.py validate' for details\n")
                return 1
            
            logger.info("Validation passed")
            
            # Step 2: Create backup (if execute mode)
            backup_timestamp = None
            if not dry_run:
                logger.info("Step 2/4: Creating backup...")
                executor = create_migration_executor(supabase_manager, dry_run=True, org_id=args.org_id)
                backup_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_path = self.backups_dir / f"pre_migration_{backup_timestamp}.json"
                
                success, message = executor.create_backup(str(backup_path))
                if not success:
                    logger.error(f"Backup failed: {message}")
                    print(f"\nBackup failed: {message}\n")
                    return 1
                logger.info(f"Backup created: {backup_path}")
            else:
                logger.info("Step 2/4: Skipping backup (dry-run mode)")
            
            # Step 3: Display migration plan
            logger.info("Step 3/4: Displaying migration plan...")
            print(f"\n{'='*60}")
            print(f"MIGRATION PLAN")
            print(f"{'='*60}")
            print(f"Mode: {mode.upper()}")
            print(f"Batch size: {batch_size}")
            print(f"Records to migrate: {len(df)}")
            if backup_timestamp:
                print(f"Backup timestamp: {backup_timestamp}")
            print(f"{'='*60}\n")
            
            # Require confirmation for execute mode
            if not dry_run:
                response = input("Continue with migration? (yes/no): ").strip().lower()
                if response not in ['yes', 'y']:
                    logger.info("Migration cancelled by user")
                    print("Migration cancelled.")
                    return 0
            
            # Step 4: Execute migration
            logger.info("Step 4/4: Executing migration...")
            if supabase_manager:
                executor = create_migration_executor(supabase_manager, batch_size=batch_size, dry_run=dry_run, org_id=args.org_id)
            else:
                # For dry-run without connection, create a dummy executor
                logger.info("Creating executor in dry-run mode without database connection")
                executor = create_migration_executor(supabase_manager, batch_size=batch_size, dry_run=True, org_id=args.org_id)
            
            # Migrate transactions
            logger.info("Migrating transactions...")
            # Group by (entry_no, entry_date) to create unique transaction records
            # Phase 0 identified 2,164 unique transactions from 14,224 detail rows
            # Note: Column names are already mapped to English by ExcelReader
            transactions_df = df.groupby(['entry_no', 'entry_date']).first().reset_index()
            logger.info(f"Grouped {len(df)} rows into {len(transactions_df)} unique transactions")
            trans_success, trans_batches = executor.migrate_transactions(transactions_df)
            trans_attempted = sum(b.records_attempted for b in trans_batches)
            trans_succeeded = sum(b.records_succeeded for b in trans_batches)
            trans_failed = sum(b.records_failed for b in trans_batches)
            logger.info(f"Transactions: {trans_succeeded}/{trans_attempted} succeeded")
            
            # Migrate transaction lines
            logger.info("Migrating transaction lines...")
            lines_success, lines_batches = executor.migrate_transaction_lines(df)
            lines_attempted = sum(b.records_attempted for b in lines_batches)
            lines_succeeded = sum(b.records_succeeded for b in lines_batches)
            lines_failed = sum(b.records_failed for b in lines_batches)
            logger.info(f"Transaction lines: {lines_succeeded}/{lines_attempted} succeeded")
            
            # Generate reports
            logger.info("Generating reports...")
            report_path = self.reports_dir / "migration_report.md"
            executor.generate_migration_report(str(report_path))
            
            summary_path = self.reports_dir / "migration_summary.json"
            executor.export_summary_json(str(summary_path))
            
            # Display summary
            summary = executor.get_summary()
            total_attempted = trans_attempted + lines_attempted
            total_succeeded = trans_succeeded + lines_succeeded
            success_rate = (total_succeeded / total_attempted * 100) if total_attempted > 0 else 0
            
            print(f"\n{'='*60}")
            print(f"MIGRATION SUMMARY")
            print(f"{'='*60}")
            print(f"Mode: {mode.upper()}")
            print(f"Transactions: {trans_succeeded}/{trans_attempted} succeeded")
            print(f"Transaction lines: {lines_succeeded}/{lines_attempted} succeeded")
            print(f"Total succeeded: {total_succeeded}")
            print(f"Total failed: {trans_failed + lines_failed}")
            print(f"Success rate: {success_rate:.1f}%")
            print(f"Report: {report_path}")
            print(f"Summary: {summary_path}")
            print(f"{'='*60}\n")
            
            if trans_failed > 0 or lines_failed > 0:
                logger.warning(f"Migration completed with {trans_failed + lines_failed} failures")
                return 1
            
            logger.info("Migration completed successfully")
            return 0
            
        except Exception as e:
            logger.error(f"Migration failed: {e}", exc_info=True)
            print(f"\nMigration failed: {e}\n")
            return 1


def main():
    """Main entry point for CLI."""
    parser = argparse.ArgumentParser(
        description="Excel to Supabase Migration Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Validate Excel data
  python migrate.py validate
  
  # Create backup
  python migrate.py backup
  
  # Dry-run migration
  python migrate.py --mode dry-run --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
  
  # Execute migration
  python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
  
  # Rollback from backup
  python migrate.py rollback --backup-timestamp 20260213_143022
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Validate command
    subparsers.add_parser('validate', help='Validate Excel data without migration')
    
    # Backup command
    subparsers.add_parser('backup', help='Create backup of current Supabase data')
    
    # Rollback command
    rollback_parser = subparsers.add_parser('rollback', help='Rollback migration from backup')
    rollback_parser.add_argument(
        '--backup-timestamp',
        help='Backup timestamp (format: YYYYMMDD_HHMMSS)'
    )
    
    # Migrate command (default)
    parser.add_argument(
        '--mode',
        choices=['dry-run', 'execute'],
        default='dry-run',
        help='Migration mode (default: dry-run)'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=100,
        help='Batch size for inserts (default: 100)'
    )
    parser.add_argument(
        '--org-id',
        type=str,
        required=True,
        help='Organization ID to assign to all records (required for RLS policies)'
    )
    
    args = parser.parse_args()
    
    cli = MigrationCLI()
    
    # Route to appropriate command
    if args.command == 'validate':
        return cli.validate_command(args)
    elif args.command == 'backup':
        return cli.backup_command(args)
    elif args.command == 'rollback':
        return cli.rollback_command(args)
    else:
        # Default: migrate command
        return cli.migrate_command(args)


if __name__ == '__main__':
    sys.exit(main())
