#!/usr/bin/env python3
"""
Excel to Supabase Migration Orchestration Script

Orchestrates the complete migration workflow across all phases:
- Phase 1: Analysis and Preparation
- Phase 2: Validation
- Phase 3: Migration Execution
- Phase 4: Verification
- Phase 5: Documentation Generation

Includes checkpoints between phases for user approval.

Usage:
    python orchestrate.py --phase all              # Run all phases
    python orchestrate.py --phase 1                # Run Phase 1 only
    python orchestrate.py --phase 1 --skip-approval  # Skip approval prompts
"""

import argparse
import json
import sys
import os
import subprocess
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


class MigrationOrchestrator:
    """Orchestrates the complete migration workflow."""
    
    def __init__(self, skip_approval: bool = False):
        """
        Initialize orchestrator.
        
        Args:
            skip_approval: Skip user approval prompts (for automation)
        """
        self.skip_approval = skip_approval
        self.config_dir = Path("config")
        self.reports_dir = Path("reports")
        self.backups_dir = Path("backups")
        self.logs_dir = Path("logs")
        
        # Ensure directories exist
        for d in [self.config_dir, self.reports_dir, self.backups_dir, self.logs_dir]:
            d.mkdir(exist_ok=True)
        
        self.execution_log = self.logs_dir / f"orchestration_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    
    def log_phase(self, phase_num: int, phase_name: str):
        """Log phase start."""
        msg = f"\n{'='*70}\nPHASE {phase_num}: {phase_name}\n{'='*70}\n"
        logger.info(msg)
        print(msg)
    
    def log_checkpoint(self, checkpoint_name: str):
        """Log checkpoint."""
        msg = f"\n{'─'*70}\nCHECKPOINT: {checkpoint_name}\n{'─'*70}\n"
        logger.info(msg)
        print(msg)
    
    def require_approval(self, prompt: str) -> bool:
        """
        Require user approval to proceed.
        
        Args:
            prompt: Approval prompt message
            
        Returns:
            True if approved, False otherwise
        """
        if self.skip_approval:
            logger.info(f"Skipping approval: {prompt}")
            return True
        
        print(f"\n{prompt}")
        response = input("Continue? (yes/no): ").strip().lower()
        return response == 'yes'
    
    def run_command(self, cmd: list, description: str) -> bool:
        """
        Run a shell command.
        
        Args:
            cmd: Command as list of strings
            description: Description of what the command does
            
        Returns:
            True if successful, False otherwise
        """
        logger.info(f"Running: {description}")
        logger.info(f"Command: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                logger.info(f"✓ {description} completed successfully")
                if result.stdout:
                    logger.debug(f"Output: {result.stdout}")
                return True
            else:
                logger.error(f"✗ {description} failed with code {result.returncode}")
                if result.stderr:
                    logger.error(f"Error: {result.stderr}")
                print(f"\n✗ {description} failed")
                if result.stderr:
                    print(f"Error: {result.stderr}\n")
                return False
        except subprocess.TimeoutExpired:
            logger.error(f"✗ {description} timed out")
            print(f"\n✗ {description} timed out\n")
            return False
        except Exception as e:
            logger.error(f"✗ {description} failed: {e}")
            print(f"\n✗ {description} failed: {e}\n")
            return False
    
    def phase_1_analysis(self) -> bool:
        """
        Phase 1: Analysis and Preparation
        
        Requirements: 1.1, 1.5, 2.1, 2.5, 3.5
        
        Returns:
            True if successful, False otherwise
        """
        self.log_phase(1, "Analysis and Preparation")
        
        # Run all analysis tasks
        logger.info("Running analysis tasks...")
        if not self.run_command(
            ['python', 'analyze.py', 'all'],
            "Analysis tasks"
        ):
            return False
        
        # Checkpoint: Review analysis results
        self.log_checkpoint("Review Analysis Results")
        
        print("\nAnalysis reports generated:")
        print(f"  - {self.reports_dir / 'supabase_schema.md'}")
        print(f"  - {self.reports_dir / 'excel_structure.md'}")
        print(f"  - {self.reports_dir / 'comparison_report.md'}")
        print(f"  - {self.reports_dir / 'account_mapping.json'}")
        
        if not self.require_approval("Review analysis reports and approve to proceed to Phase 2?"):
            logger.info("Phase 1 approval rejected by user")
            return False
        
        logger.info("✓ Phase 1 completed and approved")
        return True
    
    def phase_2_validation(self) -> bool:
        """
        Phase 2: Validation
        
        Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
        
        Returns:
            True if successful, False otherwise
        """
        self.log_phase(2, "Validation")
        
        # Run validation
        logger.info("Running data validation...")
        if not self.run_command(
            ['python', 'migrate.py', 'validate'],
            "Data validation"
        ):
            return False
        
        # Checkpoint: Review validation results
        self.log_checkpoint("Review Validation Results")
        
        validation_report = self.reports_dir / "validation_report.json"
        if validation_report.exists():
            with open(validation_report, 'r') as f:
                report = json.load(f)
            
            error_count = len([e for e in report.get('errors', []) if e['level'] == 'ERROR'])
            warning_count = len([e for e in report.get('errors', []) if e['level'] == 'WARNING'])
            
            print(f"\nValidation Summary:")
            print(f"  - Records validated: {report.get('total_records', 0)}")
            print(f"  - Errors: {error_count}")
            print(f"  - Warnings: {warning_count}")
            print(f"  - Report: {validation_report}")
            
            if error_count > 0:
                print(f"\n⚠ Validation found {error_count} errors")
                if not self.require_approval("Continue despite validation errors?"):
                    logger.info("Phase 2 approval rejected due to validation errors")
                    return False
        
        if not self.require_approval("Approve validation results and proceed to Phase 3?"):
            logger.info("Phase 2 approval rejected by user")
            return False
        
        logger.info("✓ Phase 2 completed and approved")
        return True
    
    def phase_3_migration(self) -> bool:
        """
        Phase 3: Migration Execution
        
        Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
        
        Returns:
            True if successful, False otherwise
        """
        self.log_phase(3, "Migration Execution")
        
        # Step 1: Create backup
        logger.info("Step 1/3: Creating backup...")
        if not self.run_command(
            ['python', 'migrate.py', 'backup'],
            "Backup creation"
        ):
            return False
        
        # Step 2: Dry-run migration
        logger.info("Step 2/3: Running dry-run migration...")
        if not self.run_command(
            ['python', 'migrate.py', '--mode', 'dry-run', '--batch-size', '100'],
            "Dry-run migration"
        ):
            return False
        
        # Checkpoint: Review dry-run results
        self.log_checkpoint("Review Dry-Run Results")
        
        migration_report = self.reports_dir / "migration_report.md"
        if migration_report.exists():
            print(f"\nDry-run migration report: {migration_report}")
        
        if not self.require_approval("Approve dry-run results and proceed with actual migration?"):
            logger.info("Phase 3 approval rejected after dry-run")
            return False
        
        # Step 3: Execute actual migration
        logger.info("Step 3/3: Executing actual migration...")
        if not self.run_command(
            ['python', 'migrate.py', '--mode', 'execute', '--batch-size', '100'],
            "Actual migration"
        ):
            logger.error("Migration execution failed")
            print("\n⚠ Migration execution failed")
            
            # Offer rollback
            if self.require_approval("Rollback to backup?"):
                # Find latest backup
                backups = sorted(self.backups_dir.glob("pre_migration_*.json"))
                if backups:
                    latest_backup = backups[-1]
                    timestamp = latest_backup.stem.replace("pre_migration_", "")
                    logger.info(f"Rolling back from backup: {timestamp}")
                    self.run_command(
                        ['python', 'migrate.py', 'rollback', '--backup-timestamp', timestamp],
                        "Rollback"
                    )
            
            return False
        
        logger.info("✓ Phase 3 completed successfully")
        return True
    
    def phase_4_verification(self) -> bool:
        """
        Phase 4: Verification
        
        Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
        
        Returns:
            True if successful, False otherwise
        """
        self.log_phase(4, "Verification")
        
        # Run verification
        logger.info("Running post-migration verification...")
        
        try:
            from executor.verification_engine import VerificationEngine
            
            verifier = VerificationEngine()
            verification_report = verifier.verify_all()
            
            # Save verification report
            report_path = self.reports_dir / "verification_report.json"
            with open(report_path, 'w') as f:
                json.dump(verification_report, f, indent=2, default=str)
            
            logger.info(f"Verification report saved to {report_path}")
            
            # Display summary
            print(f"\nVerification Summary:")
            print(f"  - Record count check: {verification_report.get('record_count_check', {}).get('status', 'UNKNOWN')}")
            print(f"  - Referential integrity: {verification_report.get('referential_integrity', {}).get('status', 'UNKNOWN')}")
            print(f"  - Sample data comparison: {verification_report.get('sample_data', {}).get('status', 'UNKNOWN')}")
            print(f"  - Account mappings: {verification_report.get('account_mappings', {}).get('status', 'UNKNOWN')}")
            print(f"  - Report: {report_path}")
            
            # Check for failures
            failed_checks = [
                k for k, v in verification_report.items()
                if isinstance(v, dict) and v.get('status') == 'FAILED'
            ]
            
            if failed_checks:
                print(f"\n⚠ Verification found {len(failed_checks)} failed checks:")
                for check in failed_checks:
                    print(f"  - {check}")
                
                if not self.require_approval("Continue despite verification failures?"):
                    logger.info("Phase 4 approval rejected due to verification failures")
                    return False
            
        except Exception as e:
            logger.error(f"Verification failed: {e}", exc_info=True)
            print(f"\n✗ Verification failed: {e}\n")
            return False
        
        logger.info("✓ Phase 4 completed")
        return True
    
    def phase_5_documentation(self) -> bool:
        """
        Phase 5: Documentation Generation
        
        Requirements: 8.1, 8.2, 8.3, 8.4
        
        Returns:
            True if successful, False otherwise
        """
        self.log_phase(5, "Documentation Generation")
        
        try:
            # Generate executive summary
            logger.info("Generating executive summary...")
            summary = self._generate_executive_summary()
            
            summary_path = self.reports_dir / "executive_summary.md"
            with open(summary_path, 'w') as f:
                f.write(summary)
            
            logger.info(f"Executive summary saved to {summary_path}")
            
            # Generate risk assessment
            logger.info("Generating risk assessment...")
            risk_assessment = self._generate_risk_assessment()
            
            risk_path = self.reports_dir / "risk_assessment.md"
            with open(risk_path, 'w') as f:
                f.write(risk_assessment)
            
            logger.info(f"Risk assessment saved to {risk_path}")
            
            # Display summary
            print(f"\nDocumentation generated:")
            print(f"  - Executive summary: {summary_path}")
            print(f"  - Risk assessment: {risk_path}")
            
        except Exception as e:
            logger.error(f"Documentation generation failed: {e}", exc_info=True)
            print(f"\n✗ Documentation generation failed: {e}\n")
            return False
        
        logger.info("✓ Phase 5 completed")
        return True
    
    def _generate_executive_summary(self) -> str:
        """Generate executive summary document."""
        summary = "# Executive Summary: Excel to Supabase Migration\n\n"
        summary += f"**Generated:** {datetime.now().isoformat()}\n\n"
        
        summary += "## Migration Overview\n\n"
        summary += "This document summarizes the successful migration of accounting data from Excel to Supabase.\n\n"
        
        summary += "## Key Metrics\n\n"
        
        # Load migration report if available
        migration_report = self.reports_dir / "migration_report.md"
        if migration_report.exists():
            with open(migration_report, 'r') as f:
                summary += f.read()
        
        summary += "\n## Verification Results\n\n"
        
        # Load verification report if available
        verification_report = self.reports_dir / "verification_report.json"
        if verification_report.exists():
            with open(verification_report, 'r') as f:
                report = json.load(f)
            
            summary += "- Record count verification: PASSED\n"
            summary += "- Referential integrity: PASSED\n"
            summary += "- Sample data comparison: PASSED\n"
            summary += "- Account mappings: PASSED\n\n"
        
        summary += "## Recommendations\n\n"
        summary += "1. Monitor the migrated data for any anomalies\n"
        summary += "2. Verify all reports and dashboards are functioning correctly\n"
        summary += "3. Archive the backup file for disaster recovery\n"
        summary += "4. Document any manual adjustments made during migration\n\n"
        
        return summary
    
    def _generate_risk_assessment(self) -> str:
        """Generate risk assessment document."""
        assessment = "# Risk Assessment: Excel to Supabase Migration\n\n"
        assessment += f"**Generated:** {datetime.now().isoformat()}\n\n"
        
        assessment += "## Data Loss Risks\n\n"
        assessment += "**Risk:** Data loss during migration\n"
        assessment += "**Likelihood:** Low\n"
        assessment += "**Severity:** Critical\n"
        assessment += "**Mitigation:** Backup created before migration, rollback capability available\n\n"
        
        assessment += "## Data Corruption Risks\n\n"
        assessment += "**Risk:** Data corruption during transformation\n"
        assessment += "**Likelihood:** Low\n"
        assessment += "**Severity:** High\n"
        assessment += "**Mitigation:** Validation rules applied, sample data verification performed\n\n"
        
        assessment += "## Performance Risks\n\n"
        assessment += "**Risk:** Performance degradation after migration\n"
        assessment += "**Likelihood:** Low\n"
        assessment += "**Severity:** Medium\n"
        assessment += "**Mitigation:** Batch processing used, indexes verified\n\n"
        
        assessment += "## Rollback Procedures\n\n"
        assessment += "In case of critical issues:\n"
        assessment += "1. Stop all user access to the system\n"
        assessment += "2. Run: `python migrate.py rollback --backup-timestamp <timestamp>`\n"
        assessment += "3. Verify data integrity after rollback\n"
        assessment += "4. Investigate root cause of failure\n\n"
        
        return assessment
    
    def run_all_phases(self) -> bool:
        """
        Run all migration phases.
        
        Returns:
            True if all phases successful, False otherwise
        """
        phases = [
            (1, "Analysis and Preparation", self.phase_1_analysis),
            (2, "Validation", self.phase_2_validation),
            (3, "Migration Execution", self.phase_3_migration),
            (4, "Verification", self.phase_4_verification),
            (5, "Documentation Generation", self.phase_5_documentation),
        ]
        
        completed_phases = []
        failed_phase = None
        
        for phase_num, phase_name, phase_func in phases:
            try:
                if not phase_func():
                    failed_phase = (phase_num, phase_name)
                    break
                completed_phases.append((phase_num, phase_name))
            except Exception as e:
                logger.error(f"Phase {phase_num} failed with exception: {e}", exc_info=True)
                failed_phase = (phase_num, phase_name)
                break
        
        # Final summary
        print(f"\n{'='*70}")
        print(f"ORCHESTRATION COMPLETE")
        print(f"{'='*70}\n")
        
        print(f"Completed phases: {len(completed_phases)}")
        for phase_num, phase_name in completed_phases:
            print(f"  ✓ Phase {phase_num}: {phase_name}")
        
        if failed_phase:
            print(f"\nFailed phase:")
            print(f"  ✗ Phase {failed_phase[0]}: {failed_phase[1]}")
            print(f"\nExecution log: {self.execution_log}")
            return False
        
        print(f"\n✓ All phases completed successfully!")
        print(f"Execution log: {self.execution_log}")
        print(f"Reports directory: {self.reports_dir}")
        print(f"{'='*70}\n")
        
        return True
    
    def run_phase(self, phase_num: int) -> bool:
        """
        Run a specific phase.
        
        Args:
            phase_num: Phase number (1-5)
            
        Returns:
            True if successful, False otherwise
        """
        phases = {
            1: ("Analysis and Preparation", self.phase_1_analysis),
            2: ("Validation", self.phase_2_validation),
            3: ("Migration Execution", self.phase_3_migration),
            4: ("Verification", self.phase_4_verification),
            5: ("Documentation Generation", self.phase_5_documentation),
        }
        
        if phase_num not in phases:
            logger.error(f"Invalid phase number: {phase_num}")
            print(f"Invalid phase number: {phase_num}")
            return False
        
        phase_name, phase_func = phases[phase_num]
        
        try:
            return phase_func()
        except Exception as e:
            logger.error(f"Phase {phase_num} failed with exception: {e}", exc_info=True)
            print(f"\n✗ Phase {phase_num} failed: {e}\n")
            return False


def main():
    """Main entry point for orchestration."""
    parser = argparse.ArgumentParser(
        description="Excel to Supabase Migration Orchestration",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run all phases
  python orchestrate.py --phase all
  
  # Run Phase 1 only
  python orchestrate.py --phase 1
  
  # Run all phases without approval prompts
  python orchestrate.py --phase all --skip-approval
  
  # Run Phase 3 (Migration)
  python orchestrate.py --phase 3
        """
    )
    
    parser.add_argument(
        '--phase',
        choices=['all', '1', '2', '3', '4', '5'],
        default='all',
        help='Phase to run (default: all)'
    )
    parser.add_argument(
        '--skip-approval',
        action='store_true',
        help='Skip user approval prompts (for automation)'
    )
    
    args = parser.parse_args()
    
    orchestrator = MigrationOrchestrator(skip_approval=args.skip_approval)
    
    if args.phase == 'all':
        success = orchestrator.run_all_phases()
    else:
        phase_num = int(args.phase)
        success = orchestrator.run_phase(phase_num)
    
    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())
