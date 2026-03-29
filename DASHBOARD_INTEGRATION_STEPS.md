# Dashboard Integration Steps - Real Estate Agreement System

## Overview
This guide provides step-by-step instructions to integrate the Real Estate Agreement Workflow component into all dashboards.

## Step 1: Add to CustomerDashboardEnhanced.js

### 1.1 Add Import
```javascript
import RealEstateAgreementWorkflow from './RealEstateAgreementWorkflow';
```

### 1.2 Add State Variable
```javascript
const [showRealEstateAgreement, setShowRealEstateAgreement] = useState(false);
```

### 1.3 Add Button to Header
```javascript
<button 
  className="btn-primary"
  onClick={() => setShowRealEstateAgreement(true)}
>
  🏘️ Real Estate Agreements
</button>
```

### 1.4 Add Modal Rendering
```javascript
{showRealEstateAgreement && (
  <div className="modal-overlay" onClick={() => setShowRealEstateAgreement(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>🏘️ Real Estate Agreements</h2>
        <button 
          className="close-btn"
          onClick={() => setShowRealEstateAgreement(false)}
        >
          ✕
        </button>
      </div>
      <div className="modal-body">
        <RealEstateAgreementWorkflow user={user} onLogout={onLogout} />
      </div>
    </div>
  </div>
)}
```

---

## Step 2: Add to OwnerDashboardEnhanced.js

### 2.1 Add Import
```javascript
import RealEstateAgreementWorkflow from './RealEstateAgreementWorkflow';
```

### 2.2 Add State Variable
```javascript
const [showRealEstateAgreement, setShowRealEstateAgreement] = useState(false);
```

### 2.3 Add Button to Header
```javascript
<button 
  className="btn-primary"
  onClick={() => setShowRealEstateAgreement(true)}
>
  🏘️ Real Estate Agreements
</button>
```

### 2.4 Add Modal Rendering
```javascript
{showRealEstateAgreement && (
  <div className="modal-overlay" onClick={() => setShowRealEstateAgreement(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>🏘️ Real Estate Agreements</h2>
        <button 
          className="close-btn"
          onClick={() => setShowRealEstateAgreement(false)}
        >
          ✕
        </button>
      </div>
      <div className="modal-body">
        <RealEstateAgreementWorkflow user={user} onLogout={onLogout} />
      </div>
    </div>
  </div>
)}
```

---

## Step 3: Add to PropertyAdminDashboard.js

### 3.1 Add Import
```javascript
import RealEstateAgreementWorkflow from './RealEstateAgreementWorkflow';
```

### 3.2 Add State Variable
```javascript
const [showRealEstateAgreement, setShowRealEstateAgreement] = useState(false);
```

### 3.3 Add Button to Header
```javascript
<button 
  className="btn-primary"
  onClick={() => setShowRealEstateAgreement(true)}
>
  🏘️ Real Estate Agreements
</button>
```

### 3.4 Add Modal Rendering
```javascript
{showRealEstateAgreement && (
  <div className="modal-overlay" onClick={() => setShowRealEstateAgreement(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>🏘️ Real Estate Agreements</h2>
        <button 
          className="close-btn"
          onClick={() => setShowRealEstateAgreement(false)}
        >
          ✕
        </button>
      </div>
      <div className="modal-body">
        <RealEstateAgreementWorkflow user={user} onLogout={onLogout} />
      </div>
    </div>
  </div>
)}
```

---

## Step 4: Add to SystemAdminDashboard.js

### 4.1 Add Import
```javascript
import RealEstateAgreementWorkflow from './RealEstateAgreementWorkflow';
```

### 4.2 Add State Variable
```javascript
const [showRealEstateAgreement, setShowRealEstateAgreement] = useState(false);
```

### 4.3 Add Button to Header
```javascript
<button 
  className="btn-primary"
  onClick={() => setShowRealEstateAgreement(true)}
>
  🏘️ Real Estate Agreements
</button>
```

### 4.4 Add Modal Rendering
```javascript
{showRealEstateAgreement && (
  <div className="modal-overlay" onClick={() => setShowRealEstateAgreement(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>🏘️ Real Estate Agreements</h2>
        <button 
          className="close-btn"
          onClick={() => setShowRealEstateAgreement(false)}
        >
          ✕
        </button>
      </div>
      <div className="modal-body">
        <RealEstateAgreementWorkflow user={user} onLogout={onLogout} />
      </div>
    </div>
  </div>
)}
```

