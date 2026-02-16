# Excel Data Migration - PowerShell Script
# This script prepares Excel data for Supabase migration

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "                    EXCEL DATA MIGRATION - STEP 1" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Preparing data from: transactions.xlsx" -ForegroundColor Yellow
Write-Host "Organization ID: d5789445-11e3-4ad6-9297-b56521675114" -ForegroundColor Yellow
Write-Host "Output directory: data/prepared" -ForegroundColor Yellow
Write-Host ""

# Load environment variables from .env file
Write-Host "Loading environment variables from .env..." -ForegroundColor Cyan
if (Test-Path ".env") {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "  Set $key" -ForegroundColor Gray
        }
    }
    Write-Host "Environment variables loaded" -ForegroundColor Green
} else {
    Write-Host "Warning: .env file not found" -ForegroundColor Yellow
}

Write-Host ""

# Run the migration script
python scripts/prepare_migration_data.py `
  --org-id d5789445-11e3-4ad6-9297-b56521675114 `
  --excel-file transactions.xlsx `
  --output-dir data/prepared

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Green
    Write-Host "                         SUCCESS!" -ForegroundColor Green
    Write-Host "========================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prepared CSV files created in: data/prepared" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Review mapping report:" -ForegroundColor Cyan
    Write-Host "   Get-Content data\prepared\mapping_report.json" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Check CSV files:" -ForegroundColor Cyan
    Write-Host "   Get-Content data\prepared\transactions_prepared.csv | Select-Object -First 5" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Upload via Supabase Dashboard:" -ForegroundColor Cyan
    Write-Host "   https://app.supabase.com" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Red
    Write-Host "                         ERROR!" -ForegroundColor Red
    Write-Host "========================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Migration preparation failed. Check the error messages above." -ForegroundColor Red
    Write-Host ""
}
