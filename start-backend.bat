@echo off
title DDO Backend (localhost:8080)
cd /d "%~dp0DDO\backend"

if not exist "node_modules\" (
  echo Installing backend dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

if not exist ".env" (
  echo Missing DDO\backend\.env — copy .env.example and set MONGO_URI and JWT_SECRET.
  pause
  exit /b 1
)

echo Starting DDO backend at http://localhost:8080
echo CFM login: http://localhost:8080/CFM/company-login.html
echo.
node server.js
pause
