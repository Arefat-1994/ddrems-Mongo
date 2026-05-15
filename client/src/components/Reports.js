import React, { useState, useEffect } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import axios from 'axios';
import './Reports.css';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const API_BASE = `${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api`;

const Reports = ({ user, onLogout, onBack }) => {
  const [stats, setStats] = useState(null);
  const [revenueStats, setRevenueStats] = useState(null);
  const [rentalRevenue, setRentalRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revenueChartType, setRevenueChartType] = useState('bar');
  const isPropertyAdmin = user?.role === 'property_admin';

  useEffect(() => {
    fetchStats();
    if (isPropertyAdmin) {
      fetchRevenueStats();
      fetchRentalRevenue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/properties/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/commissions/revenue-stats`);
      setRevenueStats(response.data);
    } catch (error) {
      console.error('Error fetching revenue stats:', error);
    }
  };

  const fetchRentalRevenue = async () => {
    try {
      const response = await axios.get(`${API_BASE}/system-transactions/rental-revenue`);
      if (response.data.success) {
        setRentalRevenue(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching rental revenue:', error);
    }
  };

  const revenueBarData = {
    labels: (revenueStats?.monthlyRevenue || []).map(d => d.month),
    datasets: [
      {
        label: 'Sale Commission (ETB)',
        data: (revenueStats?.monthlyRevenue || []).map(d => Number(d.sale_commission)),
        backgroundColor: '#f97316',
        borderRadius: 6
      },
      {
        label: 'Rent Commission (ETB)',
        data: (revenueStats?.monthlyRevenue || []).map(d => Number(d.rent_commission)),
        backgroundColor: '#3b82f6',
        borderRadius: 6
      }
    ]
  };

  const revenuePieData = {
    labels: (revenueStats?.byPropertyType || []).map(d => (d.property_type || 'Unknown').charAt(0).toUpperCase() + (d.property_type || '').slice(1)),
    datasets: [{
      data: (revenueStats?.byPropertyType || []).map(d => Number(d.total_commission)),
      backgroundColor: ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b'],
      borderWidth: 3,
      borderColor: '#ffffff'
    }]
  };

  const getPropertyTypeColor = (type) => {
    const typeLower = (type || '').toLowerCase();
    if (typeLower.includes('villa')) return '#5c92ff';
    if (typeLower.includes('apartment')) return '#3cc48e';
    if (typeLower.includes('land')) return '#f6ab3c';
    if (typeLower.includes('commercial')) return '#a881f2';
    return '#94a3b8'; // Fallback gray
  };

  const propertyTypeData = {
    labels: (stats?.typeDistribution || []).map(d => (d.type || 'Unknown').charAt(0).toUpperCase() + (d.type || '').slice(1)),
    datasets: [
      {
        data: (stats?.typeDistribution || []).map(d => d.count),
        backgroundColor: (stats?.typeDistribution || []).map(d => getPropertyTypeColor(d.type)),
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverBorderWidth: 4,
        hoverBorderColor: '#ffffff'
      }
    ]
  };

  // NEW: Listing Type Distribution for Property Admin
  const listingTypeData = {
    labels: (stats?.listingDistribution || []).map(d => (d.listing_type || 'Unknown').charAt(0).toUpperCase() + (d.listing_type || '').slice(1)),
    datasets: [
      {
        data: (stats?.listingDistribution || []).map(d => d.count),
        backgroundColor: [
          '#f97316', // Sale (Orange)
          '#3b82f6', // Rent (Blue)
          '#10b981', // Lease/Other (Green)
          '#8b5cf6'  // Purple
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  const formatRole = (role) => {
    if (!role) return 'Unknown';
    if (role === 'user') return 'Customer';
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const usersData = {
    labels: (stats?.userDistribution || []).map(d => formatRole(d.role)),
    datasets: [
      {
        label: 'Users by Role',
        data: (stats?.userDistribution || []).map(d => d.count),
        backgroundColor: [
          '#3b82f6', // Blue
          '#10b981', // Green
          '#f59e0b', // Yellow
          '#ef4444', // Red
          '#8b5cf6', // Purple
          '#ec4899', // Pink
        ],
        borderRadius: 6
      }
    ]
  };

  const performanceData = {
    labels: (stats?.brokerPerformance || []).map(d => d.name),
    datasets: [
      {
        label: 'Sales Count',
        data: (stats?.brokerPerformance || []).map(d => d.count),
        backgroundColor: '#10b981',
        borderRadius: 6
      }
    ]
  };


  if (loading) return <div className="reports-loading">Loading Analytics...</div>;

  const handleExport = (type) => {
    if (!stats) return alert("Nothing to export!");

    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `DDREMS_Report_${timestamp}`;

    if (type === 'PDF') {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text(isPropertyAdmin ? "Property Listings Performance Report" : "Dire Dawa Real Estate Management - System Report", 14, 20);
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

      // Overview Table
      autoTable(doc, {
        startY: 40,
        head: [['Metric', 'Current Value']],
        body: isPropertyAdmin ? [
          ['Total Properties', stats.total || 0],
          ['Items for Sale', stats?.listingDistribution?.find(l => l.listing_type === 'sale')?.count || 0],
          ['Items for Rent', stats?.listingDistribution?.find(l => l.listing_type === 'rent')?.count || 0],
          ['Total Active', stats.active || 0]
        ] : [
          ['Total Properties', stats.total || 0],
          ['Active Listings', stats.active || 0],
          ['Active Brokers', stats?.userDistribution?.find(u => u.role === 'broker')?.count || 0],
          ['Total Users', (stats.userDistribution || []).reduce((acc, curr) => acc + curr.count, 0)]
        ],
        theme: 'striped',
        headStyles: { fillColor: isPropertyAdmin ? [249, 115, 22] : [43, 63, 229] }
      });

      // Distribution Table
      doc.text(isPropertyAdmin ? "Listing Type Distribution" : "Property Type Distribution", 14, doc.lastAutoTable.finalY + 15);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [[isPropertyAdmin ? 'Listing Type' : 'Property Type', 'Count']],
        body: isPropertyAdmin
          ? (stats.listingDistribution || []).map(d => [d.listing_type, d.count])
          : (stats.typeDistribution || []).map(d => [d.type, d.count]),
        theme: 'grid'
      });

      doc.save(`${fileName}.pdf`);
    }
    else if (type === 'Excel') {
      const wb = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = isPropertyAdmin ? [
        ["Report Title", "Property Listings Stats"],
        ["Export Date", new Date().toLocaleString()],
        [],
        ["Metric", "Value"],
        ["Total Properties", stats.total || 0],
        ["For Sale", stats?.listingDistribution?.find(l => l.listing_type === 'sale')?.count || 0],
        ["For Rent", stats?.listingDistribution?.find(l => l.listing_type === 'rent')?.count || 0]
      ] : [
        ["Report Title", "DDREMS System Stats"],
        ["Export Date", new Date().toLocaleString()],
        [],
        ["Metric", "Value"],
        ["Total Properties", stats.total || 0],
        ["Active Listings", stats.active || 0],
        ["Active Brokers", stats?.userDistribution?.find(u => u.role === 'broker')?.count || 0],
        ["Total Users", (stats.userDistribution || []).reduce((acc, curr) => acc + curr.count, 0)]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      // Distribution Sheet
      const distData = isPropertyAdmin
        ? (stats.listingDistribution || []).map(d => ({ 'Listing Type': d.listing_type, Count: d.count }))
        : (stats.typeDistribution || []).map(d => ({ Type: d.type, Count: d.count }));
      const wsDist = XLSX.utils.json_to_sheet(distData);
      XLSX.utils.book_append_sheet(wb, wsDist, "Distribution");

      XLSX.writeFile(wb, `${fileName}.xlsx`);
    }
    else if (type === 'Word') {
      const content = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>DDREMS Report</title></head>
        <body style="font-family: Arial, sans-serif;">
          <h1 style="color: ${isPropertyAdmin ? '#f97316' : '#2b3fe5'}">${isPropertyAdmin ? 'Property Performance Report' : 'Real Estate System Performance Report'}</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <hr/>
          <h2>Quick Summary</h2>
          <ul>
            <li><b>Total Properties:</b> ${stats.total || 0}</li>
            ${isPropertyAdmin ? `
              <li><b>Items for Sale:</b> ${stats?.listingDistribution?.find(l => l.listing_type === 'sale')?.count || 0}</li>
              <li><b>Items for Rent:</b> ${stats?.listingDistribution?.find(l => l.listing_type === 'rent')?.count || 0}</li>
            ` : `
              <li><b>Active Listings:</b> ${stats.active || 0}</li>
              <li><b>Active Brokers:</b> ${stats?.userDistribution?.find(u => u.role === 'broker')?.count || 0}</li>
              <li><b>Total Users:</b> ${(stats.userDistribution || []).reduce((acc, curr) => acc + curr.count, 0)}</li>
            `}
          </ul>
          <h2>${isPropertyAdmin ? 'Listing Breakdown' : 'Property Distribution'}</h2>
          <table border="1" style="border-collapse: collapse; width: 100%;">
            <thead><tr style="background-color: #f2f2f2;"><th>${isPropertyAdmin ? 'Listing Type' : 'Type'}</th><th>Count</th></tr></thead>
            <tbody>
              ${((isPropertyAdmin ? stats.listingDistribution : stats.typeDistribution) || []).map(d => `<tr><td>${isPropertyAdmin ? d.listing_type : d.type}</td><td>${d.count}</td></tr>`).join('')}
            </tbody>
          </table>
          <p style="margin-top: 20px; color: #666; font-size: 10pt;">&copy; Dire Dawa Real Estate Management System</p>
        </body>
        </html>
      `;
      const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.doc`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="reports-page">
      <div className="reports-header-section">
        <div className="title-area">
          <h1>{isPropertyAdmin ? 'Property Listings Report' : 'Reports & Analytics'}</h1>
          <p>{isPropertyAdmin ? 'Analytics for properties for sale and rent' : 'View system reports and export data'}</p>
        </div>
        <div className="header-actions">
          {/* Back button removed as all admin roles have sidebar for navigation */}
          <select className="period-select">
            <option>This Month</option>
            <option>Last Month</option>
            <option>This Year</option>
          </select>
          <div className="user-profile-mini">
            <div className="avatar" style={{ background: isPropertyAdmin ? '#f97316' : '#4f46e5' }}>
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="user-info">
              <span className="name">{user?.name || 'Administrator'}</span>
              <span className="role">{isPropertyAdmin ? 'PROPERTY ADMIN' : 'SYSTEM ADMIN'}</span>
            </div>
            <button className="btn-logout-mini" onClick={onLogout}>🚪 Logout</button>
          </div>
        </div>
      </div>

      <div className="reports-container">
        <div className="export-toolbar">
          <button className="btn-export pdf" onClick={() => handleExport('PDF')}>📄 Export PDF</button>
          <button className="btn-export excel" onClick={() => handleExport('Excel')}>📊 Export Excel</button>
          <button className="btn-export word" onClick={() => handleExport('Word')}>📝 Export Word</button>
          <button className="btn-export print" onClick={() => window.print()}>🖨️ Print</button>
        </div>

        <div className="summary-cards">
          <div className="summary-card">
            <p className="value">{stats?.total || 0}</p>
            <h4>Total Properties</h4>
          </div>
          {isPropertyAdmin ? (
            <>
              <div className="summary-card sale">
                <p className="value">{stats?.listingDistribution?.find(l => l.listing_type === 'sale')?.count || 0}</p>
                <h4>Items for Sale</h4>
              </div>
              <div className="summary-card rent">
                <p className="value">{stats?.listingDistribution?.find(l => l.listing_type === 'rent')?.count || 0}</p>
                <h4>Items for Rent</h4>
              </div>
              <div className="summary-card active">
                <p className="value">{stats?.active || 0}</p>
                <h4>Total Active</h4>
              </div>
            </>
          ) : (
            <>
              <div className="summary-card">
                <p className="value">{stats?.active || 0}</p>
                <h4>Active Listings</h4>
              </div>
              <div className="summary-card">
                <p className="value">{stats?.userDistribution?.find(u => u.role === 'broker')?.count || 0}</p>
                <h4>Active Brokers</h4>
              </div>
              <div className="summary-card">
                <p className="value">{(stats?.userDistribution || []).reduce((acc, curr) => acc + curr.count, 0)}</p>
                <h4>Total Users</h4>
              </div>
            </>
          )}
        </div>

        <div className="charts-grid-top">
          <div className="chart-card">
            <h3 style={{ fontSize: '24px', fontWeight: '600', color: '#1e293b', marginBottom: '30px' }}>
              {isPropertyAdmin ? 'Sale vs Rent Proportion' : 'Properties by Type'}
            </h3>
            <div className="chart-wrapper">
              <Pie
                data={isPropertyAdmin ? listingTypeData : propertyTypeData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                      align: 'center',
                      labels: {
                        usePointStyle: true,
                        pointStyle: 'rect',
                        boxWidth: 20,
                        boxHeight: 15,
                        padding: 20,
                        font: {
                          size: 14,
                          family: "'Inter', 'Segoe UI', sans-serif",
                          weight: '500'
                        },
                        color: '#64748b',
                        generateLabels: (chart) => {
                          const data = chart.data;
                          if (data.labels.length && data.datasets.length) {
                            return data.labels.map((label, i) => {
                              const backgroundColor = data.datasets[0].backgroundColor[i];
                              return {
                                text: `  ${label}`,
                                fillStyle: backgroundColor,
                                strokeStyle: backgroundColor,
                                lineWidth: 0,
                                hidden: false,
                                index: i
                              };
                            });
                          }
                          return [];
                        }
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12,
                      titleFont: {
                        size: 14,
                        weight: 'bold'
                      },
                      bodyFont: {
                        size: 13
                      },
                      callbacks: {
                        label: function(context) {
                          const label = context.label || '';
                          const value = context.parsed || 0;
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = ((value / total) * 100).toFixed(1);
                          return `${label}: ${value} (${percentage}%)`;
                        }
                      }
                    }
                  },
                  layout: {
                    padding: {
                      top: 10,
                      bottom: 10
                    }
                  }
                }}
              />
            </div>
          </div>

          {!isPropertyAdmin && (
            <div className="chart-card">
              <h3 style={{ fontSize: '24px', fontWeight: '600', color: '#1e293b', marginBottom: '30px' }}>Users by Role</h3>
              <div className="chart-wrapper">
                <Bar
                  data={usersData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: 'top',
                        labels: { usePointStyle: true, boxWidth: 8, padding: 20 }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9' },
                        ticks: { color: '#94a3b8' }
                      },
                      x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {isPropertyAdmin && (
            <div className="chart-card info-card">
              <h3>Property Admin Focus</h3>
              <div className="info-content" style={{ padding: '20px', color: '#64748b', fontSize: '15px', lineHeight: '1.6' }}>
                <p>This report focuses on the commercial distribution of listings currently in the system.</p>
                <ul style={{ marginTop: '15px' }}>
                  <li><strong>Sale:</strong> Properties listing for purchase.</li>
                  <li><strong>Rent:</strong> Residential or commercial leases.</li>
                </ul>
                <div style={{ marginTop: '20px', padding: '15px', background: '#fff7ed', borderRadius: '8px', borderLeft: '4px solid #f97316' }}>
                  <span style={{ color: '#c2410c', fontWeight: 'bold' }}>💡 Pro Tip:</span> Use the export buttons above to share this specific listing breakdown with the management team.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ REVENUE SECTION (Property Admin Only) ═══ */}
        {isPropertyAdmin && (
          <div className="revenue-section">
            <div className="revenue-header">
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', margin: 0 }}>💰 Commission Revenue Analytics</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className={`chart-toggle-btn ${revenueChartType === 'bar' ? 'active' : ''}`} onClick={() => setRevenueChartType('bar')}>📊 Bar</button>
                <button className={`chart-toggle-btn ${revenueChartType === 'pie' ? 'active' : ''}`} onClick={() => setRevenueChartType('pie')}>🥧 Pie</button>
              </div>
            </div>

            {/* Revenue Summary Cards */}
            <div className="revenue-summary-cards">
              <div className="revenue-card total">
                <div className="revenue-card-icon">💰</div>
                <div className="revenue-card-content">
                  <p className="revenue-value">{((Number(revenueStats?.summary?.total_revenue) || 0) / 1000000).toFixed(2)}M</p>
                  <h4>Total System Earnings (ETB)</h4>
                </div>
              </div>
              <div className="revenue-card sale">
                <div className="revenue-card-icon">🏷️</div>
                <div className="revenue-card-content">
                  <p className="revenue-value">{((revenueStats?.byEngagementType?.find(e => e.engagement_type === 'sale')?.total_commission || 0) / 1000000).toFixed(2)}M</p>
                  <h4>Sale Commission</h4>
                </div>
              </div>
              <div className="revenue-card rent">
                <div className="revenue-card-icon">🏠</div>
                <div className="revenue-card-content">
                  <p className="revenue-value">{((revenueStats?.byEngagementType?.find(e => e.engagement_type === 'rent')?.total_commission || 0) / 1000000).toFixed(2)}M</p>
                  <h4>Rent Commission</h4>
                </div>
              </div>
              <div className="revenue-card deals">
                <div className="revenue-card-icon">🤝</div>
                <div className="revenue-card-content">
                  <p className="revenue-value">{Number(revenueStats?.summary?.total_deals) || 0}</p>
                  <h4>Total Deals</h4>
                </div>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="charts-grid-top">
              <div className="chart-card" style={{ flex: 2 }}>
                <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', marginBottom: '20px' }}>
                  {revenueChartType === 'bar' ? '📊 Monthly Commission Revenue' : '🥧 Revenue by Property Type'}
                </h3>
                <div className="chart-wrapper" style={{ height: '320px' }}>
                  {revenueChartType === 'bar' ? (
                    <Bar data={revenueBarData} options={{
                      responsive: true, maintainAspectRatio: false,
                      plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 20, font: { size: 13, weight: '500' } } } },
                      scales: {
                        y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', callback: v => (v / 1000000).toFixed(1) + 'M' } },
                        x: { grid: { display: false }, ticks: { color: '#64748b' } }
                      }
                    }} />
                  ) : (
                    <Pie data={revenuePieData} options={{
                      responsive: true, maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15, font: { size: 13 } } },
                        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${(ctx.parsed / 1000000).toFixed(2)}M ETB` } }
                      }
                    }} />
                  )}
                </div>
              </div>

              <div className="chart-card" style={{ flex: 1 }}>
                <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', marginBottom: '20px' }}>🏆 Top Brokers</h3>
                <div className="top-brokers-list">
                  {(revenueStats?.topBrokers || []).length === 0 ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px' }}>No commission data yet</p>
                  ) : (
                    (revenueStats?.topBrokers || []).map((broker, i) => (
                      <div key={i} className="top-broker-item">
                        <span className="broker-rank">#{i + 1}</span>
                        <div className="broker-info">
                          <strong>{broker.broker_name || 'Unknown'}</strong>
                          <small>{Number(broker.deal_count)} deals</small>
                        </div>
                        <span className="broker-commission">{(Number(broker.total_commission) / 1000000).toFixed(2)}M</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ RENTAL REVENUE SECTION (Property Admin Only) ═══ */}
        {isPropertyAdmin && rentalRevenue && rentalRevenue.summary && (
          <div className="revenue-section" style={{ marginTop: '30px' }}>
            <div className="revenue-header">
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', margin: 0 }}>🏠 Recurring Rental Revenue</h2>
              <span style={{ fontSize: '13px', background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '20px', fontWeight: 600 }}>
                {rentalRevenue.summary.uniqueProperties || 0} Active Properties
              </span>
            </div>

            <div className="revenue-summary-cards">
              <div className="revenue-card total">
                <div className="revenue-card-icon">💰</div>
                <div className="revenue-card-content">
                  <p className="revenue-value">{((Number(rentalRevenue.summary.totalRentCollected) || 0) / 1000).toFixed(1)}K</p>
                  <h4>Rent Collected (ETB)</h4>
                </div>
              </div>
              <div className="revenue-card sale">
                <div className="revenue-card-icon">⏳</div>
                <div className="revenue-card-content">
                  <p className="revenue-value">{((Number(rentalRevenue.summary.totalRentPending) || 0) / 1000).toFixed(1)}K</p>
                  <h4>Rent Pending</h4>
                </div>
              </div>
              <div className="revenue-card rent">
                <div className="revenue-card-icon">🔴</div>
                <div className="revenue-card-content">
                  <p className="revenue-value">{((Number(rentalRevenue.summary.totalRentOverdue) || 0) / 1000).toFixed(1)}K</p>
                  <h4>Rent Overdue</h4>
                </div>
              </div>
              <div className="revenue-card deals">
                <div className="revenue-card-icon">📊</div>
                <div className="revenue-card-content">
                  <p className="revenue-value">{Number(rentalRevenue.summary.totalScheduled) || 0}</p>
                  <h4>Total Installments</h4>
                </div>
              </div>
            </div>

            {/* Monthly Breakdown Table */}
            {rentalRevenue.summary.monthlyBreakdown && rentalRevenue.summary.monthlyBreakdown.length > 0 && (
              <div className="chart-card" style={{ marginTop: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>📅 Monthly Rent Collections</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Month</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Collected (ETB)</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>Installments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(rentalRevenue.summary.monthlyBreakdown || []).map((m, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600 }}>{m.month}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>{Number(m.collected).toLocaleString()}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>{m.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}


        {!isPropertyAdmin && (
          <div className="chart-card full-width">
            <h3>Broker Performance</h3>
            <div className="chart-wrapper performance">
              <Bar
                data={performanceData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'x',
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
                      labels: { usePointStyle: true, boxWidth: 8 }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: '#f1f5f9' },
                      ticks: { color: '#64748b' }
                    },
                    x: {
                      grid: { display: false },
                      ticks: { color: '#64748b' }
                    }
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};



export default Reports;
