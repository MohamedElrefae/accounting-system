#!/usr/bin/env python3
"""
Analyze Logic PDF Structure
Study the logic.pdf file to understand the exact structure described by the user
"""

import PyPDF2
import pandas as pd
import re
import json
import os

def analyze_logic_pdf():
    """Analyze the logic.pdf file to understand the structure"""
    
    print("=" * 70)
    print("📄 ANALYZING LOGIC.PDF - Understanding Structure")
    print("=" * 70)
    
    pdf_file = "logic.pdf"
    
    if not os.path.exists(pdf_file):
        print(f"❌ Logic PDF file not found: {pdf_file}")
        return False
    
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
                f.write("LOGIC.PDF FULL ANALYSIS\n")
                f.write("=" * 50 + "\n\n")
                for i, line in enumerate(lines):
                    f.write(f"{i+1:4d}: {line}\n")
            
            print(f"\n💾 Full analysis saved to: logic_analysis_full.txt")
            
            return True, lines
            
    except Exception as e:
        print(f"❌ Error analyzing logic.pdf: {e}")
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
    
    return accuracy > 70  # Consider it a match if 70% or more lines match

if __name__ == "__main__":
    print("🎯 ANALYZING LOGIC.PDF STRUCTURE")
    
    success, lines = analyze_logic_pdf()
    
    if success:
        pattern_match = verify_user_pattern(lines)
        
        print(f"\n📋 ANALYSIS SUMMARY:")
        print(f"   📄 PDF successfully read")
        print(f"   📊 Total lines: {len(lines)}")
        print(f"   🎯 Pattern match: {'YES' if pattern_match else 'NO'}")
        
        if pattern_match:
            print(f"\n✅ STRUCTURE CONFIRMED!")
            print("The logic.pdf follows the pattern you described.")
            print("Ready to extract data using this structure.")
        else:
            print(f"\n❓ VERIFICATION NEEDED!")
            print("The structure doesn't exactly match your description.")
            print("Please review the analysis and confirm the correct pattern.")
            
        print(f"\n📁 Files created:")
        print(f"   - logic_analysis_full.txt (complete line-by-line analysis)")
        
    else:
        print(f"\n❌ Failed to analyze logic.pdf")