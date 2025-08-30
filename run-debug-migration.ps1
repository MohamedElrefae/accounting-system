# Run debug bypass migration script
# This will enable debug mode to bypass authentication for development

Write-Host "==================================" -ForegroundColor Green
Write-Host "Running Debug Bypass Migration" -ForegroundColor Green  
Write-Host "==================================" -ForegroundColor Green

try {
    # Check if we're in the right directory
    if (-not (Test-Path "supabase\migrations\025_debug_bypass_auth.sql")) {
        Write-Host "Error: Migration file not found. Make sure you're running this from the project root." -ForegroundColor Red
        Write-Host "Current directory: $PWD" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "1. Running Supabase migration..." -ForegroundColor Yellow
    supabase db push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "==================================" -ForegroundColor Green
        Write-Host "Debug mode is now ENABLED!" -ForegroundColor Green
        Write-Host "==================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "What this means:" -ForegroundColor Cyan
        Write-Host "• All RPC functions will bypass complex authentication checks" -ForegroundColor White
        Write-Host "• Trial Balance page should load data without 403/400 errors" -ForegroundColor White
        Write-Host "• Projects and Organizations tables have been created" -ForegroundColor White
        Write-Host "• Simple RLS policies are now active" -ForegroundColor White
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Start your development server: npm run dev" -ForegroundColor White
        Write-Host "2. Navigate to Trial Balance page" -ForegroundColor White
        Write-Host "3. Use the debug toggle in top-right corner to control auth bypass" -ForegroundColor White
        Write-Host ""
        Write-Host "To disable debug mode later, use the debug toggle or run:" -ForegroundColor Yellow
        Write-Host "supabase db reset" -ForegroundColor Gray
    } else {
        Write-Host "❌ Migration failed. Check the error above." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error running migration: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
