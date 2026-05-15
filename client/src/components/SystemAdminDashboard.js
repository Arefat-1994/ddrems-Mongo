import React, { useState, useEffect, useCallback } from 'react';
import './SystemAdminDashboard.css';
import PageHeader from './PageHeader';
import axios from 'axios';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

import ProfileApproval from './profiles/ProfileApproval';
import EditRequestsAdmin from './profiles/EditRequestsAdmin';
import Users from './Users';
import Properties from './Properties';
import AddBroker from './AddBroker';
import AddUserModal from './AddUserModal';
import MessageNotificationWidget from './MessageNotificationWidget';
import AdminMessagesView from './AdminMessagesView';
import AgreementWorkflow from './AgreementWorkflow';
import AgreementManagement from './AgreementManagement';
import SystemAdminTransactions from './SystemAdminTransactions';
import SiteCheckAdmin from './SiteCheckAdmin';
import BrokerApplicationsAdmin from './BrokerApplicationsAdmin';
import BankAccountsAdmin from './BankAccountsAdmin';

ChartJS.register(ArcElement, Tooltip, Legend);

const API_BASE = `${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api`;

const SystemAdminDashboard = ({ user, onLogout, setCurrentPage, initialView, onSettingsClick }) => {
  const [currentView, setCurrentView] = useState(initialView || 'dashboard'); // dashboard, profileApproval, users
  const [showAddBroker, setShowAddBroker] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAdminMessages, setShowAdminMessages] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showAgreementWorkflow, setShowAgreementWorkflow] = useState(false);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingProfiles: 0,
    systemHealth: 100,
    apiCalls: 0,
    storageUsed: 0,
    errorRate: 0,
    totalBookings: 0,
    pendingEditRequests: 0
  });

  useEffect(() => {
    if (initialView) {
      setCurrentView(initialView);
    }
  }, [initialView]);

  const [propertyStats, setPropertyStats] = useState(null);
  const [systemLogs, setSystemLogs] = useState([]);
  const [userActivity, setUserActivity] = useState([]);
  const [systemConfig, setSystemConfig] = useState([]);

  const fetchSystemAdminData = useCallback(async () => {
    try {
      // Helper function to handle individual fetch failures
      const safeFetch = async (endpoint, defaultValue = {}) => {
        try {
          const res = await axios.get(`${API_BASE}${endpoint}`, {
            headers: { 'x-user-role': user?.role }
          });
          return res.data;
        } catch (err) {
          console.error(`Error fetching ${endpoint}:`, err.message);
          return defaultValue;
        }
      };

      const [statsData, logsData, activityData, configData, propStatsData, pendingProfilesData, brokerHoldsData] = await Promise.all([
        safeFetch('/dashboard/stats', { totalUsers: 0, activeListings: 0, pendingProfiles: 0, totalRevenue: 0 }),
        safeFetch('/system/logs', []),
        safeFetch('/system/user-activity', []),
        safeFetch('/system/config', []),
        safeFetch('/properties/stats', {}),
        safeFetch('/profiles/pending', { total: 0 }),
        safeFetch('/edit-requests/all', [])
      ]);

      setSystemLogs(logsData);
      setUserActivity(activityData);
      setSystemConfig(configData);
      setPropertyStats(propStatsData);

      setStats({
        totalUsers: statsData.totalUsers || 0,
        activeUsers: statsData.totalUsers || 0,
        pendingProfiles: pendingProfilesData.total || 0,
        systemHealth: 98,
        apiCalls: 12450,
        storageUsed: 65,
        errorRate: 0.5,
        pendingEditRequests: (brokerHoldsData || []).filter(r => r.status === 'pending').length
      });

      // Fetch suspicious count
      
    } catch (error) {
      console.error('Critical error in fetchSystemAdminData:', error);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchSystemAdminData();
  }, [fetchSystemAdminData]);

  const getPropertyTypeColor = (type) => {
    const typeLower = (type || '').toLowerCase();
    if (typeLower.includes('villa')) return '#5c92ff';
    if (typeLower.includes('apartment')) return '#3cc48e';
    if (typeLower.includes('land')) return '#f6ab3c';
    if (typeLower.includes('commercial')) return '#a881f2';
    return '#94a3b8';
  };

  const propertyChartData = {
    labels: (propertyStats?.typeDistribution || []).map(d => (d.type || 'Unknown').charAt(0).toUpperCase() + (d.type || '').slice(1)),
    datasets: [
      {
        data: (propertyStats?.typeDistribution || []).map(d => d.count),
        backgroundColor: (propertyStats?.typeDistribution || []).map(d => getPropertyTypeColor(d.type)),
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  if (currentView === 'profileApproval') {
    return (
      <div className="system-admin-dashboard">
        <PageHeader
          title="Profile Approvals"
          subtitle="Review and approve user profiles"
          user={user}
          onLogout={onLogout}
          onSettingsClick={onSettingsClick || (() => setCurrentPage('settings'))}
          actions={
            <button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>
              ← Back to Analytics
            </button>
          }
        />
        <div style={{ padding: '20px' }}>
          <ProfileApproval />
        </div>
      </div>
    );
  }

  if (currentView === 'editRequests') {
    return (
      <div className="system-admin-dashboard">
        <PageHeader
          title="Profile Edit Requests"
          subtitle="Review user requests to update locked profile information"
          user={user}
          onLogout={onLogout}
          onSettingsClick={onSettingsClick || (() => setCurrentPage('settings'))}
          actions={
            <button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>
              ← Back to Analytics
            </button>
          }
        />
        <div style={{ padding: '20px' }}>
          <EditRequestsAdmin />
        </div>
      </div>
    );
  }

  if (currentView === 'agreements') {
    return (
      <div className="system-admin-dashboard">
        <AgreementManagement user={user} onLogout={onLogout} onSettingsClick={() => setCurrentPage('settings')} />
      </div>
    );
  }

  if (currentView === 'users') {
    return (
      <div className="system-admin-dashboard">
        <div style={{ padding: '20px' }}>
          <button className="btn-secondary" style={{ marginBottom: '15px' }} onClick={() => setCurrentView('dashboard')}>
            ← Back to Dashboard
          </button>
          <Users user={user} onLogout={onLogout} onSettingsClick={() => setCurrentPage('settings')} />
        </div>
      </div>
    );
  }

  if (currentView === 'transactions') {
    return (
      <div className="system-admin-dashboard">
        <PageHeader
          title="System Transactions & Revenue"
          subtitle="Detailed overview of all financial activities"
          user={user}
          onLogout={onLogout}
          onSettingsClick={onSettingsClick || (() => setCurrentPage('settings'))}
          actions={
            <button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>
              ← Back to Analytics
            </button>
          }
        />
        <div style={{ padding: '20px', margin: '-20px' }}>
          <SystemAdminTransactions />
        </div>
      </div>
    );
  }

  if (currentView === 'site-checks') {
    return (
      <div className="system-admin-dashboard">
        <PageHeader
          title="Site Check Control Panel"
          subtitle="Review GPS-verified site checks and legal documents"
          user={user}
          onLogout={onLogout}
          onSettingsClick={onSettingsClick || (() => setCurrentPage('settings'))}
          actions={
            <button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>
              ← Back to Analytics
            </button>
          }
        />
        <div style={{ padding: '0', margin: '-10px' }}>
          <SiteCheckAdmin user={user} />
        </div>
      </div>
    );
  }

  if (currentView === 'broker-applications') {
    return (
      <div className="system-admin-dashboard">
        <PageHeader
          title="Broker Applications"
          subtitle="Review and approve new broker registration requests"
          user={user}
          onLogout={onLogout}
          onSettingsClick={onSettingsClick || (() => setCurrentPage('settings'))}
          actions={
            <button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>
              ← Back to Analytics
            </button>
          }
        />
        <div style={{ padding: '20px' }}>
          <BrokerApplicationsAdmin />
        </div>
      </div>
    );
  }

  if (currentView === 'bank-accounts') {
    return <BankAccountsAdmin user={user} onLogout={onLogout} setCurrentPage={setCurrentPage} setCurrentView={setCurrentView} />;
  }

  if (currentView === 'all-properties') {
    return (
      <div className="system-admin-dashboard">
        <PageHeader
          title="All Properties"
          subtitle="View and manage all registered properties in the system"
          user={user}
          onLogout={onLogout}
          onSettingsClick={onSettingsClick || (() => setCurrentPage('settings'))}
          actions={
            <button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>
              ← Back to Analytics
            </button>
          }
        />
        <div style={{ padding: '20px' }}>
          <Properties user={user} onLogout={onLogout} viewMode="all" setCurrentPage={setCurrentPage} onSettingsClick={() => setCurrentPage('settings')} />
        </div>
      </div>
    );
  }

  return (
    <div className="system-admin-dashboard">
      <PageHeader
        title="DREMS - System Analytics"
        subtitle="Comprehensive overview of real estate operations"
        user={user}
        onLogout={onLogout}
        onSettingsClick={onSettingsClick || (() => setCurrentPage('settings'))}
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <MessageNotificationWidget 
              userId={user?.id}
              onNavigateToMessages={() => setCurrentPage('messages')}
            />
            
            <div style={{ position: 'relative' }}>
              <button 
                className="btn-primary" 
                style={{ background: 'white', color: '#1e293b', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setShowToolsDropdown(!showToolsDropdown)}
              >
                🛠️ Tools {showToolsDropdown ? '▲' : '▼'}
              </button>
              
              {showToolsDropdown && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                  background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '220px',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden'
                }}>
                  <button className="dropdown-tool-btn" onClick={() => { setShowAdminMessages(true); setShowToolsDropdown(false); }}>
                    📧 Incoming Messages
                  </button>
                  <button className="dropdown-tool-btn" onClick={() => { setCurrentPage('complaints-admin'); setShowToolsDropdown(false); }}>
                    📋 Complaints
                  </button>
                  <button className="dropdown-tool-btn" onClick={() => { setCurrentView('transactions'); setShowToolsDropdown(false); }}>
                    💳 Transactions
                  </button>
                  <button className="dropdown-tool-btn" onClick={() => { setShowNotificationModal(true); setShowToolsDropdown(false); }}>
                    🔔 Send Notifications
                  </button>
                  <button className="dropdown-tool-btn" onClick={() => { setCurrentPage('reports'); setShowToolsDropdown(false); }}>
                    📊 Detailed Reports
                  </button>
                  <button className="dropdown-tool-btn" onClick={() => { setCurrentView('editRequests'); setShowToolsDropdown(false); }}>
                    ✏️ Edit Requests {stats.pendingEditRequests > 0 && `(${stats.pendingEditRequests})`}
                  </button>
                </div>
              )}
            </div>

            <button className="btn-secondary" style={{ background: 'white', color: '#1e293b' }} onClick={() => setCurrentView('all-properties')}>
              🏘️ Properties
            </button>
            <button className="btn-secondary" style={{ background: 'white', color: '#1e293b' }} onClick={() => setCurrentView('site-checks')}>
              📍 Site Checks
            </button>
            <button className="btn-secondary" style={{ background: 'white', color: '#1e293b' }} onClick={() => setCurrentView('bank-accounts')}>
              🏦 Bank Settings
            </button>
            <button className="btn-secondary" style={{ background: 'white', color: '#1e293b' }} onClick={() => setCurrentView('users')}>
              👥 Users
            </button>
            <button className="btn-warning" style={{ background: 'white', color: '#1e293b', border: '1px solid #f59e0b' }} onClick={() => setCurrentView('profileApproval')}>
              👥 Approvals {stats.pendingProfiles > 0 && `(${stats.pendingProfiles})`}
            </button>
          </div>
        }
      />


      <div className="stats-grid">
        <div className="stat-card clickable" onClick={() => setCurrentView('users')}>
          <div className="stat-icon" style={{ background: '#dbeafe', color: '#3b82f6' }}>👥</div>
          <div className="stat-content">
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
          </div>
        </div>
        <div className="stat-card clickable" onClick={() => setCurrentView('broker-applications')}>
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>📋</div>
          <div className="stat-content">
            <h3>New</h3>
            <p>Broker Apps</p>
          </div>
        </div>
        <div className="stat-card clickable" onClick={() => setCurrentView('profileApproval')}>
          <div className="stat-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>⏳</div>
          <div className="stat-content">
            <h3>{stats.pendingProfiles}</h3>
            <p>Pending Profiles</p>
          </div>
        </div>
        <div className="stat-card clickable" onClick={() => setCurrentPage('complaints-admin')}>
          <div className="stat-icon" style={{ background: '#fce7f3', color: '#ec4899' }}>📋</div>
          <div className="stat-content">
            <h3>View</h3>
            <p>Complaints</p>
          </div>
        </div>
        <div className="stat-card clickable" onClick={() => setCurrentView('editRequests')}>
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>✏️</div>
          <div className="stat-content">
            <h3>{stats.pendingEditRequests}</h3>
            <p>Edit Requests</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ede9fe', color: '#8b5cf6' }}>💰</div>
          <div className="stat-content">
            <h3>{propertyStats?.totalRevenue >= 1000000 
              ? `${(propertyStats.totalRevenue / 1000000).toFixed(2)}M` 
              : (propertyStats?.totalRevenue || 0).toLocaleString()}</h3>
            <p>System Fees Revenue (ETB)</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>📊 Properties by Type</h3>
            <button className="btn-text" onClick={() => setCurrentPage('reports')}>Full Report</button>
          </div>
          <div className="chart-container" style={{ height: '300px', position: 'relative', marginTop: '20px' }}>
            <Pie
              data={propertyChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      usePointStyle: true,
                      padding: 20,
                      font: { size: 12 }
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>📈 System Performance</h3>
            <select className="time-range-select">
              <option>Last Hour</option>
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
            </select>
          </div>
          <div className="performance-metrics">
            <div className="metric-item">
              <div className="metric-label">CPU Usage</div>
              <div className="metric-bar">
                <div className="metric-fill" style={{ width: '45%', background: '#10b981' }}></div>
              </div>
              <div className="metric-value">45%</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Memory Usage</div>
              <div className="metric-bar">
                <div className="metric-fill" style={{ width: '62%', background: '#f59e0b' }}></div>
              </div>
              <div className="metric-value">62%</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Database Load</div>
              <div className="metric-bar">
                <div className="metric-fill" style={{ width: '38%', background: '#3b82f6' }}></div>
              </div>
              <div className="metric-value">38%</div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Network Traffic</div>
              <div className="metric-bar">
                <div className="metric-fill" style={{ width: '71%', background: '#8b5cf6' }}></div>
              </div>
              <div className="metric-value">71%</div>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>👥 User Activity</h3>
            <button className="btn-text">View All</button>
          </div>
          <div className="activity-list">
            {userActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-avatar">{activity.user_name?.charAt(0)}</div>
                <div className="activity-info">
                  <h4>{activity.user_name}</h4>
                  <p>{activity.action}</p>
                  <span className="activity-time">{new Date(activity.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>📋 System Logs</h3>
            <div className="header-actions">
              <select className="log-filter">
                <option>All Logs</option>
                <option>Errors</option>
                <option>Warnings</option>
                <option>Info</option>
              </select>
              <button className="btn-text">Export</button>
            </div>
          </div>
          <div className="logs-list">
            {systemLogs.map((log, index) => (
              <div key={index} className={`log-item ${log.level}`}>
                <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className={`log-level ${log.level}`}>{log.level}</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>⚙️ System Configuration</h3>
            <button className="btn-text">Edit</button>
          </div>
          <div className="config-list">
            {systemConfig.map((config, index) => (
              <div key={index} className="config-item">
                <div className="config-key">{config.config_key}</div>
                <div className="config-value">{config.config_value}</div>
                <button className="btn-icon">✏️</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <h3>🔐 Security Overview</h3>
        </div>
        <div className="security-grid">
          <div className="security-item">
            <div className="security-icon success">✅</div>
            <div className="security-info">
              <h4>SSL Certificate</h4>
              <p>Valid until Dec 2026</p>
            </div>
          </div>
          <div className="security-item">
            <div className="security-icon success">✅</div>
            <div className="security-info">
              <h4>Firewall Status</h4>
              <p>Active and monitoring</p>
            </div>
          </div>
          <div className="security-item">
            <div className="security-icon warning">⚠️</div>
            <div className="security-info">
              <h4>Failed Login Attempts</h4>
              <p>3 attempts in last hour</p>
            </div>
          </div>
          <div className="security-item">
            <div className="security-icon success">✅</div>
            <div className="security-info">
              <h4>Backup Status</h4>
              <p>Last backup: 2 hours ago</p>
            </div>
          </div>
        </div>
      </div>

      {showAddBroker && (
        <AddBroker
          onClose={() => setShowAddBroker(false)}
          onSuccess={() => {
            setShowAddBroker(false);
            fetchSystemAdminData(); // Refresh if needed
          }}
        />
      )}
      {showAddUser && (
        <AddUserModal
          user={user}
          onClose={() => setShowAddUser(false)}
          onSuccess={() => {
            setShowAddUser(false);
            fetchSystemAdminData();
          }}
          initialRole="property_admin"
        />
      )}

      {showNotificationModal && (
        <div className="modal-overlay" onClick={() => setShowNotificationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>🔔 Send System Notification</h2>
              <button className="close-btn" onClick={() => setShowNotificationModal(false)}>✕</button>
            </div>
            <NotificationComposer 
              onClose={() => setShowNotificationModal(false)}
              adminId={user.id}
            />
          </div>
        </div>
      )}
      {showAdminMessages && (
        <div className="modal-overlay" onClick={() => setShowAdminMessages(false)}>
          <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
            <AdminMessagesView 
              user={user} 
              onClose={() => setShowAdminMessages(false)}
            />
          </div>
        </div>
      )}

      {/* Agreement Workflow Modal */}
      {showAgreementWorkflow && (
        <div className="modal-overlay" onClick={() => setShowAgreementWorkflow(false)}>
          <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🤝 Agreement Workflow</h2>
              <button className="close-btn" onClick={() => setShowAgreementWorkflow(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <AgreementWorkflow user={user} onLogout={onLogout} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NotificationComposer = ({ onClose, adminId }) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (val) => {
    setSearch(val);
    if (val.length < 2) {
      setUsers([]);
      return;
    }
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api/users/search?q=${val}`);
      setUsers(res.data || []);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser || !title || !message) {
      alert('Please fill all fields and select a user');
      return;
    }

    setLoading(true);
    try {
      // Send in-app notification
      await axios.post(`${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api/notifications`, {
        user_id: selectedUser.id,
        title,
        message,
        type: 'info'
      });

      // Send email if selected
      if (sendEmail && selectedUser.email) {
        await axios.post(`${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api/system/send-custom-email`, {
          to: selectedUser.email,
          subject: title,
          body: message,
          userName: selectedUser.name
        });
      }

      alert('✅ Notification sent successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to send notification:', error);
      alert('❌ Failed to send: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '20px' }}>
      <div className="form-group">
        <label>Search User (Name/Email/ID)</label>
        <input 
          type="text" 
          value={search} 
          onChange={(e) => handleSearch(e.target.value)} 
          placeholder="Start typing name or email..."
        />
        {users.length > 0 && !selectedUser && (
          <div style={{ border: '1px solid #ddd', borderRadius: '8px', marginTop: '5px', maxHeight: '150px', overflowY: 'auto' }}>
            {users.map(u => (
              <div 
                key={u.id} 
                onClick={() => { setSelectedUser(u); setSearch(u.name + ' (' + u.email + ')'); }}
                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
              >
                {u.name} - {u.email}
              </div>
            ))}
          </div>
        )}
        {selectedUser && (
          <div style={{ marginTop: '5px', color: '#3b82f6', fontSize: '14px', fontWeight: 'bold' }}>
            Selected: {selectedUser.name} ({selectedUser.email}) 
            <button type="button" onClick={() => setSelectedUser(null)} style={{ marginLeft: '10px', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>Change</button>
          </div>
        )}
      </div>

      <div className="form-group">
        <label>Notification Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., Important Account Update" />
      </div>

      <div className="form-group">
        <label>Message Content</label>
        <textarea 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          required 
          placeholder="Write your message here..."
          rows="4"
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input type="checkbox" id="sendEmail" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
        <label htmlFor="sendEmail">Also send as Email notification</label>
      </div>

      <div className="modal-actions" style={{ padding: 0 }}>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading || !selectedUser}>
          {loading ? 'Sending...' : '🚀 Send Notification'}
        </button>
      </div>
    </form>
  );
};

export default SystemAdminDashboard;
