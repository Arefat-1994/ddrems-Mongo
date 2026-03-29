@echo off
echo ========================================
echo DDREMS Admin Dashboard Setup
echo ========================================
echo.

echo Step 1: Installing backend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error installing backend dependencies!
    pause
    exit /b %errorlevel%
)
echo Backend dependencies installed successfully!
echo.

echo Step 2: Installing frontend dependencies...
cd client
call npm install
if %errorlevel% neq 0 (
    echo Error installing frontend dependencies!
    pause
    exit /b %errorlevel%
)
cd ..
echo Frontend dependencies installed successfully!
echo.

echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Make sure WAMP Server is running on port 3307
echo 2. Import database/schema.sql into MySQL
echo 3. Run 'npm run server' to start backend
echo 4. Run 'cd client && npm start' to start frontend
echo 5. Open http://localhost:3000 in your browser
echo.
echo Login credentials:
echo Email: admin@ddrems.com
echo Password: admin123
echo.
pause
