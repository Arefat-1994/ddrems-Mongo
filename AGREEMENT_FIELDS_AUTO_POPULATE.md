# Agreement Fields Auto-Population System

## Overview
The agreement workflow system now automatically populates agreement fields from user profiles, documents, and broker information. This ensures all necessary information is pre-filled and ready for review.

## Features Implemented

### 1. **Auto-Population Endpoint**
**Endpoint**: `GET /api/agreement-workflow/:agreementId/auto-populate-fields`

Automatically fetches and populates the following information:

#### Customer Information
- ✅ Full Name (from customer_profiles or users table)
- ✅ Email (from users table)
- ✅ Phone Number (from customer_profiles or users table)
- ✅ Address (from customer_profiles)
- ✅ ID Document Status (uploaded/not uploaded)
- ✅ Profile Photo Status (uploaded/not uploaded)

#### Owner Information
- ✅ Full Name (from owner_profiles or users table)
- ✅ Email (from users table)
- ✅ Phone Number (from owner_profiles or users table)
- ✅ Address (from owner_profiles)
- ✅ ID Document Status (uploaded/not uploaded)
- ✅ Business License Status (uploaded/not uploaded)
- ✅ Profile Photo Status (uploaded/not uploaded)

#### Property Information
- ✅ Property Title
- ✅ Property Type (apartment, villa, house, land, commercial)
- ✅ Location
- ✅ Price
- ✅ Bedrooms
- ✅ Bathrooms
- ✅ Area (m²)
- ✅ Description

#### Property Documents
- ✅ Document Count
- ✅ Document List (all uploaded documents)

#### Broker Information (if applicable)
- ✅ Broker Name
- ✅ Broker Email
- ✅ Broker Phone
- ✅ Broker License Number
- ✅ Broker License Document Status (uploaded/not uploaded)
- ✅ Broker Commission Rate (%)

#### Agreement Details
- ✅ Property Price
- ✅ Commission Percentage
- ✅ Agreement Date

### 2. **Field Retrieval Endpoint**
**Endpoint**: `GET /api/agreement-workflow/:agreementId/fields`

Retrieves all agreement fields with their current values and editability status.

### 3. **Field Update Endpoint**
**Endpoint**: `PUT /api/agreement-workflow/:agreementId/update-fields`

Allows customers to edit only the editable fields (non-auto-populated fields).

### 4. **Frontend Integration**

#### Auto-Population Trigger
- Automatically called when admin generates the agreement (Step 4)
- Populates all fields in the database
- Fields are marked as editable or read-only based on type

#### Edit Fields Modal
- Displays all auto-populated fields in a grid layout
- Read-only fields show with 🔒 lock icon
- Editable fields allow customer to modify values
- Clean, organized interface with field grouping

#### Field Display
- **Read-only Fields** (Auto-populated):
  - Customer information
  - Owner information
  - Property details
  - Broker information
  - Agreement details
  
- **Editable Fields**:
  - Customer can modify their own information if needed
  - Customer can add additional notes or details

## Database Schema

### agreement_fields Table
```sql
CREATE TABLE agreement_fields (
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
```

## Workflow Integration

### Step 4: Agreement Generation
1. Admin clicks "Generate Agreement"
2. System creates agreement document
3. **Auto-populate endpoint is called**
4. All fields are fetched from:
   - User profiles (customer_profiles, owner_profiles, broker_profiles)
   - User base information (users table)
   - Property details (properties table)
   - Property documents (property_documents table)
   - Broker information (brokers table)
5. Fields are stored in agreement_fields table
6. Customer is notified

### Step 5: Customer Edits Agreement
1. Customer clicks "Edit Fields"
2. Modal displays all auto-populated fields
3. Read-only fields show with lock icon
4. Customer can modify editable fields
5. Changes are saved to agreement_fields table
6. Edited fields track who made the change and when

## API Response Example

```json
{
  "success": true,
  "message": "Agreement fields auto-populated successfully",
  "fields": {
    "customer_full_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "+251911234567",
    "customer_address": "Addis Ababa, Ethiopia",
    "customer_id_document": "Uploaded",
    "owner_full_name": "Jane Smith",
    "owner_email": "jane@example.com",
    "owner_phone": "+251922345678",
    "owner_address": "Dire Dawa, Ethiopia",
    "owner_id_document": "Uploaded",
    "owner_business_license": "Uploaded",
    "property_title": "Modern Villa in Kezira",
    "property_type": "villa",
    "property_location": "Kezira, Dire Dawa",
    "property_price": "8500000",
    "property_bedrooms": "3",
    "property_bathrooms": "2",
    "property_area": "250",
    "property_documents_count": "5",
    "property_documents_list": "Title Deed, Survey Report, Tax Certificate, Insurance, Inspection Report",
    "broker_name": "Ahmed Hassan",
    "broker_email": "ahmed@broker.com",
    "broker_license_number": "BRK-2024-001",
    "broker_license_document": "Uploaded",
    "broker_commission_rate": "2.5%",
    "agreement_property_price": "8500000",
    "agreement_commission_percentage": "5%",
    "agreement_date": "2026-03-26"
  }
}
```

## Frontend Components

### AgreementWorkflow.js Updates
- Added `agreementFields` state to store fetched fields
- Added `fetchAgreementFields()` function to retrieve fields from API
- Updated `handleAction()` to fetch fields when opening edit modal
- Added edit form with auto-populated fields display
- Fields are displayed in a responsive grid layout
- Read-only fields are visually distinguished with lock icons

### Field Display Features
- **Grid Layout**: 2-column responsive grid
- **Field Grouping**: Organized by category (Customer, Owner, Property, Broker)
- **Visual Indicators**: 
  - 🔒 Lock icon for read-only fields
  - Different styling for editable vs read-only
  - Clear labels with field names
- **Scrollable Container**: Max height 500px with scroll for many fields

## Security & Validation

### Read-Only Fields
- Cannot be modified by customers
- Automatically populated from verified sources
- Include lock icon indicator
- Prevent tampering with critical information

### Editable Fields
- Only customer-specific information
- Validated before submission
- Tracked for audit trail
- Changes logged with timestamp and user ID

## Benefits

1. **Accuracy**: Information pulled directly from verified profiles
2. **Efficiency**: No manual data entry required
3. **Consistency**: Same information across all documents
4. **Security**: Read-only fields prevent tampering
5. **Audit Trail**: All changes tracked with user and timestamp
6. **User Experience**: Clean, organized interface
7. **Compliance**: Ensures all required information is present

## Testing Checklist

- ✅ Auto-populate endpoint fetches all required fields
- ✅ Fields are correctly stored in database
- ✅ Edit modal displays fields in organized grid
- ✅ Read-only fields show lock icon
- ✅ Editable fields allow modification
- ✅ Changes are saved correctly
- ✅ Audit trail tracks modifications
- ✅ All profile information is included
- ✅ Broker license information is included
- ✅ Document information is included

## Future Enhancements

1. **Field Validation**: Add validation rules for each field
2. **Field Templates**: Create customizable field templates
3. **Multi-language Support**: Support for multiple languages
4. **Digital Signatures**: Integrate digital signature fields
5. **Document Attachment**: Allow attaching documents to fields
6. **Field History**: Track all changes to each field
7. **Conditional Fields**: Show/hide fields based on conditions
8. **Field Dependencies**: Link fields that depend on each other

