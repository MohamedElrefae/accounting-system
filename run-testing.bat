@echo off
echo.
echo ========================================
echo 🧪 ACCOUNTING SYSTEM - TESTING MODE
echo ========================================
echo.

echo 📦 Installing dependencies...
call npm install
if errorlevel 1 goto error

echo.
echo 🔨 Building testing environment...
call npm run build:test
if errorlevel 1 goto error

echo.
echo ✅ Build completed successfully!
echo.
echo 🚀 Starting testing server...
echo.
echo 🌐 Testing Environment URL: http://localhost:4174
echo.
echo 👑 SUPERADMIN LOGIN:
echo    Email: mohamedelrefae81@gmail.com
echo    Password: (your Supabase Auth password)
echo.
echo 🧪 TEST USER LOGINS:
echo    admin@test.com / TestAdmin123!
echo    manager@test.com / TestManager123!
echo    accountant@test.com / TestAccount123!
echo    clerk@test.com / TestClerk123!
echo    viewer@test.com / TestViewer123!
echo.
echo 🛡️ SAFE TESTING ENVIRONMENT - No production data affected
echo.
echo ========================================
echo Starting server... (Press Ctrl+C to stop)
echo ========================================
echo.

call npm run preview:test
goto end

:error
echo.
echo ❌ Error occurred. Please check:
echo 1. Node.js and npm are properly installed
echo 2. You're in the correct directory
echo 3. Internet connection is available
echo.
pause
goto end

:end