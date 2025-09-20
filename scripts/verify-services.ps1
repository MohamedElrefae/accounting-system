# 🔍 QUICK SERVICES VERIFICATION (PowerShell)
# =============================================
# 
# This script quickly verifies that our transaction line items
# services are working correctly after the cleanup.

Write-Host "🔍 Quick Service Verification" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
$results = @{
    CorrectServices = 0
    CorrectComponents = 0
    DeprecatedServices = 0
    DeprecatedComponents = 0
    ErrorServices = 0
    TotalFiles = 0
}

function Check-File {
    param(
        [string]$FilePath,
        [string]$Description
    )
    
    $results.TotalFiles++
    $fullPath = Join-Path $projectRoot $FilePath
    
    try {
        if (-not (Test-Path $fullPath)) {
            Write-Host "❌ $Description`: File not found" -ForegroundColor Red
            $results.ErrorServices++
            return "error"
        }
        
        $content = Get-Content $fullPath -Raw
        
        if ($content -match "DEPRECATED|deprecated") {
            Write-Host "⚠️  $Description`: DEPRECATED (as expected)" -ForegroundColor Yellow
            return "deprecated"
        }
        elseif ($content -match "transaction_line_items" -and $content -notmatch "line_items[^_]") {
            Write-Host "✅ $Description`: Using correct table" -ForegroundColor Green
            return "correct"
        }
        elseif ($content -match "line_items[^_]" -and $content -notmatch "transaction_line_items") {
            Write-Host "❌ $Description`: Still using old table" -ForegroundColor Red
            return "incorrect"
        }
        elseif ($content -match "transaction_line_items" -and $content -match "line_items[^_]") {
            Write-Host "⚠️  $Description`: Mixed usage - needs review" -ForegroundColor Yellow
            return "mixed"
        }
        else {
            Write-Host "ℹ️  $Description`: No database queries found" -ForegroundColor Blue
            return "no-queries"
        }
    }
    catch {
        Write-Host "❌ $Description`: Error reading file - $($_.Exception.Message)" -ForegroundColor Red
        $results.ErrorServices++
        return "error"
    }
}

# Check key service files
Write-Host "📋 CHECKING SERVICE FILES:" -ForegroundColor White
Write-Host "==========================" -ForegroundColor White

$services = @(
    @{ File = "src\services\cost-analysis.ts"; Name = "Cost Analysis Service" },
    @{ File = "src\services\transaction-line-items.ts"; Name = "Transaction Line Items Service" },
    @{ File = "src\services\transaction-line-items-enhanced.ts"; Name = "Enhanced Transaction Line Items Service" },
    @{ File = "src\services\line-items.ts"; Name = "Legacy Line Items Service (should be deprecated)" },
    @{ File = "src\services\line-items-admin.ts"; Name = "Legacy Admin Service (should be deprecated)" }
)

foreach ($service in $services) {
    $result = Check-File -FilePath $service.File -Description $service.Name
    switch ($result) {
        "correct" { $results.CorrectServices++ }
        "deprecated" { $results.DeprecatedServices++ }
        "no-queries" { $results.CorrectServices++ }
    }
}

Write-Host ""
Write-Host "📋 CHECKING COMPONENT FILES:" -ForegroundColor White
Write-Host "============================" -ForegroundColor White

$components = @(
    @{ File = "src\components\line-items\TransactionLineItemsSection.tsx"; Name = "Transaction Line Items Section" },
    @{ File = "src\components\Transactions\TransactionAnalysisModal.tsx"; Name = "Transaction Analysis Modal" },
    @{ File = "src\components\line-items\LineItemDropdown.tsx"; Name = "Legacy Dropdown (should be deprecated)" },
    @{ File = "src\components\line-items\LineItemsEditor.tsx"; Name = "Legacy Editor (should be deprecated)" },
    @{ File = "src\pages\MainData\CostAnalysisItems.tsx"; Name = "Cost Analysis Items Page" }
)

foreach ($component in $components) {
    $result = Check-File -FilePath $component.File -Description $component.Name
    switch ($result) {
        "correct" { $results.CorrectComponents++ }
        "deprecated" { $results.DeprecatedComponents++ }
        "no-queries" { $results.CorrectComponents++ }
    }
}

Write-Host ""
Write-Host "📋 CHECKING CLEANUP SCRIPT:" -ForegroundColor White
Write-Host "============================" -ForegroundColor White

Check-File -FilePath "sql\cleanup_line_items_complete.sql" -Description "Database Cleanup Script"

Write-Host ""
Write-Host "📊 VERIFICATION SUMMARY:" -ForegroundColor White
Write-Host "========================" -ForegroundColor White
Write-Host "✅ Correct Services: $($results.CorrectServices)" -ForegroundColor Green
Write-Host "✅ Correct Components: $($results.CorrectComponents)" -ForegroundColor Green
Write-Host "⚠️  Deprecated Files: $($results.DeprecatedServices + $results.DeprecatedComponents)" -ForegroundColor Yellow
Write-Host "❌ Error Files: $($results.ErrorServices)" -ForegroundColor Red

$workingFiles = $results.CorrectServices + $results.CorrectComponents + $results.DeprecatedServices + $results.DeprecatedComponents
$healthScore = [math]::Round(($workingFiles / $results.TotalFiles) * 100)

Write-Host ""
Write-Host "🎯 Health Score: $healthScore%" -ForegroundColor Cyan

if ($healthScore -ge 90) {
    Write-Host ""
    Write-Host "🎉 EXCELLENT! Services are properly configured" -ForegroundColor Green
    Write-Host "✅ Ready for database cleanup" -ForegroundColor Green
    Write-Host "✅ Ready for production use" -ForegroundColor Green
}
elseif ($healthScore -ge 70) {
    Write-Host ""
    Write-Host "👍 GOOD! Most services are working" -ForegroundColor Yellow
    Write-Host "⚠️  Some issues may need attention" -ForegroundColor Yellow
}
else {
    Write-Host ""
    Write-Host "⚠️  NEEDS ATTENTION! Several issues detected" -ForegroundColor Red
    Write-Host "❌ Please review the errors above" -ForegroundColor Red
}

Write-Host ""
Write-Host "🚀 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "==============" -ForegroundColor Cyan
Write-Host "1. Run database cleanup script in your database client:"
Write-Host "   Load and execute: sql/cleanup_line_items_complete.sql" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Test your application:"
Write-Host "   npm run dev  # or your development command" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Verify Cost Analysis Items page works correctly"
Write-Host "4. Test transaction line items functionality"

if ($healthScore -ge 70) {
    exit 0
} else {
    exit 1
}