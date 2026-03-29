-- ============================================================================
-- REAL ESTATE AGREEMENT MANAGEMENT SYSTEM - COMPLETE SCHEMA
-- ============================================================================
-- This schema implements a complete real-world agreement lifecycle
-- with multi-role workflow, financial processing, and audit trails

-- ============================================================================
-- 1. AGREEMENT REQUESTS TABLE (Initial Request)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  customer_id INT NOT NULL,
  owner_id INT NOT NULL,
  property_admin_id INT NOT NULL,
  broker_id INT,
  
  -- Request Information
  customer_notes TEXT,
  request_message TEXT,
  
  -- Status Tracking
  status ENUM(
    'pending_admin_review',
    'forwarded_to_owner',
    'owner_approved',
    'owner_rejected',
    'waiting_customer_input',
    'submitted_by_customer',
    'owner_final_approved',
    'payment_submitted',
    'completed',
    'cancelled'
  ) DEFAULT 'pending_admin_review',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  forwarded_to_owner_date TIMESTAMP NULL,
  owner_response_date TIMESTAMP NULL,
  customer_submission_date TIMESTAMP NULL,
  final_approval_date TIMESTAMP NULL,
  payment_date TIMESTAMP NULL,
  completion_date TIMESTAMP NULL,
  
  -- Response Information
  response_message TEXT,
  admin_notes TEXT,
  owner_notes TEXT,
  
  -- Foreign Keys
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_admin_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_property (property_id),
  INDEX idx_customer (customer_id),
  INDEX idx_owner (owner_id),
  INDEX idx_admin (property_admin_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
);

-- ============================================================================
-- 2. AGREEMENT DOCUMENTS TABLE (Agreement Versions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  -- Document Version
  version INT DEFAULT 1,
  document_type ENUM('initial', 'customer_edited', 'owner_edited', 'final') DEFAULT 'initial',
  
  -- Document Content
  document_html LONGTEXT,
  document_json LONGTEXT, -- JSON format for structured data
  
  -- Document Metadata
  generated_by_id INT,
  generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- File Storage
  document_path VARCHAR(500),
  file_size INT,
  
  -- Foreign Keys
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (generated_by_id) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_agreement (agreement_request_id),
  INDEX idx_version (version),
  INDEX idx_type (document_type)
);

-- ============================================================================
-- 3. AGREEMENT FIELDS TABLE (Pre-filled Information)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_fields (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  -- Customer Information
  customer_full_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_address TEXT,
  customer_id_document VARCHAR(255),
  customer_occupation VARCHAR(100),
  customer_income DECIMAL(15, 2),
  
  -- Owner Information
  owner_full_name VARCHAR(255),
  owner_email VARCHAR(255),
  owner_phone VARCHAR(20),
  owner_address TEXT,
  owner_id_document VARCHAR(255),
  owner_bank_account VARCHAR(50),
  owner_tax_id VARCHAR(50),
  
  -- Property Information
  property_title VARCHAR(255),
  property_location TEXT,
  property_type VARCHAR(50),
  property_price DECIMAL(15, 2),
  property_area DECIMAL(10, 2),
  property_description TEXT,
  property_image_path VARCHAR(500),
  
  -- Broker Information
  broker_name VARCHAR(255),
  broker_license VARCHAR(100),
  broker_email VARCHAR(255),
  broker_phone VARCHAR(20),
  
  -- Editable Fields
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  final_price DECIMAL(15, 2),
  customer_notes TEXT,
  owner_notes TEXT,
  agreement_terms TEXT,
  special_conditions TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Key
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id) ON DELETE CASCADE,
  
  -- Index
  INDEX idx_agreement (agreement_request_id)
);

-- ============================================================================
-- 4. PAYMENT RECEIPTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_receipts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  -- Payment Information
  payment_method ENUM('bank_transfer', 'cash', 'check', 'card', 'other') NOT NULL,
  payment_amount DECIMAL(15, 2) NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Receipt File
  receipt_file_path VARCHAR(500),
  receipt_file_name VARCHAR(255),
  file_size INT,
  
  -- Verification
  verified_by_id INT,
  verification_date TIMESTAMP NULL,
  verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  verification_notes TEXT,
  
  -- Transaction Reference
  transaction_reference VARCHAR(100),
  
  -- Foreign Keys
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by_id) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_agreement (agreement_request_id),
  INDEX idx_status (verification_status),
  INDEX idx_date (payment_date)
);

