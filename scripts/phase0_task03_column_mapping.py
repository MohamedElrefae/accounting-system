#!/usr/bin/env python3
"""
Phase 0 Task 0.3: Column Mapping Matrix Creation

Creates a CSV mapping between Excel columns and Supabase columns.
Presents mapping for user review and approval.
"""

import os
import csv
import sys
from pathlib import Path
from datetime import datetime
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Column mapping from design document
COLUMN_MAPPING = [
    {
        'Excel_Column': 'العام المالى',
        'English_Name': 'fiscal_year',
        'Supabase_Table': 'transactions',
        'Supabase_Column': 'fiscal_year',
        'Data_Type': 'integer',
        'Required': 'Yes',
        'Notes': 'Fiscal year from Excel'
    },
    {
        'Excel_Column': 'الشهر',
        'English_Name': 'month',
        'Supabase_Table': 'transactions',
        'Supabase_Column': 'month',
        'Data_Type': 'integer',
        'Required': 'Yes',
        'Notes': 'Month from Excel'
    },
    {
        'Excel_Column': 'entry no',
        'English_Name': 'entry_no',
        'Supabase_Table': 'transactions',
        'Supabase_Column': 'reference_number',
        'Data_Type': 'string',
        'Required': 'Yes',
        'Notes': 'Transaction reference number'
    },
    {
        'Excel_Column': 'entry date',
        'English_Name': 'entry_date',
        'Supabase_Table': 'transactions',
        'Supabase_Column': 'transaction_date',
        'Data_Type': 'date',
        'Required': 'Yes',
        'Notes': 'Transaction date'
    },
    {
        'Excel_Column': 'account code',
        'English_Name': 'account_code',
        'Supabase_Table': 'transaction_lines',
        'Supabase_Column': 'account_id',
        'Data_Type': 'uuid (FK)',
        'Required': 'Yes',
        'Notes': 'Maps to accounts.id via legacy_code'
    },
    {
        'Excel_Column': 'account name',
        'English_Name': 'account_name',
        'Supabase_Table': '-',
        'Supabase_Column': '(derived)',
        'Data_Type': 'string',
        'Required': 'No',
        'Notes': 'Derived from accounts table'
    },
    {
        'Excel_Column': 'transaction classification code',
        'English_Name': 'transaction_classification_code',
        'Supabase_Table': 'transaction_lines',
        'Supabase_Column': 'classification_id',
        'Data_Type': 'uuid (FK)',
        'Required': 'Yes',
        'Notes': 'Maps to classifications table'
    },
    {
        'Excel_Column': 'classification code',
        'English_Name': 'classification_code',
        'Supabase_Table': 'transaction_lines',
        'Supabase_Column': 'classification_code',
        'Data_Type': 'string',
        'Required': 'Yes',
        'Notes': 'Classification code'
    },
    {
        'Excel_Column': 'classification name',
        'English_Name': 'classification_name',
        'Supabase_Table': '-',
        'Supabase_Column': '(derived)',
        'Data_Type': 'string',
        'Required': 'No',
        'Notes': 'Derived from classifications table'
    },
    {
        'Excel_Column': 'project code',
        'English_Name': 'project_code',
        'Supabase_Table': 'transaction_lines',
        'Supabase_Column': 'project_id',
        'Data_Type': 'uuid (FK)',
        'Required': 'Yes',
        'Notes': 'Maps to projects table'
    },
    {
        'Excel_Column': 'project name',
        'English_Name': 'project_name',
        'Supabase_Table': '-',
        'Supabase_Column': '(derived)',
        'Data_Type': 'string',
        'Required': 'No',
        'Notes': 'Derived from projects table'
    },
    {
        'Excel_Column': 'work analysis code',
        'English_Name': 'work_analysis_code',
        'Supabase_Table': 'transaction_lines',
        'Supabase_Column': 'work_analysis_id',
        'Data_Type': 'uuid (FK)',
        'Required': 'Yes',
        'Notes': 'Maps to work_analysis table'
    },
    {
        'Excel_Column': 'work analysis name',
        'English_Name': 'work_analysis_name',
        'Supabase_Table': '-',
        'Supabase_Column': '(derived)',
        'Data_Type': 'string',
        'Required': 'No',
        'Notes': 'Derived from work_analysis table'
    },
    {
        'Excel_Column': 'sub_tree code',
        'English_Name': 'sub_tree_code',
        'Supabase_Table': 'transaction_lines',
        'Supabase_Column': 'sub_tree_id',
        'Data_Type': 'uuid (FK)',
        'Required': 'Yes',
        'Notes': 'Maps to sub_tree table'
    },
    {
        'Excel_Column': 'sub_tree name',
        'English_Name': 'sub_tree_name',
        'Supabase_Table': '-',
        'Supabase_Column': '(derived)',
        'Data_Type': 'string',
        'Required': 'No',
        'Notes': 'Derived from sub_tree table'
    },
    {
        'Excel_Column': 'مدين',
        'English_Name': 'debit',
        'Supabase_Table': 'transaction_lines',
        'Supabase_Column': 'debit_amount',
        'Data_Type': 'decimal',
        'Required': 'Yes',
        'Notes': 'Debit amount'
    },
    {
        'Excel_Column': 'دائن',
        'English_Name': 'credit',
        'Supabase_Table': 'transaction_lines',
        'Supabase_Column': 'credit_amount',
        'Data_Type': 'decimal',
        'Required': 'Yes',
        'Notes': 'Credit amount'
    },
    {
        'Excel_Column': 'ملاحظات',
        'English_Name': 'notes',
        'Supabase_Table': 'transaction_lines',
        'Supabase_Column': 'notes',
        'Data_Type': 'string',
        'Required': 'No',
        'Notes': 'Transaction notes'
    }
]


