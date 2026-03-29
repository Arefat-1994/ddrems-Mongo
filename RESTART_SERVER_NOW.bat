@echo off
echo ========================================
echo RESTARTING BACKEND SERVER
echo ========================================
echo.
echo Killing all Node processes...
taskkill /F /IM node.exe 2>nul

echo ✅ Node processes killed
echo.
echo Starting backend server on port 5000...
echo.

start cmd /k "npm run server"

echo.
echo ========================================
echo ✅ SERVER RESTARTED
echo ========================================
echo.
echo Backend is starting on port 5000
echo Try sending a message now!
echo.
