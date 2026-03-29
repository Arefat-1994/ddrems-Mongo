-- ============================================================================
-- AGREEMENT WORKFLOW SYSTEM - DATABASE SCHEMA (FIXED)
-- ============================================================================

-- ============================================================================
-- 1. AGREEMENT_REQUESTS TABLE (Main workflow tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Parties involved
  customer_id INT NOT NULL,
  owner_id INT NOT NULL,
  property_id INT NOT NULL,
  property_admin_id INT,
  
  -- Workflow status
  status VARCHAR(50) NOT NULL DEFAULT 'pending_admin_review',
  current_step INT DEFAULT 1,
  
  -- Request details
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  customer_notes TEXT,
  
  -- Owner decision
  owner_decision VARCHAR(20),
  owner_decision_date TIMESTAMP NULL,
  owner_notes TEXT,
  
  -- Admin actions
  admin_action VARCHAR(20),
  admin_action_date TIMESTAMP NULL,
  admin_notes TEXT,
  
  -- Timestamps for each step
  forwarded_to_owner_date TIMESTAMP NULL,
  agreement_generated_date TIMESTAMP NULL,
  customer_submitted_date TIMESTAMP NULL,
  admin_reviewed_date TIMESTAMP NULL,
  owner_final_submitted_date TIMESTAMP NULL,
  completed_date TIMESTAMP NULL,
  
  -- Commission details
  property_price DECIMAL(15, 2),
  commission_percentage DECIMAL(5, 2) DEFAULT 5.00,
  customer_commission DECIMAL(15, 2),
  owner_commission DECIMAL(15, 2),
  total_commission DECIMAL(15, 2),
  commission_calculated_date TIMESTAMP NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (property_id) REFERENCES properties(id),
  FOREIGN KEY (property_admin_id) REFERENCES users(id),
  
  INDEX idx_customer_id (customer_id),
  INDEX idx_owner_id (owner_id),
  INDEX idx_property_id (property_id),
  INDEX idx_status (status),
  INDEX idx_current_step (current_step),
  INDEX idx_created_at (created_at)
);

-- ============================================================================
-- 2. AGREEMENT_DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  version INT DEFAULT 1,
  document_type VARCHAR(50),
  
  document_content LONGTEXT,
  
  generated_by_id INT,
  generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  is_active BOOLEAN DEFAULT TRUE,
  is_signed BOOLEAN DEFAULT FALSE,
  
  customer_signature_date TIMESTAMP NULL,
  owner_signature_date TIMESTAMP NULL,
  admin_signature_date TIMESTAMP NULL,
  
  file_path VARCHAR(255),
  file_size INT,
  file_type VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id),
  FOREIGN KEY (generated_by_id) REFERENCES users(id),
  
  INDEX idx_agreement_request_id (agreement_request_id),
  INDEX idx_version (version),
  INDEX idx_document_type (document_type)
);

-- ============================================================================
-- 3. AGREEMENT_FIELDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_fields (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  field_name VARCHAR(100) NOT NULL,
  field_label VARCHAR(100),
  field_type VARCHAR(50),
  field_value TEXT,
  
  is_editable BOOLEAN DEFAULT TRUE,
  is_required BOOLEAN DEFAULT FALSE,
  
  edited_by_id INT,
  edited_date TIMESTAMP NULL,
  
  validation_rules JSON,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id),
  FOREIGN KEY (edited_by_id) REFERENCES users(id),
  
  INDEX idx_agreement_request_id (agreement_request_id),
  INDEX idx_field_name (field_name)
);

-- ============================================================================
-- 4. AGREEMENT_PAYMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  payment_method VARCHAR(50),
  payment_amount DECIMAL(15, 2),
  payment_date TIMESTAMP,
  
  receipt_file_path VARCHAR(255),
  receipt_file_name VARCHAR(255),
  receipt_file_size INT,
  receipt_uploaded_date TIMESTAMP,
  
  payment_status VARCHAR(50),
  verified_by_id INT,
  verified_date TIMESTAMP NULL,
  verification_notes TEXT,
  
  transaction_reference VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id),
  FOREIGN KEY (verified_by_id) REFERENCES users(id),
  
  INDEX idx_agreement_request_id (agreement_request_id),
  INDEX idx_payment_status (payment_status)
);

-- ============================================================================
-- 5. AGREEMENT_WORKFLOW_HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_workflow_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  step_number INT,
  step_name VARCHAR(100),
  
  action VARCHAR(100),
  action_by_id INT,
  action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  
  notes TEXT,
  
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id),
  FOREIGN KEY (action_by_id) REFERENCES users(id),
  
  INDEX idx_agreement_request_id (agreement_request_id),
  INDEX idx_step_number (step_number),
  INDEX idx_action_date (action_date)
);

