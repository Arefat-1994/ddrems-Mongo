import React, { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Properties from './components/Properties';
import Brokers from './components/Brokers';
import Users from './components/Users';
import Transactions from './components/Transactions';
import Announcements from './components/Announcements';
import Reports from './components/Reports';
import Messages from './components/Messages';
import SendMessage from './components/SendMessage';
import AgentDashboard from './components/AgentDashboardEnhanced';
import OwnerDashboard from './components/OwnerDashboardEnhanced';
import CustomerDashboard from './components/CustomerDashboardEnhanced';
import PropertyAdminDashboard from './components/PropertyAdminDashboard';
import SystemAdminDashboard from './components/SystemAdminDashboard';
import Agreements from './components/Agreements';
import CommissionTracking from './components/CommissionTracking';
import CustomerProfile from './components/profiles/CustomerProfile';
import OwnerProfile from './components/profiles/OwnerProfile';
import BrokerProfile from './components/profiles/BrokerProfile';
import BrokerRequests from './components/BrokerRequests';
import KeyRequests from './components/KeyRequests';
import AIPricePredictor from './components/AIPricePredictor';
import Login from './components/Login';


function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    setCurrentPage('dashboard');
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const renderDashboard = () => {
    // Role-based dashboard rendering
    if (currentPage === 'dashboard') {
      switch (user.role) {
        case 'broker':
          return <AgentDashboard user={user} onLogout={handleLogout} setCurrentPage={setCurrentPage} />;
        case 'owner':
          return <OwnerDashboard user={user} onLogout={handleLogout} />;
        case 'user':
          return <CustomerDashboard user={user} onLogout={handleLogout} setCurrentPage={setCurrentPage} />;
        case 'property_admin':
          return <PropertyAdminDashboard user={user} onLogout={handleLogout} setCurrentPage={setCurrentPage} />;
        case 'system_admin':
          return <SystemAdminDashboard user={user} onLogout={handleLogout} setCurrentPage={setCurrentPage} />;
        case 'admin':
        default:
          return <Dashboard user={user} onLogout={handleLogout} />;
      }
    }

    // Other pages
    switch (currentPage) {
      case 'properties':
        return <Properties user={user} onLogout={handleLogout} />;
      case 'browse-properties':
        return <Properties user={user} onLogout={handleLogout} />;
      case 'brokers':
        return <Brokers user={user} onLogout={handleLogout} />;
      case 'users':
        return <Users user={user} onLogout={handleLogout} />;
      case 'users-brokers':
        return <Users user={user} onLogout={handleLogout} initialRole="broker" />;
      case 'users-customers':
        return <Users user={user} onLogout={handleLogout} initialRole="user" />;
      case 'users-owners':
        return <Users user={user} onLogout={handleLogout} initialRole="owner" />;
      case 'users-admins':
        return <Users user={user} onLogout={handleLogout} initialRole="property_admin" />;
      case 'transactions':
        return <Transactions user={user} onLogout={handleLogout} />;
      case 'announcements':
        return <Announcements user={user} onLogout={handleLogout} />;
      case 'messages':
        return <Messages user={user} onLogout={handleLogout} />;
      case 'send-message':
        return <SendMessage user={user} onLogout={handleLogout} />;
      case 'commission':
        return <CommissionTracking user={user} onLogout={handleLogout} />;
      case 'agreements':
        return <Agreements user={user} onLogout={handleLogout} />;
      case 'documents':
        if (user.role === 'property_admin') {
          return <PropertyAdminDashboard user={user} onLogout={handleLogout} setCurrentPage={setCurrentPage} initialView="documents" />;
        }
        return <Dashboard user={user} onLogout={handleLogout} />;
      case 'agreement-requests':
        if (user.role === 'property_admin') {
          return <PropertyAdminDashboard user={user} onLogout={handleLogout} setCurrentPage={setCurrentPage} initialView="agreement-requests" />;
        }
        return <Dashboard user={user} onLogout={handleLogout} />;
      case 'key-requests':
        return <KeyRequests user={user} />;
      case 'requests':
        return <BrokerRequests user={user} onLogout={handleLogout} />;
      case 'ai-predictor':
        return <AIPricePredictor user={user} onLogout={handleLogout} />;
      case 'profile':
        if (user.role === 'user') return <CustomerProfile user={user} onLogout={handleLogout} />;
        if (user.role === 'owner') return <OwnerProfile user={user} onLogout={handleLogout} />;
        if (user.role === 'broker') return <BrokerProfile user={user} onLogout={handleLogout} />;
        return <Dashboard user={user} onLogout={handleLogout} />;
      default:
        return <Dashboard user={user} onLogout={handleLogout} />;
    }

  };

  const showSidebar = currentPage !== 'reports' || ['admin', 'system_admin', 'property_admin'].includes(user?.role);

  return (
    <div className={`App ${!showSidebar ? 'no-sidebar' : ''}`}>
      {showSidebar && (
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          user={user}
          onLogout={handleLogout}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
      )}
      <div className={`main-content ${isSidebarCollapsed && showSidebar ? 'sidebar-collapsed' : ''}`}>
        {currentPage === 'reports' ? (
          <Reports user={user} onLogout={handleLogout} onBack={() => setCurrentPage('dashboard')} />
        ) : (
          renderDashboard()
        )}
      </div>
    </div>
  );
}


export default App;
