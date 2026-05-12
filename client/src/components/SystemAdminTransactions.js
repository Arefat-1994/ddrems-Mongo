import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import "./SystemAdminTransactions.css";

const API = `http://${window.location.hostname}:5000/api`;

const SystemAdminTransactions = () => {
  const [data, setData] = useState({ sale: [], rent: [], summary: {} });
  const [rentalRevenue, setRentalRevenue] = useState({ installments: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterType, setFilterType] = useState("all"); // 'all', 'sale', 'rent', 'rental_installments'
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedTx, setSelectedTx] = useState(null); // For Details Modal

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const [txRes, rentalRes] = await Promise.all([
        axios.get(`${API}/system-transactions/all`),
        axios.get(`${API}/system-transactions/rental-revenue`).catch(() => ({ data: { success: false } }))
      ]);
      if (txRes.data.success) {
        setData(txRes.data.data);
      } else {
        setError(txRes.data.message);
      }
      if (rentalRes.data.success) {
        setRentalRevenue(rentalRes.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateCommissionForDisplay = (tx) => {
    return Number(tx.commission || 0).toLocaleString();
  };

  // Filter application
  const isInDateRange = (dateStr) => {
    if (!dateFrom && !dateTo) return true;
    const date = new Date(dateStr);
    if (dateFrom && date < new Date(dateFrom)) return false;
    if (dateTo && date > new Date(dateTo)) return false;
    return true;
  };

  const matchesSearch = (tx) => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    const idStr = String(tx.id).toLowerCase();
    const propName = (tx.property_name || "").toLowerCase();
    const ownerName = (tx.owner_name || "").toLowerCase();
    const buyerName = (tx.buyer_name || tx.tenant_name || "").toLowerCase();
    
    return (
      idStr.includes(s) ||
      propName.includes(s) ||
      ownerName.includes(s) ||
      buyerName.includes(s)
    );
  };

  const filteredSales = data.sale.filter(
    (tx) => matchesSearch(tx) && isInDateRange(tx.date)
  );
  
  const filteredRent = data.rent.filter(
    (tx) => matchesSearch(tx) && isInDateRange(tx.date)
  );

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sales sheet
    if (filterType === "all" || filterType === "sale") {
      const salesData = filteredSales.map(t => ({
        "Transaction ID": t.id,
        "Property": t.property_name,
        "Buyer": t.buyer_name,
        "Owner": t.owner_name,
        "Sale Amount (ETB)": t.sale_amount,
        "System Commission (ETB)": t.commission,
        "Broker Commission (ETB)": t.broker_commission,
        "Net Amount (ETB)": t.net_amount,
        "Date": new Date(t.date).toLocaleDateString(),
        "Status": t.status,
        "Payment Method": t.payment_method
      }));
      const wsSale = XLSX.utils.json_to_sheet(salesData);
      XLSX.utils.book_append_sheet(wb, wsSale, "Sale Revenue Report");
    }

    // Rent sheet
    if (filterType === "all" || filterType === "rent") {
      const rentData = filteredRent.map(t => ({
        "Transaction ID": t.id,
        "Property": t.property_name,
        "Tenant": t.tenant_name,
        "Owner": t.owner_name,
        "Rent Amount (ETB)": t.rent_amount,
        "System Commission (ETB)": t.commission,
        "Broker Commission (ETB)": t.broker_commission,
        "Transfer Type": t.transfer_type,
        "Date": new Date(t.date).toLocaleDateString(),
        "Status": t.status,
        "Payment Method": t.payment_method
      }));
      const wsRent = XLSX.utils.json_to_sheet(rentData);
      XLSX.utils.book_append_sheet(wb, wsRent, "Rent Revenue Report");
    }

    XLSX.writeFile(wb, `Revenue_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) return <div className="loader">Loading Transactions...</div>;
  if (error) return <div className="error-card">❌ {error}</div>;

  const s = data.summary;

  return (
    <div className="system-admin-transactions">
      <div className="sat-header">
        <h2>💳 Revenue & Transactions Overview</h2>
        <button className="btn-primary" onClick={exportToExcel}>
          📥 Export Revenue Report
        </button>
      </div>

      {/* ── Top-level summary ── */}
      <div className="sat-summary-cards">
        <div className="summary-card rev">
          <span className="card-icon">🏦</span>
          <div className="card-details">
            <h3>Total Deal Volume</h3>
            <p className="card-value">ETB {Number(s.totalVolume || 0).toLocaleString()}</p>
            <span className="card-sub">{(s.saleCount || 0) + (s.rentCount || 0)} deals</span>
          </div>
        </div>
        <div className="summary-card comm">
          <span className="card-icon">📉</span>
          <div className="card-details">
            <h3>System Revenue</h3>
            <p className="card-value">ETB {Number(s.systemRevenue || 0).toLocaleString()}</p>
            <span className="card-sub">Total platform fees</span>
          </div>
        </div>
        <div className="summary-card broker-comm">
          <span className="card-icon">🤝</span>
          <div className="card-details">
            <h3>Broker Commissions</h3>
            <p className="card-value">ETB {Number(s.totalBrokerCommission || 0).toLocaleString()}</p>
            <span className="card-sub">Total paid to brokers</span>
          </div>
        </div>
      </div>

      {/* ── Sale vs Rent Breakdown ── */}
      <div className="sat-breakdown-row">
        <div className="breakdown-card sale-breakdown">
          <div className="breakdown-header">
            <span className="breakdown-icon">🏡</span>
            <h4>Sale Transactions</h4>
          </div>
          <div className="breakdown-stats">
            <div className="breakdown-stat">
              <span className="stat-label">Volume</span>
              <span className="stat-value">ETB {Number(s.totalSalesAmount || 0).toLocaleString()}</span>
            </div>
            <div className="breakdown-stat">
              <span className="stat-label">System Fee</span>
              <span className="stat-value fee">ETB {Number(s.saleSystemRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="breakdown-stat">
              <span className="stat-label">Deals</span>
              <span className="stat-value count">{s.saleCount || 0}</span>
            </div>
          </div>
        </div>

        <div className="breakdown-card rent-breakdown">
          <div className="breakdown-header">
            <span className="breakdown-icon">🔑</span>
            <h4>Rent Transactions</h4>
          </div>
          <div className="breakdown-stats">
            <div className="breakdown-stat">
              <span className="stat-label">Volume</span>
              <span className="stat-value">ETB {Number(s.totalRentAmount || 0).toLocaleString()}</span>
            </div>
            <div className="breakdown-stat">
              <span className="stat-label">System Fee</span>
              <span className="stat-value fee">ETB {Number(s.rentSystemRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="breakdown-stat">
              <span className="stat-label">Deals</span>
              <span className="stat-value count">{s.rentCount || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Rental Installments Revenue Section ── */}
      {rentalRevenue.summary.totalScheduled > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏠 Recurring Rental Revenue
            <span style={{ fontSize: '12px', fontWeight: 500, background: '#dbeafe', color: '#1e40af', padding: '3px 10px', borderRadius: '20px' }}>
              {rentalRevenue.summary.uniqueProperties || 0} Properties
            </span>
          </h3>
          <div className="sat-breakdown-row">
            <div className="breakdown-card" style={{ borderLeft: '4px solid #10b981' }}>
              <div className="breakdown-header">
                <span className="breakdown-icon">✅</span>
                <h4>Rent Collected</h4>
              </div>
              <div className="breakdown-stats">
                <div className="breakdown-stat">
                  <span className="stat-label">Amount</span>
                  <span className="stat-value" style={{ color: '#059669' }}>ETB {Number(rentalRevenue.summary.totalRentCollected || 0).toLocaleString()}</span>
                </div>
                <div className="breakdown-stat">
                  <span className="stat-label">Installments</span>
                  <span className="stat-value count">{rentalRevenue.summary.totalPaid || 0}</span>
                </div>
              </div>
            </div>
            <div className="breakdown-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="breakdown-header">
                <span className="breakdown-icon">⏳</span>
                <h4>Rent Pending</h4>
              </div>
              <div className="breakdown-stats">
                <div className="breakdown-stat">
                  <span className="stat-label">Amount</span>
                  <span className="stat-value" style={{ color: '#d97706' }}>ETB {Number(rentalRevenue.summary.totalRentPending || 0).toLocaleString()}</span>
                </div>
                <div className="breakdown-stat">
                  <span className="stat-label">Installments</span>
                  <span className="stat-value count">{rentalRevenue.summary.totalPending || 0}</span>
                </div>
              </div>
            </div>
            <div className="breakdown-card" style={{ borderLeft: '4px solid #ef4444' }}>
              <div className="breakdown-header">
                <span className="breakdown-icon">🔴</span>
                <h4>Rent Overdue</h4>
              </div>
              <div className="breakdown-stats">
                <div className="breakdown-stat">
                  <span className="stat-label">Amount</span>
                  <span className="stat-value" style={{ color: '#dc2626' }}>ETB {Number(rentalRevenue.summary.totalRentOverdue || 0).toLocaleString()}</span>
                </div>
                <div className="breakdown-stat">
                  <span className="stat-label">Installments</span>
                  <span className="stat-value count">{rentalRevenue.summary.totalOverdue || 0}</span>
                </div>
              </div>
            </div>
            <div className="breakdown-card" style={{ borderLeft: '4px solid #6366f1' }}>
              <div className="breakdown-header">
                <span className="breakdown-icon">📤</span>
                <h4>Awaiting Verification</h4>
              </div>
              <div className="breakdown-stats">
                <div className="breakdown-stat">
                  <span className="stat-label">Amount</span>
                  <span className="stat-value" style={{ color: '#4f46e5' }}>ETB {Number(rentalRevenue.summary.totalRentSubmitted || 0).toLocaleString()}</span>
                </div>
                <div className="breakdown-stat">
                  <span className="stat-label">Installments</span>
                  <span className="stat-value count">{rentalRevenue.summary.totalSubmitted || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sat-filters">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All Transactions</option>
          <option value="sale">🏡 Sale Revenue Only</option>
          <option value="rent">🔑 Rent Revenue Only</option>
          <option value="rental_installments">🏠 Rental Installments</option>
        </select>
        <div className="date-filters">
          <label>From: <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></label>
          <label>To: <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></label>
        </div>
        <input 
          type="text" 
          placeholder="🔍 Search by Person, Property, or ID" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-box"
        />
      </div>

      <div className="sat-tables">
        {(filterType === "all" || filterType === "sale") && (
          <div className="sat-table-section">
            <h3>🏡 Sale Transactions <span className="table-count">({filteredSales.length})</span></h3>
            {filteredSales.length === 0 ? <p className="empty-msg">No sales found.</p> : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Property</th>
                    <th>Buyer</th>
                    <th>Owner</th>
                    <th>Sale Amount</th>
                    <th>System Fee</th>
                    <th>Broker Fee</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((tx) => (
                    <tr key={tx.id}>
                      <td>#{tx.id}</td>
                      <td>{tx.property_name}</td>
                      <td>{tx.buyer_name}</td>
                      <td>{tx.owner_name}</td>
                      <td>{Number(tx.sale_amount).toLocaleString()} ETB</td>
                      <td>{calculateCommissionForDisplay(tx)} ETB</td>
                      <td>{Number(tx.broker_commission || 0).toLocaleString()} ETB</td>
                      <td>{new Date(tx.date).toLocaleDateString()}</td>
                      <td><span className={`status-badge ${tx.status}`}>{tx.status}</span></td>
                      <td className="action-btns">
                        <button onClick={() => setSelectedTx(tx)} className="btn-sm btn-outline">Details</button>
                        {tx.receipt_url && (
                          <a href={tx.receipt_url} target="_blank" rel="noopener noreferrer" className="btn-sm btn-outline-success">Receipt</a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {(filterType === "all" || filterType === "rent") && (
          <div className="sat-table-section">
            <h3>🔑 Rent Transactions <span className="table-count">({filteredRent.length})</span></h3>
            {filteredRent.length === 0 ? <p className="empty-msg">No rent payments found.</p> : (
              <table className="admin-table rent-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Property</th>
                    <th>Tenant</th>
                    <th>Owner</th>
                    <th>Rent Amount</th>
                    <th>System Fee</th>
                    <th>Broker Fee</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRent.map((tx) => (
                    <tr key={tx.id}>
                      <td>{tx.id}</td>
                      <td>{tx.property_name}</td>
                      <td>{tx.tenant_name}</td>
                      <td>{tx.owner_name}</td>
                      <td>{Number(tx.rent_amount).toLocaleString()} ETB</td>
                      <td>{Number(tx.commission).toLocaleString()} ETB</td>
                      <td>{Number(tx.broker_commission || 0).toLocaleString()} ETB</td>
                      <td>{new Date(tx.date).toLocaleDateString()}</td>
                      <td><span className="status-badge completed">Completed</span></td>
                      <td className="action-btns">
                        <button onClick={() => setSelectedTx(tx)} className="btn-sm btn-outline">Details</button>
                        {tx.receipt_url && (
                          <a href={tx.receipt_url} target="_blank" rel="noopener noreferrer" className="btn-sm btn-outline-success">Receipt</a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Rental Installments Table */}
        {filterType === "rental_installments" && (
          <div className="sat-table-section">
            <h3>🏠 Rental Payment Installments <span className="table-count">({rentalRevenue.installments?.length || 0})</span></h3>
            {(!rentalRevenue.installments || rentalRevenue.installments.length === 0) ? <p className="empty-msg">No rental installments found.</p> : (
              <table className="admin-table rent-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Property</th>
                    <th>Tenant</th>
                    <th>Owner</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Paid On</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {rentalRevenue.installments
                    .filter(inst => {
                      if (!searchQuery) return true;
                      const s = searchQuery.toLowerCase();
                      return (inst.property_title || '').toLowerCase().includes(s) ||
                             (inst.tenant_name || '').toLowerCase().includes(s) ||
                             (inst.owner_name || '').toLowerCase().includes(s);
                    })
                    .map((inst) => (
                    <tr key={inst.id} style={inst.status === 'overdue' ? { background: '#fef2f2' } : inst.status === 'paid' ? { background: '#f0fdf4' } : {}}>
                      <td><strong>{inst.installment_number}</strong></td>
                      <td>{inst.property_title || 'N/A'}</td>
                      <td>{inst.tenant_name || 'N/A'}</td>
                      <td>{inst.owner_name || 'N/A'}</td>
                      <td><strong>{Number(inst.amount || 0).toLocaleString()} ETB</strong></td>
                      <td>{inst.due_date ? new Date(inst.due_date).toLocaleDateString() : '—'}</td>
                      <td>
                        <span className={`status-badge ${inst.status}`} style={{
                          background: inst.status === 'paid' ? '#d1fae5' : inst.status === 'overdue' ? '#fee2e2' : inst.status === 'submitted' ? '#dbeafe' : '#f1f5f9',
                          color: inst.status === 'paid' ? '#065f46' : inst.status === 'overdue' ? '#991b1b' : inst.status === 'submitted' ? '#1e40af' : '#475569',
                          padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700
                        }}>
                          {inst.status === 'paid' ? '✅' : inst.status === 'overdue' ? '🔴' : inst.status === 'submitted' ? '📤' : '⏳'} {(inst.status || 'pending').charAt(0).toUpperCase() + (inst.status || '').slice(1)}
                        </span>
                      </td>
                      <td>{inst.paid_at ? new Date(inst.paid_at).toLocaleDateString() : '—'}</td>
                      <td>{inst.transaction_reference || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {selectedTx && (
        <div className="modal-overlay" onClick={() => setSelectedTx(null)}>
          <div className="modal-content tx-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transaction Details</h3>
              <button className="close-btn" onClick={() => setSelectedTx(null)}>×</button>
            </div>
            <div className="modal-body tx-details-grid">
              {selectedTx.type === 'sale' ? (
                <>
                  <div className="tx-box brand">
                    <strong>Why Transaction Happened</strong>
                    <p>Property Purchase / Full Payment</p>
                  </div>
                  <div className="tx-box">
                    <strong>Property Info</strong>
                    <p>{selectedTx.property_name}</p>
                  </div>
                  <div className="tx-box">
                    <strong>Buyer Info</strong>
                    <p>{selectedTx.buyer_name}</p>
                  </div>
                  <div className="tx-box">
                    <strong>Owner Info</strong>
                    <p>{selectedTx.owner_name}</p>
                  </div>
                  <div className="tx-box">
                    <strong>Payment Method</strong>
                    <p style={{textTransform: 'capitalize'}}>{(selectedTx.payment_method || 'Bank Transfer').replace('_', ' ')}</p>
                  </div>
                  <div className="tx-box">
                    <strong>Transaction Type</strong>
                    <p><span style={{background:'#dbeafe',color:'#1e40af',padding:'4px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:700}}>🏡 Sale</span></p>
                  </div>
                  <div className="tx-box amount info">
                    <strong>Gross Amount</strong>
                    <p>{Number(selectedTx.sale_amount).toLocaleString()} ETB</p>
                  </div>
                  <div className="tx-box amount comm">
                    <strong>System Commission</strong>
                    <p>{Number(selectedTx.commission).toLocaleString()} ETB</p>
                  </div>
                  <div className="tx-box amount comm">
                    <strong>Broker Commission</strong>
                    <p>{Number(selectedTx.broker_commission).toLocaleString()} ETB</p>
                  </div>
                  <div className="tx-box amount net">
                    <strong>Net Amount Transferred</strong>
                    <p>{Number(selectedTx.net_amount).toLocaleString()} ETB</p>
                  </div>
                </>
              ) : (
                <>
                  {/* Rent Specific Details Modal */}
                  <div className="tx-box brand" style={{gridColumn: '1 / -1'}}>
                    <strong>Commission Revenue Entry</strong>
                    <p>Rent Performance - {selectedTx.transfer_type || "Agreement Commission"}</p>
                  </div>
                  <div className="tx-box">
                    <strong>Property Name</strong>
                    <p>{selectedTx.property_name}</p>
                  </div>
                  <div className="tx-box">
                    <strong>Tenant Name</strong>
                    <p>{selectedTx.tenant_name}</p>
                  </div>
                  <div className="tx-box">
                    <strong>Owner Name</strong>
                    <p>{selectedTx.owner_name}</p>
                  </div>
                  <div className="tx-box">
                    <strong>Transaction Type</strong>
                    <p><span style={{background:'#d1fae5',color:'#065f46',padding:'4px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:700}}>🔑 Rent</span></p>
                  </div>
                  <div className="tx-box amount info">
                    <strong>Total Amount Paid</strong>
                    <p>{Number(selectedTx.rent_amount).toLocaleString()} ETB</p>
                  </div>
                  <div className="tx-box amount comm">
                    <strong>System Fee Amount</strong>
                    <p>{Number(selectedTx.commission).toLocaleString()} ETB</p>
                  </div>
                  <div className="tx-box amount comm">
                    <strong>Broker Commission Amount</strong>
                    <p>{Number(selectedTx.broker_commission).toLocaleString()} ETB</p>
                  </div>
                  <div className="tx-box">
                    <strong>Status</strong>
                    <p style={{color: '#059669', fontWeight: 'bold'}}>Completed</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemAdminTransactions;