---

## Step 5: Add to Sidebar Navigation

### 5.1 Add Navigation Items
```javascript
// For customers (user role)
{user.role === 'user' && (
  <li>
    <a href="#" onClick={() => setCurrentView('real-estate-agreements')}>
      🏘️ Real Estate Agreements
    </a>
  </li>
)}

// For property admins
{(user.role === 'property_admin' || user.role === 'system_admin') && (
  <li>
    <a href="#" onClick={() => setCurrentView('real-estate-agreements')}>
      🏘️ Real Estate Agreements
    </a>
  </li>
)}

// For owners
{user.role === 'owner' && (
  <li>
    <a href="#" onClick={() => setCurrentView('real-estate-agreements')}>
      🏘️ Real Estate Agreements
    </a>
  </li>
)}
```

### 5.2 Add View Rendering
```javascript
// In the main render/return section
{currentView === 'real-estate-agreements' && (
  <RealEstateAgreementWorkflow user={user} onLogout={onLogout} />
)}
```

---

## Step 6: CSS Integration

### 6.1 Add Modal Styles (if not already present)
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 1000px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
  position: relative;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  opacity: 0.8;
}

.modal-body {
  padding: 20px;
}
```

---

## Step 7: Verify Integration

### 7.1 Check Imports
- [ ] Component imported in all dashboards
- [ ] Component imported in Sidebar

### 7.2 Check State Variables
- [ ] State variable added to all dashboards
- [ ] State variable properly initialized

### 7.3 Check Buttons
- [ ] Button added to all dashboard headers
- [ ] Button click handler properly set

### 7.4 Check Modal Rendering
- [ ] Modal rendering code added to all dashboards
- [ ] Modal overlay click handler works
- [ ] Close button works

### 7.5 Check Sidebar
- [ ] Navigation items added for all roles
- [ ] View rendering code added
- [ ] Navigation click handlers work

### 7.6 Check Styling
- [ ] CSS styles imported or added
- [ ] Modal displays correctly
- [ ] Responsive design works

---

## Step 8: Testing

### 8.1 Test as Customer
1. Login as customer (user role)
2. Click "🏘️ Real Estate Agreements" button
3. Verify component loads
4. Click "📝 Request Agreement"
5. Select property and submit
6. Verify success message

### 8.2 Test as Owner
1. Login as owner
2. Click "🏘️ Real Estate Agreements" button
3. Verify component loads
4. Check for forwarded agreements
5. Test accept/reject functionality

### 8.3 Test as Admin
1. Login as property_admin
2. Click "🏘️ Real Estate Agreements" button
3. Verify component loads
4. Check for pending agreements
5. Test generate and forward functionality

### 8.4 Test Sidebar Navigation
1. Click "🏘️ Real Estate Agreements" in sidebar
2. Verify component loads in main view
3. Test all role-based views

---

## Step 9: Troubleshooting

### Issue: Component not showing
**Solution**: 
- Verify import statement is correct
- Check state variable is initialized
- Verify button click handler is set

### Issue: API errors
**Solution**:
- Check backend server is running
- Verify API endpoints are registered
- Check database connection

### Issue: Modal not closing
**Solution**:
- Verify close button click handler
- Check overlay click handler
- Verify state update is working

### Issue: Styling issues
**Solution**:
- Verify CSS file is imported
- Check z-index values
- Verify responsive design

---

## Deployment Checklist

- [ ] Component imported in all dashboards
- [ ] State variables added
- [ ] Buttons added to headers
- [ ] Modal rendering code added
- [ ] Sidebar navigation updated
- [ ] CSS styles added
- [ ] All tests passing
- [ ] No console errors
- [ ] Responsive design verified
- [ ] All roles tested

---

## Summary

The Real Estate Agreement Workflow component is now fully integrated into all dashboards and sidebar navigation. Users can access the component from:

1. **Dashboard Header Button**: "🏘️ Real Estate Agreements"
2. **Sidebar Navigation**: "🏘️ Real Estate Agreements"

All roles (customer, owner, property_admin, system_admin) have access to the appropriate features based on their role.

---

**Integration Date**: March 29, 2026
**Status**: READY FOR DEPLOYMENT
