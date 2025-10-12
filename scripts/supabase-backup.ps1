# Supabase public schema backup script
# Usage:
#  1) Ensure Supabase CLI is installed and logged in: https://supabase.com/docs/guides/cli
#  2) Set your project ref and desired output dir.
#  3) Run: pwsh -File scripts/supabase-backup.ps1

param(
  [string]$ProjectRef = $env:SUPABASE_PROJECT_REF,
  [string]$OutDir = "backups/supabase",
  [switch]$Data = $false
)

if (-not $ProjectRef) {
  Write-Error "Please set SUPABASE_PROJECT_REF env var or pass -ProjectRef <ref>."; exit 1
}

# Create output directory with timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$targetDir = Join-Path $OutDir $timestamp
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

# Dump schema (public)
$schemaFile = Join-Path $targetDir "public_schema_$timestamp.sql"
Write-Host "Dumping public schema to $schemaFile"
supabase db dump --schema public --project-ref $ProjectRef --file $schemaFile

if ($LASTEXITCODE -ne 0) { Write-Error "Schema dump failed."; exit 2 }

# Optional: dump data-only for selected tables if -Data provided
if ($Data) {
  $dataFile = Join-Path $targetDir "public_data_$timestamp.sql"
  Write-Host "Dumping public data (all tables) to $dataFile"
  # Note: this will export data for the whole public schema
  supabase db dump --data-only --schema public --project-ref $ProjectRef --file $dataFile
  if ($LASTEXITCODE -ne 0) { Write-Error "Data dump failed."; exit 3 }
}

Write-Host "✅ Backup completed: $targetDir"