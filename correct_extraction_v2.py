#!/usr/bin/env python3
"""
CORRECT EXTRACTION V2 - Based on actual PDF structure analysis
"""

import pandas as pd
import re
import json
import os

def extract_correct_data():
    """Extract correct data based on actual PDF structure"""
    
    print("=" * 70)
    print("🎯 CORRECT EXTRACTION - Based on Actual PDF Structure")
    print("=" * 70)
    
    # Read the raw PDF text
    raw_text_file = r"C:\Election-2025\output\raw_pdf_text.txt"
    
    if not os.path.exists(raw_text_file):
        print(f"❌ Raw text file not found")
        return []
    
    print("📖 Reading raw PDF text...")
    with open(raw_text_file, 'r', encoding='utf-8') as f:
        text = f.read()
    
    lines = text.split('\n')
    print(f"📊 Total lines: {len(lines)}")
    
    # Find all school headers
    school_headers = []
    
    for i, line in enumerate(lines):
        if 'كفر الشيخمحافظة : مركز مطوبسمدرسة' in line:
            school_headers.append((i, line))
    
    print(f"🏫 Found {len(school_headers)} school headers")
    
    locations = []
    
    for idx, (line_num, header_line) in enumerate(school_headers):
        
        # Extract school name
        school_match = re.search(r'مدرسة\s*(.+)', header_line)
        if school_match:
            school_name = school_match.group(1).strip()
        else:
            school_name = f"مدرسة غير محددة {idx + 1}"
        
        # Get address from next line
        address = "مركز مطوبس"
        if line_num + 1 < len(lines):
            next_line = lines[line_num + 1].strip()
            if next_line and len(next_line) > 5:
                address = next_line
        
        # Count voters in this section
        next_school_line = school_headers[idx + 1][0] if idx + 1 < len(school_headers) else len(lines)
        
        voter_count = 0
        for voter_line_num in range(line_num + 1, min(next_school_line, line_num + 200)):
            if voter_line_num < len(lines):
                voter_line = lines[voter_line_num]
                # Count Arabic names with numbers
                arabic_names = re.findall(r'[\u0600-\u06FF\s]+\s+\d+', voter_line)
                voter_count += len(arabic_names)
        
        # Create location record
        location_record = {
            'location_id': idx + 1,
            'location_number': idx + 1,
            'location_name': school_name,
            'location_address': address,
            'governorate': 'كفر الشيخ',
            'district': 'مطوبس',
            'total_voters': voter_count
        }
        
        locations.append(location_record)
        
        print(f"   ✅ {idx + 1:2d}: {school_name[:50]} ({voter_count} voters)")
    
    return locations

def main():
    """Main extraction function"""
    
    locations = extract_correct_data()
    if not locations:
        print("❌ No locations extracted")
        return False
    
    # Assign real location numbers
    real_numbers = [1, 33, 66, 77, 78, 92, 106, 121, 150, 191, 230, 264, 294, 335, 391, 424, 491, 502, 525, 562, 585, 607, 654, 675, 734, 758, 807, 840, 869]
    
    for i, location in enumerate(locations):
        if i < len(real_numbers):
            location['location_number'] = real_numbers[i]
    
    # Create DataFrame
    df = pd.DataFrame(locations)
    df = df.sort_values('location_number').reset_index(drop=True)
    
    print(f"\n📊 Final Results:")
    print(f"   📍 Total locations: {len(df)}")
    print(f"   👥 Total voters: {df['total_voters'].sum():,}")
    
    # Save to CSV
    output_file = r"C:\Election-2025\output\locations_correct_final.csv"
    df.to_csv(output_file, index=False, encoding='utf-8')
    
    print(f"\n💾 Saved to: {output_file}")
    
    # Show results
    print(f"\n📋 Extracted locations with real numbers:")
    for _, row in df.iterrows():
        print(f"   #{row['location_number']:3d}: {row['location_name'][:55]} ({row['total_voters']} voters)")
    
    return True

if __name__ == "__main__":
    success = main()
    if success:
        print("\n🎉 CORRECT EXTRACTION COMPLETED!")
    else:
        print("\n❌ Extraction failed!")