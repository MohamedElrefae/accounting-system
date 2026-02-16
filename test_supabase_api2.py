#!/usr/bin/env python3
"""Test the Supabase API response structure"""

import os
from dotenv import load_dotenv
load_dotenv(override=True)

from supabase import create_client

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

client = create_client(url, key)

try:
    result = client.table("accounts").select("*").limit(1).execute()
    print(f"Result type: {type(result)}")
    print(f"Result attributes: {dir(result)}")
    print(f"Result.data: {result.data}")
    print(f"Result.count: {result.count}")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
