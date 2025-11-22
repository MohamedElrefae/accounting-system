#!/usr/bin/env python3
"""
Simple Supabase data transfer for Egyptian voter data
"""

import csv
import os
from supabase import create_client, Client
import time

def transfer_data_to_supabase():
    """Transfer CSV data to Supabase"""
    
    # Get Supabase credentials
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_key:
        print('❌ Error: Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables')
        print('\nExample:')
        print('set SUPABASE_URL=https://your-project.supabase.co')
        print('set SUPABASE_ANON_KEY=your-anon-key')
        return False
    
    print('🚀 Connecting to Supabase...')
    try:
        supabase = create_client(supabase_url, supabase_key)
    except Exception as e:
        print(f'❌ Failed to connect to Supabase: {e}')
        return False
    
    # Check if CSV files exist
    if not os.path.exists('output/locations_cleaned.csv'):
        print('❌ Error: locations_cleaned.csv not found. Run the PDF extraction first.')
        return False
    
    if not os.path.exists('output/voters_cleaned.csv'):
        print('❌ Error: voters_cleaned.csv not found. Run the PDF extraction first.')
        return False
    
    # Load and transfer locations
    print('📍 Loading locations data...')
    locations = []
    
    try:
        with open('output/locations_cleaned.csv', 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                location = {
                    'location_id': int(row['location_id']),
                    'location_number': row['location_number'] or '',
                    'location_name': row['location_name'] or '',
                    'location_address': row['location_address'] or '',
                    'governorate': row['governorate'] or 'كفر الشيخ',
                    'district': row['district'] or 'مطوبس',
                    'main_committee_id': row['main_committee_id'] or '',
                    'police_department': row['police_department'] or '',
                    'total_voters': int(row['total_voters']) if row['total_voters'] else 0
                }
                locations.append(location)
        
        print(f'📤 Transferring {len(locations)} locations...')
        
        # Transfer locations in batches
        batch_size = 100
        for i in range(0, len(locations), batch_size):
            batch = locations[i:i + batch_size]
            try:
                result = supabase.table('locations').upsert(batch).execute()
                print(f'  ✅ Batch {i//batch_size + 1}: {len(batch)} locations')
                time.sleep(0.1)
            except Exception as e:
                print(f'  ❌ Error in locations batch {i//batch_size + 1}: {e}')
                continue
        
    except Exception as e:
        print(f'❌ Error loading locations: {e}')
        return False
    
    # Load and transfer voters (sample first, then ask for full transfer)
    print('👥 Loading voters data...')
    voters = []
    total_voters = 0
    
    try:
        # Count total voters first
        with open('output/voters_cleaned.csv', 'r', encoding='utf-8-sig') as f:
            total_voters = sum(1 for line in f) - 1  # Subtract header
        
        print(f'Found {total_voters:,} total voters')
        
        # Ask user if they want to transfer all or sample
        response = input('Transfer all voters? (y/n, default=sample 10k): ').lower().strip()
        
        if response == 'y' or response == 'yes':
            max_voters = total_voters
            print(f'📤 Transferring ALL {total_voters:,} voters...')
        else:
            max_voters = 10000
            print(f'📤 Transferring sample of {max_voters:,} voters...')
        
        # Load voters
        count = 0
        with open('output/voters_cleaned.csv', 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if count >= max_voters:
                    break
                
                voter = {
                    'voter_id': int(row['voter_id']),
                    'full_name': row['full_name'],
                    'location_id': int(row['location_id']),
                    'source_page': int(row['source_page']) if row['source_page'] else None
                }
                voters.append(voter)
                count += 1
                
                # Show progress for large transfers
                if count % 10000 == 0:
                    print(f'  Loaded {count:,} voters...')
        
        # Transfer voters in batches
        batch_size = 1000
        total_batches = (len(voters) + batch_size - 1) // batch_size
        
        for i in range(0, len(voters), batch_size):
            batch = voters[i:i + batch_size]
            batch_num = i // batch_size + 1
            
            try:
                result = supabase.table('voters').upsert(batch).execute()
                print(f'  ✅ Batch {batch_num}/{total_batches}: {len(batch)} voters')
                time.sleep(0.2)
            except Exception as e:
                print(f'  ❌ Error in voters batch {batch_num}: {e}')
                continue
        
    except Exception as e:
        print(f'❌ Error loading voters: {e}')
        return False
    
    # Verify transfer
    print('🔍 Verifying transfer...')
    try:
        locations_result = supabase.table('locations').select('location_id', count='exact').execute()
        voters_result = supabase.table('voters').select('id', count='exact').execute()
        
        locations_count = locations_result.count
        voters_count = voters_result.count
        
        print(f'✅ Transfer complete!')
        print(f'   📍 Locations in database: {locations_count:,}')
        print(f'   👥 Voters in database: {voters_count:,}')
        
        # Show sample data
        sample_location = supabase.table('locations').select('*').limit(1).execute()
        if sample_location.data:
            loc = sample_location.data[0]
            print(f'   📍 Sample location: {loc["location_name"]} ({loc["total_voters"]} voters)')
        
        sample_voter = supabase.table('voters').select('*').limit(1).execute()
        if sample_voter.data:
            voter = sample_voter.data[0]
            print(f'   👤 Sample voter: {voter["full_name"]}')
        
        return True
        
    except Exception as e:
        print(f'❌ Verification failed: {e}')
        return False

def main():
    """Main function"""
    print('=' * 60)
    print('Egypt 2025 Election - Supabase Data Transfer')
    print('=' * 60)
    
    if transfer_data_to_supabase():
        print('\n🎉 SUCCESS! Your Egyptian voter data is now in Supabase!')
        print('\nYou can now:')
        print('1. Query your data in Supabase dashboard')
        print('2. Build applications using the Supabase API')
        print('3. Create reports and analytics')
    else:
        print('\n❌ Transfer failed. Please check your setup and try again.')
        print('\nMake sure:')
        print('1. You have run the PDF extraction first')
        print('2. Your Supabase credentials are set correctly')
        print('3. You have created the database tables in Supabase')

if __name__ == '__main__':
    main()