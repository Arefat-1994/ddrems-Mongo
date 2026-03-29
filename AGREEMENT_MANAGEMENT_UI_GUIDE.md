# Agreement Management UI Guide

## Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    AGREEMENT MANAGEMENT                      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Filter Tabs                                          │   │
│  │ [📋 All] [⏳ Pending] [✅ Accepted] [🎉 Completed]  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Agreement Card 1                                     │   │
│  │ ┌────────────────────────────────────────────────┐  │   │
│  │ │ Agreement #1                    ⏳ Pending     │  │   │
│  │ ├────────────────────────────────────────────────┤  │   │
│  │ │ Property: Modern Apartment                     │  │   │
│  │ │ Customer: John Doe (ID: 5)                     │  │   │
│  │ │ Owner: Jane Smith (ID: 3)                      │  │   │
│  │ │ Location: Dire Dawa, Ethiopia                  │  │   │
│  │ │ Created: 3/29/2026                             │  │   │
│  │ ├────────────────────────────────────────────────┤  │   │
│  │ │ [💳 Payment] [📄 Receipt] [👁️ View Details]   │  │   │
│  │ └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Agreement Card 2                                     │   │
│  │ ┌────────────────────────────────────────────────┐  │   │
│  │ │ Agreement #2                    ✅ Accepted    │  │   │
│  │ ├────────────────────────────────────────────────┤  │   │
│  │ │ Property: Villa with Garden                    │  │   │
│  │ │ Customer: Ahmed Hassan (ID: 7)                 │  │   │
│  │ │ Owner: Fatima Ali (ID: 4)                      │  │   │
│  │ │ Location: Dire Dawa, Ethiopia                  │  │   │
│  │ │ Created: 3/28/2026                             │  │   │
│  │ ├────────────────────────────────────────────────┤  │   │
│  │ │ [🔔 Notify] [👁️ View Details]                 │  │   │
│  │ └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Details Modal - Customer View

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Agreement Details                                    [✕]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 📋 AGREEMENT INFORMATION                                     │
│ ├─ Agreement ID: 1                                           │
│ ├─ Status: Pending Admin Review                             │
│ ├─ Property: Modern Apartment                               │
│ ├─ Location: Dire Dawa, Ethiopia                            │
│ ├─ Created: 3/29/2026 10:30:45 AM                           │
│ └─ Message: I am interested in this property                │
│                                                               │
│ 👤 CUSTOMER INFORMATION                                      │
│ ├─ Full Name: John Doe                                       │
│ ├─ User ID: 5                                                │
│ ├─ Email: john.doe@email.com                                │
│ ├─ Phone: +251-911-234567                                   │
│ ├─ Address: Addis Ababa, Ethiopia                           │
│ ├─ ID Document: ET-ID-123456789                             │
│ ├─ Occupation: Software Engineer                            │
│ └─ Income: 50,000 ETB                                        │
│                                                               │
│ 🏠 OWNER INFORMATION                                         │
│ ├─ Full Name: Jane Smith                                     │
│ ├─ User ID: 3                                                │
│ ├─ Email: jane.smith@email.com                              │
│ ├─ Phone: +251-922-345678                                   │
│ ├─ Address: Dire Dawa, Ethiopia                             │
│ ├─ ID Document: ET-ID-987654321                             │
│ ├─ Bank Account: 1234567890                                 │
│ └─ Tax ID: TAX-2024-001                                      │
│                                                               │
│ 🏘️ PROPERTY INFORMATION                                      │
│ ├─ Title: Modern Apartment                                   │
│ ├─ Location: Dire Dawa, Ethiopia                            │
│ ├─ Type: Apartment                                           │
│ └─ Price: 500,000 ETB                                        │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ [Cancel]                                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Send Agreement Modal

```
┌─────────────────────────────────────────────────────────────┐
│ 📧 Send Agreement                                       [✕]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Send To:                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ▼ Select recipient                                      │ │
│ │ • Customer - John Doe                                   │ │
│ │ • Owner - Jane Smith                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ [Cancel]                                  [✅ Confirm]      │
└─────────────────────────────────────────────────────────────┘
```

---

## Status Badge Colors

```
┌──────────────────────────────────────────────────────────┐
│ Status Badges                                            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ⏳ Pending              (Orange Background)             │
│ ⏳ Pending Admin Review (Orange Background)             │
│ ✅ Accepted            (Green Background)               │
│ ❌ Rejected            (Red Background)                 │
│ 🎉 Completed           (Green Background)               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Action Buttons by Role

### Customer Role
```
When Status = Pending:
┌─────────────────────────────────────────┐
│ [💳 Submit Payment]                     │
│ [📄 Upload Receipt]                     │
│ [👁️ View Details]                      │
└─────────────────────────────────────────┘

