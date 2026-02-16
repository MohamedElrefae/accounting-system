"""Report generation utilities for migration analysis and execution."""

import json
import csv
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
import pandas as pd


class ReportGenerator:
    """Generates reports in JSON and Markdown formats."""

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

    def _save_csv(self, data: List[Dict[str, Any]], filename: str) -> str:
        """Save data as CSV file."""
        if not data:
            return ""
        
        filepath = self.output_dir / filename
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
        return str(filepath)

    def generate_schema_analysis_report(
        self, 
        schema_data: Dict[str, Any],
        tables: List[str]
    ) -> Dict[str, str]:
        """Generate schema analysis report in JSON and Markdown formats."""
        
        # JSON report
        json_data = {
            "timestamp": datetime.now().isoformat(),
            "tables_analyzed": tables,
            "schema": schema_data,
            "summary": {
                "total_tables": len(tables),
                "total_columns": sum(
                    len(schema_data.get(table, {}).get("columns", []))
                    for table in tables
                ),
            }
        }
        json_path = self._save_json(json_data, "schema_analysis.json")

        # Markdown report
        md_content = "# Schema Analysis Report\n\n"
        md_content += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        md_content += f"## Summary\n\n"
        md_content += f"- **Tables Analyzed:** {len(tables)}\n"
        md_content += f"- **Total Columns:** {json_data['summary']['total_columns']}\n\n"

        for table in tables:
            table_schema = schema_data.get(table, {})
            columns = table_schema.get("columns", [])
            md_content += f"### Table: `{table}`\n\n"
            md_content += f"**Primary Key:** {table_schema.get('primary_key', 'N/A')}\n\n"
            md_content += "| Column | Type | Nullable | Default |\n"
            md_content += "|--------|------|----------|----------|\n"
            for col in columns:
                md_content += f"| {col.get('name', '')} | {col.get('type', '')} | "
                md_content += f"{col.get('nullable', False)} | {col.get('default', 'N/A')} |\n"
            md_content += "\n"

        md_path = self._save_markdown(md_content, "schema_analysis.md")

        return {"json": json_path, "markdown": md_path}

    def generate_excel_structure_report(
        self,
        sheets: List[str],
        columns_by_sheet: Dict[str, List[str]],
        data_types: Dict[str, Dict[str, str]],
        row_counts: Dict[str, int]
    ) -> Dict[str, str]:
        """Generate Excel structure report."""
        
        # JSON report
        json_data = {
            "timestamp": datetime.now().isoformat(),
            "sheets": sheets,
            "columns_by_sheet": columns_by_sheet,
            "data_types": data_types,
            "row_counts": row_counts,
            "summary": {
                "total_sheets": len(sheets),
                "total_columns": sum(len(cols) for cols in columns_by_sheet.values()),
                "total_rows": sum(row_counts.values()),
            }
        }
        json_path = self._save_json(json_data, "excel_structure.json")

        # Markdown report
        md_content = "# Excel File Structure Report\n\n"
        md_content += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        md_content += f"## Summary\n\n"
        md_content += f"- **Total Sheets:** {len(sheets)}\n"
        md_content += f"- **Total Columns:** {json_data['summary']['total_columns']}\n"
        md_content += f"- **Total Rows:** {json_data['summary']['total_rows']}\n\n"

        for sheet in sheets:
            columns = columns_by_sheet.get(sheet, [])
            row_count = row_counts.get(sheet, 0)
            sheet_types = data_types.get(sheet, {})
            
            md_content += f"### Sheet: `{sheet}`\n\n"
            md_content += f"**Row Count:** {row_count}\n\n"
            md_content += "| Column | Data Type |\n"
            md_content += "|--------|----------|\n"
            for col in columns:
                col_type = sheet_types.get(col, "Unknown")
                md_content += f"| {col} | {col_type} |\n"
            md_content += "\n"

        md_path = self._save_markdown(md_content, "excel_structure.md")

        return {"json": json_path, "markdown": md_path}

    def generate_comparison_report(
        self,
        field_mappings: Dict[str, str],
        mismatches: List[Dict[str, Any]],
        dependencies: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Generate comparison report between Excel and Supabase."""
        
        # JSON report
        json_data = {
            "timestamp": datetime.now().isoformat(),
            "field_mappings": field_mappings,
            "mismatches": mismatches,
            "dependencies": dependencies,
            "summary": {
                "total_mappings": len(field_mappings),
                "total_mismatches": len(mismatches),
                "total_dependencies": len(dependencies),
            }
        }
        json_path = self._save_json(json_data, "comparison_report.json")

        # Markdown report
        md_content = "# Data Structure Comparison Report\n\n"
        md_content += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        md_content += f"## Summary\n\n"
        md_content += f"- **Field Mappings:** {len(field_mappings)}\n"
        md_content += f"- **Mismatches:** {len(mismatches)}\n"
        md_content += f"- **Dependencies:** {len(dependencies)}\n\n"

        md_content += "## Field Mappings\n\n"
        md_content += "| Excel Field | Supabase Field |\n"
        md_content += "|-------------|----------------|\n"
        for excel_field, supabase_field in field_mappings.items():
            md_content += f"| {excel_field} | {supabase_field} |\n"
        md_content += "\n"

        if mismatches:
            md_content += "## Mismatches\n\n"
            for mismatch in mismatches:
                md_content += f"- **{mismatch.get('field', 'Unknown')}**: {mismatch.get('issue', 'N/A')}\n"
            md_content += "\n"

        if dependencies:
            md_content += "## Table Dependencies\n\n"
            for dep in dependencies:
                md_content += f"- {dep.get('from_table', '')} → {dep.get('to_table', '')} "
                md_content += f"(via {dep.get('foreign_key', 'N/A')})\n"
            md_content += "\n"

        md_path = self._save_markdown(md_content, "comparison_report.md")

        return {"json": json_path, "markdown": md_path}

    def generate_account_mapping_table(
        self,
        mappings: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Generate account code mapping table."""
        
        # CSV report
        csv_path = self._save_csv(mappings, "account_mapping.csv")

        # Markdown report
        md_content = "# Account Code Mapping Table\n\n"
        md_content += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        md_content += f"**Total Mappings:** {len(mappings)}\n\n"
        md_content += "| Excel Code | Legacy Code | Current Code | Account Name | Status |\n"
        md_content += "|------------|-------------|--------------|--------------|--------|\n"
        
        for mapping in mappings:
            md_content += f"| {mapping.get('excel_code', '')} | "
            md_content += f"{mapping.get('legacy_code', '')} | "
            md_content += f"{mapping.get('current_code', '')} | "
            md_content += f"{mapping.get('account_name', '')} | "
            md_content += f"{mapping.get('status', 'Unknown')} |\n"
        md_content += "\n"

        md_path = self._save_markdown(md_content, "account_mapping.md")

        return {"csv": csv_path, "markdown": md_path}

    def generate_validation_report(
        self,
        validation_results: Dict[str, Any],
        errors: List[Dict[str, Any]],
        warnings: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Generate validation report."""
        
        # JSON report
        json_data = {
            "timestamp": datetime.now().isoformat(),
            "validation_results": validation_results,
            "errors": errors,
            "warnings": warnings,
            "summary": {
                "total_errors": len(errors),
                "total_warnings": len(warnings),
                "passed": validation_results.get("passed", False),
            }
        }
        json_path = self._save_json(json_data, "validation_report.json")

        # Markdown report
        md_content = "# Data Validation Report\n\n"
        md_content += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        md_content += f"## Summary\n\n"
        md_content += f"- **Status:** {'✓ PASSED' if validation_results.get('passed') else '✗ FAILED'}\n"
        md_content += f"- **Total Errors:** {len(errors)}\n"
        md_content += f"- **Total Warnings:** {len(warnings)}\n\n"

        if errors:
            md_content += "## Errors\n\n"
            for error in errors[:50]:  # Limit to first 50
                md_content += f"- **Row {error.get('row', 'N/A')}**: {error.get('message', 'Unknown error')}\n"
            if len(errors) > 50:
                md_content += f"\n... and {len(errors) - 50} more errors\n\n"

        if warnings:
            md_content += "## Warnings\n\n"
            for warning in warnings[:50]:  # Limit to first 50
                md_content += f"- **Row {warning.get('row', 'N/A')}**: {warning.get('message', 'Unknown warning')}\n"
            if len(warnings) > 50:
                md_content += f"\n... and {len(warnings) - 50} more warnings\n\n"

        md_path = self._save_markdown(md_content, "validation_report.md")

        return {"json": json_path, "markdown": md_path}

    def generate_migration_report(
        self,
        migration_results: Dict[str, Any],
        batch_results: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Generate migration execution report."""
        
        # JSON report
        json_data = {
            "timestamp": datetime.now().isoformat(),
            "migration_results": migration_results,
            "batch_results": batch_results,
            "summary": {
                "total_records_processed": migration_results.get("total_records_processed", 0),
                "total_records_succeeded": migration_results.get("total_records_succeeded", 0),
                "total_records_failed": migration_results.get("total_records_failed", 0),
                "success_rate": migration_results.get("success_rate", 0),
            }
        }
        json_path = self._save_json(json_data, "migration_report.json")

        # Markdown report
        md_content = "# Migration Execution Report\n\n"
        md_content += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        md_content += f"## Summary\n\n"
        md_content += f"- **Total Records Processed:** {json_data['summary']['total_records_processed']}\n"
        md_content += f"- **Records Succeeded:** {json_data['summary']['total_records_succeeded']}\n"
        md_content += f"- **Records Failed:** {json_data['summary']['total_records_failed']}\n"
        md_content += f"- **Success Rate:** {json_data['summary']['success_rate']:.2f}%\n\n"

        md_content += "## Batch Processing Results\n\n"
        md_content += "| Batch | Processed | Succeeded | Failed | Status |\n"
        md_content += "|-------|-----------|-----------|--------|--------|\n"
        for batch in batch_results:
            md_content += f"| {batch.get('batch_number', '')} | "
            md_content += f"{batch.get('records_processed', 0)} | "
            md_content += f"{batch.get('records_succeeded', 0)} | "
            md_content += f"{batch.get('records_failed', 0)} | "
            md_content += f"{batch.get('status', 'Unknown')} |\n"
        md_content += "\n"

        md_path = self._save_markdown(md_content, "migration_report.md")

        return {"json": json_path, "markdown": md_path}

    def generate_verification_report(
        self,
        verification_checks: Dict[str, Any],
        check_results: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Generate post-migration verification report."""
        
        # JSON report
        json_data = {
            "timestamp": datetime.now().isoformat(),
            "verification_checks": verification_checks,
            "check_results": check_results,
            "summary": {
                "total_checks": len(check_results),
                "passed_checks": sum(1 for c in check_results if c.get("passed", False)),
                "failed_checks": sum(1 for c in check_results if not c.get("passed", False)),
            }
        }
        json_path = self._save_json(json_data, "verification_report.json")

        # Markdown report
        md_content = "# Post-Migration Verification Report\n\n"
        md_content += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        md_content += f"## Summary\n\n"
        md_content += f"- **Total Checks:** {json_data['summary']['total_checks']}\n"
        md_content += f"- **Passed:** {json_data['summary']['passed_checks']}\n"
        md_content += f"- **Failed:** {json_data['summary']['failed_checks']}\n\n"

        md_content += "## Verification Results\n\n"
        md_content += "| Check | Status | Details |\n"
        md_content += "|-------|--------|----------|\n"
        for check in check_results:
            status = "✓ PASS" if check.get("passed") else "✗ FAIL"
            md_content += f"| {check.get('check_name', '')} | {status} | "
            md_content += f"{check.get('details', 'N/A')} |\n"
        md_content += "\n"

        md_path = self._save_markdown(md_content, "verification_report.md")

        return {"json": json_path, "markdown": md_path}


# Convenience functions
def generate_schema_analysis_report(
    schema_data: Dict[str, Any],
    tables: List[str],
    output_dir: str = "reports"
) -> Dict[str, str]:
    """Generate schema analysis report."""
    generator = ReportGenerator(output_dir)
    return generator.generate_schema_analysis_report(schema_data, tables)


def generate_excel_structure_report(
    sheets: List[str],
    columns_by_sheet: Dict[str, List[str]],
    data_types: Dict[str, Dict[str, str]],
    row_counts: Dict[str, int],
    output_dir: str = "reports"
) -> Dict[str, str]:
    """Generate Excel structure report."""
    generator = ReportGenerator(output_dir)
    return generator.generate_excel_structure_report(sheets, columns_by_sheet, data_types, row_counts)


def generate_comparison_report(
    field_mappings: Dict[str, str],
    mismatches: List[Dict[str, Any]],
    dependencies: List[Dict[str, Any]],
    output_dir: str = "reports"
) -> Dict[str, str]:
    """Generate comparison report."""
    generator = ReportGenerator(output_dir)
    return generator.generate_comparison_report(field_mappings, mismatches, dependencies)


def generate_account_mapping_table(
    mappings: List[Dict[str, Any]],
    output_dir: str = "reports"
) -> Dict[str, str]:
    """Generate account mapping table."""
    generator = ReportGenerator(output_dir)
    return generator.generate_account_mapping_table(mappings)


def generate_validation_report(
    validation_results: Dict[str, Any],
    errors: List[Dict[str, Any]],
    warnings: List[Dict[str, Any]],
    output_dir: str = "reports"
) -> Dict[str, str]:
    """Generate validation report."""
    generator = ReportGenerator(output_dir)
    return generator.generate_validation_report(validation_results, errors, warnings)


def generate_migration_report(
    migration_results: Dict[str, Any],
    batch_results: List[Dict[str, Any]],
    output_dir: str = "reports"
) -> Dict[str, str]:
    """Generate migration report."""
    generator = ReportGenerator(output_dir)
    return generator.generate_migration_report(migration_results, batch_results)


def generate_verification_report(
    verification_checks: Dict[str, Any],
    check_results: List[Dict[str, Any]],
    output_dir: str = "reports"
) -> Dict[str, str]:
    """Generate verification report."""
    generator = ReportGenerator(output_dir)
    return generator.generate_verification_report(verification_checks, check_results)
