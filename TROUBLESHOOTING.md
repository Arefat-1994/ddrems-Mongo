# DDREMS Admin Dashboard - Troubleshooting Guide

## 🔧 Common Issues and Solutions

### Installation Issues

#### Issue 1: npm install fails
**Symptoms:**
- Error messages during `npm install`
- Missing dependencies
- Permission errors

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If permission issues on Windows, run as Administrator
```

#### Issue 2: React app won't create
**Symptoms:**
- `create-react-app` fails
- Timeout errors
- Network issues

**Solutions:**
```bash
# Use npx with latest version
npx create-react-app@latest client

# Or install globally first
npm install -g create-react-app
create-react-app client

# Check Node version (should be 14+)
node --version
```

### Database Issues

#### Issue 3: Can't connect to MySQL
**Symptoms:**
- "ECONNREFUSED" error
- "Access denied" error
- Connection timeout

**Solutions:**

1. **Check WAMP is running:**
   - WAMP icon should be green
   - If orange/red, check services

2. **Verify port 3307:**
   ```bash
   netstat -ano | findstr :3307
   ```

3. **Check credentials in .env:**
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_PORT=3307
   ```

4. **Test connection:**
   ```bash
   mysql -u root -p -P 3307
   ```

5. **Reset MySQL password:**
   ```sql
   ALTER USER 'root'@'localhost' IDENTIFIED BY '';
   FLUSH PRIVILEGES;
   ```

#### Issue 4: Database import fails
**Symptoms:**
- SQL syntax errors
- Import timeout
- Table creation fails

**Solutions:**

1. **Use phpMyAdmin:**
   - Increase max upload size
   - Import in smaller chunks

2. **Use command line:**
   ```bash
   mysql -u root -p -P 3307 ddrems < database/schema.sql
   ```

3. **Check for existing database:**
   ```sql
   DROP DATABASE IF EXISTS ddrems;
   CREATE DATABASE ddrems;
   USE ddrems;
   SOURCE schema.sql;
   ```

#### Issue 5: Tables not created
**Symptoms:**
- Empty database
- Missing tables
- Query errors

**Solutions:**

1. **Verify database exists:**
   ```sql
   SHOW DATABASES;
   USE ddrems;
   SHOW TABLES;
   ```

2. **Re-import schema:**
   ```bash
   mysql -u root -p -P 3307 ddrems < database/schema.sql
   ```

3. **Check for errors in SQL file:**
   - Open schema.sql
   - Look for syntax errors
   - Verify table definitions

### Server Issues

#### Issue 6: Backend server won't start
**Symptoms:**
- Port 5000 already in use
- Module not found errors
- Syntax errors

**Solutions:**

1. **Check if port is in use:**
   ```bash
   netstat -ano | findstr :5000
   ```

2. **Kill process using port:**
   ```bash
   # Find PID from netstat output
   taskkill /PID <PID> /F
   ```

3. **Change port in .env:**
   ```
   PORT=5001
   ```

4. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules
   npm install
   ```

5. **Check for syntax errors:**
   ```bash
   node server/index.js
   ```

#### Issue 7: Frontend won't start
**Symptoms:**
- Port 3000 in use
- Compilation errors
- Module not found

**Solutions:**

1. **Check port availability:**
   ```bash
   netstat -ano | findstr :3000
   ```

2. **Use different port:**
   ```bash
   # Set PORT environment variable
   set PORT=3001
   npm start
   ```

3. **Clear React cache:**
   ```bash
   cd client
   rm -rf node_modules .cache
   npm install
   npm start
   ```

4. **Check for syntax errors:**
   - Review error messages
   - Fix import statements
   - Verify component names

### API Issues

#### Issue 8: API calls fail
**Symptoms:**
- Network errors
- CORS errors
- 404 not found

**Solutions:**

1. **Verify backend is running:**
   ```bash
   curl http://localhost:5000/api/dashboard/stats
   ```

2. **Check CORS configuration:**
   ```javascript
   // In server/index.js
   app.use(cors());
   ```

3. **Verify API endpoints:**
   - Check route files
   - Verify URL paths
   - Check HTTP methods

4. **Check network tab:**
   - Open browser DevTools
   - Check Network tab
   - Look for failed requests

#### Issue 9: Authentication fails
**Symptoms:**
- Login doesn't work
- Token errors
- Unauthorized errors

**Solutions:**

1. **Check user exists in database:**
   ```sql
   SELECT * FROM users WHERE email = 'admin@ddrems.com';
   ```

2. **Reset admin password:**
   ```javascript
   // Create hash-password.js
   const bcrypt = require('bcryptjs');
   const password = 'admin123';
   bcrypt.hash(password, 10, (err, hash) => {
     console.log(hash);
   });
   ```

3. **Update user password:**
   ```sql
   UPDATE users 
   SET password = '$2a$10$YourHashedPassword' 
   WHERE email = 'admin@ddrems.com';
   ```

4. **Check JWT secret:**
   ```
   # In .env
   JWT_SECRET=your_secret_key
   ```

### UI/Display Issues

#### Issue 10: Styles not loading
**Symptoms:**
- No colors
- Broken layout
- Missing styles

**Solutions:**

1. **Clear browser cache:**
   - Ctrl + Shift + Delete
   - Clear cache and reload

2. **Check CSS imports:**
   ```javascript
   import './Component.css';
   ```

3. **Verify CSS files exist:**
   - Check file paths
   - Verify file names
   - Check for typos

4. **Hard reload:**
   - Ctrl + F5 (Windows)
   - Cmd + Shift + R (Mac)

#### Issue 11: Components not rendering
**Symptoms:**
- Blank page
- Console errors
- Component not found

**Solutions:**

1. **Check browser console:**
   - F12 to open DevTools
   - Look for error messages
   - Check component names

2. **Verify imports:**
   ```javascript
   import Dashboard from './components/Dashboard';
   ```

3. **Check component exports:**
   ```javascript
   export default Dashboard;
   ```

4. **Verify file paths:**
   - Check relative paths
   - Verify file extensions
   - Check case sensitivity

### Performance Issues

#### Issue 12: Slow loading
**Symptoms:**
- Long load times
- Laggy interface
- Slow API responses

**Solutions:**

1. **Optimize database queries:**
   ```sql
   -- Add indexes
   CREATE INDEX idx_property_status ON properties(status);
   CREATE INDEX idx_broker_status ON brokers(status);
   ```

2. **Enable caching:**
   ```javascript
   // Add caching headers
   app.use((req, res, next) => {
     res.set('Cache-Control', 'public, max-age=300');
     next();
   });
   ```

3. **Optimize images:**
   - Compress images
   - Use appropriate formats
   - Lazy load images

4. **Check network:**
   - Test internet speed
   - Check for network issues
   - Verify server resources

#### Issue 13: Memory leaks
**Symptoms:**
- Increasing memory usage
- Browser slowdown
- Crashes

**Solutions:**

1. **Check for memory leaks:**
   - Use Chrome DevTools Memory profiler
   - Look for detached DOM nodes
   - Check event listeners

2. **Clean up effects:**
   ```javascript
   useEffect(() => {
     // Setup
     return () => {
       // Cleanup
     };
   }, []);
   ```

3. **Optimize re-renders:**
   ```javascript
   // Use React.memo
   export default React.memo(Component);
   ```

### WAMP Issues

#### Issue 14: WAMP won't start
**Symptoms:**
- Orange/red icon
- Services won't start
- Port conflicts

**Solutions:**

1. **Check port conflicts:**
   ```bash
   # Check port 80 (Apache)
   netstat -ano | findstr :80
   
   # Check port 3307 (MySQL)
   netstat -ano | findstr :3307
   ```

2. **Change Apache port:**
   - Edit httpd.conf
   - Change `Listen 80` to `Listen 8080`
   - Restart WAMP

3. **Check Windows Services:**
   - Open Services (services.msc)
   - Look for wampapache64 and wampmysqld64
   - Start services manually

4. **Reinstall WAMP:**
   - Backup database
   - Uninstall WAMP
   - Delete WAMP folder
   - Reinstall fresh

#### Issue 15: phpMyAdmin not accessible
**Symptoms:**
- 404 error
- Can't access phpMyAdmin
- Login fails

**Solutions:**

1. **Check WAMP is running:**
   - Icon should be green
   - Apache should be running

2. **Try different URL:**
   ```
   http://localhost/phpmyadmin
   http://127.0.0.1/phpmyadmin
   http://localhost:80/phpmyadmin
   ```

3. **Check phpMyAdmin config:**
   ```php
   // In config.inc.php
   $cfg['Servers'][$i]['host'] = 'localhost';
   $cfg['Servers'][$i]['port'] = '3307';
   ```

4. **Reset phpMyAdmin:**
   - Delete phpMyAdmin folder
   - Reinstall from WAMP

## 🆘 Emergency Fixes

### Complete Reset

If nothing works, try a complete reset:

```bash
# 1. Stop all servers
# Close all terminals

# 2. Delete node_modules
rm -rf node_modules
rm -rf client/node_modules

# 3. Delete package-lock files
rm package-lock.json
rm client/package-lock.json

# 4. Clear npm cache
npm cache clean --force

# 5. Reinstall everything
npm install
cd client
npm install
cd ..

# 6. Reset database
mysql -u root -p -P 3307 -e "DROP DATABASE IF EXISTS ddrems;"
mysql -u root -p -P 3307 < database/schema.sql

# 7. Restart servers
npm run server
cd client && npm start
```

## 📞 Getting Help

### Before Asking for Help

1. **Check error messages:**
   - Read the full error
   - Note the file and line number
   - Copy the error message

2. **Check logs:**
   - Browser console (F12)
   - Server terminal output
   - MySQL error logs

3. **Try basic fixes:**
   - Restart servers
   - Clear cache
   - Reinstall dependencies

### Information to Provide

When asking for help, include:

1. **System information:**
   - Operating system
   - Node.js version
   - npm version
   - WAMP version

2. **Error details:**
   - Full error message
   - Stack trace
   - When error occurs

3. **What you tried:**
   - Steps to reproduce
   - Solutions attempted
   - Results of attempts

## 🔍 Debugging Tips

### Backend Debugging

```javascript
// Add console logs
console.log('Request received:', req.body);
console.log('Database result:', result);

// Use try-catch
try {
  const result = await db.query(sql);
  console.log('Success:', result);
} catch (error) {
  console.error('Error:', error);
}
```

### Frontend Debugging

```javascript
// Add console logs
console.log('Component mounted');
console.log('State:', state);
console.log('Props:', props);

// Use React DevTools
// Install React Developer Tools extension
```

### Database Debugging

```sql
-- Check table structure
DESCRIBE properties;

-- Check data
SELECT * FROM properties LIMIT 5;

-- Check connections
SHOW PROCESSLIST;

-- Check errors
SHOW ERRORS;
```

## ✅ Verification Checklist

Before reporting an issue, verify:

- [ ] WAMP Server is running (green icon)
- [ ] MySQL is on port 3307
- [ ] Database 'ddrems' exists
- [ ] Tables are created
- [ ] Sample data is imported
- [ ] Backend server is running (port 5000)
- [ ] Frontend server is running (port 3000)
- [ ] No console errors
- [ ] .env file is configured
- [ ] Dependencies are installed
- [ ] Ports are not blocked by firewall

---

**Most issues can be resolved with these solutions! 🔧**
