"""
Schema Manager for Excel Data Migration

This module provides schema management capabilities:
- Load schema from Phase 0 output (reports/supabase_schema.json)
- Lookup methods for tables, columns, and foreign keys
- Data validation against schema before insert
"""

import json
import logging
from typing import Dict, List, Optional, Any, Set, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import pandas as pd

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ColumnDefinition:
    """Definition of a database column"""
    name: str
    data_type: str
    nullable: bool = True
    default_value: Optional[Any] = None
    constraints: List[str] = field(default_factory=list)
    description: Optional[str] = None


@dataclass
class ForeignKey:
    """Foreign key relationship"""
    table_name: str
    column_name: str
    referenced_table: str
    referenced_column: str
    constraint_name: Optional[str] = None


@dataclass
class TableSchema:
    """Schema for a database table"""
    table_name: str
    columns: Dict[str, ColumnDefinition] = field(default_factory=dict)
    primary_keys: List[str] = field(default_factory=list)
    foreign_keys: List[ForeignKey] = field(default_factory=list)
    indexes: List[Dict[str, Any]] = field(default_factory=list)
    description: Optional[str] = None


@dataclass
class SchemaValidationResult:
    """Result of schema validation"""
    is_valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    validated_rows: int = 0
    invalid_rows: int = 0


