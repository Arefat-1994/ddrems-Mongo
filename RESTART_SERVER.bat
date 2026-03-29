@echo off
echo ========================================
echo   RESTARTING DDREMS BACKEND SERVER
echo ========================================
echo.

echo [1/3] Stopping all Node.js processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo     ✓ Node.js processes stopped
) else (
    echo     ℹ No Node.js processes were running
)
echo.

echo [2/3] Waiting 2 seconds...
timeout /t 2 /nobreak >nul
echo     ✓ Ready to start
echo.

echo [3/3] Starting backend server...
echo     Server will run on http://localhost:5000
echo     Press Ctrl+C to stop the server
echo.
echo ========================================
echo   SERVER STARTING...
echo ========================================
echo.

cd /d "%~dp0"
node server/index.js
