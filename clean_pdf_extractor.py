#!/usr/bin/env python3
"""
Egypt 2025 Election Voter PDF Extraction System
"""

import PyPDF2
import pandas as pd
import re
import json
import csv
from typing import Dict, List, Tuple, Optional
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class VoterPDFExtractor:
    def __init__(self):
        self.locations = []
        self.voters = []
        self.current_location_id = 0
        
    def extract_location_info(self, page_text: str, page_num: int) -> Optional[Dict]:
        """Extract location/committee information from page header"""
        location_info = {
            'location_id': None,
            'location_number': '',
            'location_name': '',
            'location_address': '',
            'governorate': '',
            'district': '',
            'main_committee_id': '',
            'police_department': '',
            'total_voters': 0
        }
        
        patterns = {
            'committee_number': r'لجنة\s*فرعية\s*رقم\s*(\d+)',
            'main_committee': r'لجنة\s*رئيسية\s*رقم\s*(\d+)',
            'school_name': r'مدرسة\s*([^\n]+)',
            'governorate': r'محافظة\s*([^\n]+)',
            'district': r'مركز\s*([^\n]+)|مدينة\s*([^\n]+)',
            'police_dept': r'قسم\s*شرطة\s*([^\n]+)',
            'address': r'العنوان\s*:?\s*([^\n]+)'
        }
        
        try:
            committee_match = re.search(patterns['committee_number'], page_text)
            if committee_match:
                location_info['location_number'] = committee_match.group(1)
                self.current_location_id += 1
                location_info['location_id'] = self.current_location_id
            
            main_committee_match = re.search(patterns['main_committee'], page_text)
            if main_committee_match:
                location_info['main_committee_id'] = main_committee_match.group(1)
            
            school_match = re.search(patterns['school_name'], page_text)
            if school_match:
                location_info['location_name'] = school_match.group(1).strip()
            
            gov_match = re.search(patterns['governorate'], page_text)
            if gov_match:
                location_info['governorate'] = gov_match.group(1).strip()
            
            district_match = re.search(patterns['district'], page_text)
            if district_match:
                location_info['district'] = (district_match.group(1) or district_match.group(2) or '').strip()
            
            police_match = re.search(patterns['police_dept'], page_text)
            if police_match:
                location_info['police_department'] = police_match.group(1).strip()
            
            address_match = re.search(patterns['address'], page_text)
            if address_match:
                location_info['location_address'] = address_match.group(1).strip()
            
            return location_info if location_info['location_id'] else None
            
        except Exception as e:
            logger.error(f"Error extracting location info from page {page_num}: {e}")
            return None    

    def extract_voters_from_page(self, page_text: str, location_id: int, page_num: int) -> List[Dict]:
        """Extract voter information from page content"""
        voters = []
        lines = [line.strip() for line in page_text.split('\n') if line.strip()]
        
        table_start_idx = 0
        for i, line in enumerate(lines):
            if re.search(r'^\d+\s+[أ-ي]', line) or 'الاسم' in line:
                table_start_idx = i
                break
        
        voter_id = 1
        for line in lines[table_start_idx:]:
            if not line or 'الاسم' in line or 'رقم' in line:
                continue
                
            voter_match = re.match(r'^(\d+)\s+(.+)$', line)
            if voter_match:
                sequence_num = voter_match.group(1)
                full_name = voter_match.group(2).strip()
                full_name = re.sub(r'\s+', ' ', full_name)
                full_name = re.sub(r'\d+$', '', full_name).strip()
                
                if full_name and len(full_name) > 3:
                    voters.append({
                        'voter_id': int(sequence_num) if sequence_num.isdigit() else voter_id,
                        'full_name': full_name,
                        'location_id': location_id,
                        'source_page': page_num
                    })
                    voter_id += 1
            else:
                columns = re.split(r'\s{3,}', line)
                for col in columns:
                    name_match = re.search(r'[أ-ي].+[أ-ي]', col)
                    if name_match:
                        full_name = name_match.group().strip()
                        if len(full_name) > 3:
                            voters.append({
                                'voter_id': voter_id,
                                'full_name': full_name,
                                'location_id': location_id,
                                'source_page': page_num
                            })
                            voter_id += 1
        
        return voters
    
    def process_pdf(self, pdf_path: str) -> Tuple[List[Dict], List[Dict]]:
        """Process entire PDF and extract all data"""
        logger.info(f"Processing PDF: {pdf_path}")
        
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                total_pages = len(pdf_reader.pages)
                logger.info(f"Total pages: {total_pages}")
                
                for page_num in range(total_pages):
                    page = pdf_reader.pages[page_num]
                    page_text = page.extract_text()
                    
                    if not page_text.strip():
                        logger.warning(f"Page {page_num + 1} appears to be empty")
                        continue
                    
                    location_info = self.extract_location_info(page_text, page_num + 1)
                    
                    if location_info:
                        page_voters = self.extract_voters_from_page(
                            page_text, location_info['location_id'], page_num + 1
                        )
                        
                        location_info['total_voters'] = len(page_voters)
                        self.locations.append(location_info)
                        self.voters.extend(page_voters)
                        
                        logger.info(f"Page {page_num + 1}: Found {len(page_voters)} voters")
                    else:
                        logger.warning(f"Could not extract location info from page {page_num + 1}")
                
        except Exception as e:
            logger.error(f"Error processing PDF: {e}")
            raise
        
        logger.info(f"Extraction complete: {len(self.locations)} locations, {len(self.voters)} voters")
        return self.locations, self.voters    
  
  def export_to_csv(self, output_dir: str = "output"):
        """Export data to CSV files"""
        Path(output_dir).mkdir(exist_ok=True)
        
        locations_df = pd.DataFrame(self.locations)
        locations_path = Path(output_dir) / "locations.csv"
        locations_df.to_csv(locations_path, index=False, encoding='utf-8-sig')
        logger.info(f"Locations exported to: {locations_path}")
        
        voters_df = pd.DataFrame(self.voters)
        voters_path = Path(output_dir) / "voters.csv"
        voters_df.to_csv(voters_path, index=False, encoding='utf-8-sig')
        logger.info(f"Voters exported to: {voters_path}")
        
        return locations_path, voters_path
    
    def export_to_json(self, output_dir: str = "output"):
        """Export data to JSON format"""
        Path(output_dir).mkdir(exist_ok=True)
        
        data = {
            "locations": self.locations,
            "voters": self.voters,
            "metadata": {
                "total_locations": len(self.locations),
                "total_voters": len(self.voters),
                "extraction_date": pd.Timestamp.now().isoformat()
            }
        }
        
        json_path = Path(output_dir) / "voter_data.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"JSON data exported to: {json_path}")
        return json_path
    
    def export_to_sql(self, output_dir: str = "output"):
        """Export data as SQL INSERT statements"""
        Path(output_dir).mkdir(exist_ok=True)
        
        sql_path = Path(output_dir) / "voter_data.sql"
        
        with open(sql_path, 'w', encoding='utf-8') as f:
            f.write("""-- Egypt 2025 Election Voter Database Schema
CREATE TABLE IF NOT EXISTS locations (
    location_id INTEGER PRIMARY KEY,
    location_number VARCHAR(50),
    location_name TEXT,
    location_address TEXT,
    governorate VARCHAR(100),
    district VARCHAR(100),
    main_committee_id VARCHAR(50),
    police_department VARCHAR(100),
    total_voters INTEGER
);

CREATE TABLE IF NOT EXISTS voters (
    voter_id INTEGER,
    full_name TEXT NOT NULL,
    location_id INTEGER,
    source_page INTEGER,
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

-- Insert locations data
""")
            
            for location in self.locations:
                values = [
                    str(location['location_id']),
                    f"'{location['location_number']}'",
                    f"'{location['location_name'].replace(chr(39), chr(39)+chr(39))}'",
                    f"'{location['location_address'].replace(chr(39), chr(39)+chr(39))}'",
                    f"'{location['governorate'].replace(chr(39), chr(39)+chr(39))}'",
                    f"'{location['district'].replace(chr(39), chr(39)+chr(39))}'",
                    f"'{location['main_committee_id']}'",
                    f"'{location['police_department'].replace(chr(39), chr(39)+chr(39))}'",
                    str(location['total_voters'])
                ]
                f.write(f"INSERT INTO locations VALUES ({', '.join(values)});\n")
            
            f.write("\n-- Insert voters data\n")
            for voter in self.voters:
                values = [
                    str(voter['voter_id']),
                    f"'{voter['full_name'].replace(chr(39), chr(39)+chr(39))}'",
                    str(voter['location_id']),
                    str(voter['source_page'])
                ]
                f.write(f"INSERT INTO voters VALUES ({', '.join(values)});\n")
        
        logger.info(f"SQL dump exported to: {sql_path}")
        return sql_path
    
    def generate_summary_report(self, output_dir: str = "output"):
        """Generate extraction summary report"""
        Path(output_dir).mkdir(exist_ok=True)
        
        report_path = Path(output_dir) / "extraction_report.txt"
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("Egypt 2025 Election PDF Extraction Report\n")
            f.write("=" * 50 + "\n\n")
            
            f.write(f"Total Locations: {len(self.locations)}\n")
            f.write(f"Total Voters: {len(self.voters)}\n\n")
            
            gov_counts = {}
            for location in self.locations:
                gov = location['governorate']
                gov_counts[gov] = gov_counts.get(gov, 0) + location['total_voters']
            
            f.write("Voters by Governorate:\n")
            for gov, count in sorted(gov_counts.items()):
                f.write(f"  {gov}: {count} voters\n")
            
            f.write(f"\nExtraction completed: {pd.Timestamp.now()}\n")
        
        logger.info(f"Summary report generated: {report_path}")
        return report_path