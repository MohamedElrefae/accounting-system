#!/usr/bin/env python3
"""
Analyze Logic File Structure
Study the logic file in C:\Election-2025 to understand the exact structure described by the user
"""

import PyPDF2
import pandas as pd
import re
import json
import os

def analyze_logic_file():
    """Analyze the logic file to understand the structure"""
    
    print("=" * 70)
    print("📄 ANALYZING LOGIC FILE - Understanding Structure")
    print("=" * 70)
    
    logic_file = r"C:\Election-2025\logic"
    
    if not os.path.exists(logic_file):
        print(f"❌ Logic file not found: {logic_file}")
        return False, []
    
    print(f"📖 Reading logic file...")
    
    try:
        # First, try to determine if it's a PDF or text file
        file_type = "unknown"
        
        # Try reading as PDF first
        try:
            with open(logic_file, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                total_pages = len(pdf_reader.pages)
                print(f"📊 Detected as PDF with {total_pages} pages")
                file_type = "pdf"
                
                # Extract all text
                all_text = ""
                for page_num in range(total_pages):
                    page = pdf_reader.pages[page_num]
                    text = page.extract_text()
                    all_text += text + "\n"
                    
        except Exception as pdf_error:
            print(f"Not a PDF file, trying as text file...")
            file_type = "text"
            
            # Try reading as text file
            try:
                with open(logic_file, 'r', encoding='utf-8') as file:
                    all_text = file.read()
                print(f"📊 Successfully read as text file")
            except Exception as text_error:
                try:
                    with open(logic_file, 'r', encoding='latin-1') as file:
                        all_text = file.read()
                    print(f"📊 Successfully read as text file (latin-1 encoding)")
                except Exception as final_error:
                    print(f"❌ Could not read file as PDF or text: {final_error}")
                    return False, []
        
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
        print("50 total_voters 6059")
        print("51 source_page 60")
        print("...")
        print("60 location_number")
        print("61 location_name")
        print("62 location_address")
        print("63 district")
        print("64 source_page")
        print("65 total_voters 6059")
        print("66 source_page")
        
        # Check if pattern matches
        pattern_matches = []
        for i, line in enumerate(lines):
            if line == "location_number":
                pattern_matches.append(f"Line {i+1}: {line}")
            elif line == "location_name":
                pattern_matches.append(f"Line {i+1}: {line}")
            elif line == "location_address":
                pattern_matches.append(f"Line {i+1}: {line}")
            elif line == "district":
                pattern_matches.append(f"Line {i+1}: {line}")
            elif line == "voter_id":
                pattern_matches.append(f"Line {i+1}: {line}")
            elif line == "full_name":
                pattern_matches.append(f"Line {i+1}: {line}")
            elif line == "source_page":
                pattern_matches.append(f"Line {i+1}: {line}")
            elif line == "total_voters":
                pattern_matches.append(f"Line {i+1}: {line}")
            elif line == "6059":
                pattern_matches.append(f"Line {i+1}: {line}")
        
        print(f"\n📋 PATTERN MATCHES FOUND:")
        for match in pattern_matches[:20]:  # Show first 20 matches
            print(f"   {match}")
        
        # Save full analysis
        with open("logic_analysis_full.txt", 'w', encoding='utf-8') as f:
            f.write("LOGIC FILE FULL ANALYSIS\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"File type: {file_type}\n")
            f.write(f"Total lines: {len(lines)}\n\n")
            for i, line in enumerate(lines):
                f.write(f"{i+1:4d}: {line}\n")
        
        print(f"\n💾 Full analysis saved to: logic_analysis_full.txt")
        
        return True, lines
        
    except Exception as e:
        print(f"❌ Error analyzing logic file: {e}")
        return False, []

def verify_user_pattern(lines):
    """Verify if the extracted lines match the user's described pattern"""
    
    print(f"\n🔍 VERIFYING USER'S DESCRIBED PATTERN:")
    print("=" * 50)
    
    # Check specific line numbers mentioned by user
    checks = [
        (1, "location_number"),
        (2, "location_name"),
        (3, "location_address"),
        (4, "district"),
        (5, "voter_id"),
        (6, "full_name"),
        (7, "source_page"),
        (50, "total_voters"),
        (51, "6059"),
        (52, "source_page"),
        (53, "60"),
        (60, "location_number"),
        (61, "location_name"),
        (62, "location_address"),
        (63, "district"),
        (64, "source_page"),
        (65, "total_voters"),
        (66, "6059"),
        (67, "source_page")
    ]
    
    matches = 0
    total_checks = len(checks)
    
    print("Checking specific line positions:")
    for line_num, expected in checks:
        if line_num <= len(lines):
            actual = lines[line_num - 1]  # Convert to 0-based index
            match = "✅" if actual == expected else "❌"
            print(f"   Line {line_num:2d}: Expected '{expected}' | Actual '{actual}' {match}")
            if actual == expected:
                matches += 1
        else:
            print(f"   Line {line_num:2d}: Expected '{expected}' | Line not found ❌")
    
    accuracy = (matches / total_checks) * 100
    print(f"\n📊 PATTERN ACCURACY: {matches}/{total_checks} ({accuracy:.1f}%)")
    
    return accuracy > 50  # Consider it a match if 50% or more lines match

def ask_for_verification():
    """Ask user for verification of understanding"""
    
    print("\n" + "=" * 70)
    print("🤔 VERIFICATION NEEDED")
    print("=" * 70)
    
    print("Based on your description, I understand the structure should be:")
    print("")
    print("📋 EXPECTED STRUCTURE:")
    print("   1. location_number")
    print("   2. location_name")
    print("   3. location_address")
    print("   4. district")
    print("   5. voter_id")
    print("   6. full_name")
    print("   7. source_page")
    print("   ...")
    print("   50. total_voters")
    print("   51. 6059")
    print("   52. source_page")
    print("   53. 60")
    print("   ...")
    print("   60. location_number")
    print("   61. location_name")
    print("   62. location_address")
    print("   63. district")
    print("   64. source_page")
    print("   65. total_voters")
    print("   66. 6059")
    print("   67. source_page")
    print("")
    print("❓ QUESTIONS FOR VERIFICATION:")
    print("   1. Is this the correct structure you want me to extract?")
    print("   2. Are the numbers (1, 2, 3, 50, 51, etc.) line numbers in the file?")
    print("   3. Should I extract both locations AND voters from this structure?")
    print("   4. Is 6059 the total number of voters for each location?")
    print("   5. Should each location have its own set of voters?")
    print("")
    print("Please confirm if my understanding is correct!")
    print("=" * 70)

if __name__ == "__main__":
    print("🎯 ANALYZING LOGIC FILE STRUCTURE")
    
    success, lines = analyze_logic_file()
    
    if success:
        pattern_match = verify_user_pattern(lines)
        
        print(f"\n📋 ANALYSIS SUMMARY:")
        print(f"   📄 File successfully read")
        print(f"   📊 Total lines: {len(lines)}")
        print(f"   🎯 Pattern match: {'YES' if pattern_match else 'PARTIAL'}")
        
        if pattern_match:
            print(f"\n✅ STRUCTURE CONFIRMED!")
            print("The logic file follows the pattern you described.")
            print("Ready to extract data using this structure.")
        else:
            print(f"\n❓ VERIFICATION NEEDED!")
            print("The structure doesn't exactly match your description.")
            ask_for_verification()
            
        print(f"\n📁 Files created:")
        print(f"   - logic_analysis_full.txt (complete line-by-line analysis)")
        
    else:
        print(f"\n❌ Failed to analyze logic file")
        ask_for_verification()