# Deploy admin-create-user function to Supabase
# You need to get your access token from https://supabase.com/dashboard/account/tokens

Write-Host "🚀 Deploying admin-create-user function to Supabase..." -ForegroundColor Green

# Read the function code
$functionCode = Get-Content "supabase\functions\admin-create-user\index.ts" -Raw

# Project reference
$projectRef = "bgxknceshxxifwytalex"

# You need to set this - get it from https://supabase.com/dashboard/account/tokens
$accessToken = Read-Host "Enter your Supabase Access Token (from https://supabase.com/dashboard/account/tokens)"

if ([string]::IsNullOrEmpty($accessToken)) {
    Write-Host "❌ Access token is required!" -ForegroundColor Red
    exit 1
}

# Prepare the deployment payload
$payload = @{
    slug = "admin-create-user"
    body = $functionCode
    verify_jwt = $false
} | ConvertTo-Json -Depth 10

# API endpoint for function deployment
$url = "https://api.supabase.com/v1/projects/$projectRef/functions"

try {
    Write-Host "📡 Uploading function..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $payload -Headers $headers
    
    Write-Host "✅ Function deployed successfully!" -ForegroundColor Green
    Write-Host "Function ID: $($response.id)" -ForegroundColor Cyan
    Write-Host "Function URL: https://$projectRef.supabase.co/functions/v1/admin-create-user" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}

Write-Host "`n🔧 Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to http://localhost:3000/ and test the user creation" -ForegroundColor White
Write-Host "2. Click the 'Create Test User' button in the test section" -ForegroundColor White
Write-Host "3. Or use the regular 'مستخدم جديد' button" -ForegroundColor White
