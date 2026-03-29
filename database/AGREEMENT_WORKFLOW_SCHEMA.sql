-- ============================================================================
-- AGREEMENT WORKFLOW SYSTEM - DATABASE SCHEMA
-- ============================================================================
-- This schema supports the complete 10-step agreement workflow:
-- Customer Request → Property Admin Review → Owner Decision → Agreement Generation
-- → Customer Completion → Admin Review → Owner Final Review → Commission Calculation
-- → Final Handshake → Transaction Completion
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
  
  -- Workflow status (10 steps)
  -- 1: pending_admin_review
  -- 2: waiting_owner_response
  -- 3: owner_accepted / owner_rejected
  -- 4: agreement_generated
  -- 5: customer_editing
  -- 6: customer_submitted
  -- 7: admin_reviewing
  -- 8: waiting_owner_final_review
  -- 9: owner_submitted
  -- 10: completed / rejected / suspended
  status VARCHAR(50) NOT NULL DEFAULT 'pending_admin_review',
  current_step INT DEFAULT 1,
  
  -- Request details
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  customer_notes TEXT,
  
  -- Owner decision
  owner_decision VARCHAR(20), -- 'accepted', 'rejected', null
  owner_decision_date TIMESTAMP NULL,
  owner_notes TEXT,
  
  -- Admin actions
  admin_action VARCHAR(20), -- 'approved', 'rejected', 'suspended'
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
-- 2. AGREEMENT_DOCUMENTS TABLE (Agreement document versions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  -- Document version tracking
  version INT DEFAULT 1,
  document_type VARCHAR(50), -- 'initial', 'customer_edited', 'final'
  
  -- Document content (JSON format for flexibility)
  document_content LONGTEXT, -- JSON with all agreement details
  
  -- Document metadata
  generated_by_id INT,
  generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Document status
  is_active BOOLEAN DEFAULT TRUE,
  is_signed BOOLEAN DEFAULT FALSE,
  
  -- Signatures
  customer_signature_date TIMESTAMP NULL,
  owner_signature_date TIMESTAMP NULL,
  admin_signature_date TIMESTAMP NULL,
  
  -- File storage
  file_path VARCHAR(255),
  file_size INT,
  file_type VARCHAR(50), -- 'pdf', 'docx', etc
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id),
  FOREIGN KEY (generated_by_id) REFERENCES users(id),
  
  INDEX idx_agreement_request_id (agreement_request_id),
  INDEX idx_version (version),
  INDEX idx_document_type (document_type)
);

-- ============================================================================
-- 3. AGREEMENT_FIELDS TABLE (Editable fields in agreement)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_fields (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  -- Field information
  field_name VARCHAR(100) NOT NULL,
  field_label VARCHAR(100),
  field_type VARCHAR(50), -- 'text', 'number', 'date', 'textarea', 'select'
  field_value TEXT,
  
  -- Field metadata
  is_editable BOOLEAN DEFAULT TRUE,
  is_required BOOLEAN DEFAULT FALSE,
  
  -- Who edited it
  edited_by_id INT,
  edited_date TIMESTAMP NULL,
  
  -- Validation
  validation_rules JSON,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id),
  FOREIGN KEY (edited_by_id) REFERENCES users(id),
  
  INDEX idx_agreement_request_id (agreement_request_id),
  INDEX idx_field_name (field_name)
);

-- ============================================================================
-- 4. AGREEMENT_PAYMENTS TABLE (Payment tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  -- Payment details
  payment_method VARCHAR(50), -- 'bank_transfer', 'cash', 'check', 'card'
  payment_amount DECIMAL(15, 2),
  payment_date TIMESTAMP,
  
  -- Receipt information
  receipt_file_path VARCHAR(255),
  receipt_file_name VARCHAR(255),
  receipt_file_size INT,
  receipt_uploaded_date TIMESTAMP,
  
  -- Payment status
  payment_status VARCHAR(50), -- 'pending', 'verified', 'rejected'
  verified_by_id INT,
  verified_date TIMESTAMP NULL,
  verification_notes TEXT,
  
  -- Transaction reference
  transaction_reference VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id),
  FOREIGN KEY (verified_by_id) REFERENCES users(id),
  
  INDEX idx_agreement_request_id (agreement_request_id),
  INDEX idx_payment_status (payment_status)
);

