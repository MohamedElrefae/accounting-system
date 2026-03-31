"""
Unit tests for migration CLI interface.

Tests the command-line interface for:
- Validate command
- Backup command
- Rollback command
- Migrate command (dry-run and execute modes)
"""

import pytest
import tempfile
import json
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from argparse import Namespace
import sys
import os

# Add root to path for migrate module
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


class TestMigrationCLI:
    """Test suite for MigrationCLI class."""
    
    @pytest.fixture
    def cli_instance(self):
        """Create CLI instance with temporary directories."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Import here to avoid issues at module level
            from migrate import MigrationCLI
            cli = MigrationCLI()
            cli.backups_dir = Path(tmpdir) / "backups"
            cli.reports_dir = Path(tmpdir) / "reports"
            cli.backups_dir.mkdir(exist_ok=True)
            cli.reports_dir.mkdir(exist_ok=True)
            yield cli
    
    def test_cli_initialization(self):
        """Test CLI initialization."""
        from migrate import MigrationCLI
        cli = MigrationCLI()
        assert cli.config_dir == Path("config")
        assert cli.reports_dir == Path("reports")
        assert cli.backups_dir == Path("backups")
    
    def test_validate_command_success(self, cli_instance):
        """Test validate command with valid data."""
        with patch('migrate.ExcelReader') as mock_reader, \
             patch('migrate.DataValidator') as mock_validator:
            
            mock_reader.return_value.read.return_value = Mock()
            mock_validator.return_value.validate.return_value = {
                'total_records': 100,
                'errors': []
            }
            
            args = Namespace()
            result = cli_instance.validate_command(args)
            
            assert result == 0
            assert (cli_instance.reports_dir / "validation_report.json").exists()
    
    def test_validate_command_with_errors(self, cli_instance):
        """Test validate command with validation errors."""
        with patch('migrate.ExcelReader') as mock_reader, \
             patch('migrate.DataValidator') as mock_validator:
            
            mock_reader.return_value.read.return_value = Mock()
            mock_validator.return_value.validate.return_value = {
                'total_records': 100,
                'errors': [{'level': 'ERROR', 'message': 'Invalid'}]
            }
            
            args = Namespace()
            result = cli_instance.validate_command(args)
            
            assert result == 1
    
    def test_backup_command_success(self, cli_instance):
        """Test backup command successful creation."""
        with patch('migrate.create_migration_executor') as mock_executor_factory:
            mock_executor = Mock()
            mock_executor.create_backup.return_value = (True, "Backup created")
            mock_executor_factory.return_value = mock_executor
            
            args = Namespace()
            result = cli_instance.backup_command(args)
            
            assert result == 0
            mock_executor.create_backup.assert_called_once()
    
    def test_backup_command_failure(self, cli_instance):
        """Test backup command with failure."""
        with patch('migrate.create_migration_executor') as mock_executor_factory:
            mock_executor = Mock()
            mock_executor.create_backup.return_value = (False, "Backup failed")
            mock_executor_factory.return_value = mock_executor
            
            args = Namespace()
            result = cli_instance.backup_command(args)
            
            assert result == 1
    
    def test_rollback_command_missing_timestamp(self, cli_instance):
        """Test rollback command without timestamp."""
        args = Namespace(backup_timestamp=None)
        result = cli_instance.rollback_command(args)
        assert result == 1
    
    def test_rollback_command_backup_not_found(self, cli_instance):
        """Test rollback command with missing backup file."""
        args = Namespace(backup_timestamp="20260213_143022")
        result = cli_instance.rollback_command(args)
        assert result == 1
    
    def test_rollback_command_success(self, cli_instance):
        """Test rollback command successful."""
        backup_path = cli_instance.backups_dir / "pre_migration_20260213_143022.json"
        backup_path.write_text('{}')
        
        with patch('migrate.create_migration_executor') as mock_executor_factory, \
             patch('builtins.input', return_value='yes'):
            
            mock_executor = Mock()
            mock_executor.rollback.return_value = (True, "Rollback completed")
            mock_executor_factory.return_value = mock_executor
            
            args = Namespace(backup_timestamp="20260213_143022")
            result = cli_instance.rollback_command(args)
            
            assert result == 0
            mock_executor.rollback.assert_called_once()
    
    def test_migrate_command_dry_run_success(self, cli_instance):
        """Test migrate command in dry-run mode."""
        with patch('migrate.ExcelReader') as mock_reader, \
             patch('migrate.DataValidator') as mock_validator, \
             patch('migrate.create_migration_executor') as mock_executor_factory:
            
            mock_reader.return_value.read.return_value = Mock()
            mock_validator.return_value.validate.return_value = {
                'total_records': 100,
                'errors': []
            }
            
            mock_executor = Mock()
            mock_executor.migrate_transactions.return_value = Mock(
                attempted=100, succeeded=100, failed=0
            )
            mock_executor.migrate_transaction_lines.return_value = Mock(
                attempted=100, succeeded=100, failed=0
            )
            mock_executor.get_summary.return_value = Mock(success_rate=100.0)
            mock_executor_factory.return_value = mock_executor
            
            args = Namespace(mode='dry-run', batch_size=100)
            result = cli_instance.migrate_command(args)
            
            assert result == 0
            mock_executor.migrate_transactions.assert_called_once()
    
    def test_migrate_command_validation_fails(self, cli_instance):
        """Test migrate command with validation failure."""
        with patch('migrate.ExcelReader') as mock_reader, \
             patch('migrate.DataValidator') as mock_validator, \
             patch('migrate.create_migration_executor') as mock_executor_factory:
            
            mock_reader.return_value.read.return_value = Mock()
            mock_validator.return_value.validate.return_value = {
                'total_records': 100,
                'errors': [{'level': 'ERROR', 'message': 'Invalid'}]
            }
            
            mock_executor = Mock()
            mock_executor_factory.return_value = mock_executor
            
            args = Namespace(mode='dry-run', batch_size=100)
            result = cli_instance.migrate_command(args)
            
            assert result == 1
            mock_executor.migrate_transactions.assert_not_called()

