@echo off
echo Killing all processes on port 5000...
echo.

FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :5000') DO (
    echo Killing process %%P
    taskkill /F /PID %%P 2>nul
)

echo.
echo Done! Port 5000 should now be free.
echo.
pause
