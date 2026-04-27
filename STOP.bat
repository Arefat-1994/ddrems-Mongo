@echo off
title DDREMS - Stop Servers
color 0C

echo.
echo ==========================================
echo   DDREMS - Stopping All Servers
echo ==========================================
echo.

echo Killing Node.js processes on ports 3000 and 5000...

:: Kill port 5000 (backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill port 3000 (frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo All servers stopped.
echo.
pause
