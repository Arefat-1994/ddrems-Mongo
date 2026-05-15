import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PageHeader from './PageHeader';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const CommissionTracking = ({ user, onLogout, onSettingsClick, onBack }) => {
  const [commissions, setCommissions] = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [summary, setSummary] = useState({
    total_deals: 0,
    deal_commission: 0,
    bonus_earned: 0,
    total_earned: 0,
    total_pending: 0,
    total_amount: 0,
    total_deal_value: 0,
    avg_commission_rate: 2,
    highest_commission: 0,
    lowest_commission: 0,
    pending_deals: 0,
    projected_earnings: 0,
    properties_to_bonus: 0,
    bonus_eligible_value: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchCommissionData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch real commission records
      const [commRes, summaryRes, engRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/commissions/broker/${user.id}`).catch(() => ({ data: [] })),
        axios.get(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/commissions/broker/${user.id}/summary`).catch(() => ({ data: {} })),
        axios.get(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/commissions/broker/${user.id}/engagements`).catch(() => ({ data: { engagements: [] } }))
      ]);

      setCommissions(Array.isArray(commRes.data) ? commRes.data : []);
      setSummary(prev => ({ ...prev, ...summaryRes.data }));
      setEngagements(engRes.data.engagements || []);
    } catch (error) {
      console.error('Error fetching commission data:', error);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchCommissionData();
  }, [fetchCommissionData]);

  const performanceData = {
    labels: ['Completed Deals', 'Pending Deals', 'Bonus Earned'],
    datasets: [
      {
        label: 'Commission Breakdown',
        data: [
          Number(summary.deal_commission || 0),
          Number(summary.projected_earnings || 0),
          Number(summary.bonus_earned || 0)
        ],
        backgroundColor: ['rgba(16, 185, 129, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(139, 92, 246, 0.7)'],
        borderColor: ['#10b981', '#f59e0b', '#8b5cf6'],
        borderWidth: 1,
      },
    ],
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>💰</div>
        <p style={{ color: '#64748b', fontSize: '18px' }}>Loading commission data...</p>
      </div>
    );
  }

  return (
    <div className="commission-page" style={{ padding: '20px', background: '#f8fafc', minHeight: '100vh' }}>
      <PageHeader
        title="Commission & Performance"
        subtitle="Track your earnings, rate, bonus progress and deal history"
        user={user}
        onLogout={onLogout}
        onSettingsClick={onSettingsClick}
        actions={onBack ? (
          <button className="btn-secondary" onClick={onBack} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>
            ← Back to Dashboard
          </button>
        ) : null}
      />

      {/* 5-Property Bonus Tracker */}
      <div style={{ marginTop: '25px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '24px', borderRadius: '14px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '100px', opacity: 0.05, zIndex: 0 }}>🎁</div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', color: '#38bdf8' }}>🎁 5-Property Bonus Tracker</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>{summary.properties_to_bonus || 0} / 5 Properties Completed</div>
            <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '5px' }}>Eligible Value: {Number(summary.bonus_eligible_value || 0).toLocaleString()} ETB</div>
          </div>
          <div style={{ flexGrow: 1, maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
              <span>Progress</span>
              <span>{Math.round(((summary.properties_to_bonus || 0) / 5) * 100)}%</span>
            </div>
            <div style={{ height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${((summary.properties_to_bonus || 0) / 5) * 100}%`, background: 'linear-gradient(90deg, #38bdf8, #818cf8)', borderRadius: '5px', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '6px', textAlign: 'right' }}>Complete {5 - (summary.properties_to_bonus || 0)} more to earn 2% bonus!</div>
          </div>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
        <div style={{ background: '#f59e0b', padding: '16px 20px', borderRadius: '12px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: '600' }}>💰 Deal Commission</div>
          <div style={{ fontSize: '24px', fontWeight: '800' }}>{Number(summary.deal_commission || 0).toLocaleString()} <span style={{ fontSize: '14px', fontWeight: '500' }}>ETB</span></div>
        </div>

        <div style={{ background: '#f59e0b', padding: '16px 20px', borderRadius: '12px', color: '#fff', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ position: 'absolute', top: -5, right: -5, fontSize: '30px', opacity: 0.2 }}>🎁</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '11px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: '600' }}>🎁 Bonus Earned</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>{Number(summary.bonus_earned || 0).toLocaleString()} <span style={{ fontSize: '14px', fontWeight: '500' }}>ETB</span></div>
          </div>
        </div>

        <div style={{ background: '#f59e0b', padding: '16px 20px', borderRadius: '12px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: '600' }}>💵 Total Earnings</div>
          <div style={{ fontSize: '24px', fontWeight: '800' }}>{Number(summary.total_earned || 0).toLocaleString()} <span style={{ fontSize: '14px', fontWeight: '500' }}>ETB</span></div>
        </div>

        <div style={{ background: '#f59e0b', padding: '16px 20px', borderRadius: '12px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: '600' }}>⏳ Projected Pipeline</div>
          <div style={{ fontSize: '24px', fontWeight: '800' }}>{Number(summary.projected_earnings || 0).toLocaleString()} <span style={{ fontSize: '14px', fontWeight: '500' }}>ETB</span></div>
        </div>
      </div>

      {/* Rate & Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '16px' }}>
        <div style={{ background: '#fff', padding: '18px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>📊 Commission Rate</div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#3b82f6' }}>{Number(summary.avg_commission_rate || 2).toFixed(1)}%</div>
        </div>
        <div style={{ background: '#fff', padding: '18px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>🏆 Total Deals</div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#10b981' }}>{summary.total_deals || 0}</div>
        </div>
        <div style={{ background: '#fff', padding: '18px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>💼 Total Deal Value</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#8b5cf6' }}>{Number(summary.total_deal_value || 0).toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>ETB</div>
        </div>
        <div style={{ background: '#fff', padding: '18px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>🏅 Best Commission</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#059669' }}>{Number(summary.highest_commission || 0).toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>ETB</div>
        </div>
      </div>

      {/* Commission History & Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '24px' }}>
        {/* Commission History Table */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📋 Commission History
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '400' }}>({commissions.length} records)</span>
          </h3>
          {commissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>📊</div>
              <p>No commission records yet. Complete deals to earn commissions!</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                  <th style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>Property</th>
                  <th style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>Type</th>
                  <th style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>Deal Amount</th>
                  <th style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>Rate</th>
                  <th style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>Commission</th>
                  <th style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>Status</th>
                  <th style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map(comm => (
                  <tr key={comm.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: '600' }}>{comm.property_title || `Property #${comm.property_id}`}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: comm.engagement_type === 'rent' ? '#dbeafe' : '#fef3c7',
                        color: comm.engagement_type === 'rent' ? '#1d4ed8' : '#92400e'
                      }}>
                        {comm.engagement_type === 'rent' ? '🔑 Rent' : '🏷️ Sale'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: '600' }}>{Number(comm.agreement_amount || 0).toLocaleString()} ETB</td>
                    <td style={{ padding: '12px', color: '#3b82f6', fontWeight: '700' }}>{Number(comm.broker_pct || 2)}%</td>
                    <td style={{ padding: '12px', fontWeight: '700', color: '#059669' }}>{Number(comm.broker_amount || 0).toLocaleString()} ETB</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: comm.status === 'paid' ? '#d1fae5' : comm.status === 'pending' ? '#fef3c7' : '#fee2e2',
                        color: comm.status === 'paid' ? '#065f46' : comm.status === 'pending' ? '#92400e' : '#991b1b'
                      }}>
                        {comm.status === 'paid' ? '✅ Paid' : comm.status === 'pending' ? '⏳ Pending' : comm.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#64748b', fontSize: '13px' }}>
                      {comm.calculated_at ? new Date(comm.calculated_at).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Performance Chart */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px' }}>📊 Earnings Breakdown</h3>
          <div style={{ height: '280px' }}>
            <Pie data={performanceData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
          </div>
        </div>
      </div>

      {/* Engagement Pipeline */}
      {engagements.length > 0 && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', marginTop: '24px' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🤝 Engagement Pipeline
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '400' }}>({engagements.length} engagements)</span>
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {engagements.map(eng => {
              const price = Number(eng.agreed_price || eng.current_offer || eng.starting_offer || 0);
              const brokerComm = eng.broker_commission_amount ? Number(eng.broker_commission_amount) : Math.round(price * (Number(eng.broker_commission_pct || 2) / 100) * 100) / 100;
              const isCompleted = eng.status === 'completed';
              const isRental = eng.engagement_type === 'rent';
              return (
                <div key={eng.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  background: isCompleted ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${isCompleted ? '#bbf7d0' : '#fde68a'}`,
                  borderRadius: '10px',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>{isCompleted ? '✅' : '⏳'}</span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{eng.property_title || 'N/A'}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {isRental ? '🔑 Rent' : '🏷️ Sale'} • {eng.buyer_name || 'N/A'} • {eng.status?.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Deal Value</div>
                      <div style={{ fontWeight: '700', color: '#1e293b' }}>{price.toLocaleString()} ETB</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{isCompleted ? 'Earned' : 'Projected'}</div>
                      <div style={{ fontWeight: '700', color: isCompleted ? '#059669' : '#d97706' }}>{brokerComm.toLocaleString()} ETB</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionTracking;
