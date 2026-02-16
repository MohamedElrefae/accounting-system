#!/usr/bin/env python3
"""
ExcelProcessor: Data cleaning, normalization, and type conversion.
Requirements: 2.2, 2.3, 2.4, 2.5
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    import pandas as pd
    import numpy as np
except ImportError:
    logger.error("Missing pandas or numpy. Install with: pip install pandas numpy")
    exit(1)


@dataclass
class ProcessingRule:
    """Defines a processing rule for a column."""
    column_name: str
    data_type: str
    required: bool = False
    trim: bool = True
    standardize_null: bool = True
    date_format: Optional[str] = None
    numeric_range: Optional[Tuple[float, float]] = None


@dataclass
class ProcessingResult:
    """Result of processing a single record."""
    record_index: int
    original_data: Dict[str, Any]
    processed_data: Dict[str, Any]
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    is_valid: bool = True


@dataclass
class ValidationError:
    """Represents a validation error."""
    record_index: int
    column_name: str
    error_type: str
    error_message: str
    original_value: Any


class ExcelProcessor:
    """
    Processes Excel data with cleaning, normalization, and type conversion.
    """
    
    def __init__(self, column_mappings: Optional[Dict[str, Any]] = None):
        """Initialize ExcelProcessor."""
        self.column_mappings = column_mappings or {}
        self.processing_rules: Dict[str, ProcessingRule] = {}
        self.processed_data: List[ProcessingResult] = []
        self.validation_errors: List[ValidationError] = []
        self.processing_stats = {
            'total_records': 0,
            'successful_records': 0,
            'failed_records': 0,
            'warnings_count': 0,
            'errors_count': 0
        }
    
    def add_processing_rule(self, rule: ProcessingRule) -> None:
        """Add a processing rule for a column."""
        self.processing_rules[rule.column_name] = rule
    
    def add_processing_rules(self, rules: List[ProcessingRule]) -> None:
        """Add multiple processing rules."""
        for rule in rules:
            self.add_processing_rule(rule)
    
    def _trim_string(self, value: Any) -> Any:
        """Trim whitespace from string values."""
        if isinstance(value, str):
            return value.strip()
        return value
    
    def _standardize_null(self, value: Any) -> Any:
        """Standardize null values to None."""
        if pd.isna(value):
            return None
        if isinstance(value, str):
            if value.strip().lower() in ['', 'null', 'none', 'n/a', 'na', '-']:
                return None
        return value
    
    def _handle_arabic_text(self, value: Any) -> Any:
        """Handle Arabic text encoding properly."""
        if not isinstance(value, str):
            return value
        try:
            if isinstance(value, bytes):
                return value.decode('utf-8')
            return value
        except (UnicodeDecodeError, AttributeError):
            logger.warning(f"Failed to handle Arabic text: {value}")
            return value
    
    def _convert_to_integer(self, value: Any, column_name: str, record_index: int) -> Tuple[Optional[int], Optional[ValidationError]]:
        """Convert value to integer."""
        if value is None:
            return None, None
        
        try:
            if isinstance(value, str):
                value = value.strip()
                if not value:
                    return None, None
                return int(float(value)), None
            elif isinstance(value, (int, float)):
                return int(value), None
            else:
                error = ValidationError(
                    record_index=record_index,
                    column_name=column_name,
                    error_type='type_conversion',
                    error_message=f"Cannot convert {type(value).__name__} to integer",
                    original_value=value
                )
                return None, error
        except (ValueError, TypeError) as e:
            error = ValidationError(
                record_index=record_index,
                column_name=column_name,
                error_type='type_conversion',
                error_message=f"Integer conversion failed: {str(e)}",
                original_value=value
            )
            return None, error
    
    def _convert_to_float(self, value: Any, column_name: str, record_index: int) -> Tuple[Optional[float], Optional[ValidationError]]:
        """Convert value to float."""
        if value is None:
            return None, None
        
        try:
            if isinstance(value, str):
                value = value.strip()
                if not value:
                    return None, None
                return float(value), None
            elif isinstance(value, (int, float)):
                return float(value), None
            else:
                error = ValidationError(
                    record_index=record_index,
                    column_name=column_name,
                    error_type='type_conversion',
                    error_message=f"Cannot convert {type(value).__name__} to float",
                    original_value=value
                )
                return None, error
        except (ValueError, TypeError) as e:
            error = ValidationError(
                record_index=record_index,
                column_name=column_name,
                error_type='type_conversion',
                error_message=f"Float conversion failed: {str(e)}",
                original_value=value
            )
            return None, error
    
    def _convert_to_date(self, value: Any, column_name: str, record_index: int) -> Tuple[Optional[str], Optional[ValidationError]]:
        """Convert value to date string (ISO format)."""
        if value is None:
            return None, None
        
        try:
            parsed_date = pd.to_datetime(value)
            return parsed_date.strftime('%Y-%m-%d'), None
        except Exception as e:
            error = ValidationError(
                record_index=record_index,
                column_name=column_name,
                error_type='format_validation',
                error_message=f"Date conversion failed: {str(e)}",
                original_value=value
            )
            return None, error
    
    def _validate_range(self, value: Any, column_name: str, record_index: int, numeric_range: Tuple[float, float]) -> Optional[ValidationError]:
        """Validate numeric value is within range."""
        if value is None:
            return None
        
        try:
            num_value = float(value)
            min_val, max_val = numeric_range
            if num_value < min_val or num_value > max_val:
                return ValidationError(
                    record_index=record_index,
                    column_name=column_name,
                    error_type='range_validation',
                    error_message=f"Value {num_value} outside range [{min_val}, {max_val}]",
                    original_value=value
                )
        except (ValueError, TypeError):
            pass
        return None
    
    def _validate_required_field(self, value: Any, column_name: str, record_index: int) -> Optional[ValidationError]:
        """Validate required field is not null."""
        if value is None or (isinstance(value, str) and not value.strip()):
            return ValidationError(
                record_index=record_index,
                column_name=column_name,
                error_type='required_field',
                error_message=f"Required field '{column_name}' is empty",
                original_value=value
            )
        return None
    
    def process_record(self, record: Dict[str, Any], record_index: int) -> ProcessingResult:
        """Process a single record."""
        processed = {}
        errors = []
        warnings = []
        
        for col_name, value in record.items():
            if col_name not in self.processing_rules:
                processed[col_name] = value
                continue
            
            rule = self.processing_rules[col_name]
            
            # Step 1: Standardize nulls
            if rule.standardize_null:
                value = self._standardize_null(value)
            
            # Step 2: Trim strings
            if rule.trim and isinstance(value, str):
                value = self._trim_string(value)
            
            # Step 3: Handle Arabic text
            value = self._handle_arabic_text(value)
            
            # Step 4: Validate required fields
            if rule.required:
                req_error = self._validate_required_field(value, col_name, record_index)
                if req_error:
                    errors.append(req_error.error_message)
                    self.validation_errors.append(req_error)
            
            # Step 5: Convert data types
            converted_value = value
            conversion_error = None
            
            if value is not None:
                if rule.data_type == 'integer':
                    converted_value, conversion_error = self._convert_to_integer(value, col_name, record_index)
                elif rule.data_type == 'float':
                    converted_value, conversion_error = self._convert_to_float(value, col_name, record_index)
                elif rule.data_type == 'date':
                    converted_value, conversion_error = self._convert_to_date(value, col_name, record_index)
                elif rule.data_type == 'string':
                    converted_value = str(value) if value is not None else None
            
            if conversion_error:
                errors.append(conversion_error.error_message)
                self.validation_errors.append(conversion_error)
            
            # Step 6: Validate range
            if converted_value is not None and rule.numeric_range and rule.data_type in ['integer', 'float']:
                range_error = self._validate_range(converted_value, col_name, record_index, rule.numeric_range)
                if range_error:
                    errors.append(range_error.error_message)
                    self.validation_errors.append(range_error)
            
            processed[col_name] = converted_value
        
        is_valid = len(errors) == 0
        result = ProcessingResult(
            record_index=record_index,
            original_data=record,
            processed_data=processed,
            errors=errors,
            warnings=warnings,
            is_valid=is_valid
        )
        
        return result
    
    def process_dataframe(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[ValidationError]]:
        """Process entire DataFrame."""
        logger.info(f"Processing {len(df)} records...")
        self.processing_stats['total_records'] = len(df)
        
        processed_records = []
        
        for idx, row in df.iterrows():
            record = row.to_dict()
            result = self.process_record(record, idx)
            processed_records.append(result)
            
            if result.is_valid:
                self.processing_stats['successful_records'] += 1
            else:
                self.processing_stats['failed_records'] += 1
            
            self.processing_stats['warnings_count'] += len(result.warnings)
            self.processing_stats['errors_count'] += len(result.errors)
        
        # Create processed DataFrame
        processed_data = [r.processed_data for r in processed_records]
        processed_df = pd.DataFrame(processed_data)
        
        logger.info(f"Processing complete: {self.processing_stats['successful_records']} successful, {self.processing_stats['failed_records']} failed")
        
        return processed_df, self.validation_errors
    
    def get_stats(self) -> Dict[str, Any]:
        """Get processing statistics."""
        return self.processing_stats.copy()
