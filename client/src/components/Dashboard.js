import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import PageHeader from './PageHeader';
import PropertyApproval from './PropertyApproval';
import ProfileApproval from './profiles/ProfileApproval';
import BrokersManagement from './BrokersManagement';
import MessageNotificationWidget from './MessageNotificationWidget';
import axios from 'axios';

const Dashboard = ({ user, onLogout, setCurrentPage, setViewMapPropertyId, onSettingsClick }) => {
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, approval, profileApproval, brokers
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeProperties: 0,
    totalBrokers: 0,
    totalUsers: 0,
    pendingTransactions: 0,
    todayRevenue: 0,
    pendingApprovals: 0,
    pendingProfiles: 0,
    suspiciousProperties: 0
  });
  const [activities, setActivities] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchUnreadMessages();
    
    // Set up interval to check for new messages every 30 seconds
    const messageInterval = setInterval(fetchUnreadMessages, 30000);
    
    return () => clearInterval(messageInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUnreadMessages = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/messages/unread/${user.id}`);
      setUnreadMessages(response.data.count || 0);
      
      // Also fetch recent notifications
      const notifResponse = await axios.get(`http://localhost:5000/api/messages/notifications/${user.id}`);
      setNotifications(notifResponse.data.notifications || []);
    } catch (error) {
      console.error('Error fetching unread messages:', error);
      setUnreadMessages(0);
      setNotifications([]);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch main stats
      try {
        const statsRes = await axios.get('http://localhost:5000/api/dashboard/stats');
        setStats(prev => ({ ...prev, ...statsRes.data }));
      } catch (err) { console.error('Stats error:', err); }

      // 2. Get pending approvals count
      try {
        const pendingRes = await axios.get('http://localhost:5000/api/properties/pending-verification');
        setStats(prev => ({ ...prev, pendingApprovals: pendingRes.data.length }));
      } catch (err) { console.error('Approvals error:', err); }

      // 3. Get pending profiles count
      try {
        const pendingProfilesRes = await axios.get('http://localhost:5000/api/profiles/pending');
        setStats(prev => ({ ...prev, pendingProfiles: pendingProfilesRes.data.total }));
      } catch (err) { console.error('Profiles error:', err); }

      // 4. Get activities
      try {
        const activitiesRes = await axios.get('http://localhost:5000/api/dashboard/activities');
        setActivities(activitiesRes.data);
      } catch (err) { console.error('Activities error:', err); }

      // 5. Get suspicious properties count
      try {
        const suspRes = await axios.get('http://localhost:5000/api/suspicious-activity/count');
        setStats(prev => ({ ...prev, suspiciousProperties: suspRes.data.count || 0 }));
      } catch (err) { console.log('Suspicious count unavailable:', err.message); }

    } catch (error) {
      console.error('Error in fetchDashboardData:', error);
    }
  };

  const statCards = [
    {
      title: 'Total Properties',
      value: stats.totalProperties,
      icon: '🏠',
      color: '#3b82f6',
      bgColor: '#dbeafe'
    },
    {
      title: 'Active Listings',
      value: stats.activeProperties,
      icon: '✅',
      color: '#10b981',
      bgColor: '#d1fae5'
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: '⏳',
      color: '#f59e0b',
      bgColor: '#fef3c7',
      onClick: () => setCurrentView('approval')
    },
    {
      title: 'Pending Profiles',
      value: stats.pendingProfiles,
      icon: '👥',
      color: '#ef4444',
      bgColor: '#fee2e2',
      onClick: () => setCurrentView('profileApproval')
    },
    {
      title: 'Active Brokers',
      value: stats.totalBrokers,
      icon: '🤝',
      color: '#8b5cf6',
      bgColor: '#ede9fe'
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: '👤',
      color: '#ec4899',
      bgColor: '#fce7f3'
    },
    {
      title: 'Today Revenue',
      value: `${(stats.todayRevenue / 1000000).toFixed(2)}M ETB`,
      icon: '💰',
      color: '#06b6d4',
      bgColor: '#cffafe'
    },
    {
      title: 'Suspicious',
      value: stats.suspiciousProperties,
      icon: '⚠️',
      color: '#ef4444',
      bgColor: '#fef2f2',
      highlight: stats.suspiciousProperties > 0
    }
  ];

  if (currentView === 'approval') {
    return (
      <div className="dashboard">
        <PropertyApproval
          user={user}
          onClose={() => setCurrentView('dashboard')}
          onRefresh={fetchDashboardData}
          setCurrentPage={setCurrentPage}
          setViewMapPropertyId={setViewMapPropertyId}
        />
      </div>
    );
  }

  if (currentView === 'profileApproval') {
    return (
      <div className="dashboard">
        <div style={{ padding: '20px' }}>
          <button
            className="btn-secondary"
            onClick={() => setCurrentView('dashboard')}
            style={{ marginBottom: '20px' }}
          >
            ← Back to Dashboard
          </button>
          <ProfileApproval />
        </div>
      </div>
    );
  }

  if (currentView === 'brokers') {
    return (
      <div className="dashboard">
        <BrokersManagement onBack={() => setCurrentView('dashboard')} />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Welcome back! Here's what's happening with your real estate business."
        user={user}
        onLogout={onLogout}
        onSettingsClick={onSettingsClick}
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Messages Notification Widget */}
            <MessageNotificationWidget 
              userId={user.id}
              onNavigateToMessages={() => setCurrentPage('messages')}
            />
            
            <button className="btn-secondary" onClick={() => setCurrentView('brokers')}>
              🤝 Manage Brokers
            </button>
            {stats.pendingProfiles > 0 && (
              <button className="btn-warning" onClick={() => setCurrentView('profileApproval')}>
                👥 Pending Profiles ({stats.pendingProfiles})
              </button>
            )}
            {stats.pendingApprovals > 0 && (
              <button className="btn-warning" onClick={() => setCurrentView('approval')}>
                ⏳ Pending Approvals ({stats.pendingApprovals})
              </button>
            )}
            <button className="btn-primary">
              <span>➕</span> Add Property
            </button>
          </div>
        }
      />

      <div className="stats-grid">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`stat-card ${card.onClick ? 'clickable' : ''}`}
            style={{ borderLeft: `4px solid ${card.color}`, border: card.highlight ? `2px solid ${card.color}` : undefined }}
            onClick={card.onClick}
          >
            <div className="stat-icon" style={{ background: card.bgColor, color: card.color }}>
              {card.icon}
            </div>
            <div className="stat-content">
              <h3>{card.value}</h3>
              <p>{card.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>📈 Recent Activities</h3>
            <button className="btn-text">View All</button>
          </div>
          <div className="activities-list">
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">
                    {activity.type === 'property' ? '🏠' : '💰'}
                  </div>
                  <div className="activity-content">
                    <p className="activity-title">{activity.name}</p>
                    <span className="activity-time">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`status-badge ${activity.status}`}>
                    {activity.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="no-data">No recent activities</p>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>📊 System Insights</h3>
          </div>
          <div className="insights-grid">
            <div className="insight-item">
              <h4>Property Verification Rate</h4>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '75%' }}></div>
              </div>
              <span>75% Verified</span>
            </div>
            <div className="insight-item">
              <h4>Broker Performance</h4>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '88%', background: '#10b981' }}></div>
              </div>
              <span>88% Active</span>
            </div>
            <div className="insight-item">
              <h4>Transaction Success Rate</h4>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '92%', background: '#f59e0b' }}></div>
              </div>
              <span>92% Completed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <h3>🔔 Latest Announcements</h3>
          <button className="btn-text">Manage</button>
        </div>
        <div className="announcements-list">
          <div className="announcement-item">
            <div className="announcement-content">
              <h4>System Maintenance Scheduled</h4>
              <p>Scheduled maintenance on March 1st from 2:00 AM to 4:00 AM</p>
            </div>
            <span className="announcement-date">Feb 25</span>
          </div>
          <div className="announcement-item">
            <div className="announcement-content">
              <h4>New Feature: 3D Property Tours</h4>
              <p>We've added support for 3D virtual property tours</p>
            </div>
            <span className="announcement-date">Feb 20</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
