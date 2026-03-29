# Incremental Migration Guide

## What This Does

The `database/incremental-migration.sql` script safely updates your existing DDREMS database by:

✅ **Adding missing columns** to existing tables (non-destructive)
✅ **Creating missing tables** (skips if already exist)
✅ **Adding missing indexes** for performance
✅ **Updating existing data** with defaults
✅ **Creating triggers** for automatic updates
✅ **Creating views** for easier data access

**Safe to run multiple times** - uses `IF NOT EXISTS` and `IF EXISTS` checks

## How to Run

### Option 1: Command Line
```bash
mysql -u root -p ddrems < database/incremental-migration.sql
```

### Option 2: MySQL Workbench
1. Open MySQL Workbench
2. Connect to your database
3. File → Open SQL Script → Select `database/incremental-migration.sql`
4. Execute (Ctrl+Shift+Enter)

### Option 3: phpMyAdmin
1. Go to phpMyAdmin
2. Select `ddrems` database
3. Click "Import" tab
4. Choose `database/incremental-migration.sql`
5. Click "Go"

## What Gets Added

### Phase 1: Column Additions
- `users`: profile_image, profile_approved, profile_completed
- `brokers`: profile_image
- `properties`: owner_id, listing_date, expiry_date, views, favorites, address, city, state, zip_code, main_image, features
- `messages`: message_type, status
- `notifications`: notification_type, action_url, related_id
- `announcements`: target_role, author_id
- `agreements`: document_key, document_url, terms_accepted, accepted_at

### Phase 2-5: New Tables (20+ tables)
- Profile tables: customer_profiles, owner_profiles, broker_profiles
- Request tables: agreement_requests, property_requests, broker_requests
- Payment tables: payment_confirmations
- History tables: profile_status_history, profile_edit_requests
- Property tables: property_views, property_documents, document_access, property_verification, favorites
- System tables: system_config, audit_log, receipts

### Phase 6: Performance Indexes
- 20+ indexes on frequently queried columns

### Phase 7: Data Updates
- Admin users marked as profile_approved
- Sample features added to properties
- System configuration inserted

### Phase 8: Triggers
- Automatic property view counter

### Phase 9: Views
- v_customer_profiles
- v_owner_profiles
- v_broker_profiles
- v_agreement_requests

## Verification

After running, verify success:

```sql
-- Check total tables
SELECT COUNT(*) as total_tables 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'ddrems';

-- List all tables
SHOW TABLES;

-- Check specific columns were added
DESCRIBE properties;
DESCRIBE users;

-- Check views exist
SHOW FULL TABLES WHERE TABLE_TYPE = 'VIEW';
```

## Rollback (if needed)

If something goes wrong, restore from backup:

```bash
mysql -u root -p ddrems < ddrems_backup.sql
```

## Troubleshooting

### Error: "Foreign key constraint fails"
- Ensure tables are created in correct order (script handles this)
- Check that referenced tables exist

### Error: "Duplicate key name"
- Index already exists (safe to ignore)
- Script uses `IF NOT EXISTS`

### Error: "Syntax error"
- Check MySQL version (requires 5.7+)
- Verify file encoding is UTF-8

## Next Steps

1. ✅ Run the incremental migration script
2. ✅ Verify all tables and columns exist
3. ✅ Test your application
4. ✅ Archive old schema files (optional)

## Files Reference

- **incremental-migration.sql** - Main migration script (safe, idempotent)
- **unified-schema.sql** - Complete fresh schema (for new installations)
- **DATABASE_MIGRATION_GUIDE.md** - Detailed migration options

## Support

For issues:
1. Check MySQL error logs
2. Verify database user has ALTER TABLE permissions
3. Ensure WAMP Server is running on port 3307
4. Confirm database connection in .env file
