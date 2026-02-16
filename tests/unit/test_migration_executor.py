"""
Unit tests for MigrationExecutor class

Tests migration functionality:
- Dry-run mode (simulate without database writes)
- Batch insert with configurable batch size
- Process in order: transactions first, then transaction_lines
- Track progress with tqdm progress bar
- Log each batch: records_attempted, records_succeeded, records_failed
- Continue on errors (log and skip failed records)
- Generate migration summary report
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime
from unittest.mock import Mock, MagicMock, patch
import tempfile
import json

from src.executor.migration_executor import (
    MigrationExecutor,
    BatchResult,
    MigrationSummary,
    create_migration_executor
)


class TestMigrationExecutorInitialization:
    """Test MigrationExecutor initialization"""
    
    def test_initialize_migration_executor_dry_run(self):
        """Test initialization in dry-run mode"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=100,
            dry_run=True
        )
        
        assert executor.batch_size == 100
        assert executor.dry_run is True
        assert executor.summary.dry_run is True
        assert executor.summary.success is False
    
    def test_initialize_migration_executor_execute_mode(self):
        """Test initialization in execute mode"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=50,
            dry_run=False
        )
        
        assert executor.batch_size == 50
        assert executor.dry_run is False
        assert executor.summary.dry_run is False
    
    def test_initialize_migration_executor_custom_batch_size(self):
        """Test initialization with custom batch size"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=250,
            dry_run=True
        )
        
        assert executor.batch_size == 250


