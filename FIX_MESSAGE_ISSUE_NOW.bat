@echo off
setlocal enabledelayedexpansion

echo ========================================
echo DDREMS Message System - FINAL FIX
echo ========================================
echo.
echo This will:
echo 1. Fix notification_type column (ensure it's VARCHAR)
echo 2. Kill all Node processes
echo 3. Restart backend server
echo.

echo Step 1: Fixing notification_type column in database...
echo.

REM Run the SQL to fix the column
mysql -u root -p ddrems < database/FINAL_FIX_NOTIFICATIONS.sql

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to fix column!
    echo Make sure:
    echo - MySQL is running on port 3307
    echo - Database 'ddrems' exists
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo ✅ Column fixed successfully!
echo.
echo Step 2: Killing all Node processes...

REM Kill any existing node processes
taskkill /F /IM node.exe 2>nul

echo ✅ Node processes killed
echo.
echo Step 3: Starting backend server...
echo.

REM Start the backend server
start cmd /k "npm run server"

echo.
echo ========================================
echo ✅ FIX COMPLETE!
echo ========================================
echo.
echo Backend server is starting on port 5000
echo Try sending a message now!
echo.
timeout /t 3
