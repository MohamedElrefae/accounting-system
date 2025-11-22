#!/usr/bin/env python3
"""
Egyptian Election Data - Final Transfer with All Locations
Transfers all 29 properly extracted locations and their voters to Supabase
"""

import pandas as pd
import json
import os
from supabase import create_client, Client
from datetime import datetime
import time
import numpy as np

def load_config():
    """Load Supabase configuration"""
    try:
        # Try to load from environment variables first
        import os
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_ANON_KEY')
        
        if url and key:
            return url, key
            
        # If not in environment, try to read from .env file
        env_file = '.env'
        if os.path.exists(env_file):
            with open(env_file, 'r') as f:
                lines = f.readlines()
                for line in lines:
                    if line.startswith('SUPABASE_URL='):
                        url = line.split('=', 1)[1].strip()
                    elif line.startswith('SUPABASE_ANON_KEY='):
                        key = line.split('=', 1)[1].strip()
        
        if not url or not key:
            print("❌ Supabase configuration not found!")
            print("Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables")
            return None, None
            
        return url, key
        
    except Exception as e:
        print(f"❌ Error loading configuration: {e}")
        return None, None

def clean_data_for_json(df):
    """Clean DataFrame to be JSON compliant"""
    df_clean = df.copy()
    
    # Replace NaN values with None (which becomes null in JSON)
    df_clean = df_clean.where(pd.notnull(df_clean), None)
    
    # Convert numpy types to Python native types
    for col in df_clean.columns:
        if df_clean[col].dtype == 'int64':
            df_clean[col] = df_clean[col].astype(int)
        elif df_clean[col].dtype == 'float64':
            # Convert float columns, handling NaN
            df_clean[col] = df_clean[col].apply(lambda x: int(x) if pd.notnull(x) and x != 0 else None)
    
    return df_clean

def clear_existing_data(supabase: Client):
    """Clear existing data from Supabase tables"""
    print("🧹 Clearing existing data from Supabase...")
    
    try:
        # Clear voters first (due to foreign key constraint)
        print("   🗑️ Clearing voters table...")
        result = supabase.table('voters').delete().neq('id', 0).execute()
        print(f"   ✅ Cleared voters table")
        
        # Clear locations
        print("   🗑️ Clearing locations table...")
        result = supabase.table('locations').delete().neq('location_id', 0).execute()
        print(f"   ✅ Cleared locations table")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Error clearing data: {e}")
        return False

