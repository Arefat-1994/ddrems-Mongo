# Document Viewer Implementation - Agreement Management

**Status**: ✓ COMPLETE  
**Date**: March 29, 2026

---

## Overview

The Agreement Management system now includes a comprehensive document viewer that allows users to view, download, and manage property documents and agreement documents directly from the agreement details modal.

---

## Features Implemented

### 1. **Document Display in Details Modal**

#### Property Documents Section
- Shows all documents uploaded for the property
- Displays document type with icon
- Shows document name
- Includes "View" button with eye icon (👁️)
- Lists documents from `property_documents` table

#### Agreement Documents Section
- Shows all agreement versions
- Displays version number
- Shows document type (initial, customer_edited, final)
- Includes "View" button with eye icon (👁️)
- Lists documents from `agreement_documents` table

### 2. **Document Viewer Modal**

When user clicks the eye icon (👁️), a document viewer modal opens showing:

#### Document Information
- Document name
- Document type
- Upload/Generation date and time

#### Document Preview
- **For Images** (.jpg, .jpeg, .png, .gif):
  - Displays image preview
  - Shows full image with proper scaling
  - Includes download button

- **For PDFs/Documents** (.pdf, .doc, .docx):
  - Shows file information
  - Provides download link
  - Displays file path

- **For JSON Content** (Agreement documents):
  - Shows formatted JSON content
  - Displays in code preview format
  - Readable structure

- **For Other Files**:
  - Shows file information
  - Provides open/download link

### 3. **Document Icons**

Each document type has a unique icon:
- 📜 Title Deed
- 📐 Survey Plan
- ✅ Tax Clearance
- 🏗️ Building Permit
- 📄 Other/Default
- 📝 Initial Agreement
- ✏️ Customer Edited Agreement
- ✓ Final Agreement

---

## Database Integration

### Property Documents Table
```sql
property_documents
├─ id (PK)
├─ property_id (FK)
├─ document_type (ENUM)
├─ document_name
├─ document_path
├─ uploaded_by (FK to users)
└─ uploaded_at
```

### Agreement Documents Table
```sql
agreement_documents
├─ id (PK)
├─ agreement_request_id (FK)
├─ version
├─ document_type
├─ document_content (JSON)
├─ generated_by_id (FK to users)
└─ generated_date
```

---

## API Endpoints

### Property Documents
```
GET /api/documents/property/:propertyId
  - Fetch all documents for a property
  - Returns: Array of property documents

GET /api/documents/property-doc/:docId
  - Fetch single property document
  - Returns: Document details

POST /api/documents/property/:propertyId
  - Upload new property document
  - Body: { document_type, document_name, document_path, uploaded_by }

DELETE /api/documents/property-doc/:docId
  - Delete property document
```

### Agreement Documents
```
GET /api/documents/agreement/:agreementId
  - Fetch all documents for an agreement
  - Returns: Array of agreement documents

GET /api/documents/agreement-doc/:docId
  - Fetch single agreement document
  - Returns: Document details

POST /api/documents/agreement/:agreementId
  - Create new agreement document
  - Body: { version, document_type, document_content, generated_by_id }

PUT /api/documents/agreement-doc/:docId
  - Update agreement document
  - Body: { document_content, document_type }

DELETE /api/documents/agreement-doc/:docId
  - Delete agreement document
```

### Document Access
```
GET /api/documents/access-requests/:propertyId
  - Get document access requests

POST /api/documents/request-access
  - Request document access
  - Body: { property_id, user_id }

PUT /api/documents/access-request/:requestId/approve
  - Approve access request

PUT /api/documents/access-request/:requestId/reject
  - Reject access request
```

---

## Component Implementation

### State Variables
```javascript
const [propertyDocuments, setPropertyDocuments] = useState([]);
const [agreementDocuments, setAgreementDocuments] = useState([]);
const [selectedDocument, setSelectedDocument] = useState(null);
const [showDocumentViewer, setShowDocumentViewer] = useState(false);
```

### Key Functions
```javascript
fetchAgreementDetails(agreement)
  - Fetches customer profile
  - Fetches owner profile
  - Fetches property documents
  - Fetches agreement documents

handleViewDocument(document)
  - Opens document viewer modal
  - Sets selected document

getDocumentIcon(documentType)
  - Returns appropriate icon for document type
```

---

## UI Components

### Document List Item
```
[Icon] Document Name (Type) [👁️ View Button]
```

### Document Viewer Modal
```
┌─────────────────────────────────────────┐
│ 👁️ Document Viewer              [✕]    │
├─────────────────────────────────────────┤
│ Document Name: ...                      │
│ Type: ...                               │
│ Uploaded: ...                           │
│                                         │
│ [Document Preview Area]                 │
│ - Image: Shows image                    │
│ - PDF: Shows file info + download       │
│ - JSON: Shows formatted content         │
│                                         │
├─────────────────────────────────────────┤
│ [Close]                    [📥 Download]│
└─────────────────────────────────────────┘
```

---

## File Types Supported

### Images
- .jpg, .jpeg, .png, .gif
- Displays inline preview
- Shows full image with scaling

### Documents
- .pdf, .doc, .docx
- Shows file information
- Provides download link

### JSON Content
- Agreement documents stored as JSON
- Shows formatted, readable structure
- Syntax highlighted

### Other Files
- Any file type
- Shows file path
- Provides download/open link

---

## CSS Styling

### Document List
- Flexbox layout
- Icon + name + type + button
- Hover effects
- Responsive design

### Document Viewer Modal
- Max width: 800px
- Scrollable content area
- Image preview with max-height
- Code preview with monospace font
- Download button styling

### Responsive Design
- Mobile: Single column layout
- Tablet: Adjusted sizing
- Desktop: Full width preview

---

## Usage Flow

### For Customers
1. Open Agreement Management
2. Click "View Details" on an agreement
3. Scroll to "Property Documents" or "Agreement Documents"
4. Click eye icon (👁️) to view document
5. View preview or download file

### For Admins
1. Open Agreement Management
2. Click "View Details" on pending agreement
3. View all property documents
4. View all agreement versions
5. Download documents as needed

---

## Error Handling

- Missing documents: Shows empty state
- Failed fetch: Gracefully handles errors
- Invalid file types: Shows file information
- Missing content: Shows "No content available"

---

## Security Features

- Document access control via database
- User authentication required
- Role-based access (admins vs customers)
- File path validation
- Content type checking

---

## Performance Optimizations

- Lazy loading of documents
- Efficient database queries
- Parallel document fetching
- Image optimization
- Caching of document list

---

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Responsive design

---

## Future Enhancements

- [ ] Document upload UI
- [ ] Drag-and-drop upload
- [ ] Document versioning UI
- [ ] Document search
- [ ] Document annotations
- [ ] Digital signatures
- [ ] Document expiration
- [ ] Audit trail

---

## Testing Checklist

- ✓ Property documents display
- ✓ Agreement documents display
- ✓ Document icons show correctly
- ✓ View button opens modal
- ✓ Image preview works
- ✓ PDF info displays
- ✓ JSON content shows
- ✓ Download button works
- ✓ Close button works
- ✓ Responsive on mobile
- ✓ Error handling works
- ✓ No console errors

---

## Summary

The document viewer feature provides a complete solution for viewing and managing documents within the Agreement Management system. It supports multiple file types, provides a user-friendly interface, and integrates seamlessly with the existing database structure.

**Status**: Ready for Production ✓
