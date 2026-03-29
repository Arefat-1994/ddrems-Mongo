# 🧪 FEATURE TESTING GUIDE

## Quick Start Testing

### 1️⃣ AI PRICE PREDICTION SYSTEM

**How to Test:**
1. Login as any user
2. Go to any dashboard
3. Click "View Details" on any property
4. Scroll down to see "🤖 AI Market Analysis"
5. You should see:
   - Listed Price
   - AI Predicted Price
   - Price Deviation %
   - Confidence Score
   - Market Insights

**Expected Results:**
- ✅ AI prediction loads within 2 seconds
- ✅ Shows realistic price estimates
- ✅ Confidence score between 70-80%
- ✅ Deviation analysis accurate

**Test URLs:**
```
GET http://localhost:5000/api/ai/predict?location=Kezira&propertyType=apartment&size=100&bedrooms=2&bathrooms=1
GET http://localhost:5000/api/ai/model-info
GET http://localhost:5000/api/ai/analytics
```

---

### 2️⃣ MESSAGE REPLY SYSTEM

**How to Test:**
1. Login as System Admin or Property Admin
2. Go to Messages page
3. Click on any message
4. Click "↩️ Reply" button
5. Type your reply and send
6. Verify reply appears in thread

**Expected Results:**
- ✅ Reply modal opens
- ✅ Reply sends successfully
- ✅ Reply appears in thread
- ✅ Reply count updates
- ✅ Notifications sent

**Test Endpoints:**
```
POST http://localhost:5000/api/messages
GET http://localhost:5000/api/messages/user/:userId
GET http://localhost:5000/api/messages/:messageId/thread
POST http://localhost:5000/api/messages/:messageId/reply
```

---

### 3️⃣ SIDEBAR CONSOLIDATION

**How to Test:**
1. Login as any user
2. Look at sidebar
3. Verify "📧 Messages" link is visible
4. Click on it
5. Should navigate to Messages page

**Expected Results:**
- ✅ Messages link visible for all roles
- ✅ Unread count badge shows
- ✅ Navigation works smoothly
- ✅ MessageNotificationWidget displays

---

### 4️⃣ AI PRICE ADVICE IN ADD PROPERTY

**How to Test (Owner/Broker):**
1. Login as Owner or Broker
2. Click "➕ Add Property"
3. Fill in basic details
4. Scroll down to "🤖 AI Price Prediction Factors"
5. Fill in:
   - Distance to center
   - Property condition
   - Security rating
   - Amenity checkboxes
6. Continue to preview
7. See AI price comparison

**Expected Results:**
- ✅ All AI factor fields visible
- ✅ AI price shows in preview
- ✅ Deviation analysis displays
- ✅ Confidence score shown

---

### 5️⃣ REQUEST KEY BUTTON

**How to Test (Customer):**
1. Login as Customer
2. Browse properties
3. Click "View Details" on any property
4. Scroll to bottom
5. Click "🔑 Request Access Key"
6. Verify success message

**Expected Results:**
- ✅ Button visible in property modal
- ✅ Request sends successfully
- ✅ Status changes to "⏳ Key Request Pending"
- ✅ Admin receives notification

**Test Endpoint:**
```
POST http://localhost:5000/api/key-requests
{
  "property_id": 1,
  "customer_id": 5,
  "request_message": "Requesting access key"
}
```

---

### 6️⃣ REQUEST AGREEMENT BUTTON

**How to Test (Customer):**
1. Login as Customer
2. Request key for a property (see above)
3. Wait for admin to approve key
4. Go back to property view
5. Click "🤝 Request Agreement"
6. Verify success message

**Expected Results:**
- ✅ Button only visible after key approved
- ✅ Request sends successfully
- ✅ Status changes to "📄 Agreement Requested"
- ✅ Owner receives notification

**Test Endpoint:**
```
POST http://localhost:5000/api/agreement-requests
{
  "property_id": 1,
  "customer_id": 5,
  "request_message": "Requesting agreement"
}
```

---

### 7️⃣ OWNER DASHBOARD AGREEMENTS

**How to Test (Owner):**
1. Login as Owner
2. Click "📄 Agreements" button in header
3. See all agreement requests
4. Click "✅ Accept" or "❌ Reject"
5. Verify status updates

**Expected Results:**
- ✅ Modal shows all requests
- ✅ Customer info displayed
- ✅ Property details shown
- ✅ Accept/Reject buttons work
- ✅ Status updates immediately

