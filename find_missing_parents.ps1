$data = Import-Csv '.\1\KIRO_v4_Legacy_to_New_Mapping.csv'
$codes = $data | Select-Object -ExpandProperty NewCode | Sort-Object -Unique
$parents = $data | Where-Object { $_.NewParentCode -ne '' } | Select-Object -ExpandProperty NewParentCode | ForEach-Object { [string]([int][double]$_) } | Sort-Object -Unique
$missing = $parents | Where-Object { $_ -notin $codes }
Write-Host "Missing parent codes not in NewCode list:"
$missing | ForEach-Object { Write-Host $_ }
Write-Host "---"
Write-Host "Total missing: $($missing.Count)"
