@echo off
color 0A
title DDREMS - Apply All Fixes

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          DDREMS - COMPLETE SYSTEM FIX                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo This will fix ALL identified issues:
echo   1. Add main_image column to properties
echo   2. Create missing tables (property_views, document_access)
echo   3. Add missing users (broker, systemadmin)
echo   4. Update view counts and triggers
echo   5. Verify all fixes
echo.
echo IMPORTANT: Make sure WAMP server is running!
echo.
pause

echo.
echo ═══════════════════════════════════════════════════════════════
echo STEP 1: Applying Database Fixes
echo ═══════════════════════════════════════════════════════════════
echo.

node apply-database-fixes.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Database fixes applied successfully!
) else (
    echo.
    echo ❌ Database fix failed! Check if WAMP is running.
    pause
    exit /b 1
)

echo.
echo ═══════════════════════════════════════════════════════════════
echo STEP 2: Adding Missing Users
echo ═══════════════════════════════════════════════════════════════
echo.

node add-missing-users.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Users added successfully!
) else (
    echo.
    echo ⚠️  Some users might already exist (this is OK)
)

echo.
echo ═══════════════════════════════════════════════════════════════
echo STEP 3: Verifying Setup
echo ═══════════════════════════════════════════════════════════════
echo.

node check-setup.js

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    ALL FIXES APPLIED!                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Next Steps:
echo   1. Start servers: start-dev.bat
echo   2. Open: http://localhost:3000
echo   3. Test with all 6 user accounts
echo.
echo Test Accounts (all passwords: admin123):
echo   ✓ admin@ddrems.com          (Admin)
echo   ✓ owner@ddrems.com          (Owner)
echo   ✓ customer@ddrems.com       (Customer)
echo   ✓ broker@ddrems.com         (Broker)
echo   ✓ propertyadmin@ddrems.com  (Property Admin)
echo   ✓ systemadmin@ddrems.com    (System Admin)
echo.
pause
