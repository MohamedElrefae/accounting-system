@echo off
echo Restoring MUI icons directory for builds...

REM Check if disabled directory exists and restore it
if exist "node_modules\@mui\icons-material\esm.disabled" (
    echo Restoring MUI icons ESM directory...
    move "node_modules\@mui\icons-material\esm.disabled" "node_modules\@mui\icons-material\esm" >nul
    echo Directory restored successfully.
) else if exist "node_modules\@mui\icons-material\esm" (
    echo MUI icons ESM directory is already available.
) else (
    echo MUI icons ESM directory not found. Try running npm install.
)

echo.
echo MUI icons restored! You can now run builds.
echo To fix EMFILE error for development, run:
echo   fix-emfile.bat
echo.
