-- Update users table ENUM to include all roles
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'broker', 'user', 'owner', 'property_admin', 'system_admin') DEFAULT 'user';
