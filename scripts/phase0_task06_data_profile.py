#!/usr/bin/env python3
"""
Phase 0 Task 0.6: Data Profiling Report

Generates comprehensive data statistics including record counts, date ranges,
distributions, and data quality metrics.
"""

import os
import json
import sys
from pathlib import Path
from typing import Dict, Any
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


class DataProfiler:
    """Generates comprehensive data profiling report."""
    
    def __init__(self, excel_path: str):
        """Initialize profiler."""
        self.excel_path = excel_path
        self.data = None
        self.profile = {
            'timestamp': datetime.now().isoformat(),
            'file_path': excel_path,
            'summary': {},
            'record_counts': {},
            'date_range': {},
            'distributions': {},
            'data_quality': {}
        }
    
    def load_data(self) -> bool:
        """Load Excel data."""
        try:
            self.data = pd.read_excel(self.excel_path, sheet_name="transactions ", header=0)
            logger.info(f"✓ Loaded {len(self.data)} rows from Excel")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to load Excel: {e}")
            return False
    
    def profile_summary(self) -> bool:
        """Generate summary statistics."""
        try:
            self.profile['summary'] = {
                'total_rows': len(self.data),
                'total_columns': len(self.data.columns),
                'columns': list(self.data.columns)
            }
            
            logger.info(f"✓ Summary: {len(self.data)} rows, {len(self.data.columns)} columns")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to generate summary: {e}")
            return False
    
    def profile_record_counts(self) -> bool:
        """Profile record counts."""
        try:
            # Convert to numeric for analysis
            self.data['مدين'] = pd.to_numeric(self.data['مدين'], errors='coerce').fillna(0)
            self.data['دائن'] = pd.to_numeric(self.data['دائن'], errors='coerce').fillna(0)
            
            # Count unique transactions
            unique_transactions = self.data['entry no'].nunique()
            unique_accounts = self.data['account code'].nunique()
            unique_projects = self.data['project code'].nunique()
            unique_classifications = self.data['transaction classification code'].nunique()
            unique_work_analysis = self.data['work analysis code'].nunique()
            unique_sub_tree = self.data['sub_tree code'].nunique()
            
            self.profile['record_counts'] = {
                'total_lines': len(self.data),
                'unique_transactions': unique_transactions,
                'unique_accounts': unique_accounts,
                'unique_projects': unique_projects,
                'unique_classifications': unique_classifications,
                'unique_work_analysis': unique_work_analysis,
                'unique_sub_tree': unique_sub_tree,
                'avg_lines_per_transaction': round(len(self.data) / unique_transactions, 2)
            }
            
            logger.info(f"✓ Record counts:")
            logger.info(f"  - Total lines: {len(self.data)}")
            logger.info(f"  - Unique transactions: {unique_transactions}")
            logger.info(f"  - Unique accounts: {unique_accounts}")
            logger.info(f"  - Unique projects: {unique_projects}")
            
            return True
        except Exception as e:
            logger.error(f"✗ Failed to profile record counts: {e}")
            return False
    
    def profile_date_range(self) -> bool:
        """Profile date range."""
        try:
            # Convert entry_date to datetime
            self.data['entry date'] = pd.to_datetime(self.data['entry date'], errors='coerce')
            
            min_date = self.data['entry date'].min()
            max_date = self.data['entry date'].max()
            date_range_days = (max_date - min_date).days
            
            self.profile['date_range'] = {
                'min_date': str(min_date),
                'max_date': str(max_date),
                'range_days': date_range_days,
                'range_years': round(date_range_days / 365.25, 2)
            }
            
            logger.info(f"✓ Date range: {min_date} to {max_date} ({date_range_days} days)")
            
            return True
        except Exception as e:
            logger.error(f"✗ Failed to profile date range: {e}")
            return False
    
    def profile_distributions(self) -> bool:
        """Profile data distributions."""
        try:
            distributions = {}
            
            # Account distribution
            account_dist = self.data['account code'].value_counts().to_dict()
            distributions['accounts'] = {
                str(k): int(v) for k, v in sorted(account_dist.items(), key=lambda x: x[1], reverse=True)
            }
            
            # Project distribution
            project_dist = self.data['project code'].value_counts().to_dict()
            distributions['projects'] = {
                str(k): int(v) for k, v in sorted(project_dist.items(), key=lambda x: x[1], reverse=True)
            }
            
            # Classification distribution
            class_dist = self.data['transaction classification code'].value_counts().to_dict()
            distributions['classifications'] = {
                str(k): int(v) for k, v in sorted(class_dist.items(), key=lambda x: x[1], reverse=True)
            }
            
            # Fiscal year distribution
            fy_dist = self.data['العام المالى'].value_counts().to_dict()
            distributions['fiscal_years'] = {
                str(k): int(v) for k, v in sorted(fy_dist.items(), key=lambda x: x[1], reverse=True)
            }
            
            # Month distribution
            month_dist = self.data['الشهر'].value_counts().to_dict()
            distributions['months'] = {
                str(k): int(v) for k, v in sorted(month_dist.items(), key=lambda x: x[1], reverse=True)
            }
            
            self.profile['distributions'] = distributions
            
            logger.info(f"✓ Distributions profiled")
            logger.info(f"  - Accounts: {len(distributions['accounts'])}")
            logger.info(f"  - Projects: {len(distributions['projects'])}")
            logger.info(f"  - Classifications: {len(distributions['classifications'])}")
            
            return True
        except Exception as e:
            logger.error(f"✗ Failed to profile distributions: {e}")
            return False
    
    def profile_data_quality(self) -> bool:
        """Profile data quality."""
        try:
            quality = {}
            
            for col in self.data.columns:
                col_data = self.data[col]
                null_count = col_data.isna().sum() + (col_data == '').sum()
                
                quality[col] = {
                    'total': len(col_data),
                    'non_null': len(col_data) - null_count,
                    'null_count': null_count,
                    'null_percentage': round((null_count / len(col_data)) * 100, 2),
                    'unique_values': col_data.nunique(),
                    'dtype': str(col_data.dtype)
                }
            
            self.profile['data_quality'] = quality
            
            logger.info(f"✓ Data quality profiled")
            
            # Log columns with missing values
            missing_cols = [col for col, stats in quality.items() if stats['null_count'] > 0]
            if missing_cols:
                logger.warning(f"  Columns with missing values: {', '.join(missing_cols)}")
            
            return True
        except Exception as e:
            logger.error(f"✗ Failed to profile data quality: {e}")
            return False
    
    def export_json(self, output_path: str) -> bool:
        """Export profile to JSON."""
        try:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(self.profile, f, indent=2, ensure_ascii=False)
            
            logger.info(f"✓ Exported profile to: {output_path}")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to export JSON: {e}")
            return False
    
    def generate_markdown_report(self, output_path: str) -> bool:
        """Generate Markdown report."""
        try:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write("# Data Profiling Report\n\n")
                f.write(f"**Generated**: {self.profile['timestamp']}\n\n")
                
                # Summary
                f.write("## Summary\n\n")
                summary = self.profile['summary']
                f.write(f"- **Total Rows**: {summary['total_rows']}\n")
                f.write(f"- **Total Columns**: {summary['total_columns']}\n\n")
                
                # Record Counts
                f.write("## Record Counts\n\n")
                counts = self.profile['record_counts']
                f.write(f"- **Total Transaction Lines**: {counts['total_lines']}\n")
                f.write(f"- **Unique Transactions**: {counts['unique_transactions']}\n")
                f.write(f"- **Unique Accounts**: {counts['unique_accounts']}\n")
                f.write(f"- **Unique Projects**: {counts['unique_projects']}\n")
                f.write(f"- **Unique Classifications**: {counts['unique_classifications']}\n")
                f.write(f"- **Unique Work Analysis**: {counts['unique_work_analysis']}\n")
                f.write(f"- **Unique Sub-Trees**: {counts['unique_sub_tree']}\n")
                f.write(f"- **Avg Lines per Transaction**: {counts['avg_lines_per_transaction']}\n\n")
                
                # Date Range
                f.write("## Date Range\n\n")
                date_range = self.profile['date_range']
                f.write(f"- **Min Date**: {date_range['min_date']}\n")
                f.write(f"- **Max Date**: {date_range['max_date']}\n")
                f.write(f"- **Range**: {date_range['range_days']} days ({date_range['range_years']} years)\n\n")
                
                # Distributions
                f.write("## Distributions\n\n")
                
                f.write("### Accounts\n\n")
                f.write("| Account Code | Count |\n")
                f.write("|--------------|-------|\n")
                for account, count in list(self.profile['distributions']['accounts'].items())[:20]:
                    f.write(f"| {account} | {count} |\n")
                
                f.write("\n### Projects\n\n")
                f.write("| Project Code | Count |\n")
                f.write("|--------------|-------|\n")
                for project, count in self.profile['distributions']['projects'].items():
                    f.write(f"| {project} | {count} |\n")
                
                f.write("\n### Fiscal Years\n\n")
                f.write("| Fiscal Year | Count |\n")
                f.write("|-------------|-------|\n")
                for fy, count in sorted(self.profile['distributions']['fiscal_years'].items()):
                    f.write(f"| {fy} | {count} |\n")
                
                f.write("\n### Months\n\n")
                f.write("| Month | Count |\n")
                f.write("|-------|-------|\n")
                for month, count in sorted(self.profile['distributions']['months'].items()):
                    f.write(f"| {month} | {count} |\n")
                
                # Data Quality
                f.write("\n## Data Quality\n\n")
                f.write("| Column | Total | Non-Null | Null | Null % | Unique |\n")
                f.write("|--------|-------|----------|------|--------|--------|\n")
                
                for col, stats in self.profile['data_quality'].items():
                    f.write(f"| {col} | {stats['total']} | {stats['non_null']} | {stats['null_count']} | {stats['null_percentage']}% | {stats['unique_values']} |\n")
            
            logger.info(f"✓ Generated Markdown report: {output_path}")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to generate Markdown: {e}")
            return False


