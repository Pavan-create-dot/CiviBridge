#!/usr/bin/env pwsh
Write-Host "== Render backend env-vars + deploy script =="

if (-not $env:RENDER_API_KEY) {
  Write-Error "RENDER_API_KEY is not set. Export your Render API key and re-run."
  exit 1
}

if (-not $env:RENDER_SERVICE_ID) {
  Write-Error "RENDER_SERVICE_ID is not set. Set the target Render service ID and re-run."
  exit 1
}

# Prepare env vars to POST to Render. Only include those that are set.
$vars = @()
function addVar($k,$v){ if ($v) { $vars += @{ key = $k; value = $v; secure = $true } } }

addVar 'DATABASE_URL' $env:DATABASE_URL
addVar 'JWT_SECRET' $env:JWT_SECRET
addVar 'GEMINI_API_KEY' $env:GEMINI_API_KEY
addVar 'ADMIN_PROVISION_SECRET' $env:ADMIN_PROVISION_SECRET

if ($vars.Count -eq 0) { Write-Error "No env vars provided to set on Render."; exit 1 }

$body = $vars | ConvertTo-Json -Depth 5
$headers = @{ Authorization = "Bearer $env:RENDER_API_KEY"; "Content-Type" = "application/json" }

$uri = "https://api.render.com/v1/services/$($env:RENDER_SERVICE_ID)/env-vars"
Write-Host "Setting environment variables on Render service: $env:RENDER_SERVICE_ID"
try {
  Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body
  Write-Host "Env var request submitted."
} catch {
  Write-Error "Failed to set env vars: $_"
}

Write-Host "Triggering a new deploy for service $env:RENDER_SERVICE_ID"
$deployUri = "https://api.render.com/v1/services/$($env:RENDER_SERVICE_ID)/deploys"
try {
  Invoke-RestMethod -Uri $deployUri -Method Post -Headers $headers -Body '{}' | Out-Null
  Write-Host "Deploy requested. Check Render dashboard for progress."
} catch {
  Write-Error "Deploy trigger failed: $_"
}
