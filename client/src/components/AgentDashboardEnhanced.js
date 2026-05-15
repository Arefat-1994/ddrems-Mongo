import React, { useState, useEffect } from 'react';
import './AgentDashboard.css';
import PageHeader from './PageHeader';
import CommissionTracking from './CommissionTracking';
import ImageGallery from './shared/ImageGallery';
import DocumentManager from './shared/DocumentManager';
import axios from 'axios';
import MessageNotificationWidget from './MessageNotificationWidget';
import BrowseProperties from './BrowseProperties';



// ============================================================================
// In-Progress View — Shows real broker engagements from the API
// ============================================================================
const InProgressView = ({ user, onLogout, setCurrentPage, onBack }) => {
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEngagements = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`http://${window.location.hostname}:5000/api/broker-engagement/broker/${user.id}`);
        const all = res.data.engagements || [];
        // Filter to only in-progress (not completed/cancelled/declined)
        const inProgress = all.filter(e => !['completed', 'cancelled', 'declined', 'rejected', 'broker_declined'].includes(e.status));
        setEngagements(inProgress);
      } catch (err) {
        console.error('Error fetching engagements:', err);
        setEngagements([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEngagements();
  }, [user.id]);

  const statusMap = {
    'created': { emoji: '📝', label: 'Created', color: '#64748b' },
    'pending_broker_acceptance': { emoji: '⏳', label: 'Pending Acceptance', color: '#f59e0b' },
    'broker_accepted': { emoji: '✅', label: 'Accepted', color: '#10b981' },
    'draft_offer_sent': { emoji: '📋', label: 'Draft Sent', color: '#f59e0b' },
    'broker_negotiating': { emoji: '🤝', label: 'Negotiating', color: '#3b82f6' },
    'pending_buyer_approval': { emoji: '⏳', label: 'Pending Buyer Approval', color: '#f59e0b' },
    'buyer_approved_draft': { emoji: '👍', label: 'Buyer Approved', color: '#10b981' },
    'buyer_rejected_draft': { emoji: '👎', label: 'Buyer Rejected', color: '#ef4444' },
    'price_presented': { emoji: '💰', label: 'Price Presented', color: '#8b5cf6' },
    'owner_accepted': { emoji: '🤝', label: 'Owner Accepted', color: '#10b981' },
    'owner_counter_offered': { emoji: '🔄', label: 'Counter-Offered', color: '#f97316' },
    'broker_reviewing_counter': { emoji: '🔍', label: 'Reviewing Counter', color: '#8b5cf6' },
    'owner_rejected': { emoji: '❌', label: 'Owner Rejected', color: '#ef4444' },
    'awaiting_buyer_authorization': { emoji: '🔔', label: 'Awaiting Authorization', color: '#dc2626' },
    'broker_finalizing': { emoji: '✅', label: 'Finalizing', color: '#22c55e' },
    'agreement_generated': { emoji: '📄', label: 'Agreement Ready', color: '#3b82f6' },
    'pending_signatures': { emoji: '✍️', label: 'Pending Signatures', color: '#6366f1' },
    'fully_signed': { emoji: '🔒', label: 'Fully Signed', color: '#6366f1' },
    'payment_submitted': { emoji: '💳', label: 'Payment Submitted', color: '#f97316' },
    'payment_verified': { emoji: '✅', label: 'Payment Verified', color: '#14b8a6' },
    'handover_confirmed': { emoji: '🔑', label: 'Handover Confirmed', color: '#22c55e' },
  };

  const progressSteps = ['created', 'pending_broker_acceptance', 'broker_accepted', 'broker_negotiating', 'pending_buyer_approval', 'owner_counter_offered', 'awaiting_buyer_authorization', 'broker_finalizing', 'agreement_generated', 'pending_signatures', 'fully_signed', 'payment_submitted', 'payment_verified', 'handover_confirmed', 'completed'];

  if (loading) {
    return (
      <div className="agent-dashboard" style={{ textAlign: 'center', padding: '60px' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <p style={{ color: '#64748b', fontSize: '18px' }}>Loading in-progress engagements...</p>
      </div>
    );
  }

  return (
    <div className="agent-dashboard">
      <PageHeader
        title="In-Progress Engagements"
        subtitle={`${engagements.length} active deal${engagements.length !== 1 ? 's' : ''} in your pipeline`}
        user={user}
        onLogout={onLogout}
        onSettingsClick={() => setCurrentPage && setCurrentPage('settings')}
        actions={
          <button className="btn-secondary" onClick={onBack}>
            ← Back to Dashboard
          </button>
        }
      />

      {engagements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: '16px', margin: '30px 20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
          <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>No In-Progress Deals</h2>
          <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
            You have no active engagements at the moment. Browse properties and start engaging with buyers to see your deals here.
          </p>
        </div>
      ) : (
        <div style={{ padding: '20px', display: 'grid', gap: '20px' }}>
          {engagements.map(eng => {
            const badge = statusMap[eng.status] || { emoji: '❓', label: eng.status?.replace(/_/g, ' '), color: '#6b7280' };
            const isRental = eng.engagement_type === 'rent';
            const price = Number(eng.agreed_price || eng.current_offer || eng.starting_offer || 0);
            const brokerComm = eng.broker_commission_amount ? Number(eng.broker_commission_amount) : Math.round(price * 0.02 * 100) / 100;
            const stepIndex = progressSteps.indexOf(eng.status);
            const progress = stepIndex >= 0 ? Math.round(((stepIndex + 1) / progressSteps.length) * 100) : 10;

            return (
              <div key={eng.id} style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                transition: 'all 0.3s ease'
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '17px', color: '#1e293b' }}>
                      Engagement #{eng.id}
                    </h3>
                    <span style={{
                      background: badge.color + '15',
                      color: badge.color,
                      padding: '4px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      border: `1px solid ${badge.color}30`
                    }}>
                      {badge.emoji} {badge.label}
                    </span>
                    <span style={{
                      background: isRental ? '#dbeafe' : '#fef3c7',
                      color: isRental ? '#1d4ed8' : '#92400e',
                      padding: '3px 10px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {isRental ? '🔑 Rental' : '🏷️ Sale'}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>
                    <span>Progress Tracker</span>
                    <span>{progress}%</span>
                    <span style={{ fontWeight: '700', color: badge.color }}>Current: {badge.label}</span>
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${badge.color}, ${badge.color}cc)`, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                {/* Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '15px' }}>
                  <div style={{ fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>🏠 Property: </span>
                    <span style={{ fontWeight: '600' }}>{eng.property_title || 'N/A'}</span>
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>👤 Buyer/Tenant: </span>
                    <span style={{ fontWeight: '600' }}>{eng.buyer_name || 'N/A'}</span>
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>🏢 Owner/Landlord: </span>
                    <span style={{ fontWeight: '600' }}>{eng.owner_name || 'N/A'}</span>
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>💰 {isRental ? 'Rent' : 'Price'}: </span>
                    <span style={{ fontWeight: '700', color: '#059669' }}>
                      {price.toLocaleString()} ETB{isRental ? '/mo' : ''}
                    </span>
                  </div>
                </div>

                {/* Projected Commission */}
                <div style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{ fontSize: '13px' }}>
                    <span style={{ fontWeight: '600', color: '#92400e' }}>📊 Projected Commission:</span>
                    <span style={{ fontWeight: '700', marginLeft: '8px', color: '#d97706', fontSize: '15px' }}>
                      {brokerComm.toLocaleString()} ETB
                    </span>
                    <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '6px' }}>({eng.broker_commission_pct || 2}%)</span>
                  </div>
                </div>

                {/* Timeline */}
                <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', gap: '16px', fontSize: '12px', color: '#94a3b8', flexWrap: 'wrap' }}>
                  <span>📅 Started: {new Date(eng.created_at).toLocaleDateString()}</span>
                  {eng.updated_at && <span>🔄 Updated: {new Date(eng.updated_at).toLocaleDateString()}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AgentDashboardEnhanced = ({ user, onLogout, setCurrentPage, onSettingsClick }) => {
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, commission, inProgress
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRents: 0,
    activeListings: 0,
    totalCommission: 0,
    monthlyRevenue: 0,
    pendingDeals: 0,
    propertiesToBonus: 0
  });
  const [agreements, setAgreements] = useState([]);
  const [messages, setMessages] = useState([]);
  const [announcements, setAnnouncements] = useState([]);


  useEffect(() => {
    fetchAgentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAgentData = async () => {
    try {
      // 1. Fetch Stats from Commissions API for accurate data
      let summaryData = { total_deals: 0, deal_commission: 0, total_earned: 0 };
      try {
        const summaryRes = await axios.get(`http://${window.location.hostname}:5000/api/commissions/broker/${user.id}/summary`);
        summaryData = summaryRes.data || summaryData;
      } catch (err) {
        console.error('Error fetching commission summary:', err);
      }

      // 2. Fetch Engagements for granular status tracking
      let allEng = [];
      try {
        const engRes = await axios.get(`http://${window.location.hostname}:5000/api/broker-engagement/broker/${user.id}`);
        allEng = engRes.data.engagements || [];
      } catch (err) {
        console.error('Error fetching engagements:', err);
      }

      const sales = allEng.filter(e => e.engagement_type === 'sale' && e.status === 'completed').length;
      const rents = allEng.filter(e => e.engagement_type === 'rent' && e.status === 'completed').length;
      const pending = allEng.filter(e => !['completed', 'cancelled', 'declined', 'rejected', 'broker_declined'].includes(e.status)).length;

      // 3. Fetch System-wide Active properties for "Market Opportunity"
      let activeCount = 0;
      try {
        const activeRes = await axios.get(`http://${window.location.hostname}:5000/api/properties/active`);
        activeCount = (activeRes.data || []).length;
      } catch (err) {}

      setStats({
        totalSales: sales || summaryData.total_deals || 0,
        totalRents: rents || 0,
        activeListings: activeCount,
        totalCommission: summaryData.total_earned || 0,
        monthlyRevenue: summaryData.deal_commission || 0,
        pendingDeals: pending,
        propertiesToBonus: summaryData.properties_to_bonus || 0
      });

      // 4. Fetch Messages & Announcements
      try {
        const messagesRes = await axios.get(`http://${window.location.hostname}:5000/api/messages/user/${user.id}`);
        setMessages(messagesRes.data.slice(0, 5));
      } catch (error) { setMessages([]); }

      try {
        const announcementsRes = await axios.get(`http://${window.location.hostname}:5000/api/announcements`);
        setAnnouncements(announcementsRes.data.slice(0, 3));
      } catch (error) { setAnnouncements([]); }

      // 5. Fetch Agreements
      try {
        const agreementsRes = await axios.get(`http://${window.location.hostname}:5000/api/agreements/broker/${user.id}`);
        setAgreements(agreementsRes.data || []);
      } catch (error) { setAgreements([]); }

    } catch (error) {
      console.error('Error fetching agent data:', error);
    }
  };



  if (currentView === 'commission') {
    return (
      <CommissionTracking
        user={user}
        onLogout={onLogout}
        onBack={() => setCurrentView('dashboard')}
      />
    );
  }

  if (currentView === 'inProgress') {
    return (
      <InProgressView user={user} onLogout={onLogout} setCurrentPage={setCurrentPage} onBack={() => setCurrentView('dashboard')} />
    );
  }



  if (currentView === 'agreements') {
    const downloadAgreement = (agreement) => {
      // Create a simple agreement document
      const agreementText = `
PROPERTY AGREEMENT
==================

Agreement ID: ${agreement.id}
Property: ${agreement.property_title || `Property #${agreement.property_id}`}
Type: ${agreement.agreement_type}
Amount: ${(agreement.amount / 1000000).toFixed(2)}M ETB
Status: ${agreement.status}

Start Date: ${agreement.start_date ? new Date(agreement.start_date).toLocaleDateString() : 'N/A'}
End Date: ${agreement.end_date ? new Date(agreement.end_date).toLocaleDateString() : 'N/A'}
Created: ${new Date(agreement.created_at).toLocaleDateString()}

Terms: ${agreement.terms || 'Standard terms apply'}

---
Generated by DDREMS
      `.trim();

      const blob = new Blob([agreementText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Agreement_${agreement.id}_${agreement.property_title?.replace(/\s+/g, '_') || 'Property'}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="agent-dashboard">
        <PageHeader
          title="My Agreements"
          subtitle="View and manage your property agreements"
          user={user}
          onLogout={onLogout}
          onSettingsClick={onSettingsClick || (() => setCurrentPage('settings'))}
          actions={
            <button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>
              ← Back to Dashboard
            </button>
          }
        />
        <div className="dashboard-card full-width">
          <div className="card-header">
            <h3>📄 Agreements</h3>
            <span>{agreements.length} total agreements</span>
          </div>
          
          {agreements.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📄</div>
              <h3>No Agreements Yet</h3>
              <p style={{ color: '#64748b' }}>Your property agreements will appear here</p>
            </div>
          ) : (
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gap: '20px' }}>
                {agreements.map(agreement => (
                  <div key={agreement.id} style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>
                          {agreement.property_title || `Property #${agreement.property_id}`}
                        </h3>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className={`listing-badge ${agreement.agreement_type}`} style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: agreement.agreement_type === 'sale' ? '#dbeafe' : '#fef3c7',
                            color: agreement.agreement_type === 'sale' ? '#1e40af' : '#92400e'
                          }}>
                            {agreement.agreement_type}
                          </span>
                          <span className={`status-badge ${agreement.status}`} style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: agreement.status === 'active' ? '#d1fae5' : 
                                       agreement.status === 'pending' ? '#fef3c7' : '#fee2e2',
                            color: agreement.status === 'active' ? '#065f46' : 
                                   agreement.status === 'pending' ? '#92400e' : '#991b1b'
                          }}>
                            {agreement.status}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                          {(agreement.amount / 1000000).toFixed(2)}M ETB
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          Agreement #{agreement.id}
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '15px',
                      padding: '15px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      marginBottom: '15px'
                    }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Start Date</div>
                        <div style={{ fontWeight: '600' }}>
                          {agreement.start_date ? new Date(agreement.start_date).toLocaleDateString() : 'Not set'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>End Date</div>
                        <div style={{ fontWeight: '600' }}>
                          {agreement.end_date ? new Date(agreement.end_date).toLocaleDateString() : 'Not set'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Created</div>
                        <div style={{ fontWeight: '600' }}>
                          {new Date(agreement.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Duration</div>
                        <div style={{ fontWeight: '600' }}>
                          {agreement.start_date && agreement.end_date ? 
                            Math.ceil((new Date(agreement.end_date) - new Date(agreement.start_date)) / (1000 * 60 * 60 * 24)) + ' days' : 
                            'N/A'}
                        </div>
                      </div>
                    </div>

                    {agreement.terms && (
                      <div style={{ 
                        padding: '12px', 
                        background: '#fffbeb', 
                        borderLeft: '3px solid #f59e0b',
                        borderRadius: '4px',
                        marginBottom: '15px',
                        fontSize: '14px',
                        color: '#78350f'
                      }}>
                        <strong>Terms:</strong> {agreement.terms}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => downloadAgreement(agreement)}
                        style={{ 
                          padding: '8px 16px', 
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        📥 Download Agreement
                      </button>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="agent-dashboard">
      <PageHeader
        title={`Welcome, ${user.name}!`}
        subtitle="Agent Dashboard - Manage your properties and track your performance"
        user={user}
        onLogout={onLogout}
        onSettingsClick={onSettingsClick || (() => setCurrentPage('settings'))}
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <MessageNotificationWidget 
              userId={user?.id}
              onNavigateToMessages={() => setCurrentPage('messages')}
            />

            <button
              className={`btn-secondary ${currentView === 'inProgress' ? 'active' : ''}`}
              onClick={() => setCurrentView(currentView === 'inProgress' ? 'dashboard' : 'inProgress')}
            >
              ⏳ In Progress
            </button>
            <button className="btn-secondary" onClick={() => setCurrentView('commission')}>
              💰 Commission Tracking
            </button>
          </div>

        }
      />

      {/* Minimized Stats Grid */}
      <div className="stats-grid minimized-white" style={{ 
        marginTop: '-45px', 
        marginBottom: '15px', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(6, 1fr)', 
        gap: '10px',
        padding: '0 20px'
      }}>
        <div className="stat-card white-theme" style={{ background: '#ffffff', color: '#1f2937', padding: '10px 15px', minHeight: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a', width: '36px', height: '36px', fontSize: '18px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏆</div>
          <div className="stat-content">
            <h3 style={{ color: '#111827', fontSize: '18px', fontWeight: '700', margin: 0 }}>{stats.totalSales}</h3>
            <p style={{ color: '#6b7280', fontSize: '11px', fontWeight: '600', margin: 0, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Total Sales</p>
          </div>
        </div>

        <div className="stat-card white-theme" style={{ background: '#ffffff', color: '#1f2937', padding: '10px 15px', minHeight: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb', width: '36px', height: '36px', fontSize: '18px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏠</div>
          <div className="stat-content">
            <h3 style={{ color: '#111827', fontSize: '18px', fontWeight: '700', margin: 0 }}>{stats.totalRents}</h3>
            <p style={{ color: '#6b7280', fontSize: '11px', fontWeight: '600', margin: 0, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Total Rents</p>
          </div>
        </div>

        <div className="stat-card white-theme" style={{ background: '#ffffff', color: '#1f2937', padding: '10px 15px', minHeight: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="stat-icon" style={{ background: '#ecfdf5', color: '#10b981', width: '36px', height: '36px', fontSize: '18px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎁</div>
          <div className="stat-content">
            <h3 style={{ color: '#111827', fontSize: '18px', fontWeight: '700', margin: 0 }}>{stats.propertiesToBonus}/5</h3>
            <p style={{ color: '#6b7280', fontSize: '11px', fontWeight: '600', margin: 0, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Bonus Progress</p>
          </div>
        </div>

        <div className="stat-card white-theme" style={{ background: '#ffffff', color: '#1f2937', padding: '10px 15px', minHeight: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="stat-icon" style={{ background: '#faf5ff', color: '#9333ea', width: '36px', height: '36px', fontSize: '18px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💰</div>
          <div className="stat-content">
            <h3 style={{ color: '#111827', fontSize: '18px', fontWeight: '700', margin: 0 }}>{(stats.totalCommission / 1000000).toFixed(2)}M</h3>
            <p style={{ color: '#6b7280', fontSize: '11px', fontWeight: '600', margin: 0, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Total Commission</p>
          </div>
        </div>

        <div className="stat-card white-theme" style={{ background: '#ffffff', color: '#1f2937', padding: '10px 15px', minHeight: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="stat-icon" style={{ background: '#fef2f2', color: '#dc2626', width: '36px', height: '36px', fontSize: '18px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📈</div>
          <div className="stat-content">
            <h3 style={{ color: '#111827', fontSize: '18px', fontWeight: '700', margin: 0 }}>{(stats.monthlyRevenue / 1000000).toFixed(2)}M</h3>
            <p style={{ color: '#6b7280', fontSize: '11px', fontWeight: '600', margin: 0, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Monthly Revenue</p>
          </div>
        </div>

        <div className="stat-card white-theme" style={{ background: '#ffffff', color: '#1f2937', padding: '10px 15px', minHeight: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="stat-icon" style={{ background: '#f8fafc', color: '#475569', width: '36px', height: '36px', fontSize: '18px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏳</div>
          <div className="stat-content">
            <h3 style={{ color: '#111827', fontSize: '18px', fontWeight: '700', margin: 0 }}>{stats.pendingDeals}</h3>
            <p style={{ color: '#6b7280', fontSize: '11px', fontWeight: '600', margin: 0, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Pending Deals</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Browse Properties Part (Replacing My Properties) */}
        <div className="dashboard-card full-width" style={{ padding: 0, overflow: 'hidden', border: 'none', background: 'transparent', boxShadow: 'none' }}>
           <BrowseProperties 
              user={user} 
              onLogout={onLogout} 
              onSettingsClick={onSettingsClick} 
              hideHeader={true} 
              setCurrentPage={setCurrentPage}
           />
        </div>

        {/* Messages */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>📧 Recent Messages</h3>
          </div>
          <div className="messages-list">
            {(Array.isArray(messages) ? messages : []).length > 0 ? (Array.isArray(messages) ? messages : []).map(msg => (
              <div key={msg.id} className={`message-item ${!msg.is_read ? 'unread' : ''}`}>
                <div className="message-info">
                  <h4>{msg.subject}</h4>
                  <p>{msg.message.substring(0, 50)}...</p>
                </div>
                {!msg.is_read && <span className="unread-dot"></span>}
              </div>
            )) : (
              <p className="no-data">No messages</p>
            )}
          </div>
        </div>

        {/* Announcements */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>📢 Announcements</h3>
          </div>
          <div className="announcements-grid">
            {(announcements || []).length > 0 ? (announcements || []).map(announcement => (
              <div key={announcement.id} className="announcement-card">
                <span className={`priority-badge ${announcement.priority}`}>{announcement.priority}</span>
                <h4>{announcement.title}</h4>
                <p>{announcement.content.substring(0, 100)}...</p>
              </div>
            )) : (
              <p className="no-data">No announcements</p>
            )}
          </div>
        </div>
      </div>


    </div>
  );
};

export default AgentDashboardEnhanced;
