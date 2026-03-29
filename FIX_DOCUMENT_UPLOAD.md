# 🔧 Fix Document Upload Server Error

## Problem
Getting "Server error" when trying to upload documents in Owner Dashboard.

## Root Cause
The database table `property_documents` has incorrect column names:
- Database has: `document_path` (VARCHAR)
- Code expects: `document_url` (LONGTEXT)
- Missing columns: `access_key`, `is_locked`

---

## ✅ Solution

### Step 1: Fix Database Schema

**Option A: Using phpMyAdmin (Recommended)**
1. Open WAMP phpMyAdmin: `http://localhost/phpmyadmin`
2. Select database: `ddrems`
3. Click "SQL" tab
4. Copy and paste the entire contents of `fix-document-upload.sql`
5. Click "Go"
6. You should see: "Document upload fix completed successfully!"

**Option B: Using MySQL Command Line**
```bash
mysql -u root -p -P 3307 ddrems < fix-document-upload.sql
```

### Step 2: Restart Backend Server

**Kill existing Node processes:**
```bash
taskkill /F /IM node.exe
```

**Start backend:**
```bash
node server/index.js
```

Or use the batch file:
```bash
restart-servers.bat
```

### Step 3: Test Document Upload

1. Go to: `http://localhost:3000`
2. Login as Owner: `owner@ddrems.com` / `admin123`
3. Click "Add Property"
4. Fill property details → Next
5. Upload images (or skip) → Next
6. **Upload Documents:**
   - Select document type (Title Deed, Survey Plan, etc.)
   - Enter document name
   - Click to select file (PDF, DOC, DOCX, JPG, PNG)
   - Max file size: 10MB
   - Click "Upload & Generate Access Key"
7. Wait for success message with access key
8. Continue to preview and submit

---

## 🔍 What Was Fixed

### Database Changes:
```sql
-- Old structure (WRONG):
document_path VARCHAR(500)

-- New structure (CORRECT):
document_url LONGTEXT          -- Can store base64 documents
access_key VARCHAR(20)         -- Unique key for secure access
is_locked BOOLEAN              -- Lock/unlock documents
```

### Backend Improvements:
- ✅ Added validation for required fields
- ✅ Added file size checking (max 10MB)
- ✅ Better error messages
- ✅ Increased request timeout to 5 minutes
- ✅ Handles database schema errors gracefully

### Frontend Improvements:
- ✅ File size validation before upload
- ✅ Better error messages
- ✅ Shows upload progress
- ✅ Timeout handling for large files
- ✅ Connection error detection

---

## 📋 Verification Checklist

After running the fix, verify:

1. **Database Table Structure:**
```sql
USE ddrems;
DESCRIBE property_documents;
```

Should show:
- ✅ `document_url` LONGTEXT
- ✅ `access_key` VARCHAR(20)
- ✅ `is_locked` TINYINT(1)

2. **Backend Server Running:**
```
Server running on port 5000
```

3. **No Console Errors:**
- Open browser console (F12)
- Should not see "Server error" or "500" errors

---

## 🎯 How Document Upload Works

1. **Owner uploads document** → Converted to base64
2. **Stored in database** → `property_documents.document_url`
3. **Access key generated** → Random 8-character code (e.g., "A3F7B2E1")
4. **Owner shares key** → With customers/buyers
5. **Customer enters key** → Can view/download document
6. **Owner can lock** → Prevent access anytime

---

## 🚨 Common Errors & Solutions

### Error: "Server error" (Generic)
**Cause:** Backend not running or database issue

**Solution:**
```bash
# Check if backend is running
# Should see: "Server running on port 5000"

# If not, restart:
taskkill /F /IM node.exe
node server/index.js
```

### Error: "Database table not found"
**Cause:** `property_documents` table doesn't exist

**Solution:**
```bash
# Run the fix script:
mysql -u root -p -P 3307 ddrems < fix-document-upload.sql
```

### Error: "Database schema mismatch"
**Cause:** Table exists but has wrong columns

**Solution:**
```bash
# The fix script will DROP and recreate the table:
mysql -u root -p -P 3307 ddrems < fix-document-upload.sql
```

### Error: "File is too large"
**Cause:** Document exceeds 10MB limit

**Solution:**
- Compress the PDF file
- Use lower quality for images
- Split large documents into multiple files

### Error: "Cannot connect to server"
**Cause:** Backend server not running on port 5000

**Solution:**
```bash
# Start backend:
node server/index.js

# Or use batch file:
restart-servers.bat
```

### Error: "Upload timeout"
**Cause:** File is large and upload is slow

**Solution:**
- Wait longer (timeout is 5 minutes)
- Use smaller file
- Check internet connection

---

## 📊 File Size Limits

| File Type | Max Size | Recommended |
|-----------|----------|-------------|
| PDF | 10MB | 2-5MB |
| DOC/DOCX | 10MB | 1-3MB |
| JPG/PNG | 10MB | 500KB-2MB |

**Tips to reduce file size:**
- PDF: Use "Save as Reduced Size PDF" in Adobe
- Images: Compress using online tools
- DOC: Remove embedded images, save as PDF

---

## 🔐 Access Key System

### How it works:
1. Document uploaded → Key generated (e.g., "A3F7B2E1")
2. Owner shares key with customer
3. Customer enters key in "View Documents" section
4. If correct → Document displayed
5. If locked → Access denied

### Key Features:
- ✅ 8-character alphanumeric code
- ✅ Unique per document
- ✅ Can be regenerated anytime
- ✅ Owner can lock/unlock documents
- ✅ Secure access control

---

## 📞 Still Having Issues?

1. **Check database connection:**
```bash
node check-setup.js
```

2. **Verify WAMP is running:**
- WAMP icon should be GREEN
- MySQL service running on port 3307

3. **Check browser console:**
- Press F12
- Look for red errors
- Share error message for help

4. **Restart everything:**
```bash
# Stop all
taskkill /F /IM node.exe

# Fix database
mysql -u root -p -P 3307 ddrems < fix-document-upload.sql

# Start servers
restart-servers.bat
```

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ No "Server error" message
- ✅ Upload button shows progress
- ✅ Success message with access key appears
- ✅ Document appears in preview step
- ✅ Can view document in property details

---

**Last Updated:** 2024
**Issue:** Document upload server error
**Status:** FIXED ✅
