#!/usr/bin/env python3
"""
Excel to Supabase Analysis CLI

Command-line interface for running analysis and comparison tasks.
Generates reports on Supabase schema, Excel structure, and data mappings.

Usage:
    python analyze.py schema          # Analyze Supabase schema
    python analyze.py excel           # Analyze Excel structure
    python analyze.py compare         # Compare Excel and Supabase structures
    python analyze.py accounts        # Build account code mappings
    python analyze.py all             # Run all analysis tasks
"""

import argparse
import json
import sys
import os
from pathlib import Path
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

# Import analysis components
try:
    from analyzer.supabase_connection import SupabaseConnectionManager
except ImportError as e:
    logger.error(f"Failed to import SupabaseConnectionManager: {e}")
    SupabaseConnectionManager = None

try:
    from analyzer.schema_manager import SchemaManager
except ImportError as e:
    logger.error(f"Failed to import SchemaManager: {e}")
    SchemaManager = None

try:
    from analyzer.excel_reader import ExcelReader
except ImportError as e:
    logger.error(f"Failed to import ExcelReader: {e}")
    ExcelReader = None

try:
    from analyzer.excel_processor import ExcelProcessor
except ImportError as e:
    logger.error(f"Failed to import ExcelProcessor: {e}")
    ExcelProcessor = None

try:
    from analyzer.data_comparator import DataComparator
except ImportError as e:
    logger.error(f"Failed to import DataComparator: {e}")
    DataComparator = None

try:
    from analyzer.account_code_mapper import AccountCodeMapper
except ImportError as e:
    logger.error(f"Failed to import AccountCodeMapper: {e}")
    AccountCodeMapper = None


