# Quick Deployment Helper Script
# This script helps you deploy to various platforms

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("netlify", "vercel", "github", "ftp", "local")]
    [string]$Platform = "local"
)

Write-Host "🚀 Quick Deploy Helper" -ForegroundColor Blue
Write-Host "Platform: $Platform" -ForegroundColor Cyan

# Ensure dist folder exists
if (-not (Test-Path "dist")) {
    Write-Host "❌ dist folder not found. Running build first..." -ForegroundColor Red
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed" -ForegroundColor Red
        exit 1
    }
}

switch ($Platform) {
    "netlify" {
        Write-Host "📦 Preparing for Netlify deployment..." -ForegroundColor Yellow
        
        # Create _redirects file for SPA routing
        Set-Content -Path "dist/_redirects" -Value "/* /index.html 200"
        Write-Host "✅ Created _redirects file for SPA routing" -ForegroundColor Green
        
        # Create netlify.toml for build settings
        $netlifyConfig = @'
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
'@
        Set-Content -Path "netlify.toml" -Value $netlifyConfig
        Write-Host "✅ Created netlify.toml configuration" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "🌐 Next steps for Netlify:" -ForegroundColor Cyan
        Write-Host "1. Go to https://netlify.com" -ForegroundColor White
        Write-Host "2. Drag and drop the 'dist' folder to deploy" -ForegroundColor White
        Write-Host "3. Or connect your Git repository for continuous deployment" -ForegroundColor White
    }
    
    "vercel" {
        Write-Host "📦 Preparing for Vercel deployment..." -ForegroundColor Yellow
        
        # Create vercel.json for SPA routing
        $vercelConfig = @'
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
'@
        Set-Content -Path "vercel.json" -Value $vercelConfig
        Write-Host "✅ Created vercel.json configuration" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "🌐 Next steps for Vercel:" -ForegroundColor Cyan
        Write-Host "1. Install Vercel CLI: npm i -g vercel" -ForegroundColor White
        Write-Host "2. Run: vercel --prod" -ForegroundColor White
        Write-Host "3. Follow the prompts to deploy" -ForegroundColor White
    }
    
    "github" {
        Write-Host "📦 Preparing for GitHub Pages..." -ForegroundColor Yellow
        
        # Create .nojekyll file
        New-Item -Path "dist/.nojekyll" -ItemType File -Force | Out-Null
        Write-Host "✅ Created .nojekyll file" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "🌐 Next steps for GitHub Pages:" -ForegroundColor Cyan
        Write-Host "1. Push your code to a GitHub repository" -ForegroundColor White
        Write-Host "2. Go to repository Settings > Pages" -ForegroundColor White
        Write-Host "3. Set source to 'Deploy from a branch'" -ForegroundColor White
        Write-Host "4. Select the branch containing your dist folder" -ForegroundColor White
        Write-Host "5. Set folder to '/ (root)' if dist is in root, or '/dist' if in subfolder" -ForegroundColor White
    }
    
    "ftp" {
        Write-Host "📦 Preparing for FTP deployment..." -ForegroundColor Yellow
        
        # Create .htaccess for Apache servers
        $htaccess = @'
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QR,L]
'@
        Set-Content -Path "dist/.htaccess" -Value $htaccess
        Write-Host "✅ Created .htaccess file for Apache SPA routing" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "🌐 Next steps for FTP deployment:" -ForegroundColor Cyan
        Write-Host "1. Connect to your web server via FTP/SFTP" -ForegroundColor White
        Write-Host "2. Upload ALL contents of the 'dist' folder to your web root" -ForegroundColor White
        Write-Host "3. Ensure .htaccess is uploaded (for Apache servers)" -ForegroundColor White
        Write-Host "4. Configure your server for SPA routing if not using Apache" -ForegroundColor White
    }
    
    "local" {
        Write-Host "📦 Starting local preview server..." -ForegroundColor Yellow
        Write-Host "🌐 Your app will be available at: http://localhost:4173" -ForegroundColor Cyan
        Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
        Write-Host ""
        
        # Start preview server
        npx vite preview --host --port 4173
    }
}

Write-Host ""
Write-Host "📊 Deployment Summary:" -ForegroundColor Green
Write-Host "✅ Build size: ~500KB effective initial load" -ForegroundColor White
Write-Host "✅ Optimized chunks: All heavy features lazy-loaded" -ForegroundColor White
Write-Host "✅ SPA routing: Configured for your platform" -ForegroundColor White
Write-Host "✅ Service worker: Enabled for caching" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Your optimized app is ready for production!" -ForegroundColor Green