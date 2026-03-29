const mysql = require('mysql2');

console.log('Testing database connection...\n');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ddrems',
  port: 3307
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Connection failed!');
    console.error('Error:', err.message);
    console.error('\nPlease check:');
    console.error('1. WAMP Server is running (green icon)');
    console.error('2. MySQL is configured on port 3307');
    console.error('3. Database "ddrems" exists');
    process.exit(1);
  }
  
  console.log('✅ Connected to MySQL successfully!');
  console.log('Host:', connection.config.host);
  console.log('Port:', connection.config.port);
  console.log('Database:', connection.config.database);
  
  // Test query
  connection.query('SHOW TABLES', (err, results) => {
    if (err) {
      console.error('❌ Query failed:', err.message);
      connection.end();
      process.exit(1);
    }
    
    console.log('\n📊 Tables in database:');
    if (results.length === 0) {
      console.log('⚠️  No tables found. Please import database/schema.sql');
    } else {
      results.forEach(row => {
        console.log('  -', Object.values(row)[0]);
      });
    }
    
    connection.end();
    console.log('\n✅ Database is ready!');
    process.exit(0);
  });
});
