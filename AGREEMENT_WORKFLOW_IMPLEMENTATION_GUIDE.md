# Agreement Workflow System - Complete Implementation Guide

**Status**: ✅ READY FOR IMPLEMENTATION
**Date**: March 26, 2026
**Version**: 1.0

---

## Overview

The Agreement Workflow System is a 10-step process that manages the complete lifecycle of property agreements from customer request through final transaction completion.

### 10-Step Workflow

```
STEP 1: Customer Initiates Request
    ↓
STEP 2: Property Admin Reviews & Forwards
    ↓
STEP 3: Owner Decision (Accept/Reject)
    ↓
STEP 4: Admin Generates Agreement
    ↓
STEP 5: Customer Edits Agreement
    ↓
STEP 6: Customer Submits with Payment
    ↓
STEP 7: Admin Reviews Submission
    ↓
STEP 8: Owner Final Review
    ↓
STEP 9: Owner Submits Final Agreement
    ↓
STEP 10: Commission Calculation & Final Handshake
    ↓
TRANSACTION COMPLETED
```

---

## Database Schema

### 10 Main Tables

1. **agreement_requests** - Main workflow tracking
2. **agreement_documents** - Agreement document versions
3. **agreement_fields** - Editable agreement fields
4. **agreement_payments** - Payment tracking
5. **agreement_workflow_history** - Audit trail
6. **agreement_commissions** - Commission tracking
7. **agreement_notifications** - Notification tracking
8. **agreement_templates** - Pre-defined templates
9. **agreement_signatures** - Digital signatures
10. **agreement_transactions** - Final transaction records

### Key Relationships

```
agreement_requests (main)
├── agreement_documents (versions)
├── agreement_fields (editable fields)
├── agreement_payments (payment info)
├── agreement_commissions (commission split)
├── agreement_signatures (digital signatures)
├── agreement_workflow_history (audit trail)
├── agreement_notifications (notifications)
└── agreement_transactions (final record)
```

---

## API Endpoints

### STEP 1: Customer Initiates Request

**POST /api/agreement-workflow/request**

Request:
```json
{
  "customer_id": 5,
  "property_id": 10,
  "customer_notes": "Interested in purchasing this property"
}
```

Response:
```json
{
  "success": true,
  "message": "Agreement request created successfully",
  "agreement_id": 1,
  "status": "pending_admin_review",
  "current_step": 1
}
```

---

### STEP 2: Property Admin Reviews & Forwards

**PUT /api/agreement-workflow/:agreementId/forward-to-owner**

Request:
```json
{
  "admin_id": 3,
  "admin_notes": "Request looks good. Forwarding to owner for review."
}
```

Response:
```json
{
  "success": true,
  "message": "Agreement forwarded to owner",
  "status": "waiting_owner_response",
  "current_step": 2
}
```

---

### STEP 3: Owner Decision

**PUT /api/agreement-workflow/:agreementId/owner-decision**

Request:
```json
{
  "owner_id": 2,
  "decision": "accepted",
  "owner_notes": "I accept this agreement"
}
```

Response:
```json
{
  "success": true,
  "message": "Agreement accepted by owner",
  "status": "owner_accepted",
  "current_step": 3
}
```

---

### STEP 4: Admin Generates Agreement

**POST /api/agreement-workflow/:agreementId/generate-agreement**

Request:
```json
{
  "admin_id": 3,
  "template_id": 1
}
```

Response:
```json
{
  "success": true,
  "message": "Agreement generated successfully",
  "document_id": 1,
  "status": "agreement_generated",
  "current_step": 4
}
```

---

### STEP 5: Customer Edits Agreement

**PUT /api/agreement-workflow/:agreementId/update-fields**

Request:
```json
{
  "customer_id": 5,
  "fields": {
    "buyer_name": "John Doe",
    "buyer_email": "john@example.com",
    "buyer_phone": "+251911234567",
    "purchase_date": "2026-04-15",
    "payment_terms": "Full payment upon signing"
  }
}
```

Response:
```json
{
  "success": true,
  "message": "Agreement fields updated successfully"
}
```

---

### STEP 6: Customer Submits Agreement

**POST /api/agreement-workflow/:agreementId/submit-agreement**