-- ============================================================================
-- 5. COMMISSION TRACKING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS commission_tracking (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  -- Commission Calculation
  agreement_amount DECIMAL(15, 2) NOT NULL,
  customer_commission_percentage DECIMAL(5, 2) DEFAULT 5,
  owner_commission_percentage DECIMAL(5, 2) DEFAULT 5,
  
  -- Commission Amounts
  customer_commission DECIMAL(15, 2) NOT NULL,
  owner_commission DECIMAL(15, 2) NOT NULL,
  total_commission DECIMAL(15, 2) NOT NULL,
  
  -- Broker Commission (if applicable)
  broker_commission DECIMAL(15, 2) DEFAULT 0,
  broker_commission_percentage DECIMAL(5, 2) DEFAULT 0,
  
  -- Payment Status
  customer_commission_paid BOOLEAN DEFAULT FALSE,
  owner_commission_paid BOOLEAN DEFAULT FALSE,
  broker_commission_paid BOOLEAN DEFAULT FALSE,
  
  -- Payment Dates
  customer_commission_paid_date TIMESTAMP NULL,
  owner_commission_paid_date TIMESTAMP NULL,
  broker_commission_paid_date TIMESTAMP NULL,
  
  -- Timestamps
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Key
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id) ON DELETE CASCADE,
  
  -- Index
  INDEX idx_agreement (agreement_request_id)
);

-- ============================================================================
-- 6. TRANSACTION RECEIPTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS transaction_receipts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  commission_tracking_id INT NOT NULL,
  
  -- Receipt Information
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  receipt_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Transaction Details
  transaction_type ENUM('payment', 'commission', 'refund') NOT NULL,
  transaction_amount DECIMAL(15, 2) NOT NULL,
  
  -- Parties Involved
  from_user_id INT,
  to_user_id INT,
  
  -- Receipt File
  receipt_file_path VARCHAR(500),
  receipt_html LONGTEXT,
  
  -- Status
  status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  
  -- Foreign Keys
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (commission_tracking_id) REFERENCES commission_tracking(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_agreement (agreement_request_id),
  INDEX idx_receipt_number (receipt_number),
  INDEX idx_date (receipt_date)
);

-- ============================================================================
-- 7. AUDIT LOG TABLE (Complete Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  -- Action Information
  action_type VARCHAR(100) NOT NULL,
  action_description TEXT,
  
  -- User Information
  performed_by_id INT,
  user_role VARCHAR(50),
  
  -- Status Change
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  
  -- Changes Made
  changes_json LONGTEXT, -- JSON format for detailed changes
  
  -- IP and Device Info
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by_id) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_agreement (agreement_request_id),
  INDEX idx_action (action_type),
  INDEX idx_date (created_at),
  INDEX idx_user (performed_by_id)
);

-- ============================================================================
-- 8. NOTIFICATIONS TABLE (Real-time Notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  -- Notification Details
  recipient_id INT NOT NULL,
  notification_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Notification Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  
  -- Action Link
  action_url VARCHAR(500),
  action_type VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  
  -- Foreign Keys
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_agreement (agreement_request_id),
  INDEX idx_recipient (recipient_id),
  INDEX idx_status (is_read),
  INDEX idx_type (notification_type),
  INDEX idx_created (created_at)
);

-- ============================================================================
-- 9. DOCUMENT UPLOADS TABLE (Receipt and Document Storage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_document_uploads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  -- File Information
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INT,
  
  -- Upload Details
  upload_type ENUM('receipt', 'document', 'signature', 'other') NOT NULL,
  uploaded_by_id INT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- File Verification
  virus_scanned BOOLEAN DEFAULT FALSE,
  scan_result VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_agreement (agreement_request_id),
  INDEX idx_type (upload_type),
  INDEX idx_uploader (uploaded_by_id)
);

