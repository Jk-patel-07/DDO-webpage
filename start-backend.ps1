$ErrorActionPreference = "Stop"
$backendDir = Join-Path $PSScriptRoot "DDO\backend"
Set-Location $backendDir

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing backend dependencies..."
  npm install
}

if (-not (Test-Path ".env")) {
  Write-Host "Missing DDO\backend\.env — copy .env.example and set MONGO_URI and JWT_SECRET."
  exit 1
}

Write-Host "Starting DDO backend at http://localhost:8080"
Write-Host "CFM login: http://localhost:8080/CFM/company-login.html"
node server.js
