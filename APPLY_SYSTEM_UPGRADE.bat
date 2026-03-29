@echo off
echo ============================================================================
echo DDREMS SYSTEM UPGRADE - Database Update
echo ============================================================================
echo.

echo Step 1: Checking MySQL connection...
mysql -u root -P 3307 -e "SELECT 'MySQL Connected Successfully!' as Status;" 2>nul
if errorlevel 1 (
    echo [ERROR] Cannot connect to MySQL on port 3307
    echo Please ensure WAMP server is running
    pause
    exit /b 1
)
echo [OK] MySQL connection successful
echo.

echo Step 2: Backing up current database...
mysqldump -u root -P 3307 ddrems > ddrems_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%.sql 2>nul
if errorlevel 1 (
    echo [WARNING] Backup failed, but continuing...
) else (
    echo [OK] Backup created
)
echo.

echo Step 3: Applying database upgrade...
mysql -u root -P 3307 ddrems < COMPLETE_SYSTEM_UPGRADE.sql
if errorlevel 1 (
    echo [ERROR] Database upgrade failed
    pause
    exit /b 1
)
echo [OK] Database upgrade applied successfully
echo.

echo Step 4: Verifying new tables...
mysql -u root -P 3307 ddrems -e "SHOW TABLES LIKE '%%_profiles';"
mysql -u root -P 3307 ddrems -e "SHOW TABLES LIKE '%%_requests';"
echo.

echo ============================================================================
echo UPGRADE COMPLETE!
echo ============================================================================
echo.
echo New tables created:
echo   - customer_profiles
echo   - owner_profiles
echo   - broker_profiles
echo   - agreement_requests
echo   - property_requests
echo.
echo Next steps:
echo   1. Read SYSTEM_UPGRADE_IMPLEMENTATION_GUIDE.md
echo   2. Create backend API routes
echo   3. Create frontend profile components
echo   4. Test registration system
echo.
echo Press any key to start the servers...
pause >nul

echo.
echo Starting backend server...
start "DDREMS Backend" cmd /k "cd server && node index.js"

timeout /t 3 >nul

echo Starting frontend server...
start "DDREMS Frontend" cmd /k "cd client && npm start"

echo.
echo Servers starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
pause
