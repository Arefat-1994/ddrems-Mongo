import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import "./SystemAdminTransactions.css";

const API = `http://${window.location.hostname}:5000/api`;

const SystemAdminTransactions = () => {
  const [data, setData] = useState({ sale: [], rent: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterType, setFilterType] = useState("all"); // 'all', 'sale', 'rent'
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
      const res = await axios.get(`${API}/system-transactions/all`);
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError(res.data.message);
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
        "Commission (ETB)": t.commission,
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
        "Commission (ETB)": t.commission,
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

  return (
    <div className="system-admin-transactions">
      <div className="sat-header">
        <h2>💳 Revenue & Transactions Overview</h2>
        <button className="btn-primary" onClick={exportToExcel}>
          📥 Export Revenue Report
        </button>
      </div>

      <div className="sat-summary-cards">
        <div className="summary-card sale">
          <span className="card-icon">🏠</span>
          <div className="card-details">
            <h3>Total Sales Amount</h3>
            <p className="card-value">ETB {Number(data.summary.totalSalesAmount || 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="summary-card rent">
          <span className="card-icon">🔑</span>
          <div className="card-details">
            <h3>Total Rent Amount</h3>
            <p className="card-value">ETB {Number(data.summary.totalRentAmount || 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="summary-card comm">
          <span className="card-icon">📉</span>
          <div className="card-details">
            <h3>System Revenue</h3>
            <p className="card-value">ETB {Number(data.summary.systemRevenue || 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="summary-card rev">
          <span className="card-icon">🏦</span>
          <div className="card-details">
            <h3>Total Deal Volume</h3>
            <p className="card-value">ETB {Number(data.summary.totalVolume || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="sat-filters">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All Transactions</option>
          <option value="sale">Sale Revenue Only</option>
          <option value="rent">Rent Revenue Only</option>
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
            <h3>🏡 Sale Transactions</h3>
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
            <h3>🔑 Rent Transactions</h3>
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
                    <strong>Agreement Reference</strong>
                    <p>Req #{selectedTx.agreement_id}</p>
                  </div>
                  <div className="tx-box amount info">
                    <strong>Gross Amount</strong>
                    <p>{Number(selectedTx.sale_amount).toLocaleString()} ETB</p>
                  </div>
                  <div className="tx-box amount comm">
                    <strong>System Commission</strong>
                    <p>{Number(selectedTx.commission).toLocaleString()} ETB</p>
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
                    <p>Rent Performance - {selectedTx.is_initial ? "Initial Agreement" : "Monthly Revenue"}</p>
                  </div>
                  <div className="tx-box">
                    <strong>Property Name</strong>
                    <p>{selectedTx.property_name}</p>
                  </div>
                  <div className="tx-box">
                    <strong>Tenant Name</strong>
                    <p>{selectedTx.tenant_name}</p>
                  </div>
                  <div className="tx-box amount info">
                    <strong>Total Amount Paid</strong>
                    <p>{Number(selectedTx.rent_amount).toLocaleString()} ETB</p>
                  </div>
                  <div className="tx-box">
                    <strong>System Commission (%)</strong>
                    <p>{selectedTx.commission_percentage}%</p>
                  </div>
                  <div className="tx-box amount comm">
                    <strong>System Fee Amount</strong>
                    <p>{Number(selectedTx.commission).toLocaleString()} ETB</p>
                  </div>
                  <div className="tx-box amount net">
                    <strong>Net Amount to Owner</strong>
                    <p>{Number(selectedTx.net_amount).toLocaleString()} ETB</p>
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