-- ============================================================================
-- 10. AGREEMENT SIGNATURES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_signatures (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  -- Signature Information
  signer_id INT NOT NULL,
  signer_role VARCHAR(50),
  
  -- Signature Data
  signature_image_path VARCHAR(500),
  signature_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Digital Signature (if applicable)
  digital_signature_hash VARCHAR(255),
  signature_verified BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (signer_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_agreement (agreement_request_id),
  INDEX idx_signer (signer_id)
);

-- ============================================================================
-- 11. VIEWS FOR REPORTING AND ANALYTICS
-- ============================================================================

-- View: Agreement Status Summary
CREATE OR REPLACE VIEW v_agreement_status_summary AS
SELECT 
  ar.id,
  ar.property_id,
  ar.customer_id,
  ar.owner_id,
  ar.property_admin_id,
  ar.status,
  p.title as property_title,
  c.name as customer_name,
  o.name as owner_name,
  a.name as admin_name,
  ar.created_at,
  ar.updated_at,
  DATEDIFF(NOW(), ar.created_at) as days_pending,
  ct.total_commission,
  ct.customer_commission,
  ct.owner_commission
FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
JOIN users c ON ar.customer_id = c.id
JOIN users o ON ar.owner_id = o.id
JOIN users a ON ar.property_admin_id = a.id
LEFT JOIN commission_tracking ct ON ar.id = ct.agreement_request_id
ORDER BY ar.created_at DESC;

-- View: Commission Summary
CREATE OR REPLACE VIEW v_commission_summary AS
SELECT 
  ct.id,
  ar.id as agreement_id,
  ar.customer_id,
  ar.owner_id,
  c.name as customer_name,
  o.name as owner_name,
  ct.agreement_amount,
  ct.customer_commission,
  ct.owner_commission,
  ct.total_commission,
  ct.customer_commission_paid,
  ct.owner_commission_paid,
  ct.calculated_at
FROM commission_tracking ct
JOIN agreement_requests ar ON ct.agreement_request_id = ar.id
JOIN users c ON ar.customer_id = c.id
JOIN users o ON ar.owner_id = o.id
ORDER BY ct.calculated_at DESC;

-- View: Pending Actions by Role
CREATE OR REPLACE VIEW v_pending_actions_by_role AS
SELECT 
  ar.id,
  ar.status,
  ar.property_admin_id,
  ar.owner_id,
  ar.customer_id,
  p.title as property_title,
  CASE 
    WHEN ar.status = 'pending_admin_review' THEN ar.property_admin_id
    WHEN ar.status = 'forwarded_to_owner' THEN ar.owner_id
    WHEN ar.status = 'waiting_customer_input' THEN ar.customer_id
    WHEN ar.status = 'submitted_by_customer' THEN ar.property_admin_id
    WHEN ar.status = 'owner_final_approved' THEN ar.customer_id
  END as pending_with_user_id,
  ar.created_at,
  DATEDIFF(NOW(), ar.created_at) as days_pending
FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
WHERE ar.status NOT IN ('completed', 'cancelled')
ORDER BY ar.created_at ASC;

-- ============================================================================
-- 12. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Additional indexes for common queries
CREATE INDEX idx_agreement_status_date ON agreement_requests(status, created_at);
CREATE INDEX idx_agreement_user_status ON agreement_requests(customer_id, status);
CREATE INDEX idx_agreement_owner_status ON agreement_requests(owner_id, status);
CREATE INDEX idx_commission_paid ON commission_tracking(customer_commission_paid, owner_commission_paid);
CREATE INDEX idx_audit_date_action ON agreement_audit_log(created_at, action_type);

-- ============================================================================
-- 13. STORED PROCEDURES FOR COMMON OPERATIONS
-- ============================================================================

-- Procedure: Calculate Commission
DELIMITER //
CREATE PROCEDURE sp_calculate_commission(
  IN p_agreement_id INT,
  IN p_agreement_amount DECIMAL(15, 2),
  IN p_customer_percentage DECIMAL(5, 2),
  IN p_owner_percentage DECIMAL(5, 2)
)
BEGIN
  DECLARE v_customer_commission DECIMAL(15, 2);
  DECLARE v_owner_commission DECIMAL(15, 2);
  DECLARE v_total_commission DECIMAL(15, 2);
  
  SET v_customer_commission = (p_agreement_amount * p_customer_percentage) / 100;
  SET v_owner_commission = (p_agreement_amount * p_owner_percentage) / 100;
  SET v_total_commission = v_customer_commission + v_owner_commission;
  
  INSERT INTO commission_tracking (
    agreement_request_id,
    agreement_amount,
    customer_commission_percentage,
    owner_commission_percentage,
    customer_commission,
    owner_commission,
    total_commission
  ) VALUES (
    p_agreement_id,
    p_agreement_amount,
    p_customer_percentage,
    p_owner_percentage,
    v_customer_commission,
    v_owner_commission,
    v_total_commission
  );
END //
DELIMITER ;

-- Procedure: Update Agreement Status
DELIMITER //
CREATE PROCEDURE sp_update_agreement_status(
  IN p_agreement_id INT,
  IN p_new_status VARCHAR(50),
  IN p_updated_by_id INT,
  IN p_notes TEXT
)
BEGIN
  DECLARE v_old_status VARCHAR(50);
  
  SELECT status INTO v_old_status FROM agreement_requests WHERE id = p_agreement_id;
  
  UPDATE agreement_requests 
  SET status = p_new_status, 
      updated_at = NOW(),
      admin_notes = CONCAT(IFNULL(admin_notes, ''), '\n', p_notes)
  WHERE id = p_agreement_id;
  
  INSERT INTO agreement_audit_log (
    agreement_request_id,
    action_type,
    action_description,
    performed_by_id,
    old_status,
    new_status,
    created_at
  ) VALUES (
    p_agreement_id,
    'STATUS_CHANGE',
    CONCAT('Status changed from ', v_old_status, ' to ', p_new_status),
    p_updated_by_id,
    v_old_status,
    p_new_status,
    NOW()
  );
END //
DELIMITER ;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
