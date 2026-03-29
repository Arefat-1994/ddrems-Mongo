# 🔧 Troubleshoot "Server Error: Server error"

## Problem
Getting "Server error: Server error" on localhost:3000 when trying to upload documents.

## Root Causes (Multiple Issues)

### Issue 1: Backend Server Not Running ❌
The React frontend (port 3000) cannot connect to the backend API (port 5000).

### Issue 2: Port 5000 Already in Use ❌
Another Node.js process is using port 5000, preventing the backend from starting.

### Issue 3: Database Schema Mismatch ❌
The `property_documents` table has wrong column names.

---

## ✅ COMPLETE FIX (Follow ALL Steps)

### Step 1: Kill All Node Processes

**Run this command:**
```bash
taskkill /F /IM node.exe
```

Or double-click: `check-ports.bat` to see what's running.

---

### Step 2: Fix Database Schema

**Option A: Using phpMyAdmin (Recommended)**
1. Open: http://localhost/phpmyadmin
2. Select database: `ddrems`
3. Click "SQL" tab
4. Copy entire contents of `fix-document-upload.sql`
5. Paste and click "Go"
6. Should see: "Document upload fix completed successfully!"

**Option B: Using Command Line**
```bash
mysql -u root -P 3307 ddrems < fix-document-upload.sql
```

**Option C: Use Batch File**
```bash
fix-documents.bat
```

---

### Step 3: Start Servers Properly

**Option A: Use the Kill & Restart Script (Easiest)**
```bash
kill-and-restart.bat
```

This will:
1. Kill all Node processes
2. Wait 3 seconds
3. Start backend on port 5000
4. Wait 5 seconds
5. Start frontend on port 3000

**Option B: Manual Start**

Terminal 1 - Backend:
```bash
cd C:\Users\User\Documents\admin
node server/index.js
```

Wait until you see: `Server running on port 5000`

Terminal 2 - Frontend:
```bash
cd C:\Users\User\Documents\admin\client
npm start
```

---

### Step 4: Verify Everything is Working

**Check 1: Backend Running**
Open: http://localhost:5000
Should see: Cannot GET / (this is OK - means server is running)

**Check 2: Frontend Running**
Open: http://localhost:3000
Should see: Login page (no errors)

**Check 3: Database Connection**
```bash
node check-setup.js
```

Should show all ✅ green checkmarks.

---

## 🧪 Test Document Upload

1. Go to: http://localhost:3000
2. Login: `owner@ddrems.com` / `admin123`
3. Click "Add Property"
4. Fill in property details
5. Click "Next: Upload Images" (can skip)
6. Click "Next: Upload Documents"
7. Select document type
8. Enter document name
9. Click to select a file (PDF, DOC, etc.)
10. Click "Upload & Generate Access Key"
11. Should see success message with access key! ✅

---

## 🚨 Common Errors & Solutions

### Error: "Server error: Server error"
**Cause:** Backend not running or not reachable

**Solution:**
```bash
# Check if backend is running
# Open http://localhost:5000 in browser
# Should NOT show "This site can't be reached"

# If not running:
kill-and-restart.bat
```

### Error: "EADDRINUSE: address already in use :::5000"
**Cause:** Port 5000 is occupied by another process

**Solution:**
```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Wait 3 seconds
timeout /t 3

# Start again
kill-and-restart.bat
```

### Error: "Cannot connect to server"
**Cause:** Backend crashed or not started

**Solution:**
1. Check backend terminal window for errors
2. Look for red error messages
3. Common issues:
   - Database connection failed (WAMP not running)
   - Port already in use
   - Missing dependencies

### Error: "Database table not found"
**Cause:** `property_documents` table doesn't exist

**Solution:**
```bash
# Run database fix
mysql -u root -P 3307 ddrems < fix-document-upload.sql

# Or use phpMyAdmin
```

### Error: "Database schema mismatch"
**Cause:** Table has `document_path` instead of `document_url`

**Solution:**
```bash
# The fix script will recreate the table
mysql -u root -P 3307 ddrems < fix-document-upload.sql
```

---

## 📋 Verification Checklist

