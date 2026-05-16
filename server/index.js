const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const path = require('path');
const compression = require('compression');

dotenv.config();

// Connect to MongoDB (non-blocking so server starts immediately for Render health checks)
const connectDB = require('./config/mongo');
connectDB().catch(err => console.error('[MongoDB] Initial connection failed:', err.message));

const app = express();

// Increase EventEmitter limit for high-concurrency environments
require('events').EventEmitter.defaultMaxListeners = 20;


// Middleware
app.use(compression()); // Compress all routes for faster responses
app.use(cors({
  origin: true, // Allow all origins (needed for Vercel preview deployments with dynamic URLs)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-id']
}));

// Handle Chrome Private Network Access preflight (fixes "Allow/Block" popup)
app.use((req, res, next) => {
  if (req.headers['access-control-request-private-network']) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  next();
});
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/bank-accounts', require('./routes/bank-accounts'));
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

app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/commissions', require('./routes/commissions'));
app.use('/api/verification', require('./routes/verification'));

// New routes for system upgrade
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/system-transactions', require('./routes/system-transactions'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/agreement-requests', require('./routes/agreement-requests'));
app.use('/api/property-requests', require('./routes/property-requests'));
app.use('/api/broker-applications', require('./routes/broker-applications'));
app.use('/api/payment-confirmations', require('./routes/payment-confirmations'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/broker-bookings', require('./routes/broker-bookings'));

app.use('/api/agreement-workflow', require('./routes/agreement-workflow'));
app.use('/api/agreement-management', require('./routes/agreement-management'));
app.use('/api/real-estate-agreement', require('./routes/real-estate-agreement'));
app.use('/api/system-settings', require('./routes/system-settings'));
app.use('/api/broker-engagement', require('./routes/broker-engagement'));
app.use('/api/rental-payments', require('./routes/rental-payments'));
app.use('/api/user-settings', require('./routes/user-settings'));
app.use('/api/two-factor-auth', require('./routes/two-factor-auth'));
app.use('/api/edit-requests', require('./routes/edit-requests'));
app.use('/api/profile-approval', require('./routes/profile-approval'));
app.use('/api/map-properties', require('./routes/map-properties'));
app.use('/api/suspicious-activity', require('./routes/suspicious-activity'));
app.use('/api/mpesa', require('./routes/mpesa'));
app.use('/api/chapa', require('./routes/chapa'));
app.use('/api/site-check', require('./routes/site-check'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/service-control', require('./routes/service-control'));
app.use('/api/document-access', require('./routes/document-access'));
app.use('/api/user-preferences', require('./routes/user-preferences'));

// Health Check Routes
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'Dire Dawa Real Estate API is fully operational',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API is healthy' });
});

// 404 Handler to catch unknown routes
app.use((req, res, next) => {
  console.log(`[404 NOT FOUND] ${req.method} ${req.url}`);
  res.status(404).json({ message: 'Route not found: ' + req.url });
});

// Global error handler - catches unhandled errors in routes
app.use((err, req, res, next) => {
  console.error(`[SERVER ERROR] ${req.method} ${req.url}:`, err.message);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Prevent server crashes from unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION]', error.message);
  // Don't exit - let the server keep running
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Socket.io Initialization via dedicated module
const socketModule = require('./socket');
const io = socketModule.init(server);

// Auto-expire broker temporary bookings
setInterval(async () => {
  try {
    const { BrokerTemporaryBookings, Properties } = require('./models');
    const expiredBookings = await BrokerTemporaryBookings.find({
      status: 'reserved',
      hold_expiry_time: { $lt: new Date() }
    });

    if (expiredBookings && expiredBookings.length > 0) {
      for (const booking of expiredBookings) {
        await BrokerTemporaryBookings.findByIdAndUpdate(booking._id, { status: 'expired' });
        await Properties.findByIdAndUpdate(booking.property_id, { status: 'active' });
        console.log(`Auto-expired booking ${booking._id} and reactivated property ${booking.property_id}`);
      }
    }
  } catch (error) {
    console.error('Error in booking expiry cron:', error);
  }
}, 60 * 1000); // Check every minute

// Export io to be used in routes if needed directly, though socket.js should be preferred
app.set('socketio', io);

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
