import React, { useState } from "react";
import "./Sidebar.css";

const Sidebar = ({
  currentPage,
  setCurrentPage,
  user,
  onLogout,
  onSettingsClick,
  isCollapsed,
  setIsCollapsed,
}) => {
  const [expandedMenus, setExpandedMenus] = useState(["users"]);

  const toggleMenu = (menuId) => {
    setExpandedMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]
    );
  };

  // Role-based menu items
  const getMenuItems = () => {
    const baseItems = [{ id: "dashboard", icon: "📊", label: "Dashboard" }];

    if (user?.role === "admin" || user?.role === "system_admin") {
      return [
        ...baseItems,
        { id: "properties", icon: "🏠", label: "Properties" },
        { id: "map-view", icon: "🗺️", label: "Map View" },
        { id: "site-check-admin", icon: "📍", label: "Site Checks" },
        { id: "users", icon: "👤", label: "All Users",
          subItems: [
            { id: "users-brokers", icon: "🤝", label: "Brokers List" },
            { id: "users-customers", icon: "👥", label: "Customers List" },
            { id: "users-owners", icon: "🏠", label: "Owners List" },
            { id: "users-admins", icon: "🛡️", label: "Property Admins" },
          ],
        },
        { id: "transactions", icon: "💰", label: "Transactions" },
        { id: "announcements", icon: "📢", label: "Announcements" },
        { id: "send-message", icon: "📤", label: "Send Message" },
        { id: "broker-holds", icon: "⏱️", label: "Booked Lists" },
        { id: "reports", icon: "📊", label: "Reports" },
        { id: "complaints-admin", icon: "📋", label: "Complaints" },
        { id: "password-resets", icon: "🔑", label: "Password Resets" },
      ];
    }

    if (user?.role === "broker") {
      // If profile is not completed or not approved, show restricted menu
      if (!user?.profile_completed || !user?.profile_approved) {
        return [
          { id: "dashboard", icon: "📊", label: "Dashboard" },
          { id: "profile", icon: "👤", label: "My Profile" },
        ];
      }
      return [
        ...baseItems,
        { id: "properties", icon: "🏠", label: "My Properties" },
        { id: "browse-properties", icon: "🔍", label: "Browse Properties" },
        { id: "requests", icon: "📩", label: "Requests" },
        { id: "commission", icon: "💰", label: "Commission" },
        { id: "broker-engagement", icon: "💼", label: "Engagement Center" },
        { id: "announcements", icon: "📢", label: "Announcements" },
        { id: "messages", icon: "📧", label: "Messages" },
        { id: "complaints", icon: "📋", label: "Complaints" },
        { id: "profile", icon: "👤", label: "Profile" },
      ];
    }

    if (user?.role === "property_admin") {
      return [
        ...baseItems,
        { id: "properties", icon: "🏠", label: "Properties" },
        { id: "map-view", icon: "🗺️", label: "Map View" },
        { id: "site-check", icon: "📍", label: "Site Check" },
        { id: "agreement-workflow", icon: "🤝", label: "Agreements Workflow" },
        { id: "broker-engagement", icon: "🤝", label: "Broker Engagement" },
        { id: "broker-holds", icon: "⏱️", label: "Booked Lists" },
        { id: "rent-payments", icon: "🏠", label: "Rent Payments" },
        { id: "documents", icon: "📄", label: "Document Verification" },
        { id: "transactions", icon: "💳", label: "Transactions" },
        { id: "reports", icon: "📊", label: "Reports" },
        { id: "announcements", icon: "📢", label: "Announcements" },
        { id: "chapa", icon: "💳", label: "Chapa Dashboard" },
      ];
    }

    if (user?.role === "owner") {
      return [
        ...baseItems,
        { id: "properties", icon: "🏠", label: "My Properties" },
        { id: "agreement-workflow", icon: "🤝", label: "Agreements Workflow" },
        { id: "broker-engagement", icon: "🤝", label: "Broker Engagement" },
        { id: "rent-payments", icon: "🏠", label: "Rent Payments" },
        { id: "announcements", icon: "📢", label: "Announcements" },
        { id: "messages", icon: "📧", label: "Messages" },
        { id: "complaints", icon: "📋", label: "Complaints" },
        { id: "profile", icon: "👤", label: "Profile" },
      ];
    }

    // Restriction for unapproved users
    if (!['admin', 'system_admin', 'property_admin'].includes(user?.role)) {
      if (!user?.profile_approved) {
        return [
          { id: "dashboard", icon: "📊", label: "Overview" },
          { id: "profile", icon: "👤", label: "My Profile" },
        ];
      }
    }

    if (user?.role === "user") {
      return [
        ...baseItems,
        { id: "properties", icon: "🏠", label: "Browse Properties" },
        { id: "favorites", icon: "❤️", label: "My Favorites" },
        { id: "bookings", icon: "⏱️", label: "My Booked Lists" },
        { id: "broker-engagement", icon: "🤝", label: "Broker Engagement" },
        { id: "agreement-workflow", icon: "🤝", label: "Agreements Workflow" },
        { id: "announcements", icon: "📢", label: "Announcements" },
        { id: "rent-payments", icon: "🏠", label: "Rent Payments" },
        { id: "messages", icon: "📧", label: "Messages" },
        { id: "chapa", icon: "💳", label: "Chapa Payments" },
        { id: "complaints", icon: "📋", label: "Complaints" },
        { id: "profile", icon: "👤", label: "Profile" },
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>

      {/* ── BRAND HEADER ── */}
      <div className="sidebar-header">
        <h2>🏢 {!isCollapsed && "DDREMS"}</h2>
        {!isCollapsed && <p>Real Estate Management</p>}
      </div>

      {/* ── NAV ITEMS ── */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <React.Fragment key={item.id}>
            <button
              className={`nav-item ${
                currentPage === item.id ||
                (item.subItems && item.subItems.some((s) => s.id === currentPage))
                  ? "active"
                  : ""
              } ${item.subItems && expandedMenus.includes(item.id) ? "expanded" : ""}`}
              onClick={() => {
                if (item.subItems && !isCollapsed) {
                  toggleMenu(item.id);
                } else {
                  setCurrentPage(item.id);
                }
              }}
              title={isCollapsed ? item.label : ""}
            >
              <span className="nav-icon">{item.icon}</span>
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
              {!isCollapsed && item.subItems && (
                <span className="menu-toggle-icon">▶</span>
              )}
            </button>

            {!isCollapsed && item.subItems && (
              <div className={`sub-menu ${expandedMenus.includes(item.id) ? "expanded" : ""}`}>
                {item.subItems.map((sub) => (
                  <button
                    key={sub.id}
                    className={`nav-sub-item ${currentPage === sub.id ? "active" : ""}`}
                    onClick={() => setCurrentPage(sub.id)}
                  >
                    <span className="nav-icon" style={{ fontSize: "14px" }}>{sub.icon}</span>
                    <span className="nav-label">{sub.label}</span>
                  </button>
                ))}
              </div>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* ── FOOTER ── */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogout} title={isCollapsed ? "Logout" : ""}>
          <span>🚪</span> {!isCollapsed && "Logout"}
        </button>
      </div>

      {/* ── COLLAPSE TOGGLE ── */}
      <button
        className="toggle-sidebar-btn"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? "☰" : "✕"}
      </button>
    </div>
  );
};

export default Sidebar;
