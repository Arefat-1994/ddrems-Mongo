@echo off
echo 🔧 XAMPP Connection Fix Script
echo ================================

echo.
echo 1. Stopping all XAMPP services...
net stop mysql
net stop apache2.4

echo.
echo 2. Starting MySQL service...
net start mysql

echo.
echo 3. Starting Apache service...
net start apache2.4

echo.
echo 4. Checking service status...
sc query mysql
sc query apache2.4

echo.
echo 5. Testing database connection...
mysql -u root -p -e "SHOW DATABASES;"

echo.
echo ✅ XAMPP services restarted!
echo 📝 If issues persist, check the solutions below:
echo    - Verify MySQL is running on port 3307
echo    - Check firewall settings
echo    - Restart XAMPP Control Panel as Administrator
pause