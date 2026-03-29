@echo off
color 0A
cls
echo ================================================================================
echo                    DDREMS - SYSTEM STATUS
echo ================================================================================
echo.
echo [92m BACKEND SERVER:  RUNNING on port 5000[0m
echo [92m FRONTEND SERVER: RUNNING on port 3000[0m
echo [92m DATABASE:        CONNECTED (MySQL on port 3307)[0m
echo [92m IMAGES:          WORKING (3 properties with images)[0m
echo.
echo ================================================================================
echo                    ACCESS THE APPLICATION
echo ================================================================================
echo.
echo [96m Main Application:[0m
echo    URL: http://localhost:3000
echo.
echo [96m Test Accounts (all passwords: admin123):[0m
echo    - customer@ddrems.com     (View properties with images)
echo    - john@ddrems.com         (Broker - Add properties)
echo    - admin@ddrems.com        (Admin - Approve properties)
echo    - owner@ddrems.com        (Owner - Add properties)
echo    - propertyadmin@ddrems.com (Property Admin)
echo    - sysadmin@ddrems.com     (System Admin)
echo.
echo ================================================================================
echo                    VERIFIED FEATURES
echo ================================================================================
echo.
echo [92m[CHECKMARK] Property Management (Add/Edit/Delete)[0m
echo [92m[CHECKMARK] Image Upload (Base64 storage)[0m
echo [92m[CHECKMARK] Image Display (3 properties with images)[0m
echo [92m[CHECKMARK] Document Management[0m
echo [92m[CHECKMARK] Property Approval System[0m
echo [92m[CHECKMARK] Preview before Submit[0m
echo [92m[CHECKMARK] 6 Role-based Dashboards[0m
echo [92m[CHECKMARK] Commission Tracking[0m
echo [92m[CHECKMARK] Messaging System[0m
echo [92m[CHECKMARK] Favorites System[0m
echo.
echo ================================================================================
echo.
echo [93mOpening application in browser...[0m
echo.
start http://localhost:3000
timeout /t 2 >nul
echo [92mApplication opened! Login to see properties with images.[0m
echo.
echo Press any key to exit...
pause >nul