class AnalysisCLI:
    """Command-line interface for Excel to Supabase analysis."""
    
    def __init__(self):
        """Initialize CLI with configuration."""
        self.config_dir = Path("config")
        self.reports_dir = Path("reports")
        self.excel_file = Path("يومية الحدائق من البداية كاملة .xlsx")
        
        # Ensure directories exist
        self.config_dir.mkdir(exist_ok=True)
        self.reports_dir.mkdir(exist_ok=True)
    
    def schema_command(self, args: argparse.Namespace) -> int:
        """
        Analyze Supabase schema.
        
        Requirements: 1.1, 1.2, 1.4, 1.5
        
        Args:
            args: Command-line arguments
            
        Returns:
            Exit code (0 = success, 1 = failure)
        """
        logger.info("Starting Supabase schema analysis...")
        
        try:
            # Connect to Supabase
            logger.info("Connecting to Supabase...")
            conn_manager = SupabaseConnectionManager()
            if not conn_manager.test_connection():
                logger.error("Failed to connect to Supabase")
                print("\n✗ Failed to connect to Supabase\n")
                return 1
            logger.info("✓ Connected to Supabase")
            
            # Analyze schema
            logger.info("Analyzing schema...")
            schema_manager = SchemaManager(conn_manager)
            
            # Get table schemas
            tables_schema = {
                'transactions': schema_manager.get_table_schema('transactions'),
                'transaction_lines': schema_manager.get_table_schema('transaction_lines'),
                'accounts': schema_manager.get_table_schema('accounts'),
            }
            
            # Get relationships
            relationships = schema_manager.get_foreign_keys()
            
            # Generate report
            report = {
                'timestamp': datetime.now().isoformat(),
                'tables': tables_schema,
                'relationships': relationships,
                'summary': {
                    'total_tables': len(tables_schema),
                    'total_relationships': len(relationships),
                }
            }
            
            # Save JSON report
            json_path = self.reports_dir / "supabase_schema.json"
            with open(json_path, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            logger.info(f"Schema report saved to {json_path}")
            
            # Generate markdown report
            md_path = self.reports_dir / "supabase_schema.md"
            self._generate_schema_markdown(md_path, tables_schema, relationships)
            logger.info(f"Schema markdown saved to {md_path}")
            
            # Display summary
            print(f"\n{'='*60}")
            print(f"SUPABASE SCHEMA ANALYSIS")
            print(f"{'='*60}")
            print(f"Tables analyzed: {len(tables_schema)}")
            print(f"Relationships found: {len(relationships)}")
            print(f"JSON report: {json_path}")
            print(f"Markdown report: {md_path}")
            print(f"{'='*60}\n")
            
            return 0
            
        except Exception as e:
            logger.error(f"Schema analysis failed: {e}", exc_info=True)
            print(f"\n✗ Schema analysis failed: {e}\n")
            return 1
    
    def excel_command(self, args: argparse.Namespace) -> int:
        """
        Analyze Excel structure.
        
        Requirements: 2.1, 2.2, 2.4, 2.5
        
        Args:
            args: Command-line arguments
            
        Returns:
            Exit code (0 = success, 1 = failure)
        """
        logger.info("Starting Excel structure analysis...")
        
        try:
            # Read Excel
            logger.info(f"Reading Excel file: {self.excel_file}")
            excel_reader = ExcelReader(str(self.excel_file))
            result = excel_reader.read_transactions_sheet()
            
            if not result.success:
                error_msg = "; ".join(result.errors) if result.errors else "Unknown error"
                logger.error(f"Failed to read Excel: {error_msg}")
                print(f"\n✗ Failed to read Excel: {error_msg}\n")
                return 1
            
            df = result.data
            logger.info(f"✓ Loaded {len(df)} records from Excel")
            
            # Analyze structure
            logger.info("Analyzing Excel structure...")
            processor = ExcelProcessor()
            structure_info = {
                'timestamp': datetime.now().isoformat(),
                'file': str(self.excel_file),
                'total_records': len(df),
                'columns': list(df.columns),
                'column_count': len(df.columns),
                'data_types': {col: str(df[col].dtype) for col in df.columns},
                'null_counts': {col: int(df[col].isnull().sum()) for col in df.columns},
                'unique_values': {col: int(df[col].nunique()) for col in df.columns},
            }
            
            # Save JSON report
            json_path = self.reports_dir / "excel_structure.json"
            with open(json_path, 'w') as f:
                json.dump(structure_info, f, indent=2, default=str)
            logger.info(f"Excel structure report saved to {json_path}")
            
            # Generate markdown report
            md_path = self.reports_dir / "excel_structure.md"
            self._generate_excel_markdown(md_path, structure_info, df)
            logger.info(f"Excel structure markdown saved to {md_path}")
            
            # Display summary
            print(f"\n{'='*60}")
            print(f"EXCEL STRUCTURE ANALYSIS")
            print(f"{'='*60}")
            print(f"Total records: {len(df)}")
            print(f"Total columns: {len(df.columns)}")
            print(f"Columns: {', '.join(df.columns[:5])}{'...' if len(df.columns) > 5 else ''}")
            print(f"JSON report: {json_path}")
            print(f"Markdown report: {md_path}")
            print(f"{'='*60}\n")
            
            return 0
            
        except Exception as e:
            logger.error(f"Excel analysis failed: {e}", exc_info=True)
            print(f"\n✗ Excel analysis failed: {e}\n")
            return 1
    
    def compare_command(self, args: argparse.Namespace) -> int:
        """
        Compare Excel and Supabase structures.
        
        Requirements: 3.1, 3.3, 3.4, 3.5, 3.6
        
        Args:
            args: Command-line arguments
            
        Returns:
            Exit code (0 = success, 1 = failure)
        """
        logger.info("Starting structure comparison...")
        
        try:
            # Get Supabase schema
            logger.info("Loading Supabase schema...")
            schema_path = self.reports_dir / "supabase_schema.json"
            if not schema_path.exists():
                logger.error("Supabase schema report not found. Run 'python analyze.py schema' first.")
                print("\n✗ Supabase schema report not found")
                print("Run 'python analyze.py schema' first\n")
                return 1
            
            with open(schema_path, 'r') as f:
                supabase_schema = json.load(f)
            
            # Get Excel structure
            logger.info("Loading Excel structure...")
            excel_path = self.reports_dir / "excel_structure.json"
            if not excel_path.exists():
                logger.error("Excel structure report not found. Run 'python analyze.py excel' first.")
                print("\n✗ Excel structure report not found")
                print("Run 'python analyze.py excel' first\n")
                return 1
            
            with open(excel_path, 'r') as f:
                excel_structure = json.load(f)
            
            # Compare structures
            logger.info("Comparing structures...")
            comparator = DataComparator(excel_structure, supabase_schema)
            comparison_result = comparator.compare()
            
            # Save comparison report
            json_path = self.reports_dir / "comparison_report.json"
            with open(json_path, 'w') as f:
                json.dump(comparison_result, f, indent=2, default=str)
            logger.info(f"Comparison report saved to {json_path}")
            
            # Generate markdown report
            md_path = self.reports_dir / "comparison_report.md"
            self._generate_comparison_markdown(md_path, comparison_result)
            logger.info(f"Comparison markdown saved to {md_path}")
            
            # Display summary
            print(f"\n{'='*60}")
            print(f"STRUCTURE COMPARISON")
            print(f"{'='*60}")
            print(f"Matching fields: {comparison_result.get('matching_fields_count', 0)}")
            print(f"Mismatches: {comparison_result.get('mismatches_count', 0)}")
            print(f"Missing in Supabase: {comparison_result.get('missing_in_supabase_count', 0)}")
            print(f"JSON report: {json_path}")
            print(f"Markdown report: {md_path}")
            print(f"{'='*60}\n")
            
            return 0
            
        except Exception as e:
            logger.error(f"Comparison failed: {e}", exc_info=True)
            print(f"\n✗ Comparison failed: {e}\n")
            return 1
    
    def accounts_command(self, args: argparse.Namespace) -> int:
        """
        Build account code mappings.
        
        Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
        
        Args:
            args: Command-line arguments
            
        Returns:
            Exit code (0 = success, 1 = failure)
        """
        logger.info("Starting account code mapping...")
        
        try:
            # Read Excel
            logger.info(f"Reading Excel file: {self.excel_file}")
            excel_reader = ExcelReader(str(self.excel_file))
            result = excel_reader.read_transactions_sheet()
            
            if not result.success:
                error_msg = "; ".join(result.errors) if result.errors else "Unknown error"
                logger.error(f"Failed to read Excel: {error_msg}")
                print(f"\n✗ Failed to read Excel: {error_msg}\n")
                return 1
            
            df = result.data
            logger.info(f"✓ Loaded {len(df)} records from Excel")
            
            # Extract unique account codes
            logger.info("Extracting unique account codes...")
            account_codes = df['account_code'].unique()
            logger.info(f"Found {len(account_codes)} unique account codes")
            
            # Build mappings
            logger.info("Building account code mappings...")
            conn_manager = SupabaseConnectionManager()
            mapper = AccountCodeMapper(conn_manager)
            
            mappings = mapper.build_mappings(account_codes)
            
            # Save mapping report
            csv_path = self.config_dir / "account_mapping.csv"
            mapper.save_mappings_csv(mappings, str(csv_path))
            logger.info(f"Account mapping saved to {csv_path}")
            
            # Save JSON report
            json_path = self.reports_dir / "account_mapping.json"
            with open(json_path, 'w') as f:
                json.dump(mappings, f, indent=2, default=str)
            logger.info(f"Account mapping JSON saved to {json_path}")
            
            # Check for unmapped codes
            unmapped = [m for m in mappings if not m.get('mapped')]
            
            # Display summary
            print(f"\n{'='*60}")
            print(f"ACCOUNT CODE MAPPING")
            print(f"{'='*60}")
            print(f"Total unique codes: {len(account_codes)}")
            print(f"Mapped: {len(mappings) - len(unmapped)}")
            print(f"Unmapped: {len(unmapped)}")
            print(f"CSV report: {csv_path}")
            print(f"JSON report: {json_path}")
            
            if unmapped:
                print(f"\nUnmapped codes:")
                for m in unmapped:
                    print(f"  - {m['excel_code']}")
            
            print(f"{'='*60}\n")
            
            return 0 if len(unmapped) == 0 else 1
            
        except Exception as e:
            logger.error(f"Account mapping failed: {e}", exc_info=True)
            print(f"\n✗ Account mapping failed: {e}\n")
            return 1
    
    def all_command(self, args: argparse.Namespace) -> int:
        """
        Run all analysis tasks.
        
        Requirements: All analysis requirements
        
        Args:
            args: Command-line arguments
            
        Returns:
            Exit code (0 = success, 1 = failure)
        """
        logger.info("Running all analysis tasks...")
        
        tasks = [
            ('schema', self.schema_command),
            ('excel', self.excel_command),
            ('compare', self.compare_command),
            ('accounts', self.accounts_command),
        ]
        
        failed_tasks = []
        
        for task_name, task_func in tasks:
            logger.info(f"\n{'='*60}")
            logger.info(f"Running task: {task_name}")
            logger.info(f"{'='*60}")
            
            result = task_func(args)
            if result != 0:
                failed_tasks.append(task_name)
        
        # Summary
        print(f"\n{'='*60}")
        print(f"ANALYSIS COMPLETE")
        print(f"{'='*60}")
        print(f"Total tasks: {len(tasks)}")
        print(f"Successful: {len(tasks) - len(failed_tasks)}")
        print(f"Failed: {len(failed_tasks)}")
        
        if failed_tasks:
            print(f"\nFailed tasks:")
            for task in failed_tasks:
                print(f"  - {task}")
        
        print(f"{'='*60}\n")
        
        return 0 if len(failed_tasks) == 0 else 1
    
    def _generate_schema_markdown(self, path: Path, tables_schema: dict, relationships: list):
        """Generate markdown report for schema analysis."""
        with open(path, 'w') as f:
            f.write("# Supabase Schema Analysis Report\n\n")
            f.write(f"Generated: {datetime.now().isoformat()}\n\n")
            
            f.write("## Tables\n\n")
            for table_name, schema in tables_schema.items():
                f.write(f"### {table_name}\n\n")
                f.write("| Column | Type | Nullable |\n")
                f.write("|--------|------|----------|\n")
                for col in schema.get('columns', []):
                    f.write(f"| {col['name']} | {col['type']} | {col['nullable']} |\n")
                f.write("\n")
            
            f.write("## Relationships\n\n")
            for rel in relationships:
                f.write(f"- {rel['from_table']}.{rel['from_column']} → {rel['to_table']}.{rel['to_column']}\n")
    
    def _generate_excel_markdown(self, path: Path, structure_info: dict, df):
        """Generate markdown report for Excel structure analysis."""
        with open(path, 'w') as f:
            f.write("# Excel Structure Analysis Report\n\n")
            f.write(f"Generated: {datetime.now().isoformat()}\n\n")
            f.write(f"File: {structure_info['file']}\n")
            f.write(f"Total Records: {structure_info['total_records']}\n\n")
            
            f.write("## Columns\n\n")
            f.write("| Column | Type | Non-Null | Unique |\n")
            f.write("|--------|------|----------|--------|\n")
            for col in structure_info['columns']:
                dtype = structure_info['data_types'][col]
                non_null = structure_info['total_records'] - structure_info['null_counts'][col]
                unique = structure_info['unique_values'][col]
                f.write(f"| {col} | {dtype} | {non_null} | {unique} |\n")
    
    def _generate_comparison_markdown(self, path: Path, comparison_result: dict):
        """Generate markdown report for structure comparison."""
        with open(path, 'w') as f:
            f.write("# Structure Comparison Report\n\n")
            f.write(f"Generated: {datetime.now().isoformat()}\n\n")
            
            f.write("## Summary\n\n")
            f.write(f"- Matching fields: {comparison_result.get('matching_fields_count', 0)}\n")
            f.write(f"- Mismatches: {comparison_result.get('mismatches_count', 0)}\n")
            f.write(f"- Missing in Supabase: {comparison_result.get('missing_in_supabase_count', 0)}\n\n")
            
            f.write("## Matching Fields\n\n")
            for field in comparison_result.get('matching_fields', []):
                f.write(f"- {field['excel_field']} → {field['supabase_field']}\n")
            
            f.write("\n## Mismatches\n\n")
            for mismatch in comparison_result.get('mismatches', []):
                f.write(f"- {mismatch['field']}: {mismatch['issue']}\n")


def main():
    """Main entry point for analysis CLI."""
    parser = argparse.ArgumentParser(
        description="Excel to Supabase Analysis Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Analyze Supabase schema
  python analyze.py schema
  
  # Analyze Excel structure
  python analyze.py excel
  
  # Compare structures
  python analyze.py compare
  
  # Build account mappings
  python analyze.py accounts
  
  # Run all analysis
  python analyze.py all
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Analysis command to run')
    
    # Add subcommands
    subparsers.add_parser('schema', help='Analyze Supabase schema')
    subparsers.add_parser('excel', help='Analyze Excel structure')
    subparsers.add_parser('compare', help='Compare Excel and Supabase structures')
    subparsers.add_parser('accounts', help='Build account code mappings')
    subparsers.add_parser('all', help='Run all analysis tasks')
    
    args = parser.parse_args()
    
    cli = AnalysisCLI()
    
    # Route to appropriate command
    if args.command == 'schema':
        return cli.schema_command(args)
    elif args.command == 'excel':
        return cli.excel_command(args)
    elif args.command == 'compare':
        return cli.compare_command(args)
    elif args.command == 'accounts':
        return cli.accounts_command(args)
    elif args.command == 'all':
        return cli.all_command(args)
    else:
        parser.print_help()
        return 0


if __name__ == '__main__':
    sys.exit(main())
