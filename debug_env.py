#!/usr/bin/env python3
from dotenv import dotenv_values, load_dotenv
import os

# Read .env file directly
vals = dotenv_values('.env')
print("From dotenv_values:")
print(f"  SUPABASE_URL: {vals.get('SUPABASE_URL')}")

# Check os.environ
print("\nFrom os.environ (before load_dotenv):")
print(f"  SUPABASE_URL: {os.getenv('SUPABASE_URL')}")

# Load with load_dotenv (override=True)
load_dotenv(override=True)

print("\nFrom os.environ (after load_dotenv with override=True):")
print(f"  SUPABASE_URL: {os.getenv('SUPABASE_URL')}")
