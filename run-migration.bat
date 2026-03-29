@echo off
echo ========================================
echo DDREMS Database Migration
echo ========================================
echo.

REM Try common WAMP locations
set MYSQL_PATH=
if exist "C:\wamp64\bin\mysql\mysql8.0.27\bin\mysql.exe" (
    set MYSQL_PATH=C:\wamp64\bin\mysql\mysql8.0.27\bin\mysql.exe
    goto found
)
if exist "C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe" (
    set MYSQL_PATH=C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe
    goto found
)
if exist "C:\wamp\bin\mysql\mysql5.7.26\bin\mysql.exe" (
    set MYSQL_PATH=C:\wamp\bin\mysql\mysql5.7.26\bin\mysql.exe
    goto found
)
if exist "C:\wamp\bin\mysql\mysql8.0.27\bin\mysql.exe" (
    set MYSQL_PATH=C:\wamp\bin\mysql\mysql8.0.27\bin\mysql.exe
    goto found
)

echo ERROR: MySQL not found in common WAMP locations
echo Please check your WAMP installation
pause
exit /b 1

:found
echo Found MySQL at: %MYSQL_PATH%
echo.
echo Running migration script...
echo.

"%MYSQL_PATH%" -u root -p ddrems < database/incremental-migration.sql

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Migration completed successfully!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Migration failed with error code: %errorlevel%
    echo ========================================
)

pause
