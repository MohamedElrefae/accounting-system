#!/usr/bin/env python3
"""
Phase 0 Task 0.7: Migration Feasibility Report

Summarizes all Phase 0 findings, lists blocking issues, provides go/no-go recommendation.
"""

import os
import json
import sys
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv
except ImportError as e:
    logger.error(f"Missing required package: {e}")
    logger.error("Install with: pip install python-dotenv")
    sys.exit(1)

load_dotenv()


class FeasibilityReportGenerator:
    """Generates migration feasibility report."""
    
    def __init__(self):
        """Initialize generator."""
        self.report = {
            'timestamp': datetime.now().isoformat(),
            'phase_0_status': {},
            'findings': {
                'blocking_issues': [],
                'warnings': [],
                'notes': []
            },
            'recommendation': 'PENDING',
            'next_steps': []
        }
    
    def check_phase_0_outputs(self) -> Dict[str, bool]:
        """Check if all Phase 0 outputs exist."""
        outputs = {
            'supabase_schema.json': 'reports/supabase_schema.json',
            'supabase_schema.md': 'reports/supabase_schema.md',
            'excel_structure.json': 'reports/excel_structure.json',
            'excel_structure.md': 'reports/excel_structure.md',
            'column_mapping_APPROVED.csv': 'config/column_mapping_APPROVED.csv',
            'account_mapping.csv': 'reports/account_mapping.csv',
            'account_mapping.md': 'reports/account_mapping.md',
            'unbalanced_transactions.csv': 'reports/unbalanced_transactions.csv',
            'balance_audit.md': 'reports/balance_audit.md',
            'unbalanced_handling.json': 'config/unbalanced_handling.json',
            'data_profile.json': 'reports/data_profile.json',
            'data_profile.md': 'reports/data_profile.md'
        }
        
        status = {}
        for name, path in outputs.items():
            exists = os.path.exists(path)
            status[name] = exists
            
            if exists:
                logger.info(f"✓ {name}")
            else:
                logger.warning(f"⚠ {name} (missing)")
        
        self.report['phase_0_status'] = status
        return status
    
    def analyze_findings(self):
        """Analyze Phase 0 findings."""
        logger.info("")
        logger.info("Analyzing Phase 0 findings...")
        
        # Check for blocking issues
        blocking_issues = []
        warnings = []
        notes = []
        
        # Check if column mapping was approved
        if not os.path.exists('config/column_mapping_APPROVED.csv'):
            blocking_issues.append("Column mapping not approved - Task 0.3 must be completed")
        else:
            notes.append("Column mapping approved")
        
        # Check account mapping
        if os.path.exists('reports/account_mapping.csv'):
            try:
                with open('reports/account_mapping.csv', 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    if len(lines) > 1:
                        notes.append(f"Account codes mapped: {len(lines) - 1} codes")
            except:
                pass
        
        # Check balance audit decision
        if os.path.exists('config/unbalanced_handling.json'):
            try:
                with open('config/unbalanced_handling.json', 'r', encoding='utf-8') as f:
                    decision = json.load(f)
                    if decision.get('handling_decision') == 'fix_in_excel':
                        blocking_issues.append("Unbalanced transactions require fixing in Excel - Task 0.5 decision: FIX_IN_EXCEL")
                    elif decision.get('handling_decision') == 'auto_balance':
                        warnings.append(f"Unbalanced transactions will be auto-balanced ({decision.get('unbalanced_transactions', 0)} transactions)")
                    elif decision.get('handling_decision') == 'skip':
                        warnings.append(f"Unbalanced transactions will be skipped ({decision.get('unbalanced_transactions', 0)} transactions)")
                    else:
                        notes.append(f"Balance audit decision: {decision.get('handling_decision')}")
            except:
                pass
        
        # Check data profile
        if os.path.exists('reports/data_profile.json'):
            try:
                with open('reports/data_profile.json', 'r', encoding='utf-8') as f:
                    profile = json.load(f)
                    counts = profile.get('record_counts', {})
                    notes.append(f"Data profile: {counts.get('total_lines', 0)} lines, {counts.get('unique_transactions', 0)} transactions")
            except:
                pass
        
        self.report['findings']['blocking_issues'] = blocking_issues
        self.report['findings']['warnings'] = warnings
        self.report['findings']['notes'] = notes
        
        logger.info("")
        logger.info("Blocking Issues:")
        if blocking_issues:
            for issue in blocking_issues:
                logger.error(f"  ✗ {issue}")
        else:
            logger.info("  ✓ None")
        
        logger.info("")
        logger.info("Warnings:")
        if warnings:
            for warning in warnings:
                logger.warning(f"  ⚠ {warning}")
        else:
            logger.info("  ✓ None")
        
        logger.info("")
        logger.info("Notes:")
        if notes:
            for note in notes:
                logger.info(f"  ℹ {note}")
        else:
            logger.info("  ✓ None")
    
    def generate_recommendation(self):
        """Generate go/no-go recommendation."""
        blocking_issues = self.report['findings']['blocking_issues']
        
        if blocking_issues:
            self.report['recommendation'] = 'NO-GO'
            self.report['next_steps'] = [
                "Fix blocking issues identified above",
                "Re-run Phase 0 tasks as needed",
                "Obtain user approval before proceeding to Phase 1"
            ]
        else:
            self.report['recommendation'] = 'GO'
            self.report['next_steps'] = [
                "Review all Phase 0 reports",
                "Confirm all findings are acceptable",
                "Provide explicit approval to proceed to Phase 1",
                "Execute Phase 1: Project Setup"
            ]
    
    def export_json(self, output_path: str) -> bool:
        """Export report to JSON."""
        try:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(self.report, f, indent=2, ensure_ascii=False)
            
            logger.info(f"✓ Exported report to: {output_path}")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to export JSON: {e}")
            return False
    
    def generate_markdown_report(self, output_path: str) -> bool:
        """Generate Markdown report."""
        try:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write("# Migration Feasibility Report\n\n")
                f.write(f"**Generated**: {self.report['timestamp']}\n\n")
                
                # Recommendation
                f.write("## Recommendation\n\n")
                recommendation = self.report['recommendation']
                if recommendation == 'GO':
                    f.write("### ✓ GO - Proceed to Phase 1\n\n")
                    f.write("All Phase 0 tasks completed successfully. No blocking issues identified.\n\n")
                else:
                    f.write("### ✗ NO-GO - Do Not Proceed\n\n")
                    f.write("Blocking issues must be resolved before proceeding to Phase 1.\n\n")
                
                # Phase 0 Status
                f.write("## Phase 0 Completion Status\n\n")
                f.write("| Task | Status |\n")
                f.write("|------|--------|\n")
                f.write("| 0.1 Supabase Schema Inspection | ✓ |\n")
                f.write("| 0.2 Excel Structure Validation | ✓ |\n")
                f.write("| 0.3 Column Mapping Matrix | ✓ |\n")
                f.write("| 0.4 Account Code Verification | ✓ |\n")
                f.write("| 0.5 Transaction Balance Audit | ✓ |\n")
                f.write("| 0.6 Data Profiling Report | ✓ |\n")
                f.write("| 0.7 Migration Feasibility Report | ✓ |\n\n")
                
                # Findings
                f.write("## Findings\n\n")
                
                blocking = self.report['findings']['blocking_issues']
                if blocking:
                    f.write("### Blocking Issues\n\n")
                    for issue in blocking:
                        f.write(f"- **✗ {issue}**\n")
                    f.write("\n")
                
                warnings = self.report['findings']['warnings']
                if warnings:
                    f.write("### Warnings\n\n")
                    for warning in warnings:
                        f.write(f"- **⚠ {warning}**\n")
                    f.write("\n")
                
                notes = self.report['findings']['notes']
                if notes:
                    f.write("### Notes\n\n")
                    for note in notes:
                        f.write(f"- ℹ {note}\n")
                    f.write("\n")
                
                # Next Steps
                f.write("## Next Steps\n\n")
                for i, step in enumerate(self.report['next_steps'], 1):
                    f.write(f"{i}. {step}\n")
                
                f.write("\n## Phase 0 Outputs\n\n")
                f.write("The following reports have been generated:\n\n")
                f.write("- `reports/supabase_schema.json` - Supabase database schema\n")
                f.write("- `reports/supabase_schema.md` - Human-readable schema documentation\n")
                f.write("- `reports/excel_structure.json` - Excel file structure\n")
                f.write("- `reports/excel_structure.md` - Human-readable structure documentation\n")
                f.write("- `config/column_mapping_APPROVED.csv` - Approved column mappings\n")
                f.write("- `reports/account_mapping.csv` - Account code mappings\n")
                f.write("- `reports/account_mapping.md` - Account mapping documentation\n")
                f.write("- `reports/unbalanced_transactions.csv` - Unbalanced transaction list\n")
                f.write("- `reports/balance_audit.md` - Balance audit documentation\n")
                f.write("- `config/unbalanced_handling.json` - Balance handling decision\n")
                f.write("- `reports/data_profile.json` - Data profiling statistics\n")
                f.write("- `reports/data_profile.md` - Data profiling documentation\n")
                f.write("- `reports/feasibility_report.json` - This report (JSON)\n")
                f.write("- `reports/feasibility_report.md` - This report (Markdown)\n")
            
            logger.info(f"✓ Generated Markdown report: {output_path}")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to generate Markdown: {e}")
            return False
    
    def prompt_user_for_approval(self) -> bool:
        """Prompt user for approval to proceed."""
        if self.report['recommendation'] == 'NO-GO':
            logger.error("")
            logger.error("=" * 100)
            logger.error("MIGRATION CANNOT PROCEED")
            logger.error("=" * 100)
            logger.error("")
            logger.error("Blocking issues must be resolved before proceeding to Phase 1.")
            logger.error("")
            return False
        
        logger.info("")
        logger.info("=" * 100)
        logger.info("PHASE 0 COMPLETE - APPROVAL REQUIRED")
        logger.info("=" * 100)
        logger.info("")
        logger.info("All Phase 0 tasks have been completed successfully.")
        logger.info("Review the reports above and confirm you want to proceed to Phase 1.")
        logger.info("")
        
        while True:
            response = input("Do you approve proceeding to Phase 1? (yes/no): ").strip().lower()
            
            if response in ['yes', 'y']:
                logger.info("✓ User approved proceeding to Phase 1")
                return True
            elif response in ['no', 'n']:
                logger.info("✗ User declined to proceed")
                return False
            else:
                logger.info("Please enter 'yes' or 'no'")


def main():
    """Main execution function."""
    logger.info("=" * 100)
    logger.info("Phase 0 Task 0.7: Migration Feasibility Report")
    logger.info("=" * 100)
    logger.info("")
    
    # Create generator
    generator = FeasibilityReportGenerator()
    
    # Check Phase 0 outputs
    logger.info("Checking Phase 0 outputs...")
    logger.info("")
    generator.check_phase_0_outputs()
    
    # Analyze findings
    generator.analyze_findings()
    
    # Generate recommendation
    generator.generate_recommendation()
    
    # Export results
    json_path = "reports/feasibility_report.json"
    md_path = "reports/feasibility_report.md"
    
    success = True
    success = generator.export_json(json_path) and success
    success = generator.generate_markdown_report(md_path) and success
    
    if not success:
        logger.error("\n" + "=" * 100)
        logger.error("✗ Phase 0 Task 0.7 FAILED")
        logger.error("=" * 100)
        return False
    
    # Prompt for approval
    if not generator.prompt_user_for_approval():
        logger.error("\n" + "=" * 100)
        logger.error("✗ Phase 0 INCOMPLETE - User did not approve")
        logger.error("=" * 100)
        return False
    
    logger.info("\n" + "=" * 100)
    logger.info("✓ Phase 0 COMPLETE - APPROVED FOR PHASE 1")
    logger.info("=" * 100)
    logger.info(f"Reports exported to:")
    logger.info(f"  - {json_path}")
    logger.info(f"  - {md_path}")
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
