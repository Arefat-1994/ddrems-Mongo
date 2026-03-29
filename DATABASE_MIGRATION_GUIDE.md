# DDREMS Database Migration Guide

## Overview
The unified schema consolidates all database definitions from multiple files into a single, clean source of truth. This eliminates redundancy and prevents conflicts.

## What Changed

### Consolidated Files
- `database/schema.sql` → Core tables
- `database/complete-schema.sql` → Additional tables
- `database/update-schema.sql` → Schema updates
- `COMPLETE_SYSTEM_UPGRADE.sql` → Profile & request tables
- `database/add-missing-tables.sql` → Missing tables
- `COMPLETE_FIX_ALL_ISSUES.sql` → Fixes & triggers

**All merged into:** `database/unified-schema.sql`

### Key Improvements
1. **Single source of truth** - One file to maintain
2. **Proper ordering** - Tables created in dependency order
3. **No redundancy** - Duplicate definitions removed
4. **Fixed conflicts** - Foreign key constraints properly ordered
5. **Syntax errors fixed** - Removed invalid COMMIT statements
6. **Complete indexes** - All performance indexes included
7. **Triggers included** - Property views counter trigger
8. **Views included** - All helper views for data access
9. **Sample data** - Test data for development

## Table Structure

### Core Tables (Base)
- `users` - All system actors
- `brokers` - Broker information
- `properties` - Property listings
- `transactions` - Property transactions
- `payments` - Payment records
- `user_preferences` - User search preferences
- `fraud_alerts` - Fraud detection
- `announcements` - System announcements

### Profile Tables
- `customer_profiles` - Customer profile details
- `owner_profiles` - Property owner profiles
- `broker_profiles` - Broker profile details

### Agreement & Request Tables
- `agreements` - Property agreements
- `agreement_requests` - Customer agreement requests
- `property_requests` - Broker property requests
- `broker_requests` - Incoming broker requests
- `payment_confirmations` - Payment confirmations
- `profile_edit_requests` - Profile edit requests
- `profile_status_history` - Profile status audit trail

### Property & Document Tables
- `property_views` - Property view tracking
- `property_documents` - Property documents
- `document_access` - Document access requests
- `property_verification` - Property verification status
- `favorites` - User favorites/wishlist

### Communication Tables
- `messages` - User messages
- `notifications` - System notifications
- `feedback` - User feedback

### System Tables
- `system_config` - Configuration settings
- `audit_log` - System audit trail
- `receipts` - Payment receipts

## Migration Steps

### Option 1: Fresh Installation
```bash
# Connect to MySQL
mysql -u root -p

# Run the unified schema
source database/unified-schema.sql;
```

### Option 2: Existing Database
```bash
# Backup existing database
mysqldump -u root -p ddrems > ddrems_backup.sql

# Drop and recreate
mysql -u root -p -e "DROP DATABASE ddrems;"

# Run unified schema
mysql -u root -p < database/unified-schema.sql
```

### Option 3: Incremental Update
If you have an existing database and want to add missing tables:
```bash
# Run only the new tables (they have IF NOT EXISTS)
mysql -u root -p ddrems < database/unified-schema.sql
```

## Configuration

### Database Connection (.env)
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ddrems
DB_PORT=3307
```

### Test Accounts
All test accounts use password: `admin123`
- `admin@ddrems.com` - System Administrator
- `owner@ddrems.com` - Property Owner
- `customer@ddrems.com` - Customer
- `broker@ddrems.com` - Broker
- `propertyadmin@ddrems.com` - Property Admin
- `systemadmin@ddrems.com` - System Admin

## Verification

After running the schema, verify all tables were created:

```sql
-- Check table count
SELECT COUNT(*) as total_tables 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'ddrems';

-- List all tables
SHOW TABLES;

-- Check specific table structure
DESCRIBE properties;
```

## Old Files (Can Be Archived)
These files are now superseded by `database/unified-schema.sql`:
- `database/schema.sql`
- `database/complete-schema.sql`
- `database/update-schema.sql`
- `database/add-missing-tables.sql`
- `COMPLETE_SYSTEM_UPGRADE.sql`
- `COMPLETE_FIX_ALL_ISSUES.sql`
- `enhance-database-schema.sql`

## Next Steps

1. **Backup existing database** (if applicable)
2. **Run unified schema** using one of the migration options above
3. **Verify all tables** using the verification queries
4. **Update documentation** to reference `database/unified-schema.sql`
5. **Archive old schema files** for reference

## Support

If you encounter issues:
1. Check MySQL error logs
2. Verify database user permissions
3. Ensure port 3307 is accessible
4. Confirm WAMP Server is running
