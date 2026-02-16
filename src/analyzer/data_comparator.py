"""
Data Comparator Module

Compares Excel and Supabase data structures to identify mappings, mismatches, and dependencies.
Implements Requirements 3.1, 3.3, 3.4, 3.5, 3.6
"""

import json
import logging
from dataclasses import dataclass, asdict
from typing import Dict, List, Tuple, Optional, Any, Set
from datetime import datetime

import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class FieldMapping:
    """Represents a mapping between Excel and Supabase fields"""
    excel_column: str
    supabase_table: str
    supabase_column: str
    data_type: str
    confidence: float  # 0.0 to 1.0
    notes: str = ""


@dataclass
class Mismatch:
    """Represents a structural mismatch between Excel and Supabase"""
    type: str  # "missing_in_supabase", "missing_in_excel", "type_mismatch", "constraint_mismatch"
    excel_field: Optional[str]
    supabase_field: Optional[str]
    description: str
    severity: str  # "warning", "error", "critical"


@dataclass
class TableDependency:
    """Represents a dependency between tables"""
    source_table: str
    target_table: str
    foreign_key_column: str
    primary_key_column: str
    relationship_type: str  # "one_to_many", "many_to_one", "one_to_one"


@dataclass
class ComparisonResult:
    """Result of comparing Excel and Supabase structures"""
    timestamp: str
    excel_columns: List[str]
    supabase_tables: Dict[str, List[str]]
    field_mappings: List[FieldMapping]
    mismatches: List[Mismatch]
    dependencies: List[TableDependency]
    summary: Dict[str, Any]