class ColumnMappingGenerator:
    """Generates and manages column mapping matrix."""
    
    def __init__(self):
        """Initialize generator."""
        self.mapping = COLUMN_MAPPING
        self.approved = False
    
    def display_mapping(self):
        """Display mapping in human-readable format."""
        logger.info("=" * 120)
        logger.info("COLUMN MAPPING MATRIX")
        logger.info("=" * 120)
        logger.info("")
        
        for i, mapping in enumerate(self.mapping, 1):
            logger.info(f"{i}. Excel Column: {mapping['Excel_Column']}")
            logger.info(f"   English Name: {mapping['English_Name']}")
            logger.info(f"   Supabase Table: {mapping['Supabase_Table']}")
            logger.info(f"   Supabase Column: {mapping['Supabase_Column']}")
            logger.info(f"   Data Type: {mapping['Data_Type']}")
            logger.info(f"   Required: {mapping['Required']}")
            logger.info(f"   Notes: {mapping['Notes']}")
            logger.info("")
    
    def export_csv(self, output_path: str) -> bool:
        """Export mapping to CSV file."""
        try:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=self.mapping[0].keys())
                writer.writeheader()
                writer.writerows(self.mapping)
            
            logger.info(f"✓ Exported mapping to: {output_path}")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to export CSV: {e}")
            return False
    
    def generate_markdown_report(self, output_path: str) -> bool:
        """Generate Markdown documentation of mapping."""
        try:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write("# Column Mapping Matrix\n\n")
                f.write(f"**Generated**: {datetime.now().isoformat()}\n\n")
                f.write("## Overview\n\n")
                f.write(f"Total columns: {len(self.mapping)}\n\n")
                
                f.write("## Mapping Details\n\n")
                f.write("| # | Excel Column | English Name | Supabase Table | Supabase Column | Data Type | Required | Notes |\n")
                f.write("|---|--------------|--------------|----------------|-----------------|-----------|----------|-------|\n")
                
                for i, mapping in enumerate(self.mapping, 1):
                    f.write(f"| {i} | {mapping['Excel_Column']} | {mapping['English_Name']} | {mapping['Supabase_Table']} | {mapping['Supabase_Column']} | {mapping['Data_Type']} | {mapping['Required']} | {mapping['Notes']} |\n")
                
                f.write("\n## Summary\n\n")
                
                required_count = sum(1 for m in self.mapping if m['Required'] == 'Yes')
                optional_count = len(self.mapping) - required_count
                
                f.write(f"- **Total Columns**: {len(self.mapping)}\n")
                f.write(f"- **Required**: {required_count}\n")
                f.write(f"- **Optional**: {optional_count}\n\n")
                
                f.write("## Mapping Strategy\n\n")
                f.write("### Transaction Headers\n\n")
                f.write("Excel rows are grouped by (entry_no, entry_date) to create transaction headers:\n\n")
                f.write("| Excel Column | Supabase Column | Notes |\n")
                f.write("|--------------|-----------------|-------|\n")
                
                for mapping in self.mapping:
                    if mapping['Supabase_Table'] == 'transactions':
                        f.write(f"| {mapping['Excel_Column']} | {mapping['Supabase_Column']} | {mapping['Notes']} |\n")
                
                f.write("\n### Transaction Lines\n\n")
                f.write("Each Excel row becomes a transaction line:\n\n")
                f.write("| Excel Column | Supabase Column | Notes |\n")
                f.write("|--------------|-----------------|-------|\n")
                
                for mapping in self.mapping:
                    if mapping['Supabase_Table'] == 'transaction_lines':
                        f.write(f"| {mapping['Excel_Column']} | {mapping['Supabase_Column']} | {mapping['Notes']} |\n")
                
                f.write("\n### Derived Columns\n\n")
                f.write("These columns are derived from reference tables:\n\n")
                f.write("| Excel Column | Source Table | Notes |\n")
                f.write("|--------------|--------------|-------|\n")
                
                for mapping in self.mapping:
                    if mapping['Supabase_Table'] == '-':
                        f.write(f"| {mapping['Excel_Column']} | (derived) | {mapping['Notes']} |\n")
            
            logger.info(f"✓ Generated Markdown report: {output_path}")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to generate Markdown: {e}")
            return False
    
    def get_user_approval(self) -> bool:
        """Get user approval for mapping."""
        logger.info("")
        logger.info("=" * 120)
        logger.info("APPROVAL REQUIRED")
        logger.info("=" * 120)
        logger.info("")
        logger.info("Please review the column mapping above.")
        logger.info("")
        
        while True:
            response = input("Do you approve this column mapping? (yes/no): ").strip().lower()
            
            if response in ['yes', 'y']:
                logger.info("✓ Mapping approved by user")
                self.approved = True
                return True
            elif response in ['no', 'n']:
                logger.info("✗ Mapping rejected by user")
                logger.info("Please review the mapping and make corrections if needed.")
                return False
            else:
                logger.info("Please enter 'yes' or 'no'")


