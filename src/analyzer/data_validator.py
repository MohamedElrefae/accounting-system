"""
Data Validator Module

Implements comprehensive validation rules for Excel data before migration to Supabase.
Validates required fields, data types, numeric ranges, dates, account codes, and business rules.

Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class ValidationError:
    """Represents a single validation error"""
    row_number: int
    field_name: str
    error_type: str  # 'required_field', 'data_type', 'range', 'date', 'account_code', 'referential_integrity', 'business_rule'
    error_message: str
    actual_value: Any = None
    expected_value: Any = None


@dataclass
class ValidationWarning:
    """Represents a validation warning (non-blocking issue)"""
    row_number: int
    field_name: str
    warning_type: str
    warning_message: str
    actual_value: Any = None


@dataclass
class ValidationResult:
    """Result of validation run"""
    passed: bool
    total_records: int
    valid_records: int
    invalid_records: int
    errors: List[ValidationError] = field(default_factory=list)
    warnings: List[ValidationWarning] = field(default_factory=list)
    summary: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ValidationRule:
    """Defines a validation rule"""
    field_name: str
    rule_type: str  # 'required', 'data_type', 'range', 'date', 'account_code', 'referential_integrity', 'business_rule'
    required: bool = False
    data_type: Optional[str] = None  # 'int', 'float', 'str', 'date', 'uuid'
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    date_format: Optional[str] = None
    min_date: Optional[datetime] = None
    max_date: Optional[datetime] = None
    allowed_values: Optional[Set[Any]] = None
    custom_validator: Optional[callable] = None


class DataValidator:
    """
    Comprehensive data validator for Excel migration data.
    
    Validates:
    - Required fields (non-null, non-empty)
    - Data types (int, float, str, date, uuid)
    - Numeric ranges
    - Date formats and reasonableness
    - Account code existence
    - Referential integrity
    - Business rules (transaction balance, debit XOR credit per line)
    """

    def __init__(self, validation_rules: Optional[List[ValidationRule]] = None):
        """
        Initialize validator with optional custom rules.
        
        Args:
            validation_rules: List of ValidationRule objects
        """
        self.validation_rules = validation_rules or []
        self.errors: List[ValidationError] = []
        self.warnings: List[ValidationWarning] = []
        self._valid_account_codes: Optional[Set[str]] = None
        self._valid_project_codes: Optional[Set[str]] = None
        self._valid_classification_codes: Optional[Set[str]] = None
        self._valid_work_analysis_codes: Optional[Set[str]] = None
        self._valid_sub_tree_codes: Optional[Set[str]] = None

    def set_valid_account_codes(self, codes: Set[str]) -> None:
        """Set the set of valid account codes for validation"""
        self._valid_account_codes = codes

    def set_valid_project_codes(self, codes: Set[str]) -> None:
        """Set the set of valid project codes for validation"""
        self._valid_project_codes = codes

    def set_valid_classification_codes(self, codes: Set[str]) -> None:
        """Set the set of valid classification codes for validation"""
        self._valid_classification_codes = codes

    def set_valid_work_analysis_codes(self, codes: Set[str]) -> None:
        """Set the set of valid work analysis codes for validation"""
        self._valid_work_analysis_codes = codes

    def set_valid_sub_tree_codes(self, codes: Set[str]) -> None:
        """Set the set of valid sub_tree codes for validation"""
        self._valid_sub_tree_codes = codes

    def validate(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Generic validation method that detects data type and validates accordingly.

        Args:
            data: DataFrame to validate

        Returns:
            Dictionary with validation results (for CLI compatibility)
        """
        # Reset errors and warnings for fresh validation
        self.errors = []
        self.warnings = []

        if data.empty:
            result = ValidationResult(
                passed=False,
                total_records=0,
                valid_records=0,
                invalid_records=0,
                errors=[ValidationError(
                    row_number=0,
                    field_name="data",
                    error_type="EMPTY_DATA",
                    message="Input data is empty",
                    level="ERROR"
                )],
                warnings=[]
            )
            return self._result_to_dict(result)

        # Detect data type based on columns
        columns = set(data.columns)

        # Check if it's transaction lines data (has line_item_id or similar)
        if 'line_item_id' in columns or 'line_number' in columns:
            result = self.validate_transaction_lines(data)
        # Check if it's transactions data (has transaction_id)
        elif 'transaction_id' in columns or 'trans_id' in columns:
            result = self.validate_transactions(data)
        # Default to transactions validation
        else:
            result = self.validate_transactions(data)

        return self._result_to_dict(result)

    def _result_to_dict(self, result: ValidationResult) -> Dict[str, Any]:
        """Convert ValidationResult to dictionary format for CLI compatibility"""
        return {
            'passed': result.passed,
            'total_records': result.total_records,
            'valid_records': result.valid_records,
            'invalid_records': result.invalid_records,
            'errors': [
                {
                    'row_number': e.row_number,
                    'field_name': e.field_name,
                    'error_type': e.error_type,
                    'message': e.error_message,
                    'level': 'ERROR'
                }
                for e in result.errors
            ],
            'warnings': [
                {
                    'row_number': w.row_number,
                    'field_name': w.field_name,
                    'warning_type': w.warning_type,
                    'message': w.warning_message
                }
                for w in result.warnings
            ],
            'summary': result.summary
        }


    def validate_transactions(self, data: pd.DataFrame) -> ValidationResult:
        """
        Validate transaction-level data.
        
        Validates:
        - Required fields: entry_no, entry_date
        - Data types
        - Date reasonableness
        
        Args:
            data: DataFrame with transaction data
            
        Returns:
            ValidationResult with errors and warnings
        """
        self.errors = []
        self.warnings = []
        
        required_fields = ['entry_no', 'entry_date']
        
        for idx, row in data.iterrows():
            row_num = idx + 1
            
            # Skip completely empty rows
            if all(pd.isna(row[field]) or (isinstance(row[field], str) and row[field].strip() == '') for field in data.columns):
                continue
            
            # Validate required fields
            for field in required_fields:
                if field not in data.columns:
                    self.errors.append(ValidationError(
                        row_number=row_num,
                        field_name=field,
                        error_type='required_field',
                        error_message=f"Required field '{field}' not found in data"
                    ))
                    continue
                
                if pd.isna(row[field]) or (isinstance(row[field], str) and row[field].strip() == ''):
                    self.errors.append(ValidationError(
                        row_number=row_num,
                        field_name=field,
                        error_type='required_field',
                        error_message=f"Required field '{field}' is null or empty",
                        actual_value=row[field]
                    ))
            
            # Validate entry_date is valid date
            if 'entry_date' in data.columns and not pd.isna(row['entry_date']):
                try:
                    if isinstance(row['entry_date'], str):
                        date_obj = pd.to_datetime(row['entry_date'])
                    else:
                        date_obj = pd.to_datetime(row['entry_date'])
                    
                    # Check if date is reasonable (between 1900 and 2100)
                    if date_obj.year < 1900 or date_obj.year > 2100:
                        self.errors.append(ValidationError(
                            row_number=row_num,
                            field_name='entry_date',
                            error_type='date',
                            error_message=f"Date {date_obj} is outside reasonable range",
                            actual_value=row['entry_date']
                        ))
                except (ValueError, TypeError, pd.errors.ParserError):
                    self.errors.append(ValidationError(
                        row_number=row_num,
                        field_name='entry_date',
                        error_type='date',
                        error_message=f"Invalid date format: {row['entry_date']}",
                        actual_value=row['entry_date']
                    ))
        
        return self._create_validation_result(data)

    def validate_transaction_lines(self, data: pd.DataFrame) -> ValidationResult:
        """
        Validate transaction line-level data.
        
        Validates:
        - Required fields: account_code, debit, credit, entry_no
        - Data types
        - Numeric ranges
        - Account code existence
        - Business rules: debit XOR credit (not both, not neither)
        
        Args:
            data: DataFrame with transaction line data
            
        Returns:
            ValidationResult with errors and warnings
        """
        self.errors = []
        self.warnings = []
        
        required_fields = ['account_code', 'debit', 'credit', 'entry_no']
        
        for idx, row in data.iterrows():
            row_num = idx + 1
            
            # Validate required fields
            for field in required_fields:
                if field not in data.columns:
                    self.errors.append(ValidationError(
                        row_number=row_num,
                        field_name=field,
                        error_type='required_field',
                        error_message=f"Required field '{field}' not found in data"
                    ))
                    continue
                
                if pd.isna(row[field]) or (isinstance(row[field], str) and row[field].strip() == ''):
                    self.errors.append(ValidationError(
                        row_number=row_num,
                        field_name=field,
                        error_type='required_field',
                        error_message=f"Required field '{field}' is null or empty",
                        actual_value=row[field]
                    ))
            
            # Validate account_code exists
            if 'account_code' in data.columns and not pd.isna(row['account_code']):
                account_code = str(row['account_code']).strip()
                if self._valid_account_codes and account_code not in self._valid_account_codes:
                    self.errors.append(ValidationError(
                        row_number=row_num,
                        field_name='account_code',
                        error_type='account_code',
                        error_message=f"Account code '{account_code}' not found in valid codes",
                        actual_value=account_code
                    ))
            
            # Validate debit and credit are numeric
            for field in ['debit', 'credit']:
                if field in data.columns and not pd.isna(row[field]):
                    try:
                        value = float(row[field])
                        if value < 0:
                            self.errors.append(ValidationError(
                                row_number=row_num,
                                field_name=field,
                                error_type='range',
                                error_message=f"{field.capitalize()} cannot be negative: {value}",
                                actual_value=value,
                                expected_value='>= 0'
                            ))
                    except (ValueError, TypeError):
                        self.errors.append(ValidationError(
                            row_number=row_num,
                            field_name=field,
                            error_type='data_type',
                            error_message=f"{field.capitalize()} must be numeric, got {type(row[field]).__name__}",
                            actual_value=row[field],
                            expected_value='numeric'
                        ))
            
            # Validate business rule: debit XOR credit (exactly one must be non-zero)
            if 'debit' in data.columns and 'credit' in data.columns:
                try:
                    debit = float(row['debit']) if not pd.isna(row['debit']) else 0
                    credit = float(row['credit']) if not pd.isna(row['credit']) else 0
                    
                    # Both zero
                    if debit == 0 and credit == 0:
                        self.errors.append(ValidationError(
                            row_number=row_num,
                            field_name='debit/credit',
                            error_type='business_rule',
                            error_message="Transaction line must have either debit or credit (not both zero)",
                            actual_value=f"debit={debit}, credit={credit}"
                        ))
                    
                    # Both non-zero
                    if debit > 0 and credit > 0:
                        self.errors.append(ValidationError(
                            row_number=row_num,
                            field_name='debit/credit',
                            error_type='business_rule',
                            error_message="Transaction line cannot have both debit and credit",
                            actual_value=f"debit={debit}, credit={credit}"
                        ))
                except (ValueError, TypeError):
                    pass  # Already caught in numeric validation above
        
        return self._create_validation_result(data)

    def validate_account_codes(self, codes: List[str], valid_codes: Set[str]) -> ValidationResult:
        """
        Validate that all account codes exist in valid codes set.
        
        Args:
            codes: List of account codes to validate
            valid_codes: Set of valid account codes
            
        Returns:
            ValidationResult with unmapped codes
        """
        self.errors = []
        self.warnings = []
        
        unmapped_codes = []
        for code in codes:
            if code not in valid_codes:
                unmapped_codes.append(code)
                self.errors.append(ValidationError(
                    row_number=0,
                    field_name='account_code',
                    error_type='account_code',
                    error_message=f"Account code '{code}' not found in valid codes",
                    actual_value=code
                ))
        
        result = ValidationResult(
            passed=len(unmapped_codes) == 0,
            total_records=len(codes),
            valid_records=len(codes) - len(unmapped_codes),
            invalid_records=len(unmapped_codes),
            errors=self.errors,
            warnings=self.warnings
        )
        
        result.summary = {
            'unmapped_codes': unmapped_codes,
            'unmapped_count': len(unmapped_codes),
            'total_unique_codes': len(set(codes))
        }
        
        return result

    def validate_referential_integrity(self, transactions: pd.DataFrame, lines: pd.DataFrame) -> ValidationResult:
        """
        Validate referential integrity between transactions and transaction lines.
        
        Validates:
        - Each transaction line references a valid transaction (by entry_no)
        - At least one line per transaction
        
        Args:
            transactions: DataFrame with transaction headers
            lines: DataFrame with transaction lines
            
        Returns:
            ValidationResult with referential integrity errors
        """
        self.errors = []
        self.warnings = []
        
        # Get valid transaction entry_nos
        valid_entry_nos = set(transactions['entry_no'].unique()) if 'entry_no' in transactions.columns else set()
        
        # Check each line references a valid transaction
        for idx, row in lines.iterrows():
            row_num = idx + 1
            
            if 'entry_no' not in lines.columns:
                self.errors.append(ValidationError(
                    row_number=row_num,
                    field_name='entry_no',
                    error_type='referential_integrity',
                    error_message="entry_no field not found in transaction lines"
                ))
                continue
            
            entry_no = row['entry_no']
            if pd.isna(entry_no):
                self.errors.append(ValidationError(
                    row_number=row_num,
                    field_name='entry_no',
                    error_type='referential_integrity',
                    error_message="entry_no is null",
                    actual_value=entry_no
                ))
            elif entry_no not in valid_entry_nos:
                self.errors.append(ValidationError(
                    row_number=row_num,
                    field_name='entry_no',
                    error_type='referential_integrity',
                    error_message=f"entry_no '{entry_no}' does not reference a valid transaction",
                    actual_value=entry_no
                ))
        
        # Check each transaction has at least one line
        transaction_line_counts = lines.groupby('entry_no').size() if 'entry_no' in lines.columns else pd.Series()
        for entry_no in valid_entry_nos:
            if entry_no not in transaction_line_counts.index:
                self.warnings.append(ValidationWarning(
                    row_number=0,
                    field_name='entry_no',
                    warning_type='referential_integrity',
                    warning_message=f"Transaction {entry_no} has no associated lines",
                    actual_value=entry_no
                ))
        
        return self._create_validation_result(lines)

    def validate_dimension_codes(self, data: pd.DataFrame) -> ValidationResult:
        """
        Validate dimension codes (project, classification, work_analysis, sub_tree).
        
        Args:
            data: DataFrame with transaction line data
            
        Returns:
            ValidationResult with dimension validation errors
        """
        self.errors = []
        self.warnings = []
        
        dimension_fields = {
            'project_code': self._valid_project_codes,
            'classification_code': self._valid_classification_codes,
            'work_analysis_code': self._valid_work_analysis_codes,
            'sub_tree_code': self._valid_sub_tree_codes
        }
        
        for idx, row in data.iterrows():
            row_num = idx + 1
            
            for field, valid_codes in dimension_fields.items():
                if field not in data.columns or valid_codes is None:
                    continue
                
                if pd.isna(row[field]):
                    # Dimensions are optional, so null is OK
                    continue
                
                code = str(row[field]).strip()
                if code and code not in valid_codes:
                    self.warnings.append(ValidationWarning(
                        row_number=row_num,
                        field_name=field,
                        warning_type='dimension_code',
                        warning_message=f"Dimension code '{code}' not found in valid codes",
                        actual_value=code
                    ))
        
        return self._create_validation_result(data)

    def _create_validation_result(self, data: pd.DataFrame) -> ValidationResult:
        """Create a ValidationResult from current errors and warnings"""
        total_records = len(data)
        invalid_record_numbers = set(e.row_number for e in self.errors)
        invalid_records = len(invalid_record_numbers)
        valid_records = total_records - invalid_records
        
        return ValidationResult(
            passed=len(self.errors) == 0,
            total_records=total_records,
            valid_records=valid_records,
            invalid_records=invalid_records,
            errors=self.errors,
            warnings=self.warnings,
            summary={
                'error_count': len(self.errors),
                'warning_count': len(self.warnings),
                'error_types': self._count_error_types(),
                'warning_types': self._count_warning_types()
            }
        )

    def _count_error_types(self) -> Dict[str, int]:
        """Count errors by type"""
        counts = {}
        for error in self.errors:
            counts[error.error_type] = counts.get(error.error_type, 0) + 1
        return counts

    def _count_warning_types(self) -> Dict[str, int]:
        """Count warnings by type"""
        counts = {}
        for warning in self.warnings:
            counts[warning.warning_type] = counts.get(warning.warning_type, 0) + 1
        return counts

    def generate_validation_report(self, result: ValidationResult, output_path: str) -> bool:
        """
        Generate a validation report with row numbers and error details.
        
        Args:
            result: ValidationResult object
            output_path: Path to save the report
            
        Returns:
            True if report was generated successfully
        """
        try:
            report_lines = []
            report_lines.append("=" * 80)
            report_lines.append("DATA VALIDATION REPORT")
            report_lines.append("=" * 80)
            report_lines.append("")
            
            # Summary
            report_lines.append("SUMMARY")
            report_lines.append("-" * 80)
            report_lines.append(f"Total Records: {result.total_records}")
            report_lines.append(f"Valid Records: {result.valid_records}")
            report_lines.append(f"Invalid Records: {result.invalid_records}")
            report_lines.append(f"Validation Passed: {result.passed}")
            report_lines.append("")
            
            # Error Summary
            if result.summary.get('error_types'):
                report_lines.append("ERROR TYPES")
                report_lines.append("-" * 80)
                for error_type, count in result.summary['error_types'].items():
                    report_lines.append(f"  {error_type}: {count}")
                report_lines.append("")
            
            # Errors
            if result.errors:
                report_lines.append("ERRORS")
                report_lines.append("-" * 80)
                for error in result.errors[:100]:  # Limit to first 100 errors
                    report_lines.append(f"Row {error.row_number}: {error.field_name}")
                    report_lines.append(f"  Type: {error.error_type}")
                    report_lines.append(f"  Message: {error.error_message}")
                    if error.actual_value is not None:
                        report_lines.append(f"  Actual: {error.actual_value}")
                    if error.expected_value is not None:
                        report_lines.append(f"  Expected: {error.expected_value}")
                    report_lines.append("")
                
                if len(result.errors) > 100:
                    report_lines.append(f"... and {len(result.errors) - 100} more errors")
                    report_lines.append("")
            
            # Warnings
            if result.warnings:
                report_lines.append("WARNINGS")
                report_lines.append("-" * 80)
                for warning in result.warnings[:50]:  # Limit to first 50 warnings
                    report_lines.append(f"Row {warning.row_number}: {warning.field_name}")
                    report_lines.append(f"  Type: {warning.warning_type}")
                    report_lines.append(f"  Message: {warning.warning_message}")
                    if warning.actual_value is not None:
                        report_lines.append(f"  Value: {warning.actual_value}")
                    report_lines.append("")
                
                if len(result.warnings) > 50:
                    report_lines.append(f"... and {len(result.warnings) - 50} more warnings")
                    report_lines.append("")
            
            # Write report
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(report_lines))
            
            logger.info(f"Validation report generated: {output_path}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to generate validation report: {e}")
            return False


def create_data_validator(validation_rules: Optional[List[ValidationRule]] = None) -> DataValidator:
    """Factory function to create a DataValidator instance"""
    return DataValidator(validation_rules)
