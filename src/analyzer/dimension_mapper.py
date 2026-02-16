"""
Dimension Mapper Module

Maps dimension codes (project, classification, work_analysis, sub_tree) to their Supabase IDs.
Implements Requirements 7.1, 7.2, 7.3
"""

import logging
from typing import Dict, Optional, List, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class DimensionMapping:
    """Represents a mapping for a dimension code"""
    dimension_type: str  # 'project', 'classification', 'work_analysis', 'sub_tree'
    code: str
    id: str  # UUID
    name: str = ""
    is_active: bool = True


class DimensionMapper:
    """
    Maps dimension codes to Supabase dimension IDs.
    
    Handles:
    - Project codes → project_id
    - Classification codes → classification_id
    - Work analysis codes → work_analysis_id
    - Sub-tree codes → sub_tree_id
    
    Features:
    - In-memory caching for performance
    - Graceful handling of null values (optional dimensions)
    - Lazy loading from Supabase
    
    Implements Requirements 7.1, 7.2, 7.3
    """
    
    def __init__(self, supabase_client=None):
        """
        Initialize the dimension mapper.
        
        Args:
            supabase_client: Supabase client for querying dimension tables
        """
        self.supabase_client = supabase_client
        
        # Cache for each dimension type
        self.project_cache: Dict[str, DimensionMapping] = {}
        self.classification_cache: Dict[str, DimensionMapping] = {}
        self.work_analysis_cache: Dict[str, DimensionMapping] = {}
        self.sub_tree_cache: Dict[str, DimensionMapping] = {}
        
        # Track which caches have been loaded
        self.caches_loaded = {
            'project': False,
            'classification': False,
            'work_analysis': False,
            'sub_tree': False,
        }
        
        logger.info("DimensionMapper initialized")
    
    def load_all_dimensions(self) -> bool:
        """
        Load all dimension mappings from Supabase.
        
        Returns:
            True if all dimensions loaded successfully, False otherwise
        """
        try:
            success = True
            success &= self.load_projects()
            success &= self.load_classifications()
            success &= self.load_work_analysis()
            success &= self.load_sub_trees()
            
            if success:
                logger.info("All dimensions loaded successfully")
            else:
                logger.warning("Some dimensions failed to load")
            
            return success
            
        except Exception as e:
            logger.error(f"Error loading dimensions: {e}")
            return False
    
    def load_projects(self) -> bool:
        """Load project dimension mappings from Supabase."""
        try:
            if not self.supabase_client:
                logger.warning("No Supabase client available for loading projects")
                return False
            
            # Query projects table
            response = self.supabase_client.table('projects').select('id, code, name').execute()
            
            if response.data:
                for row in response.data:
                    code = str(row.get('code', '')).strip()
                    if code:
                        mapping = DimensionMapping(
                            dimension_type='project',
                            code=code,
                            id=row.get('id', ''),
                            name=row.get('name', ''),
                            is_active=True
                        )
                        self.project_cache[code] = mapping
                
                self.caches_loaded['project'] = True
                logger.info(f"Loaded {len(self.project_cache)} project mappings")
                return True
            else:
                logger.warning("No projects found in Supabase")
                self.caches_loaded['project'] = True
                return True
                
        except Exception as e:
            logger.error(f"Error loading projects: {e}")
            return False
    
    def load_classifications(self) -> bool:
        """Load classification dimension mappings from Supabase."""
        try:
            if not self.supabase_client:
                logger.warning("No Supabase client available for loading classifications")
                return False
            
            # Query classifications table
            response = self.supabase_client.table('classifications').select('id, code, name').execute()
            
            if response.data:
                for row in response.data:
                    code = str(row.get('code', '')).strip()
                    if code:
                        mapping = DimensionMapping(
                            dimension_type='classification',
                            code=code,
                            id=row.get('id', ''),
                            name=row.get('name', ''),
                            is_active=True
                        )
                        self.classification_cache[code] = mapping
                
                self.caches_loaded['classification'] = True
                logger.info(f"Loaded {len(self.classification_cache)} classification mappings")
                return True
            else:
                logger.warning("No classifications found in Supabase")
                self.caches_loaded['classification'] = True
                return True
                
        except Exception as e:
            logger.error(f"Error loading classifications: {e}")
            return False
    
    def load_work_analysis(self) -> bool:
        """Load work analysis dimension mappings from Supabase."""
        try:
            if not self.supabase_client:
                logger.warning("No Supabase client available for loading work_analysis")
                return False
            
            # Query work_analysis table
            response = self.supabase_client.table('work_analysis').select('id, code, name').execute()
            
            if response.data:
                for row in response.data:
                    code = str(row.get('code', '')).strip()
                    if code:
                        mapping = DimensionMapping(
                            dimension_type='work_analysis',
                            code=code,
                            id=row.get('id', ''),
                            name=row.get('name', ''),
                            is_active=True
                        )
                        self.work_analysis_cache[code] = mapping
                
                self.caches_loaded['work_analysis'] = True
                logger.info(f"Loaded {len(self.work_analysis_cache)} work_analysis mappings")
                return True
            else:
                logger.warning("No work_analysis found in Supabase")
                self.caches_loaded['work_analysis'] = True
                return True
                
        except Exception as e:
            logger.error(f"Error loading work_analysis: {e}")
            return False
    
    def load_sub_trees(self) -> bool:
        """Load sub_tree dimension mappings from Supabase."""
        try:
            if not self.supabase_client:
                logger.warning("No Supabase client available for loading sub_trees")
                return False
            
            # Query sub_tree table
            response = self.supabase_client.table('sub_tree').select('id, code, name').execute()
            
            if response.data:
                for row in response.data:
                    code = str(row.get('code', '')).strip()
                    if code:
                        mapping = DimensionMapping(
                            dimension_type='sub_tree',
                            code=code,
                            id=row.get('id', ''),
                            name=row.get('name', ''),
                            is_active=True
                        )
                        self.sub_tree_cache[code] = mapping
                
                self.caches_loaded['sub_tree'] = True
                logger.info(f"Loaded {len(self.sub_tree_cache)} sub_tree mappings")
                return True
            else:
                logger.warning("No sub_tree found in Supabase")
                self.caches_loaded['sub_tree'] = True
                return True
                
        except Exception as e:
            logger.error(f"Error loading sub_trees: {e}")
            return False
    
    def map_project_code(self, code: Optional[str]) -> Optional[str]:
        """
        Map a project code to project_id.
        
        Args:
            code: Project code (can be None for optional dimensions)
            
        Returns:
            Project ID (UUID) or None if not found or code is None
        """
        if code is None or code == '' or str(code).strip() == '':
            return None
        
        code = str(code).strip()
        
        if not self.caches_loaded['project']:
            self.load_projects()
        
        mapping = self.project_cache.get(code)
        if mapping:
            return mapping.id
        
        logger.warning(f"Project code not found: {code}")
        return None
    
    def map_classification_code(self, code: Optional[str]) -> Optional[str]:
        """
        Map a classification code to classification_id.
        
        Args:
            code: Classification code (can be None for optional dimensions)
            
        Returns:
            Classification ID (UUID) or None if not found or code is None
        """
        if code is None or code == '' or str(code).strip() == '':
            return None
        
        code = str(code).strip()
        
        if not self.caches_loaded['classification']:
            self.load_classifications()
        
        mapping = self.classification_cache.get(code)
        if mapping:
            return mapping.id
        
        logger.warning(f"Classification code not found: {code}")
        return None
    
    def map_work_analysis_code(self, code: Optional[str]) -> Optional[str]:
        """
        Map a work analysis code to work_analysis_id.
        
        Args:
            code: Work analysis code (can be None for optional dimensions)
            
        Returns:
            Work analysis ID (UUID) or None if not found or code is None
        """
        if code is None or code == '' or str(code).strip() == '':
            return None
        
        code = str(code).strip()
        
        if not self.caches_loaded['work_analysis']:
            self.load_work_analysis()
        
        mapping = self.work_analysis_cache.get(code)
        if mapping:
            return mapping.id
        
        logger.warning(f"Work analysis code not found: {code}")
        return None
    
    def map_sub_tree_code(self, code: Optional[str]) -> Optional[str]:
        """
        Map a sub_tree code to sub_tree_id.
        
        Args:
            code: Sub-tree code (can be None for optional dimensions)
            
        Returns:
            Sub-tree ID (UUID) or None if not found or code is None
        """
        if code is None or code == '' or str(code).strip() == '':
            return None
        
        code = str(code).strip()
        
        if not self.caches_loaded['sub_tree']:
            self.load_sub_trees()
        
        mapping = self.sub_tree_cache.get(code)
        if mapping:
            return mapping.id
        
        logger.warning(f"Sub-tree code not found: {code}")
        return None
    
    def get_dimension_mapping(self, dimension_type: str, code: str) -> Optional[DimensionMapping]:
        """
        Get the full mapping details for a dimension code.
        
        Args:
            dimension_type: Type of dimension ('project', 'classification', 'work_analysis', 'sub_tree')
            code: The dimension code
            
        Returns:
            DimensionMapping object or None if not found
        """
        cache = self._get_cache(dimension_type)
        if cache is None:
            return None
        
        return cache.get(code)
    
    def _get_cache(self, dimension_type: str) -> Optional[Dict[str, DimensionMapping]]:
        """Get the cache for a dimension type."""
        if dimension_type == 'project':
            return self.project_cache
        elif dimension_type == 'classification':
            return self.classification_cache
        elif dimension_type == 'work_analysis':
            return self.work_analysis_cache
        elif dimension_type == 'sub_tree':
            return self.sub_tree_cache
        else:
            logger.error(f"Unknown dimension type: {dimension_type}")
            return None
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get statistics about loaded caches."""
        return {
            'project_count': len(self.project_cache),
            'classification_count': len(self.classification_cache),
            'work_analysis_count': len(self.work_analysis_cache),
            'sub_tree_count': len(self.sub_tree_cache),
            'total_dimensions': (
                len(self.project_cache) +
                len(self.classification_cache) +
                len(self.work_analysis_cache) +
                len(self.sub_tree_cache)
            ),
            'caches_loaded': self.caches_loaded,
        }
    
    def clear_caches(self):
        """Clear all cached dimension mappings."""
        self.project_cache.clear()
        self.classification_cache.clear()
        self.work_analysis_cache.clear()
        self.sub_tree_cache.clear()
        
        for key in self.caches_loaded:
            self.caches_loaded[key] = False
        
        logger.info("All dimension caches cleared")