---

### 8️⃣ CUSTOMER AI GUIDE

**How to Test (Customer):**
1. Login as Customer
2. Go to Customer Dashboard
3. Click "🤖 AI Guide" button
4. Step 1: Select budget (use presets)
5. Step 2: Select preferences
6. Step 3: View recommendations
7. Click on property to view

**Expected Results:**
- ✅ 3-step wizard displays
- ✅ Budget presets work
- ✅ Preferences save correctly
- ✅ Recommendations generate
- ✅ Can navigate back to modify
- ✅ Properties open in main view

**Test Endpoint:**
```
POST http://localhost:5000/api/ai/get-recommendations
{
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
}
```

---

### 9️⃣ MESSAGE NOTIFICATION WIDGET

**How to Test:**
1. Login as any user
2. Look at top right of dashboard
3. See message notification widget
4. Unread count should display
5. Click to navigate to messages

**Expected Results:**
- ✅ Widget visible on all dashboards
- ✅ Unread count accurate
- ✅ Click navigates to messages
- ✅ Updates in real-time

---

### 🔟 PROPERTY ADMIN VERIFICATION

**How to Test (Property Admin):**
1. Login as Property Admin
2. Go to "📄 Document Verification"
3. Select a property
4. See AI price analysis
5. Review documents
6. Approve/Reject property

**Expected Results:**
- ✅ AI price analysis displays
- ✅ Documents visible
- ✅ Approval buttons work
- ✅ Status updates

---

## 🔧 TESTING CHECKLIST

### AI System
- [ ] Model loads on server start
- [ ] Predictions return valid prices
- [ ] Confidence scores calculated
- [ ] Feature importance displayed
- [ ] Market analytics work
- [ ] Fraud detection works

### Messaging
- [ ] Messages send successfully
- [ ] Replies work correctly
- [ ] Threads display properly
- [ ] Unread count updates
- [ ] Notifications sent
- [ ] Delete works

### Requests
- [ ] Key requests created
- [ ] Agreement requests created
- [ ] Status tracking works
- [ ] Admin notifications sent
- [ ] Customer notifications sent
- [ ] Accept/Reject works

### Dashboards
- [ ] All dashboards load
- [ ] AI price shows
- [ ] Request buttons visible
- [ ] Message widgets work
- [ ] Sidebar navigation works
- [ ] Modals open/close

### UI/UX
- [ ] Responsive on mobile
- [ ] Responsive on tablet
- [ ] Responsive on desktop
- [ ] All buttons clickable
- [ ] Forms validate
- [ ] Error messages clear

---

## 🐛 TROUBLESHOOTING

### AI Predictions Not Loading
**Solution:**
1. Check server logs for AI model errors
2. Verify dataset file exists: `AI/dire_dawa_real_estate_dataset.csv`
3. Restart server
4. Check browser console for errors

### Messages Not Sending
**Solution:**
1. Verify user is authenticated
2. Check database connection
3. Verify messages table exists
4. Check server logs

### Request Buttons Not Visible
**Solution:**
1. Verify user role has permission
2. Check property modal is loading
3. Verify request endpoints registered
4. Clear browser cache

### Notifications Not Appearing
**Solution:**
1. Check notifications table exists
2. Verify user ID is correct
3. Check database connection
4. Verify notification endpoints

---

## 📊 PERFORMANCE TESTING

### Expected Response Times
- AI Prediction: < 200ms
- Message Send: < 300ms
- Request Create: < 300ms
- Dashboard Load: < 1000ms
- Component Render: < 500ms

### Load Testing
- Test with 100 concurrent users
- Test with 1000 properties
- Test with 10000 messages
- Monitor memory usage
- Monitor CPU usage

---

## ✅ SIGN-OFF CHECKLIST

- [ ] All features tested
- [ ] All endpoints tested
- [ ] All components tested
- [ ] Error scenarios tested
- [ ] Performance acceptable
- [ ] Security verified
- [ ] UI/UX verified
- [ ] Documentation complete
- [ ] Ready for production

---

## 📞 SUPPORT

For issues or questions:
1. Check server logs: `npm run dev`
2. Check browser console: F12
3. Check database: MySQL Workbench
4. Review error messages
5. Check documentation

---

**Last Updated**: March 26, 2026  
**Status**: Ready for Testing ✅
