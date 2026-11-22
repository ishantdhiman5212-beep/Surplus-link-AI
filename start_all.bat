@echo off
echo ========================================================
echo   SurplusLink AI - Full Stack Launcher
echo   Starting FastAPI Backend (Port 8000) and React Frontend (Port 3000)
echo ========================================================

cd /d "%~dp0"

echo [1/2] Launching FastAPI Backend Server...
start "SurplusLink AI Backend (Port 8000)" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0SurplusLinkAI\run-backend.ps1"

echo [2/2] Launching React Vite Frontend...
start "SurplusLink AI Frontend (Port 3000)" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0SurplusLinkAI\run-frontend.ps1"

echo.
echo Both servers are booting up!
echo - Backend API:  http://127.0.0.1:8000
echo - Frontend App: http://127.0.0.1:3000
echo - API Health:   http://127.0.0.1:8000/health
echo.
pause
