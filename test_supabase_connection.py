#!/usr/bin/env python3
"""
Test Supabase connection and tables
"""

import os
from supabase import create_client

def test_supabase_connection():
    """Test if Supabase tables are working"""
    
    # Get credentials
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_key:
        print('❌ Environment variables not set')
        return False
    
    print(f'🔗 Connecting to: {supabase_url}')
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        
        # Test locations table
        print('📍 Testing locations table...')
        locations_result = supabase.table('locations').select('*').limit(5).execute()
        print(f'✅ Locations table works! Found {len(locations_result.data)} records')
        
        if locations_result.data:
            for loc in locations_result.data:
                print(f'   - Location {loc["location_id"]}: {loc["location_name"]}')
        
        # Test voters table
        print('👥 Testing voters table...')
        voters_result = supabase.table('voters').select('*').limit(3).execute()
        print(f'✅ Voters table works! Found {len(voters_result.data)} records')
        
        if voters_result.data:
            for voter in voters_result.data:
                print(f'   - Voter {voter["voter_id"]}: {voter["full_name"]}')
        
        # Test insert capability
        print('🧪 Testing insert capability...')
        test_location = {
            'location_id': 888888,
            'location_number': 'TEST2',
            'location_name': 'Test Insert Location',
            'governorate': 'كفر الشيخ',
            'district': 'مطوبس',
            'total_voters': 0
        }
        
        insert_result = supabase.table('locations').upsert(test_location).execute()
        print('✅ Insert test successful!')
        
        # Clean up test record
        supabase.table('locations').delete().eq('location_id', 888888).execute()
        print('🧹 Cleaned up test record')
        
        print('\n🎉 All tests passed! Your Supabase setup is working correctly.')
        return True
        
    except Exception as e:
        print(f'❌ Test failed: {e}')
        return False

if __name__ == '__main__':
    print('=' * 50)
    print('Supabase Connection Test')
    print('=' * 50)
    
    if test_supabase_connection():
        print('\n✅ Ready to transfer your voter data!')
    else:
        print('\n❌ Please fix the issues above before proceeding.')
        print('\nMake sure you:')
        print('1. Executed the SQL script in Supabase SQL Editor')
        print('2. Set your environment variables correctly')
        print('3. Have the correct permissions in your Supabase project')