-- ============================================================================
-- 6. AGREEMENT_COMMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_commissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  commission_type VARCHAR(50),
  recipient_id INT NOT NULL,
  
  property_price DECIMAL(15, 2),
  commission_percentage DECIMAL(5, 2),
  commission_amount DECIMAL(15, 2),
  
  payment_status VARCHAR(50),
  payment_date TIMESTAMP NULL,
  
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  
  calculated_by_id INT,
  calculated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id),
  FOREIGN KEY (calculated_by_id) REFERENCES users(id),
  
  INDEX idx_agreement_request_id (agreement_request_id),
  INDEX idx_recipient_id (recipient_id),
  INDEX idx_payment_status (payment_status)
);

-- ============================================================================
-- 7. AGREEMENT_NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  recipient_id INT NOT NULL,
  notification_type VARCHAR(50),
  notification_title VARCHAR(255),
  notification_message TEXT,
  
  is_read BOOLEAN DEFAULT FALSE,
  read_date TIMESTAMP NULL,
  
  sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id),
  
  INDEX idx_agreement_request_id (agreement_request_id),
  INDEX idx_recipient_id (recipient_id),
  INDEX idx_is_read (is_read)
);

-- ============================================================================
-- 8. AGREEMENT_TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  template_name VARCHAR(100) NOT NULL,
  template_description TEXT,
  
  template_content LONGTEXT,
  
  required_fields JSON,
  optional_fields JSON,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_by_id INT,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by_id) REFERENCES users(id),
  
  INDEX idx_is_active (is_active)
);

-- ============================================================================
-- 9. AGREEMENT_SIGNATURES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_signatures (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  signer_id INT NOT NULL,
  signer_role VARCHAR(50),
  
  signature_data LONGTEXT,
  signature_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  device_info VARCHAR(255),
  
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by_id INT,
  verified_date TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id),
  FOREIGN KEY (signer_id) REFERENCES users(id),
  FOREIGN KEY (verified_by_id) REFERENCES users(id),
  
  INDEX idx_agreement_request_id (agreement_request_id),
  INDEX idx_signer_id (signer_id)
);

-- ============================================================================
-- 10. AGREEMENT_TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  transaction_type VARCHAR(50),
  transaction_status VARCHAR(50),
  
  buyer_id INT,
  seller_id INT,
  broker_id INT,
  
  property_id INT,
  
  transaction_amount DECIMAL(15, 2),
  commission_amount DECIMAL(15, 2),
  net_amount DECIMAL(15, 2),
  
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completion_date TIMESTAMP NULL,
  
  transaction_reference VARCHAR(100),
  receipt_number VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id),
  FOREIGN KEY (buyer_id) REFERENCES users(id),
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (broker_id) REFERENCES users(id),
  FOREIGN KEY (property_id) REFERENCES properties(id),
  
  INDEX idx_agreement_request_id (agreement_request_id),
  INDEX idx_transaction_status (transaction_status),
  INDEX idx_transaction_date (transaction_date)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_agreement_requests_customer_owner ON agreement_requests(customer_id, owner_id);
CREATE INDEX idx_agreement_requests_status_step ON agreement_requests(status, current_step);
CREATE INDEX idx_agreement_requests_property_admin ON agreement_requests(property_admin_id, status);
CREATE INDEX idx_agreement_documents_active ON agreement_documents(agreement_request_id, is_active);
CREATE INDEX idx_agreement_payments_status_date ON agreement_payments(payment_status, payment_date);
CREATE INDEX idx_agreement_workflow_history_date ON agreement_workflow_history(action_date);
CREATE INDEX idx_agreement_commissions_status ON agreement_commissions(payment_status);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

CREATE OR REPLACE VIEW v_agreement_status AS
SELECT 
  ar.id,
  ar.customer_id,
  ar.owner_id,
  ar.property_id,
  ar.status,
  ar.current_step,
  ar.request_date,
  ar.created_at,
  ar.completed_date,
  p.title as property_title,
  p.price as property_price,
  c.name as customer_name,
  o.name as owner_name,
  pa.name as admin_name,
  ar.total_commission
FROM agreement_requests ar
LEFT JOIN properties p ON ar.property_id = p.id
LEFT JOIN users c ON ar.customer_id = c.id
LEFT JOIN users o ON ar.owner_id = o.id
LEFT JOIN users pa ON ar.property_admin_id = pa.id;

CREATE OR REPLACE VIEW v_commission_summary AS
SELECT 
  ar.id as agreement_id,
  ar.property_id,
  ar.customer_id,
  ar.owner_id,
  ac_customer.commission_amount as customer_commission,
  ac_owner.commission_amount as owner_commission,
  (ac_customer.commission_amount + ac_owner.commission_amount) as total_commission,
  ac_customer.payment_status as customer_payment_status,
  ac_owner.payment_status as owner_payment_status
FROM agreement_requests ar
LEFT JOIN agreement_commissions ac_customer ON ar.id = ac_customer.agreement_request_id AND ac_customer.commission_type = 'customer'
LEFT JOIN agreement_commissions ac_owner ON ar.id = ac_owner.agreement_request_id AND ac_owner.commission_type = 'owner';

-- ============================================================================
-- END OF AGREEMENT WORKFLOW SCHEMA (FIXED)
-- ============================================================================
