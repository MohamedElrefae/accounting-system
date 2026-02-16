"""Risk assessment document generator."""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Tuple


class RiskAssessmentGenerator:
    """Generates comprehensive risk assessment documents."""

    def __init__(self, output_dir: str = "reports"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

    def _save_json(self, data: Dict[str, Any], filename: str) -> str:
        """Save data as JSON file."""
        filepath = self.output_dir / filename
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return str(filepath)

    def _save_markdown(self, content: str, filename: str) -> str:
        """Save content as Markdown file."""
        filepath = self.output_dir / filename
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return str(filepath)

    def _calculate_risk_score(self, severity: str, likelihood: str) -> int:
        """Calculate risk score based on severity and likelihood."""
        severity_map = {"Low": 1, "Medium": 2, "High": 3}
        likelihood_map = {"Low": 1, "Medium": 2, "High": 3}
        
        severity_score = severity_map.get(severity, 1)
        likelihood_score = likelihood_map.get(likelihood, 1)
        
        return severity_score * likelihood_score

    def identify_data_loss_risks(
        self,
        excel_record_count: int,
        supabase_record_count: int,
        backup_strategy: str
    ) -> List[Dict[str, Any]]:
        """Identify data loss risks."""
        risks = []

        # Risk 1: Incomplete migration
        risks.append({
            "id": "DL-001",
            "title": "Incomplete Data Migration",
            "description": f"Not all {excel_record_count} records from Excel are successfully migrated to Supabase.",
            "severity": "High",
            "likelihood": "Medium",
            "impact": f"Up to {excel_record_count} records could be lost",
            "mitigation": [
                "Validate record counts before and after migration",
                "Run dry-run mode first to identify issues",
                "Implement batch processing with error logging",
                "Verify all records in post-migration checks"
            ]
        })

        # Risk 2: Backup failure
        risks.append({
            "id": "DL-002",
            "title": "Backup Creation Failure",
            "description": "Backup of existing Supabase data fails, preventing rollback if needed.",
            "severity": "High",
            "likelihood": "Low",
            "impact": "Unable to rollback in case of migration failure",
            "mitigation": [
                f"Use {backup_strategy} backup strategy",
                "Verify backup integrity before migration",
                "Test backup restoration procedure",
                "Maintain multiple backup copies"
            ]
        })

        # Risk 3: Unmapped data
        risks.append({
            "id": "DL-003",
            "title": "Unmapped Account Codes",
            "description": "Excel account codes that don't have corresponding legacy_code mappings are skipped.",
            "severity": "High",
            "likelihood": "Low",
            "impact": "Transactions with unmapped accounts are not migrated",
            "mitigation": [
                "Complete account code mapping before migration",
                "Validate 100% mapping coverage",
                "Manually map any unmapped codes",
                "Generate report of unmapped codes"
            ]
        })

        return risks

    def identify_data_corruption_risks(
        self,
        has_unbalanced_transactions: bool,
        unbalanced_count: int = 0
    ) -> List[Dict[str, Any]]:
        """Identify data corruption risks."""
        risks = []

        # Risk 1: Unbalanced transactions
        if has_unbalanced_transactions:
            risks.append({
                "id": "DC-001",
                "title": "Unbalanced Transactions",
                "description": f"Excel contains {unbalanced_count} unbalanced transactions (debit != credit).",
                "severity": "High",
                "likelihood": "High",
                "impact": "Accounting records will be incorrect after migration",
                "prevention": [
                    "Fix unbalanced transactions in Excel before migration",
                    "Implement balance validation in migration process",
                    "Generate report of unbalanced transactions",
                    "Require user approval for auto-balancing"
                ]
            })

        # Risk 2: Data type mismatches
        risks.append({
            "id": "DC-002",
            "title": "Data Type Conversion Errors",
            "description": "Excel data types may not convert correctly to Supabase column types.",
            "severity": "Medium",
            "likelihood": "Medium",
            "impact": "Data could be truncated, rounded, or converted incorrectly",
            "prevention": [
                "Validate data types before migration",
                "Test conversion with sample data",
                "Implement type checking in validation",
                "Log all type conversion issues"
            ]
        })

        # Risk 3: Referential integrity violations
        risks.append({
            "id": "DC-003",
            "title": "Referential Integrity Violations",
            "description": "Foreign key constraints could be violated if related records are missing.",
            "severity": "High",
            "likelihood": "Low",
            "impact": "Database constraints could prevent data insertion",
            "prevention": [
                "Validate all foreign key references",
                "Migrate tables in dependency order",
                "Verify referential integrity after migration",
                "Handle missing references appropriately"
            ]
        })

        # Risk 4: Duplicate records
        risks.append({
            "id": "DC-004",
            "title": "Duplicate Record Creation",
            "description": "Migration could create duplicate records if run multiple times.",
            "severity": "Medium",
            "likelihood": "Medium",
            "impact": "Duplicate accounting entries could skew reports",
            "prevention": [
                "Implement idempotent migration logic",
                "Check for existing records before insert",
                "Use unique constraints in database",
                "Clear target tables before migration"
            ]
        })

        return risks

    def identify_performance_risks(
        self,
        total_records: int,
        batch_size: int = 100
    ) -> List[Dict[str, Any]]:
        """Identify performance risks."""
        risks = []

        # Risk 1: Long migration duration
        estimated_batches = (total_records + batch_size - 1) // batch_size
        risks.append({
            "id": "PF-001",
            "title": "Long Migration Duration",
            "description": f"Migration of {total_records} records in batches of {batch_size} could take significant time.",
            "severity": "Medium",
            "likelihood": "High",
            "impact": "Extended downtime or system unavailability",
            "mitigation": [
                f"Estimated duration: {estimated_batches} batches",
                "Run migration during off-peak hours",
                "Monitor progress with progress bars",
                "Optimize batch size for performance"
            ]
        })

        # Risk 2: Memory exhaustion
        risks.append({
            "id": "PF-002",
            "title": "Memory Exhaustion",
            "description": "Loading large datasets into memory could cause out-of-memory errors.",
            "severity": "Medium",
            "likelihood": "Low",
            "impact": "Migration process could crash",
            "mitigation": [
                "Process data in chunks",
                "Use streaming for large files",
                "Monitor memory usage",
                "Implement garbage collection"
            ]
        })

        # Risk 3: Network timeout
        risks.append({
            "id": "PF-003",
            "title": "Network Timeout",
            "description": "Long-running database operations could timeout.",
            "severity": "Medium",
            "likelihood": "Medium",
            "impact": "Migration could fail mid-process",
            "mitigation": [
                "Implement retry logic with exponential backoff",
                "Set appropriate timeout values",
                "Use connection pooling",
                "Monitor network connectivity"
            ]
        })

        return risks

    def generate_risk_matrix(
        self,
        all_risks: List[Dict[str, Any]]
    ) -> Tuple[str, str]:
        """Generate risk matrix visualization and data."""
        
        # JSON data
        json_data = {
            "timestamp": datetime.now().isoformat(),
            "risks": all_risks,
            "summary": {
                "total_risks": len(all_risks),
                "high_severity": sum(1 for r in all_risks if r.get("severity") == "High"),
                "medium_severity": sum(1 for r in all_risks if r.get("severity") == "Medium"),
                "low_severity": sum(1 for r in all_risks if r.get("severity") == "Low"),
            }
        }
        json_path = self._save_json(json_data, "risk_matrix.json")

        # Markdown matrix
        md_content = "# Risk Matrix\n\n"
        md_content += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        md_content += f"**Total Risks Identified:** {len(all_risks)}\n\n"

        md_content += "## Risk Summary by Severity\n\n"
        md_content += f"- **High Severity:** {json_data['summary']['high_severity']}\n"
        md_content += f"- **Medium Severity:** {json_data['summary']['medium_severity']}\n"
        md_content += f"- **Low Severity:** {json_data['summary']['low_severity']}\n\n"

        md_content += "## Risk Details\n\n"
        md_content += "| ID | Title | Severity | Likelihood | Impact |\n"
        md_content += "|----|----|----------|------------|--------|\n"
        
        for risk in sorted(all_risks, key=lambda r: self._calculate_risk_score(r.get("severity", "Low"), r.get("likelihood", "Low")), reverse=True):
            md_content += f"| {risk.get('id', '')} | {risk.get('title', '')} | "
            md_content += f"{risk.get('severity', '')} | {risk.get('likelihood', '')} | "
            md_content += f"{risk.get('impact', '')[:50]}... |\n"
        md_content += "\n"

        md_content += "## Detailed Risk Analysis\n\n"
        for risk in all_risks:
            md_content += f"### {risk.get('id', '')}: {risk.get('title', '')}\n\n"
            md_content += f"**Description:** {risk.get('description', 'N/A')}\n\n"
            md_content += f"**Severity:** {risk.get('severity', 'Unknown')}\n"
            md_content += f"**Likelihood:** {risk.get('likelihood', 'Unknown')}\n"
            md_content += f"**Impact:** {risk.get('impact', 'N/A')}\n\n"
            
            if "mitigation" in risk:
                md_content += "**Mitigation Strategies:**\n"
                for strategy in risk.get("mitigation", []):
                    md_content += f"- {strategy}\n"
            
            if "prevention" in risk:
                md_content += "**Prevention Measures:**\n"
                for measure in risk.get("prevention", []):
                    md_content += f"- {measure}\n"
            
            md_content += "\n"

        md_path = self._save_markdown(md_content, "risk_matrix.md")

        return json_path, md_path

    def generate_rollback_procedures(
        self,
        backup_location: str,
        backup_verification_steps: List[str],
        rollback_steps: List[str],
        verification_steps: List[str]
    ) -> str:
        """Generate rollback procedures document."""
        
        md_content = "# Rollback Procedures\n\n"
        md_content += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"

        md_content += "## Overview\n\n"
        md_content += "This document outlines the procedures to rollback the migration if critical issues are discovered.\n\n"

        md_content += "## Prerequisites\n\n"
        md_content += f"- **Backup Location:** {backup_location}\n"
        md_content += "- **Backup Verification:** Required before rollback\n"
        md_content += "- **Estimated Rollback Time:** 30-60 minutes\n\n"

        md_content += "## Backup Verification Steps\n\n"
        for i, step in enumerate(backup_verification_steps, 1):
            md_content += f"{i}. {step}\n"
        md_content += "\n"

        md_content += "## Rollback Execution Steps\n\n"
        md_content += "**WARNING:** Execute these steps only if migration has failed critically.\n\n"
        for i, step in enumerate(rollback_steps, 1):
            md_content += f"{i}. {step}\n"
        md_content += "\n"

        md_content += "## Post-Rollback Verification\n\n"
        md_content += "After rollback, verify the following:\n\n"
        for i, step in enumerate(verification_steps, 1):
            md_content += f"{i}. {step}\n"
        md_content += "\n"

        md_content += "## Escalation Procedure\n\n"
        md_content += "If rollback fails:\n"
        md_content += "1. Stop all migration processes immediately\n"
        md_content += "2. Contact database administrator\n"
        md_content += "3. Preserve all logs and error messages\n"
        md_content += "4. Do not attempt further recovery without expert guidance\n\n"

        return self._save_markdown(md_content, "rollback_procedures.md")


def generate_risk_assessment(
    excel_record_count: int,
    supabase_record_count: int,
    backup_strategy: str,
    has_unbalanced_transactions: bool,
    unbalanced_count: int,
    total_records: int,
    batch_size: int = 100,
    output_dir: str = "reports"
) -> Dict[str, str]:
    """Generate complete risk assessment."""
    generator = RiskAssessmentGenerator(output_dir)
    
    # Identify all risks
    data_loss_risks = generator.identify_data_loss_risks(
        excel_record_count,
        supabase_record_count,
        backup_strategy
    )
    data_corruption_risks = generator.identify_data_corruption_risks(
        has_unbalanced_transactions,
        unbalanced_count
    )
    performance_risks = generator.identify_performance_risks(total_records, batch_size)
    
    all_risks = data_loss_risks + data_corruption_risks + performance_risks
    
    # Generate risk matrix
    json_path, md_path = generator.generate_risk_matrix(all_risks)
    
    # Generate rollback procedures
    backup_verification_steps = [
        "Verify backup file exists and is readable",
        "Check backup file size is reasonable",
        "Verify backup timestamp is recent",
        "Test backup restoration on test database"
    ]
    
    rollback_steps = [
        "Stop all migration processes",
        "Restore backup to Supabase database",
        "Verify restoration completed successfully",
        "Run verification checks"
    ]
    
    verification_steps = [
        "Verify record counts match pre-migration state",
        "Verify data integrity through sample queries",
        "Verify referential integrity constraints",
        "Verify system is operational"
    ]
    
    rollback_path = generator.generate_rollback_procedures(
        "backups/pre_migration_{timestamp}.json",
        backup_verification_steps,
        rollback_steps,
        verification_steps
    )
    
    return {
        "risk_matrix_json": json_path,
        "risk_matrix_md": md_path,
        "rollback_procedures": rollback_path
    }
