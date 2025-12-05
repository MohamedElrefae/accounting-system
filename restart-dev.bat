@echo off
echo ========================================
echo Restarting Development Server
echo ========================================
echo.

echo Step 1: Clearing Vite cache...
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite"
    echo ✓ Vite cache cleared
) else (
    echo ✓ No Vite cache found
)
echo.

echo Step 2: Starting dev server...
echo.
npm run dev
