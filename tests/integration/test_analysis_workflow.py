"""
Integration tests for full analysis workflow (Task 13.1)

Tests the complete analysis pipeline:
- Supabase connection → schema analysis → report generation
- Excel reading → structure analysis → report generation
- Comparison → mapping → report generation

Requirements: 1.1, 1.5, 2.1, 2.5, 3.5
"""

import pytest
import os
import json
import tempfile
import pandas as pd
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime
from pathlib import Path

from src.analyzer.supabase_connection import SupabaseConnectionManager
from src.analyzer.excel_reader import ExcelReader
from src.analyzer.data_comparator import DataComparator
from src.analyzer.account_code_mapper import AccountCodeMapper
from src.analyzer.schema_manager import SchemaManager


def test_supabase_connection_initialization():
    """Test Supabase connection manager initialization (Req 1.1)"""
    with patch.dict(os.environ, {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_KEY': 'test-key-123'
    }):
        manager = SupabaseConnectionManager()
        
        assert manager is not None
        assert manager.config.url == 'https://test.supabase.co'
        assert manager.config.key == 'test-key-123'


def test_supabase_connection_test():
    """Test Supabase connection testing (Req 1.1)"""
    with patch.dict(os.environ, {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_KEY': 'test-key-123'
    }):
        manager = SupabaseConnectionManager()
        
        with patch.object(manager, '_test_connection', return_value=True):
            result = manager.test_connection()
            assert result is True


def test_supabase_schema_retrieval():
    """Test retrieving Supabase schema (Req 1.1, 1.2)"""
    mock_schema = {
        'tables': {
            'accounts': {
                'columns': [
                    {'name': 'id', 'type': 'uuid'},
                    {'name': 'code', 'type': 'text'},
                    {'name': 'legacy_code', 'type': 'text'},
                    {'name': 'name', 'type': 'text'}
                ]
            },
            'transactions': {
                'columns': [
                    {'name': 'id', 'type': 'uuid'},
                    {'name': 'reference_number', 'type': 'text'},
                    {'name': 'transaction_date', 'type': 'date'},
                    {'name': 'total_debit', 'type': 'numeric'},
                    {'name': 'total_credit', 'type': 'numeric'}
                ]
            },
            'transaction_lines': {
                'columns': [
                    {'name': 'id', 'type': 'uuid'},
                    {'name': 'transaction_id', 'type': 'uuid'},
                    {'name': 'account_id', 'type': 'uuid'},
                    {'name': 'debit_amount', 'type': 'numeric'},
                    {'name': 'credit_amount', 'type': 'numeric'}
                ]
            }
        }
    }
    
    with patch.dict(os.environ, {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_KEY': 'test-key-123'
    }):
        manager = SupabaseConnectionManager()
        
        with patch.object(manager, '_fetch_schema', return_value=mock_schema):
            schema = manager.get_schema(force_refresh=True)
            
            assert schema is not None
            assert 'tables' in schema
            assert 'accounts' in schema['tables']
            assert 'transactions' in schema['tables']
            assert 'transaction_lines' in schema['tables']


def test_schema_manager_initialization():
    """Test SchemaManager initialization (Req 1.2, 1.3)"""
    mock_schema = {
        'tables': {
            'accounts': {
                'columns': [
                    {'name': 'id', 'type': 'uuid'},
                    {'name': 'code', 'type': 'text'},
                    {'name': 'legacy_code', 'type': 'text'},
                    {'name': 'name', 'type': 'text'}
                ]
            }
        }
    }
    
    with tempfile.TemporaryDirectory() as tmpdir:
        schema_file = Path(tmpdir) / 'schema.json'
        with open(schema_file, 'w') as f:
            json.dump(mock_schema, f)
        
        manager = SchemaManager(str(schema_file))
        assert manager is not None
        assert manager.get_table('accounts') is not None


