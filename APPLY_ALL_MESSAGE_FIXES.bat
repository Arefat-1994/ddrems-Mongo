@echo off
setlocal enabledelayedexpansion

echo ========================================
echo APPLY ALL MESSAGE SYSTEM FIXES
echo ========================================
echo.
echo This will:
echo 1. Fix message table structure
echo 2. Ensure message_recipients table exists
echo 3. Verify notifications table
echo 4. Restart backend server
echo.

echo Step 1: Fixing database tables...
echo.

mysql -u root -p ddrems < database/FIX_MESSAGE_TABLES_STRUCTURE.sql

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Database fix failed!
    echo Make sure:
    echo - MySQL is running on port 3307
    echo - Database 'ddrems' exists
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo ✅ Database tables fixed successfully!
echo.
echo Step 2: Killing all Node processes...

taskkill /F /IM node.exe 2>nul

echo ✅ Node processes killed
echo.
echo Step 3: Starting backend server...
echo.

start cmd /k "npm run server"

echo.
echo ========================================
echo ✅ ALL FIXES APPLIED!
echo ========================================
echo.
echo Backend server is starting on port 5000
echo.
echo NEXT STEPS:
echo 1. Wait for backend to start
echo 2. Login to application
echo 3. Test sending individual message
echo 4. Test sending group message
echo 5. Verify messages appear in recipient inbox
echo 6. Check unread count in dashboard
echo 7. Test delete/edit/history features
echo.
echo All message features should now work correctly!
echo.
timeout /t 3
