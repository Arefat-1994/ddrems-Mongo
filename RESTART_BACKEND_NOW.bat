@echo off
echo Stopping backend server...
taskkill /F /IM node.exe
timeout /t 2
echo.
echo Starting backend server...
npm start
pause