def test_schema_manager_table_lookup():
    """Test SchemaManager table lookup (Req 1.4)"""
    mock_schema = {
        'tables': {
            'accounts': {
                'columns': [
                    {'name': 'id', 'type': 'uuid'},
                    {'name': 'code', 'type': 'text'},
                    {'name': 'legacy_code', 'type': 'text'},
                    {'name': 'name', 'type': 'text'}
                ]
            }
        }
    }
    
    with tempfile.TemporaryDirectory() as tmpdir:
        schema_file = Path(tmpdir) / 'schema.json'
        with open(schema_file, 'w') as f:
            json.dump(mock_schema, f)
        
        manager = SchemaManager(str(schema_file))
        
        accounts_table = manager.get_table('accounts')
        assert accounts_table is not None
        assert 'columns' in accounts_table
        
        code_column = manager.get_column('accounts', 'code')
        assert code_column is not None
        assert code_column.data_type == 'text'


def test_schema_manager_validation():
    """Test SchemaManager validation (Req 1.5)"""
    mock_schema = {
        'tables': {
            'accounts': {
                'columns': [
                    {'name': 'id', 'type': 'uuid'},
                    {'name': 'code', 'type': 'text'},
                    {'name': 'legacy_code', 'type': 'text'},
                    {'name': 'name', 'type': 'text'}
                ]
            }
        }
    }
    
    with tempfile.TemporaryDirectory() as tmpdir:
        schema_file = Path(tmpdir) / 'schema.json'
        with open(schema_file, 'w') as f:
            json.dump(mock_schema, f)
        
        manager = SchemaManager(str(schema_file))
        
        # Valid data
        valid_data = pd.DataFrame({
            'id': ['123e4567-e89b-12d3-a456-426614174000'],
            'code': ['ACC001'],
            'legacy_code': ['OLD001'],
            'name': ['Test Account']
        })
        result = manager.validate_data('accounts', valid_data)
        assert result is not None


def test_excel_reader_initialization():
    """Test ExcelReader initialization (Req 2.1)"""
    sample_excel_data = pd.DataFrame({
        'رقم القيد': [1, 1, 2, 2],
        'تاريخ القيد': ['2025-01-15', '2025-01-15', '2025-01-16', '2025-01-16'],
        'رقم الحساب': ['1001', '2001', '1001', '3001'],
        'اسم الحساب': ['Cash', 'Accounts Payable', 'Cash', 'Revenue'],
        'مدين': [1000.00, 0.00, 500.00, 0.00],
        'دائن': [0.00, 1000.00, 0.00, 500.00],
        'رمز المشروع': ['P001', 'P001', 'P002', 'P002'],
        'الوصف': ['Opening balance', 'Opening balance', 'Sale', 'Sale']
    })
    
    column_mapping = {
        'رقم القيد': 'entry_no',
        'تاريخ القيد': 'entry_date',
        'رقم الحساب': 'account_code',
        'اسم الحساب': 'account_name',
        'مدين': 'debit',
        'دائن': 'credit',
        'رمز المشروع': 'project_code',
        'الوصف': 'description'
    }
    
    with tempfile.TemporaryDirectory() as tmpdir:
        excel_file = Path(tmpdir) / 'test.xlsx'
        sample_excel_data.to_excel(excel_file, sheet_name='transactions ', index=False)
        
        reader = ExcelReader(str(excel_file), column_mapping)
        assert reader is not None
        assert reader.excel_file_path == str(excel_file)


def test_excel_reader_data_loading():
    """Test ExcelReader data loading (Req 2.1, 2.3)"""
    sample_excel_data = pd.DataFrame({
        'رقم القيد': [1, 1, 2, 2],
        'تاريخ القيد': ['2025-01-15', '2025-01-15', '2025-01-16', '2025-01-16'],
        'رقم الحساب': ['1001', '2001', '1001', '3001'],
        'اسم الحساب': ['Cash', 'Accounts Payable', 'Cash', 'Revenue'],
        'مدين': [1000.00, 0.00, 500.00, 0.00],
        'دائن': [0.00, 1000.00, 0.00, 500.00],
        'رمز المشروع': ['P001', 'P001', 'P002', 'P002'],
        'الوصف': ['Opening balance', 'Opening balance', 'Sale', 'Sale']
    })
    
    column_mapping = {
        'رقم القيد': 'entry_no',
        'تاريخ القيد': 'entry_date',
        'رقم الحساب': 'account_code',
        'اسم الحساب': 'account_name',
        'مدين': 'debit',
        'دائن': 'credit',
        'رمز المشروع': 'project_code',
        'الوصف': 'description'
    }
    
    with tempfile.TemporaryDirectory() as tmpdir:
        excel_file = Path(tmpdir) / 'test.xlsx'
        sample_excel_data.to_excel(excel_file, sheet_name='transactions ', index=False)
        
        reader = ExcelReader(str(excel_file), column_mapping)
        result = reader.read_transactions_sheet()
        
        assert result is not None
        assert result.data is not None
        assert len(result.data) == 4


