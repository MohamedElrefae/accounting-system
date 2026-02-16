"""Minimal integration test to verify pytest collection works."""

import pytest


def test_minimal_supabase_connection():
    """Test Supabase connection manager initialization (Req 1.1)"""
    from src.analyzer.supabase_connection import SupabaseConnectionManager
    import os
    from unittest.mock import patch
    
    with patch.dict(os.environ, {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_KEY': 'test-key-123'
    }):
        manager = SupabaseConnectionManager()
        assert manager is not None
        assert manager.config.url == 'https://test.supabase.co'
        assert manager.config.key == 'test-key-123'


def test_minimal_schema_manager():
    """Test SchemaManager initialization (Req 1.2, 1.3)"""
    from src.analyzer.schema_manager import SchemaManager
    import tempfile
    import json
    from pathlib import Path
    
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
    
    with tempfile.TemporaryDirectory() as tmpdir:
        schema_file = Path(tmpdir) / 'schema.json'
        with open(schema_file, 'w') as f:
            json.dump(mock_schema, f)
        
        manager = SchemaManager(str(schema_file))
        assert manager is not None
        assert manager.get_table('accounts') is not None
