#!/usr/bin/env python3
"""
Scan Supabase Schema - Complete Database Discovery
Connects to the Supabase project and discovers all tables, columns, and schema details.
"""

import os
import sys
import json
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# Load environment variables from .env.local (production credentials)
# Clear existing env vars first to avoid conflicts
for key in list(os.environ.keys()):
    if 'SUPABASE' in key:
        del os.environ[key]

load_dotenv('.env.local', override=True)

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("❌ Missing Supabase credentials in .env")
    sys.exit(1)

# Extract connection details from Supabase URL
# Format: https://[project-id].supabase.co
project_id = SUPABASE_URL.split('//')[1].split('.')[0]

print(f"🔍 Scanning Supabase Project: {project_id}")
print(f"📍 URL: {SUPABASE_URL}")
print("=" * 70)

try:
    # Connect to Supabase PostgreSQL
    # Supabase provides PostgreSQL connection at: [project-id].supabase.co:5432
    conn = psycopg2.connect(
        host=f"{project_id}.supabase.co",
        port=5432,
        database="postgres",
        user="postgres",
        password=SUPABASE_SERVICE_ROLE_KEY,
        sslmode="require"
    )
    
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    print("\n✅ Connected to Supabase PostgreSQL")
    
    # 1. List all tables
    print("\n" + "=" * 70)
    print("📋 ALL TABLES IN PUBLIC SCHEMA")
    print("=" * 70)
    
    cursor.execute("""
        SELECT 
          table_name,
          table_type,
          table_schema
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    """)
    
    tables = cursor.fetchall()
    if tables:
        print(f"\nFound {len(tables)} tables:\n")
        for table in tables:
            print(f"  • {table['table_name']}")
    else:
        print("\n❌ No tables found in public schema")
    
    # 2. Check transactions table
    print("\n" + "=" * 70)
    print("🔎 TRANSACTIONS TABLE SCHEMA")
    print("=" * 70)
    
    cursor.execute("""
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transactions'
        ORDER BY ordinal_position
    """)
    
    tx_columns = cursor.fetchall()
    if tx_columns:
        print(f"\n✅ transactions table EXISTS with {len(tx_columns)} columns:\n")
        for col in tx_columns:
            nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
            default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
            print(f"  • {col['column_name']:<30} {col['data_type']:<20} {nullable}{default}")
    else:
        print("\n❌ transactions table DOES NOT EXIST")
    
    # 3. Check transaction_lines table
    print("\n" + "=" * 70)
    print("🔎 TRANSACTION_LINES TABLE SCHEMA")
    print("=" * 70)
    
    cursor.execute("""
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transaction_lines'
        ORDER BY ordinal_position
    """)
    
    lines_columns = cursor.fetchall()
    if lines_columns:
        print(f"\n✅ transaction_lines table EXISTS with {len(lines_columns)} columns:\n")
        for col in lines_columns:
            nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
            default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
            print(f"  • {col['column_name']:<30} {col['data_type']:<20} {nullable}{default}")
    else:
        print("\n❌ transaction_lines table DOES NOT EXIST")
    
    # 4. Check for transaction-related tables
    print("\n" + "=" * 70)
    print("🔎 TRANSACTION-RELATED TABLES")
    print("=" * 70)
    
    cursor.execute("""
        SELECT 
          table_name
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND (table_name LIKE '%transaction%' OR table_name LIKE '%trans%')
        ORDER BY table_name
    """)
    
    tx_tables = cursor.fetchall()
    if tx_tables:
        print(f"\nFound {len(tx_tables)} transaction-related tables:\n")
        for table in tx_tables:
            print(f"  • {table['table_name']}")
    else:
        print("\n❌ No transaction-related tables found")
    
    # 5. Check indexes on transactions tables
    print("\n" + "=" * 70)
    print("📑 INDEXES ON TRANSACTIONS TABLES")
    print("=" * 70)
    
    cursor.execute("""
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public' 
          AND (tablename = 'transactions' OR tablename = 'transaction_lines')
        ORDER BY tablename, indexname
    """)
    
    indexes = cursor.fetchall()
    if indexes:
        print(f"\nFound {len(indexes)} indexes:\n")
        for idx in indexes:
            print(f"  • {idx['tablename']}.{idx['indexname']}")
    else:
        print("\n❌ No indexes found on transactions tables")
    
    # 6. Check RLS policies
    print("\n" + "=" * 70)
    print("🔐 ROW LEVEL SECURITY POLICIES")
    print("=" * 70)
    
    cursor.execute("""
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          qual,
          with_check
        FROM pg_policies 
        WHERE schemaname = 'public'
          AND (tablename = 'transactions' OR tablename = 'transaction_lines')
        ORDER BY tablename, policyname
    """)
    
    policies = cursor.fetchall()
    if policies:
        print(f"\nFound {len(policies)} RLS policies:\n")
        for policy in policies:
            print(f"  • {policy['tablename']}.{policy['policyname']} ({policy['permissive']})")
    else:
        print("\n❌ No RLS policies found on transactions tables")
    
    # 7. Summary
    print("\n" + "=" * 70)
    print("📊 SCHEMA SUMMARY")
    print("=" * 70)
    
    print(f"\nTotal tables in public schema: {len(tables)}")
    print(f"transactions table exists: {'✅ YES' if tx_columns else '❌ NO'}")
    print(f"transaction_lines table exists: {'✅ YES' if lines_columns else '❌ NO'}")
    print(f"Transaction-related tables: {len(tx_tables)}")
    print(f"Indexes on transactions tables: {len(indexes)}")
    print(f"RLS policies on transactions tables: {len(policies)}")
    
    # 8. Recommendations
    print("\n" + "=" * 70)
    print("💡 RECOMMENDATIONS")
    print("=" * 70)
    
    if not tx_columns and not lines_columns:
        print("\n⚠️  SCHEMA INCOMPLETE - Missing transactions tables!")
        print("\nAction required:")
        print("  1. Deploy the migration: supabase/migrations/20260214_create_transactions_schema.sql")
        print("  2. Or run: node scripts/deploy-transactions-schema.js")
    elif tx_columns and lines_columns:
        print("\n✅ SCHEMA COMPLETE - Both tables exist!")
        print("\nNext steps:")
        print("  1. Verify column names match the Excel mapping")
        print("  2. Run the Excel data migration: python migrate.py")
    else:
        print("\n⚠️  SCHEMA INCOMPLETE - Only one table exists!")
        print(f"  Missing: {'transaction_lines' if tx_columns else 'transactions'}")
    
    cursor.close()
    conn.close()
    
except psycopg2.Error as e:
    print(f"\n❌ Database connection error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Error: {e}")
    sys.exit(1)

print("\n" + "=" * 70)
print("✅ Schema scan complete!")
print("=" * 70)