def main():
    """Main execution function."""
    logger.info("=" * 100)
    logger.info("Phase 0 Task 0.6: Data Profiling Report")
    logger.info("=" * 100)
    logger.info("")
    
    # Validate environment
    if not EXCEL_FILE_PATH:
        logger.error("✗ EXCEL_FILE_PATH not set in .env")
        return False
    
    # Create profiler
    profiler = DataProfiler(EXCEL_FILE_PATH)
    
    # Load data
    if not profiler.load_data():
        return False
    
    # Profile summary
    if not profiler.profile_summary():
        return False
    
    # Profile record counts
    if not profiler.profile_record_counts():
        return False
    
    # Profile date range
    if not profiler.profile_date_range():
        return False
    
    # Profile distributions
    if not profiler.profile_distributions():
        return False
    
    # Profile data quality
    if not profiler.profile_data_quality():
        return False
    
    # Export results
    json_path = "reports/data_profile.json"
    md_path = "reports/data_profile.md"
    
    success = True
    success = profiler.export_json(json_path) and success
    success = profiler.generate_markdown_report(md_path) and success
    
    if success:
        logger.info("\n" + "=" * 100)
        logger.info("✓ Phase 0 Task 0.6 COMPLETED")
        logger.info("=" * 100)
        logger.info(f"Profile exported to:")
        logger.info(f"  - {json_path}")
        logger.info(f"  - {md_path}")
        return True
    else:
        logger.error("\n" + "=" * 100)
        logger.error("✗ Phase 0 Task 0.6 FAILED")
        logger.error("=" * 100)
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