class DataComparator:
    """
    Compares Excel and Supabase data structures.
    
    Implements:
    - Structure comparison
    - Field mapping identification
    - Mismatch detection
    - Table dependency analysis
    """
    
    def __init__(self, excel_structure: Dict[str, Any], supabase_schema: Dict[str, Any]):
        """
        Initialize the comparator.
        
        Args:
            excel_structure: Excel file structure analysis
            supabase_schema: Supabase database schema
        """
        self.excel_structure = excel_structure
        self.supabase_schema = supabase_schema
        self.field_mappings: List[FieldMapping] = []
        self.mismatches: List[Mismatch] = []
        self.dependencies: List[TableDependency] = []
        
        logger.info("DataComparator initialized")
    
    def compare_structures(self) -> ComparisonResult:
        """
        Compare Excel and Supabase structures.
        
        Returns:
            ComparisonResult with all comparison details
        """
        logger.info("Starting structure comparison")
        
        # Extract Excel columns
        excel_columns = self._extract_excel_columns()
        
        # Extract Supabase tables and columns
        supabase_tables = self._extract_supabase_tables()
        
        # Identify field mappings
        self.field_mappings = self._identify_field_mappings(excel_columns, supabase_tables)
        
        # Detect mismatches
        self.mismatches = self._detect_mismatches(excel_columns, supabase_tables)
        
        # Identify table dependencies
        self.dependencies = self._identify_dependencies()
        
        # Generate summary
        summary = self._generate_summary(excel_columns, supabase_tables)
        
        result = ComparisonResult(
            timestamp=datetime.now().isoformat(),
            excel_columns=excel_columns,
            supabase_tables=supabase_tables,
            field_mappings=self.field_mappings,
            mismatches=self.mismatches,
            dependencies=self.dependencies,
            summary=summary
        )
        
        logger.info(f"Comparison complete: {len(self.field_mappings)} mappings, "
                   f"{len(self.mismatches)} mismatches, {len(self.dependencies)} dependencies")
        
        return result
    
    def _extract_excel_columns(self) -> List[str]:
        """Extract column names from Excel structure."""
        if isinstance(self.excel_structure, dict):
            if 'columns' in self.excel_structure:
                return self.excel_structure['columns']
            elif 'sheets' in self.excel_structure:
                # Get columns from transactions sheet
                for sheet in self.excel_structure['sheets']:
                    if sheet.get('name') == 'transactions ' or sheet.get('name') == 'transactions':
                        return sheet.get('columns', [])
        return []
    
    def _extract_supabase_tables(self) -> Dict[str, List[str]]:
        """Extract table names and columns from Supabase schema."""
        tables = {}
        
        if isinstance(self.supabase_schema, dict):
            if 'tables' in self.supabase_schema:
                for table in self.supabase_schema['tables']:
                    table_name = table.get('name')
                    columns = [col.get('name') for col in table.get('columns', [])]
                    if table_name and columns:
                        tables[table_name] = columns
        
        return tables
    
    def _identify_field_mappings(self, excel_columns: List[str], 
                                 supabase_tables: Dict[str, List[str]]) -> List[FieldMapping]:
        """
        Identify mappings between Excel and Supabase fields.
        
        Uses heuristic matching based on column names and semantic similarity.
        """
        mappings = []
        
        # Define known mappings based on design document
        known_mappings = {
            'fiscal_year': ('transactions', 'fiscal_year'),
            'month': ('transactions', 'month'),
            'entry_no': ('transactions', 'reference_number'),
            'entry_date': ('transactions', 'transaction_date'),
            'account_code': ('transaction_lines', 'account_id'),
            'transaction_classification_code': ('transaction_lines', 'classification_id'),
            'classification_code': ('transaction_lines', 'classification_code'),
            'project_code': ('transaction_lines', 'project_id'),
            'work_analysis_code': ('transaction_lines', 'work_analysis_id'),
            'sub_tree_code': ('transaction_lines', 'sub_tree_id'),
            'debit': ('transaction_lines', 'debit_amount'),
            'credit': ('transaction_lines', 'credit_amount'),
            'notes': ('transaction_lines', 'notes'),
        }
        
        for excel_col in excel_columns:
            if excel_col in known_mappings:
                table, column = known_mappings[excel_col]
                if table in supabase_tables and column in supabase_tables[table]:
                    mapping = FieldMapping(
                        excel_column=excel_col,
                        supabase_table=table,
                        supabase_column=column,
                        data_type=self._infer_data_type(excel_col),
                        confidence=0.95,
                        notes="Known mapping from design document"
                    )
                    mappings.append(mapping)
                    logger.debug(f"Mapped {excel_col} → {table}.{column}")
        
        return mappings
    
    def _infer_data_type(self, column_name: str) -> str:
        """Infer data type from column name."""
        col_lower = column_name.lower()
        
        if 'date' in col_lower or 'entry_date' in col_lower:
            return 'date'
        elif 'code' in col_lower or 'id' in col_lower:
            return 'string'
        elif 'debit' in col_lower or 'credit' in col_lower or 'amount' in col_lower:
            return 'numeric'
        elif 'year' in col_lower or 'month' in col_lower:
            return 'integer'
        else:
            return 'string'
    
    def _detect_mismatches(self, excel_columns: List[str], 
                          supabase_tables: Dict[str, List[str]]) -> List[Mismatch]:
        """
        Detect structural mismatches between Excel and Supabase.
        """
        mismatches = []
        
        # Check for Excel columns without Supabase mappings
        mapped_excel_cols = {m.excel_column for m in self.field_mappings}
        for excel_col in excel_columns:
            if excel_col not in mapped_excel_cols:
                # Check if it's a derived column (like account_name, project_name)
                if not any(x in excel_col.lower() for x in ['name', 'description']):
                    mismatch = Mismatch(
                        type='missing_in_supabase',
                        excel_field=excel_col,
                        supabase_field=None,
                        description=f"Excel column '{excel_col}' has no mapping in Supabase",
                        severity='warning'
                    )
                    mismatches.append(mismatch)
                    logger.warning(f"Unmapped Excel column: {excel_col}")
        
        return mismatches
    
    def _identify_dependencies(self) -> List[TableDependency]:
        """
        Identify table dependencies from Supabase schema.
        """
        dependencies = []
        
        if not isinstance(self.supabase_schema, dict):
            return dependencies
        
        if 'relationships' in self.supabase_schema:
            for rel in self.supabase_schema['relationships']:
                dep = TableDependency(
                    source_table=rel.get('source_table', ''),
                    target_table=rel.get('target_table', ''),
                    foreign_key_column=rel.get('foreign_key', ''),
                    primary_key_column=rel.get('primary_key', ''),
                    relationship_type=rel.get('type', 'many_to_one')
                )
                dependencies.append(dep)
                logger.debug(f"Dependency: {dep.source_table} → {dep.target_table}")
        
        return dependencies
    
    def _generate_summary(self, excel_columns: List[str], 
                         supabase_tables: Dict[str, List[str]]) -> Dict[str, Any]:
        """Generate a summary of the comparison."""
        mapped_count = len(self.field_mappings)
        unmapped_count = len(excel_columns) - mapped_count
        
        return {
            'excel_column_count': len(excel_columns),
            'supabase_table_count': len(supabase_tables),
            'supabase_column_count': sum(len(cols) for cols in supabase_tables.values()),
            'mapped_fields': mapped_count,
            'unmapped_fields': unmapped_count,
            'mapping_coverage': f"{(mapped_count / len(excel_columns) * 100):.1f}%" if excel_columns else "0%",
            'mismatch_count': len(self.mismatches),
            'critical_mismatches': len([m for m in self.mismatches if m.severity == 'critical']),
            'dependency_count': len(self.dependencies),
        }
    
    def generate_comparison_report(self, output_file: str = 'reports/comparison_report.json') -> bool:
        """
        Generate a JSON comparison report.
        
        Args:
            output_file: Path to output JSON file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            result = self.compare_structures()
            
            # Convert to serializable format
            report_data = {
                'timestamp': result.timestamp,
                'excel_columns': result.excel_columns,
                'supabase_tables': result.supabase_tables,
                'field_mappings': [asdict(m) for m in result.field_mappings],
                'mismatches': [asdict(m) for m in result.mismatches],
                'dependencies': [asdict(d) for d in result.dependencies],
                'summary': result.summary,
            }
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Comparison report saved to {output_file}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to generate comparison report: {e}")
            return False
    
    def get_field_mappings(self) -> List[FieldMapping]:
        """Get all identified field mappings."""
        return self.field_mappings
    
    def get_mismatches(self) -> List[Mismatch]:
        """Get all detected mismatches."""
        return self.mismatches
    
    def get_dependencies(self) -> List[TableDependency]:
        """Get all identified dependencies."""
        return self.dependencies
