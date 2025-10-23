# Supabase public schema backup script (linked project)
# Usage:
#  1) Ensure Supabase CLI is installed and logged in: https://supabase.com/docs/guides/cli
#  2) Link your project once: supabase link --project-ref <your-ref>
#  3) Run: pwsh -File scripts/supabase-backup.ps1 [-Data]

param(
  [string]$OutDir = "backups/supabase",
  [switch]$Data = $false
)

# Create output directory with timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$targetDir = Join-Path $OutDir $timestamp
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

# Dump schema (public) from the linked project
$schemaFile = Join-Path $targetDir "public_schema_$timestamp.sql"
Write-Host "Dumping public schema to $schemaFile"
supabase db dump --schema public --file $schemaFile --linked

if ($LASTEXITCODE -ne 0) {
  Write-Error "Schema dump failed. Ensure you have linked the project: supabase link --project-ref <your-ref>"; exit 2
}

# Optional: dump data-only for selected tables if -Data provided
if ($Data) {
  $dataFile = Join-Path $targetDir "public_data_$timestamp.sql"
  Write-Host "Dumping public data (all tables) to $dataFile"
  # Note: this will export data for the whole public schema
  supabase db dump --data-only --schema public --file $dataFile --linked
  if ($LASTEXITCODE -ne 0) { Write-Error "Data dump failed."; exit 3 }
}

Write-Host "✅ Backup completed: $targetDir"
