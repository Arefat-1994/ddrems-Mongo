# Agreement Workflow - Quick Reference

## 10-Step Process at a Glance

| Step | Actor | Action | Status | Endpoint |
|------|-------|--------|--------|----------|
| 1 | Customer | Initiates Request | `pending_admin_review` | `POST /request` |
| 2 | Admin | Reviews & Forwards | `waiting_owner_response` | `PUT /forward-to-owner` |
| 3 | Owner | Accept/Reject | `owner_accepted/rejected` | `PUT /owner-decision` |
| 4 | Admin | Generates Agreement | `agreement_generated` | `POST /generate-agreement` |
| 5 | Customer | Edits Fields | `customer_editing` | `PUT /update-fields` |
| 6 | Customer | Submits + Payment | `customer_submitted` | `POST /submit-agreement` |
| 7 | Admin | Reviews Submission | `admin_reviewing` | `PUT /admin-review` |
| 8 | Owner | Final Review | `waiting_owner_final_review` | `GET /details` |
| 9 | Owner | Submits Final | `owner_submitted` | `POST /owner-final-review` |
| 10 | Both | Commission & Handshake | `completed` | `POST /calculate-commission` + `POST /final-handshake` |

---

## Commission Calculation

```
Property Price: 1,000,000 ETB
Commission Rate: 5%

Customer Commission = 1,000,000 × 5% = 50,000 ETB
Owner Commission = 1,000,000 × 5% = 50,000 ETB
Total Commission = 100,000 ETB
```

---

## Database Tables

```
agreement_requests          (main workflow)
agreement_documents         (document versions)
agreement_fields            (editable fields)
agreement_payments          (payment tracking)
agreement_commissions       (commission split)
agreement_signatures        (digital signatures)
agreement_workflow_history  (audit trail)
agreement_notifications     (notifications)
agreement_templates         (pre-defined templates)
agreement_transactions      (final record)
```

---

## Key Statuses

```
pending_admin_review
    ↓
waiting_owner_response
    ↓
owner_accepted
    ↓
agreement_generated
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
completed
```

---

## API Quick Commands

### Step 1: Customer Request
```bash
curl -X POST http://localhost:5000/api/agreement-workflow/request \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 5,
    "property_id": 10,
    "customer_notes": "Interested in this property"
  }'
```

### Step 2: Admin Forward
```bash
curl -X PUT http://localhost:5000/api/agreement-workflow/1/forward-to-owner \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": 3,
    "admin_notes": "Forwarding to owner"
  }'
```

### Step 3: Owner Decision
```bash
curl -X PUT http://localhost:5000/api/agreement-workflow/1/owner-decision \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": 2,
    "decision": "accepted",
    "owner_notes": "I accept"
  }'
```

### Step 4: Generate Agreement
```bash
curl -X POST http://localhost:5000/api/agreement-workflow/1/generate-agreement \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": 3,
    "template_id": 1
  }'
```

### Step 5: Update Fields
```bash
curl -X PUT http://localhost:5000/api/agreement-workflow/1/update-fields \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 5,
    "fields": {
      "buyer_name": "John Doe",
      "buyer_email": "john@example.com"
    }
  }'
```

### Step 6: Submit Agreement
```bash
curl -X POST http://localhost:5000/api/agreement-workflow/1/submit-agreement \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 5,
    "payment_method": "bank_transfer",
    "payment_amount": 500000,
    "receipt_file_path": "/uploads/receipt.pdf"
  }'
```

### Step 7: Admin Review
```bash
curl -X PUT http://localhost:5000/api/agreement-workflow/1/admin-review \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": 3,
    "action": "approved",
    "admin_notes": "Approved"
  }'
```

### Step 9: Owner Final Review
```bash
curl -X POST http://localhost:5000/api/agreement-workflow/1/owner-final-review \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": 2,
    "owner_notes": "Ready to proceed"
  }'
```

