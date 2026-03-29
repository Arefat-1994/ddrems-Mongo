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
import Users from './Users';
import AddBroker from './AddBroker';
import AddUserModal from './AddUserModal';
import MessageNotificationWidget from './MessageNotificationWidget';
import AdminMessagesView from './AdminMessagesView';
import AgreementWorkflow from './AgreementWorkflow';
import AgreementManagement from './AgreementManagement';

ChartJS.register(ArcElement, Tooltip, Legend);

const API_BASE = `http://${window.location.hostname}:5000/api`;

const SystemAdminDashboard = ({ user, onLogout, setCurrentPage }) => {
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, profileApproval, users
  const [showAddBroker, setShowAddBroker] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAdminMessages, setShowAdminMessages] = useState(false);
  const [showAgreementWorkflow, setShowAgreementWorkflow] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingProfiles: 0,
    systemHealth: 100,
    apiCalls: 0,
    storageUsed: 0,
    errorRate: 0
  });

  const [propertyStats, setPropertyStats] = useState(null);
  const [systemLogs, setSystemLogs] = useState([]);
  const [userActivity, setUserActivity] = useState([]);
  const [systemConfig, setSystemConfig] = useState([]);

  const fetchSystemAdminData = useCallback(async () => {
    try {
      // Helper function to handle individual fetch failures
      const safeFetch = async (endpoint, defaultValue = {}) => {
        try {
          const res = await axios.get(`${API_BASE}${endpoint}`);
          return res.data;
        } catch (err) {
          console.error(`Error fetching ${endpoint}:`, err.message);
          return defaultValue;
        }
      };

      const [statsData, logsData, activityData, configData, propStatsData, pendingProfilesData] = await Promise.all([
        safeFetch('/dashboard/stats', { totalUsers: 0, activeListings: 0, pendingProfiles: 0, totalRevenue: 0 }),
        safeFetch('/system/logs', []),
        safeFetch('/system/user-activity', []),
        safeFetch('/system/config', []),
        safeFetch('/properties/stats', {}),
        safeFetch('/profiles/pending', { total: 0 })
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
        errorRate: 0.5
      });
    } catch (error) {
      console.error('Critical error in fetchSystemAdminData:', error);
    }
  }, []);

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

  if (currentView === 'agreements') {
    return (
      <div className="system-admin-dashboard">
        <AgreementManagement user={user} onLogout={onLogout} />
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
          <Users user={user} onLogout={onLogout} />
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
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <MessageNotificationWidget 
              userId={user?.id}
              onNavigateToMessages={() => setCurrentPage('messages')}
            />
            <button className="btn-secondary" onClick={() => setCurrentView('agreements')}>
              🤝 Agreements
            </button>
            <button className="btn-secondary" onClick={() => setCurrentPage('key-requests')}>
              🔐 Access Keys
            </button>
            <button className="btn-secondary" onClick={() => setShowAdminMessages(true)}>
              📧 Message History
            </button>
            <button className="btn-secondary" onClick={() => setCurrentView('users')}>
              👥 User Management
            </button>
            <button className="btn-secondary" onClick={() => setCurrentPage('reports')}>
              📊 Detailed Reports
            </button>
            <button className="btn-warning" onClick={() => setCurrentView('profileApproval')}>
              👥 Profile Approvals {stats.pendingProfiles > 0 && `(${stats.pendingProfiles})`}
            </button>
            <button className="btn-secondary" onClick={() => setCurrentPage('properties')}>
              <span>➕</span> Add New Property
            </button>
            <button className="btn-primary" onClick={() => setShowAddBroker(true)}>
              <span>🤝</span> Add New Broker
            </button>
            <button className="btn-primary" onClick={() => setShowAddUser(true)}>
              <span>👤</span> Add Property Admin
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
        <div className="stat-card clickable" onClick={() => setCurrentView('profileApproval')}>
          <div className="stat-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>⏳</div>
          <div className="stat-content">
            <h3>{stats.pendingProfiles}</h3>
            <p>Pending Profiles</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5', color: '#10b981' }}>🏠</div>
          <div className="stat-content">
            <h3>{propertyStats?.total || 0}</h3>
            <p>Total Properties</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0ea5e9' }}>🏷️</div>
          <div className="stat-content">
            <h3>{propertyStats?.active || 0}</h3>
            <p>Active Listings</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ede9fe', color: '#8b5cf6' }}>💰</div>
          <div className="stat-content">
            <h3>{(propertyStats?.totalRevenue / 1000000 || 0).toFixed(1)}M</h3>
            <p>Revenue (ETB)</p>
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

export default SystemAdminDashboard;
