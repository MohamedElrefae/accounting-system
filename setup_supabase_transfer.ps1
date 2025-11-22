Write-Host "========================================" -ForegroundColor Green
Write-Host "Egypt 2025 Election - Supabase Setup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`nInstalling Supabase dependencies..." -ForegroundColor Yellow
pip install -r supabase_requirements.txt

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "SETUP INSTRUCTIONS:" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`n1. Go to your Supabase project dashboard" -ForegroundColor White
Write-Host "2. Go to Settings > API" -ForegroundColor White
Write-Host "3. Copy your Project URL and anon/public key" -ForegroundColor White
Write-Host "4. Set environment variables:" -ForegroundColor White
Write-Host ""
Write-Host "   `$env:SUPABASE_URL='https://your-project-id.supabase.co'" -ForegroundColor Cyan
Write-Host "   `$env:SUPABASE_ANON_KEY='your-anon-key-here'" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Run the schema creation in Supabase SQL Editor:" -ForegroundColor White
Write-Host "   - Copy contents of supabase_schema.sql" -ForegroundColor Gray
Write-Host "   - Paste and execute in Supabase SQL Editor" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Then run: python supabase_data_transfer.py" -ForegroundColor White

Write-Host "`n========================================" -ForegroundColor Green

Read-Host "Press Enter to continue"