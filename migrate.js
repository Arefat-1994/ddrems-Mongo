const db = require('./server/config/db');

async function migrate() {
    console.log('🚀 Starting Database Migration...');

    try {
        // 1. Announcements Table
        console.log('--- Creating announcements table ---');
        await db.query(`
            CREATE TABLE IF NOT EXISTS announcements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                priority ENUM('low', 'medium', 'high') DEFAULT 'low',
                target_role ENUM('all', 'user', 'broker', 'owner') DEFAULT 'all',
                created_by INT,
                author_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        // 2. Feedback Table
        console.log('--- Creating feedback table ---');
        await db.query(`
            CREATE TABLE IF NOT EXISTS feedback (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                property_id INT NOT NULL,
                rating INT CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
            )
        `);

        // 3. Property Views Table
        console.log('--- Creating property_views table ---');
        await db.query(`
            CREATE TABLE IF NOT EXISTS property_views (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                property_id INT NOT NULL,
                viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
            )
        `);

        // 4. Agreements Table Improvements
        console.log('--- Creating agreements table ---');
        await db.query(`
            CREATE TABLE IF NOT EXISTS agreements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                property_id INT NOT NULL,
                owner_id INT NOT NULL,
                customer_id INT NOT NULL,
                status ENUM('pending', 'active', 'completed', 'cancelled') DEFAULT 'pending',
                agreement_text TEXT,
                agreement_type VARCHAR(50),
                amount DECIMAL(15, 2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
                FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 5. Message Replies Support
        console.log('--- Updating messages table for replies ---');
        try {
            await db.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS parent_id INT DEFAULT NULL');
            await db.query('ALTER TABLE messages ADD FOREIGN KEY IF NOT EXISTS (parent_id) REFERENCES messages(id) ON DELETE SET NULL');
        } catch (e) {
            console.log('Note: parent_id might already exist or foreign key constraint issue.');
        }

        // 6. Property Documents Improvements
        console.log('--- Updating property_documents for access control ---');
        try {
            await db.query('ALTER TABLE property_documents ADD COLUMN IF NOT EXISTS access_key VARCHAR(100) DEFAULT NULL');
            await db.query('ALTER TABLE property_documents ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE');
        } catch (e) {
            console.log('Note: document columns might already exist.');
        }

        console.log('\n✅ Database Migration Complete!');
        setTimeout(() => process.exit(0), 1000);
    } catch (error) {
        console.error('\n❌ Migration Failed:', error);
        setTimeout(() => process.exit(1), 1000);
    }
}

migrate();
