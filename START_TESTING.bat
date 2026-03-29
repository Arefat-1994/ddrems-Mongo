@echo off
echo ========================================
echo   DDREMS - START TESTING
echo ========================================
echo.
echo This script will help you start testing the system
echo.
echo STEP 1: Make sure WAMP is running
echo   - MySQL should be on port 3307
echo   - Database: ddrems
echo.
pause
echo.
echo STEP 2: Starting Backend Server...
echo.
start cmd /k "cd server && npm start"
timeout /t 3
echo.
echo STEP 3: Starting Frontend...
echo.
start cmd /k "cd client && npm start"
timeout /t 5
echo.
echo ========================================
echo   SYSTEM STARTING...
echo ========================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo LOGIN CREDENTIALS (Password: admin123)
echo ========================================
echo.
echo ADMIN:
echo   admin@ddrems.com
echo.
echo BROKERS:
echo   john@ddrems.com
echo   jane@ddrems.com
echo   ahmed@ddrems.com
echo.
echo OWNER:
echo   owner@ddrems.com
echo.
echo CUSTOMER:
echo   customer@ddrems.com
echo.
echo PROPERTY ADMIN:
echo   propertyadmin@ddrems.com
echo.
echo SYSTEM ADMIN:
echo   sysadmin@ddrems.com
echo.
echo ========================================
echo.
echo Opening browser in 10 seconds...
timeout /t 10
start http://localhost:3000
echo.
echo System is ready! Check the browser.
echo.
pause
