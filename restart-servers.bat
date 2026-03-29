@echo off
echo Stopping any existing Node.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Starting backend server on port 5000...
start "Backend Server" cmd /k "cd /d %~dp0 && node server/index.js"

timeout /t 3 /nobreak >nul

echo Starting frontend server on port 3000...
start "Frontend Server" cmd /k "cd /d %~dp0client && npm start"

echo.
echo ========================================
echo Servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo ========================================
echo.
echo Press any key to exit this window...
pause >nul
