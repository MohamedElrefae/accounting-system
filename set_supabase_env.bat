@echo off
echo Setting up Supabase environment variables...
echo.
echo Please enter your Supabase project details:
echo.

set /p SUPABASE_URL="Enter your Supabase URL (https://your-project.supabase.co): "
set /p SUPABASE_ANON_KEY="Enter your Supabase anon key: "

echo.
echo Setting environment variables...
setx SUPABASE_URL "%SUPABASE_URL%"
setx SUPABASE_ANON_KEY "%SUPABASE_ANON_KEY%"

echo.
echo ✅ Environment variables set successfully!
echo.
echo You can now run: python supabase_data_transfer.py
echo.
echo Note: You may need to restart your command prompt for the 
echo environment variables to take effect.
echo.
pause