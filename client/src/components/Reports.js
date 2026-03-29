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

const Reports = ({ user, onLogout, onBack }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const isPropertyAdmin = user?.role === 'property_admin';

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/properties/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
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

  const revenueData = {
    labels: (stats?.monthlyRevenue || []).map(d => d.month).length > 0 ? (stats?.monthlyRevenue || []).map(d => d.month) : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Revenue (Million ETB)',
        data: (stats?.monthlyRevenue || []).map(d => d.amount).length > 0 ? (stats?.monthlyRevenue || []).map(d => d.amount) : [45, 52, 60, 48, 70, 85],
        backgroundColor: '#4f46e5',
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
          ['Active Brokers', (stats.brokerPerformance || []).length],
          ['Total Revenue', `${(stats.totalRevenue / 1000000 || 0).toFixed(2)}M ETB`]
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
        ["Total Revenue (Million ETB)", (stats.totalRevenue / 1000000 || 0).toFixed(2)]
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
              <li><b>Total Revenue:</b> ${(stats.totalRevenue / 1000000 || 0).toFixed(2)}M ETB</li>
            `}
          </ul>
          <h2>${isPropertyAdmin ? 'Listing Breakdown' : 'Property Distribution'}</h2>
          <table border="1" style="border-collapse: collapse; width: 100%;">
            <thead><tr style="background-color: #f2f2f2;"><th>${isPropertyAdmin ? 'Listing Type' : 'Type'}</th><th>Count</th></tr></thead>
            <tbody>
              ${(isPropertyAdmin ? stats.listingDistribution : stats.typeDistribution || []).map(d => `<tr><td>${isPropertyAdmin ? d.listing_type : d.type}</td><td>${d.count}</td></tr>`).join('')}
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
                <p className="value">{(stats?.brokerPerformance || []).length}</p>
                <h4>Active Brokers</h4>
              </div>
              <div className="summary-card">
                <p className="value">{(stats?.totalRevenue / 1000000 || 0).toFixed(1)}M</p>
                <h4>Total Revenue (ETB)</h4>
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
                              const value = data.datasets[0].data[i];
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
              <h3>Monthly Revenue</h3>
              <div className="chart-wrapper">
                <Bar
                  data={revenueData}
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
