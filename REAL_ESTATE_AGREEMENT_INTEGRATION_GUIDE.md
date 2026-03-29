# Real Estate Agreement System - Integration Guide

## Overview
This guide explains how to integrate the Real Estate Agreement Management System into your existing dashboards.

## Step 1: Import the Component

Add the import statement to your dashboard component:

```javascript
import RealEstateAgreementWorkflow from './RealEstateAgreementWorkflow';
```

## Step 2: Add State Variable

Add a state variable to manage the modal visibility:

```javascript
const [showRealEstateAgreement, setShowRealEstateAgreement] = useState(false);
```

## Step 3: Add Navigation Button

Add a button to open the Real Estate Agreement workflow:

```javascript
<button 
  className="btn-primary"
  onClick={() => setShowRealEstateAgreement(true)}
>
  🏘️ Real Estate Agreements
</button>
```

## Step 4: Add Modal Rendering

Add the component rendering in your JSX:

```javascript
{showRealEstateAgreement && (
  <div className="modal-overlay" onClick={() => setShowRealEstateAgreement(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <RealEstateAgreementWorkflow 
        user={user} 
        onLogout={onLogout}
      />
      <button 
        className="close-btn"
        onClick={() => setShowRealEstateAgreement(false)}
      >
        ✕
      </button>
    </div>
  </div>
)}
```

## Integration Examples

### Customer Dashboard

```javascript
import React, { useState } from 'react';
import RealEstateAgreementWorkflow from './RealEstateAgreementWorkflow';

const CustomerDashboard = ({ user, onLogout }) => {
  const [showRealEstateAgreement, setShowRealEstateAgreement] = useState(false);

  return (
    <div className="customer-dashboard">
      <div className="dashboard-header">
        <h1>Customer Dashboard</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowRealEstateAgreement(true)}
        >
          🏘️ Real Estate Agreements
        </button>
      </div>

      {/* Other dashboard content */}

      {showRealEstateAgreement && (
        <div className="modal-overlay" onClick={() => setShowRealEstateAgreement(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <RealEstateAgreementWorkflow 
              user={user} 
              onLogout={onLogout}
            />
            <button 
              className="close-btn"
              onClick={() => setShowRealEstateAgreement(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
```

### Property Admin Dashboard

```javascript
import React, { useState } from 'react';
import RealEstateAgreementWorkflow from './RealEstateAgreementWorkflow';

const PropertyAdminDashboard = ({ user, onLogout }) => {
  const [showRealEstateAgreement, setShowRealEstateAgreement] = useState(false);

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Property Admin Dashboard</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowRealEstateAgreement(true)}
        >
          🏘️ Real Estate Agreements
        </button>
      </div>

      {/* Other dashboard content */}

      {showRealEstateAgreement && (
        <div className="modal-overlay" onClick={() => setShowRealEstateAgreement(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <RealEstateAgreementWorkflow 
              user={user} 
              onLogout={onLogout}
            />
            <button 
              className="close-btn"
              onClick={() => setShowRealEstateAgreement(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyAdminDashboard;
```

### Owner Dashboard

```javascript
import React, { useState } from 'react';
import RealEstateAgreementWorkflow from './RealEstateAgreementWorkflow';

const OwnerDashboard = ({ user, onLogout }) => {
  const [showRealEstateAgreement, setShowRealEstateAgreement] = useState(false);

  return (
    <div className="owner-dashboard">
      <div className="dashboard-header">
        <h1>Owner Dashboard</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowRealEstateAgreement(true)}
        >
          🏘️ Real Estate Agreements
        </button>
      </div>

      {/* Other dashboard content */}

      {showRealEstateAgreement && (
        <div className="modal-overlay" onClick={() => setShowRealEstateAgreement(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <RealEstateAgreementWorkflow 
              user={user} 
              onLogout={onLogout}
            />
            <button 
              className="close-btn"
              onClick={() => setShowRealEstateAgreement(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
```

## CSS Integration

Add the following CSS to your dashboard styles:

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

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  z-index: 1001;
}
```

## Sidebar Navigation Integration

Add to your Sidebar component:

```javascript
{user.role === 'user' && (
  <li>
    <a href="#" onClick={() => setCurrentView('real-estate-agreements')}>
      🏘️ Real Estate Agreements
    </a>
  </li>
)}

{(user.role === 'property_admin' || user.role === 'system_admin') && (
  <li>
    <a href="#" onClick={() => setCurrentView('real-estate-agreements')}>
      🏘️ Real Estate Agreements
    </a>
  </li>
)}