class TestMigrationExecutorDryRun:
    """Test dry-run mode functionality"""
    
    def test_migrate_transactions_dry_run(self):
        """Test transaction migration in dry-run mode"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=100,
            dry_run=True
        )
        
        # Create test data
        transactions_df = pd.DataFrame({
            'reference_number': ['TXN001', 'TXN002'],
            'transaction_date': ['2024-01-01', '2024-01-02'],
            'fiscal_year': [2024, 2024],
            'month': [1, 1],
            'total_debit': [1000.0, 2000.0],
            'total_credit': [1000.0, 2000.0],
            'line_count': [2, 3]
        })
        
        success, batch_results = executor.migrate_transactions(transactions_df)
        
        assert success is True
        assert len(batch_results) == 1
        assert batch_results[0].records_succeeded == 2
        assert batch_results[0].records_failed == 0
        # Verify Supabase was not called in dry-run mode
        mock_manager.execute_query.assert_not_called()
    
    def test_migrate_transaction_lines_dry_run(self):
        """Test transaction lines migration in dry-run mode"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=100,
            dry_run=True
        )
        
        # Create test data
        lines_df = pd.DataFrame({
            'account_code': ['1001', '1002', '1003'],
            'debit': [100.0, 0.0, 50.0],
            'credit': [0.0, 100.0, 0.0],
            'entry_no': ['TXN001', 'TXN001', 'TXN002']
        })
        
        success, batch_results = executor.migrate_transaction_lines(lines_df)
        
        assert success is True
        assert len(batch_results) == 1
        assert batch_results[0].records_succeeded == 3
        assert batch_results[0].records_failed == 0
        mock_manager.execute_query.assert_not_called()
    
    def test_dry_run_does_not_write_to_database(self):
        """Test that dry-run mode never writes to database"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=10,
            dry_run=True
        )
        
        # Create large dataset
        transactions_df = pd.DataFrame({
            'reference_number': [f'TXN{i:04d}' for i in range(100)],
            'transaction_date': ['2024-01-01'] * 100,
            'fiscal_year': [2024] * 100,
            'month': [1] * 100,
            'total_debit': [1000.0] * 100,
            'total_credit': [1000.0] * 100,
            'line_count': [2] * 100
        })
        
        executor.migrate_transactions(transactions_df)
        
        # Verify no database calls were made
        mock_manager.execute_query.assert_not_called()


class TestMigrationExecutorBatching:
    """Test batch processing functionality"""
    
    def test_migrate_transactions_multiple_batches(self):
        """Test transaction migration with multiple batches"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=10,
            dry_run=True
        )
        
        # Create 25 transactions (should create 3 batches)
        transactions_df = pd.DataFrame({
            'reference_number': [f'TXN{i:04d}' for i in range(25)],
            'transaction_date': ['2024-01-01'] * 25,
            'fiscal_year': [2024] * 25,
            'month': [1] * 25,
            'total_debit': [1000.0] * 25,
            'total_credit': [1000.0] * 25,
            'line_count': [2] * 25
        })
        
        success, batch_results = executor.migrate_transactions(transactions_df)
        
        assert success is True
        assert len(batch_results) == 3
        assert batch_results[0].records_attempted == 10
        assert batch_results[1].records_attempted == 10
        assert batch_results[2].records_attempted == 5
    
    def test_batch_size_configuration(self):
        """Test that batch size is respected"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=50,
            dry_run=True
        )
        
        # Create 150 records
        lines_df = pd.DataFrame({
            'account_code': ['1001'] * 150,
            'debit': [100.0] * 150,
            'credit': [0.0] * 150,
            'entry_no': ['TXN001'] * 150
        })
        
        success, batch_results = executor.migrate_transaction_lines(lines_df)
        
        assert len(batch_results) == 3
        assert batch_results[0].records_attempted == 50
        assert batch_results[1].records_attempted == 50
        assert batch_results[2].records_attempted == 50


class TestMigrationExecutorEmptyData:
    """Test handling of empty data"""
    
    def test_migrate_empty_transactions(self):
        """Test migration with empty transaction DataFrame"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=100,
            dry_run=True
        )
        
        empty_df = pd.DataFrame()
        success, batch_results = executor.migrate_transactions(empty_df)
        
        assert success is True
        assert len(batch_results) == 0
    
    def test_migrate_empty_lines(self):
        """Test migration with empty lines DataFrame"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=100,
            dry_run=True
        )
        
        empty_df = pd.DataFrame()
        success, batch_results = executor.migrate_transaction_lines(empty_df)
        
        assert success is True
        assert len(batch_results) == 0


class TestMigrationExecutorRecordCleaning:
    """Test record cleaning functionality"""
    
    def test_clean_record_removes_nan_values(self):
        """Test that NaN values are removed from records"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=100,
            dry_run=True
        )
        
        record = {
            'field1': 'value1',
            'field2': np.nan,
            'field3': 'value3',
            'field4': None
        }
        
        cleaned = executor._clean_record(record)
        
        assert 'field1' in cleaned
        assert 'field2' not in cleaned
        assert 'field3' in cleaned
        assert 'field4' not in cleaned
    
    def test_clean_record_converts_datetime(self):
        """Test that datetime objects are converted to ISO format"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=100,
            dry_run=True
        )
        
        dt = datetime(2024, 1, 15, 10, 30, 45)
        record = {
            'date_field': dt,
            'other_field': 'value'
        }
        
        cleaned = executor._clean_record(record)
        
        assert isinstance(cleaned['date_field'], str)
        assert cleaned['date_field'] == '2024-01-15T10:30:45'
    
    def test_clean_record_converts_numpy_types(self):
        """Test that numpy types are converted to Python types"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=100,
            dry_run=True
        )
        
        record = {
            'int_field': np.int64(42),
            'float_field': np.float64(3.14),
            'bool_field': np.bool_(True),
            'str_field': 'value'
        }
        
        cleaned = executor._clean_record(record)
        
        assert isinstance(cleaned['int_field'], int)
        assert isinstance(cleaned['float_field'], float)
        assert isinstance(cleaned['bool_field'], bool)
        assert isinstance(cleaned['str_field'], str)


