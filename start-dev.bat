@echo off
color 0A
title DDREMS - Start Development Servers

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          DDREMS - Starting Development Servers               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo Step 1: Killing existing Node processes...
node kill-node-processes.js

echo.
echo Step 2: Waiting for ports to be free...
timeout /t 3 /nobreak > nul

echo.
echo Step 3: Starting backend server...
start "DDREMS Backend" cmd /k "color 0B && title DDREMS Backend && node server/index.js"

echo.
echo Step 4: Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo Step 5: Starting frontend server...
start "DDREMS Frontend" cmd /k "color 0E && title DDREMS Frontend && cd client && npm start"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    SERVERS STARTING!                         ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo.
echo   Wait 30 seconds for both servers to fully start.
echo   Then open: http://localhost:3000
echo.
echo   Test Accounts (all passwords: admin123):
echo   • admin@ddrems.com
echo   • owner@ddrems.com
echo   • customer@ddrems.com
echo   • broker@ddrems.com
echo   • propertyadmin@ddrems.com
echo   • systemadmin@ddrems.com
echo.
echo   Press any key to close this window...
echo.
pause > nul
