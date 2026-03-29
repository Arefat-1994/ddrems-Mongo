-- ============================================================================
-- DDREMS COMPLETE SYSTEM UPGRADE
-- Adds all new features for improved system functionality
-- ============================================================================

USE ddrems;

-- ============================================================================
-- 1. ADD PROFILE TABLES FOR CUSTOMERS, OWNERS, AND BROKERS
-- ============================================================================

-- Customer Profiles
CREATE TABLE IF NOT EXISTS customer_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    address TEXT,
    profile_photo LONGTEXT,
    id_document LONGTEXT,
    profile_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_by INT,
    approved_at DATETIME,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_profile (user_id),
    KEY idx_approved_by (approved_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Owner Profiles
CREATE TABLE IF NOT EXISTS owner_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    address TEXT,
    profile_photo LONGTEXT,
    id_document LONGTEXT,
    business_license LONGTEXT,
    profile_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_by INT,
    approved_at DATETIME,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_profile (user_id),
    KEY idx_approved_by (approved_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Broker Profiles
CREATE TABLE IF NOT EXISTS broker_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    address TEXT,
    profile_photo LONGTEXT,
    id_document LONGTEXT,
    broker_license LONGTEXT,
    license_number VARCHAR(100),
    profile_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_by INT,
    approved_at DATETIME,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_profile (user_id),
    KEY idx_approved_by (approved_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 2. ADD AGREEMENT REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS agreement_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    property_id INT NOT NULL,
    customer_id INT NOT NULL,
    owner_id INT,
    broker_id INT,
    request_message TEXT,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    response_message TEXT,
    responded_by INT,
    responded_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_property (property_id),
    KEY idx_customer (customer_id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 3. ADD PROPERTY REQUESTS TABLE (FOR BROKERS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS property_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    property_id INT NOT NULL,
    broker_id INT NOT NULL,
    owner_id INT,
    request_type ENUM('viewing', 'information', 'collaboration') DEFAULT 'information',
    request_message TEXT,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    response_message TEXT,
    responded_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_property (property_id),
    KEY idx_broker (broker_id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 4. ENHANCE EXISTING TABLES
-- ============================================================================

-- Add profile_approved column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Add target_role to announcements if not exists
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS target_role ENUM('all', 'user', 'owner', 'broker', 'admin') DEFAULT 'all' AFTER priority,
ADD COLUMN IF NOT EXISTS author_id INT AFTER target_role;

-- Update existing admin and system_admin users to have approved profiles
UPDATE users 
SET profile_approved = TRUE, profile_completed = TRUE 
WHERE role IN ('admin', 'system_admin', 'property_admin');

-- Add document_key column to agreements if not exists
ALTER TABLE agreements 
ADD COLUMN IF NOT EXISTS document_key VARCHAR(8),
ADD COLUMN IF NOT EXISTS document_url LONGTEXT,
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS accepted_at DATETIME;

-- Add notification_type to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS notification_type ENUM('info', 'success', 'warning', 'error', 'request') DEFAULT 'info',
ADD COLUMN IF NOT EXISTS action_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS related_id INT;

-- ============================================================================
-- 5. CREATE INDEXES FOR BETTER PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_customer_profiles_user ON customer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_status ON customer_profiles(profile_status);
CREATE INDEX IF NOT EXISTS idx_owner_profiles_user ON owner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_owner_profiles_status ON owner_profiles(profile_status);
CREATE INDEX IF NOT EXISTS idx_broker_profiles_user ON broker_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_profiles_status ON broker_profiles(profile_status);
CREATE INDEX IF NOT EXISTS idx_agreement_requests_property ON agreement_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_agreement_requests_customer ON agreement_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_agreement_requests_status ON agreement_requests(status);
CREATE INDEX IF NOT EXISTS idx_property_requests_property ON property_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_property_requests_broker ON property_requests(broker_id);
CREATE INDEX IF NOT EXISTS idx_property_requests_status ON property_requests(status);

-- ============================================================================
-- 6. INSERT SAMPLE DATA FOR TESTING
-- ============================================================================

-- Sample announcements for testing
INSERT INTO announcements (title, content, priority, target_role, author_id, created_at) VALUES
('Welcome to DDREMS', 'Welcome to Dire Dawa Real Estate Management System. Browse properties and find your dream home!', 'high', 'user', 1, NOW()),
('New Properties Available', 'Check out our latest property listings in Kezira and Sabian areas.', 'medium', 'all', 1, DATE_SUB(NOW(), INTERVAL 2 DAY)),
('Document Verification Process', 'All property documents are now verified by our admin team for your security.', 'medium', 'all', 1, DATE_SUB(NOW(), INTERVAL 5 DAY)),
('Broker Registration Open', 'Licensed brokers can now register and list properties on our platform.', 'low', 'broker', 1, DATE_SUB(NOW(), INTERVAL 7 DAY)),
('System Maintenance Notice', 'Scheduled maintenance on Sunday 2:00 AM - 4:00 AM. Services may be temporarily unavailable.', 'high', 'all', 1, DATE_SUB(NOW(), INTERVAL 1 DAY));

-- ============================================================================
-- 7. CREATE VIEWS FOR EASIER DATA ACCESS
-- ============================================================================

-- View for customer profiles with user info
CREATE OR REPLACE VIEW v_customer_profiles AS
SELECT 
    cp.*,
    u.name as user_name,
    u.email as user_email,
    u.role as user_role,
    approver.name as approved_by_name
FROM customer_profiles cp
JOIN users u ON cp.user_id = u.id
LEFT JOIN users approver ON cp.approved_by = approver.id;

-- View for owner profiles with user info
CREATE OR REPLACE VIEW v_owner_profiles AS
SELECT 
    op.*,
    u.name as user_name,
    u.email as user_email,
    u.role as user_role,
    approver.name as approved_by_name
FROM owner_profiles op
JOIN users u ON op.user_id = u.id
LEFT JOIN users approver ON op.approved_by = approver.id;

-- View for broker profiles with user info
CREATE OR REPLACE VIEW v_broker_profiles AS
SELECT 
    bp.*,
    u.name as user_name,
    u.email as user_email,
    u.role as user_role,
    approver.name as approved_by_name
FROM broker_profiles bp
JOIN users u ON bp.user_id = u.id
LEFT JOIN users approver ON bp.approved_by = approver.id;

-- View for agreement requests with full details
CREATE OR REPLACE VIEW v_agreement_requests AS
SELECT 
    ar.*,
    p.title as property_title,
    p.location as property_location,
    p.price as property_price,
    customer.name as customer_name,
    customer.email as customer_email,
    owner.name as owner_name,
    broker.name as broker_name,
    responder.name as responded_by_name
FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
JOIN users customer ON ar.customer_id = customer.id
LEFT JOIN users owner ON ar.owner_id = owner.id
LEFT JOIN users broker ON ar.broker_id = broker.id
LEFT JOIN users responder ON ar.responded_by = responder.id;

-- ============================================================================
-- UPGRADE COMPLETE
-- ============================================================================

SELECT 'Database upgrade completed successfully!' as Status;
SELECT 'New tables created: customer_profiles, owner_profiles, broker_profiles, agreement_requests, property_requests' as Info;
SELECT 'Run the backend server to access new API endpoints' as NextStep;
