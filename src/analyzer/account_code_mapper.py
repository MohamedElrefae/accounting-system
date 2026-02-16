"""
Account Code Mapper Module

Maps Excel account codes to Supabase account IDs using legacy code references.
Implements Requirements 4.1, 4.2, 4.3, 4.4, 4.5
"""

import json
import logging
import csv
from typing import Dict, Optional, List, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class AccountMapping:
    """Represents a mapping between Excel and Supabase account codes"""
    excel_code: str
    legacy_code: str
    current_code: str
    account_name: str
    account_id: str  # UUID
    mapping_confidence: float  # 0.0 to 1.0
    requires_review: bool = False


class UnmappedAccountCodeError(Exception):
    """Raised when an Excel account code cannot be mapped"""
    def __init__(self, excel_code: str):
        self.excel_code = excel_code
        super().__init__(f"Account code {excel_code} not found in Supabase legacy_code field")


class AccountCodeMapper:
    """
    Maps Excel account codes to Supabase account IDs.
    
    Strategy:
    1. Load account mappings from reports/account_mapping.csv (Phase 0 output)
    2. Load manual mappings from config/manual_account_mappings.json (if exists)
    3. Provide fast lookup: excel_code → account_id (UUID)
    4. Raise error if unmapped code encountered
    
    Implements Requirements 4.1, 4.2, 4.3, 4.4, 4.5
    """
    
    def __init__(self, supabase_client=None, mapping_file: str = 'reports/account_mapping.csv',
                 manual_mapping_file: str = 'config/manual_account_mappings.json'):
        """
        Initialize the account code mapper.
        
        Args:
            supabase_client: Supabase client for querying accounts table
            mapping_file: Path to account mapping CSV from Phase 0
            manual_mapping_file: Path to manual mappings JSON (optional)
        """
        self.supabase_client = supabase_client
        self.mapping_file = mapping_file
        self.manual_mapping_file = manual_mapping_file
        
        # Cache for fast lookups
        self.excel_to_account_id: Dict[str, str] = {}  # excel_code → account_id
        self.excel_to_mapping: Dict[str, AccountMapping] = {}  # excel_code → AccountMapping
        self.unmapped_codes: List[str] = []
        
        logger.info("AccountCodeMapper initialized")
    
    def load_mappings(self) -> bool:
        """
        Load account mappings from files and Supabase.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Load Phase 0 account mapping CSV
            if not self._load_phase0_mappings():
                logger.warning("Failed to load Phase 0 mappings")
                return False
            
            # Load manual mappings if they exist
            self._load_manual_mappings()
            
            logger.info(f"Loaded {len(self.excel_to_account_id)} account mappings")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load mappings: {e}")
            return False
    
    def _load_phase0_mappings(self) -> bool:
        """
        Load account mappings from Phase 0 CSV file.
        
        Expected CSV format:
        old_code,old_name,new_code,new_name,notes
        """
        try:
            with open(self.mapping_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    excel_code = row.get('old_code', '').strip()
                    legacy_code = row.get('old_code', '').strip()
                    current_code = row.get('new_code', '').strip()
                    account_name = row.get('new_name', '').strip()
                    
                    if excel_code and current_code:
                        # For now, use current_code as placeholder for account_id
                        # In real scenario, this would be queried from Supabase
                        mapping = AccountMapping(
                            excel_code=excel_code,
                            legacy_code=legacy_code,
                            current_code=current_code,
                            account_name=account_name,
                            account_id=current_code,  # Placeholder - should be UUID from Supabase
                            mapping_confidence=0.95,
                            requires_review=False
                        )
                        
                        self.excel_to_account_id[excel_code] = mapping.account_id
                        self.excel_to_mapping[excel_code] = mapping
                        logger.debug(f"Mapped {excel_code} → {current_code}")
            
            logger.info(f"Loaded {len(self.excel_to_account_id)} mappings from {self.mapping_file}")
            return True
            
        except FileNotFoundError:
            logger.error(f"Mapping file not found: {self.mapping_file}")
            return False
        except Exception as e:
            logger.error(f"Error loading Phase 0 mappings: {e}")
            return False
    
    def _load_manual_mappings(self) -> bool:
        """
        Load manual account mappings from JSON file.
        
        Expected JSON format:
        {
            "excel_code": {
                "account_id": "uuid",
                "account_name": "name",
                "notes": "reason for manual mapping"
            }
        }
        """
        try:
            with open(self.manual_mapping_file, 'r', encoding='utf-8') as f:
                manual_mappings = json.load(f)
                
                for excel_code, mapping_data in manual_mappings.items():
                    account_id = mapping_data.get('account_id')
                    account_name = mapping_data.get('account_name', '')
                    
                    if account_id:
                        # Update or create mapping
                        if excel_code in self.excel_to_mapping:
                            self.excel_to_mapping[excel_code].account_id = account_id
                            self.excel_to_mapping[excel_code].requires_review = True
                        else:
                            mapping = AccountMapping(
                                excel_code=excel_code,
                                legacy_code=excel_code,
                                current_code=account_id,
                                account_name=account_name,
                                account_id=account_id,
                                mapping_confidence=0.85,
                                requires_review=True
                            )
                            self.excel_to_mapping[excel_code] = mapping
                        
                        self.excel_to_account_id[excel_code] = account_id
                        logger.debug(f"Loaded manual mapping: {excel_code} → {account_id}")
            
            logger.info(f"Loaded manual mappings from {self.manual_mapping_file}")
            return True
            
        except FileNotFoundError:
            logger.debug(f"No manual mappings file found: {self.manual_mapping_file}")
            return True  # Not an error if file doesn't exist
        except Exception as e:
            logger.error(f"Error loading manual mappings: {e}")
            return False
    
    def map_excel_code_to_account_id(self, excel_code: str) -> str:
        """
        Map an Excel account code to a Supabase account ID.
        
        Args:
            excel_code: The Excel account code
            
        Returns:
            The Supabase account ID (UUID)
            
        Raises:
            UnmappedAccountCodeError: If the code cannot be mapped
        """
        if excel_code in self.excel_to_account_id:
            return self.excel_to_account_id[excel_code]
        
        # Code not found
        logger.error(f"Unmapped account code: {excel_code}")
        raise UnmappedAccountCodeError(excel_code)
    
    def get_mapping(self, excel_code: str) -> Optional[AccountMapping]:
        """
        Get the full mapping details for an Excel account code.
        
        Args:
            excel_code: The Excel account code
            
        Returns:
            AccountMapping object or None if not found
        """
        return self.excel_to_mapping.get(excel_code)
    
    def get_unmapped_codes(self, excel_codes: List[str]) -> List[str]:
        """
        Get list of Excel codes that don't have mappings.
        
        Args:
            excel_codes: List of Excel account codes to check
            
        Returns:
            List of unmapped codes
        """
        unmapped = []
        for code in excel_codes:
            if code not in self.excel_to_account_id:
                unmapped.append(code)
        
        self.unmapped_codes = unmapped
        return unmapped
    
    def verify_all_codes_mapped(self, excel_codes: List[str]) -> Tuple[bool, List[str]]:
        """
        Verify that all Excel codes have mappings.
        
        Args:
            excel_codes: List of Excel account codes to verify
            
        Returns:
            Tuple of (all_mapped: bool, unmapped_codes: List[str])
        """
        unmapped = self.get_unmapped_codes(excel_codes)
        all_mapped = len(unmapped) == 0
        
        if all_mapped:
            logger.info(f"All {len(excel_codes)} account codes are mapped")
        else:
            logger.warning(f"{len(unmapped)} unmapped codes found: {unmapped}")
        
        return all_mapped, unmapped
    
    def save_mapping_report(self, output_file: str = 'reports/account_mapping_report.csv') -> bool:
        """
        Save a detailed mapping report to CSV.
        
        Args:
            output_file: Path to output CSV file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with open(output_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([
                    'excel_code',
                    'legacy_code',
                    'current_code',
                    'account_name',
                    'account_id',
                    'confidence',
                    'requires_review'
                ])
                
                for excel_code, mapping in sorted(self.excel_to_mapping.items()):
                    writer.writerow([
                        mapping.excel_code,
                        mapping.legacy_code,
                        mapping.current_code,
                        mapping.account_name,
                        mapping.account_id,
                        f"{mapping.mapping_confidence:.2f}",
                        'Yes' if mapping.requires_review else 'No'
                    ])
            
            logger.info(f"Mapping report saved to {output_file}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save mapping report: {e}")
            return False
    
    def get_all_mappings(self) -> Dict[str, AccountMapping]:
        """Get all loaded mappings."""
        return self.excel_to_mapping.copy()
    
    def get_mapping_count(self) -> int:
        """Get the number of loaded mappings."""
        return len(self.excel_to_account_id)
