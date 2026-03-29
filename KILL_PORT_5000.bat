@echo off
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          KILLING PROCESS ON PORT 5000                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo Finding process on port 5000...
echo.

for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTENING"') do (
    echo Found process: %%a
    echo Killing process %%a...
    taskkill /F /PID %%a
    echo.
)

echo.
echo ✅ Done! Port 5000 should now be free.
echo.
echo You can now run: node server/index.js
echo.
pause
