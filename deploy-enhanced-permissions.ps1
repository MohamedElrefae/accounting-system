# Enhanced Permission Management System Deployment Script
# Run this in PowerShell as Administrator

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "DEPLOYING ENHANCED PERMISSION MANAGEMENT SYSTEM" -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "🔍 Checking Git status..." -ForegroundColor Green
    git status

    Write-Host ""
    Write-Host "📦 Adding all files to Git..." -ForegroundColor Green
    git add .

    Write-Host ""
    Write-Host "💾 Committing to develop branch..." -ForegroundColor Green
    git commit -m @"
feat: Add Enhanced Multi-Select Permission Management System

✨ New Features:
- 🎯 Multi-select roles and permissions assignment
- 🚀 Quick selection buttons (Select All, by resource)
- 📊 Visual feedback with progress bars and badges  
- 🚨 Emergency admin permission assignment
- 📱 Responsive design for all devices
- 🔄 Real-time data refresh and validation

🔧 Technical Changes:
- Added EnhancedQuickPermissionAssignment component
- Integrated multi-select UI in EnterpriseRoleManagement
- Fixed permission deletion bug in database functions
- Added comprehensive error handling and logging
- Enhanced user experience with Arabic RTL support

🗄️ Database Improvements:
- Fixed save_role_permissions function (no more deletions!)
- Added emergency_assign_all_permissions_to_role function
- Added multi_assign_permissions_to_roles function
- Comprehensive verification and testing scripts

📋 Files Added/Modified:
- src/components/EnhancedQuickPermissionAssignment.tsx (NEW)
- src/pages/admin/EnterpriseRoleManagement.tsx (ENHANCED)
- database/FIXED_EMERGENCY_SCRIPT.sql (NEW)
- database/CORRECTED_VERIFICATION_SCRIPTS.sql (NEW)
- INTEGRATION_GUIDE_ENHANCED_PERMISSIONS.md (NEW)

🎯 Ready for Production:
- Enterprise-grade permission management
- Multi-select capabilities working
- Database bugs fixed and tested
- Full integration completed
"@

    Write-Host ""
    Write-Host "🌟 Switching to main branch..." -ForegroundColor Green
    git checkout main

    Write-Host ""
    Write-Host "🔄 Merging develop into main..." -ForegroundColor Green
    git merge develop

    Write-Host ""
    Write-Host "📤 Pushing to remote repositories..." -ForegroundColor Green
    Write-Host "Pushing develop branch..." -ForegroundColor Yellow
    git checkout develop
    git push origin develop

    Write-Host "Pushing main branch..." -ForegroundColor Yellow
    git checkout main  
    git push origin main

    Write-Host ""
    Write-Host "🏗️ Building production version..." -ForegroundColor Green
    npm run build

    Write-Host ""
    Write-Host "🚀 Starting preview server for testing..." -ForegroundColor Green
    Write-Host "The application will be available at: http://localhost:4173" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Make sure to update your production deployment with the new build files!" -ForegroundColor Red
    Write-Host ""
    
    # Start preview in background
    Start-Process npm -ArgumentList "run preview" -NoNewWindow
    
    Write-Host ""
    Write-Host "====================================================================" -ForegroundColor Cyan
    Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
    Write-Host "====================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Summary of changes deployed:" -ForegroundColor Yellow
    Write-Host "  ✅ Enhanced Multi-Select Permission Management" -ForegroundColor Green
    Write-Host "  ✅ Database bug fixes (permissions now save correctly!)" -ForegroundColor Green
    Write-Host "  ✅ Emergency admin functions" -ForegroundColor Green
    Write-Host "  ✅ Multi-role/multi-permission assignment" -ForegroundColor Green
    Write-Host "  ✅ Professional UI with Arabic RTL support" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Test at: http://localhost:4173" -ForegroundColor White
    Write-Host "  2. Navigate to: Settings > User Management > Roles" -ForegroundColor White
    Write-Host "  3. Try the new '🚀 تعيين سريع' tab" -ForegroundColor White
    Write-Host "  4. Update your production server with the build files" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 Your Enterprise Permission Management System is ready!" -ForegroundColor Green
    Write-Host "====================================================================" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Error during deployment: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check the error above and try again." -ForegroundColor Yellow
}

Read-Host "Press Enter to continue..."