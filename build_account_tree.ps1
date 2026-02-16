# Build the complete account tree combining mapping + staging CSV
# Output a single consolidated CSV for loading

$mapping = Import-Csv '.\1\KIRO_v4_Legacy_to_New_Mapping.csv'
$staging = Import-Csv '.\ORG_d578_accounts_stage.csv'

# Build unique set from mapping file — use NewCode as key
$accounts = @{}

foreach ($row in $mapping) {
    $code = $row.NewCode
    if (-not $accounts.ContainsKey($code)) {
        # Map NewType to DB category enum
        $catMap = @{
            'ASSET'  = 'asset'
            'LIAB'   = 'liability'
            'EQUITY' = 'equity'
            'REV'    = 'revenue'
            'EXP'    = 'expense'
        }
        $category = $catMap[$row.NewType]
        if (-not $category) { $category = 'expense' } # fallback

        $parentCode = ''
        if ($row.NewParentCode -ne '') {
            $parentCode = [string]([int][double]$row.NewParentCode)
        }

        $isPostable = $row.NewPosting -eq '1'
        $allowTx = $isPostable  # allow_transactions = is_postable

        $accounts[$code] = [PSCustomObject]@{
            code               = $code
            name_ar            = $row.NewAccountName
            category           = $category
            parent_code        = $parentCode
            allow_transactions = $allowTx
            is_postable        = $isPostable
            legacy_code        = $row.LegacyCode
            legacy_name        = $row.LegacyName
        }
    }
}

# Now add intermediate parents from staging that are missing
$stagingByCode = @{}
foreach ($row in $staging) {
    $code = $row.code
    if (-not $stagingByCode.ContainsKey($code)) {
        $stagingByCode[$code] = $row
    }
}

# List of missing parents we identified
$missingParents = @('1115', '1120', '1130', '1140', '1150', '1210', '1220', '1230', '1240', '1250', '1260', '1270',
    '2210', '2220', '2230', '2250', '2270', '2280', '3100', '3200', '3300', '4210', '5210')

foreach ($mp in $missingParents) {
    if (-not $accounts.ContainsKey($mp)) {
        # Try to find in staging
        if ($stagingByCode.ContainsKey($mp)) {
            $s = $stagingByCode[$mp]
            $accounts[$mp] = [PSCustomObject]@{
                code               = $mp
                name_ar            = $s.name_ar
                category           = $s.category
                parent_code        = $s.parent_code
                allow_transactions = ($s.allow_transactions -eq 'True')
                is_postable        = ($s.is_postable -eq 'True')
                legacy_code        = $s.legacy_code
                legacy_name        = $s.legacy_name
            }
        }
        else {
            # We need to figure out the parent by looking at the code structure
            # These are intermediate parents like 1115, 1120, etc.
            # Derive parent from the mapping data - look for children that reference this parent
            $children = $mapping | Where-Object { 
                $_.NewParentCode -ne '' -and [string]([int][double]$_.NewParentCode) -eq $mp 
            }
            if ($children.Count -gt 0) {
                $child = $children[0]
                $catMap = @{ 'ASSET' = 'asset'; 'LIAB' = 'liability'; 'EQUITY' = 'equity'; 'REV' = 'revenue'; 'EXP' = 'expense' }
                $category = $catMap[$child.NewType]
                if (-not $category) { $category = 'expense' }
                
                # Derive the parent code: e.g. 1115 parent is 1110, 1120 parent is 1100
                # For 4-digit codes: parent is first 3 digits + 0, e.g. 1115 -> 1110
                # Actually it's based on the tree structure
                $parentCode = ''
                if ($mp.Length -eq 4) {
                    # e.g. 1115 -> parent should be 1100 (first 2 digits + 00)
                    # 1210 -> parent 1200
                    # 2210 -> parent 2200
                    $parentCode = $mp.Substring(0, 2) + '00'
                }
                elseif ($mp.Length -eq 3) {
                    # e.g. none in our list
                    $parentCode = $mp.Substring(0, 1) + '000'
                }
                
                # Name: derive a placeholder from child context
                $nameAr = "حساب $mp"
                
                $accounts[$mp] = [PSCustomObject]@{
                    code               = $mp
                    name_ar            = $nameAr
                    category           = $category
                    parent_code        = $parentCode
                    allow_transactions = $false
                    is_postable        = $false
                    legacy_code        = ''
                    legacy_name        = ''
                }
            }
        }
    }
}

# Output stats
Write-Host "Total unique accounts: $($accounts.Count)"
Write-Host ""

# Check which are from staging vs mapping
$fromStaging = 0
$generated = 0
foreach ($mp in $missingParents) {
    if ($accounts.ContainsKey($mp)) {
        if ($stagingByCode.ContainsKey($mp)) {
            $fromStaging++
        }
        else {
            $generated++
            Write-Host "GENERATED: $mp -> parent=$($accounts[$mp].parent_code), category=$($accounts[$mp].category), name_ar=$($accounts[$mp].name_ar)"
        }
    }
    else {
        Write-Host "STILL MISSING: $mp"
    }
}
Write-Host ""
Write-Host "From staging: $fromStaging, Generated: $generated"

# Verify all 21 transaction account codes exist
$txCodes = @('11105', '11106', '11107', '12101', '12103', '12113', '12123', '12201', '12304', '12307',
    '22103', '22104', '22201', '22202', '22303', '22306', '22701', '31001', '4100', '42101', '5100')
$missingTx = $txCodes | Where-Object { -not $accounts.ContainsKey($_) }
Write-Host ""
if ($missingTx.Count -eq 0) {
    Write-Host "All 21 transaction line account codes are present!"
}
else {
    Write-Host "MISSING TRANSACTION ACCOUNTS: $($missingTx -join ', ')"
}