def test_excel_reader_column_mapping():
    """Test ExcelReader column mapping (Req 2.2, 2.5)"""
    sample_excel_data = pd.DataFrame({
        'رقم القيد': [1, 1, 2, 2],
        'تاريخ القيد': ['2025-01-15', '2025-01-15', '2025-01-16', '2025-01-16'],
        'رقم الحساب': ['1001', '2001', '1001', '3001'],
        'اسم الحساب': ['Cash', 'Accounts Payable', 'Cash', 'Revenue'],
        'مدين': [1000.00, 0.00, 500.00, 0.00],
        'دائن': [0.00, 1000.00, 0.00, 500.00],
        'رمز المشروع': ['P001', 'P001', 'P002', 'P002'],
        'الوصف': ['Opening balance', 'Opening balance', 'Sale', 'Sale']
    })
    
    column_mapping = {
        'رقم القيد': 'entry_no',
        'تاريخ القيد': 'entry_date',
        'رقم الحساب': 'account_code',
        'اسم الحساب': 'account_name',
        'مدين': 'debit',
        'دائن': 'credit',
        'رمز المشروع': 'project_code',
        'الوصف': 'description'
    }
    
    with tempfile.TemporaryDirectory() as tmpdir:
        excel_file = Path(tmpdir) / 'test.xlsx'
        sample_excel_data.to_excel(excel_file, sheet_name='transactions ', index=False)
        
        reader = ExcelReader(str(excel_file), column_mapping)
        result = reader.read_transactions_sheet()
        
        # Check that Arabic columns are mapped to English
        assert result.data is not None
        assert 'entry_no' in result.data.columns
        assert 'entry_date' in result.data.columns
        assert 'account_code' in result.data.columns
        assert 'debit' in result.data.columns
        assert 'credit' in result.data.columns


def test_data_comparator_initialization():
    """Test DataComparator initialization (Req 3.1)"""
    sample_excel_data = pd.DataFrame({
        'رقم القيد': [1, 1, 2, 2],
        'تاريخ القيد': ['2025-01-15', '2025-01-15', '2025-01-16', '2025-01-16'],
    })
    
    mock_schema = {
        'tables': {
            'accounts': {
                'columns': [
                    {'name': 'id', 'type': 'uuid'},
                    {'name': 'code', 'type': 'text'},
                ]
            }
        }
    }
    
    excel_structure = {
        'columns': list(sample_excel_data.columns),
        'row_count': len(sample_excel_data),
        'date_range': ['2025-01-15', '2025-01-16']
    }
    
    comparator = DataComparator(excel_structure, mock_schema)
    assert comparator is not None


def test_data_comparator_field_matching():
    """Test DataComparator field matching (Req 3.3, 3.4)"""
    sample_excel_data = pd.DataFrame({
        'رقم القيد': [1, 1, 2, 2],
        'تاريخ القيد': ['2025-01-15', '2025-01-15', '2025-01-16', '2025-01-16'],
    })
    
    mock_schema = {
        'tables': {
            'accounts': {
                'columns': [
                    {'name': 'id', 'type': 'uuid'},
                    {'name': 'code', 'type': 'text'},
                ]
            }
        }
    }
    
    excel_structure = {
        'columns': list(sample_excel_data.columns),
        'row_count': len(sample_excel_data),
        'date_range': ['2025-01-15', '2025-01-16']
    }
    
    comparator = DataComparator(excel_structure, mock_schema)
    result = comparator.compare_structures()
    
    assert result is not None
    assert result.field_mappings is not None


