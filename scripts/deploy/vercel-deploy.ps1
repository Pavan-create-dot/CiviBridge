#!/usr/bin/env pwsh
Write-Host "== Vercel frontend deploy script =="

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm is required but not found in PATH. Install Node/npm first."
  exit 1
}

Write-Host "Building client (Vite)..."
npm run build --workspace=client

if (-not $env:VERCEL_TOKEN) {
  Write-Error "Environment variable VERCEL_TOKEN is not set. Export your Vercel token and re-run."
  exit 1
}

Push-Location client
Write-Host "Deploying 'client' to Vercel (production) using VERCEL_TOKEN..."
try {
  & npx vercel --prod --token $env:VERCEL_TOKEN --confirm
} catch {
  Write-Error "Vercel CLI deployment failed: $_"
  Pop-Location
  exit 1
}
Pop-Location

Write-Host "Vercel deploy command finished. Check Vercel dashboard for status."
