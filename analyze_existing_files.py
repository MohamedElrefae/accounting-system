#!/usr/bin/env python3
"""
Analyze Existing Files in Current Repo
Study the existing PDF files and try to understand the structure
"""

import PyPDF2
import pandas as pd
import re
import json
import os

def analyze_existing_pdfs():
    """Analyze existing PDF files in the current directory"""
    
    print("=" * 70)
    print("📄 ANALYZING EXISTING PDF FILES IN CURRENT REPO")
    print("=" * 70)
    
    # Look for PDF files in current directory
    pdf_files = []
    for file in os.listdir('.'):
        if file.lower().endswith('.pdf'):
            pdf_files.append(file)
    
    print(f"📊 Found PDF files: {pdf_files}")
    
    if not pdf_files:
        print("❌ No PDF files found in current directory")
        return False
    
    # Analyze each PDF file
    for pdf_file in pdf_files:
        print(f"\n📖 Analyzing: {pdf_file}")
        print("-" * 50)
        
        try:
            with open(pdf_file, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                total_pages = len(pdf_reader.pages)
                print(f"📊 Total pages: {total_pages}")
                
                # Extract text from first few pages
                for page_num in range(min(3, total_pages)):
                    page = pdf_reader.pages[page_num]
                    text = page.extract_text()
                    lines = [line.strip() for line in text.split('\n') if line.strip()]
                    
                    print(f"\n📄 Page {page_num + 1} - First 20 lines:")
                    for i, line in enumerate(lines[:20]):
                        print(f"   {i+1:2d}: {line}")
                    
                    # Look for key patterns
                    patterns_found = []
                    for line in lines:
                        if any(keyword in line.lower() for keyword in ['location', 'voter', 'district', 'total']):
                            patterns_found.append(line)
                    
                    if patterns_found:
                        print(f"\n🔍 Key patterns found on page {page_num + 1}:")
                        for pattern in patterns_found[:10]:
                            print(f"   - {pattern}")
                
        except Exception as e:
            print(f"❌ Error reading {pdf_file}: {e}")
    
    return True

def create_sample_structure():
    """Create a sample structure based on user's description"""
    
    print(f"\n📋 CREATING SAMPLE STRUCTURE BASED ON USER DESCRIPTION:")
    print("=" * 70)
    
    # User's described structure
    sample_structure = [
        "1",
        "location_number", 
        "2",
        "location_name",
        "3", 
        "location_address",
        "4",
        "district",
        "5",
        "voter_id",
        "6", 
        "full_name",
        "7",
        "source_page",
        # ... more voter records would be here (lines 8-49)
        "50",
        "total_voters",
        "51", 
        "6059",
        "52",
        "source_page", 
        "53",
        "60",
        # Next location starts
        "60",
        "location_number",
        "61",
        "location_name", 
        "62",
        "location_address",
        "63", 
        "district",
        "64",
        "source_page",
        "65",
        "total_voters",
        "66",
        "6059", 
        "67",
        "source_page"
    ]
    
    print("Sample structure lines:")
    for i, line in enumerate(sample_structure):
        print(f"   {i+1:2d}: {line}")
    
    # Save sample structure
    with open("sample_structure.txt", 'w', encoding='utf-8') as f:
        f.write("SAMPLE STRUCTURE BASED ON USER DESCRIPTION\n")
        f.write("=" * 50 + "\n\n")
        for i, line in enumerate(sample_structure):
            f.write(f"{i+1:3d}: {line}\n")
    
    print(f"\n💾 Sample structure saved to: sample_structure.txt")
    
    return sample_structure

def extract_based_on_pattern(sample_structure):
    """Extract data based on the pattern"""
    
    print(f"\n🔄 EXTRACTING DATA BASED ON PATTERN:")
    print("=" * 50)
    
    locations = []
    voters = []
    
    # Parse the sample structure
    i = 0
    location_id = 1
    
    while i < len(sample_structure):
        
        # Look for location pattern
        if (i + 7 < len(sample_structure) and 
            sample_structure[i + 1] == "location_number"):
            
            print(f"📍 Processing location {location_id}...")
            
            # Extract location data
            location_number = sample_structure[i] if i < len(sample_structure) else "1"
            i += 2  # Skip number and "location_number"
            
            location_name = sample_structure[i] if i < len(sample_structure) else "Sample Location"
            i += 2  # Skip number and "location_name"
            
            location_address = sample_structure[i] if i < len(sample_structure) else "Sample Address"
            i += 2  # Skip number and "location_address"
            
            district = sample_structure[i] if i < len(sample_structure) else "مطوبس"
            i += 1  # Skip "district"
            
            # Create location record
            location_record = {
                'location_id': location_id,
                'location_number': location_number,
                'location_name': location_name,
                'location_address': location_address,
                'governorate': 'كفر الشيخ',
                'district': district,
                'total_voters': 6059,  # From user description
                'main_committee_id': None,
                'police_department': None
            }
            
            locations.append(location_record)
            
            print(f"   ✅ Location {location_id}: {location_name}")
            
            location_id += 1
        
        else:
            i += 1
    
    # Create sample voters
    for loc in locations:
        for voter_num in range(1, 6):  # Create 5 sample voters per location
            voter_record = {
                'id': len(voters) + 1,
                'voter_id': voter_num,
                'full_name': f"Sample Voter {voter_num}",
                'location_id': loc['location_id'],
                'source_page': '33'
            }
            voters.append(voter_record)
    
    print(f"\n📊 EXTRACTION RESULTS:")
    print(f"   📍 Total locations: {len(locations)}")
    print(f"   👥 Total voters: {len(voters)}")
    
    # Save results
    locations_df = pd.DataFrame(locations)
    voters_df = pd.DataFrame(voters)
    
    locations_df.to_csv("sample_locations.csv", index=False, encoding='utf-8')
    voters_df.to_csv("sample_voters.csv", index=False, encoding='utf-8')
    
    print(f"\n💾 Files saved:")
    print(f"   📍 Locations: sample_locations.csv")
    print(f"   👥 Voters: sample_voters.csv")
    
    return locations, voters

if __name__ == "__main__":
    print("🎯 ANALYZING EXISTING FILES IN CURRENT REPO")
    
    # Analyze existing PDFs
    pdf_success = analyze_existing_pdfs()
    
    # Create sample structure
    sample_structure = create_sample_structure()
    
    # Extract based on pattern
    locations, voters = extract_based_on_pattern(sample_structure)
    
    print(f"\n📋 ANALYSIS COMPLETE:")
    print(f"   📄 PDF analysis: {'SUCCESS' if pdf_success else 'NO PDFs FOUND'}")
    print(f"   📋 Sample structure created")
    print(f"   🔄 Pattern extraction completed")
    
    print(f"\n❓ NEXT STEPS:")
    print("1. Review the sample structure in sample_structure.txt")
    print("2. Check the extracted data in sample_locations.csv and sample_voters.csv") 
    print("3. Confirm if this matches your expected structure")
    print("4. If correct, I can apply this pattern to extract from the actual logic file")
    
    print(f"\n📁 Files created:")
    print(f"   - sample_structure.txt")
    print(f"   - sample_locations.csv") 
    print(f"   - sample_voters.csv")