@echo off
echo ========================================
echo DDREMS - Fix Document Upload
echo ========================================
echo.
echo This will fix the document upload issue by:
echo 1. Recreating property_documents table
echo 2. Adding correct columns (document_url, access_key, is_locked)
echo 3. Ensuring LONGTEXT for base64 storage
echo.
echo IMPORTANT: Make sure WAMP server is running!
echo.
pause

echo.
echo Running database fix...
echo.

mysql -u root -P 3307 ddrems < fix-document-upload.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! Document upload is now fixed.
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Restart backend server
    echo 2. Try uploading a document
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR: Failed to run fix script
    echo ========================================
    echo.
    echo Troubleshooting:
    echo 1. Make sure WAMP is running
    echo 2. Check if database 'ddrems' exists
    echo 3. Try running manually in phpMyAdmin
    echo.
)

pause
