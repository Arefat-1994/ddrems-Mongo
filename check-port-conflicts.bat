@echo off
echo 🔍 Checking Port Conflicts
echo =========================

echo.
echo Checking port 3307 (MySQL):
netstat -ano | findstr :3307

echo.
echo Checking port 5000 (Node.js):
netstat -ano | findstr :5000

echo.
echo Checking port 80 (Apache):
netstat -ano | findstr :80

echo.
echo Checking port 443 (Apache SSL):
netstat -ano | findstr :443

echo.
echo 💡 If ports are in use by other processes:
echo    1. Stop the conflicting process
echo    2. Or change XAMPP ports in config
echo    3. Or change application ports in .env

pause