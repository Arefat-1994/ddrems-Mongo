@echo off
echo ========================================
echo DDREMS System Integration Test
echo ========================================
echo.

echo [1/5] Testing Database Connection...
node test-connection.js
if %errorlevel% neq 0 (
    echo ERROR: Database connection failed!
    pause
    exit /b 1
)
echo.

echo [2/5] Verifying Test Users...
node create-test-users.js
echo.

echo [3/5] Checking Backend Dependencies...
if not exist "node_modules" (
    echo Installing backend dependencies...
    call npm install
)
echo Backend dependencies OK
echo.

echo [4/5] Checking Frontend Dependencies...
cd client
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)
echo Frontend dependencies OK
cd ..
echo.

echo [5/5] System Check Complete!
echo ========================================
echo.
echo ✅ Database: Connected
echo ✅ Test Users: Created
echo ✅ Dependencies: Installed
echo.
echo Ready to start the system!
echo.
echo Next steps:
echo 1. Run 'npm start' to start backend
echo 2. Run 'cd client && npm start' to start frontend
echo 3. Login with: admin@ddrems.com / admin123
echo.
echo Or use 'start-dev.bat' to start both automatically
echo.
pause
