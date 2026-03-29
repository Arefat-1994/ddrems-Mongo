-- Create database
CREATE DATABASE IF NOT EXISTS ddrems;
USE ddrems;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role ENUM('admin', 'broker', 'user', 'owner', 'property_admin', 'system_admin') DEFAULT 'user',
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Brokers table
CREATE TABLE IF NOT EXISTS brokers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  license_number VARCHAR(100) UNIQUE,
  commission_rate DECIMAL(5,2) DEFAULT 2.5,
  total_sales INT DEFAULT 0,
  total_commission DECIMAL(15,2) DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(15,2) NOT NULL,
  location VARCHAR(255) NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  type ENUM('house', 'apartment', 'land', 'commercial', 'villa') NOT NULL,
  bedrooms INT,
  bathrooms INT,
  area DECIMAL(10,2),
  status ENUM('active', 'pending', 'sold', 'rented', 'inactive') DEFAULT 'active',
  broker_id INT,
  verified BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMP NULL,
  images TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (broker_id) REFERENCES brokers(id) ON DELETE SET NULL
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  user_id INT NOT NULL,
  broker_id INT,
  amount DECIMAL(15,2) NOT NULL,
  transaction_type ENUM('sale', 'rent', 'installment') NOT NULL,
  payment_method ENUM('cash', 'bank_transfer', 'mobile_money', 'installment') NOT NULL,
  status ENUM('pending', 'completed', 'cancelled', 'failed') DEFAULT 'pending',
  installment_plan JSON,
  commission_amount DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (broker_id) REFERENCES brokers(id) ON DELETE SET NULL
);

-- Payments table (for installments)
CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  transaction_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_date DATE NOT NULL,
  status ENUM('pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  property_type VARCHAR(50),
  min_price DECIMAL(15,2),
  max_price DECIMAL(15,2),
  preferred_location VARCHAR(255),
  bedrooms INT,
  bathrooms INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Fraud alerts table
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  alert_type VARCHAR(100) NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  description TEXT,
  related_entity_type ENUM('user', 'broker', 'property', 'transaction'),
  related_entity_id INT,
  status ENUM('new', 'investigating', 'resolved', 'false_positive') DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL
);

-- Insert sample admin user (password: admin123)
INSERT INTO users (name, email, password, role) VALUES 
('System Administrator', 'admin@ddrems.com', '$2a$10$YourHashedPasswordHere', 'admin');

-- Insert sample brokers
INSERT INTO brokers (name, email, phone, license_number, commission_rate, total_sales, rating) VALUES
('John Doe', 'john@ddrems.com', '+251911234567', 'BRK001', 2.5, 15, 4.5),
('Jane Smith', 'jane@ddrems.com', '+251922345678', 'BRK002', 3.0, 22, 4.8),
('Ahmed Hassan', 'ahmed@ddrems.com', '+251933456789', 'BRK003', 2.5, 8, 4.2);

-- Insert sample properties
INSERT INTO properties (title, description, price, location, type, bedrooms, bathrooms, area, broker_id, verified) VALUES
('Modern Villa in Kezira', 'Beautiful 4-bedroom villa with garden', 8500000, 'Kezira, Dire Dawa', 'villa', 4, 3, 350.00, 1, TRUE),
('Downtown Apartment', 'Spacious 2-bedroom apartment near city center', 2500000, 'Downtown, Dire Dawa', 'apartment', 2, 1, 120.00, 2, TRUE),
('Commercial Building', 'Prime location commercial property', 15000000, 'Sabian, Dire Dawa', 'commercial', 0, 2, 500.00, 1, TRUE),
('Residential Land', '500 sqm residential plot', 1200000, 'Legehare, Dire Dawa', 'land', 0, 0, 500.00, 3, FALSE);
