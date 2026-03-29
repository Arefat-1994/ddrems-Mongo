# Key Request & Document Access Workflow - Complete Verification

## System Overview

The DDREMS system has a complete workflow for:
1. **Key Requests** - Customers request access keys to properties
2. **Document Access** - Users request access to property documents
3. **Document Viewing** - Customers view documents with access keys

---

## 1. KEY REQUEST WORKFLOW

### Step 1: Customer Sends Request
**Endpoint:** `POST /api/key-requests`

**Request Flow:**
```
Customer → Sends Key Request → System
```

**Request Body:**
```json
{
  "property_id": 1,
  "customer_id": 5,
  "request_mess