When Status = Accepted/Completed:
┌─────────────────────────────────────────┐
│ [👁️ View Details]                      │
└─────────────────────────────────────────┘
```

### Admin Role (property_admin or system_admin)
```
When Status = Pending:
┌─────────────────────────────────────────┐
│ [📄 Generate Agreement]                 │
│ [📧 Send Agreement]                     │
│ [🔔 Send Notification]                  │
│ [👁️ View Details]                      │
└─────────────────────────────────────────┘

When Status = Accepted/Completed:
┌─────────────────────────────────────────┐
│ [🔔 Send Notification]                  │
│ [👁️ View Details]                      │
└─────────────────────────────────────────┘
```

---

## Data Display Hierarchy

### Outer View (Agreement Card)
```
┌─────────────────────────────────────────┐
│ Agreement #1              ⏳ Pending     │
├─────────────────────────────────────────┤
│ Property: Modern Apartment              │
│ Customer: John Doe (ID: 5)              │
│ Owner: Jane Smith (ID: 3)               │
│ Location: Dire Dawa, Ethiopia           │
│ Created: 3/29/2026                      │
└─────────────────────────────────────────┘
```

### Inner View (Details Modal)
```
Full Customer Profile:
├─ Full Name
├─ User ID
├─ Email
├─ Phone
├─ Address
├─ ID Document
├─ Occupation
└─ Income

Full Owner Profile:
├─ Full Name
├─ User ID
├─ Email
├─ Phone
├─ Address
├─ ID Document
├─ Bank Account
└─ Tax ID

Property Details:
├─ Title
├─ Location
├─ Type
└─ Price

Agreement Details:
├─ Agreement ID
├─ Status
├─ Created Date
└─ Message
```

---

## Filter Tab Counts

```
┌──────────────────────────────────────────────────────────┐
│ 📋 All (5)                                               │
│ ⏳ Pending (2)                                            │
│ ✅ Accepted (2)                                          │
│ 🎉 Completed (1)                                         │
└──────────────────────────────────────────────────────────┘
```

---

## Loading States

```
Initial Load:
┌──────────────────────────────────────────┐
│ ⏳ Loading agreements...                 │
└──────────────────────────────────────────┘

Empty State:
┌──────────────────────────────────────────┐
│ 📋                                       │
│ No agreements found                      │
│ No agreements match your current filter  │
└──────────────────────────────────────────┘

Action Processing:
┌──────────────────────────────────────────┐
│ [Cancel]                  [⏳ Processing]│
└──────────────────────────────────────────┘
```

---

## Database Integration Points

```
Agreement Card Display:
├─ agreement_requests table
│  ├─ id, status, created_at
│  ├─ customer_id, owner_id
│  └─ property_id
├─ properties table
│  ├─ title, location
│  └─ price
└─ users table (via JOIN)
   ├─ customer_name
   └─ owner_name

Details Modal Display:
├─ customer_profiles table
│  ├─ address, id_document
│  ├─ occupation, income
│  └─ user_id
├─ owner_profiles table
│  ├─ address, id_document
│  ├─ bank_account, tax_id
│  └─ user_id
└─ users table
   ├─ name, email, phone
   └─ id
```

---

## Responsive Design

```
Desktop (1200px+):
┌─────────────────────────────────────────────────────────┐
│ [Tab1] [Tab2] [Tab3] [Tab4]                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Card 1                                              │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Card 2                                              │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

Tablet (768px - 1199px):
┌──────────────────────────────────────────┐
│ [Tab1] [Tab2] [Tab3] [Tab4]              │
│ ┌──────────────────────────────────────┐ │
│ │ Card 1                               │ │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ Card 2                               │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘

Mobile (< 768px):
┌────────────────────┐
│ [Tab1] [Tab2]      │
│ [Tab3] [Tab4]      │
│ ┌────────────────┐ │
│ │ Card 1         │ │
│ └────────────────┘ │
│ ┌────────────────┐ │
│ │ Card 2         │ │
│ └────────────────┘ │
└────────────────────┘
```

---

## Summary

The Agreement Management UI provides:
- ✓ Clear dual-view information display
- ✓ Role-based action buttons
- ✓ Status filtering and badges
- ✓ Full profile information in details modal
- ✓ Send agreement functionality
- ✓ Responsive design
- ✓ Intuitive user experience
- ✓ Complete database integration
