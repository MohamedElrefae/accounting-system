#!/usr/bin/env python3
"""Test script to verify environment variables are loaded correctly"""

import os
import sys
from pathlib import Path

# Load environment variables from .env file
from dotenv import load_dotenv

print("=" * 60)
print("ENVIRONMENT VARIABLE LOADING TEST")
print("=" * 60)

# Check current working directory
print(f"\nCurrent working directory: {os.getcwd()}")

# Check if .env file exists
env_file = Path(".env")
print(f".env file exists: {env_file.exists()}")

# Load .env file
print("\nLoading .env file...")
load_dotenv()

# Check environment variables
print("\nEnvironment variables after loading .env:")
print(f"SUPABASE_URL: {os.getenv('SUPABASE_URL')}")
print(f"SUPABASE_KEY: {'***' if os.getenv('SUPABASE_KEY') else 'NOT SET'}")
print(f"SUPABASE_SERVICE_ROLE_KEY: {'***' if os.getenv('SUPABASE_SERVICE_ROLE_KEY') else 'NOT SET'}")

# Check if the correct URL is loaded
expected_url = "https://bgxknceshxxifwytalex.supabase.co"
actual_url = os.getenv('SUPABASE_URL')

print(f"\nExpected URL: {expected_url}")
print(f"Actual URL: {actual_url}")
print(f"URLs match: {expected_url == actual_url}")

if expected_url != actual_url:
    print("\n⚠️  WARNING: URLs do not match!")
    print("This could indicate a caching issue or incorrect .env file.")
else:
    print("\n✓ URLs match correctly!")

print("\n" + "=" * 60)
