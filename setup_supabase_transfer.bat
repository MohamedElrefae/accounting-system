@echo off
echo ========================================
echo Egypt 2025 Election - Supabase Setup
echo ========================================

echo.
echo Installing Supabase dependencies...
pip install -r supabase_requirements.txt

echo.
echo ========================================
echo SETUP INSTRUCTIONS:
echo ========================================
echo.
echo 1. Go to your Supabase project dashboard
echo 2. Go to Settings ^> API
echo 3. Copy your Project URL and anon/public key
echo 4. Set environment variables:
echo.
echo    set SUPABASE_URL=https://your-project-id.supabase.co
echo    set SUPABASE_ANON_KEY=your-anon-key-here
echo.
echo 5. Run the schema creation in Supabase SQL Editor:
echo    - Copy contents of supabase_schema.sql
echo    - Paste and execute in Supabase SQL Editor
echo.
echo 6. Then run: python supabase_data_transfer.py
echo.
echo ========================================

pause