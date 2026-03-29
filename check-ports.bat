@echo off
echo ========================================
echo Checking Port Usage
echo ========================================
echo.

echo Checking port 5000 (Backend):
netstat -ano | findstr :5000
echo.

echo Checking port 3000 (Frontend):
netstat -ano | findstr :3000
echo.

echo ========================================
echo Node.js Processes:
echo ========================================
tasklist | findstr node.exe
echo.

echo ========================================
echo To kill all Node processes, run:
echo kill-and-restart.bat
echo ========================================
echo.
pause