{user.role === 'owner' && (
  <li>
    <a href="#" onClick={() => setCurrentView('real-estate-agreements')}>
      🏘️ Real Estate Agreements
    </a>
  </li>
)}
```

## View-Based Integration

If using a view-based system:

```javascript
{currentView === 'real-estate-agreements' && (
  <RealEstateAgreementWorkflow user={user} onLogout={onLogout} />
)}
```

## Notification Integration

Add pending agreement count to notification widget:

```javascript
const [pendingAgreements, setPendingAgreements] = useState(0);

useEffect(() => {
  const fetchPendingAgreements = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/real-estate-agreement/admin/pending`
      );
      setPendingAgreements(response.data.length);
    } catch (error) {
      console.error('Error fetching pending agreements:', error);
    }
  };

  if (user.role === 'property_admin' || user.role === 'system_admin') {
    fetchPendingAgreements();
  }
}, [user]);

// Display in notification badge
<span className="notification-badge">{pendingAgreements}</span>
```

## Header Integration

Add to dashboard header:

```javascript
<div className="header-actions">
  <button 
    className="btn-primary"
    onClick={() => setShowRealEstateAgreement(true)}
  >
    🏘️ Real Estate Agreements
    {pendingAgreements > 0 && (
      <span className="badge">{pendingAgreements}</span>
    )}
  </button>
</div>
```

## Tab-Based Integration

If using tabs:

```javascript
const [activeTab, setActiveTab] = useState('overview');

return (
  <div className="dashboard">
    <div className="tabs">
      <button 
        className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
        onClick={() => setActiveTab('overview')}
      >
        Overview
      </button>
      <button 
        className={`tab ${activeTab === 'agreements' ? 'active' : ''}`}
        onClick={() => setActiveTab('agreements')}
      >
        🏘️ Real Estate Agreements
      </button>
    </div>

    <div className="tab-content">
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'agreements' && (
        <RealEstateAgreementWorkflow user={user} onLogout={onLogout} />
      )}
    </div>
  </div>
);
```

## API Integration

The component automatically handles API calls to:
- `GET /api/real-estate-agreement/customer/:customerId`
- `GET /api/real-estate-agreement/admin/pending`
- `GET /api/real-estate-agreement/owner/:ownerId`
- `POST /api/real-estate-agreement/request`
- `POST /api/real-estate-agreement/:agreementId/generate`
- `POST /api/real-estate-agreement/:agreementId/forward-to-owner`
- `POST /api/real-estate-agreement/:agreementId/owner-response`
- `POST /api/real-estate-agreement/:agreementId/submit-payment`
- `POST /api/real-estate-agreement/:agreementId/verify-payment`

## Error Handling

The component includes built-in error handling:

```javascript
try {
  // API call
} catch (error) {
  alert(`❌ Error: ${error.response?.data?.message || error.message}`);
}
```

## Loading States

The component shows loading indicators:
- ⏳ Loading agreements...
- ⏳ Processing...

## Success Notifications

The component shows success messages:
- ✅ Agreement request created successfully
- ✅ Agreement generated successfully
- ✅ Agreement forwarded to owner successfully
- ✅ Payment submitted successfully
- ✅ Payment verified successfully

## Responsive Design

The component is fully responsive and works on:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

## Browser Compatibility

Tested and compatible with:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Considerations

1. **Lazy Loading**: Load component only when needed
2. **Memoization**: Use React.memo for optimization
3. **Debouncing**: Debounce API calls
4. **Caching**: Cache agreement data

## Accessibility

The component includes:
- ✅ Semantic HTML
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Color contrast compliance
- ✅ Focus management

## Testing

Test the integration with:

```javascript
// Test customer flow
1. Login as customer
2. Click "🏘️ Real Estate Agreements"
3. Click "📝 Request Agreement"
4. Select property and submit

// Test admin flow
1. Login as property_admin
2. Click "🏘️ Real Estate Agreements"
3. View pending agreements
4. Generate and forward agreement

// Test owner flow
1. Login as owner
2. Click "🏘️ Real Estate Agreements"
3. View forwarded agreements
4. Accept or reject
```

## Troubleshooting

### Component not showing
- Verify import statement
- Check state variable initialization
- Verify button click handler

### API errors
- Check backend server is running
- Verify API endpoints are registered
- Check database connection

### Styling issues
- Import CSS file
- Check CSS class names
- Verify z-index values

## Support

For issues:
1. Check console for errors
2. Verify API responses
3. Check database records
4. Review component props

## Summary

The Real Estate Agreement System is now ready for integration into your dashboards. Follow the examples above to add it to your existing application.
