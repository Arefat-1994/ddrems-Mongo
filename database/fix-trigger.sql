-- Fix the trigger that failed during migration
-- MariaDB requires different syntax for triggers

USE ddrems;

DROP TRIGGER IF EXISTS update_property_views_count;

CREATE TRIGGER update_property_views_count
AFTER INSERT ON property_views
FOR EACH ROW
BEGIN
  UPDATE properties 
  SET views = views + 1 
  WHERE id = NEW.property_id;
END;