def main():
    """Main execution function."""
    logger.info("=" * 120)
    logger.info("Phase 0 Task 0.3: Column Mapping Matrix Creation")
    logger.info("=" * 120)
    logger.info("")
    
    # Create generator
    generator = ColumnMappingGenerator()
    
    # Display mapping
    generator.display_mapping()
    
    # Export to CSV
    csv_path = "config/column_mapping.csv"
    if not generator.export_csv(csv_path):
        return False
    
    # Generate Markdown report
    md_path = "config/column_mapping.md"
    if not generator.generate_markdown_report(md_path):
        return False
    
    # Get user approval
    if not generator.get_user_approval():
        logger.error("\n" + "=" * 120)
        logger.error("✗ Phase 0 Task 0.3 FAILED - User did not approve mapping")
        logger.error("=" * 120)
        return False
    
    # Save approved mapping
    approved_path = "config/column_mapping_APPROVED.csv"
    if not generator.export_csv(approved_path):
        return False
    
    logger.info("\n" + "=" * 120)
    logger.info("✓ Phase 0 Task 0.3 COMPLETED")
    logger.info("=" * 120)
    logger.info(f"Mapping exported to:")
    logger.info(f"  - {csv_path}")
    logger.info(f"  - {md_path}")
    logger.info(f"  - {approved_path} (APPROVED)")
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
