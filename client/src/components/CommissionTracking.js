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

const CommissionTracking = ({ user, onLogout }) => {
  const [works, setWorks] = useState([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingPayments: 0,
    completedDeals: 0,
    inProgressDeals: 0
  });

  const fetchCommissionData = useCallback(async () => {
    try {
      // For now, use properties as proxy for "works"
      const response = await axios.get(`http://localhost:5000/api/properties/owner/${user.id}`);
      const properties = response.data;

      setWorks(properties);

      const completed = properties.filter(p => p.status === 'sold' || p.status === 'rented').length;
      const inProgress = properties.filter(p => p.status === 'active' || p.status === 'pending').length;
      const earnings = completed * 50000; // Mock calculation: 50k ETB per deal

      setStats({
        totalEarnings: earnings,
        pendingPayments: inProgress * 10000,
        completedDeals: completed,
        inProgressDeals: inProgress
      });
    } catch (error) {
      console.error('Error fetching commission data:', error);
    }
  }, [user.id]);

  useEffect(() => {
    fetchCommissionData();
  }, [fetchCommissionData]);


  const performanceData = {
    labels: ['Completed Deals', 'In Progress'],
    datasets: [
      {
        label: 'Number of Deals',
        data: [stats.completedDeals, stats.inProgressDeals],
        backgroundColor: ['rgba(16, 185, 129, 0.7)', 'rgba(245, 158, 11, 0.7)'],
        borderColor: ['#10b981', '#f59e0b'],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="commission-page" style={{ padding: '20px', background: '#f8fafc', minHeight: '100vh' }}>
      <PageHeader
        title="Commission & Performance"
        subtitle="Track your earnings and deal progress"
        user={user}
        onLogout={onLogout}
      />

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '30px' }}>
        <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h4 style={{ color: '#64748b' }}>💰 Total Earnings</h4>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{(stats.totalEarnings / 1000).toFixed(0)}k ETB</p>
        </div>
        <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h4 style={{ color: '#64748b' }}>⏳ Pending Payments</h4>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{(stats.pendingPayments / 1000).toFixed(0)}k ETB</p>
        </div>
        <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h4 style={{ color: '#64748b' }}>🏆 Completed Deals</h4>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.completedDeals}</p>
        </div>
        <div className="stat-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h4 style={{ color: '#64748b' }}>📈 Active Deals</h4>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.inProgressDeals}</p>
        </div>
      </div>

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginTop: '30px' }}>
        <div className="dashboard-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3>📋 Work History</h3>
          <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ padding: '12px' }}>Property</th>
                <th style={{ padding: '12px' }}>Type</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Est. Commission</th>
              </tr>
            </thead>
            <tbody>
              {works.map((work, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px' }}>{work.title}</td>
                  <td style={{ padding: '12px' }}>{work.type}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      background: work.status === 'sold' ? '#d1fae5' : '#fef3c7',
                      color: work.status === 'sold' ? '#10b981' : '#f59e0b'
                    }}>
                      {work.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>50,000 ETB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dashboard-card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3>📊 Performance View</h3>
          <div style={{ height: '300px', marginTop: '20px' }}>
            <Pie data={performanceData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionTracking;