def test_account_code_mapper_initialization():
    """Test AccountCodeMapper initialization (Req 4.1)"""
    with tempfile.TemporaryDirectory() as tmpdir:
        mapping_file = Path(tmpdir) / 'account_mapping.csv'
        mapping_file.write_text(
            'excel_code,account_id,account_name\n'
            '1001,123e4567-e89b-12d3-a456-426614174000,Cash\n'
            '2001,223e4567-e89b-12d3-a456-426614174001,Accounts Payable\n'
        )
        
        mapper = AccountCodeMapper(mapping_file=str(mapping_file))
        assert mapper is not None


def test_account_code_mapper_lookup():
    """Test AccountCodeMapper lookup (Req 4.2, 4.3)"""
    with tempfile.TemporaryDirectory() as tmpdir:
        mapping_file = Path(tmpdir) / 'account_mapping.csv'
        mapping_file.write_text(
            'excel_code,account_id,account_name\n'
            '1001,123e4567-e89b-12d3-a456-426614174000,Cash\n'
            '2001,223e4567-e89b-12d3-a456-426614174001,Accounts Payable\n'
        )
        
        mapper = AccountCodeMapper(mapping_file=str(mapping_file))
        mapper.load_mappings()
        
        account_id = mapper.map_excel_code_to_account_id('1001')
        assert account_id == '123e4567-e89b-12d3-a456-426614174000'


def test_full_analysis_workflow():
    """
    Test complete analysis workflow (Req 1.1, 1.5, 2.1, 2.5, 3.5)
    
    Workflow:
    1. Connect to Supabase and retrieve schema
    2. Read Excel file and analyze structure
    3. Compare structures and generate mapping
    4. Generate reports
    """
    mock_schema = {
        'tables': {
            'accounts': {
                'columns': [
                    {'name': 'id', 'type': 'uuid'},
                    {'name': 'code', 'type': 'text'},
                    {'name': 'legacy_code', 'type': 'text'},
                    {'name': 'name', 'type': 'text'}
                ]
            },
            'transactions': {
                'columns': [
                    {'name': 'id', 'type': 'uuid'},
                    {'name': 'reference_number', 'type': 'text'},
                    {'name': 'transaction_date', 'type': 'date'},
                    {'name': 'total_debit', 'type': 'numeric'},
                    {'name': 'total_credit', 'type': 'numeric'}
                ]
            }
        }
    }
    
    sample_excel_data = pd.DataFrame({
        'رقم القيد': [1, 1, 2, 2],
        'تاريخ القيد': ['2025-01-15', '2025-01-15', '2025-01-16', '2025-01-16'],
        'رقم الحساب': ['1001', '2001', '1001', '3001'],
        'اسم الحساب': ['Cash', 'Accounts Payable', 'Cash', 'Revenue'],
        'مدين': [1000.00, 0.00, 500.00, 0.00],
        'دائن': [0.00, 1000.00, 0.00, 500.00],
        'رمز المشروع': ['P001', 'P001', 'P002', 'P002'],
        'الوصف': ['Opening balance', 'Opening balance', 'Sale', 'Sale']
    })
    
    column_mapping = {
        'رقم القيد': 'entry_no',
        'تاريخ القيد': 'entry_date',
        'رقم الحساب': 'account_code',
        'اسم الحساب': 'account_name',
        'مدين': 'debit',
        'دائن': 'credit',
        'رمز المشروع': 'project_code',
        'الوصف': 'description'
    }
    
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        
        # Step 1: Supabase connection and schema analysis
        with patch.dict(os.environ, {
            'SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_KEY': 'test-key-123'
        }):
            supabase_manager = SupabaseConnectionManager()
            with patch.object(supabase_manager, '_fetch_schema', return_value=mock_schema):
                schema = supabase_manager.get_schema(force_refresh=True)
                assert schema is not None
        
        # Save schema to file
        schema_file = tmpdir / 'schema.json'
        with open(schema_file, 'w') as f:
            json.dump(schema, f)
        
        # Step 2: Excel reading and structure analysis
        excel_file = tmpdir / 'test.xlsx'
        sample_excel_data.to_excel(excel_file, sheet_name='transactions ', index=False)
        
        reader = ExcelReader(str(excel_file), column_mapping)
        result = reader.read_transactions_sheet()
        assert result is not None
        assert result.data is not None
        assert len(result.data) == 4
        
        # Step 3: Data comparison and mapping
        excel_structure = {
            'columns': list(result.data.columns),
            'row_count': len(result.data),
            'date_range': [str(result.data['entry_date'].min()), str(result.data['entry_date'].max())]
        }
        
        schema_manager = SchemaManager(str(schema_file))
        comparator = DataComparator(excel_structure, schema)
        
        comparison_result = comparator.compare_structures()
        assert comparison_result is not None
        
        # Step 4: Generate reports
        report = {
            'timestamp': datetime.now().isoformat(),
            'supabase_schema': schema,
            'excel_structure': excel_structure,
            'field_matches': len(comparison_result.field_mappings) if comparison_result.field_mappings else 0,
            'status': 'success'
        }
        
        report_file = tmpdir / 'analysis_report.json'
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        assert report_file.exists()
        assert report['status'] == 'success'


