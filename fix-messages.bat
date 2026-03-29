@echo off
echo ========================================
echo DDREMS Message System Fix
echo ========================================
echo.
echo This script will fix the message sending issue by:
echo 1. Running database migration
echo 2. Restarting the backend server
echo.

echo Step 1: Running database migration...
echo Please enter your MySQL password when prompted (press Enter if no password)
echo.

mysql -u root -p ddrems < database/COMPLETE_MIGRATION.sql

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Database migration failed!
    echo Please check:
    echo - MySQL is running on port 3307
    echo - Database 'ddrems' exists
    echo - User 'root' has access
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo ✅ Database migration completed successfully!
echo.
echo Step 2: Restarting backend server...
echo Please wait...
echo.

REM Kill any existing node processes
taskkill /F /IM node.exe 2>nul

REM Start the backend server
echo Starting backend server on port 5000...
start cmd /k "npm run server"

echo.
echo ========================================
echo ✅ Fix completed!
echo ========================================
echo.
echo Backend server is starting on port 5000
echo You can now try sending messages!
echo.
pause
