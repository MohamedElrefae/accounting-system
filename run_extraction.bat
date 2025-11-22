@echo off
echo Installing Python dependencies...
pip install -r requirements.txt

echo.
echo Starting PDF extraction...
python extract_motobus_data.py

echo.
echo Extraction complete! Check the motobus_output folder for results.
pause