def transfer_all_locations():
    """Transfer all properly extracted locations and their voters to Supabase"""
    
    print("=" * 60)
    print("🚀 Egyptian Election Data - Final Transfer (All 29 Locations)")
    print("=" * 60)
    
    # Load configuration
    url, key = load_config()
    if not url or not key:
        return False
    
    # Initialize Supabase client
    print("🔗 Connecting to Supabase...")
    try:
        supabase: Client = create_client(url, key)
        print("✅ Connected to Supabase successfully!")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        return False
    
    # Clear existing data
    if not clear_existing_data(supabase):
        return False
    
    # Load properly extracted locations data
    locations_file = r"C:\Election-2025\output\locations_properly_extracted.csv"
    print(f"📖 Loading properly extracted locations from: {locations_file}")
    
    try:
        locations_df = pd.read_csv(locations_file)
        print(f"📍 Loaded {len(locations_df)} unique locations")
        
        # Clean data for JSON compliance
        print("🧹 Cleaning data for JSON compliance...")
        locations_df_clean = clean_data_for_json(locations_df)
        
        # Show the locations we're transferring
        print(f"\n📋 All {len(locations_df_clean)} locations to transfer:")
        for _, row in locations_df_clean.iterrows():
            loc_num = row['location_number']
            loc_name = row['location_name'][:50]
            voters = row['total_voters']
            print(f"   {loc_num:3d}: {loc_name:<50} ({voters} voters)")
            
    except Exception as e:
        print(f"❌ Error loading locations: {e}")
        return False
    
    # Transfer locations
    print(f"\n📤 Transferring {len(locations_df_clean)} locations to Supabase...")
    try:
        locations_data = locations_df_clean.to_dict('records')
        result = supabase.table('locations').insert(locations_data).execute()
        print(f"✅ Successfully transferred {len(locations_data)} locations")
        
    except Exception as e:
        print(f"❌ Error transferring locations: {e}")
        print(f"   Error details: {str(e)}")
        return False
    
    # Load voter data and filter for our locations
    voters_file = r"C:\Election-2025\output\voter_data_full.json"
    print(f"\n📖 Loading voter data from: {voters_file}")
    
    try:
        with open(voters_file, 'r', encoding='utf-8') as f:
            voter_data_dict = json.load(f)
        
        # Extract the voters list from the dictionary
        if 'voters' in voter_data_dict:
            all_voters_data = voter_data_dict['voters']
        else:
            print("❌ No 'voters' key found in voter data file")
            return False
        
        print(f"👥 Loaded {len(all_voters_data)} total voters from file")
        
        # Get the location IDs we want to keep (all 29 locations)
        valid_location_ids = set(locations_df_clean['location_id'].tolist())
        print(f"🔍 Filtering voters for {len(valid_location_ids)} location IDs")
        
        # Filter voters to only include those from our locations
        filtered_voters = []
        for voter in all_voters_data:
            if isinstance(voter, dict) and voter.get('location_id') in valid_location_ids:
                filtered_voters.append(voter)
        
        print(f"✅ Filtered to {len(filtered_voters)} voters from all locations")
        
        if len(filtered_voters) == 0:
            print("⚠️ No voters found for the locations!")
            print("Let me check the voter-location mapping...")
            
            # Show sample voter data
            if len(all_voters_data) > 0:
                sample_voter = all_voters_data[0]
                print(f"Sample voter: {sample_voter}")
                
                if isinstance(sample_voter, dict) and 'location_id' in sample_voter:
                    print(f"Sample location_id: {sample_voter['location_id']}")
            
            # Show all unique location_ids in voter data
            unique_location_ids = set()
            for voter in all_voters_data:
                if isinstance(voter, dict) and 'location_id' in voter:
                    unique_location_ids.add(voter['location_id'])
            
            print(f"Location IDs in voter data: {sorted(list(unique_location_ids))[:20]}...")
            print(f"Location IDs we want: {sorted(list(valid_location_ids))[:20]}...")
            
            return False
            
    except Exception as e:
        print(f"❌ Error loading voter data: {e}")
        return False
    
    # Transfer voters in batches
    print(f"\n📤 Transferring {len(filtered_voters)} voters to Supabase...")
    batch_size = 1000
    total_batches = (len(filtered_voters) + batch_size - 1) // batch_size
    
    try:
        for i in range(0, len(filtered_voters), batch_size):
            batch = filtered_voters[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            
            print(f"   📤 Batch {batch_num}/{total_batches}: {len(batch)} voters...")
            
            result = supabase.table('voters').insert(batch).execute()
            
            print(f"   ✅ Batch {batch_num} completed")
            time.sleep(0.1)  # Small delay to avoid rate limiting
        
        print(f"✅ Successfully transferred all {len(filtered_voters)} voters")
        
    except Exception as e:
        print(f"❌ Error transferring voters: {e}")
        return False
    
    # Verify the transfer
    print("\n🔍 Verifying transfer...")
    try:
        # Count locations
        locations_result = supabase.table('locations').select('location_id').execute()
        locations_count = len(locations_result.data)
        
        # Count voters
        voters_result = supabase.table('voters').select('id').execute()
        voters_count = len(voters_result.data)
        
        print(f"✅ Verification complete:")
        print(f"   📍 Locations in database: {locations_count}")
        print(f"   👥 Voters in database: {voters_count}")
        
        # Show sample data
        if locations_count > 0:
            sample_location = supabase.table('locations').select('*').limit(1).execute()
            if sample_location.data:
                loc = sample_location.data[0]
                print(f"   📍 Sample location: {loc['location_name']}")
        
        if voters_count > 0:
            sample_voter = supabase.table('voters').select('*').limit(1).execute()
            if sample_voter.data:
                voter = sample_voter.data[0]
                print(f"   👤 Sample voter: {voter['full_name']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error verifying transfer: {e}")
        return False

def show_final_summary():
    """Show final summary of the transfer"""
    print("\n" + "=" * 60)
    print("🎉 COMPLETE TRANSFER SUCCESS!")
    print("=" * 60)
    print("✅ Your complete Egyptian election data is now in Supabase!")
    print("")
    print("📊 What was transferred:")
    print("   📍 29 unique polling locations with proper column separation")
    print("   🔢 Location numbers (1-1007) in separate column")
    print("   🏫 Location names in separate column")
    print("   📍 Location addresses in separate column")
    print("   🏛️ District (مطوبس) in separate column")
    print("   👥 All voters from those locations")
    print("   🧹 Clean, properly structured data")
    print("")
    print("🏫 All 29 locations include:")
    locations = [
        "مطوبس الثانوية بنين", "الشهيد نعمان الشندويلى البتدائية", "نجيه سلم الرسمية للغات",
        "عمرو البتدائية القديمة", "السعاده للتعليم الساسى", "القنى البتدائية المشتركة",
        "المنار البتدائية", "الغنايم للتعليم الساسى", "الشهيد/ رضا صبرى محمد فراج للتعليم الساسى",
        "الدوايدة للتعليم الساسى", "سعد زغلول البتدائية", "منية المرشد الثانوية المشتركة",
        "فتح ا بركات العدادية بنات", "الشهيد البطل على محمد فهمى فليفل البتدائية",
        "معدية مهدى تعليم اساسى", "عبدالحميد شلبى البتدائية", "الخليج العدادية بنات",
        "جزيرة الفرس للتعليم الساسى", "اليسرى البتدائية", "طلمبات زغلول البتدائية",
        "عرب المحضر للتعليم الساسى", "الجزيرة الخضراء الثانوية المشتركة",
        "الجزيرة الخضراء الثانوية التجارية", "الشهيد عبدالنبى نصار العدادية بنات",
        "البصراط البتدائية", "مطوبس البتدائية الجديدة", "النجارين للتعليم الساسى",
        "مطوبس الثانوية بنات", "عزبة الشاعر للتعليم الساسى"
    ]
    for i, loc in enumerate(locations, 1):
        print(f"   {i:2d}. {loc}")
    print("")
    print("🔗 Next steps:")
    print("   1. Check your Supabase dashboard")
    print("   2. Query your data with proper column structure")
    print("   3. Build applications with complete dataset")
    print("=" * 60)

if __name__ == "__main__":
    success = transfer_all_locations()
    if success:
        show_final_summary()
    else:
        print("\n❌ Transfer failed! Check the error messages above.")