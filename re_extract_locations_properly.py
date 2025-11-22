#!/usr/bin/env python3
"""
Egyptian Election Data - Proper Location Re-extraction
Re-extracts location data with proper column separation:
- location_number (like 92, 77, 78, etc.)
- location_name (school names)
- location_address (detailed addresses)
- district (مطوبس)
"""

import pandas as pd
import json
import re
import os
from datetime import datetime

def re_extract_locations():
    """Re-extract locations with proper column separation"""
    
    print("=" * 60)
    print("🔄 Egyptian Election Data - Proper Location Re-extraction")
    print("=" * 60)
    
    # Check if we have the original voter data file
    voter_data_file = r"C:\Election-2025\output\voter_data_full.json"
    
    if not os.path.exists(voter_data_file):
        print(f"❌ Voter data file not found: {voter_data_file}")
        return False
    
    print("📖 Loading original voter data...")
    try:
        with open(voter_data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if 'locations' not in data:
            print("❌ No 'locations' key found in data")
            return False
        
        locations_data = data['locations']
        print(f"📍 Found {len(locations_data)} location records in original data")
        
    except Exception as e:
        print(f"❌ Error loading voter data: {e}")
        return False
    
    # Process each location to extract proper fields
    print("\n🔍 Processing locations to extract proper fields...")
    
    processed_locations = []
    location_names_found = set()
    
    for i, location in enumerate(locations_data):
        try:
            # Extract basic info
            location_id = location.get('location_id', i + 1)
            raw_name = location.get('location_name', '').strip()
            raw_address = location.get('location_address', '').strip()
            total_voters = location.get('total_voters', 0)
            
            # Skip empty records
            if not raw_name and not raw_address:
                continue
            
            # Try to extract location number from various sources
            location_number = None
            
            # Method 1: Look for number in the raw data
            if 'location_number' in location and location['location_number']:
                location_number = location['location_number']
            
            # Method 2: Extract from committee info or other fields
            if not location_number:
                # Look for numbers in committee_id or other fields
                for field in ['main_committee_id', 'committee_id', 'page_number']:
                    if field in location and location[field]:
                        try:
                            location_number = int(location[field])
                            break
                        except:
                            pass
            
            # Method 3: Use location_id as fallback
            if not location_number:
                location_number = location_id
            
            # Clean and separate location name and address
            location_name = raw_name if raw_name else "غير محدد"
            location_address = raw_address if raw_address else "غير محدد"
            
            # If we have a combined field, try to separate
            if raw_name and not raw_address:
                # Sometimes name and address are combined
                parts = raw_name.split('،')
                if len(parts) > 1:
                    location_name = parts[0].strip()
                    location_address = '،'.join(parts[1:]).strip()
            
            # Standard fields
            governorate = location.get('governorate', 'كفر الشيخ')
            district = location.get('district', 'مطوبس')
            
            # Create processed location record
            processed_location = {
                'location_id': location_id,
                'location_number': location_number,
                'location_name': location_name,
                'location_address': location_address,
                'governorate': governorate,
                'district': district,
                'main_committee_id': location.get('main_committee_id'),
                'police_department': location.get('police_department'),
                'total_voters': total_voters
            }
            
            # Only add if we have a meaningful location name
            if location_name and location_name != "غير محدد" and location_name not in location_names_found:
                processed_locations.append(processed_location)
                location_names_found.add(location_name)
                
                # Show progress for first few
                if len(processed_locations) <= 10:
                    print(f"   ✅ {location_number:3d}: {location_name[:50]}")
            
        except Exception as e:
            print(f"   ⚠️ Error processing location {i}: {e}")
            continue
    
    print(f"\n📊 Processed {len(processed_locations)} unique locations")
    
    # Create DataFrame and save
    df = pd.DataFrame(processed_locations)
    
    # Sort by location_number
    df = df.sort_values('location_number').reset_index(drop=True)
    
    # Show statistics
    print(f"\n📈 Location Statistics:")
    print(f"   📍 Total unique locations: {len(df)}")
    print(f"   👥 Total voters: {df['total_voters'].sum():,}")
    print(f"   📊 Average voters per location: {df['total_voters'].mean():.1f}")
    print(f"   🔢 Location numbers range: {df['location_number'].min()} - {df['location_number'].max()}")
    
    # Show sample of the data
    print(f"\n📋 Sample of extracted locations:")
    for _, row in df.head(15).iterrows():
        print(f"   {row['location_number']:3d}: {row['location_name'][:60]:<60} ({row['total_voters']} voters)")
    
    if len(df) > 15:
        print(f"   ... and {len(df) - 15} more locations")
    
    # Save the properly extracted data
    output_file = r"C:\Election-2025\output\locations_properly_extracted.csv"
    print(f"\n💾 Saving properly extracted data to: {output_file}")
    
    try:
        df.to_csv(output_file, index=False, encoding='utf-8')
        print("✅ Data saved successfully!")
        
        # Verify the saved file
        verify_df = pd.read_csv(output_file)
        print(f"✅ Verification: {len(verify_df)} records saved")
        
        return True
        
    except Exception as e:
        print(f"❌ Error saving file: {e}")
        return False

def show_extraction_summary():
    """Show summary of the re-extraction"""
    
    output_file = r"C:\Election-2025\output\locations_properly_extracted.csv"
    
    if os.path.exists(output_file):
        df = pd.read_csv(output_file)
        
        print("\n" + "=" * 60)
        print("📊 RE-EXTRACTION SUMMARY")
        print("=" * 60)
        print(f"📍 Total locations extracted: {len(df):,}")
        print(f"👥 Total voters: {df['total_voters'].sum():,}")
        print(f"🔢 Location numbers: {df['location_number'].min()} to {df['location_number'].max()}")
        print(f"📈 Average voters per location: {df['total_voters'].mean():.1f}")
        
        # Show unique location names
        unique_names = df['location_name'].unique()
        print(f"\n📋 Sample location names found:")
        for i, name in enumerate(sorted(unique_names)[:20]):
            print(f"   {i+1:2d}. {name}")
        
        if len(unique_names) > 20:
            print(f"   ... and {len(unique_names) - 20} more locations")
        
        print("=" * 60)

if __name__ == "__main__":
    success = re_extract_locations()
    if success:
        show_extraction_summary()
        print("\n🎉 Location re-extraction completed successfully!")
        print("📁 File created: locations_properly_extracted.csv")
        print("🚀 Ready for clean transfer to Supabase!")
    else:
        print("\n❌ Location re-extraction failed!")