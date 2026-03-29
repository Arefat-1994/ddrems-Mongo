# WAMP Server Configuration Guide

## Setting Up WAMP for DDREMS

### Step 1: Install WAMP Server

1. Download WAMP from: https://www.wampserver.com/en/
2. Install WAMP (default installation is fine)
3. Start WAMP Server (icon should be green in system tray)

### Step 2: Configure MySQL Port to 3307

#### Method 1: Using WAMP Menu (Easiest)

1. Left-click WAMP icon in system tray
2. Go to: MySQL → my.ini
3. Find the line: `port = 3306`
4. Change it to: `port = 3307`
5. Save the file
6. Restart WAMP Server

#### Method 2: Manual Configuration

1. Navigate to: `C:\wamp64\bin\mysql\mysql[version]\`
2. Open `my.ini` in a text editor
3. Find these lines:
   ```ini
   [mysqld]
   port = 3306
   ```
4. Change to:
   ```ini
   [mysqld]
   port = 3307
   ```
5. Also find:
   ```ini
   [client]
   port = 3306
   ```
6. Change to:
   ```ini
   [client]
   port = 3307
   ```
7. Save and restart WAMP

### Step 3: Verify MySQL is Running on Port 3307

1. Open Command Prompt
2. Run:
   ```bash
   netstat -ano | findstr :3307
   ```
3. You should see MySQL listening on port 3307

### Step 4: Access phpMyAdmin

1. Open browser
2. Go to: http://localhost/phpmyadmin
3. If phpMyAdmin doesn't connect, update its config:
   - Navigate to: `C:\wamp64\apps\phpmyadmin[version]\`
   - Open `config.inc.php`
   - Find: `$cfg['Servers'][$i]['port'] = '3306';`
   - Change to: `$cfg['Servers'][$i]['port'] = '3307';`
   - Save and refresh phpMyAdmin

### Step 5: Create Database

#### Option A: Using phpMyAdmin (GUI)

1. Open phpMyAdmin: http://localhost/phpmyadmin
2. Click "New" in left sidebar
3. Database name: `ddrems`
4. Collation: `utf8mb4_general_ci`
5. Click "Create"
6. Click "Import" tab
7. Choose file: `database/schema.sql`
8. Click "Go"

#### Option B: Using Command Line

1. Open Command Prompt
2. Navigate to WAMP MySQL bin:
   ```bash
   cd C:\wamp64\bin\mysql\mysql[version]\bin
   ```
3. Login to MySQL:
   ```bash
   mysql -u root -p -P 3307
   ```
4. Create database:
   ```sql
   CREATE DATABASE ddrems;
   USE ddrems;
   SOURCE C:/Users/User/Documents/admin/database/schema.sql;
   ```

### Step 6: Test Database Connection

1. Open Command Prompt
2. Navigate to project directory
3. Create test file `test-db.js`:
   ```javascript
   const mysql = require('mysql2');
   
   const connection = mysql.createConnection({
     host: 'localhost',
     user: 'root',
     password: '',
     database: 'ddrems',
     port: 3307
   });
   
   connection.connect((err) => {
     if (err) {
       console.error('Error connecting:', err);
       return;
     }
     console.log('✅ Connected to MySQL on port 3307!');
     connection.end();
   });
   ```
4. Run: `node test-db.js`
5. Should see: "✅ Connected to MySQL on port 3307!"

## Common Issues & Solutions

### Issue 1: WAMP Icon is Orange/Red

**Solution:**
- Check if port 80 is being used by another application
- Check if MySQL service is running
- Restart WAMP Server
- Check Windows Services for Apache and MySQL

### Issue 2: Port 3307 Already in Use

**Solution:**
1. Find what's using the port:
   ```bash
   netstat -ano | findstr :3307
   ```
2. Kill the process or choose a different port
3. Update `.env` file with new port

### Issue 3: Can't Access phpMyAdmin

**Solution:**
- Make sure WAMP is running (green icon)
- Check if Apache is running
- Try: http://localhost:80/phpmyadmin
- Clear browser cache
- Check phpMyAdmin config file

### Issue 4: MySQL Won't Start

**Solution:**
1. Check Windows Services
2. Look for "wampmysqld64" service
3. Right-click → Start
4. If fails, check error logs in:
   `C:\wamp64\logs\mysql_error.log`

### Issue 5: Access Denied for User 'root'

**Solution:**
1. Reset MySQL root password:
   ```bash
   mysql -u root -p -P 3307
   ```
2. If no password works, try empty password
3. Update `.env` file accordingly

### Issue 6: Database Import Fails

**Solution:**
- Check file size limits in phpMyAdmin
- Use command line import instead
- Split large SQL files
- Check for syntax errors in SQL file

## WAMP Configuration Files

### Important File Locations

```
C:\wamp64\
├── bin\
│   ├── apache\
│   │   └── apache[version]\
│   │       └── conf\
│   │           └── httpd.conf
│   └── mysql\
│       └── mysql[version]\
│           └── my.ini
├── apps\
│   └── phpmyadmin[version]\
│       └── config.inc.php
└── logs\
    ├── apache_error.log
    └── mysql_error.log
```

## Performance Optimization

### MySQL Configuration (my.ini)

Add these lines for better performance:

```ini
[mysqld]
max_connections = 200
innodb_buffer_pool_size = 256M
query_cache_size = 64M
tmp_table_size = 64M
max_heap_table_size = 64M
```

### Apache Configuration (httpd.conf)

For better performance:

```apache
KeepAlive On
MaxKeepAliveRequests 100
KeepAliveTimeout 5
```

## Security Recommendations

1. **Set MySQL Root Password**
   ```sql
   ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_secure_password';
   ```

2. **Create Dedicated Database User**
   ```sql
   CREATE USER 'ddrems_user'@'localhost' IDENTIFIED BY 'secure_password';
   GRANT ALL PRIVILEGES ON ddrems.* TO 'ddrems_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. **Update .env File**
   ```
   DB_USER=ddrems_user
   DB_PASSWORD=secure_password
   ```

## Backup Database

### Using phpMyAdmin
1. Select `ddrems` database
2. Click "Export" tab
3. Choose "Quick" method
4. Click "Go"

### Using Command Line
```bash
mysqldump -u root -p -P 3307 ddrems > backup.sql
```

## Restore Database

### Using phpMyAdmin
1. Select `ddrems` database
2. Click "Import" tab
3. Choose backup file
4. Click "Go"

### Using Command Line
```bash
mysql -u root -p -P 3307 ddrems < backup.sql
```

## Monitoring

### Check MySQL Status
```sql
SHOW STATUS;
SHOW PROCESSLIST;
SHOW VARIABLES;
```

### Check Database Size
```sql
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'ddrems'
GROUP BY table_schema;
```

## Useful Commands

### Start/Stop MySQL
```bash
# Start
net start wampmysqld64

# Stop
net stop wampmysqld64
```

### Check MySQL Version
```bash
mysql --version
```

### Access MySQL Console
```bash
mysql -u root -p -P 3307
```

---

**Your WAMP server is now configured for DDREMS! 🎉**
