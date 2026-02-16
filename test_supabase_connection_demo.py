#!/usr/bin/env python3
"""
Demo script for Supabase Connection Manager and Schema Manager

This script demonstrates the functionality of the SupabaseConnectionManager
and SchemaManager classes implemented for Task 2.
"""

import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from analyzer import (
    SupabaseConnectionManager,
    create_supabase_connection,
    SchemaManager,
    create_schema_manager
)

def demo_supabase_connection():
    """Demonstrate SupabaseConnectionManager functionality"""
    print("=" * 60)
    print("DEMO: Supabase Connection Manager")
    print("=" * 60)
    
    # Check if environment variables are set
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        print("⚠️  Environment variables not set:")
        print(f"   SUPABASE_URL: {'Set' if supabase_url else 'Not set'}")
        print(f"   SUPABASE_KEY: {'Set' if supabase_key else 'Not set'}")
        print("\nPlease set these environment variables to test actual connection.")
        print("For demonstration, we'll show the class structure instead.")
        
        # Create manager without actual connection
        manager = SupabaseConnectionManager(
            url="https://example.supabase.co",
            key="example-key"
        )
    else:
        print("✅ Environment variables detected")
        manager = SupabaseConnectionManager()
    
    # Show connection info
    print("\n📊 Connection Information:")
    info = manager.get_connection_info()
    for key, value in info.items():
        if key == "config":
            print(f"   {key}:")
            for config_key, config_value in value.items():
                print(f"     {config_key}: {config_value}")
        else:
            print(f"   {key}: {value}")
    
    # Test connection (if environment variables are set)
    if supabase_url and supabase_key:
        print("\n🔗 Testing connection...")
        try:
            connected = manager.test_connection()
            if connected:
                print("✅ Connection test successful!")
            else:
                print("❌ Connection test failed")
        except Exception as e:
            print(f"❌ Connection error: {e}")
    else:
        print("\n⏭️  Skipping actual connection test (no credentials)")
    
    print("\n🎯 Features implemented:")
    print("   • Connection initialization with URL and key")
    print("   • Connection testing method")
    print("   • Error handling with retry logic (using backoff)")
    print("   • Schema caching for performance")
    print("   • Query builders for common operations")
    print("   • Transaction management for batch operations")
    print("   • Context manager support (with statement)")
    
    return manager

def demo_schema_manager():
    """Demonstrate SchemaManager functionality"""
    print("\n" + "=" * 60)
    print("DEMO: Schema Manager")
    print("=" * 60)
    
    # Check if schema file exists
    schema_file = "reports/supabase_schema.json"
    schema_path = Path(schema_file)
    
    if schema_path.exists():
        print(f"✅ Schema file found: {schema_file}")
        manager = SchemaManager(schema_file)
    else:
        print(f"⚠️  Schema file not found: {schema_file}")
        print("   Creating schema manager with empty schema...")
        manager = SchemaManager()
    
    # Show schema information
    print(f"\n📊 Schema Information:")
    print(f"   Tables loaded: {len(manager.schema)}")
    print(f"   Table names: {', '.join(manager.get_table_names())}")
    
    # Demonstrate lookup methods
    print("\n🔍 Lookup Methods Demo:")
    
    # Get table schema
    table_name = "accounts"
    table = manager.get_table(table_name)
    if table:
        print(f"   Table '{table_name}': Found")
        print(f"     Columns: {len(table.columns)}")
        print(f"     Primary keys: {table.primary_keys}")
        print(f"     Foreign keys: {len(table.foreign_keys)}")
    else:
        print(f"   Table '{table_name}': Not found in schema")
    
    # Get column
    column_name = "id"
    column = manager.get_column(table_name, column_name)
    if column:
        print(f"   Column '{table_name}.{column_name}': Found")
        print(f"     Data type: {column.data_type}")
        print(f"     Nullable: {column.nullable}")
    else:
        print(f"   Column '{table_name}.{column_name}': Not found")
    
    # Get foreign keys
    foreign_keys = manager.get_foreign_keys(table_name)
    print(f"   Foreign keys for '{table_name}': {len(foreign_keys)}")
    
    # Get required columns
    required_cols = manager.get_required_columns(table_name)
    print(f"   Required columns for '{table_name}': {required_cols}")
    
    print("\n🎯 Features implemented:")
    print("   • Load schema from Phase 0 output (JSON file)")
    print("   • Lookup methods: get_table(), get_column(), get_foreign_keys()")
    print("   • Data validation against schema")
    print("   • Schema export functionality")
    print("   • Foreign key relationship analysis")
    
    return manager

def demo_integration():
    """Demonstrate integration between connection and schema managers"""
    print("\n" + "=" * 60)
    print("DEMO: Integration Example")
    print("=" * 60)
    
    print("📋 Integration scenario:")
    print("   1. Load schema from file")
    print("   2. Connect to Supabase")
    print("   3. Validate data against schema")
    print("   4. Execute queries using schema information")
    
    print("\n💡 Example workflow:")
    print("   schema_manager = SchemaManager()")
    print("   connection_manager = SupabaseConnectionManager()")
    print("   ")
    print("   # Get table schema")
    print("   table_schema = schema_manager.get_table('transactions')")
    print("   ")
    print("   # Validate data before insert")
    print("   validation_result = schema_manager.validate_data('transactions', data_df)")
    print("   ")
    print("   if validation_result.is_valid:")
    print("       # Execute query using connection manager")
    print("       result = connection_manager.execute_query('transactions', 'insert', data=data)")
    print("   ")
    print("   # Get schema from database (cached)")
    print("   db_schema = connection_manager.get_schema()")
    
    print("\n✅ Integration ready for use in migration pipeline")

def main():
    """Main demo function"""
    print("🚀 Excel Data Migration - Task 2 Implementation Demo")
    print("   Supabase Connection and Schema Analysis")
    print()
    
    # Demo Supabase Connection Manager
    connection_manager = demo_supabase_connection()
    
    # Demo Schema Manager
    schema_manager = demo_schema_manager()
    
    # Demo Integration
    demo_integration()
    
    print("\n" + "=" * 60)
    print("✅ Task 2 Implementation Complete")
    print("=" * 60)
    print("\n📋 What was implemented:")
    print("   1. SupabaseConnectionManager class with:")
    print("      • Connection initialization and testing")
    print("      • Error handling with retry logic")
    print("      • Schema caching and query builders")
    print("      • Batch operation support")
    print()
    print("   2. SchemaManager class with:")
    print("      • Schema loading from Phase 0 outputs")
    print("      • Lookup methods for tables, columns, foreign keys")
    print("      • Data validation against schema")
    print("      • Schema analysis tools")
    print()
    print("🎯 Ready for next tasks:")
    print("   • Task 3: Excel reading and structure analysis")
    print("   • Task 5: Transaction grouping logic")
    print("   • Task 6: Data comparison and mapping")

if __name__ == "__main__":
    main()