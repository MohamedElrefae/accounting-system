$branches = @(
    "chore/lint-fix-sprint",
    "chore/remove-legacy-user-management",
    "chore/unify-to-sub-tree-imports",
    "develop",
    "enhanced-reports",
    "enhanced-user-experience",
    "feature/auth",
    "feature/financial-reports",
    "fix/approval-inbox-filter-submitted",
    "gl2-foundation-prep",
    "optimize-performance",
    "revert-to-last-deploy",
    "unify-multiline-accounting"
)

$results = @()

foreach ($branch in $branches) {
    Write-Host "`n=== Checking branch: $branch ===" -ForegroundColor Cyan
    
    # Checkout branch
    git checkout $branch 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to checkout $branch" -ForegroundColor Red
        $results += [PSCustomObject]@{
            Branch = $branch
            Status = "CHECKOUT_FAILED"
            Changes = 0
            Committed = $false
            Pushed = $false
        }
        continue
    }
    
    # Check for uncommitted changes
    $status = git status --porcelain
    $hasChanges = $status.Length -gt 0
    
    if ($hasChanges) {
        $changeCount = ($status -split "`n").Count
        Write-Host "Found $changeCount uncommitted changes" -ForegroundColor Yellow
        
        # Stage all changes
        git add .
        
        # Commit
        git commit -m "chore: Commit pending work on $branch branch (Round 2)"
        
        # Push to remote
        $pushResult = git push origin $branch 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully committed and pushed" -ForegroundColor Green
            $results += [PSCustomObject]@{
                Branch = $branch
                Status = "COMMITTED_AND_PUSHED"
                Changes = $changeCount
                Committed = $true
                Pushed = $true
            }
        } else {
            Write-Host "Committed but push failed" -ForegroundColor Yellow
            $results += [PSCustomObject]@{
                Branch = $branch
                Status = "COMMITTED_PUSH_FAILED"
                Changes = $changeCount
                Committed = $true
                Pushed = $false
            }
        }
    } else {
        Write-Host "No uncommitted changes" -ForegroundColor Green
        
        # Check for unpushed commits
        $unpushed = git log origin/$branch..HEAD --oneline 2>&1
        
        if ($unpushed -and $unpushed.Length -gt 0 -and $unpushed -notmatch "fatal") {
            Write-Host "Found unpushed commits, pushing..." -ForegroundColor Yellow
            git push origin $branch
            
            $results += [PSCustomObject]@{
                Branch = $branch
                Status = "PUSHED_EXISTING_COMMITS"
                Changes = 0
                Committed = $false
                Pushed = $true
            }
        } else {
            $results += [PSCustomObject]@{
                Branch = $branch
                Status = "CLEAN"
                Changes = 0
                Committed = $false
                Pushed = $false
            }
        }
    }
}

# Return to main
git checkout main

# Display summary
Write-Host "`n`n=== SUMMARY ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize

# Save to file
$results | ConvertTo-Json | Out-File "branch_scan_results_v2.json"
Write-Host "`nResults saved to branch_scan_results_v2.json" -ForegroundColor Green
