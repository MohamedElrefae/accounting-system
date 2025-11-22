#!/usr/bin/env python3
"""
Transfer extracted Egyptian voter data to Supabase
"""

import pandas as pd
import os
from supabase import create_client, Client
import json
from typing import List, Dict
import time
from pathlib import Path

class SupabaseDataTransfer:
    def __init__(self, supabase_url: str, supabase_key: str):
        """Initialize Supabase client"""
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
    def load_csv_data(self, data_dir: str = "output"):
        """Load the cleaned CSV data"""
        locations_path = Path(data_dir) / "locations_cleaned.csv"
        voters_path = Path(data_dir) / "voters_cleaned.csv"
        
        if not locations_path.exists() or not voters_path.exists():
            raise FileNotFoundError("Cleaned CSV files not found. Run the extraction first.")
        
        print("Loading CSV data...")
        locations_df = pd.read_csv(locations_path)
        voters_df = pd.read_csv(voters_path)
        
        print(f"Loaded {len(locations_df)} locations and {len(voters_df)} voters")
        return locations_df, voters_df
    
    def prepare_locations_data(self, locations_df: pd.DataFrame) -> List[Dict]:
        """Prepare locations data for Supabase insertion"""
        locations_data = []
        
        for _, row in locations_df.iterrows():
            location = {
                'location_id': int(row['location_id']),
                'location_number': str(row['location_number']) if pd.notna(row['location_number']) else '',
                'location_name': str(row['location_name']) if pd.notna(row['location_name']) else '',
                'location_address': str(row['location_address']) if pd.notna(row['location_address']) else '',
                'governorate': str(row['governorate']) if pd.notna(row['governorate']) else 'كفر الشيخ',
                'district': str(row['district']) if pd.notna(row['district']) else 'مطوبس',
                'main_committee_id': str(row['main_committee_id']) if pd.notna(row['main_committee_id']) else '',
                'police_department': str(row['police_department']) if pd.notna(row['police_department']) else '',
                'total_voters': int(row['total_voters']) if pd.notna(row['total_voters']) else 0
            }
            locations_data.append(location)
        
        return locations_data
    
    def prepare_voters_data(self, voters_df: pd.DataFrame) -> List[Dict]:
        """Prepare voters data for Supabase insertion"""
        voters_data = []
        
        for _, row in voters_df.iterrows():
            voter = {
                'voter_id': int(row['voter_id']),
                'full_name': str(row['full_name']),
                'location_id': int(row['location_id']),
                'source_page': int(row['source_page']) if pd.notna(row['source_page']) else None
            }
            voters_data.append(voter)
        
        return voters_data
    
    def insert_locations(self, locations_data: List[Dict], batch_size: int = 100):
        """Insert locations data in batches"""
        print(f"Inserting {len(locations_data)} locations...")
        
        total_batches = (len(locations_data) + batch_size - 1) // batch_size
        
        for i in range(0, len(locations_data), batch_size):
            batch = locations_data[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            
            try:
                result = self.supabase.table('locations').upsert(batch).execute()
                print(f"Batch {batch_num}/{total_batches}: Inserted {len(batch)} locations")
                time.sleep(0.1)  # Small delay to avoid rate limiting
                
            except Exception as e:
                print(f"Error inserting locations batch {batch_num}: {e}")
                # Continue with next batch
                continue
    
    def insert_voters(self, voters_data: List[Dict], batch_size: int = 1000):
        """Insert voters data in batches"""
        print(f"Inserting {len(voters_data)} voters...")
        
        total_batches = (len(voters_data) + batch_size - 1) // batch_size
        
        for i in range(0, len(voters_data), batch_size):
            batch = voters_data[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            
            try:
                result = self.supabase.table('voters').upsert(batch).execute()
                print(f"Batch {batch_num}/{total_batches}: Inserted {len(batch)} voters")
                time.sleep(0.2)  # Small delay to avoid rate limiting
                
            except Exception as e:
                print(f"Error inserting voters batch {batch_num}: {e}")
                # Continue with next batch
                continue
    
    def verify_data_transfer(self):
        """Verify the data was transferred correctly"""
        print("\nVerifying data transfer...")
        
        try:
            # Count locations
            locations_result = self.supabase.table('locations').select('location_id', count='exact').execute()
            locations_count = locations_result.count
            
            # Count voters
            voters_result = self.supabase.table('voters').select('id', count='exact').execute()
            voters_count = voters_result.count
            
            print(f"✅ Locations in database: {locations_count}")
            print(f"✅ Voters in database: {voters_count}")
            
            # Get sample data
            sample_locations = self.supabase.table('locations').select('*').limit(3).execute()
            sample_voters = self.supabase.table('voters').select('*').limit(5).execute()
            
            print("\n📍 Sample locations:")
            for loc in sample_locations.data:
                print(f"  ID: {loc['location_id']}, Name: {loc['location_name']}, Voters: {loc['total_voters']}")
            
            print("\n👥 Sample voters:")
            for voter in sample_voters.data:
                print(f"  ID: {voter['voter_id']}, Name: {voter['full_name']}, Location: {voter['location_id']}")
            
            return locations_count, voters_count
            
        except Exception as e:
            print(f"❌ Error verifying data: {e}")
            return 0, 0
    
    def get_statistics(self):
        """Get database statistics"""
        try:
            stats_result = self.supabase.table('election_statistics').select('*').execute()
            
            if stats_result.data:
                stats = stats_result.data[0]
                print(f"\n📊 Database Statistics:")
                print(f"  Total Locations: {stats['total_locations']}")
                print(f"  Total Voters: {stats['total_voters']}")
                print(f"  Governorate: {stats['governorate']}")
                print(f"  District: {stats['district']}")
                print(f"  Average Voters per Location: {stats['avg_voters_per_location']}")
                print(f"  Min Voters per Location: {stats['min_voters_per_location']}")
                print(f"  Max Voters per Location: {stats['max_voters_per_location']}")
            
        except Exception as e:
            print(f"Error getting statistics: {e}")

def main():
    """Main transfer function"""
    print("🚀 Starting Supabase data transfer...")
    
    # Get Supabase credentials from environment variables
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_ANON_KEY')  # or SUPABASE_SERVICE_KEY for service role
    
    if not supabase_url or not supabase_key:
        print("❌ Error: Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables")
        print("\nExample:")
        print("set SUPABASE_URL=https://your-project.supabase.co")
        print("set SUPABASE_ANON_KEY=your-anon-key")
        return 1
    
    try:
        # Initialize transfer client
        transfer = SupabaseDataTransfer(supabase_url, supabase_key)
        
        # Load CSV data
        locations_df, voters_df = transfer.load_csv_data("output")
        
        # Prepare data
        print("Preparing data for transfer...")
        locations_data = transfer.prepare_locations_data(locations_df)
        voters_data = transfer.prepare_voters_data(voters_df)
        
        # Transfer data
        print("\n📤 Starting data transfer...")
        transfer.insert_locations(locations_data)
        transfer.insert_voters(voters_data)
        
        # Verify transfer
        locations_count, voters_count = transfer.verify_data_transfer()
        
        # Get statistics
        transfer.get_statistics()
        
        print(f"\n✅ Data transfer completed successfully!")
        print(f"   Transferred {locations_count} locations and {voters_count} voters")
        
        return 0
        
    except Exception as e:
        print(f"❌ Transfer failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())