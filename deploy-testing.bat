@echo off
echo ========================================
echo 🧪 TESTING ENVIRONMENT DEPLOYMENT
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo Then run this script again
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not available
    echo Please ensure Node.js is properly installed
    pause
    exit /b 1
)

echo ✅ Node.js and npm are available
echo.

REM Install dependencies if needed
echo 📦 Installing dependencies...
call npm install

REM Build the testing version
echo 🔨 Building testing environment...
call npm run build:test

if errorlevel 1 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo ✅ Build completed successfully
echo.

REM Start the preview server
echo 🚀 Starting testing environment server...
echo.
echo 🌐 Testing Environment will be available at:
echo    http://localhost:4174
echo.
echo 👑 Superadmin Login:
echo    Email: mohamedelrefae81@gmail.com
echo    (Use your actual password from Supabase Auth)
echo.
echo 🧪 Test User Logins:
echo    admin@test.com / TestAdmin123!
echo    manager@test.com / TestManager123!
echo    accountant@test.com / TestAccount123!
echo    clerk@test.com / TestClerk123!
echo    viewer@test.com / TestViewer123!
echo.
echo Press Ctrl+C to stop the server
echo ========================================

call npm run preview:test

pause