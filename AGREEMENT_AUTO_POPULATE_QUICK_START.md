# Agreement Auto-Populate Feature - Quick Start Guide

## What's New?

The agreement workflow now **automatically fills in all agreement fields** from user profiles, documents, and broker information. No manual data entry needed!

## How It Works

### Step-by-Step Flow

1. **Customer Requests Agreement** (Step 1)
   - Customer clicks "Request Agreement"
   - Selects property and submits

2. **Admin Forwards to Owner** (Step 2)
   - Property Admin reviews request
   - Clicks "Forward to Owner"

3. **Owner Accepts** (Step 3)
   - Owner receives notification
   - Clicks "Accept"

4. **Admin Generates Agreement** (Step 4) ⭐ **AUTO-POPULATE HAPPENS HERE**
   - Admin clicks "Generate Agreement"
   - System automatically fetches:
     - ✅ Customer profile info (name, email, phone, address, ID document)
     - ✅ Owner profile info (name, email, phone, address, ID, business license)
     - ✅ Property details (title, type, location, price, bedrooms, bathrooms, area)
     - ✅ Property documents (list of all uploaded documents)
     - ✅ Broker info (name, email, phone, license number, license document)
   - All fields are stored in database

5. **Customer Edits Agreement** (Step 5)
   - Customer clicks "Edit Fields"
   - Sees all auto-populated information
   - Can modify editable fields (marked without 🔒)
   - Read-only fields (marked with 🔒) cannot be changed
   - Submits with payment

## What Gets Auto-Populated?

### Customer Information
```
Full Name: John Doe (from profile)
Email: john@example.com (from account)
Phone: +251911234567 (from profile)
Address: Addis Ababa, Ethiopia (from profile)
ID Document: ✅ Uploaded (status from profile)
Profile Photo: ✅ Uploaded (status from profile)
```

### Owner Information
```
Full Name: Jane Smith (from profile)
Email: jane@example.com (from account)
Phone: +251922345678 (from profile)
Address: Dire Dawa, Ethiopia (from profile)
ID Document: ✅ Uploaded (status from profile)
Business License: ✅ Uploaded (status from profile)
Profile Photo: ✅ Uploaded (status from profile)
```

### Property Information
```
Title: Modern Villa in Kezira
Type: Villa
Location: Kezira, Dire Dawa
Price: 8,500,000 ETB
Bedrooms: 3
Bathrooms: 2
Area: 250 m²
Description: Beautiful modern villa with all amenities
```

### Property Documents
```
Document Count: 5
Documents: Title Deed, Survey Report, Tax Certificate, Insurance, Inspection Report
```

### Broker Information (if applicable)
```
Name: Ahmed Hassan
Email: ahmed@broker.com
Phone: +251933456789
License Number: BRK-2024-001
License Document: ✅ Uploaded
Commission Rate: 2.5%
```

### Agreement Details
```
Property Price: 8,500,000 ETB
Commission Percentage: 5%
Agreement Date: 2026-03-26
```

## Field Types

### 🔒 Read-Only Fields (Cannot Edit)
- All customer profile information
- All owner profile information
- All property details
- All broker information
- Agreement details

These are locked to prevent tampering with critical information.

### ✏️ Editable Fields (Can Edit)
- Customer can modify their own information if needed
- Additional notes or special requests
- Any field marked without 🔒 icon

## User Interface

### Edit Fields Modal
```
┌─────────────────────────────────────────────┐
│ 📋 Agreement Fields                         │
│ (Auto-populated from Profile & Documents)  │
├─────────────────────────────────────────────┤
│                                             │
│ Customer Information:                       │
│ ┌─────────────────┬─────────────────┐      │
│ │ Full Name       │ John Doe    🔒  │      │
│ │ Email           │ john@ex...  🔒  │      │
│ │ Phone           │ +251911...  🔒  │      │
│ │ Address         │ Addis...    🔒  │      │
│ └─────────────────┴─────────────────┘      │
│                                             │
│ Owner Information:                          │
│ ┌─────────────────┬─────────────────┐      │
│ │ Full Name       │ Jane Smith  🔒  │      │
│ │ Email           │ jane@ex...  🔒  │      │
│ │ Phone           │ +251922...  🔒  │      │
│ │ Address         │ Dire...     🔒  │      │
│ └─────────────────┴─────────────────┘      │
│                                             │
│ Property Information:                       │
│ ┌─────────────────┬─────────────────┐      │
│ │ Title           │ Modern Villa 🔒 │      │
│ │ Type            │ Villa       🔒  │      │
│ │ Location        │ Kezira...   🔒  │      │
│ │ Price           │ 8,500,000   🔒  │      │
│ └─────────────────┴─────────────────┘      │
│                                             │
│ [Cancel]                        [Confirm]  │
└─────────────────────────────────────────────┘
```

## API Endpoints

### Auto-Populate Fields
```
GET /api/agreement-workflow/:agreementId/auto-populate-fields
```
**Called automatically** when admin generates agreement

### Get All Fields
```
GET /api/agreement-workflow/:agreementId/fields
```
Retrieves all fields for display

### Update Fields
```
PUT /api/agreement-workflow/:agreementId/update-fields
```
Customer updates editable fields

## Benefits

✅ **No Manual Data Entry** - All info auto-filled from profiles
✅ **Accuracy** - Data pulled from verified sources
✅ **Security** - Critical info locked from editing
✅ **Efficiency** - Faster agreement processing
✅ **Consistency** - Same info across all documents
✅ **Audit Trail** - All changes tracked
✅ **Professional** - Complete, organized agreements

## Troubleshooting

### Fields Not Showing?
1. Make sure customer profile is complete
2. Check that owner profile is approved
3. Verify property documents are uploaded
4. Ensure broker information is in system

### Can't Edit a Field?
- Fields with 🔒 icon are read-only
- Only editable fields can be modified
- This is by design to protect critical information

### Missing Information?
- Check that all profiles are filled out
- Verify documents are uploaded
- Ensure broker is assigned to property

## Next Steps

1. **Customer Profile** - Complete your profile with all information
2. **Upload Documents** - Upload ID and other required documents
3. **Request Agreement** - Click "Request Agreement" on property
4. **Review Auto-Populated Fields** - Check that all info is correct
5. **Edit if Needed** - Modify any editable fields
6. **Submit with Payment** - Complete the agreement

## Support

For issues or questions:
- Contact Property Admin
- Check profile completeness
- Verify all documents are uploaded
- Review agreement status in dashboard

