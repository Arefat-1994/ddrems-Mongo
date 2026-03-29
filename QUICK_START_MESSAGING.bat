@echo off
echo.
echo ========================================
echo MESSAGING SYSTEM - QUICK START
echo ========================================
echo.

echo [STEP 1] Verifying database fix...
node verify-notifications-fix.js
if errorlevel 1 (
    echo ERROR: Database verification failed
    pause
    exit /b 1
)

echo.
echo [STEP 2] Running comprehensive tests...
node TEST_MESSAGING_SYSTEM.js
if errorlevel 1 (
    echo ERROR: System tests failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ ALL CHECKS PASSED!
echo ========================================
echo.
echo Next steps:
echo 1. Restart the backend server (npm run server)
echo 2. Test sending a message
echo 3. Check the dashboard for notifications
echo.
echo For more details, see: MESSAGING_SYSTEM_FIX_COMPLETE.md
echo.
pause
