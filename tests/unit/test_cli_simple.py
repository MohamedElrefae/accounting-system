"""Simple tests for CLI functionality."""

import pytest


def test_cli_imports():
    """Test that CLI can be imported."""
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path.cwd()))
    sys.path.insert(0, str(Path.cwd() / "src"))
    
    from migrate import MigrationCLI
    assert MigrationCLI is not None


def test_cli_initialization():
    """Test CLI initialization."""
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path.cwd()))
    sys.path.insert(0, str(Path.cwd() / "src"))
    
    from migrate import MigrationCLI
    cli = MigrationCLI()
    
    assert cli.config_dir == Path("config")
    assert cli.reports_dir == Path("reports")
    assert cli.backups_dir == Path("backups")
