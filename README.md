# 🏠 DDREMS - Dire Dawa Real Estate Management System

A comprehensive real estate management system with multi-role dashboards, property listings, document management, and analytics.

## 🚀 Quick Start

### 1. Check Your Setup
```bash
node check-setup.js
```

### 2. Fix Database (if needed)
```bash
# In phpMyAdmin or MySQL Workbench, run:
fix-image-upload.sql
```

### 3. Start Servers
```bash
restart-servers.bat
```

### 4. Access Application
Open browser: **http://localhost:3000**

## 🔑 Login Credentials

All passwords: `admin123`

| Role | Email |
|------|-------|
| Admin | admin@ddrems.com |
| Owner | owner@ddrems.com |
| Customer | customer@ddrems.com |
| Property Admin | propertyadmin@ddrems.com |
| System Admin | systemadmin@ddrems.com |
| Broker | broker@ddrems.com |

## 📸 Image Upload (Owner Dashboard)

1. Login as Owner
2. Click "Add Property"
3. Fill details → Next
4. Upload images (first = main image ⭐)
5. Upload documents (optional)
6. Preview & Submit

**Images are stored as base64 in database** - no external storage needed!

## 🛠️ Troubleshooting

### "Server error" on localhost:3000
```bash
restart-servers.bat
```

### Images not uploading
```bash
# Run in MySQL:
fix-image-upload.sql
```

### Port already in use
```bash
taskkill /F /IM node.exe
restart-servers.bat
```

## 📚 Full Documentation

See **START_HERE.md** for complete guide.

## 🎯 Features

- ✅ Multi-role dashboards (6 roles)
- ✅ Property management with images
- ✅ Document upload & access control
- ✅ Real-time notifications
- ✅ Analytics & reports with charts
- ✅ Transaction tracking
- ✅ Broker management
- ✅ Agreement handling

## 💻 Tech Stack

- React 19 + Node.js + Express
- MySQL (WAMP port 3307)
- Chart.js for analytics
- JWT authentication
- Base64 image storage

---

**Need Help?** Check START_HERE.md or run `node check-setup.js`