Before testing document upload, verify:

- [ ] WAMP server is running (green icon)
- [ ] Database `ddrems` exists
- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 3000
- [ ] No "Server error" on login page
- [ ] Can login successfully
- [ ] `property_documents` table has correct structure

**Run this to check everything:**
```bash
node check-setup.js
```

---

## 🔍 Debug Steps

### 1. Check WAMP Server
- WAMP icon should be GREEN
- If orange/red, click icon → Start All Services

### 2. Check Backend Server
Open new terminal:
```bash
cd C:\Users\User\Documents\admin
node server/index.js
```

Should see:
```
Server running on port 5000
```

If you see errors:
- `EADDRINUSE` → Port in use, run `taskkill /F /IM node.exe`
- `ECONNREFUSED` → WAMP not running
- `ER_NO_SUCH_TABLE` → Run `fix-document-upload.sql`

### 3. Check Frontend Server
Open another terminal:
```bash
cd C:\Users\User\Documents\admin\client
npm start
```

Should see:
```
Compiled successfully!
You can now view client in the browser.
Local: http://localhost:3000
```

### 4. Check Browser Console
1. Open http://localhost:3000
2. Press F12 (Developer Tools)
3. Go to "Console" tab
4. Look for red errors
5. Common errors:
   - `ERR_CONNECTION_REFUSED` → Backend not running
   - `500 Internal Server Error` → Database issue
   - `404 Not Found` → Wrong API endpoint

### 5. Check Network Tab
1. Press F12 → Network tab
2. Try to upload document
3. Look for the request to `/api/property-documents`
4. Click on it to see:
   - Status code (should be 200)
   - Response (should have access_key)
   - If 500 error, check "Response" tab for error message

---

## 🎯 Expected Behavior After Fix

### Backend Terminal Should Show:
```
Server running on port 5000
```

### Frontend Should Show:
- Login page loads without errors
- Can login successfully
- Owner dashboard loads
- Add Property form works
- Document upload shows upload button
- After upload: Success message with access key

### Database Should Have:
```sql
-- Run in phpMyAdmin:
DESCRIBE property_documents;

-- Should show:
document_url    LONGTEXT
access_key      VARCHAR(20)
is_locked       TINYINT(1)
```

---

## 📞 Still Not Working?

### Try Complete Reset:

```bash
# 1. Kill everything
taskkill /F /IM node.exe

# 2. Fix database
mysql -u root -P 3307 ddrems < fix-document-upload.sql

# 3. Restart WAMP
# Click WAMP icon → Restart All Services

# 4. Wait 10 seconds
timeout /t 10

# 5. Start servers
kill-and-restart.bat

# 6. Wait for both servers to start (30 seconds)

# 7. Test: http://localhost:3000
```

### Check These Files Exist:
- `server/index.js` ✓
- `server/routes/property-documents.js` ✓
- `client/src/components/shared/DocumentUploader.js` ✓
- `fix-document-upload.sql` ✓

### Verify .env File:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ddrems
DB_PORT=3307
```

---

## 📊 Success Indicators

You'll know everything is working when:

1. ✅ Backend terminal shows: "Server running on port 5000"
2. ✅ Frontend opens at http://localhost:3000
3. ✅ No "Server error" on page load
4. ✅ Can login successfully
5. ✅ Owner dashboard loads
6. ✅ Add Property → Upload Documents works
7. ✅ Success message shows access key
8. ✅ Document appears in preview step

---

## 🆘 Emergency Commands

```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Check what's using port 5000
netstat -ano | findstr :5000

# Check what's using port 3000
netstat -ano | findstr :3000

# Test database connection
mysql -u root -P 3307 -e "USE ddrems; SELECT COUNT(*) FROM users;"

# Check if table exists
mysql -u root -P 3307 -e "USE ddrems; SHOW TABLES LIKE 'property_documents';"

# Check table structure
mysql -u root -P 3307 -e "USE ddrems; DESCRIBE property_documents;"
```

---

**Last Updated:** 2024
**Issue:** Server error when uploading documents
**Status:** Fixable - Follow all steps above
