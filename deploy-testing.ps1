# Testing Environment Deployment Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🧪 TESTING ENVIRONMENT DEPLOYMENT" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not available" -ForegroundColor Red
    Write-Host "Please ensure Node.js is properly installed" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Install dependencies if needed
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
try {
    npm install
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Build the testing version
Write-Host "🔨 Building testing environment..." -ForegroundColor Blue
try {
    npm run build:test
    Write-Host "✅ Build completed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Display connection info
Write-Host "🚀 Starting testing environment server..." -ForegroundColor Blue
Write-Host ""
Write-Host "🌐 Testing Environment will be available at:" -ForegroundColor Green
Write-Host "   http://localhost:4174" -ForegroundColor White
Write-Host ""
Write-Host "👑 Superadmin Login:" -ForegroundColor Yellow
Write-Host "   Email: mohamedelrefae81@gmail.com" -ForegroundColor White
Write-Host "   (Use your actual password from Supabase Auth)" -ForegroundColor Gray
Write-Host ""
Write-Host "🧪 Test User Logins:" -ForegroundColor Yellow
Write-Host "   admin@test.com / TestAdmin123!" -ForegroundColor White
Write-Host "   manager@test.com / TestManager123!" -ForegroundColor White
Write-Host "   accountant@test.com / TestAccount123!" -ForegroundColor White
Write-Host "   clerk@test.com / TestClerk123!" -ForegroundColor White
Write-Host "   viewer@test.com / TestViewer123!" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan

# Start the preview server
try {
    npm run preview:test
} catch {
    Write-Host "❌ Failed to start preview server" -ForegroundColor Red
    Write-Host "You can try running manually: npm run preview:test" -ForegroundColor Yellow
}

Read-Host "Press Enter to exit"