Request:
```json
{
  "customer_id": 5,
  "payment_method": "bank_transfer",
  "payment_amount": 500000,
  "receipt_file_path": "/uploads/receipts/receipt_001.pdf"
}
```

Response:
```json
{
  "success": true,
  "message": "Agreement submitted successfully",
  "payment_id": 1,
  "status": "customer_submitted",
  "current_step": 6
}
```

---

### STEP 7: Admin Reviews Submission

**PUT /api/agreement-workflow/:agreementId/admin-review**

Request:
```json
{
  "admin_id": 3,
  "action": "approved",
  "admin_notes": "Payment verified. Forwarding to owner for final review."
}
```

Response:
```json
{
  "success": true,
  "message": "Agreement approved by admin",
  "status": "waiting_owner_final_review",
  "current_step": 8
}
```

---

### STEP 8 & 9: Owner Final Review & Submission

**POST /api/agreement-workflow/:agreementId/owner-final-review**

Request:
```json
{
  "owner_id": 2,
  "owner_notes": "Agreement looks good. Ready to proceed."
}
```

Response:
```json
{
  "success": true,
  "message": "Owner final review submitted",
  "status": "owner_submitted",
  "current_step": 9
}
```

---

### STEP 10: Commission Calculation

**POST /api/agreement-workflow/:agreementId/calculate-commission**

Request:
```json
{
  "admin_id": 3,
  "commission_percentage": 5.00
}
```

Response:
```json
{
  "success": true,
  "message": "Commission calculated successfully",
  "customer_commission": 50000,
  "owner_commission": 50000,
  "total_commission": 100000,
  "status": "ready_for_handshake"
}
```

---

### STEP 10: Final Handshake

**POST /api/agreement-workflow/:agreementId/final-handshake**

Request:
```json
{
  "user_id": 5,
  "user_role": "customer"
}
```

Response (when both parties signed):
```json
{
  "success": true,
  "message": "Transaction completed successfully",
  "transaction_id": 1,
  "status": "completed",
  "current_step": 10
}
```

---

### GET Endpoints

**GET /api/agreement-workflow/:agreementId**
- Get complete agreement details with all related data

**GET /api/agreement-workflow/user/:userId**
- Get all agreements for a user (as customer or owner)

**GET /api/agreement-workflow/admin/pending**
- Get all pending agreements for admin dashboard

---

## Status Flow

```
pending_admin_review
    ↓
waiting_owner_response
    ↓
owner_accepted / owner_rejected
    ↓
agreement_generated
    ↓
customer_editing
    ↓
customer_submitted
    ↓
admin_reviewing
    ↓
waiting_owner_final_review
    ↓
owner_submitted
    ↓
ready_for_handshake
    ↓
completed / rejected / suspended
```

---

## Commission Calculation

### Formula

```
Customer Commission = Property Price × Commission % ÷ 100
Owner Commission = Property Price × Commission % ÷ 100
Total Commission = Customer Commission + Owner Commission
```

### Example

```
Property Price: 1,000,000 ETB
Commission %: 5%

Customer Commission = 1,000,000 × 5 ÷ 100 = 50,000 ETB
Owner Commission = 1,000,000 × 5 ÷ 100 = 50,000 ETB
Total Commission = 100,000 ETB
```

---

## Notification System

### Automatic Notifications

1. **Step 1**: Admin notified of new request
2. **Step 2**: Owner notified of forwarded request
3. **Step 3**: Admin notified of owner decision
4. **Step 4**: Customer notified of generated agreement
5. **Step 6**: Admin notified of customer submission
6. **Step 7**: Owner notified of admin approval
7. **Step 9**: Admin notified of owner submission
8. **Step 10**: Both parties notified of completion

---

## Workflow History & Audit Trail

Every action is logged in `agreement_workflow_history` table:

```json
{
  "agreement_request_id": 1,
  "step_number": 1,
  "step_name": "Customer Request",
  "action": "created",
  "action_by_id": 5,
  "action_date": "2026-03-26T10:30:00Z",
  "previous_status": null,
  "new_status": "pending_admin_review",
  "notes": "Customer initiated agreement request"
}
```

---

## Error Handling

### Common Errors

1. **Agreement Not Found**
   - Status: 404
   - Message: "Agreement not found"

