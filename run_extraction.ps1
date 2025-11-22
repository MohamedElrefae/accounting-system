Write-Host "Installing Python dependencies..." -ForegroundColor Green
pip install -r requirements.txt

Write-Host "`nStarting PDF extraction..." -ForegroundColor Green
python extract_motobus_data.py

Write-Host "`nExtraction complete! Check the motobus_output folder for results." -ForegroundColor Yellow
Read-Host "Press Enter to continue"