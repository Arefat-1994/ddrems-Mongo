# Key Request & Document Access Verification Guide

## System Overview
This document verifies the complete workflow for key requests and document access in the DDREMS system.

---

## 1. KEY REQUEST WORKFLOW

### 1.1 Customer Sends Key Request

**Endpoint:** `POST /api/key-requests`

**Request:**
```json
{
  "property_id": 1,
  "customer_id": 5,
  "request_message": "I would like to view this property"
}
```

**Response (Success - 201):**
```json
{
  "id": 42,
  "message": "Key request submitted successfully!"
}
```

**Database Changes:**
- New record inserted 