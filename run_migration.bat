@echo off
REM Excel Data Migration - Windows Batch Script
REM This script prepares Excel data for Supabase migration

echo.
echo ========================================================================
echo                    EXCEL DATA MIGRATION - STEP 1
echo ========================================================================
echo.
echo Preparing data from: transactions.xlsx
echo Organization ID: d5789445-11e3-4ad6-9297-b56521675114
echo Output directory: data/prepared
echo.

REM Load environment variables from .env file
echo Loading environment variables from .env...
if exist .env (
    for /f "delims== tokens=1,2" %%a in (.env) do (
        if not "%%a"=="" (
            if not "%%a:~0,1%"=="#" (
                set "%%a=%%b"
                echo   Set %%a
            )
        )
    )
    echo Environment variables loaded
) else (
    echo Warning: .env file not found
)

echo.

python scripts/prepare_migration_data.py --org-id d5789445-11e3-4ad6-9297-b56521675114 --excel-file transactions.xlsx --output-dir data/prepared

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================================
    echo                         SUCCESS!
    echo ========================================================================
    echo.
    echo Prepared CSV files created in: data/prepared
    echo.
    echo Next steps:
    echo 1. Review mapping report: type data\prepared\mapping_report.json
    echo 2. Check CSV files: type data\prepared\transactions_prepared.csv
    echo 3. Upload via Supabase Dashboard: https://app.supabase.com
    echo.
) else (
    echo.
    echo ========================================================================
    echo                         ERROR!
    echo ========================================================================
    echo.
    echo Migration preparation failed. Check the error messages above.
    echo.
    pause
)
