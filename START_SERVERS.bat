@echo off
color 0A
title DDREMS - Server Startup

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║              DDREMS - Starting Servers                       ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo [1/5] Checking WAMP Server...
echo.
ping localhost -n 2 >nul
echo       WAMP should be running (green icon)
echo       If not, start WAMP first!
echo.
pause

echo.
echo [2/5] Killing existing Node processes...
taskkill /F /IM node.exe 2>nul
if %ERRORLEVEL% EQU 0 (
    echo       ✓ Processes killed
) else (
    echo       ✓ No processes to kill
)
echo.
timeout /t 2 /nobreak >nul

echo [3/5] Starting Backend Server (Port 5000)...
start "DDREMS Backend - DO NOT CLOSE" cmd /k "color 0B && title DDREMS Backend && echo Starting backend... && cd /d %~dp0 && node server/index.js"
echo       ✓ Backend starting...
echo.
timeout /t 5 /nobreak >nul

echo [4/5] Starting Frontend Server (Port 3000)...
start "DDREMS Frontend - DO NOT CLOSE" cmd /k "color 0E && title DDREMS Frontend && echo Starting frontend... && cd /d %~dp0client && npm start"
echo       ✓ Frontend starting...
echo.

echo [5/5] Opening browser...
timeout /t 10 /nobreak >nul
start http://localhost:3000
echo       ✓ Browser opened
echo.

echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    SERVERS STARTED!                          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo.
echo   Login as Owner:
echo   Email:    owner@ddrems.com
echo   Password: admin123
echo.
echo   IMPORTANT: Do NOT close the backend and frontend windows!
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  If you see "Server error", check the backend window for     ║
echo ║  errors. Common issues:                                      ║
echo ║  - Port 5000 in use: Run this script again                   ║
echo ║  - WAMP not running: Start WAMP server                       ║
echo ║  - Database error: Run fix-documents.bat                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
pause
