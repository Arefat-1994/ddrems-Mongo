@echo off
echo ========================================
echo Stopping all Node.js processes...
echo ========================================

taskkill /F /IM node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Node.js processes stopped.
) else (
    echo No Node.js processes found.
)

echo.
echo Waiting 3 seconds...
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo Starting Backend Server (Port 5000)...
echo ========================================
start "DDREMS Backend" cmd /k "cd /d %~dp0 && node server/index.js"

echo.
echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo Starting Frontend Server (Port 3000)...
echo ========================================
start "DDREMS Frontend" cmd /k "cd /d %~dp0client && npm start"

echo.
echo ========================================
echo Servers are starting!
echo ========================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Check the new windows for any errors.
echo.
echo Press any key to close this window...
pause >nul
