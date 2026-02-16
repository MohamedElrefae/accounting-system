"""
Analyzer module for Excel Data Migration

This module provides analysis capabilities for Supabase schema and Excel structure.
"""

from .supabase_connection import (
    SupabaseConnectionManager,
    ConnectionConfig,
    SchemaCache,
    create_supabase_connection
)

from .schema_manager import (
    SchemaManager,
    TableSchema,
    ColumnDefinition,
    ForeignKey,
    SchemaValidationResult,
    create_schema_manager
)

from .excel_reader import (
    ExcelReader,
    ColumnMapping,
    ExcelStructure,
    ReadResult,
    create_excel_reader
)

from .excel_processor import (
    ExcelProcessor,
    ProcessingRule,
    ProcessingResult,
    ValidationError,
    create_excel_processor
)

from .data_validator import (
    DataValidator,
    ValidationRule,
    ValidationResult,
    ValidationError as DataValidationError,
    ValidationWarning,
    create_data_validator
)

__all__ = [
    # Supabase Connection
    "SupabaseConnectionManager",
    "ConnectionConfig",
    "SchemaCache",
    "create_supabase_connection",
    
    # Schema Management
    "SchemaManager",
    "TableSchema",
    "ColumnDefinition",
    "ForeignKey",
    "SchemaValidationResult",
    "create_schema_manager",
    
    # Excel Reading
    "ExcelReader",
    "ColumnMapping",
    "ExcelStructure",
    "ReadResult",
    "create_excel_reader",
    
    # Excel Processing
    "ExcelProcessor",
    "ProcessingRule",
    "ProcessingResult",
    "ValidationError",
    "create_excel_processor",
    
    # Data Validation
    "DataValidator",
    "ValidationRule",
    "ValidationResult",
    "DataValidationError",
    "ValidationWarning",
    "create_data_validator"
]