@echo off
echo ========================================
echo Starting Anomaly Detection System
echo ========================================
echo.

echo [1/2] Starting Backend Server...
start "Backend Server" cmd /k "cd backend && call ..\.venv\Scripts\activate.bat && python app.py"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo [2/2] Starting Frontend Server...
cd frontend
call npm start
