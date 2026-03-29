import React, { useState } from 'react';
import './Sidebar.css';
import AIAdviceSidebar from './AIAdviceSidebar';

const Sidebar = ({ currentPage, setCurrentPage, user, onLogout, isCollapsed, setIsCollapsed }) => {
  const [showAIAdvice, setShowAIAdvice] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(['users']);

  const toggleMenu = (menuId, e) => {
    e.stopPropagation();
    setExpandedMenus(prev => 
      prev.includes(menuId) ? prev.filter(id => id !== menuId) : [...prev, menuId]
    );
  };

  // Role-based menu items
  const getMenuItems = () => {
    const baseItems = [
      { id: 'dashboard', icon: '📊', label: 'Dashboard' }
    ];

    // Admin and System Admin see all menu items
    if (user?.role === 'admin' || user?.role === 'system_admin') {
      return [
        ...baseItems,
        { id: 'properties', icon: '🏠', label: 'Properties' },
        { id: 'key-requests', icon: '🔐', label: 'Key Access' },
        { 
          id: 'users', 
          icon: '👤', 
          label: 'All Users',
          subItems: [
            { id: 'users-brokers', icon: '🤝', label: 'Brokers List' },
            { id: 'users-customers', icon: '👥', label: 'Customers List' },
            { id: 'users-owners', icon: '🏠', label: 'Owners List' },
            { id: 'users-admins', icon: '🛡️', label: 'Property Admins' }
          ]
        },
        { id: 'transactions', icon: '💰', label: 'Transactions' },
        { id: 'announcements', icon: '📢', label: 'Announcements' },
        { id: 'send-message', icon: '📤', label: 'Send Message' },
        { id: 'ai-predictor', icon: '🤖', label: 'AI Price Advisor' },
        { id: 'reports', icon: '📊', label: 'Reports' }
      ];
    }

    // Broker/Agent sees their properties and performance
    if (user?.role === 'broker') {
      return [
        ...baseItems,
        { id: 'properties', icon: '🏠', label: 'My Properties' },
        { id: 'browse-properties', icon: '🔍', label: 'Browse Properties' },
        { id: 'key-requests', icon: '🔐', label: 'Key Access' },
        { id: 'requests', icon: '📩', label: 'Requests' },
        { id: 'commission', icon: '💰', label: 'Commission' },
        { id: 'agreements', icon: '🤝', label: 'Agreements' },
        { id: 'announcements', icon: '📢', label: 'Announcements' },
        { id: 'messages', icon: '📧', label: 'Messages' },
        { id: 'ai-predictor', icon: '🤖', label: 'AI Price Advisor' },
        { id: 'profile', icon: '👤', label: 'Profile' }
      ];
    }

    // Property Admin sees properties and verification
    if (user?.role === 'property_admin') {
      return [
        ...baseItems,
        { id: 'properties', icon: '🏠', label: 'Properties' },
        { id: 'agreements', icon: '🤝', label: 'Agreements' },
        { id: 'key-requests', icon: '🔐', label: 'Access Key Requests' },
        { id: 'documents', icon: '📄', label: 'Document Verification' },
        { id: 'reports', icon: '📊', label: 'Reports' },
        { id: 'messages', icon: '📧', label: 'Messages' },
        { id: 'ai-predictor', icon: '🤖', label: 'AI Price Advisor' },
        { id: 'announcements', icon: '📢', label: 'Announcements' }
      ];
    }


    // Owner sees their properties and agreements
    if (user?.role === 'owner') {
      return [
        ...baseItems,
        { id: 'properties', icon: '🏠', label: 'My Properties' },
        { id: 'agreements', icon: '🤝', label: 'Agreements' },
        { id: 'announcements', icon: '📢', label: 'Announcements' },
        { id: 'messages', icon: '📧', label: 'Messages' },
        { id: 'ai-predictor', icon: '🤖', label: 'AI Price Advisor' },
        { id: 'profile', icon: '👤', label: 'Profile' }
      ];
    }

    // Customer/User sees properties and favorites
    if (user?.role === 'user') {
      return [
        ...baseItems,
        { id: 'properties', icon: '🏠', label: 'Browse Properties' },
        { id: 'key-requests', icon: '🔐', label: 'Key Access' },
        { id: 'announcements', icon: '📢', label: 'Announcements' },
        { id: 'agreements', icon: '🤝', label: 'Agreements' },
        { id: 'messages', icon: '📧', label: 'Messages' },
        { id: 'profile', icon: '👤', label: 'Profile' }
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2>🏢 {!isCollapsed && 'DDREMS'}</h2>
        {!isCollapsed && <p>Real Estate Management</p>}
      </div>

      <div className="user-info">
        <div className="user-avatar">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        {!isCollapsed && (
          <div className="user-details">
            <h4>{user?.name}</h4>
            <span className="user-role">{user?.role}</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <React.Fragment key={item.id}>
            <button
              className={`nav-item ${currentPage === item.id || (item.subItems && item.subItems.some(sub => sub.id === currentPage)) ? 'active' : ''} ${item.subItems && expandedMenus.includes(item.id) ? 'expanded' : ''}`}
              onClick={() => {
                if (item.subItems && !isCollapsed) {
                  toggleMenu(item.id, { stopPropagation: () => {} });
                } else {
                  setCurrentPage(item.id);
                }
              }}
              title={isCollapsed ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
              {!isCollapsed && item.subItems && (
                <span className="menu-toggle-icon">▶</span>
              )}
            </button>
            
            {!isCollapsed && item.subItems && (
              <div className={`sub-menu ${expandedMenus.includes(item.id) ? 'expanded' : ''}`}>
                {item.subItems.map(subItem => (
                  <button
                    key={subItem.id}
                    className={`nav-sub-item ${currentPage === subItem.id ? 'active' : ''}`}
                    onClick={() => setCurrentPage(subItem.id)}
                  >
                    <span className="nav-icon" style={{ fontSize: '14px' }}>{subItem.icon}</span>
                    <span className="nav-label">{subItem.label}</span>
                  </button>
                ))}
              </div>
            )}
          </React.Fragment>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button 
          className="ai-advice-btn" 
          onClick={() => setShowAIAdvice(!showAIAdvice)}
          title={isCollapsed ? 'AI Advice' : ''}
        >
          <span>⚡</span> {!isCollapsed && 'AI Advice'}
        </button>
        <button className="logout-btn" onClick={onLogout} title={isCollapsed ? 'Logout' : ''}>
          <span>🚪</span> {!isCollapsed && 'Logout'}
        </button>
      </div>

      {showAIAdvice && (
        <div className="ai-advice-modal-overlay" onClick={() => setShowAIAdvice(false)}>
          <div className="ai-advice-modal" onClick={(e) => e.stopPropagation()}>
            <AIAdviceSidebar user={user} onClose={() => setShowAIAdvice(false)} />
          </div>
        </div>
      )}

      <button
        className="toggle-sidebar-btn"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {isCollapsed ? '☰' : '✕'}
      </button>
    </div>
  );
};

export default Sidebar;
