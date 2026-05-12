import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./RentalLedger.css";

const API = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000/api`;

// ── Helper: human-readable schedule label ──
const scheduleLabel = (s) => {
  const map = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    semi_annual: "Semi-Annually",
    annual: "Annually",
    yearly: "Annually"
  };
  return map[s] || "Monthly";
};

// ── Helper: installment period label ──
const periodLabel = (s) => {
  const map = {
    monthly: "Month",
    quarterly: "Quarter",
    semi_annual: "Half-Year",
    annual: "Year",
    yearly: "Year"
  };
  return map[s] || "Month";
};

// ── Helper: schedule badge color ──
const scheduleBadgeStyle = (s) => {
  const map = {
    monthly: { background: "#dbeafe", color: "#1e40af", border: "1px solid #93c5fd" },
    quarterly: { background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" },
    semi_annual: { background: "#e0e7ff", color: "#3730a3", border: "1px solid #a5b4fc" },
    annual: { background: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7" },
    yearly: { background: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7" }
  };
  return map[s] || map.monthly;
};

const RentalLedger = ({ user }) => {
  const [payments, setPayments] = useState([]);
  const [grouped, setGrouped] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [formData, setFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);

  const isOwner = user?.role === "owner";
  const isTenant = user?.role === "user" || user?.role === "customer";
  const isAdmin = user?.role === "admin" || user?.role === "system_admin" || user?.role === "property_admin";

  const fetchBankAccounts = useCallback(async () => {
    try {
      const res = await axios.get(`http://${window.location.hostname}:5000/api/bank-accounts/active`);
      setBankAccounts(res.data || []);
    } catch (err) { console.error(err); }
  }, []);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      let res;
      if (isAdmin) {
        res = await axios.get(`${API}/rental-payments/admin/all`);
        setPayments(res.data.payments || []);
        // Group admin view by property
        const g = {};
        for (const pay of (res.data.payments || [])) {
          const key = pay.property_id;
          if (!g[key]) {
            g[key] = {
              property_id: pay.property_id,
              property_title: pay.property_title,
              property_location: pay.property_location,
              tenant_name: pay.tenant_name,
              owner_name: pay.owner_name,
              payment_schedule: pay.payment_schedule || "monthly",
              lease_duration_months: pay.lease_duration_months,
              installments: []
            };
          }
          g[key].installments.push(pay);
        }
        setGrouped(Object.values(g));
      } else if (isOwner) {
        res = await axios.get(`${API}/rental-payments/owner/${user.id}`);
        setPayments(res.data.payments || []);
        setGrouped(res.data.grouped || []);
      } else {
        res = await axios.get(`${API}/rental-payments/tenant/${user.id}`);
        setPayments(res.data.payments || []);
        setGrouped(res.data.grouped || []);
      }
    } catch (err) {
      console.error("Error fetching rental payments:", err);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, isOwner]);

  useEffect(() => {
    if (user) {
      fetchPayments();
      fetchBankAccounts();
    }
  }, [user, fetchPayments, fetchBankAccounts]);

  // Summary stats
  const totalInstallments = payments.length;
  const paidCount = payments.filter(p => p.status === "paid").length;
  const pendingCount = payments.filter(p => p.status === "pending").length;
  const overdueCount = payments.filter(p => p.status === "overdue").length;
  const submittedCount = payments.filter(p => p.status === "submitted").length;
  const totalPaid = payments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const totalDue = payments.filter(p => ["pending", "overdue"].includes(p.status)).reduce((s, p) => s + Number(p.amount), 0);

  // ── Pay Modal ──
  const openPayModal = (payment) => {
    setSelectedPayment(payment);
    setFormData({ payment_method: "bank_transfer", transaction_reference: "", receipt_url: "" });
    setShowPayModal(true);
  };

  const handlePay = async () => {
    if (!formData.transaction_reference) {
      alert("Please enter a transaction reference");
      return;
    }
    try {
      setActionLoading(true);
      await axios.post(`${API}/rental-payments/pay/${selectedPayment.id}`, {
        tenant_id: user.id,
        payment_method: formData.payment_method,
        transaction_reference: formData.transaction_reference,
        receipt_url: formData.receipt_url || ""
      });
      setShowPayModal(false);
      fetchPayments();
    } catch (err) {
      alert(err.response?.data?.message || "Payment submission failed");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Verify Modal ──
  const openVerifyModal = (payment) => {
    setSelectedPayment(payment);
    setFormData({ decision: "approve", notes: "" });
    setShowVerifyModal(true);
  };

  const handleVerify = async () => {
    try {
      setActionLoading(true);
      await axios.put(`${API}/rental-payments/verify/${selectedPayment.id}`, {
        owner_id: user.id,
        decision: formData.decision,
        notes: formData.notes,
        is_admin: isAdmin
      });
      setShowVerifyModal(false);
      fetchPayments();
    } catch (err) {
      alert(err.response?.data?.message || "Verification failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Check overdue (admin only)
  const handleCheckOverdue = async () => {
    try {
      const res = await axios.put(`${API}/rental-payments/check-overdue`);
      alert(res.data.message);
      fetchPayments();
    } catch (err) {
      alert("Failed to check overdue payments");
    }
  };

  // Check if a payment is due within 7 days
  const isDueSoon = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = (due - now) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const statusEmoji = {
    paid: "✅",
    pending: "⏳",
    overdue: "🔴",
    submitted: "📤",
    cancelled: "❌"
  };

  if (loading) {
    return (
      <div className="rental-ledger">
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <p>Loading rental payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rental-ledger">
      {/* Compact Horizontal Header Bar */}
      <div className="ledger-compact-header">
        <div className="ledger-header-top">
          <h2>🏠 Rent Payments</h2>
          <div className="ledger-header-actions">
            {isAdmin && (
              <button className="header-action-pill overdue-pill" onClick={handleCheckOverdue}>
                ⚠️ Check Overdue
              </button>
            )}
            <button className="header-action-pill refresh-pill" onClick={fetchPayments}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Compact Stats Row */}
        <div className="ledger-stats-row">
          <div className="stat-pill total-pill">
            <span className="pill-icon">📊</span>
            <span className="pill-value">{totalInstallments}</span>
            <span className="pill-label">Total</span>
          </div>
          <div className="stat-pill paid-pill">
            <span className="pill-icon">✅</span>
            <span className="pill-value">{paidCount}</span>
            <span className="pill-label">Paid</span>
          </div>
          <div className="stat-pill submitted-pill">
            <span className="pill-icon">📤</span>
            <span className="pill-value">{submittedCount}</span>
            <span className="pill-label">Awaiting</span>
          </div>
          <div className="stat-pill pending-pill">
            <span className="pill-icon">⏳</span>
            <span className="pill-value">{pendingCount}</span>
            <span className="pill-label">Pending</span>
          </div>
          <div className="stat-pill overdue-pip">
            <span className="pill-icon">🔴</span>
            <span className="pill-value">{overdueCount}</span>
            <span className="pill-label">Overdue</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-pill money-paid-pill">
            <span className="pill-icon">💰</span>
            <span className="pill-value">{totalPaid.toLocaleString()}</span>
            <span className="pill-label">Paid (ETB)</span>
          </div>
          <div className="stat-pill money-due-pill">
            <span className="pill-icon">📋</span>
            <span className="pill-value">{totalDue.toLocaleString()}</span>
            <span className="pill-label">Due (ETB)</span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {grouped.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p><strong>No rental payments found</strong></p>
          <p style={{ fontSize: "0.85rem" }}>
            {isTenant && "Rental payment schedules will appear here once your lease is active."}
            {isOwner && "Tenant payment schedules will appear here for your rental properties."}
            {isAdmin && "No rental payment schedules have been created yet."}
          </p>
        </div>
      )}

      {/* Payment Groups */}
      {grouped.map((group, gi) => {
        const sched = group.payment_schedule || "monthly";
        const badgeStyle = scheduleBadgeStyle(sched);

        return (
          <div key={gi} className="property-group">
            <div className="property-group-header">
              <div>
                <h3>🏠 {group.property_title}</h3>
                <span className="pg-meta">📍 {group.property_location}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                {/* Schedule Badge */}
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    marginBottom: 6,
                    ...badgeStyle
                  }}
                >
                  🗓️ {scheduleLabel(sched)} Schedule
                </span>
                <br />
                {group.lease_duration_months && (
                  <span className="pg-meta" style={{ marginRight: 12 }}>
                    ⏳ {group.lease_duration_months} Month Lease
                  </span>
                )}
                {isTenant && <span className="pg-meta">Landlord: {group.owner_name}</span>}
                {isOwner && <span className="pg-meta">Tenant: {group.tenant_name}</span>}
                {isAdmin && <span className="pg-meta">{group.tenant_name} → {group.owner_name}</span>}
              </div>
            </div>

            <table className="payment-table">
              <thead>
                <tr>
                  <th>{periodLabel(sched)} #</th>
                  <th>Due Date</th>
                  <th>{scheduleLabel(sched)} Rent</th>
                  <th>Status</th>
                  <th>Paid On</th>
                  <th>Reference</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {group.installments.map((pay) => {
                  const dueSoon = isDueSoon(pay.due_date);
                  const rowClass = pay.status === "overdue" ? "overdue-row" : dueSoon && pay.status === "pending" ? "due-soon-row" : "";

                  return (
                    <tr key={pay.id} className={rowClass}>
                      <td><strong>{pay.installment_number}</strong></td>
                      <td>
                        {formatDate(pay.due_date)}
                        {dueSoon && pay.status === "pending" && (
                          <span style={{ color: "#f59e0b", fontSize: "0.75rem", display: "block" }}>⚡ Due Soon</span>
                        )}
                      </td>
                      <td><strong>{Number(pay.amount).toLocaleString()} ETB</strong></td>
                      <td>
                        <span className={`status-badge ${pay.status}`}>
                          {statusEmoji[pay.status] || "❓"} {pay.status.charAt(0).toUpperCase() + pay.status.slice(1)}
                        </span>
                      </td>
                      <td>{pay.paid_at ? formatDate(pay.paid_at) : "—"}</td>
                      <td>{pay.transaction_reference || "—"}</td>
                      <td>
                        {/* Tenant: Pay button for pending/overdue */}
                        {isTenant && (pay.status === "pending" || pay.status === "overdue") && (
                          <button className="action-btn pay" onClick={() => openPayModal(pay)}>
                            💳 Pay Now
                          </button>
                        )}

                        {/* Owner: Verify/Reject for submitted */}
                        {isOwner && pay.status === "submitted" && (
                          <button className="action-btn verify" onClick={() => openVerifyModal(pay)}>
                            ✅ Verify
                          </button>
                        )}

                        {/* Admin: Can also verify if needed */}
                        {isAdmin && pay.status === "submitted" && (
                          <button className="action-btn verify" onClick={() => openVerifyModal(pay)}>
                            ✅ Verify
                          </button>
                        )}

                        {pay.status === "paid" && (
                          <span style={{ color: "#22c55e", fontSize: "0.8rem", fontWeight: 600 }}>✓ Verified</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* ── Pay Modal ── */}
      {showPayModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>💳 Submit Rent Payment</h3>
            <p style={{ color: "#64748b", marginBottom: 16 }}>
              {periodLabel(selectedPayment.payment_schedule || "monthly")} #{selectedPayment.installment_number} — <strong>{Number(selectedPayment.amount).toLocaleString()} ETB</strong>
              <br />Due: {formatDate(selectedPayment.due_date)}
            </p>

            <div className="form-group">
              <label>Payment Method *</label>
              <select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}>
                <option value="bank_transfer">🏦 Bank Transfer</option>
                <option value="mobile_money">📱 Mobile Money</option>
                <option value="cash">💵 Cash Deposit</option>
              </select>
            </div>

            {(formData.payment_method === 'bank_transfer' || formData.payment_method === 'mobile_money') && (
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "14px", marginBottom: "12px" }}>
                <p style={{ fontSize: 13, color: "#1e40af", margin: '0 0 10px 0', fontWeight: 'bold' }}>
                  🏦 Please transfer the total amount to one of the following DDREMS bank accounts:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {bankAccounts.filter(acc => acc.type === 'bank' || acc.type === 'mobile').length > 0 ? (
                    bankAccounts.filter(acc => acc.type === 'bank' || acc.type === 'mobile').map(acc => (
                      <div key={acc._id} style={{ padding: '10px', background: '#fff', borderRadius: '8px', fontSize: '13px', color: '#1e3a8a', border: '1px solid #93c5fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span><strong>{acc.bank_name}</strong></span>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px' }}>{acc.account_number}</span>
                        <span style={{ color: '#64748b' }}>{acc.account_name}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '10px', background: '#fff', borderRadius: '8px', fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                      No active bank accounts found. Please contact support.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Transaction Reference / Receipt # *</label>
              <input
                type="text"
                placeholder="Enter bank transaction ID or receipt number"
                value={formData.transaction_reference}
                onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Receipt / Proof of Payment (Image/PDF)</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      alert("❌ File too large. Maximum size is 5MB.");
                      e.target.value = "";
                      return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => setFormData({ ...formData, receipt_url: reader.result });
                    reader.readAsDataURL(file);
                  }
                }}
                style={{ width: "100%", padding: "10px", border: "1px dashed #cbd5e1", borderRadius: 8, background: "#f8fafc" }}
              />
              {formData.receipt_url && <p style={{ fontSize: 12, color: "#059669", marginTop: 4 }}>✅ Receipt uploaded successfully</p>}
            </div>
            
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowPayModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handlePay} disabled={actionLoading}>
                {actionLoading ? "Submitting..." : "✅ Submit Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Verify Modal ── */}
      {showVerifyModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowVerifyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>✅ Verify Rent Payment</h3>
            <p style={{ color: "#64748b", marginBottom: 16 }}>
              {periodLabel(selectedPayment.payment_schedule || "monthly")} #{selectedPayment.installment_number} — <strong>{Number(selectedPayment.amount).toLocaleString()} ETB</strong>
              <br />Ref: {selectedPayment.transaction_reference || "N/A"}
              <br />Method: {selectedPayment.payment_method || "N/A"}
            </p>

            {selectedPayment.receipt_url && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: "bold", marginBottom: 6 }}>Receipt / Proof of Payment:</p>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", background: "#f8fafc" }}>
                  {(() => {
                    const url = selectedPayment.receipt_url.startsWith('http') || selectedPayment.receipt_url.startsWith('data:') 
                      ? selectedPayment.receipt_url 
                      : `${API.replace('/api', '')}${selectedPayment.receipt_url}`;
                    if (url.startsWith('data:application/pdf') || url.toLowerCase().endsWith('.pdf')) {
                      return <iframe src={url} style={{ width: "100%", height: "250px", border: "none" }} title="Receipt" />;
                    } else {
                      return <img src={url} alt="Receipt" style={{ width: "100%", maxHeight: "250px", objectFit: "contain", display: "block" }} />;
                    }
                  })()}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Decision *</label>
              <select value={formData.decision} onChange={(e) => setFormData({ ...formData, decision: e.target.value })}>
                <option value="approve">✅ Approve — Payment received</option>
                <option value="reject">❌ Reject — Payment invalid</option>
              </select>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                rows="3"
                placeholder="Optional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowVerifyModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleVerify} disabled={actionLoading}
                style={formData.decision === "reject" ? { background: "linear-gradient(135deg, #ef4444, #dc2626)" } : {}}>
                {actionLoading ? "Processing..." : formData.decision === "approve" ? "✅ Approve" : "❌ Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentalLedger;
