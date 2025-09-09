@echo off
echo Fixing EMFILE error by temporarily managing MUI icons directory...

REM Check if esm directory exists and move it
if exist "node_modules\@mui\icons-material\esm" (
    echo Moving MUI icons ESM directory to prevent EMFILE error...
    move "node_modules\@mui\icons-material\esm" "node_modules\@mui\icons-material\esm.disabled" >nul
    echo Directory moved successfully.
) else if exist "node_modules\@mui\icons-material\esm.disabled" (
    echo MUI icons ESM directory is already disabled.
) else (
    echo MUI icons ESM directory not found.
)

echo.
echo EMFILE fix applied! You can now run:
echo   npm run dev
echo.
echo To restore MUI icons for builds, run:
echo   restore-mui-icons.bat
echo.
