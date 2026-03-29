@echo off
echo ========================================
echo   DDREMS SYSTEM IMPROVEMENTS DEPLOYMENT
echo ========================================
echo.

echo [1/4] Backing up database...
echo       Creating backup of ddrems database...
mysqldump -u root -p ddrems > ddrems_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%.sql
if %errorlevel% equ 0 (
    echo       ✓ Database backup created
) else (
    echo       ✗ Backup failed - continuing anyway
)
echo.

echo [2/4] Applying database migration...
echo       Running: database/add-missing-tables.sql
mysql -u root -p ddrems < database/add-missing-tables.sql
if %errorlevel% equ 0 (
    echo       ✓ Database migration applied successfully
) else (
    echo       ✗ Database migration failed
    echo       Please check your MySQL connection and try again
    pause
    exit /b 1
)
echo.

echo [3/4] Stopping backend server...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo       ✓ Backend server stopped
) else (
    echo       ℹ No running Node.js processes found
)
timeout /t 2 /nobreak >nul
echo.

echo [4/4] Starting backend server...
echo       Server will run on http://localhost:5000
echo       Press Ctrl+C to stop the server
echo.
echo ========================================
echo   DEPLOYMENT COMPLETE - STARTING SERVER
echo ========================================
echo.

cd /d "%~dp0"
node server/index.js