-- ============================================================================
-- 5. AGREEMENT_WORKFLOW_HISTORY TABLE (Audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_workflow_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  -- Step information
  step_number INT,
  step_name VARCHAR(100),
  
  -- Action details
  action VARCHAR(100), -- 'created', 'forwarded', 'accepted', 'rejected', etc
  action_by_id INT,
  action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Status change
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  
  -- Notes
  notes TEXT,
  
  -- Metadata
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
-- 6. AGREEMENT_COMMISSIONS TABLE (Commission tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_commissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  -- Commission details
  commission_type VARCHAR(50), -- 'customer', 'owner'
  recipient_id INT NOT NULL,
  
  -- Commission calculation
  property_price DECIMAL(15, 2),
  commission_percentage DECIMAL(5, 2),
  commission_amount DECIMAL(15, 2),
  
  -- Payment status
  payment_status VARCHAR(50), -- 'pending', 'paid', 'deducted'
  payment_date TIMESTAMP NULL,
  
  -- Payment method
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  
  -- Metadata
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
-- 7. AGREEMENT_NOTIFICATIONS TABLE (Notification tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  -- Notification details
  recipient_id INT NOT NULL,
  notification_type VARCHAR(50), -- 'request_received', 'forwarded', 'decision_made', etc
  notification_title VARCHAR(255),
  notification_message TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_date TIMESTAMP NULL,
  
  -- Metadata
  sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id),
  
  INDEX idx_agreement_request_id (agreement_request_id),
  INDEX idx_recipient_id (recipient_id),
  INDEX idx_is_read (is_read)
);

-- ============================================================================
-- 8. AGREEMENT_TEMPLATES TABLE (Pre-defined agreement templates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Template information
  template_name VARCHAR(100) NOT NULL,
  template_description TEXT,
  
  -- Template content
  template_content LONGTEXT, -- HTML/JSON template
  
  -- Template fields
  required_fields JSON, -- List of required fields
  optional_fields JSON, -- List of optional fields
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_by_id INT,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by_id) REFERENCES users(id),
  
  INDEX idx_is_active (is_active)
);

-- ============================================================================
-- 9. AGREEMENT_SIGNATURES TABLE (Digital signature tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_signatures (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  -- Signer information
  signer_id INT NOT NULL,
  signer_role VARCHAR(50), -- 'customer', 'owner', 'admin'
  
  -- Signature details
  signature_data LONGTEXT, -- Base64 encoded signature image
  signature_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Signature metadata
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  device_info VARCHAR(255),
  
  -- Verification
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
-- 10. AGREEMENT_TRANSACTIONS TABLE (Final transaction record)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreement_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  
  -- Transaction details
  transaction_type VARCHAR(50), -- 'sale', 'rent', 'lease'
  transaction_status VARCHAR(50), -- 'completed', 'cancelled', 'pending'
  
  -- Parties
  buyer_id INT,
  seller_id INT,
  broker_id INT,
  
  -- Property
  property_id INT,
  
  -- Financial details
  transaction_amount DECIMAL(15, 2),
  commission_amount DECIMAL(15, 2),
  net_amount DECIMAL(15, 2),
  
  -- Dates
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completion_date TIMESTAMP NULL,
  
  -- Documentation
  transaction_reference VARCHAR(100),
  receipt_number VARCHAR(100),
  
  -- Metadata
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

-- Agreement requests indexes
CREATE INDEX idx_agreement_requests_customer_owner ON agreement_requests(customer_id, owner_id);
CREATE INDEX idx_agreement_requests_status_step ON agreement_requests(status, current_step);
CREATE INDEX idx_agreement_requests_property_admin ON agreement_requests(property_admin_id, status);

-- Agreement documents indexes
CREATE INDEX idx_agreement_documents_active ON agreement_documents(agreement_request_id, is_active);

-- Agreement payments indexes
CREATE INDEX idx_agreement_payments_status_date ON agreement_payments(payment_status, payment_date);

-- Agreement workflow history indexes
CREATE INDEX idx_agreement_workflow_history_date ON agreement_workflow_history(action_date);

-- Agreement commissions indexes
CREATE INDEX idx_agreement_commissions_status ON agreement_commissions(payment_status);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Current agreement status for dashboard

-- ============================================================================
-- END OF AGREEMENT WORKFLOW SCHEMA