@echo off
echo ========================================
echo   VERIFYING BROKER ENDPOINT
echo ========================================
echo.
echo Testing: POST /api/brokers/create-account
echo Server: http://localhost:5000
echo.
echo Running test script...
echo.

node test-broker-endpoint.js

echo.
echo ========================================
echo   TEST COMPLETE
echo ========================================
echo.
pause
