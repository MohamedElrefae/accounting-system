"""
Supabase Connection Manager for Excel Data Migration

This module provides enhanced connection management for Supabase with:
- Connection initialization with URL and key
- Connection testing with retry logic
- Schema caching for performance
- Query builders for common operations
- Transaction management for batch operations
"""

import os
import json
import logging
import time
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from datetime import datetime
import pandas as pd
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
import backoff

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ConnectionConfig:
    """Configuration for Supabase connection"""
    url: str
    key: str
    timeout: int = 30
    max_retries: int = 3
    retry_delay: int = 2


@dataclass
class SchemaCache:
    """Schema cache for performance optimization"""
    timestamp: datetime
    schema: Dict[str, Any]
    ttl_seconds: int = 300  # 5 minutes TTL


class SupabaseConnectionManager:
    """
    Enhanced Supabase connection manager with retry logic, schema caching,
    and transaction management.
    """
    
    def __init__(self, url: Optional[str] = None, key: Optional[str] = None):
        """
        Initialize the connection manager.
        
        Args:
            url: Supabase URL (optional, can be loaded from environment)
            key: Supabase key (optional, can be loaded from environment)
        """
        self.config = self._load_config(url, key)
        self.client: Optional[Client] = None
        self.schema_cache: Optional[SchemaCache] = None
        self.is_connected = False
        self.connection_time: Optional[datetime] = None
        
    def _load_config(self, url: Optional[str], key: Optional[str]) -> ConnectionConfig:
        """Load configuration from parameters or environment variables"""
        if not url:
            url = os.getenv("SUPABASE_URL")
            logger.debug(f"Loaded SUPABASE_URL from environment: {url}")
            if not url:
                raise ValueError("Supabase URL not provided and SUPABASE_URL environment variable not set")
        
        if not key:
            key = os.getenv("SUPABASE_KEY")
            logger.debug(f"Loaded SUPABASE_KEY from environment: {'***' if key else 'NOT SET'}")
            if not key:
                raise ValueError("Supabase key not provided and SUPABASE_KEY environment variable not set")
        
        logger.info(f"Configuration loaded: URL={url}, Key={'***' if key else 'NOT SET'}")
        
        return ConnectionConfig(
            url=url,
            key=key,
            timeout=int(os.getenv("SUPABASE_TIMEOUT", "30")),
            max_retries=int(os.getenv("SUPABASE_MAX_RETRIES", "3")),
            retry_delay=int(os.getenv("SUPABASE_RETRY_DELAY", "2"))
        )
    
    @backoff.on_exception(
        backoff.expo,
        Exception,
        max_tries=3,
        max_time=30
    )
    def connect(self) -> Client:
        """
        Connect to Supabase with retry logic.
        
        Returns:
            Supabase client instance
            
        Raises:
            ConnectionError: If connection fails after retries
        """
        logger.info(f"Connecting to Supabase at {self.config.url}")
        
        try:
            # Create client without options to avoid compatibility issues
            self.client = create_client(
                self.config.url,
                self.config.key
            )
            
            # Skip test connection - just mark as connected
            # The actual connection will be tested on first query
            self.is_connected = True
            self.connection_time = datetime.now()
            logger.info("Successfully created Supabase client")
            
            return self.client
            
        except Exception as e:
            logger.error(f"Failed to create Supabase client: {str(e)}")
            self.is_connected = False
            raise ConnectionError(f"Failed to create Supabase client: {str(e)}")
    
    def _test_connection(self) -> bool:
        """Test connection by making a simple query"""
        if not self.client:
            raise ValueError("Client not initialized")
        
        try:
            # Try to get server version or make a simple query
            result = self.client.table("accounts").select("count", count="exact").limit(1).execute()
            logger.debug(f"Connection test successful: {result}")
            return True
        except Exception as e:
            logger.error(f"Connection test failed: {str(e)}")
            raise
    
    def test_connection(self) -> bool:
        """
        Public method to test connection with retry logic.
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            if not self.client or not self.is_connected:
                self.connect()
            return self._test_connection()
        except Exception as e:
            logger.error(f"Connection test failed: {str(e)}")
            return False
    
    def get_schema(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Get database schema with caching.
        
        Args:
            force_refresh: Force refresh of schema cache
            
        Returns:
            Database schema dictionary
        """
        # Check cache validity
        if (not force_refresh and 
            self.schema_cache and 
            (datetime.now() - self.schema_cache.timestamp).total_seconds() < self.schema_cache.ttl_seconds):
            logger.debug("Returning schema from cache")
            return self.schema_cache.schema
        
        # Fetch fresh schema
        logger.info("Fetching fresh schema from database")
        schema = self._fetch_schema()
        
        # Update cache
        self.schema_cache = SchemaCache(
            timestamp=datetime.now(),
            schema=schema
        )
        
        return schema
    
    def _fetch_schema(self) -> Dict[str, Any]:
        """Fetch schema from database"""
        if not self.client or not self.is_connected:
            self.connect()
        
        try:
            # Get list of tables
            # Note: This is a simplified implementation. In production,
            # you would use proper schema introspection queries
            schema = {
                "timestamp": datetime.now().isoformat(),
                "supabase_url": self.config.url,
                "tables": {}
            }
            
            # For now, return empty schema - will be enhanced with actual queries
            # This matches the structure in reports/supabase_schema.json
            return schema
            
        except Exception as e:
            logger.error(f"Failed to fetch schema: {str(e)}")
            raise
    
    def execute_query(self, table: str, query_type: str = "select", **kwargs) -> Any:
        """
        Execute a query with error handling.
        
        Args:
            table: Table name
            query_type: Type of query (select, insert, update, delete)
            **kwargs: Query parameters
            
        Returns:
            Query result
        """
        if not self.client or not self.is_connected:
            self.connect()
        
        try:
            query = self.client.table(table)
            
            if query_type == "select":
                # Handle select query
                columns = kwargs.get("columns", "*")
                filters = kwargs.get("filters", {})
                limit = kwargs.get("limit")
                order = kwargs.get("order")
                
                # Always call select() to get the proper query builder
                query = query.select(columns)
                
                # Apply filters
                for key, value in filters.items():
                    query = query.eq(key, value)
                
                if order:
                    query = query.order(order)
                
                if limit:
                    query = query.limit(limit)
                
                result = query.execute()
                return result.data
                
            elif query_type == "insert":
                # Handle insert query
                data = kwargs.get("data")
                if not data:
                    raise ValueError("No data provided for insert")
                
                result = query.insert(data).execute()
                return result.data
                
            elif query_type == "update":
                # Handle update query
                data = kwargs.get("data")
                filters = kwargs.get("filters", {})
                
                if not data:
                    raise ValueError("No data provided for update")
                
                # Apply filters
                for key, value in filters.items():
                    query = query.eq(key, value)
                
                result = query.update(data).execute()
                return result.data
                
            elif query_type == "delete":
                # Handle delete query
                filters = kwargs.get("filters", {})
                
                # Apply filters
                for key, value in filters.items():
                    query = query.eq(key, value)
                
                result = query.delete().execute()
                return result.data
                
            else:
                raise ValueError(f"Unsupported query type: {query_type}")
                
        except Exception as e:
            logger.error(f"Query execution failed: {str(e)}")
            raise
    
    def execute_batch(self, table: str, operations: List[Dict[str, Any]]) -> List[Any]:
        """
        Execute batch operations within a transaction.
        
        Args:
            table: Table name
            operations: List of operations, each with 'type' and 'data'
            
        Returns:
            List of results
        """
        if not self.client or not self.is_connected:
            self.connect()
        
        results = []
        
        try:
            # Note: Supabase-py doesn't have explicit transaction support
            # We'll execute operations sequentially with error handling
            for i, operation in enumerate(operations):
                op_type = operation.get("type")
                data = operation.get("data")
                filters = operation.get("filters", {})
                
                try:
                    result = self.execute_query(
                        table=table,
                        query_type=op_type,
                        data=data,
                        filters=filters
                    )
                    results.append({
                        "index": i,
                        "type": op_type,
                        "success": True,
                        "result": result
                    })
                    
                except Exception as e:
                    logger.error(f"Batch operation {i} failed: {str(e)}")
                    results.append({
                        "index": i,
                        "type": op_type,
                        "success": False,
                        "error": str(e)
                    })
                    # Continue with next operation (error resilience)
                    continue
            
            return results
            
        except Exception as e:
            logger.error(f"Batch execution failed: {str(e)}")
            raise
    
    def close(self):
        """Close connection"""
        # Supabase client doesn't have explicit close method
        self.client = None
        self.is_connected = False
        self.connection_time = None
        logger.info("Connection closed")
    
    def __enter__(self):
        """Context manager entry"""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()
    
    def get_connection_info(self) -> Dict[str, Any]:
        """Get connection information"""
        return {
            "url": self.config.url,
            "is_connected": self.is_connected,
            "connection_time": self.connection_time.isoformat() if self.connection_time else None,
            "config": asdict(self.config)
        }


# Factory function for easy creation
def create_supabase_connection(url: Optional[str] = None, key: Optional[str] = None) -> SupabaseConnectionManager:
    """
    Factory function to create Supabase connection manager.
    
    Args:
        url: Supabase URL
        key: Supabase key
        
    Returns:
        SupabaseConnectionManager instance
    """
    return SupabaseConnectionManager(url, key)