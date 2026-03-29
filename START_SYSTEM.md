# 🚀 DDREMS System - Quick Start Guide

## ✅ System Status
- Database: Connected (MySQL on port 3307)
- Backend: Ready (Node.js/Express on port 5000)
- Frontend: Ready (React on port 3000)
- Test Users: Created

## 📋 Prerequisites Checklist
- [x] WAMP Server running on port 3307
- [x] Database 'ddrems' created with all tables
- [x] Node.js and npm installed
- [x] All dependencies installed
- [x] Test users created

## 🎯 Quick Start (3 Steps)

### Step 1: Start Backend Server
```bash
npm start
```
The server will start on http://localhost:5000

### Step 2: Start Frontend (New Terminal)
```bash
cd client
npm start
```
The React app will open automatically at http://localhost:3000

### Step 3: Login with Test Accounts

## 🔐 Test User Credentials

All users have the same password: **admin123**

| Role | Email | Dashboard Features |
|------|-------|-------------------|
| **Admin** | admin@ddrems.com | Full system access, all management features |
| **Owner** | owner@ddrems.com | Property management, agreements, revenue tracking |
| **Customer** | customer@ddrems.com | Browse properties, favorites, recommendations |
| **Property Admin** | propertyadmin@ddrems.com | Property verification, document review |
| **System Admin** | sysadmin@ddrems.com | System monitoring, logs, configuration |

## 🎨 Features to Test

### For Admin (admin@ddrems.com)
- ✅ Dashboard with statistics and insights
- ✅ Properties management (view, add, edit, delete)
- ✅ Brokers management
- ✅ Users management
- ✅ Transactions overview
- ✅ Announcements (create, edit, delete)
- ✅ Reports & Analytics (export to PDF, Excel, Word, Print)
- ✅ Collapsible sidebar
- ✅ Logout functionality

### For Owner (owner@ddrems.com)
- ✅ Owner-specific dashboard
- ✅ My properties list
- ✅ Property views tracking
- ✅ Agreements management
- ✅ Revenue tracking
- ✅ Notifications

### For Customer (customer@ddrems.com)
- ✅ Customer dashboard
- ✅ Browse properties
- ✅ Favorites management
- ✅ Property recommendations
- ✅ Viewed properties history
- ✅ Feedback system

### For Property Admin (propertyadmin@ddrems.com)
- ✅ Property verification workflow
- ✅ Document review
- ✅ Pending verifications
- ✅ Verification history

### For System Admin (sysadmin@ddrems.com)
- ✅ System monitoring
- ✅ Audit logs
- ✅ System configuration
- ✅ Security settings
- ✅ User activity tracking

## 🔧 Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is available
netstat -ano | findstr :5000

# If occupied, kill the process or change port in .env
```

### Frontend won't start
```bash
# Clear cache and reinstall
cd client
rm -rf node_modules package-lock.json
npm install
npm start
```

### Database connection error
1. Ensure WAMP is running
2. Check MySQL is on port 3307
3. Verify database 'ddrems' exists
4. Run: `node test-connection.js`

### Login fails
1. Ensure backend is running
2. Check browser console for errors
3. Verify test users exist: `node create-test-users.js`

## 📊 API Endpoints

### Authentication
- POST `/api/auth/login` - User login

### Dashboard
- GET `/api/dashboard/stats` - Dashboard statistics
- GET `/api/dashboard/activities` - Recent activities

### Properties
- GET `/api/properties` - All properties
- GET `/api/properties/owner/:userId` - Owner's properties
- GET `/api/properties/recommendations/:userId` - Recommendations
- POST `/api/properties/verify/:id` - Verify property

### Brokers
- GET `/api/brokers` - All brokers
- POST `/api/brokers` - Create broker

### Users
- GET `/api/users` - All users
- POST `/api/users` - Create user

### Transactions
- GET `/api/transactions` - All transactions

### Announcements
- GET `/api/announcements` - All announcements
- POST `/api/announcements` - Create announcement
- PUT `/api/announcements/:id` - Update announcement
- DELETE `/api/announcements/:id` - Delete announcement

### Agreements
- GET `/api/agreements/owner/:userId` - Owner's agreements

### Favorites
- GET `/api/favorites/:userId` - User's favorites
- POST `/api/favorites` - Add favorite

### Notifications
- GET `/api/notifications/:userId` - User notifications

### System
- GET `/api/system/logs` - System logs
- GET `/api/system/config` - System configuration

### Property Views
- GET `/api/property-views/:userId` - User's viewed properties

## 🎉 Success Indicators

✅ Backend console shows: "Server running on port 5000"
✅ Frontend opens in browser automatically
✅ Login page displays correctly
✅ Can login with test credentials
✅ Dashboard loads with statistics
✅ Sidebar is collapsible
✅ Logout button works
✅ Role-based dashboards display correctly

## 📝 Next Steps

1. Test all user roles by logging in with different accounts
2. Verify CRUD operations work for properties, brokers, users
3. Test report generation (PDF, Excel, Word)
4. Check announcements functionality
5. Verify role-based menu items in sidebar
6. Test responsive design on different screen sizes

## 🆘 Need Help?

Check these files for more information:
- `TROUBLESHOOTING.md` - Common issues and solutions
- `QUICK_REFERENCE.md` - Quick command reference
- `MULTI_ACTOR_IMPLEMENTATION.md` - Multi-actor system details
- `PROJECT_SUMMARY.md` - Complete project overview

---

**System Version:** 1.0.0
**Last Updated:** February 28, 2026
**Status:** ✅ Ready for Testing
