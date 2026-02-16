"""
Unit tests for DataValidator class

Tests validation rules for:
- Required fields
- Data types
- Numeric ranges
- Date formats and reasonableness
- Account code existence
- Referential integrity
- Business rules (debit XOR credit, transaction balance)
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime
from src.analyzer.data_validator import (
    DataValidator,
    ValidationRule,
    ValidationResult,
    ValidationError,
    ValidationWarning,
    create_data_validator
)


class TestDataValidatorRequiredFields:
    """Test required field validation"""
    
    def test_validate_transactions_with_missing_required_field(self):
        """Test that missing required fields are detected"""
        validator = DataValidator()
        
        # Create DataFrame with missing fiscal_year
        data = pd.DataFrame({
            'fiscal_year': [None, 2024],
            'month': [1, 2],
            'entry_no': [1, 2],
            'entry_date': ['2024-01-01', '2024-01-02']
        })
        
        result = validator.validate_transactions(data)
        
        assert not result.passed
        assert len(result.errors) > 0
        assert any(e.error_type == 'required_field' for e in result.errors)
    
    def test_validate_transaction_lines_with_missing_account_code(self):
        """Test that missing account codes are detected"""
        validator = DataValidator()
        
        data = pd.DataFrame({
            'account_code': [None, '1001'],
            'debit': [100, 0],
            'credit': [0, 100],
            'entry_no': [1, 1]
        })
        
        result = validator.validate_transaction_lines(data)
        
        assert not result.passed
        assert any(e.field_name == 'account_code' and e.error_type == 'required_field' for e in result.errors)
    
    def test_validate_transactions_with_all_required_fields(self):
        """Test that valid transactions pass validation"""
        validator = DataValidator()
        
        data = pd.DataFrame({
            'fiscal_year': [2024, 2024],
            'month': [1, 2],
            'entry_no': [1, 2],
            'entry_date': ['2024-01-01', '2024-01-02']
        })
        
        result = validator.validate_transactions(data)
        
        # Should have no required field errors
        assert not any(e.error_type == 'required_field' for e in result.errors)


class TestDataValidatorDataTypes:
    """Test data type validation"""
    
    def test_validate_fiscal_year_data_type(self):
        """Test that non-integer fiscal years are rejected"""
        validator = DataValidator()
        
        data = pd.DataFrame({
            'fiscal_year': ['not_a_year', 2024],
            'month': [1, 2],
            'entry_no': [1, 2],
            'entry_date': ['2024-01-01', '2024-01-02']
        })
        
        result = validator.validate_transactions(data)
        
        assert any(e.error_type == 'data_type' and e.field_name == 'fiscal_year' for e in result.errors)
    
    def test_validate_debit_credit_data_type(self):
        """Test that non-numeric debit/credit are rejected"""
        validator = DataValidator()
        
        data = pd.DataFrame({
            'account_code': ['1001', '1002'],
            'debit': ['not_a_number', 100],
            'credit': [0, 'also_not_a_number'],
            'entry_no': [1, 1]
        })
        
        result = validator.validate_transaction_lines(data)
        
        assert any(e.error_type == 'data_type' for e in result.errors)


class TestDataValidatorNumericRanges:
    """Test numeric range validation"""
    
    def test_validate_month_range(self):
        """Test that invalid months are rejected"""
        validator = DataValidator()
        
        data = pd.DataFrame({
            'fiscal_year': [2024, 2024],
            'month': [13, 0],  # Invalid months
            'entry_no': [1, 2],
            'entry_date': ['2024-01-01', '2024-01-02']
        })
        
        result = validator.validate_transactions(data)
        
        assert any(e.error_type == 'range' and e.field_name == 'month' for e in result.errors)
    
    def test_validate_negative_debit_credit(self):
        """Test that negative debit/credit are rejected"""
        validator = DataValidator()
        
        data = pd.DataFrame({
            'account_code': ['1001', '1002'],
            'debit': [-100, 100],
            'credit': [0, -50],
            'entry_no': [1, 1]
        })
        
        result = validator.validate_transaction_lines(data)
        
        assert any(e.error_type == 'range' for e in result.errors)
    
    def test_validate_valid_numeric_ranges(self):
        """Test that valid numeric ranges pass"""
        validator = DataValidator()
        
        data = pd.DataFrame({
            'fiscal_year': [2024, 2024],
            'month': [1, 12],
            'entry_no': [1, 2],
            'entry_date': ['2024-01-01', '2024-12-31']
        })
        
        result = validator.validate_transactions(data)
        
        assert not any(e.error_type == 'range' for e in result.errors)


class TestDataValidatorDateValidation:
    """Test date format and reasonableness validation"""
    
    def test_validate_invalid_date_format(self):
        """Test that invalid date formats are rejected"""
        validator = DataValidator()
        
        data = pd.DataFrame({
            'fiscal_year': [2024, 2024],
            'month': [1, 2],
            'entry_no': [1, 2],
            'entry_date': ['not_a_date', '2024-01-02']
        })
        
        result = validator.validate_transactions(data)
        
        assert any(e.error_type == 'date' for e in result.errors)
    
    def test_validate_date_reasonableness(self):
        """Test that unreasonable dates are flagged"""
        validator = DataValidator()
        
        data = pd.DataFrame({
            'fiscal_year': [2024, 2024],
            'month': [1, 2],
            'entry_no': [1, 2],
            'entry_date': ['1800-01-01', '2024-01-02']  # 1800 is outside reasonable range
        })
        
        result = validator.validate_transactions(data)
        
        assert any(e.error_type == 'date' for e in result.errors)
    
    def test_validate_valid_dates(self):
        """Test that valid dates pass"""
        validator = DataValidator()
        
        data = pd.DataFrame({
            'fiscal_year': [2024, 2024],
            'month': [1, 2],
            'entry_no': [1, 2],
            'entry_date': ['2024-01-01', '2024-12-31']
        })
        
        result = validator.validate_transactions(data)
        
        assert not any(e.error_type == 'date' for e in result.errors)


class TestDataValidatorAccountCodes:
    """Test account code validation"""
    
    def test_validate_invalid_account_code(self):
        """Test that invalid account codes are detected"""
        validator = DataValidator()
        validator.set_valid_account_codes({'1001', '1002', '1003'})
        
        data = pd.DataFrame({
            'account_code': ['1001', '9999'],  # 9999 is invalid
            'debit': [100, 0],
            'credit': [0, 100],
            'entry_no': [1, 1]
        })
        
        result = validator.validate_transaction_lines(data)
        
        assert any(e.error_type == 'account_code' for e in result.errors)
    
    def test_validate_valid_account_codes(self):
        """Test that valid account codes pass"""
        validator = DataValidator()
        validator.set_valid_account_codes({'1001', '1002', '1003'})
        
        data = pd.DataFrame({
            'account_code': ['1001', '1002'],
            'debit': [100, 0],
            'credit': [0, 100],
            'entry_no': [1, 1]
        })
        
        result = validator.validate_transaction_lines(data)
        
        assert not any(e.error_type == 'account_code' for e in result.errors)
    
    def test_validate_account_codes_list(self):
        """Test account code list validation"""
        validator = DataValidator()
        
        codes = ['1001', '1002', '9999']
        valid_codes = {'1001', '1002', '1003'}
        
        result = validator.validate_account_codes(codes, valid_codes)
        
        assert not result.passed
        assert '9999' in result.summary['unmapped_codes']


class TestDataValidatorBusinessRules:
    """Test business rule validation"""
    
    def test_validate_debit_xor_credit_both_zero(self):
        """Test that lines with both debit and credit zero are rejected"""
        validator = DataValidator()
        
        data = pd.DataFrame({
            'account_code': ['1001', '1002'],
            'debit': [0, 100],
            'credit': [0, 0],
            'entry_no': [1, 1]
        })
        
        result = validator.validate_transaction_lines(data)
        
        assert any(e.error_type == 'business_rule' and 'both zero' in e.error_message for e in result.errors)
    
    def test_validate_debit_xor_credit_both_nonzero(self):
        """Test that lines with both debit and credit non-zero are rejected"""
        validator = DataValidator()
        
        data = pd.DataFrame({
            'account_code': ['1001', '1002'],
            'debit': [100, 100],
            'credit': [50, 0],
            'entry_no': [1, 1]
        })
        
        result = validator.validate_transaction_lines(data)
        
        assert any(e.error_type == 'business_rule' and 'both' in e.error_message for e in result.errors)
    
    def test_validate_valid_debit_xor_credit(self):
        """Test that valid debit XOR credit passes"""
        validator = DataValidator()
        
        data = pd.DataFrame({
            'account_code': ['1001', '1002'],
            'debit': [100, 0],
            'credit': [0, 100],
            'entry_no': [1, 1]
        })
        
        result = validator.validate_transaction_lines(data)
        
        assert not any(e.error_type == 'business_rule' for e in result.errors)


class TestDataValidatorReferentialIntegrity:
    """Test referential integrity validation"""
    
    def test_validate_line_references_valid_transaction(self):
        """Test that lines reference valid transactions"""
        validator = DataValidator()
        
        transactions = pd.DataFrame({
            'entry_no': [1, 2]
        })
        
        lines = pd.DataFrame({
            'entry_no': [1, 2, 9999],  # 9999 is invalid
            'account_code': ['1001', '1002', '1003'],
            'debit': [100, 0, 50],
            'credit': [0, 100, 0]
        })
        
        result = validator.validate_referential_integrity(transactions, lines)
        
        assert any(e.error_type == 'referential_integrity' for e in result.errors)
    
    def test_validate_all_lines_reference_valid_transactions(self):
        """Test that all lines reference valid transactions"""
        validator = DataValidator()
        
        transactions = pd.DataFrame({
            'entry_no': [1, 2]
        })
        
        lines = pd.DataFrame({
            'entry_no': [1, 1, 2],
            'account_code': ['1001', '1002', '1003'],
            'debit': [100, 0, 50],
            'credit': [0, 100, 0]
        })
        
        result = validator.validate_referential_integrity(transactions, lines)
        
        assert not any(e.error_type == 'referential_integrity' for e in result.errors)


class TestDataValidatorDimensionCodes:
    """Test dimension code validation"""
    
    def test_validate_invalid_project_code(self):
        """Test that invalid project codes are flagged as warnings"""
        validator = DataValidator()
        validator.set_valid_project_codes({'P001', 'P002'})
        
        data = pd.DataFrame({
            'account_code': ['1001', '1002'],
            'project_code': ['P001', 'P999'],  # P999 is invalid
            'debit': [100, 0],
            'credit': [0, 100],
            'entry_no': [1, 1]
        })
        
        result = validator.validate_dimension_codes(data)
        
        assert any(w.warning_type == 'dimension_code' for w in result.warnings)
    
    def test_validate_null_dimension_codes_allowed(self):
        """Test that null dimension codes are allowed"""
        validator = DataValidator()
        validator.set_valid_project_codes({'P001', 'P002'})
        
        data = pd.DataFrame({
            'account_code': ['1001', '1002'],
            'project_code': [None, 'P001'],
            'debit': [100, 0],
            'credit': [0, 100],
            'entry_no': [1, 1]
        })
        
        result = validator.validate_dimension_codes(data)
        
        # Should not have warnings for null values
        assert not any(w.field_name == 'project_code' and w.row_number == 1 for w in result.warnings)


class TestDataValidatorReportGeneration:
    """Test validation report generation"""
    
    def test_generate_validation_report(self, tmp_path):
        """Test that validation report is generated correctly"""
        validator = DataValidator()
        
        data = pd.DataFrame({
            'fiscal_year': [2024, 'invalid'],
            'month': [1, 13],
            'entry_no': [1, 2],
            'entry_date': ['2024-01-01', 'invalid_date']
        })
        
        result = validator.validate_transactions(data)
        
        report_path = tmp_path / "validation_report.txt"
        success = validator.generate_validation_report(result, str(report_path))
        
        assert success
        assert report_path.exists()
        
        # Check report content
        content = report_path.read_text()
        assert 'VALIDATION REPORT' in content
        assert 'SUMMARY' in content
        assert 'ERRORS' in content


class TestDataValidatorFactory:
    """Test factory function"""
    
    def test_create_data_validator(self):
        """Test that factory creates validator correctly"""
        validator = create_data_validator()
        
        assert isinstance(validator, DataValidator)
        assert validator.validation_rules == []
    
    def test_create_data_validator_with_rules(self):
        """Test that factory creates validator with rules"""
        rules = [
            ValidationRule(field_name='test', rule_type='required', required=True)
        ]
        
        validator = create_data_validator(rules)
        
        assert isinstance(validator, DataValidator)
        assert len(validator.validation_rules) == 1


class TestDataValidatorIntegration:
    """Integration tests for complete validation workflows"""
    
    def test_validate_complete_transaction_dataset(self):
        """Test validation of a complete transaction dataset"""
        validator = DataValidator()
        validator.set_valid_account_codes({'1001', '1002', '1003'})
        
        transactions = pd.DataFrame({
            'fiscal_year': [2024, 2024],
            'month': [1, 2],
            'entry_no': [1, 2],
            'entry_date': ['2024-01-01', '2024-01-02']
        })
        
        lines = pd.DataFrame({
            'account_code': ['1001', '1002', '1001'],
            'debit': [100, 0, 50],
            'credit': [0, 100, 0],
            'entry_no': [1, 1, 2]
        })
        
        # Validate transactions
        trans_result = validator.validate_transactions(transactions)
        assert trans_result.passed
        
        # Validate lines
        lines_result = validator.validate_transaction_lines(lines)
        assert lines_result.passed
        
        # Validate referential integrity
        ref_result = validator.validate_referential_integrity(transactions, lines)
        assert ref_result.passed
    
    def test_validate_dataset_with_errors(self):
        """Test validation of dataset with multiple errors"""
        validator = DataValidator()
        validator.set_valid_account_codes({'1001', '1002'})
        
        transactions = pd.DataFrame({
            'fiscal_year': [None, 2024],
            'month': [1, 13],
            'entry_no': [1, 2],
            'entry_date': ['2024-01-01', 'invalid']
        })
        
        lines = pd.DataFrame({
            'account_code': ['1001', '9999'],
            'debit': [100, 100],
            'credit': [0, 100],
            'entry_no': [1, 2]
        })
        
        trans_result = validator.validate_transactions(transactions)
        assert not trans_result.passed
        assert len(trans_result.errors) > 0
        
        lines_result = validator.validate_transaction_lines(lines)
        assert not lines_result.passed
        assert len(lines_result.errors) > 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
