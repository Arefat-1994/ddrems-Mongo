@echo off
color 0A
title DDREMS - Complete Diagnosis and Fix

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          DDREMS - COMPLETE DIAGNOSIS AND FIX                 ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo This will:
echo   1. Check database connection
echo   2. Fix all database issues
echo   3. Add missing users
echo   4. Verify all tables
echo   5. Start servers
echo.

echo IMPORTANT: Make sure WAMP server is running!
echo.
pause

echo.
echo ═══════════════════════════════════════════════════════════════
echo STEP 1: Running Diagnostic Check
echo ═══════════════════════════════════════════════════════════════
echo.

node check-setup.js

echo.
echo ═══════════════════════════════════════════════════════════════
echo STEP 2: Applying Database Fixes
echo ═══════════════════════════════════════════════════════════════
echo.

mysql -u root -P 3307 ddrems < COMPLETE_FIX.sql

if %ERRORLEVEL% EQU 0 (
    echo       ✓ Database fixes applied
) else (
    echo       ✗ Database fix failed
    pause
    exit /b 1
)

echo.
echo ═══════════════════════════════════════════════════════════════
echo STEP 3: Adding Missing Users
echo ═══════════════════════════════════════════════════════════════
echo.

node add-missing-users.js

echo.
echo ═══════════════════════════════════════════════════════════════
echo STEP 4: Verifying Setup
echo ═══════════════════════════════════════════════════════════════
echo.

node check-setup.js

echo.
echo ═══════════════════════════════════════════════════════════════
echo STEP 5: Killing Existing Processes
echo ═══════════════════════════════════════════════════════════════
echo.

taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo       ✓ Processes killed

echo.
echo ═══════════════════════════════════════════════════════════════
echo STEP 6: Starting Servers
echo ═══════════════════════════════════════════════════════════════
echo.

start "DDREMS Backend" cmd /k "color 0B && title Backend Server && cd /d %~dp0 && node server/index.js"
timeout /t 5 /nobreak >nul

start "DDREMS Frontend" cmd /k "color 0E && title Frontend Server && cd /d %~dp0client && npm start"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    ALL FIXES APPLIED!                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo.
echo   Test Accounts (all passwords: admin123):
echo   ✓ Admin:          admin@ddrems.com
echo   ✓ Owner:          owner@ddrems.com
echo   ✓ Customer:       customer@ddrems.com
echo   ✓ Broker:         broker@ddrems.com
echo   ✓ Property Admin: propertyadmin@ddrems.com
echo   ✓ System Admin:   systemadmin@ddrems.com
echo.
echo   Servers are starting in separate windows...
echo   Wait 30 seconds for both to fully start.
echo.
pause
