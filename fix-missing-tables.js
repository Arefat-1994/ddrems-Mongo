const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      port: 3307,
      user: 'root',
      password: '',
      database: 'ddrems'
    });

    console.log('Creating missing tables...\n');

    // Create payment_receipts table
    try {
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS payment_receipts (
          id INT PRIMARY KEY AUTO_INCREMENT,
          agreement_request_id INT NOT NULL,
          payment_method ENUM('bank_transfer', 'cash', 'check', 'card', 'other') NOT NULL,
          payment_amount DECIMAL(15, 2) NOT NULL,
          payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          receipt_file_path VARCHAR(500),
          receipt_file_name VARCHAR(255),
          file_size INT,
          verified_by_id INT,
          verification_date TIMESTAMP NULL,
          verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
          verification_notes TEXT,
          transaction_reference VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id) ON DELETE CASCADE,
          FOREIGN KEY (verified_by_id) REFERENCES users(id) ON DELETE SET NULL,
          INDEX idx_agreement (agreement_request_id),
          INDEX idx_status (verification_status),
          INDEX idx_date (payment_date)
        )
      `);
      console.log('✅ Created payment_receipts table');
    } catch (e) {
      if (e.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('⚠️  payment_receipts table already exists');
      } else {
        console.error('❌ Error creating payment_receipts:', e.message);
      }
    }

    // Create commission_tracking table
    try {
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS commission_tracking (
          id INT PRIMARY KEY AUTO_INCREMENT,
          agreement_request_id INT NOT NULL,
          agreement_amount DECIMAL(15, 2) NOT NULL,
          customer_commission_percentage DECIMAL(5, 2) DEFAULT 5,
          owner_commission_percentage DECIMAL(5, 2) DEFAULT 5,
          customer_commission DECIMAL(15, 2) NOT NULL,
          owner_commission DECIMAL(15, 2) NOT NULL,
          total_commission DECIMAL(15, 2) NOT NULL,
          broker_commission DECIMAL(15, 2) DEFAULT 0,
          broker_commission_percentage DECIMAL(5, 2) DEFAULT 0,
          customer_commission_paid BOOLEAN DEFAULT FALSE,
          owner_commission_paid BOOLEAN DEFAULT FALSE,
          broker_commission_paid BOOLEAN DEFAULT FALSE,
          customer_commission_paid_date TIMESTAMP NULL,
          owner_commission_paid_date TIMESTAMP NULL,
          broker_commission_paid_date TIMESTAMP NULL,
          calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id) ON DELETE CASCADE,
          INDEX idx_agreement (agreement_request_id)
        )
      `);
      console.log('✅ Created commission_tracking table');
    } catch (e) {
      if (e.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('⚠️  commission_tracking table already exists');
      } else {
        console.error('❌ Error creating commission_tracking:', e.message);
      }
    }

    console.log('\n✅ All missing tables created successfully!');
    conn.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
