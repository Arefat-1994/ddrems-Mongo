# ✅ QUICK TEST CHECKLIST

## 🚀 START SYSTEM
```bash
restart-servers.bat
```
Wait for both servers to start, then open: http://localhost:3000

---

## 1️⃣ CUSTOMER DASHBOARD TEST (5 minutes)

**Login:** customer@ddrems.com | **Password:** admin123

### Tests:
- [ ] Dashboard loads successfully
- [ ] Browse Properties shows only ACTIVE properties
- [ ] Click "View Details" on a property
- [ ] Click "📄 Request Document Access" button
- [ ] Check "Recently Viewed" section updates
- [ ] Check "Viewed Properties" section shows the property
- [ ] Add property to favorites (❤️ button)
- [ ] Verify NO "Add Property" button exists anywhere

**Expected Result:** ✅ All features work, only active properties visible

---

## 2️⃣ OWNER DASHBOARD TEST (5 minutes)

**Login:** owner@ddrems.com | **Password:** admin123

### Tests:
- [ ] Dashboard loads successfully
- [ ] Click "➕ Add Property" button
- [ ] Fill form and submit (Step 1: Details)
- [ ] Upload images (Step 2: Images)
- [ ] Upload documents (Step 3: Documents)
- [ ] Preview and submit (Step 4: Preview)
- [ ] Find property in "My Properties" table
- [ ] Click "📄 Docs" button on the property
- [ ] See DocumentManager with uploaded documents
- [ ] Click "🔑 Key" to view access key
- [ ] Click "📤 Send" to send key to customer
- [ ] Click "🔑 Access Requests" in header
- [ ] See pending requests (if any)
- [ ] Approve a request

**Expected Result:** ✅ Complete property + document workflow works

---

## 3️⃣ BROKER DASHBOARD TEST (5 minutes)

**Login:** broker@ddrems.com | **Password:** admin123

### Tests:
- [ ] Dashboard loads successfully
- [ ] "My Properties" shows ONLY broker's properties
- [ ] Click "🏠 Browse Properties" button
- [ ] See properties from other owners/brokers
- [ ] Only ACTIVE properties are shown
- [ ] Click "📄 Agreements" button
- [ ] Agreements page loads without error
- [ ] See modern card-based layout
- [ ] Click "📥 Download Agreement" button
- [ ] Agreement file downloads successfully
- [ ] Dashboard stats show only broker's data

**Expected Result:** ✅ Broker sees only own properties, can browse others, agreements work

---

## 4️⃣ PROPERTY ADMIN DASHBOARD TEST (5 minutes)

**Login:** propertyadmin@ddrems.com | **Password:** admin123

### Tests:
- [ ] Dashboard loads successfully
- [ ] Click "📄 Document Verification" button
- [ ] See Document Verification Center
- [ ] See search bar and filter buttons
- [ ] Try search by property name
- [ ] Click filter: "⏳ Pending"
- [ ] Click filter: "✅ Verified"
- [ ] Click filter: "🔒 Locked Docs"
- [ ] Click on a property card
- [ ] See property details and document list
- [ ] Click "🔑 Enter Key & Review" on a document
- [ ] Enter access key (get from owner dashboard)
- [ ] Document displays in viewer
- [ ] See Approve/Reject/Suspend buttons
- [ ] Click "✅ Approve Property"
- [ ] Property status changes to "active"

**Expected Result:** ✅ Complete document verification workflow works

---

## 5️⃣ SYSTEM ADMIN DASHBOARD TEST (2 minutes)

**Login:** systemadmin@ddrems.com | **Password:** admin123

### Tests:
- [ ] Dashboard loads successfully
- [ ] See system-wide statistics
- [ ] All sections display correctly

**Expected Result:** ✅ System admin dashboard works

---

## 6️⃣ ADMIN DASHBOARD TEST (2 minutes)

**Login:** admin@ddrems.com | **Password:** admin123

### Tests:
- [ ] Dashboard loads successfully
- [ ] Can manage all properties
- [ ] Can manage users
- [ ] Can manage brokers
- [ ] Can view transactions

**Expected Result:** ✅ Admin dashboard works

---

## 🔄 COMPLETE WORKFLOW TEST (10 minutes)

### Step 1: Owner Adds Property
1. Login as **owner@ddrems.com**
2. Add new property with images and documents
3. Note the property ID
4. Logout

### Step 2: Admin Approves Property
1. Login as **propertyadmin@ddrems.com**
2. Go to Document Verification
3. Find the property (search by ID)
4. Review documents with key
5. Approve the property
6. Logout

### Step 3: Customer Views and Requests Access
1. Login as **customer@ddrems.com**
2. Browse properties
3. Find the approved property
4. Click "View Details"
5. Click "📄 Request Document Access"
6. Logout

### Step 4: Owner Approves Access
1. Login as **owner@ddrems.com**
2. Click "🔑 Access Requests"
3. See customer's request
4. Click "✅ Approve"
5. Go to property documents
6. Click "📤 Send" on a document
7. Select the customer
8. Send the key
9. Logout

### Step 5: Customer Views Document
1. Login as **customer@ddrems.com**
2. Check messages for access key
3. Go to the property
4. Click "🔑 Enter Key to View"
5. Enter the received key
6. Document opens successfully

**Expected Result:** ✅ Complete end-to-end workflow works perfectly!

---

## 🎯 SUCCESS CRITERIA

### All Tests Pass If:
- ✅ All 6 user roles can login
- ✅ Customer sees only ACTIVE properties
- ✅ Owner can manage documents and send keys
- ✅ Broker sees only own properties in "My Properties"
- ✅ Broker can browse other properties
- ✅ Broker agreements page works with download
- ✅ Property Admin can search/filter/verify documents
- ✅ Complete workflow from property creation to customer access works
- ✅ No console errors (press F12 to check)
- ✅ No server errors in backend terminal

---

## 🐛 IF SOMETHING DOESN'T WORK

### Check:
1. **Both servers running?**
   - Backend: http://localhost:5000
   - Frontend: http://localhost:3000

2. **Database connected?**
   - WAMP server running?
   - Port 3307 accessible?

3. **Console errors?**
   - Press F12 in browser
   - Check Console tab
   - Check Network tab for failed requests

4. **Backend errors?**
   - Check backend terminal window
   - Look for error messages

### Quick Fix:
```bash
# Stop servers (Ctrl+C in both terminals)
# Restart:
restart-servers.bat
```

---

## 📊 TESTING SUMMARY

| Feature | Status | Notes |
|---------|--------|-------|
| Customer Dashboard | ⬜ | Test all features |
| Owner Dashboard | ⬜ | Test document workflow |
| Broker Dashboard | ⬜ | Test agreements |
| Property Admin | ⬜ | Test verification |
| System Admin | ⬜ | Quick check |
| Admin | ⬜ | Quick check |
| Complete Workflow | ⬜ | End-to-end test |

**Mark each with ✅ when tested successfully!**

---

## 🎉 WHEN ALL TESTS PASS

**Congratulations! Your DDREMS system is fully functional and production-ready!**

You can now:
- Add real properties
- Invite real users
- Process real transactions
- Manage real documents
- Track real agreements

**System Status:** PRODUCTION READY ✅
