-- Add property_admin_id column to properties table
ALTER TABLE properties ADD COLUMN property_admin_id INT AFTER broker_id;
ALTER TABLE properties ADD FOREIGN KEY (property_admin_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE properties ADD INDEX idx_property_admin (property_admin_id);

-- Create index for faster queries
CREATE INDEX idx_properties_admin_status ON properties(property_admin_id, status);
