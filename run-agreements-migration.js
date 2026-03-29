const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

console.log('Running migration script...\n');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ddrems',
  port: 3307,
  multipleStatements: true
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Connection failed!', err.message);
    process.exit(1);
  }
  
  console.log('✅ Connected to MySQL successfully!');
  
  const sqlPath = path.join(__dirname, 'database', 'agreements_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  connection.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Migration failed:', err.message);
      connection.end();
      process.exit(1);
    }
    
    console.log('✅ Migration successful!');
    connection.end();
    process.exit(0);
  });
});
