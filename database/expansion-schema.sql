-- DDREMS Expansion Migration Script
-- Adds tables for Feedback, Messaging improvements, and Document Access Control

-- 1. Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    property_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- 2. Property Views Table (for recommendations)
CREATE TABLE IF NOT EXISTS property_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    property_id INT NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- 3. Update Property Documents for Access Control
-- Check if columns exist first via application logic or just run with ALTER
-- Adding access_key and is_locked
ALTER TABLE property_documents 
ADD COLUMN IF NOT EXISTS access_key VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- 4. Agreements Table (if not exists or ensure structure)
CREATE TABLE IF NOT EXISTS agreements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    owner_id INT NOT NULL,
    customer_id INT NOT NULL,
    status ENUM('pending', 'active', 'completed', 'cancelled') DEFAULT 'pending',
    agreement_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Messaging Improvements
-- Adding parent_id for threading if not exists
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS parent_id INT DEFAULT NULL,
ADD FOREIGN KEY IF NOT EXISTS (parent_id) REFERENCES messages(id) ON DELETE SET NULL;
