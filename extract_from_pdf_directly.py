#!/usr/bin/env python3
"""
Egyptian Election Data - Direct PDF Extraction
Extracts location data directly from the PDF with proper column separation
"""

import PyPDF2
import pandas as pd
import re
import json
import os
from datetime import datetime

def extract_locations_from_pdf():
    """Extract locations directly from the PDF file"""
    
    print("=" * 60)
    print("📄 Egyptian Election Data - Direct PDF Extraction")
    print("=" * 60)
    
    # PDF file path
    pdf_file = r"C:\Election-2025\motobus .pdf"
    
    if not os.path.exists(pdf_file):
        print(f"❌ PDF file not found: {pdf_file}")
        return False
    
    print(f"📖 Reading PDF file: {pdf_file}")
    
    try:
        with open(pdf_file, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            print(f"📄 Total pages: {total_pages}")
            
            all_text = ""
            for page_num in range(total_pages):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                all_text += text + "\n"
                
                if page_num < 5:  # Show progress for first few pages
                    print(f"   ✅ Extracted page {page_num + 1}")
            
            print(f"📝 Total text extracted: {len(all_text)} characters")
            
    except Exception as e:
        print(f"❌ Error reading PDF: {e}")
        return False
    
    # Save raw text for debugging
    raw_text_file = r"C:\Election-2025\output\raw_pdf_text.txt"
    with open(raw_text_file, 'w', encoding='utf-8') as f:
        f.write(all_text)
    print(f"💾 Raw text saved to: {raw_text_file}")
    
    # Extract location data using patterns
    print("\n🔍 Extracting location data using patterns...")
    
    locations = []
    
    # Pattern to match location entries
    # Looking for patterns like: "92 مدرسة عبدالحميد شلبى الابتدائية مركز مطوبس"
    
    # Split text into lines
    lines = all_text.split('\n')
    
    location_number = None
    location_name = None
    location_address = None
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        
        # Look for location numbers (usually 1-3 digits)
        number_match = re.search(r'\b(\d{1,3})\b', line)
        if number_match:
            potential_number = int(number_match.group(1))
            
            # Check if this looks like a location number (reasonable range)
            if 1 <= potential_number <= 1000:
                
                # Look for school/location names in Arabic
                # Common patterns: مدرسة، الثانوية، الابتدائية، للتعليم، العدادية
                school_patterns = [
                    r'مدرسة\s+[\u0600-\u06FF\s]+',
                    r'[\u0600-\u06FF\s]*الثانوية[\u0600-\u06FF\s]*',
                    r'[\u0600-\u06FF\s]*الابتدائية[\u0600-\u06FF\s]*',
                    r'[\u0600-\u06FF\s]*للتعليم[\u0600-\u06FF\s]*',
                    r'[\u0600-\u06FF\s]*العدادية[\u0600-\u06FF\s]*'
                ]
                
                for pattern in school_patterns:
                    school_match = re.search(pattern, line)
                    if school_match:
                        location_number = potential_number
                        location_name = school_match.group(0).strip()
                        
                        # Extract address (usually contains "مركز مطوبس")
                        address_match = re.search(r'مركز\s+مطوبس[^0-9]*', line)
                        if address_match:
                            location_address = address_match.group(0).strip()
                        else:
                            # Look for other address patterns
                            remaining_text = line.replace(str(location_number), '').replace(location_name, '').strip()
                            if remaining_text:
                                location_address = remaining_text[:100]  # Limit length
                        
                        # Create location record
                        location_record = {
                            'location_id': len(locations) + 1,
                            'location_number': location_number,
                            'location_name': location_name,
                            'location_address': location_address if location_address else 'مركز مطوبس',
                            'governorate': 'كفر الشيخ',
                            'district': 'مطوبس',
                            'main_committee_id': None,
                            'police_department': None,
                            'total_voters': 150  # Default estimate
                        }
                        
                        locations.append(location_record)
                        
                        if len(locations) <= 10:
                            print(f"   ✅ {location_number:3d}: {location_name[:50]}")
                        
                        break
    
    print(f"\n📊 Extracted {len(locations)} locations from PDF")
    
    if len(locations) == 0:
        print("⚠️ No locations found. Let me try a different approach...")
        
        # Alternative approach: Look for specific text patterns
        print("🔍 Trying alternative extraction method...")
        
        # Look for lines that contain Arabic school names
        arabic_school_lines = []
        for line in lines:
            if any(keyword in line for keyword in ['مدرسة', 'الثانوية', 'الابتدائية', 'للتعليم', 'العدادية']):
                arabic_school_lines.append(line.strip())
        
        print(f"📋 Found {len(arabic_school_lines)} lines with school keywords")
        
        # Show first few for debugging
        for i, line in enumerate(arabic_school_lines[:10]):
            print(f"   {i+1}: {line}")
        
        # Try to extract from these lines
        for i, line in enumerate(arabic_school_lines):
            # Extract numbers from the line
            numbers = re.findall(r'\b(\d{1,3})\b', line)
            if numbers:
                location_number = int(numbers[0])
                
                # Extract school name (Arabic text)
                arabic_text = re.findall(r'[\u0600-\u06FF\s]+', line)
                if arabic_text:
                    location_name = ' '.join(arabic_text).strip()
                    
                    location_record = {
                        'location_id': len(locations) + 1,
                        'location_number': location_number,
                        'location_name': location_name,
                        'location_address': 'مركز مطوبس',
                        'governorate': 'كفر الشيخ',
                        'district': 'مطوبس',
                        'main_committee_id': None,
                        'police_department': None,
                        'total_voters': 150
                    }
                    
                    locations.append(location_record)
                    
                    if len(locations) <= 10:
                        print(f"   ✅ {location_number:3d}: {location_name[:50]}")
    
    if len(locations) == 0:
        print("❌ Still no locations found. The PDF structure might be different.")
        print("📋 Showing first 20 lines of PDF text for manual inspection:")
        for i, line in enumerate(lines[:20]):
            if line.strip():
                print(f"   {i+1:2d}: {line.strip()}")
        return False
    
    # Create DataFrame and save
    df = pd.DataFrame(locations)
    df = df.drop_duplicates(subset=['location_name']).reset_index(drop=True)
    
    # Sort by location_number
    df = df.sort_values('location_number').reset_index(drop=True)
    
    print(f"\n📈 Final Statistics:")
    print(f"   📍 Unique locations: {len(df)}")
    print(f"   🔢 Location numbers range: {df['location_number'].min()} - {df['location_number'].max()}")
    
    # Save the extracted data
    output_file = r"C:\Election-2025\output\locations_from_pdf_direct.csv"
    print(f"\n💾 Saving extracted data to: {output_file}")
    
    try:
        df.to_csv(output_file, index=False, encoding='utf-8')
        print("✅ Data saved successfully!")
        
        # Show sample of extracted data
        print(f"\n📋 Sample of extracted locations:")
        for _, row in df.head(10).iterrows():
            print(f"   {row['location_number']:3d}: {row['location_name'][:60]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error saving file: {e}")
        return False

if __name__ == "__main__":
    success = extract_locations_from_pdf()
    if success:
        print("\n🎉 Direct PDF extraction completed!")
        print("📁 File created: locations_from_pdf_direct.csv")
    else:
        print("\n❌ Direct PDF extraction failed!")
        print("💡 Try checking the PDF structure manually")