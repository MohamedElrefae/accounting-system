#!/usr/bin/env python3
"""
Analyze Logic PDF Final
Study the logic.pdf file that's now available in the workspace
"""

import PyPDF2
import pandas as pd
import re
import json
import os

def analyze_logic_pdf():
    """Analyze the logic.pdf file to understand the structure"""
    
    print("=" * 70)
    print("📄 ANALYZING LOGIC.PDF - Final Analysis")
    print("=" * 70)
    
    pdf_file = "logic.pdf"
    
    if not os.path.exists(pdf_file):
        print(f"❌ Logic PDF file not found: {pdf_file}")
        return False, []
    
    print(f"📖 Reading logic.pdf...")
    
    try:
        with open(pdf_file, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            print(f"📊 Total pages in logic.pdf: {total_pages}")
            
            # Extract all text
            all_text = ""
            for page_num in range(total_pages):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                all_text += text + "\n"
                print(f"📄 Page {page_num + 1} extracted")
            
            # Split into lines and clean
            lines = [line.strip() for line in all_text.split('\n') if line.strip()]
            
            print(f"📊 Total lines extracted: {len(lines)}")
            
            # Show first 100 lines to understand structure
            print(f"\n🔍 FIRST 100 LINES ANALYSIS:")
            print("-" * 50)
            
            for i, line in enumerate(lines[:100]):
                print(f"   {i+1:3d}: {line}")
            
            # Look for the pattern described by user
            print(f"\n🔍 LOOKING FOR USER-DESCRIBED PATTERN:")
            print("Expected pattern:")
            print("1 location_number")
            print("2 location_name") 
            print("3 location_address")
            print("4 district")
            print("5 voter_id")
            print("6 full_name")
            print("7 source_page")
            print("...")
            print("50 total_voters")
            print("51 6059")
            print("52 source_page")
            print("53 60")
            
            # Check if pattern matches
            pattern_matches = []
            key_patterns = ['location_number', 'location_name', 'location_address', 'district', 
                          'voter_id', 'full_name', 'source_page', 'total_voters', '6059']
            
            for i, line in enumerate(lines):
                if line in key_patterns:
                    pattern_matches.append(f"Line {i+1}: {line}")
            
            print(f"\n📋 PATTERN MATCHES FOUND:")
            for match in pattern_matches[:30]:  # Show first 30 matches
                print(f"   {match}")
            
            # Save full analysis
            with open("logic_pdf_final_analysis.txt", 'w', encoding='utf-8') as f:
                f.write("LOGIC.PDF FINAL ANALYSIS\n")
                f.write("=" * 50 + "\n\n")
                f.write(f"Total pages: {total_pages}\n")
                f.write(f"Total lines: {len(lines)}\n\n")
                for i, line in enumerate(lines):
                    f.write(f"{i+1:4d}: {line}\n")
            
            print(f"\n💾 Full analysis saved to: logic_pdf_final_analysis.txt")
            
            return True, lines
            
    except Exception as e:
        print(f"❌ Error analyzing logic.pdf: {e}")
        return False, []

def extract_structured_data(lines):
    """Extract structured data based on the pattern"""
    
    print(f"\n🔄 EXTRACTING STRUCTURED DATA:")
    print("=" * 50)
    
    locations = []
    voters = []
    
    i = 0
    location_id = 1
    
    while i < len(lines):
        
        # Look for location_number pattern
        if i < len(lines) and lines[i] == "location_number":
            print(f"\n📍 Found location_number at line {i+1}")
            
            # Try to extract location data
            location_data = {}
            
            # Get location number (should be in next line or nearby)
            if i + 1 < len(lines):
                location_data['location_number'] = lines[i + 1]
                print(f"   Location number: {lines[i + 1]}")
            
            # Look for location_name
            j = i + 1
            while j < len(lines) and j < i + 10:  # Search within next 10 lines
                if lines[j] == "location_name":
                    if j + 1 < len(lines):
                        location_data['location_name'] = lines[j + 1]
                        print(f"   Location name: {lines[j + 1]}")
                    break
                j += 1
            
            # Look for location_address
            j = i + 1
            while j < len(lines) and j < i + 15:  # Search within next 15 lines
                if lines[j] == "location_address":
                    if j + 1 < len(lines):
                        location_data['location_address'] = lines[j + 1]
                        print(f"   Location address: {lines[j + 1]}")
                    break
                j += 1
            
            # Look for district
            j = i + 1
            while j < len(lines) and j < i + 20:  # Search within next 20 lines
                if lines[j] == "district":
                    if j + 1 < len(lines):
                        location_data['district'] = lines[j + 1]
                        print(f"   District: {lines[j + 1]}")
                    break
                j += 1
            
            # Create location record
            location_record = {
                'location_id': location_id,
                'location_number': location_data.get('location_number', f'LOC_{location_id}'),
                'location_name': location_data.get('location_name', 'Unknown Location'),
                'location_address': location_data.get('location_address', 'Unknown Address'),
                'governorate': 'كفر الشيخ',
                'district': location_data.get('district', 'مطوبس'),
                'total_voters': 0,  # Will be updated when we find voters
                'main_committee_id': None,
                'police_department': None
            }
            
            locations.append(location_record)
            
            # Look for voters for this location
            location_voters = []
            j = i + 1
            while j < len(lines) and j < i + 200:  # Search for voters in next 200 lines
                if lines[j] == "voter_id":
                    if j + 1 < len(lines):
                        voter_id = lines[j + 1]
                        
                        # Look for full_name
                        k = j + 1
                        while k < len(lines) and k < j + 5:
                            if lines[k] == "full_name":
                                if k + 1 < len(lines):
                                    full_name = lines[k + 1]
                                    
                                    # Look for source_page
                                    source_page = "1"
                                    m = k + 1
                                    while m < len(lines) and m < k + 5:
                                        if lines[m] == "source_page":
                                            if m + 1 < len(lines):
                                                source_page = lines[m + 1]
                                            break
                                        m += 1
                                    
                                    # Create voter record
                                    voter_record = {
                                        'id': len(voters) + 1,
                                        'voter_id': voter_id,
                                        'full_name': full_name,
                                        'location_id': location_id,
                                        'source_page': source_page
                                    }
                                    
                                    voters.append(voter_record)
                                    location_voters.append(voter_record)
                                    
                                    print(f"   Voter {voter_id}: {full_name[:30]}...")
                                break
                            k += 1
                
                # Stop if we hit total_voters or next location
                elif lines[j] == "total_voters" or lines[j] == "location_number":
                    break
                
                j += 1
            
            # Update location total voters
            location_record['total_voters'] = len(location_voters)
            
            print(f"   ✅ Location {location_id}: {len(location_voters)} voters")
            
            location_id += 1
            i = j  # Move to next section
        
        else:
            i += 1
    
    print(f"\n📊 EXTRACTION RESULTS:")
    print(f"   📍 Total locations: {len(locations)}")
    print(f"   👥 Total voters: {len(voters)}")
    
    return locations, voters

def save_results(locations, voters):
    """Save the extracted results"""
    
    print(f"\n💾 SAVING RESULTS:")
    print("-" * 30)
    
    # Save locations
    locations_df = pd.DataFrame(locations)
    locations_file = "logic_locations_final.csv"
    locations_df.to_csv(locations_file, index=False, encoding='utf-8')
    print(f"📍 Locations saved: {locations_file}")
    
    # Save voters
    voters_df = pd.DataFrame(voters)
    voters_file = "logic_voters_final.csv"
    voters_df.to_csv(voters_file, index=False, encoding='utf-8')
    print(f"👥 Voters saved: {voters_file}")
    
    # Show sample data
    print(f"\n📋 SAMPLE LOCATIONS:")
    for _, row in locations_df.head(5).iterrows():
        print(f"   #{row['location_number']}: {row['location_name'][:40]} ({row['total_voters']} voters)")
    
    print(f"\n📋 SAMPLE VOTERS:")
    for _, row in voters_df.head(10).iterrows():
        print(f"   {row['voter_id']}: {row['full_name'][:40]} (Loc {row['location_id']}, Page {row['source_page']})")
    
    return locations_file, voters_file

if __name__ == "__main__":
    print("🎯 ANALYZING LOGIC.PDF - FINAL VERSION")
    
    success, lines = analyze_logic_pdf()
    
    if success:
        locations, voters = extract_structured_data(lines)
        
        if locations or voters:
            locations_file, voters_file = save_results(locations, voters)
            
            print(f"\n🎉 EXTRACTION COMPLETED!")
            print(f"📁 Files created:")
            print(f"   - logic_pdf_final_analysis.txt (full analysis)")
            print(f"   - {locations_file} (locations data)")
            print(f"   - {voters_file} (voters data)")
            
            print(f"\n❓ Is this the structure you expected?")
            print("Please review the extracted data and confirm!")
        else:
            print(f"\n❌ No structured data found")
            print("Please review the analysis file and confirm the pattern")
    else:
        print(f"\n❌ Failed to analyze logic.pdf")