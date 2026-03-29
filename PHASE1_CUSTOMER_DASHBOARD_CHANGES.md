# Phase 1: Customer Dashboard - Implementation Guide

## Changes to Implement:

### 1. Show Only ACTIVE Properties ✓
**Change:** Update `fetchCustomerData()` to use `/api/properties/active` endpoint
**Location:** Line ~25
**Before:** `axios.get('http://localhost:5000/api/properties')`
**After:** `axios.get('http://localhost:5000/api/properties/active')`

### 2. Remove "Add Property" Buttons ✓
**Change:** Remove any "Add Property" buttons/options
**Location:** Throughout component
**Action:** Search for "Add Property" and remove those UI elements

### 3. Fix Viewed Properties ✓
**Change:** Already using correct endpoint `/api/property-views/${user.id}`
**Status:** Already correct, just verify data displays properly

### 4. Fix Recently Viewed ✓
**Change:** Already using correct endpoint and displaying
**Status:** Already correct, just improve UI

### 5. Add Document Request System ✓
**Change:** Add "Request Documents" button in property view modal
**Location:** Property view modal
**New Function:** `requestDocumentAccess(propertyId)`
**API:** POST to `/api/document-access/request`

### 6. Add Enter Access Key Feature ✓
**Change:** Add access key input in DocumentViewer component
**Location:** Property view modal - documents section
**Already exists in:** `DocumentViewer.js` component

## Implementation Steps:

1. Update API endpoint for properties (active only)
2. Remove any "Add Property" UI elements
3. Add document request button
4. Verify viewed properties display
5. Test all functionality

## Files to Modify:
- `client/src/components/CustomerDashboardEnhanced.js` (main file)
- Verify `client/src/components/shared/DocumentViewer.js` has key entry

## Testing Checklist:
- [ ] Only active properties show in browse section
- [ ] No "Add Property" buttons visible
- [ ] Can request document access
- [ ] Viewed properties show correctly with images
- [ ] Recently viewed displays properly
- [ ] Can enter access key to view documents
