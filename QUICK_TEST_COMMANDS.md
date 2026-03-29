# ⚡ QUICK TEST COMMANDS

## 🚀 Start the System

```bash
# Terminal 1: Start Backend Server
npm run dev

# Terminal 2: Start Frontend (if needed)
cd client
npm start
```

**Expected Output:**
```
[SERVER] Server running on port 5000
[AI] Loaded 1000 properties from dataset
[AI] Model trained successfully! R² = 0.7782, MAE = 646206 ETB
```

---

## 🧪 API ENDPOINT TESTS

### Test AI Prediction
```bash
# Get AI price prediction
curl "http://localhost:5000/api/ai/predict?location=Kezira&propertyType=House&size_m2=100&bedrooms=2&bathrooms=1"

# Expected Response:
{
  "predictedPrice": 2500000,
  "lowEstimate": 2125000,
  "highEstimate": 2875000,
  "currency": "ETB",
  "pricePerSqm": 25000,
  "confidence": 78,
  "comparableProperties": [...]
}
```

### Test AI Model Info
```bash
curl "http://localhost:5000/api/ai/model-info"

# Expected Response:
{
  "modelType": "Multivariate Linear Regression",
  "datasetSize": 1000,
  "r2Score": 0.7782,
  "accuracyPercent": 77,
  "mae": 646206,
  "status": "ready"
}
```

### Test AI Recommendations
```bash
curl -X POST "http://localhost:5000/api/ai/get-recommendations" \
  -H "Content-Type: application/json" \
  -d '{
    "budget_min": 1000000,
    "budget_max": 5000000,
    "property_type": "apartment",
    "location": "Kezira",
    "bedrooms": 2,
    "bathrooms": 1,
    "preferences": {
      "near_school": true,
      "near_hospital": false,
      "near_market": true,
      "parking": true
    }
  }'

# Expected Response:
{
  "success": true,
  "recommendations": [
    {
      "title": "apartment in Kezira",
      "description": "2 bedrooms, 1 bathrooms, 100m². Price: 2.50M ETB",
      "score": 95
    }
  ],
  "next_steps": [...]
}
```

### Test Message System
```bash
# Send a message
curl -X POST "http://localhost:5000/api/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 1,
    "receiver_id": 2,
    "subject": "Test Message",
    "message": "This is a test message"
  }'

# Get user messages
curl "http://localhost:5000/api/messages/user/1"

# Get message thread
curl "http://localhost:5000/api/messages/1/thread"

# Send reply
curl -X POST "http://localhost:5000/api/messages/1/reply" \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 2,
    "message": "This is a reply"
  }'
```

### Test Key Requests
```bash
# Create key request
curl -X POST "http://localhost:5000/api/key-requests" \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": 1,
    "customer_id": 5,
    "request_message": "Requesting access key"
  }'

# Get customer key requests
curl "http://localhost:5000/api/key-requests/customer/5"

# Get admin pending requests
curl "http://localhost:5000/api/key-requests/admin/pending"

# Respond to key request
curl -X PUT "http://localhost:5000/api/key-requests/1/respond-key" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "accepted",
    "admin_id": 3,
    "response_message": "Key approved",
    "key_code": "ABC123"
  }'
```

### Test Agreement Requests
```bash
# Create agreement request
curl -X POST "http://localhost:5000/api/agreement-requests" \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": 1,
    "customer_id": 5,
    "request_message": "Requesting agreement"
  }'

# Get customer agreement requests
curl "http://localhost:5000/api/agreement-requests/customer/5"

# Get admin pending requests
curl "http://localhost:5000/api/agreement-requests/admin/pending"
```

---

## 🌐 BROWSER TESTING

### Test Customer Dashboard
1. Open: `http://localhost:3000`
2. Login as Customer (role: user)
3. Verify:
   - [ ] AI Guide button visible
   - [ ] Message stat card shows
   - [ ] Properties display with AI price
   - [ ] Request buttons visible

### Test Owner Dashboard
1. Login as Owner (role: owner)
2. Verify:
   - [ ] Add Property button works
   - [ ] AI factors visible in form
   - [ ] Agreements button visible
   - [ ] Message widget shows

### Test Property Admin Dashboard
1. Login as Property Admin (role: property_admin)
2. Verify:
   - [ ] Document verification works
   - [ ] AI price analysis shows
   - [ ] Agreement requests visible
   - [ ] Key requests visible

### Test AI Guide
1. Login as Customer
2. Click "🤖 AI Guide" button
3. Verify:
   - [ ] Step 1: Budget selection works
   - [ ] Step 2: Preferences save
   - [ ] Step 3: Recommendations display
   - [ ] Can navigate back

### Test Message System
1. Login as any user
2. Go to Messages page
3. Verify:
   - [ ] Messages display
   - [ ] Reply button works
   - [ ] Thread view shows
   - [ ] Unread count updates

### Test Request Buttons
1. Login as Customer
2. View any property
3. Verify:
   - [ ] Request Key button visible
   - [ ] Request Agreement button visible
   - [ ] Status updates correctly
   - [ ] Notifications sent

