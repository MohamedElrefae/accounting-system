"""
Excel Processor for Excel Data Migration

This module provides data processing capabilities:
- Clean and normalize data (trim strings, standardize nulls)
- Convert data types according to mapping
- Handle Arabic text encoding properly
- Validate required fields present
"""

import re
import logging
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, field
from datetime import datetime
import pandas as pd
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ProcessingRule:
    """Rule for processing a specific column"""
    column_name: str
    data_type: str
    nullable: bool
    default_value: Optional[Any] = None
    validation_pattern: Optional[str] = None
    trim_whitespace: bool = True
    convert_null_to: Optional[Any] = None


@dataclass
class ProcessingResult:
    """Result of data processing operation"""
    success: bool
    processed_data: Optional[pd.DataFrame] = None
    original_row_count: int = 0
    processed_row_count: int = 0
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    validation_report: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ValidationError:
    """Validation error details"""
    row_index: int
    column_name: str
    error_type: str
    error_message: str
    original_value: Any


class ExcelProcessor:
    """
    Enhanced Excel processor for data cleaning and normalization.
    
    This class processes Excel data by:
    1. Cleaning and normalizing data (trim strings, standardize nulls)
    2. Converting data types according to mapping
    3. Handling Arabic text encoding properly
    4. Validating required fields present
    """
    
    def __init__(self, column_mappings: Optional[Dict[str, Any]] = None):
        """
        Initialize Excel processor.
        
        Args:
            column_mappings: Dictionary of column mappings (from ExcelReader)
        """
        self.column_mappings = column_mappings or {}
        self.processing_rules: Dict[str, ProcessingRule] = {}
        self._initialize_processing_rules()
    
    def _initialize_processing_rules(self):
        """Initialize processing rules from column mappings"""
        for mapping in self.column_mappings.values():
            # Extract mapping attributes
            english_name = getattr(mapping, 'english_name', '')
            data_type = getattr(mapping, 'data_type', 'string')
            required = getattr(mapping, 'required', False)
            
            if not english_name:
                continue
            
            # Determine default value based on data type
            default_value = None
            if data_type.lower() in ['int', 'integer', 'bigint']:
                default_value = 0 if not required else None
            elif data_type.lower() in ['float', 'decimal', 'numeric']:
                default_value = 0.0 if not required else None
            elif data_type.lower() in ['bool', 'boolean']:
                default_value = False if not required else None
            elif data_type.lower() in ['date', 'timestamp']:
                default_value = None
            else:  # string types
                default_value = '' if not required else None
            
            # Create processing rule
            rule = ProcessingRule(
                column_name=english_name,
                data_type=data_type,
                nullable=not required,
                default_value=default_value,
                trim_whitespace=True,
                convert_null_to=default_value
            )
            
            # Add validation patterns for specific data types
            if data_type.lower() in ['date', 'timestamp']:
                rule.validation_pattern = r'^\d{4}-\d{2}-\d{2}'
            
            self.processing_rules[english_name] = rule
        
        logger.info(f"Initialized {len(self.processing_rules)} processing rules")
    
    def process_data(self, data: pd.DataFrame) -> ProcessingResult:
        """
        Process Excel data with cleaning, normalization, and validation.
        
        Args:
            data: DataFrame with English column names
            
        Returns:
            ProcessingResult with processed data and validation report
        """
        result = ProcessingResult(
            success=False,
            original_row_count=len(data)
        )
        
        try:
            if data.empty:
                result.errors.append("Input data is empty")
                return result
            
            logger.info(f"Processing {len(data)} rows with {len(data.columns)} columns")
            
            # Step 1: Create a copy to avoid modifying original data
            processed_data = data.copy()
            
            # Step 2: Clean and normalize data
            cleaning_result = self._clean_and_normalize(processed_data)
            processed_data = cleaning_result["data"]
            result.warnings.extend(cleaning_result["warnings"])
            
            # Step 3: Convert data types
            conversion_result = self._convert_data_types(processed_data)
            processed_data = conversion_result["data"]
            result.errors.extend(conversion_result["errors"])
            result.warnings.extend(conversion_result["warnings"])
            
            # Step 4: Handle Arabic text encoding
            arabic_result = self._handle_arabic_text(processed_data)
            processed_data = arabic_result["data"]
            result.warnings.extend(arabic_result["warnings"])
            
            # Step 5: Validate required fields
            validation_result = self._validate_required_fields(processed_data)
            result.errors.extend(validation_result["errors"])
            result.warnings.extend(validation_result["warnings"])
            
            # Step 6: Create validation report
            result.validation_report = self._create_validation_report(
                processed_data, 
                cleaning_result, 
                conversion_result, 
                arabic_result, 
                validation_result
            )
            
            # Update result
            result.success = len(result.errors) == 0
            result.processed_data = processed_data
            result.processed_row_count = len(processed_data)
            
            if result.success:
                logger.info(f"Successfully processed {len(processed_data)} rows")
            else:
                logger.warning(f"Processing completed with {len(result.errors)} errors")
            
        except Exception as e:
            logger.error(f"Failed to process data: {str(e)}")
            result.errors.append(f"Processing error: {str(e)}")
        
        return result
    
    def _clean_and_normalize(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Clean and normalize data.
        
        Args:
            data: DataFrame to clean
            
        Returns:
            Dictionary with cleaned data and warnings
        """
        result = {
            "data": data,
            "warnings": []
        }
        
        try:
            for column in data.columns:
                if column not in self.processing_rules:
                    continue
                
                rule = self.processing_rules[column]
                
                # Skip if column doesn't exist in data
                if column not in data.columns:
                    result["warnings"].append(f"Column '{column}' not found in data")
                    continue
                
                # Create a copy of the column
                cleaned_series = data[column].copy()
                
                # Convert to string for cleaning (except for numeric types)
                if rule.data_type.lower() not in ['int', 'integer', 'bigint', 'float', 'decimal', 'numeric']:
                    cleaned_series = cleaned_series.astype(str)
                
                # Trim whitespace
                if rule.trim_whitespace:
                    cleaned_series = cleaned_series.str.strip()
                
                # Standardize null values
                if rule.convert_null_to is not None:
                    # Convert various null representations to standard null
                    null_patterns = ['nan', 'null', 'none', 'nil', 'na', '']
                    mask = cleaned_series.str.lower().isin(null_patterns) if cleaned_series.dtype == 'object' else False
                    cleaned_series = cleaned_series.where(~mask, rule.convert_null_to)
                
                # Update the column
                data[column] = cleaned_series
                
                # Log cleaning statistics
                null_count = cleaned_series.isna().sum()
                if null_count > 0:
                    result["warnings"].append(f"Column '{column}' has {null_count} null values after cleaning")
            
        except Exception as e:
            logger.error(f"Error during cleaning: {str(e)}")
            result["warnings"].append(f"Cleaning error for column '{column}': {str(e)}")
        
        return result
    
    def _convert_data_types(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Convert data types according to mapping rules.
        
        Args:
            data: DataFrame to convert
            
        Returns:
            Dictionary with converted data and warnings/errors
        """
        result = {
            "data": data,
            "errors": [],
            "warnings": []
        }
        
        try:
            for column in data.columns:
                if column not in self.processing_rules:
                    continue
                
                rule = self.processing_rules[column]
                
                # Skip if column doesn't exist in data
                if column not in data.columns:
                    result["warnings"].append(f"Column '{column}' not found in data for type conversion")
                    continue
                
                # Get the series
                series = data[column]
                
                try:
                    # Convert based on data type
                    data_type_lower = rule.data_type.lower()
                    
                    if data_type_lower in ['int', 'integer', 'bigint']:
                        # Convert to integer
                        data[column] = pd.to_numeric(series, errors='coerce').astype('Int64')
                        
                    elif data_type_lower in ['float', 'decimal', 'numeric']:
                        # Convert to float
                        data[column] = pd.to_numeric(series, errors='coerce')
                        
                    elif data_type_lower in ['bool', 'boolean']:
                        # Convert to boolean
                        # Handle various boolean representations
                        bool_map = {
                            'true': True, 'false': False,
                            'yes': True, 'no': False,
                            '1': True, '0': False,
                            't': True, 'f': False,
                            'y': True, 'n': False
                        }
                        
                        def convert_to_bool(val):
                            if pd.isna(val):
                                return pd.NA
                            val_str = str(val).lower().strip()
                            return bool_map.get(val_str, bool(val))
                        
                        data[column] = series.apply(convert_to_bool).astype('boolean')
                        
                    elif data_type_lower in ['date', 'timestamp']:
                        # Convert to datetime
                        data[column] = pd.to_datetime(series, errors='coerce', format='mixed')
                        
                    else:  # string types
                        # Ensure string type
                        data[column] = series.astype(str)
                    
                    # Log conversion statistics
                    null_count = data[column].isna().sum()
                    if null_count > 0:
                        result["warnings"].append(
                            f"Column '{column}' type conversion resulted in {null_count} null values"
                        )
                    
                except Exception as e:
                    error_msg = f"Failed to convert column '{column}' to {rule.data_type}: {str(e)}"
                    result["errors"].append(error_msg)
                    logger.error(error_msg)
            
        except Exception as e:
            logger.error(f"Error during type conversion: {str(e)}")
            result["errors"].append(f"Type conversion error: {str(e)}")
        
        return result
    
    def _handle_arabic_text(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Handle Arabic text encoding properly.
        
        Args:
            data: DataFrame with potential Arabic text
            
        Returns:
            Dictionary with processed data and warnings
        """
        result = {
            "data": data,
            "warnings": []
        }
        
        try:
            # Identify columns that might contain Arabic text
            # Based on column names from the original mapping
            arabic_columns = []
            for mapping in self.column_mappings.values():
                english_name = getattr(mapping, 'english_name', '')
                if english_name and english_name in data.columns:
                    # Check if this is a text column (not numeric/date)
                    if english_name in self.processing_rules:
                        rule = self.processing_rules[english_name]
                        if rule.data_type.lower() in ['string', 'text', 'varchar']:
                            arabic_columns.append(english_name)
            
            if not arabic_columns:
                return result
            
            logger.info(f"Processing Arabic text in columns: {', '.join(arabic_columns)}")
            
            for column in arabic_columns:
                # Ensure proper encoding
                series = data[column]
                
                # Convert to string and ensure proper encoding
                def ensure_arabic_encoding(val):
                    if pd.isna(val):
                        return val
                    
                    val_str = str(val)
                    
                    # Check if string contains Arabic characters
                    # Arabic Unicode range: U+0600 to U+06FF
                    arabic_pattern = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]')
                    
                    if arabic_pattern.search(val_str):
                        # Ensure proper handling of Arabic text
                        # Remove any problematic characters
                        cleaned = val_str.encode('utf-8', errors='ignore').decode('utf-8')
                        return cleaned
                    else:
                        return val_str
                
                data[column] = series.apply(ensure_arabic_encoding)
                
                # Log Arabic text statistics
                arabic_count = 0
                for val in data[column]:
                    if pd.notna(val) and isinstance(val, str):
                        arabic_pattern = re.compile(r'[\u0600-\u06FF]')
                        if arabic_pattern.search(val):
                            arabic_count += 1
                
                if arabic_count > 0:
                    result["warnings"].append(
                        f"Column '{column}' contains Arabic text in {arabic_count} rows"
                    )
            
        except Exception as e:
            logger.error(f"Error during Arabic text processing: {str(e)}")
            result["warnings"].append(f"Arabic text processing error: {str(e)}")
        
        return result
    
    def _validate_required_fields(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Validate that all required fields are present and valid.
        
        Args:
            data: DataFrame to validate
            
        Returns:
            Dictionary with validation results
        """
        result = {
            "errors": [],
            "warnings": []
        }
        
        try:
            validation_errors = []
            
            for column in data.columns:
                if column not in self.processing_rules:
                    continue
                
                rule = self.processing_rules[column]
                
                # Skip if column doesn't exist in data
                if column not in data.columns:
                    if not rule.nullable:
                        result["errors"].append(f"Required column '{column}' not found in data")
                    continue
                
                # Check for null values in non-nullable columns
                if not rule.nullable:
                    null_mask = data[column].isna()
                    null_count = null_mask.sum()
                    
                    if null_count > 0:
                        # Get row indices with null values
                        null_indices = data[null_mask].index.tolist()
                        error_msg = f"Column '{column}' has {null_count} null values (required field)"
                        result["errors"].append(error_msg)
                        
                        # Add detailed validation errors
                        for idx in null_indices[:10]:  # Limit to first 10 for brevity
                            validation_errors.append(ValidationError(
                                row_index=idx,
                                column_name=column,
                                error_type="NULL_VALUE",
                                error_message="Required field is null",
                                original_value=None
                            ))
                        
                        if null_count > 10:
                            result["warnings"].append(
                                f"Column '{column}' has {null_count - 10} additional null values not shown"
                            )
                
                # Validate against pattern if specified
                if rule.validation_pattern:
                    pattern = re.compile(rule.validation_pattern)
                    
                    def validate_pattern(val):
                        if pd.isna(val):
                            return True  # Null values handled above
                        return bool(pattern.match(str(val)))
                    
                    invalid_mask = ~data[column].apply(validate_pattern)
                    invalid_count = invalid_mask.sum()
                    
                    if invalid_count > 0:
                        # Get row indices with invalid values
                        invalid_indices = data[invalid_mask].index.tolist()
                        warning_msg = f"Column '{column}' has {invalid_count} values that don't match pattern '{rule.validation_pattern}'"
                        result["warnings"].append(warning_msg)
                        
                        # Add detailed validation errors
                        for idx in invalid_indices[:10]:  # Limit to first 10 for brevity
                            original_val = data.loc[idx, column]
                            validation_errors.append(ValidationError(
                                row_index=idx,
                                column_name=column,
                                error_type="PATTERN_MISMATCH",
                                error_message=f"Value doesn't match pattern '{rule.validation_pattern}'",
                                original_value=original_val
                            ))
            
            # Store detailed validation errors
            result["validation_errors"] = validation_errors
            
        except Exception as e:
            logger.error(f"Error during validation: {str(e)}")
            result["errors"].append(f"Validation error: {str(e)}")
        
        return result
    
    def _create_validation_report(self, data: pd.DataFrame, 
                                 cleaning_result: Dict[str, Any],
                                 conversion_result: Dict[str, Any],
                                 arabic_result: Dict[str, Any],
                                 validation_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create comprehensive validation report.
        
        Args:
            data: Processed DataFrame
            cleaning_result: Cleaning results
            conversion_result: Type conversion results
            arabic_result: Arabic text processing results
            validation_result: Validation results
            
        Returns:
            Comprehensive validation report
        """
        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_rows": len(data),
                "total_columns": len(data.columns),
                "cleaning_warnings": len(cleaning_result.get("warnings", [])),
                "conversion_errors": len(conversion_result.get("errors", [])),
                "conversion_warnings": len(conversion_result.get("warnings", [])),
                "arabic_warnings": len(arabic_result.get("warnings", [])),
                "validation_errors": len(validation_result.get("errors", [])),
                "validation_warnings": len(validation_result.get("warnings", []))
            },
            "column_statistics": {},
            "detailed_errors": validation_result.get("validation_errors", []),
            "warnings": {
                "cleaning": cleaning_result.get("warnings", []),
                "conversion": conversion_result.get("warnings", []),
                "arabic": arabic_result.get("warnings", []),
                "validation": validation_result.get("warnings", [])
            },
            "errors": {
                "conversion": conversion_result.get("errors", []),
                "validation": validation_result.get("errors", [])
            }
        }
        
        # Add column statistics
        for column in data.columns:
            col_stats = {
                "data_type": str(data[column].dtype),
                "non_null_count": data[column].count(),
                "null_count": data[column].isna().sum(),
                "unique_count": data[column].nunique()
            }
            
            # Add sample values
            sample_values = data[column].dropna().head(5).tolist()
            col_stats["sample_values"] = sample_values
            
            report["column_statistics"][column] = col_stats
        
        return report
    
    def export_validation_report(self, report: Dict[str, Any], output_path: str) -> bool:
        """
        Export validation report to JSON file.
        
        Args:
            report: Validation report dictionary
            output_path: Path to output JSON file
            
        Returns:
            True if export successful, False otherwise
        """
        try:
            import json
            from pathlib import Path
            
            output_path_obj = Path(output_path)
            output_path_obj.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path_obj, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, default=str, ensure_ascii=False)
            
            logger.info(f"Validation report exported to {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to export validation report: {str(e)}")
            return False
    
    def get_processing_rules(self) -> Dict[str, ProcessingRule]:
        """
        Get all processing rules.
        
        Returns:
            Dictionary of processing rules
        """
        return self.processing_rules
    
    def get_rule_for_column(self, column_name: str) -> Optional[ProcessingRule]:
        """
        Get processing rule for a specific column.
        
        Args:
            column_name: Column name
            
        Returns:
            ProcessingRule if found, None otherwise
        """
        return self.processing_rules.get(column_name)
    
    def __str__(self) -> str:
        """String representation of Excel processor"""
        return f"ExcelProcessor(rules={len(self.processing_rules)})"


# Factory function for easy creation
def create_excel_processor(column_mappings: Optional[Dict[str, Any]] = None) -> ExcelProcessor:
    """
    Factory function to create Excel processor.
    
    Args:
        column_mappings: Dictionary of column mappings
        
    Returns:
        ExcelProcessor instance
    """
    return ExcelProcessor(column_mappings)