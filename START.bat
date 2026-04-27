@echo off
title DDREMS - Dire Dawa Real Estate Management System
color 0A

echo.
echo ==========================================
echo   DDREMS - Starting Application
echo ==========================================
echo.

:: Check if node_modules exists at root
if not exist "node_modules" (
    echo [1/3] Installing root dependencies...
    call npm install
    echo.
)

:: Check if client node_modules exists
if not exist "client\node_modules" (
    echo [2/3] Installing client dependencies...
    cd client
    call npm install
    cd ..
    echo.
)

echo [3/3] Starting Server + Client...
echo.
echo   Backend  : http://localhost:5000
echo   Frontend : http://localhost:3000
echo.
echo ==========================================
echo   Press Ctrl+C to stop both servers
echo ==========================================
echo.

npm run dev

pause