---

## 📊 DATABASE TESTS

### Check AI Model Data
```sql
-- Check if dataset loaded
SELECT COUNT(*) as property_count FROM properties;

-- Check messages table
SELECT COUNT(*) as message_count FROM messages;

-- Check key requests
SELECT COUNT(*) as key_request_count FROM request_key;

-- Check agreement requests
SELECT COUNT(*) as agreement_count FROM agreement_requests;
```

### Verify Tables Exist
```sql
SHOW TABLES;

-- Should see:
-- messages
-- message_replies
-- request_key
-- agreement_requests
-- properties
-- users
-- notifications
-- property_documents
```

---

## 🔍 DEBUGGING COMMANDS

### Check Server Logs
```bash
# View server output
npm run dev

# Look for:
# [AI] Model trained successfully!
# [SERVER] Server running on port 5000
# No error messages
```

### Check Browser Console
```javascript
// Open DevTools (F12)
// Go to Console tab
// Should see no errors
// Should see successful API calls
```

### Check Database Connection
```bash
# Test MySQL connection
mysql -u root -p -h localhost

# Run test query
USE real_estate_db;
SELECT COUNT(*) FROM users;
```

### Check AI Model
```bash
# Verify model loads
node -e "const ai = require('./server/routes/ai.js'); console.log('✅ AI loaded')"

# Expected: ✅ AI loaded
```

---

## ✅ VERIFICATION CHECKLIST

### Backend
- [ ] Server starts without errors
- [ ] AI model trains successfully
- [ ] Database connects
- [ ] All routes registered
- [ ] No console errors

### Frontend
- [ ] App loads without errors
- [ ] All pages accessible
- [ ] All buttons clickable
- [ ] All forms work
- [ ] No console errors

### Features
- [ ] AI predictions work
- [ ] Messages send/receive
- [ ] Requests create/update
- [ ] Notifications display
- [ ] Dashboards load

### Performance
- [ ] API response < 500ms
- [ ] Page load < 1000ms
- [ ] No memory leaks
- [ ] Smooth animations
- [ ] No lag

---

## 🐛 COMMON ISSUES & FIXES

### Issue: AI Model Not Loading
```bash
# Solution:
# 1. Check dataset file exists
ls -la AI/dire_dawa_real_estate_dataset.csv

# 2. Restart server
npm run dev

# 3. Check logs for errors
```

### Issue: Messages Not Sending
```bash
# Solution:
# 1. Check database connection
mysql -u root -p

# 2. Verify messages table exists
SHOW TABLES LIKE 'messages';

# 3. Check server logs
```

### Issue: Request Buttons Not Visible
```bash
# Solution:
# 1. Clear browser cache (Ctrl+Shift+Delete)
# 2. Hard refresh (Ctrl+Shift+R)
# 3. Check browser console for errors
# 4. Verify user role has permission
```

### Issue: Notifications Not Appearing
```bash
# Solution:
# 1. Check notifications table
SELECT * FROM notifications LIMIT 5;

# 2. Verify user ID is correct
# 3. Check browser notifications permission
```

---

## 📈 LOAD TESTING

### Test with Multiple Users
```bash
# Simulate 10 concurrent requests
for i in {1..10}; do
  curl "http://localhost:5000/api/ai/predict?location=Kezira&propertyType=House&size_m2=100&bedrooms=2&bathrooms=1" &
done
wait

# Check response times
# Should all complete < 500ms
```

### Test with Large Dataset
```bash
# Add 1000 test properties
for i in {1..1000}; do
  curl -X POST "http://localhost:5000/api/properties" \
    -H "Content-Type: application/json" \
    -d "{...}" &
done
wait

# Verify performance
# Should handle without slowdown
```

---

## 🎯 FINAL VERIFICATION

Run this checklist before deployment:

```bash
# 1. Start server
npm run dev

# 2. Test AI endpoint
curl "http://localhost:5000/api/ai/model-info"

# 3. Test message endpoint
curl "http://localhost:5000/api/messages/user/1"

# 4. Test key request endpoint
curl "http://localhost:5000/api/key-requests/customer/1"

# 5. Open browser
# http://localhost:3000

# 6. Login and test features
# - AI Guide
# - Message System
# - Request Buttons
# - AI Price Comparison

# 7. Check database
mysql -u root -p -e "USE real_estate_db; SELECT COUNT(*) FROM properties;"

# 8. Check logs
# Should see no errors
```

---

## ✅ SUCCESS INDICATORS

When everything is working:

✅ Server starts with "Model trained successfully!"  
✅ AI predictions return valid prices  
✅ Messages send and receive  
✅ Requests create and update  
✅ Notifications appear  
✅ All dashboards load  
✅ No console errors  
✅ No database errors  
✅ Response times < 500ms  
✅ All features functional  

---

**Ready to Test!** 🚀

Start with: `npm run dev`

Then open: `http://localhost:3000`

Login and test all features!
