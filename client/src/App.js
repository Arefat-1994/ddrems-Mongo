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


import Login from './components/Login';
import LandingPage from './components/LandingPage';
import MapPropertyViewer from './components/MapPropertyViewer';
import MpesaDashboard from './components/MpesaDashboard';
import ChapaDashboard from './components/ChapaDashboard';
import SiteCheckManager from './components/SiteCheckManager';
import SiteCheckAdmin from './components/SiteCheckAdmin';
import { NotificationProvider } from './components/NotificationContext';
import Footer from './components/shared/Footer';
import SystemSettings from './components/SystemSettings';
import PasswordResetRequests from './components/PasswordResetRequests';
import UserSettingsEnhanced from './components/UserSettingsEnhanced';
import RentalLedger from './components/RentalLedger';
import AgreementWorkflow from './components/AgreementWorkflow';
import BrokerEngagement from './components/BrokerEngagement';
import Favorites from './components/Favorites';
import MyBookings from './components/MyBookings';

import Complaints from './components/Complaints';
import ComplaintsAdmin from './components/ComplaintsAdmin';
import IdleTimeoutWrapper from './components/IdleTimeoutWrapper';
import ServiceBlockedOverlay from './components/ServiceBlockedOverlay';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageOptions, setPageOptions] = useState({});
  const [user, setUser] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [viewMapPropertyId, setViewMapPropertyId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      
      const urlParams = new URLSearchParams(window.location.search);
      const tx_ref = urlParams.get('tx_ref');
      if (tx_ref) {
        const agreementId = urlParams.get('agreementId');
        const sourceType = urlParams.get('sourceType') || 'agreement';
        setCurrentPage('chapa');
        setPageOptions({ tx_ref, agreementId, sourceType });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentPage('dashboard');
  };

  // Refresh user data from backend (used after profile submission to update gate flags)
  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user?.id) return;
      const res = await fetch(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/users/${user.id}`);
      if (res.ok) {
        const freshData = await res.json();
        const updatedUser = {
          ...user,
          profile_completed: freshData.profile_completed,
          profile_approved: freshData.profile_approved,
          profile_image: freshData.profile_image || user.profile_image
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (err) {
      console.error('Error refreshing user data:', err);
    }
  };

  const navigateToPage = (page, options = {}) => {
    setCurrentPage(page);
    setPageOptions(options);
  };

  // eslint-disable-next-line no-unused-vars
  const handleThemeChange = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  };

  const [showAuth, setShowAuth] = useState(null); // null | 'login' | 'register'

  if (!user) {
    if (showAuth === 'login') {
      return <Login onLogin={handleLogin} onBackToLanding={() => setShowAuth(null)} />;
    } else if (showAuth === 'register') {
      return <Login onLogin={handleLogin} initialShowRegister={true} onBackToLanding={() => setShowAuth(null)} />;
    }
    return <LandingPage onNavigateToLogin={() => setShowAuth('login')} onNavigateToRegister={() => setShowAuth('register')} />;
  }

  const renderProfilePage = () => {
    switch (user?.role) {
      case 'user':
        return <CustomerProfile user={user} onLogout={handleLogout} onComplete={refreshUser} />;
      case 'owner':
        return <OwnerProfile user={user} onLogout={handleLogout} onRefreshUser={refreshUser} />;
      case 'broker':
        return <BrokerProfile user={user} onLogout={handleLogout} onComplete={refreshUser} />;
      default:
        return <CustomerProfile user={user} onLogout={handleLogout} onRefreshUser={refreshUser} />;
    }
  };

  const renderDashboard = () => {
    const isAdmin = ['admin', 'system_admin', 'property_admin'].includes(user?.role);
    if (!isAdmin) {
      if (!user?.profile_completed) return renderProfilePage();
      if (!user?.profile_approved) return renderProfilePage();
    }

    switch (currentPage) {
      case 'dashboard':
        if (user.role === 'system_admin') {
          return <SystemAdminDashboard user={user} onLogout={handleLogout} setCurrentPage={navigateToPage} setViewMapPropertyId={setViewMapPropertyId} initialView={pageOptions.view || 'dashboard'} />;
        }
        if (user.role === 'property_admin') {
          return <PropertyAdminDashboard user={user} onLogout={handleLogout} setCurrentPage={navigateToPage} setViewMapPropertyId={setViewMapPropertyId} initialView={pageOptions.view || 'dashboard'} />;
        }
        if (user.role === 'broker') return <AgentDashboard user={user} onLogout={handleLogout} setCurrentPage={navigateToPage} setViewMapPropertyId={setViewMapPropertyId} onSettingsClick={() => navigateToPage('settings')} />;
        if (user.role === 'owner') return <OwnerDashboard user={user} onLogout={handleLogout} setCurrentPage={navigateToPage} setViewMapPropertyId={setViewMapPropertyId} onSettingsClick={() => navigateToPage('settings')} />;
        if (user.role === 'user') return <CustomerDashboard user={user} onLogout={handleLogout} setCurrentPage={navigateToPage} setViewMapPropertyId={setViewMapPropertyId} onSettingsClick={() => navigateToPage('settings')} />;
        return <Dashboard user={user} onLogout={handleLogout} setCurrentPage={navigateToPage} setViewMapPropertyId={setViewMapPropertyId} onSettingsClick={() => navigateToPage('settings')} />;
      case 'all-properties':
        if (user.role === 'system_admin') {
          return <SystemAdminDashboard user={user} onLogout={handleLogout} setCurrentPage={navigateToPage} setViewMapPropertyId={setViewMapPropertyId} initialView="all-properties" onSettingsClick={() => navigateToPage('settings')} />;
        }
        if (user.role === 'property_admin') {
          return <PropertyAdminDashboard user={user} onLogout={handleLogout} setCurrentPage={navigateToPage} setViewMapPropertyId={setViewMapPropertyId} initialView="all-properties" onSettingsClick={() => navigateToPage('settings')} />;
        }
        return <Properties user={user} onLogout={handleLogout} viewMode="all" setCurrentPage={navigateToPage} setViewMapPropertyId={setViewMapPropertyId} onSettingsClick={() => navigateToPage('settings')} />;
      case 'bank-settings':
        if (['admin', 'system_admin'].includes(user?.role)) {
          return <SystemAdminDashboard user={user} onLogout={handleLogout} setCurrentPage={navigateToPage} setViewMapPropertyId={setViewMapPropertyId} initialView="bank-accounts" onSettingsClick={() => navigateToPage('settings')} />;
        }
        return <Dashboard user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
      case 'properties':
        return <Properties user={user} onLogout={handleLogout} viewMode="my" setCurrentPage={navigateToPage} setViewMapPropertyId={setViewMapPropertyId} onSettingsClick={() => navigateToPage('settings')} />;
      case 'browse-properties':
        return <Properties user={user} onLogout={handleLogout} viewMode="all" setCurrentPage={navigateToPage} setViewMapPropertyId={setViewMapPropertyId} onSettingsClick={() => navigateToPage('settings')} />;
      case 'brokers':
        return <Brokers user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
      case 'users':
        return <Users user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
      case 'users-brokers':
        return <Users user={user} onLogout={handleLogout} initialRole="broker" onSettingsClick={() => navigateToPage('settings')} />;
      case 'users-customers':
        return <Users user={user} onLogout={handleLogout} initialRole="user" onSettingsClick={() => navigateToPage('settings')} />;
      case 'users-owners':
        return <Users user={user} onLogout={handleLogout} initialRole="owner" onSettingsClick={() => navigateToPage('settings')} />;
      case 'users-admins':
        return <Users user={user} onLogout={handleLogout} initialRole="property_admin" onSettingsClick={() => navigateToPage('settings')} />;
      case 'transactions':
        if (user.role === 'system_admin') return <SystemAdminDashboard user={user} onLogout={handleLogout} setCurrentPage={navigateToPage} setViewMapPropertyId={setViewMapPropertyId} initialView="transactions" onSettingsClick={() => navigateToPage('settings')} />;
        if (user.role === 'property_admin') return <PropertyAdminDashboard user={user} onLogout={handleLogout} setCurrentPage={navigateToPage} setViewMapPropertyId={setViewMapPropertyId} initialView="transactions" onSettingsClick={() => navigateToPage('settings')} />;
        return <Transactions user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
      case 'announcements':
        return <Announcements user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
      case 'messages':
        return <Messages user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
      case 'send-message':
        return <SendMessage user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
      case 'commission':
        return <CommissionTracking user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
      case 'agreements':
        return <Agreements user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
      case 'documents':
        if (user.role === 'property_admin') return <PropertyAdminDashboard user={user} onLogout={handleLogout} setCurrentPage={navigateToPage} setViewMapPropertyId={setViewMapPropertyId} initialView="documents" />;
        return <Dashboard user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
      case 'broker-holds':
        if (user.role === 'property_admin') return <PropertyAdminDashboard user={user} onLogout={handleLogout} setCurrentPage={navigateToPage} setViewMapPropertyId={setViewMapPropertyId} initialView="broker-holds" />;
        if (user.role === 'system_admin') return <SystemAdminDashboard user={user} onLogout={handleLogout} setCurrentPage={navigateToPage} setViewMapPropertyId={setViewMapPropertyId} initialView="broker-holds" />;
        return <Dashboard user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
      case 'agreement-requests':
        if (user.role === 'property_admin') return <PropertyAdminDashboard user={user} onLogout={handleLogout} setCurrentPage={navigateToPage} setViewMapPropertyId={setViewMapPropertyId} initialView="agreement-requests" />;
        return <Dashboard user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
      case 'requests':
        return <BrokerRequests user={user} onLogout={handleLogout} />;
      case 'broker-engagement':
        return <BrokerEngagement user={user} onLogout={handleLogout} initialPropertyId={pageOptions.propertyId} />;
      case 'rent-payments':
        return <RentalLedger user={user} />;
      case 'agreement-workflow':
      case 'direct-agreements':
        return <AgreementWorkflow user={user} onLogout={handleLogout} initialPropertyId={pageOptions.propertyId} />;
      case 'favorites':
        return <Favorites user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
      case 'bookings':
        return <MyBookings user={user} onLogout={handleLogout} setCurrentPage={navigateToPage} onSettingsClick={() => navigateToPage('settings')} />;
      case 'map-view':
        return <MapPropertyViewer user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} initialPropertyId={viewMapPropertyId} onClose={() => navigateToPage(pageOptions.returnTo || 'dashboard', { view: pageOptions.returnView })} />;
      case 'profile':
        return renderProfilePage();
      case 'system-settings':
        if (user.role === 'system_admin') return <SystemSettings user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
        return <Dashboard user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
      case 'password-resets':
        if (user.role === 'system_admin') return <PasswordResetRequests user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
        return <Dashboard user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
      case 'user-settings':
      case 'settings':
        return <UserSettingsEnhanced user={user} onLogout={handleLogout} onRefreshUser={refreshUser} />;
      case 'mpesa':
        return <MpesaDashboard user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
      case 'chapa':
        return <ChapaDashboard user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} tx_ref={pageOptions.tx_ref} agreementId={pageOptions.agreementId} sourceType={pageOptions.sourceType} setCurrentPage={navigateToPage} />;
      case 'site-check':
        return <SiteCheckManager user={user} setCurrentPage={navigateToPage} initialPropertyId={pageOptions.initialPropertyId} />;
      case 'site-check-admin':
        if (['admin', 'system_admin'].includes(user?.role)) return <SiteCheckAdmin user={user} />;
        return <Dashboard user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
      case 'complaints':
        return <Complaints user={user} />;
      case 'complaints-admin':
        if (['admin', 'system_admin'].includes(user?.role)) return <ComplaintsAdmin user={user} />;
        return <Dashboard user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
      default:
        return <Dashboard user={user} onLogout={handleLogout} onSettingsClick={() => navigateToPage('settings')} />;
    }
  };

  const showSidebar = currentPage !== 'reports' || ['admin', 'system_admin', 'property_admin'].includes(user?.role);

  return (
    <NotificationProvider userId={user?.id}>
      <IdleTimeoutWrapper user={user} onLogout={handleLogout} currentPage={currentPage}>
        <div className={`App ${!showSidebar ? 'no-sidebar' : ''}`}>
          {showSidebar && (
            <Sidebar
              currentPage={currentPage}
              setCurrentPage={navigateToPage}
              user={user}
              onLogout={handleLogout}
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={setIsSidebarCollapsed}
            />
          )}
          <div className={`main-content ${isSidebarCollapsed && showSidebar ? 'sidebar-collapsed' : ''}`}>
            <ServiceBlockedOverlay user={user} currentPage={currentPage} onLogout={handleLogout} />
            {currentPage === 'reports' ? (
              <Reports user={user} onLogout={handleLogout} onBack={() => navigateToPage('dashboard')} />
            ) : (
              renderDashboard()
            )}
            {currentPage === 'dashboard' && <Footer isMainDashboard={true} />}
          </div>
        </div>
      </IdleTimeoutWrapper>
    </NotificationProvider>
  );
}

export default App;
