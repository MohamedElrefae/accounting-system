#!/usr/bin/env python3
"""Test the Supabase API to understand the correct usage"""

import os
from dotenv import load_dotenv
load_dotenv(override=True)

from supabase import create_client

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

print(f"Connecting to: {url}")

client = create_client(url, key)

# Test the API
try:
    print("\nTesting query builder...")
    query = client.table("accounts").select("*").limit(1)
    print(f"Query type: {type(query)}")
    print(f"Query methods: {[m for m in dir(query) if not m.startswith('_')]}")
    
    # Try to execute
    print("\nTrying to execute...")
    result = query.execute()
    print(f"Result type: {type(result)}")
    print(f"Result: {result}")
    
except Exception as e:
    print(f"Error: {e}")
    print(f"Error type: {type(e)}")
    import traceback
    traceback.print_exc()
