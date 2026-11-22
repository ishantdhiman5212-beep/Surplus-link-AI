Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SurplusLink AI - Full Stack Launcher" -ForegroundColor Yellow
Write-Host "  Starting FastAPI Backend (Port 8000) and React Frontend (Port 3000)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

$rootDir = $PSScriptRoot

Write-Host "`n[1/2] Starting FastAPI Backend on Port 8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$rootDir\SurplusLinkAI\run-backend.ps1"

Write-Host "[2/2] Starting React Vite Frontend on Port 3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$rootDir\SurplusLinkAI\run-frontend.ps1"

Write-Host "`nBoth services launched!" -ForegroundColor Green
Write-Host "- Backend API:  http://127.0.0.1:8000" -ForegroundColor White
Write-Host "- Frontend App: http://127.0.0.1:3000" -ForegroundColor White
Write-Host "- API Health:   http://127.0.0.1:8000/health" -ForegroundColor White
