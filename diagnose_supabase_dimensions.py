#!/usr/bin/env python3
"""
DIAGNOSE SUPABASE DIMENSION DATA

This script checks:
1. Can we connect to Supabase?
2. What dimension records exist?
3. What org_ids are in the dimension tables?
4. Do the codes match what's in the CSV?
"""

import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Configuration
ORG_ID = "d5789445-11e3-4ad6-9297-b56521675114"

def get_supabase_client():
    """Get Supabase client from environment variables."""
    url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("VITE_SUPABASE_ANON_KEY")
    
    print(f"Supabase URL: {url[:30]}..." if url else "Supabase URL: NOT FOUND")
    print(f"Supabase Key: {key[:20]}..." if key else "Supabase Key: NOT FOUND")
    
    if not url or not key:
        print("\n❌ ERROR: Supabase credentials not found in environment")
        print("Please ensure .env.local has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY")
        return None
    
    return create_client(url, key)

def diagnose_table(supabase: Client, table_name: str, org_id: str):
    """Diagnose a single dimension table."""
    
    print(f"\n{'='*70}")
    print(f"TABLE: {table_name}")
    print(f"{'='*70}")
    
    try:
        # Check total count
        print(f"\n1. Total records in table:")
        response = supabase.table(table_name).select('id', count='exact').execute()
        print(f"   Total: {response.count}")
        
        # Check records for this org
        print(f"\n2. Records for org_id = {org_id}:")
        response = supabase.table(table_name)\
            .select('id, code, org_id')\
            .eq('org_id', org_id)\
            .execute()
        
        print(f"   Count: {len(response.data)}")
        
        if len(response.data) > 0:
            print(f"\n3. Sample records (first 10):")
            for i, row in enumerate(response.data[:10]):
                print(f"   {i+1}. code={row.get('code')}, id={row.get('id')}, org_id={row.get('org_id')}")
        else:
            print(f"\n3. ❌ NO RECORDS FOUND for org_id = {org_id}")
            
            # Check what org_ids exist
            print(f"\n4. What org_ids exist in this table?")
            response = supabase.table(table_name)\
                .select('org_id')\
                .execute()
            
            org_ids = set(row['org_id'] for row in response.data if row.get('org_id'))
            if org_ids:
                print(f"   Found {len(org_ids)} unique org_ids:")
                for org_id_found in list(org_ids)[:5]:
                    print(f"   - {org_id_found}")
            else:
                print(f"   No org_ids found (table might be empty)")
        
        return len(response.data)
        
    except Exception as e:
        print(f"\n❌ ERROR querying {table_name}: {e}")
        import traceback
        traceback.print_exc()
        return 0

def main():
    """Main diagnostic function."""
    
    print("="*70)
    print("SUPABASE DIMENSION DATA DIAGNOSTIC")
    print("="*70)
    
    # Load environment variables
    load_dotenv('.env.local')
    
    # Get Supabase client
    supabase = get_supabase_client()
    if not supabase:
        return False
    
    print(f"\n✅ Supabase client created successfully")
    print(f"\nSearching for org_id: {ORG_ID}")
    
    # Check each dimension table
    tables = [
        'transaction_classifications',
        'projects',
        'analysis_work_items',
        'sub_tree'
    ]
    
    results = {}
    for table in tables:
        count = diagnose_table(supabase, table, ORG_ID)
        results[table] = count
    
    # Summary
    print(f"\n{'='*70}")
    print("SUMMARY")
    print(f"{'='*70}")
    
    total_found = sum(results.values())
    
    if total_found == 0:
        print("\n❌ CRITICAL ISSUE: NO dimension records found for this org_id")
        print("\nPOSSIBLE CAUSES:")
        print("1. Wrong org_id - check if your organization uses a different UUID")
        print("2. Dimension tables are empty - need to populate them first")
        print("3. RLS policies blocking access - check Supabase policies")
        print("\nNEXT STEPS:")
        print("1. Run this SQL in Supabase to check org_ids:")
        print(f"   SELECT DISTINCT org_id FROM transaction_classifications;")
        print(f"   SELECT DISTINCT org_id FROM projects;")
        print(f"   SELECT DISTINCT org_id FROM analysis_work_items;")
        print(f"   SELECT DISTINCT org_id FROM sub_tree;")
        print("\n2. If tables are empty, you need to populate dimension data first")
        print("3. If org_id is different, update ORG_ID in the script")
    else:
        print(f"\n✅ Found {total_found} total dimension records:")
        for table, count in results.items():
            status = "✅" if count > 0 else "❌"
            print(f"   {status} {table}: {count} records")
    
    return total_found > 0

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
