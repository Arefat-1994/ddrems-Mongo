@echo off
echo.
echo ========================================
echo   DDREMS System - Opening Browser
echo ========================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Opening browser in 2 seconds...
timeout /t 2 /nobreak >nul
start http://localhost:3000
echo.
echo Browser opened!
echo.
echo Login Credentials:
echo ==================
echo Broker:   john@ddrems.com / admin123
echo Customer: customer@ddrems.com / admin123
echo Owner:    owner@ddrems.com / admin123
echo.
pause