class TestMigrationExecutorSummary:
    """Test migration summary functionality"""
    
    def test_get_summary(self):
        """Test getting migration summary"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=100,
            dry_run=True
        )
        
        summary = executor.get_summary()
        
        assert isinstance(summary, MigrationSummary)
        assert summary.dry_run is True
        assert summary.success is False
    
    def test_generate_migration_report(self):
        """Test migration report generation"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=100,
            dry_run=True
        )
        
        # Run a migration
        transactions_df = pd.DataFrame({
            'reference_number': ['TXN001', 'TXN002'],
            'transaction_date': ['2024-01-01', '2024-01-02'],
            'fiscal_year': [2024, 2024],
            'month': [1, 1],
            'total_debit': [1000.0, 2000.0],
            'total_credit': [1000.0, 2000.0],
            'line_count': [2, 3]
        })
        
        executor.migrate_transactions(transactions_df)
        
        # Generate report
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            report_path = f.name
        
        success = executor.generate_migration_report(report_path)
        
        assert success is True
        
        # Verify report content
        with open(report_path, 'r') as f:
            content = f.read()
        
        assert 'MIGRATION EXECUTION REPORT' in content
        assert 'DRY-RUN' in content
        assert 'TRANSACTION STATISTICS' in content
    
    def test_export_summary_json(self):
        """Test JSON summary export"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=100,
            dry_run=True
        )
        
        # Run a migration
        transactions_df = pd.DataFrame({
            'reference_number': ['TXN001'],
            'transaction_date': ['2024-01-01'],
            'fiscal_year': [2024],
            'month': [1],
            'total_debit': [1000.0],
            'total_credit': [1000.0],
            'line_count': [2]
        })
        
        executor.migrate_transactions(transactions_df)
        
        # Export JSON
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
            json_path = f.name
        
        success = executor.export_summary_json(json_path)
        
        assert success is True
        
        # Verify JSON content
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        assert data['dry_run'] is True
        assert 'transactions' in data
        assert 'lines' in data
        assert data['transactions']['attempted'] == 1


class TestMigrationExecutorFactory:
    """Test factory function"""
    
    def test_create_migration_executor(self):
        """Test factory function creates executor correctly"""
        mock_manager = Mock()
        executor = create_migration_executor(
            supabase_manager=mock_manager,
            batch_size=100,
            dry_run=True
        )
        
        assert isinstance(executor, MigrationExecutor)
        assert executor.batch_size == 100
        assert executor.dry_run is True
    
    def test_create_migration_executor_default_params(self):
        """Test factory function with default parameters"""
        mock_manager = Mock()
        executor = create_migration_executor(supabase_manager=mock_manager)
        
        assert executor.batch_size == 100
        assert executor.dry_run is True


class TestMigrationExecutorIntegration:
    """Integration tests for migration workflow"""
    
    def test_complete_migration_workflow_dry_run(self):
        """Test complete migration workflow in dry-run mode"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=10,
            dry_run=True
        )
        
        # Create test data
        transactions_df = pd.DataFrame({
            'reference_number': [f'TXN{i:04d}' for i in range(25)],
            'transaction_date': ['2024-01-01'] * 25,
            'fiscal_year': [2024] * 25,
            'month': [1] * 25,
            'total_debit': [1000.0] * 25,
            'total_credit': [1000.0] * 25,
            'line_count': [2] * 25
        })
        
        lines_df = pd.DataFrame({
            'account_code': ['1001'] * 50,
            'debit': [100.0] * 50,
            'credit': [0.0] * 50,
            'entry_no': ['TXN0001'] * 50
        })
        
        # Migrate transactions
        trans_success, trans_batches = executor.migrate_transactions(transactions_df)
        assert trans_success is True
        assert len(trans_batches) == 3
        
        # Migrate lines
        lines_success, lines_batches = executor.migrate_transaction_lines(lines_df)
        assert lines_success is True
        assert len(lines_batches) == 5
        
        # Verify summary
        summary = executor.get_summary()
        assert summary.transactions_succeeded == 25
        assert summary.lines_succeeded == 50
        assert summary.transactions_failed == 0
        assert summary.lines_failed == 0
    
    def test_migration_summary_statistics(self):
        """Test that migration summary statistics are accurate"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=5,
            dry_run=True
        )
        
        # Create test data
        transactions_df = pd.DataFrame({
            'reference_number': [f'TXN{i:04d}' for i in range(12)],
            'transaction_date': ['2024-01-01'] * 12,
            'fiscal_year': [2024] * 12,
            'month': [1] * 12,
            'total_debit': [1000.0] * 12,
            'total_credit': [1000.0] * 12,
            'line_count': [2] * 12
        })
        
        executor.migrate_transactions(transactions_df)
        
        summary = executor.get_summary()
        
        # Verify statistics
        assert summary.transactions_attempted == 12
        assert summary.transactions_succeeded == 12
        assert summary.transactions_failed == 0
        assert len(summary.transaction_batches) == 3


class TestMigrationExecutorBackupAndRollback:
    """Test backup and rollback functionality"""
    
    def test_create_backup_success(self):
        """Test successful backup creation"""
        mock_manager = Mock()
        
        # Mock the execute_query to return sample data
        mock_manager.execute_query.side_effect = [
            [
                {'id': '1', 'reference_number': 'TXN001', 'total_debit': 1000.0},
                {'id': '2', 'reference_number': 'TXN002', 'total_debit': 2000.0}
            ],
            [
                {'id': '1', 'account_code': '1001', 'debit': 100.0},
                {'id': '2', 'account_code': '1002', 'debit': 200.0}
            ]
        ]
        
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=100,
            dry_run=True
        )
        
        with tempfile.TemporaryDirectory() as backup_dir:
            success, backup_info = executor.create_backup(backup_dir)
            
            assert success is True
            assert 'Backup created successfully' in backup_info
            assert '2 records' in backup_info
            
            # Verify backup files were created
            import os
            files = os.listdir(backup_dir)
            assert any('transactions_backup' in f for f in files)
            assert any('transaction_lines_backup' in f for f in files)
            assert any('backup_metadata' in f for f in files)
    
    def test_create_backup_with_empty_tables(self):
        """Test backup creation with empty tables"""
        mock_manager = Mock()
        mock_manager.execute_query.side_effect = [[], []]
        
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=100,
            dry_run=True
        )
        
        with tempfile.TemporaryDirectory() as backup_dir:
            success, backup_info = executor.create_backup(backup_dir)
            
            assert success is True
            assert '0 records' in backup_info
    
    def test_create_backup_failure_transactions(self):
        """Test backup creation failure when transactions query fails"""
        mock_manager = Mock()
        mock_manager.execute_query.side_effect = Exception("Database error")
        
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=100,
            dry_run=True
        )
        
        with tempfile.TemporaryDirectory() as backup_dir:
            success, backup_info = executor.create_backup(backup_dir)
            
            assert success is False
            assert 'Failed to backup transactions' in backup_info
    
    def test_rollback_success(self):
        """Test successful rollback from backup"""
        mock_manager = Mock()
        
        # Create backup data
        transactions_data = [
            {'id': '1', 'reference_number': 'TXN001', 'total_debit': 1000.0},
            {'id': '2', 'reference_number': 'TXN002', 'total_debit': 2000.0}
        ]
        
        lines_data = [
            {'id': '1', 'account_code': '1001', 'debit': 100.0},
            {'id': '2', 'account_code': '1002', 'debit': 200.0}
        ]
        
        # Mock delete and insert operations
        # The side_effect list will be consumed in order for each execute_query call
        mock_manager.execute_query.side_effect = [
            None,  # Delete transaction_lines
            None,  # Delete transactions
            None,  # Insert transaction 1
            None,  # Insert transaction 2
            None,  # Insert line 1
            None,  # Insert line 2
            transactions_data,  # Select transactions for verification
            lines_data  # Select lines for verification
        ]
        
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=100,
            dry_run=False
        )
        
        with tempfile.TemporaryDirectory() as backup_dir:
            # Create backup files
            timestamp = '20240115_103045'
            
            import os
            trans_file = os.path.join(backup_dir, f'transactions_backup_{timestamp}.json')
            lines_file = os.path.join(backup_dir, f'transaction_lines_backup_{timestamp}.json')
            
            with open(trans_file, 'w') as f:
                json.dump(transactions_data, f)
            
            with open(lines_file, 'w') as f:
                json.dump(lines_data, f)
            
            # Perform rollback
            success, message = executor.rollback(backup_dir, timestamp)
            
            assert success is True
            assert 'Rollback completed successfully' in message
            assert '2 records' in message
    
    def test_rollback_missing_backup_file(self):
        """Test rollback failure when backup file is missing"""
        mock_manager = Mock()
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=100,
            dry_run=False
        )
        
        with tempfile.TemporaryDirectory() as backup_dir:
            success, message = executor.rollback(backup_dir, '20240115_103045')
            
            assert success is False
            assert 'not found' in message
    
    def test_rollback_verification_failure(self):
        """Test rollback with verification failure"""
        mock_manager = Mock()
        
        # Mock operations to fail during verification
        mock_manager.execute_query.side_effect = [
            None,  # Delete transaction_lines
            None,  # Delete transactions
            None,  # Insert transaction
            None,  # Insert line
            Exception("Verification failed")  # Select for verification fails
        ]
        
        executor = MigrationExecutor(
            supabase_manager=mock_manager,
            batch_size=100,
            dry_run=False
        )
        
        with tempfile.TemporaryDirectory() as backup_dir:
            timestamp = '20240115_103045'
            
            import os
            trans_file = os.path.join(backup_dir, f'transactions_backup_{timestamp}.json')
            lines_file = os.path.join(backup_dir, f'transaction_lines_backup_{timestamp}.json')
            
            with open(trans_file, 'w') as f:
                json.dump([{'id': '1'}], f)
            
            with open(lines_file, 'w') as f:
                json.dump([{'id': '1'}], f)
            
            success, message = executor.rollback(backup_dir, timestamp)
            
            assert success is False
            assert 'Failed to verify restoration' in message


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
