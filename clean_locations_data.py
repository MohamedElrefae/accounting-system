#!/usr/bin/env python3
"""
Egyptian Election Data - Location Cleaner
Removes duplicate and incomplete location records
Keeps only complete records with location names and addresses
"""

import pandas as pd
import os
from datetime import datetime

def clean_locations_data():
    """Clean the locations data by removing duplicates and incomplete records"""
    
    print("=" * 60)
    print("🧹 Egyptian Election Data - Location Cleaner")
    print("=" * 60)
    
    # File paths
    input_file = r"C:\Election-2025\output\locations_cleaned.csv"
    output_file = r"C:\Election-2025\output\locations_final_clean.csv"
    backup_file = r"C:\Election-2025\output\locations_cleaned_backup.csv"
    
    # Create backup
    print("📋 Creating backup of original file...")
    if os.path.exists(input_file):
        import shutil
        shutil.copy2(input_file, backup_file)
        print(f"✅ Backup created: {backup_file}")
    
    # Read the data
    print("📖 Reading locations data...")
    try:
        df = pd.read_csv(input_file)
        print(f"📊 Original records: {len(df)}")
        
        # Show sample of data
        print("\n📋 Sample of original data:")
        print(df.head(10)[['location_id', 'location_name', 'location_address', 'total_voters']])
        
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return False
    
    # Clean the data
    print("\n🧹 Cleaning data...")
    
    # Step 1: Remove records with empty location_name or location_address
    print("🔍 Step 1: Removing incomplete records (missing names/addresses)...")
    before_count = len(df)
    
    # Keep only records where both location_name and location_address are not empty
    df_clean = df[
        (df['location_name'].notna()) & 
        (df['location_name'].str.strip() != '') &
        (df['location_address'].notna()) & 
        (df['location_address'].str.strip() != '')
    ].copy()
    
    after_step1 = len(df_clean)
    removed_step1 = before_count - after_step1
    print(f"   ✅ Removed {removed_step1} incomplete records")
    print(f"   📊 Remaining: {after_step1} records")
    
    # Step 2: Remove exact duplicates based on location_name and location_address
    print("\n🔍 Step 2: Removing exact duplicates...")
    before_step2 = len(df_clean)
    
    # Remove duplicates based on location name and address
    df_clean = df_clean.drop_duplicates(
        subset=['location_name', 'location_address'], 
        keep='first'
    ).copy()
    
    after_step2 = len(df_clean)
    removed_step2 = before_step2 - after_step2
    print(f"   ✅ Removed {removed_step2} duplicate records")
    print(f"   📊 Remaining: {after_step2} records")
    
    # Step 3: Reset location_id to be sequential
    print("\n🔍 Step 3: Resetting location IDs to be sequential...")
    df_clean = df_clean.reset_index(drop=True)
    df_clean['location_id'] = range(1, len(df_clean) + 1)
    df_clean['location_number'] = df_clean['location_id']  # Keep them in sync
    
    # Show final statistics
    print("\n📊 Final Statistics:")
    print(f"   📍 Total unique locations: {len(df_clean)}")
    print(f"   👥 Total voters: {df_clean['total_voters'].sum():,}")
    print(f"   📈 Average voters per location: {df_clean['total_voters'].mean():.1f}")
    
    # Show sample of cleaned data
    print("\n📋 Sample of cleaned data:")
    sample_df = df_clean.head(10)[['location_id', 'location_name', 'location_address', 'total_voters']]
    for _, row in sample_df.iterrows():
        print(f"   {row['location_id']:3d}: {row['location_name'][:50]:<50} ({row['total_voters']} voters)")
    
    # Save cleaned data
    print(f"\n💾 Saving cleaned data to: {output_file}")
    try:
        df_clean.to_csv(output_file, index=False, encoding='utf-8')
        print("✅ Cleaned data saved successfully!")
        
        # Verify the saved file
        verify_df = pd.read_csv(output_file)
        print(f"✅ Verification: {len(verify_df)} records saved")
        
        return True
        
    except Exception as e:
        print(f"❌ Error saving file: {e}")
        return False

def show_cleaning_summary():
    """Show summary of the cleaning process"""
    
    original_file = r"C:\Election-2025\output\locations_cleaned.csv"
    cleaned_file = r"C:\Election-2025\output\locations_final_clean.csv"
    
    if os.path.exists(original_file) and os.path.exists(cleaned_file):
        original_df = pd.read_csv(original_file)
        cleaned_df = pd.read_csv(cleaned_file)
        
        print("\n" + "=" * 60)
        print("📊 CLEANING SUMMARY")
        print("=" * 60)
        print(f"📋 Original records:     {len(original_df):,}")
        print(f"🧹 Cleaned records:      {len(cleaned_df):,}")
        print(f"🗑️  Records removed:      {len(original_df) - len(cleaned_df):,}")
        print(f"📈 Reduction:            {((len(original_df) - len(cleaned_df)) / len(original_df) * 100):.1f}%")
        print(f"👥 Total voters:         {cleaned_df['total_voters'].sum():,}")
        print("=" * 60)

if __name__ == "__main__":
    success = clean_locations_data()
    if success:
        show_cleaning_summary()
        print("\n🎉 Location data cleaning completed successfully!")
        print("📁 Files created:")
        print("   📋 locations_final_clean.csv - Clean data ready for transfer")
        print("   💾 locations_cleaned_backup.csv - Backup of original")
        print("\n🚀 Ready for Supabase transfer!")
    else:
        print("\n❌ Location data cleaning failed!")