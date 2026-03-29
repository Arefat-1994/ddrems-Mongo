# Quick Start Guide - DDREMS Admin Dashboard

## 🚀 Get Started in 5 Minutes

### Prerequisites Check
- ✅ Node.js installed (check: `node --version`)
- ✅ WAMP Server installed and running
- ✅ MySQL configured on port 3307

### Step-by-Step Setup

#### 1️⃣ Install Dependencies (2 minutes)

**Option A: Automatic Setup (Recommended)**
```bash
setup.bat
```

**Option B: Manual Setup**
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

#### 2️⃣ Setup Database (1 minute)

1. Start WAMP Server
2. Open phpMyAdmin: http://localhost/phpmyadmin
3. Click "Import" tab
4. Choose file: `database/schema.sql`
5. Click "Go"

**Or use command line:**
```bash
mysql -u root -p -P 3307 < database/schema.sql
```

#### 3️⃣ Configure Environment (30 seconds)

The `.env` file is already configured with default settings:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ddrems
DB_PORT=3307
```

Update if your WAMP configuration is different.

#### 4️⃣ Start the Application (1 minute)

**Option A: Automatic Start (Recommended)**
```bash
start-dev.bat
```

**Option B: Manual Start**

Terminal 1 - Backend:
```bash
npm run server
```

Terminal 2 - Frontend:
```bash
cd client
npm start
```

#### 5️⃣ Access Dashboard (30 seconds)

1. Open browser: http://localhost:3000
2. Login with:
   - **Email**: admin@ddrems.com
   - **Password**: admin123

## 🎯 What You'll See

### Dashboard Features
- 📊 Real-time statistics (properties, brokers, users, transactions)
- 📈 Recent activities feed
- 💡 System insights with progress indicators
- 🔔 Latest announcements

### Navigation Menu
- **Dashboard** - Overview and statistics
- **Properties** - Manage property listings
- **Brokers** - Track broker performance
- **Users** - User management
- **Transactions** - Transaction history

## 🎨 Dashboard Highlights

### Modern UI Features
- ✨ Gradient backgrounds and smooth animations
- 🎯 Intuitive navigation with icon-based menu
- 📱 Fully responsive (works on all devices)
- 🔍 Search and filter functionality
- 📊 Visual data representation

### Color-Coded Status
- 🟢 **Green** - Active/Completed
- 🟡 **Yellow** - Pending
- 🔵 **Blue** - Sold/Info
- 🟣 **Purple** - Rented
- ⚫ **Gray** - Inactive

## 🔧 Troubleshooting

### Backend won't start?
- Check if port 5000 is available
- Verify WAMP Server is running
- Check database credentials in `.env`

### Frontend won't start?
- Check if port 3000 is available
- Run `npm install` in client folder
- Clear npm cache: `npm cache clean --force`

### Can't login?
- Make sure database is imported
- Check if backend server is running
- Verify credentials: admin@ddrems.com / admin123

### Database connection error?
- Confirm WAMP is running on port 3307
- Check MySQL service is started
- Verify database name is `ddrems`

## 📝 Sample Data

The database comes with sample data:
- 3 Brokers
- 4 Properties (Villa, Apartment, Commercial, Land)
- 1 Admin user

## 🎓 Next Steps

1. **Explore the Dashboard**
   - Check out all statistics
   - View recent activities
   - Browse system insights

2. **Manage Properties**
   - View existing properties
   - Use search and filters
   - Check property details

3. **Review Brokers**
   - See broker performance
   - Check ratings and sales
   - View commission rates

4. **Check Transactions**
   - Browse transaction history
   - Filter by status
   - View transaction details

## 🚀 Development Mode

### Backend Development
```bash
npm run server
# Server runs on http://localhost:5000
# Auto-restarts on file changes (with nodemon)
```

### Frontend Development
```bash
cd client
npm start
# App runs on http://localhost:3000
# Hot-reload enabled
```

## 📦 Build for Production

```bash
cd client
npm run build
# Creates optimized production build in client/build/
```

## 🎯 Key Features to Try

1. **Dashboard Statistics** - See real-time counts
2. **Property Search** - Search by title or location
3. **Status Filters** - Filter properties by status
4. **Broker Cards** - View broker performance metrics
5. **User Table** - Manage system users
6. **Transaction History** - Track all transactions

## 💡 Tips

- Use the search bar to quickly find properties
- Click on stat cards for detailed views
- Hover over buttons to see tooltips
- The sidebar collapses on mobile devices
- All data updates in real-time

## 🎨 Customization

### Change Colors
Edit CSS files in `client/src/components/`

### Add New Features
- Backend: Add routes in `server/routes/`
- Frontend: Add components in `client/src/components/`

### Modify Database
Edit `database/schema.sql` and re-import

## 📞 Need Help?

- Check README.md for detailed documentation
- Review database schema in schema.sql
- Inspect API endpoints in server/routes/

---

**Enjoy using DDREMS Admin Dashboard! 🏢**