### Step 10: Calculate Commission
```bash
curl -X POST http://localhost:5000/api/agreement-workflow/1/calculate-commission \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": 3,
    "commission_percentage": 5.00
  }'
```

### Step 10: Final Handshake
```bash
curl -X POST http://localhost:5000/api/agreement-workflow/1/final-handshake \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 5,
    "user_role": "customer"
  }'
```

### Get Agreement Details
```bash
curl http://localhost:5000/api/agreement-workflow/1
```

### Get User Agreements
```bash
curl http://localhost:5000/api/agreement-workflow/user/5
```

### Get Pending Agreements
```bash
curl http://localhost:5000/api/agreement-workflow/admin/pending
```

---

## Notifications Sent

| Step | Recipient | Message |
|------|-----------|---------|
| 1 | Admin | New agreement request received |
| 2 | Owner | Agreement request forwarded for review |
| 3 | Admin | Owner decision made |
| 4 | Customer | Agreement document generated |
| 6 | Admin | Customer submitted agreement with payment |
| 7 | Owner | Admin approved, awaiting final review |
| 9 | Admin | Owner submitted final agreement |
| 10 | Both | Transaction completed successfully |

---

## Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 400 | Missing required fields | Provide all required parameters |
| 404 | Agreement not found | Verify agreement ID |
| 400 | Invalid action | Use valid action (approved/rejected/suspended) |
| 500 | Server error | Check server logs |

---

## Workflow Diagram

```
Customer
   ↓
[Request Agreement]
   ↓
Admin
   ↓
[Forward to Owner]
   ↓
Owner
   ↓
[Accept/Reject]
   ↓
Admin
   ↓
[Generate Agreement]
   ↓
Customer
   ↓
[Edit + Payment]
   ↓
[Submit Agreement]
   ↓
Admin
   ↓
[Review & Approve]
   ↓
Owner
   ↓
[Final Review]
   ↓
[Submit Final]
   ↓
Admin
   ↓
[Calculate Commission]
   ↓
Customer + Owner
   ↓
[Final Handshake]
   ↓
[TRANSACTION COMPLETED]
```

---

## Key Fields in agreement_requests

```
id                          - Unique identifier
customer_id                 - Customer user ID
owner_id                    - Property owner user ID
property_id                 - Property ID
property_admin_id           - Admin handling request
status                      - Current workflow status
current_step                - Step number (1-10)
property_price              - Property price
commission_percentage       - Commission rate
customer_commission         - Calculated customer commission
owner_commission            - Calculated owner commission
total_commission            - Total commission
owner_decision              - 'accepted' or 'rejected'
admin_action                - 'approved', 'rejected', 'suspended'
created_at                  - Request creation date
completed_date              - Transaction completion date
```

---

## Installation

1. **Create Database Tables**
   ```bash
   mysql -u root -p database < database/AGREEMENT_WORKFLOW_SCHEMA.sql
   ```

2. **Add Backend Routes**
   ```javascript
   // In server/app.js
   const agreementWorkflow = require('./routes/agreement-workflow');
   app.use('/api/agreement-workflow', agreementWorkflow);
   ```

3. **Test Endpoints**
   ```bash
   npm test
   ```

---

## Performance Tips

1. Use indexes on status and current_step for filtering
2. Batch notifications for multiple recipients
3. Cache agreement templates
4. Use views for common queries
5. Implement pagination for large datasets

---

## Security Checklist

- ✅ Role-based access control
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention
- ✅ Audit trail logging
- ✅ User authentication required
- ✅ Commission calculations verified
- ✅ Payment verification required

---

## Next Steps

1. Create React components for each step
2. Integrate with existing dashboard
3. Add email notifications
4. Implement PDF generation
5. Add payment gateway integration
6. Create admin reporting dashboard

---

**Version**: 1.0
**Last Updated**: March 26, 2026
**Status**: Ready for Frontend Implementation
