const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Add request logging
app.use((req, res, next) => {
  console.log(`[SERVER] ${req.method} ${req.url}`);
  next();
});

// Add request timeout handling
app.use((req, res, next) => {
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/brokers', require('./routes/brokers'));
app.use('/api/users', require('./routes/users'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/agreements', require('./routes/agreements'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/system', require('./routes/system'));
app.use('/api/property-views', require('./routes/property-views'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/property-images', require('./routes/property-images'));
app.use('/api/property-documents', require('./routes/property-documents'));
app.use('/api/document-access', require('./routes/document-access'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/commissions', require('./routes/commissions'));
app.use('/api/verification', require('./routes/verification'));

// New routes for system upgrade
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/agreement-requests', require('./routes/agreement-requests'));
app.use('/api/property-requests', require('./routes/property-requests'));
app.use('/api/payment-confirmations', require('./routes/payment-confirmations'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/key-requests', require('./routes/key-requests'));
app.use('/api/agreement-workflow', require('./routes/agreement-workflow'));
app.use('/api/agreement-management', require('./routes/agreement-management'));
app.use('/api/real-estate-agreement', require('./routes/real-estate-agreement'));

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle port already in use error
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error('\n❌ ERROR: Port ' + PORT + ' is already in use!\n');
    console.log('Solutions:');
    console.log('1. Run: KILL_PORT_5000.bat');
    console.log('2. Or open Task Manager and end all Node.js processes');
    console.log('3. Or change PORT in .env file to a different port\n');
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});
