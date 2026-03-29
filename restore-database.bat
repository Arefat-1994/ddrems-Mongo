@echo off
echo 🗄️  Database Recovery Script
echo ==========================

echo.
echo 1. Creating database if not exists...
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS ddrems;"

echo.
echo 2. Importing schema...
mysql -u root -p ddrems < database/unified-schema.sql

echo.
echo 3. Verifying tables...
mysql -u root -p -e "USE ddrems; SHOW TABLES;"

echo.
echo 4. Checking messages table...
mysql -u root -p -e "USE ddrems; DESCRIBE messages;"

echo.
echo ✅ Database recovery completed!
echo 📝 Test connection with: node test-database-connection.js

pause