class SchemaManager:
    """
    Manages database schema for validation and lookup operations.
    """
    
    def __init__(self, schema_file: Optional[str] = None):
        """
        Initialize schema manager.
        
        Args:
            schema_file: Path to schema JSON file (default: reports/supabase_schema.json)
        """
        if schema_file is None:
            schema_file = "reports/supabase_schema.json"
        
        self.schema_file = Path(schema_file)
        self.schema: Dict[str, TableSchema] = {}
        self.loaded = False
        
        # Load schema
        self.load_schema()
    
    def load_schema(self) -> bool:
        """
        Load schema from JSON file.
        
        Returns:
            True if schema loaded successfully, False otherwise
        """
        try:
            if not self.schema_file.exists():
                logger.warning(f"Schema file not found: {self.schema_file}")
                # Create empty schema structure
                self._create_empty_schema()
                return True
            
            logger.info(f"Loading schema from {self.schema_file}")
            with open(self.schema_file, 'r', encoding='utf-8') as f:
                schema_data = json.load(f)
            
            # Parse schema data
            self._parse_schema_data(schema_data)
            self.loaded = True
            logger.info(f"Schema loaded successfully with {len(self.schema)} tables")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load schema: {str(e)}")
            self._create_empty_schema()
            return False
    
    def _create_empty_schema(self):
        """Create empty schema structure for fallback"""
        self.schema = {
            "accounts": TableSchema(table_name="accounts"),
            "transactions": TableSchema(table_name="transactions"),
            "transaction_lines": TableSchema(table_name="transaction_lines"),
            "projects": TableSchema(table_name="projects"),
            "classifications": TableSchema(table_name="classifications"),
            "work_analysis": TableSchema(table_name="work_analysis"),
            "sub_tree": TableSchema(table_name="sub_tree")
        }
        logger.warning("Created empty schema structure as fallback")
    
    def _parse_schema_data(self, schema_data: Dict[str, Any]):
        """Parse schema data from JSON"""
        tables_data = schema_data.get("tables", {})
        
        for table_name, table_data in tables_data.items():
            table_schema = TableSchema(table_name=table_name)
            
            # Parse columns
            columns_data = table_data.get("columns", [])
            for col_data in columns_data:
                if isinstance(col_data, dict):
                    col_def = ColumnDefinition(
                        name=col_data.get("name", ""),
                        data_type=col_data.get("data_type", "text"),
                        nullable=col_data.get("nullable", True),
                        default_value=col_data.get("default_value"),
                        constraints=col_data.get("constraints", []),
                        description=col_data.get("description")
                    )
                    table_schema.columns[col_def.name] = col_def
            
            # Parse primary keys
            table_schema.primary_keys = table_data.get("primary_keys", [])
            
            # Parse foreign keys
            foreign_keys_data = table_data.get("foreign_keys", [])
            for fk_data in foreign_keys_data:
                if isinstance(fk_data, dict):
                    fk = ForeignKey(
                        table_name=table_name,
                        column_name=fk_data.get("column_name", ""),
                        referenced_table=fk_data.get("referenced_table", ""),
                        referenced_column=fk_data.get("referenced_column", ""),
                        constraint_name=fk_data.get("constraint_name")
                    )
                    table_schema.foreign_keys.append(fk)
            
            # Parse indexes
            table_schema.indexes = table_data.get("indexes", [])
            
            # Store table description
            table_schema.description = table_data.get("description")
            
            self.schema[table_name] = table_schema
    
    def get_table(self, table_name: str) -> Optional[TableSchema]:
        """
        Get schema for a specific table.
        
        Args:
            table_name: Name of the table
            
        Returns:
            TableSchema if found, None otherwise
        """
        return self.schema.get(table_name)
    
    def get_column(self, table_name: str, column_name: str) -> Optional[ColumnDefinition]:
        """
        Get column definition for a specific table and column.
        
        Args:
            table_name: Name of the table
            column_name: Name of the column
            
        Returns:
            ColumnDefinition if found, None otherwise
        """
        table = self.get_table(table_name)
        if table:
            return table.columns.get(column_name)
        return None
    
    def get_foreign_keys(self, table_name: str) -> List[ForeignKey]:
        """
        Get foreign keys for a specific table.
        
        Args:
            table_name: Name of the table
            
        Returns:
            List of ForeignKey objects
        """
        table = self.get_table(table_name)
        if table:
            return table.foreign_keys
        return []
    
    def get_referencing_tables(self, table_name: str) -> List[Tuple[str, str]]:
        """
        Get tables that reference the specified table via foreign keys.
        
        Args:
            table_name: Name of the referenced table
            
        Returns:
            List of (referencing_table, column_name) tuples
        """
        referencing_tables = []
        
        for ref_table_name, ref_table_schema in self.schema.items():
            for fk in ref_table_schema.foreign_keys:
                if fk.referenced_table == table_name:
                    referencing_tables.append((ref_table_name, fk.column_name))
        
        return referencing_tables
    
    def validate_data(self, table_name: str, data: pd.DataFrame) -> SchemaValidationResult:
        """
        Validate data against schema before insert.
        
        Args:
            table_name: Name of the table
            data: DataFrame containing data to validate
            
        Returns:
            SchemaValidationResult with validation results
        """
        result = SchemaValidationResult(is_valid=True)
        
        # Get table schema
        table = self.get_table(table_name)
        if not table:
            result.is_valid = False
            result.errors.append(f"Table '{table_name}' not found in schema")
            return result
        
        # Check if DataFrame is empty
        if data.empty:
            result.warnings.append("DataFrame is empty")
            return result
        
        # Validate each row
        for idx, row in data.iterrows():
            row_valid = self._validate_row(table, row, idx)
            if not row_valid:
                result.invalid_rows += 1
            else:
                result.validated_rows += 1
        
        # Update overall validity
        if result.invalid_rows > 0:
            result.is_valid = False
            result.errors.append(f"{result.invalid_rows} rows failed validation")
        
        return result
    
    def _validate_row(self, table: TableSchema, row: pd.Series, row_index: int) -> bool:
        """
        Validate a single row against table schema.
        
        Args:
            table: TableSchema
            row: Row data as Series
            row_index: Row index for error reporting
            
        Returns:
            True if row is valid, False otherwise
        """
        is_valid = True
        
        # Check required columns (non-nullable columns without defaults)
        for col_name, col_def in table.columns.items():
            if not col_def.nullable and col_def.default_value is None:
                if col_name not in row or pd.isna(row[col_name]):
                    logger.error(f"Row {row_index}: Required column '{col_name}' is missing or null")
                    is_valid = False
        
        # Check data types (simplified validation)
        for col_name, value in row.items():
            if pd.isna(value):
                continue  # Null values are handled by nullable check
            
            col_def = table.columns.get(col_name)
            if col_def:
                # Basic type checking
                if not self._check_data_type(value, col_def.data_type):
                    logger.warning(
                        f"Row {row_index}: Column '{col_name}' value '{value}' "
                        f"may not match expected type '{col_def.data_type}'"
                    )
                    # Don't fail validation for type warnings
        
        return is_valid
    
    def _check_data_type(self, value: Any, expected_type: str) -> bool:
        """
        Check if value matches expected data type.
        
        Args:
            value: Value to check
            expected_type: Expected data type string
            
        Returns:
            True if value matches type, False otherwise
        """
        # Simplified type checking
        type_lower = expected_type.lower()
        
        if "int" in type_lower:
            return isinstance(value, (int, float)) and not isinstance(value, bool)
        elif "float" in type_lower or "decimal" in type_lower or "numeric" in type_lower:
            return isinstance(value, (int, float))
        elif "bool" in type_lower or "boolean" in type_lower:
            return isinstance(value, bool)
        elif "date" in type_lower or "time" in type_lower:
            # Check if it's a date-like object
            return isinstance(value, (str, pd.Timestamp, datetime))
        elif "text" in type_lower or "varchar" in type_lower or "string" in type_lower:
            return isinstance(value, str)
        else:
            # Unknown type, assume valid
            return True
    
    def get_required_columns(self, table_name: str) -> List[str]:
        """
        Get list of required (non-nullable) columns for a table.
        
        Args:
            table_name: Name of the table
            
        Returns:
            List of required column names
        """
        table = self.get_table(table_name)
        if not table:
            return []
        
        required_columns = []
        for col_name, col_def in table.columns.items():
            if not col_def.nullable and col_def.default_value is None:
                required_columns.append(col_name)
        
        return required_columns
    
    def get_column_names(self, table_name: str) -> List[str]:
        """
        Get all column names for a table.
        
        Args:
            table_name: Name of the table
            
        Returns:
            List of column names
        """
        table = self.get_table(table_name)
        if not table:
            return []
        
        return list(table.columns.keys())
    
    def get_table_names(self) -> List[str]:
        """
        Get all table names in the schema.
        
        Returns:
            List of table names
        """
        return list(self.schema.keys())
    
    def export_schema(self, output_file: str) -> bool:
        """
        Export schema to JSON file.
        
        Args:
            output_file: Path to output JSON file
            
        Returns:
            True if export successful, False otherwise
        """
        try:
            schema_data = {
                "timestamp": datetime.now().isoformat(),
                "tables": {}
            }
            
            for table_name, table_schema in self.schema.items():
                table_data = {
                    "table_name": table_schema.table_name,
                    "columns": [],
                    "primary_keys": table_schema.primary_keys,
                    "foreign_keys": [],
                    "indexes": table_schema.indexes,
                    "description": table_schema.description
                }
                
                # Export columns
                for col_name, col_def in table_schema.columns.items():
                    col_data = {
                        "name": col_def.name,
                        "data_type": col_def.data_type,
                        "nullable": col_def.nullable,
                        "default_value": col_def.default_value,
                        "constraints": col_def.constraints,
                        "description": col_def.description
                    }
                    table_data["columns"].append(col_data)
                
                # Export foreign keys
                for fk in table_schema.foreign_keys:
                    fk_data = {
                        "column_name": fk.column_name,
                        "referenced_table": fk.referenced_table,
                        "referenced_column": fk.referenced_column,
                        "constraint_name": fk.constraint_name
                    }
                    table_data["foreign_keys"].append(fk_data)
                
                schema_data["tables"][table_name] = table_data
            
            # Write to file
            output_path = Path(output_file)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(schema_data, f, indent=2, default=str)
            
            logger.info(f"Schema exported to {output_file}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to export schema: {str(e)}")
            return False
    
    def __str__(self) -> str:
        """String representation of schema"""
        table_count = len(self.schema)
        column_count = sum(len(table.columns) for table in self.schema.values())
        return f"SchemaManager with {table_count} tables and {column_count} columns"


# Factory function for easy creation
def create_schema_manager(schema_file: Optional[str] = None) -> SchemaManager:
    """
    Factory function to create schema manager.
    
    Args:
        schema_file: Path to schema JSON file
        
    Returns:
        SchemaManager instance
    """
    return SchemaManager(schema_file)