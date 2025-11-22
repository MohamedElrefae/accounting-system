#!/usr/bin/env python3
"""
Verify the final transferred data
"""

import os
from supabase import create_client, Client

def verify_data():
    """Verify the transferred data"""
    
    print("🔍 Verifying Final Transferred Data")
    print("=" * 50)
    
    # Connect to Supabase
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_ANON_KEY')
    
    if not url or not key:
        print("❌ Supabase config not found")
        return
    
    supabase: Client = create_client(url, key)
    
    # Get all locations
    result = supabase.table('locations').select('*').order('location_number').execute()
    locations = result.data
    
    print(f"📍 Total locations: {len(locations)}")
    print(f"👥 Total voters: {sum(loc['total_voters'] for loc in locations):,}")
    
    print(f"\n📋 All locations in database:")
    for loc in locations:
        loc_num = loc['location_number']
        loc_name = loc['location_name'][:50]
        voters = loc['total_voters']
        print(f"   #{loc_num:3}: {loc_name:<50} ({voters} voters)")
    
    # Check key locations
    print(f"\n🎯 Key locations from screenshot:")
    key_numbers = [77, 78, 92]
    
    for key_num in key_numbers:
        found = False
        for loc in locations:
            if str(loc['location_number']) == str(key_num) or loc['location_number'] == key_num:
                print(f"   ✅ #{key_num}: {loc['location_name']}")
                found = True
                break
        if not found:
            print(f"   ❌ #{key_num}: Not found")
    
    # Show database structure
    if locations:
        print(f"\n📊 Database structure:")
        sample = locations[0]
        for key, value in sample.items():
            print(f"   - {key}: {type(value).__name__}")

if __name__ == "__main__":
    verify_data()