"""Executive summary generator for non-technical review."""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List


class ExecutiveSummaryGenerator:
    """Generates executive summaries suitable for non-technical review."""

    def __init__(self, output_dir: str = "reports"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

    def _save_markdown(self, content: str, filename: str) -> str:
        """Save content as Markdown file."""
        filepath = self.output_dir / filename
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return str(filepath)

    def generate_executive_summary(
        self,
        migration_metrics: Dict[str, Any],
        risk_summary: Dict[str, Any],
        recommendations: List[str],
        success_criteria: Dict[str, Any]
    ) -> str:
        """Generate high-level migration summary for non-technical review."""
        
        md_content = "# Executive Summary: Excel to Supabase Migration\n\n"
        md_content += f"**Report Date:** {datetime.now().strftime('%B %d, %Y')}\n\n"

        # Overview
        md_content += "## Overview\n\n"
        md_content += "This document provides a high-level summary of the Excel to Supabase data migration project. "
        md_content += "It is designed for non-technical stakeholders to understand the scope, risks, and outcomes of the migration.\n\n"

        # Key Metrics
        md_content += "## Key Metrics\n\n"
        md_content += "| Metric | Value |\n"
        md_content += "|--------|-------|\n"
        for metric, value in migration_metrics.items():
            md_content += f"| {metric} | {value} |\n"
        md_content += "\n"

        # Risk Assessment Summary
        md_content += "## Risk Assessment Summary\n\n"
        md_content += "### Overall Risk Level\n\n"
        risk_level = risk_summary.get("overall_risk_level", "Medium")
        risk_color = {
            "Low": "🟢",
            "Medium": "🟡",
            "High": "🔴"
        }.get(risk_level, "⚪")
        md_content += f"{risk_color} **{risk_level}**\n\n"

        # Risk Categories
        md_content += "### Risk Categories\n\n"
        for category, details in risk_summary.get("risk_categories", {}).items():
            md_content += f"**{category}**\n"
            md_content += f"- Severity: {details.get('severity', 'Unknown')}\n"
            md_content += f"- Likelihood: {details.get('likelihood', 'Unknown')}\n"
            md_content += f"- Mitigation: {details.get('mitigation', 'N/A')}\n\n"

        # Success Criteria
        md_content += "## Success Criteria\n\n"
        md_content += "The migration will be considered successful when:\n\n"
        for criterion, status in success_criteria.items():
            status_icon = "✓" if status else "✗"
            md_content += f"{status_icon} {criterion}\n"
        md_content += "\n"

        # Recommendations
        md_content += "## Recommendations\n\n"
        for i, recommendation in enumerate(recommendations, 1):
            md_content += f"{i}. {recommendation}\n"
        md_content += "\n"

        # Timeline
        md_content += "## Timeline\n\n"
        md_content += "- **Phase 1 (Analysis):** 1-2 days\n"
        md_content += "- **Phase 2 (Validation):** 1-2 days\n"
        md_content += "- **Phase 3 (Migration):** 1 day (dry-run) + 1 day (execution)\n"
        md_content += "- **Phase 4 (Verification):** 1 day\n"
        md_content += "- **Total Estimated Duration:** 5-7 days\n\n"

        # Next Steps
        md_content += "## Next Steps\n\n"
        md_content += "1. Review this executive summary with stakeholders\n"
        md_content += "2. Approve migration plan and timeline\n"
        md_content += "3. Ensure backup procedures are in place\n"
        md_content += "4. Schedule migration window\n"
        md_content += "5. Prepare rollback procedures\n\n"

        # Appendix
        md_content += "## Appendix: Detailed Reports\n\n"
        md_content += "For detailed technical information, refer to:\n"
        md_content += "- `schema_analysis.md` - Database schema details\n"
        md_content += "- `excel_structure.md` - Excel file structure\n"
        md_content += "- `comparison_report.md` - Field mapping details\n"
        md_content += "- `validation_report.md` - Data quality findings\n"
        md_content += "- `risk_assessment.md` - Detailed risk analysis\n\n"

        return self._save_markdown(md_content, "executive_summary.md")

    def generate_risk_assessment_document(
        self,
        data_loss_risks: List[Dict[str, Any]],
        data_corruption_risks: List[Dict[str, Any]],
        performance_risks: List[Dict[str, Any]],
        rollback_procedures: Dict[str, Any]
    ) -> str:
        """Generate detailed risk assessment document."""
        
        md_content = "# Risk Assessment Document\n\n"
        md_content += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"

        # Data Loss Risks
        md_content += "## Data Loss Risks\n\n"
        md_content += "### Overview\n"
        md_content += "Data loss risks are scenarios where data could be permanently lost during migration.\n\n"
        
        for risk in data_loss_risks:
            md_content += f"### {risk.get('title', 'Unknown Risk')}\n\n"
            md_content += f"**Severity:** {risk.get('severity', 'Unknown')}\n"
            md_content += f"**Likelihood:** {risk.get('likelihood', 'Unknown')}\n"
            md_content += f"**Description:** {risk.get('description', 'N/A')}\n"
            md_content += f"**Mitigation:** {risk.get('mitigation', 'N/A')}\n\n"

        # Data Corruption Risks
        md_content += "## Data Corruption Risks\n\n"
        md_content += "### Overview\n"
        md_content += "Data corruption risks are scenarios where data could be altered or become inconsistent.\n\n"
        
        for risk in data_corruption_risks:
            md_content += f"### {risk.get('title', 'Unknown Risk')}\n\n"
            md_content += f"**Severity:** {risk.get('severity', 'Unknown')}\n"
            md_content += f"**Likelihood:** {risk.get('likelihood', 'Unknown')}\n"
            md_content += f"**Description:** {risk.get('description', 'N/A')}\n"
            md_content += f"**Prevention:** {risk.get('prevention', 'N/A')}\n\n"

        # Performance Risks
        md_content += "## Performance Risks\n\n"
        md_content += "### Overview\n"
        md_content += "Performance risks are scenarios where the migration could impact system performance.\n\n"
        
        for risk in performance_risks:
            md_content += f"### {risk.get('title', 'Unknown Risk')}\n\n"
            md_content += f"**Severity:** {risk.get('severity', 'Unknown')}\n"
            md_content += f"**Likelihood:** {risk.get('likelihood', 'Unknown')}\n"
            md_content += f"**Description:** {risk.get('description', 'N/A')}\n"
            md_content += f"**Mitigation:** {risk.get('mitigation', 'N/A')}\n\n"

        # Rollback Procedures
        md_content += "## Rollback Procedures\n\n"
        md_content += "### Overview\n"
        md_content += "In case of critical issues, the following rollback procedures should be executed:\n\n"
        
        md_content += "### Prerequisites\n"
        md_content += f"- Backup Location: {rollback_procedures.get('backup_location', 'N/A')}\n"
        md_content += f"- Backup Verification: {rollback_procedures.get('backup_verification', 'N/A')}\n\n"

        md_content += "### Rollback Steps\n"
        steps = rollback_procedures.get('steps', [])
        for i, step in enumerate(steps, 1):
            md_content += f"{i}. {step}\n"
        md_content += "\n"

        md_content += "### Verification After Rollback\n"
        verification = rollback_procedures.get('verification', [])
        for check in verification:
            md_content += f"- {check}\n"
        md_content += "\n"

        # Risk Matrix
        md_content += "## Risk Matrix\n\n"
        md_content += "| Risk | Severity | Likelihood | Priority |\n"
        md_content += "|------|----------|------------|----------|\n"
        
        all_risks = data_loss_risks + data_corruption_risks + performance_risks
        for risk in all_risks:
            severity = risk.get('severity', 'Unknown')
            likelihood = risk.get('likelihood', 'Unknown')
            priority = risk.get('priority', 'Medium')
            md_content += f"| {risk.get('title', '')} | {severity} | {likelihood} | {priority} |\n"
        md_content += "\n"

        return self._save_markdown(md_content, "risk_assessment.md")


def generate_executive_summary(
    migration_metrics: Dict[str, Any],
    risk_summary: Dict[str, Any],
    recommendations: List[str],
    success_criteria: Dict[str, Any],
    output_dir: str = "reports"
) -> str:
    """Generate executive summary."""
    generator = ExecutiveSummaryGenerator(output_dir)
    return generator.generate_executive_summary(
        migration_metrics,
        risk_summary,
        recommendations,
        success_criteria
    )


def generate_risk_assessment_document(
    data_loss_risks: List[Dict[str, Any]],
    data_corruption_risks: List[Dict[str, Any]],
    performance_risks: List[Dict[str, Any]],
    rollback_procedures: Dict[str, Any],
    output_dir: str = "reports"
) -> str:
    """Generate risk assessment document."""
    generator = ExecutiveSummaryGenerator(output_dir)
    return generator.generate_risk_assessment_document(
        data_loss_risks,
        data_corruption_risks,
        performance_risks,
        rollback_procedures
    )