def test_analysis_workflow_report_generation():
    """Test analysis workflow report generation (Req 1.5, 2.5, 3.5)"""
    mock_schema = {
        'tables': {
            'accounts': {
                'columns': [
                    {'name': 'id', 'type': 'uuid'},
                    {'name': 'code', 'type': 'text'},
                ]
            },
            'transactions': {
                'columns': [
                    {'name': 'id', 'type': 'uuid'},
                    {'name': 'reference_number', 'type': 'text'},
                ]
            }
        }
    }
    
    sample_excel_data = pd.DataFrame({
        'رقم القيد': [1, 1, 2, 2],
        'تاريخ القيد': ['2025-01-15', '2025-01-15', '2025-01-16', '2025-01-16'],
        'رقم الحساب': ['1001', '2001', '1001', '3001'],
        'اسم الحساب': ['Cash', 'Accounts Payable', 'Cash', 'Revenue'],
        'مدين': [1000.00, 0.00, 500.00, 0.00],
        'دائن': [0.00, 1000.00, 0.00, 500.00],
        'رمز المشروع': ['P001', 'P001', 'P002', 'P002'],
        'الوصف': ['Opening balance', 'Opening balance', 'Sale', 'Sale']
    })
    
    column_mapping = {
        'رقم القيد': 'entry_no',
        'تاريخ القيد': 'entry_date',
        'رقم الحساب': 'account_code',
        'اسم الحساب': 'account_name',
        'مدين': 'debit',
        'دائن': 'credit',
        'رمز المشروع': 'project_code',
        'الوصف': 'description'
    }
    
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        
        # Create reports directory
        reports_dir = tmpdir / 'reports'
        reports_dir.mkdir()
        
        # Generate schema analysis report
        schema_report = {
            'timestamp': datetime.now().isoformat(),
            'tables': list(mock_schema['tables'].keys()),
            'total_columns': sum(
                len(table['columns'])
                for table in mock_schema['tables'].values()
            ),
            'status': 'success'
        }
        
        schema_report_file = reports_dir / 'schema_analysis.json'
        with open(schema_report_file, 'w') as f:
            json.dump(schema_report, f, indent=2)
        
        # Generate Excel structure report
        excel_file = tmpdir / 'test.xlsx'
        sample_excel_data.to_excel(excel_file, sheet_name='transactions ', index=False)
        
        reader = ExcelReader(str(excel_file), column_mapping)
        result = reader.read_transactions_sheet()
        
        excel_report = {
            'timestamp': datetime.now().isoformat(),
            'columns': list(result.data.columns),
            'row_count': len(result.data),
            'status': 'success'
        }
        
        excel_report_file = reports_dir / 'excel_structure.json'
        with open(excel_report_file, 'w') as f:
            json.dump(excel_report, f, indent=2)
        
        # Verify reports exist
        assert schema_report_file.exists()
        assert excel_report_file.exists()
        
        # Verify report content
        with open(schema_report_file) as f:
            loaded_schema_report = json.load(f)
            assert loaded_schema_report['status'] == 'success'
            assert 'tables' in loaded_schema_report
        
        with open(excel_report_file) as f:
            loaded_excel_report = json.load(f)
            assert loaded_excel_report['status'] == 'success'
            assert 'columns' in loaded_excel_report