2. **Invalid Action**
   - Status: 400
   - Message: "Invalid action. Must be approved, rejected, or suspended"

3. **Missing Required Fields**
   - Status: 400
   - Message: "Customer ID and Property ID required"

4. **Server Error**
   - Status: 500
   - Message: "Server error"

---

## Security Considerations

1. **Role-Based Access Control**
   - Only property admin can forward requests
   - Only owner can make owner decisions
   - Only customer can edit and submit agreement

2. **Data Validation**
   - All inputs validated before processing
   - Commission calculations verified
   - Payment amounts validated

3. **Audit Trail**
   - All actions logged with timestamp and user ID
   - IP address and user agent recorded
   - Complete history available for review

---

## Integration Points

### With Existing Systems

1. **Messages System**
   - Notifications sent via message system
   - Parties can communicate about agreement

2. **Property System**
   - Property details pulled from properties table
   - Price and owner information used

3. **User System**
   - User roles determine permissions
   - User information used in notifications

4. **Payment System**
   - Payment methods tracked
   - Receipt files stored

---

## Database Installation

Run the schema file to create all tables:

```bash
mysql -u root -p your_database < database/AGREEMENT_WORKFLOW_SCHEMA.sql
```

---

## Backend Integration

Add to `server/app.js`:

```javascript
const agreementWorkflowRouter = require('./routes/agreement-workflow');
app.use('/api/agreement-workflow', agreementWorkflowRouter);
```

---

## Frontend Components (To Be Created)

1. **CustomerAgreementRequest.js** - Step 1
2. **AdminAgreementReview.js** - Step 2
3. **OwnerAgreementDecision.js** - Step 3
4. **AdminAgreementGeneration.js** - Step 4
5. **CustomerAgreementEditor.js** - Steps 5-6
6. **AdminAgreementReview.js** - Step 7
7. **OwnerFinalReview.js** - Steps 8-9
8. **CommissionCalculation.js** - Step 10
9. **AgreementDashboard.js** - Overview

---

## Testing Checklist

- [ ] Customer can initiate request
- [ ] Admin can forward to owner
- [ ] Owner can accept/reject
- [ ] Admin can generate agreement
- [ ] Customer can edit fields
- [ ] Customer can submit with payment
- [ ] Admin can review and approve
- [ ] Owner can do final review
- [ ] Commission calculated correctly
- [ ] Final handshake completes transaction
- [ ] Notifications sent at each step
- [ ] Workflow history logged
- [ ] All statuses update correctly
- [ ] Error handling works
- [ ] Database queries optimized

---

## Performance Optimization

1. **Indexes Created**
   - Status and step indexes for quick filtering
   - Date indexes for sorting
   - Foreign key indexes for joins

2. **Views Created**
   - `v_agreement_status` - Quick status lookup
   - `v_commission_summary` - Commission overview

3. **Query Optimization**
   - Batch operations for notifications
   - Efficient joins with proper indexes
   - Pagination ready for large datasets

---

## Future Enhancements

1. **Digital Signatures**
   - Implement e-signature integration
   - Signature verification

2. **Document Generation**
   - PDF generation from templates
   - Email delivery of documents

3. **Payment Integration**
   - Real payment gateway integration
   - Automatic payment verification

4. **Reporting**
   - Commission reports
   - Transaction reports
   - Performance analytics

5. **Automation**
   - Auto-generate agreements
   - Auto-send reminders
   - Auto-calculate commissions

---

## Support & Troubleshooting

### Common Issues

1. **Agreement not found**
   - Verify agreement_id is correct
   - Check database connection

2. **Status not updating**
   - Verify user has correct role
   - Check workflow history for errors

3. **Notifications not sent**
   - Verify notification table has records
   - Check user notification preferences

4. **Commission calculation wrong**
   - Verify property price is correct
   - Check commission percentage

---

## Documentation Files

- `AGREEMENT_WORKFLOW_SCHEMA.sql` - Database schema
- `server/routes/agreement-workflow.js` - Backend endpoints
- `AGREEMENT_WORKFLOW_IMPLEMENTATION_GUIDE.md` - This file

---

**Status**: Ready for Frontend Implementation
**Next Step**: Create React components for each step
