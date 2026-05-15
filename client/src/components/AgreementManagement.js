import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AgreementManagement.css";

const AgreementManagement = ({ user, onLogout, onSettingsClick, hideHeader = false }) => {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [selectedAgreementDetails, setSelectedAgreementDetails] =
    useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [formData, setFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyDocuments, setPropertyDocuments] = useState([]);
  const [agreementDocuments, setAgreementDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);

  const API_BASE = `${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api`;

  useEffect(() => {
    fetchAgreements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAgreements = async () => {
    try {
      setLoading(true);
      let data = [];

      if (user.role === "user") {
        try {
          const response = await axios.get(`${API_BASE}/agreement-workflow/buyer/${user.id}`);
          data = response.data?.agreements || response.data || [];
        } catch (err) {
          console.warn("Falling back to legacy customer endpoint");
          const response = await axios.get(`${API_BASE}/agreement-requests/customer/${user.id}`);
          data = response.data?.agreements || response.data || [];
        }
      } else if (
        user.role === "property_admin" ||
        user.role === "system_admin"
      ) {
        // Try agreement-workflow/admin/all first, fall back to agreement-requests
        try {
          const response = await axios.get(`${API_BASE}/agreement-workflow/admin/all`);
          if (response.data && typeof response.data === 'object' && !response.data.toString().startsWith('<!DOCTYPE')) {
            data = response.data?.agreements || response.data || [];
          } else {
            throw new Error('Invalid response format');
          }
        } catch (workflowError) {
          console.warn('Agreement workflow endpoint failed, trying fallback:', workflowError.message);
          try {
            const fallback = await axios.get(`${API_BASE}/agreement-requests/admin/pending`);
            data = fallback.data?.agreements || fallback.data || [];
          } catch (fallbackError) {
            console.warn('Fallback endpoint also failed:', fallbackError.message);
            // Last resort: try the history endpoint
            try {
              const historyFallback = await axios.get(`${API_BASE}/agreement-requests/admin/history`);
              data = historyFallback.data?.agreements || historyFallback.data || [];
            } catch (e) {
              console.error('All agreement endpoints failed');
              data = [];
            }
          }
        }
      } else if (user.role === "broker") {
        try {
          const response = await axios.get(`${API_BASE}/agreement-workflow/broker/${user.id}`);
          data = response.data?.agreements || response.data || [];
        } catch (err) {
          console.warn("Falling back to legacy broker endpoint");
          const response = await axios.get(`${API_BASE}/agreement-requests/broker/${user.id}`);
          data = response.data?.agreements || response.data || [];
        }
      } else if (user.role === "owner") {
        try {
          const response = await axios.get(`${API_BASE}/agreement-workflow/owner/${user.id}`);
          data = response.data?.agreements || response.data || [];
        } catch (err) {
          console.warn("Falling back to legacy owner endpoint");
          const response = await axios.get(`${API_BASE}/agreement-requests/owner/${user.id}`);
          data = response.data?.agreements || response.data || [];
        }
      }

      setAgreements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching agreements:", error);
      setAgreements([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgreementDetails = async (agreement) => {
    try {
      // Fetch customer profile
      const customerRes = await axios
        .get(
          `${API_BASE}/profiles/customer/${agreement.customer_id}`,
        )
        .catch(() => null);
      const customerProfile = customerRes?.data || {};

      // Fetch owner profile
      const ownerRes = await axios
        .get(`${API_BASE}/profiles/owner/${agreement.owner_id}`)
        .catch(() => null);
      const ownerProfile = ownerRes?.data || {};

      // Fetch property documents
      const docsRes = await axios
        .get(
          `${API_BASE}/documents/property/${agreement.property_id}`,
        )
        .catch(() => null);
      const docs = docsRes?.data || [];
      setPropertyDocuments(docs);

      // Fetch agreement documents
      const agreementDocsRes = await axios
        .get(`${API_BASE}/documents/agreement/${agreement.id}`)
        .catch(() => null);
      const agDocs = agreementDocsRes?.data || [];
      setAgreementDocuments(agDocs);

      setSelectedAgreementDetails({
        ...agreement,
        customerProfile,
        ownerProfile,
      });
    } catch (error) {
      console.error("Error fetching agreement details:", error);
      setSelectedAgreementDetails(agreement);
    }
  };

  const handleViewDocument = (document) => {
    setSelectedDocument(document);
    setShowDocumentViewer(true);
  };

  const getDocumentIcon = (documentType) => {
    const icons = {
      title_deed: "📜",
      survey_plan: "📐",
      tax_clearance: "✅",
      building_permit: "🏗️",
      other: "📄",
      initial: "📝",
      customer_edited: "✏️",
      final: "✓",
    };
    return icons[documentType] || "📄";
  };

  // Comprehensive status mapping for all agreement workflow states
  const getStatusBadge = (status) => {
    const badges = {
      pending: { emoji: "⏳", label: "Pending", color: "#f59e0b", group: "pending" },
      pending_admin_review: { emoji: "⏳", label: "Pending Admin Review", color: "#f59e0b", group: "pending" },
      admin_reviewing: { emoji: "🔍", label: "Admin Reviewing", color: "#8b5cf6", group: "pending" },
      forwarded_to_owner: { emoji: "➡️", label: "Forwarded to Owner", color: "#8b5cf6", group: "pending" },
      waiting_owner_response: { emoji: "⏳", label: "Waiting for Your Response", color: "#8b5cf6", group: "pending" },
      owner_counter_offer: { emoji: "💬", label: "Owner Counter Offer", color: "#f59e0b", group: "pending" },
      counter_offer: { emoji: "💬", label: "Counter Offer", color: "#f59e0b", group: "pending" },
      counter_offer_forwarded: { emoji: "📧", label: "Counter Offer Sent", color: "#3b82f6", group: "pending" },
      buyer_counter_offer: { emoji: "💬", label: "Buyer Counter Offer", color: "#f59e0b", group: "pending" },
      buyer_counter_offer_forwarded: { emoji: "💬", label: "Buyer Counter Offer Review", color: "#f59e0b", group: "pending" },
      owner_accepted: { emoji: "✅", label: "Owner Accepted", color: "#10b981", group: "accepted" },
      accepted: { emoji: "✅", label: "Accepted", color: "#10b981", group: "accepted" },
      agreement_generated: { emoji: "📄", label: "Agreement Generated", color: "#3b82f6", group: "accepted" },
      agreement_sent: { emoji: "📧", label: "Agreement Sent", color: "#3b82f6", group: "accepted" },
      buyer_signed: { emoji: "✍️", label: "Buyer Signed", color: "#10b981", group: "accepted" },
      customer_signed: { emoji: "✍️", label: "Customer Signed", color: "#10b981", group: "accepted" },
      owner_signed: { emoji: "✍️", label: "Owner Signed", color: "#10b981", group: "accepted" },
      fully_signed: { emoji: "📝", label: "Fully Signed", color: "#10b981", group: "accepted" },
      both_signed: { emoji: "📝", label: "Both Signed", color: "#10b981", group: "accepted" },
      payment_submitted: { emoji: "💳", label: "Payment Submitted", color: "#f97316", group: "waiting_payment" },
      payment_pending: { emoji: "⏳", label: "Awaiting Payment", color: "#f97316", group: "waiting_payment" },
      payment_verified: { emoji: "💰", label: "Payment Verified", color: "#10b981", group: "waiting_payment" },
      payment_confirmed: { emoji: "💰", label: "Payment Confirmed", color: "#10b981", group: "waiting_payment" },
      handover_confirmed: { emoji: "🤝", label: "Handover Confirmed", color: "#10b981", group: "accepted" },
      completed: { emoji: "🎉", label: "Completed", color: "#059669", group: "completed" },
      owner_rejected: { emoji: "❌", label: "Owner Rejected", color: "#ef4444", group: "rejected" },
      rejected: { emoji: "❌", label: "Rejected", color: "#ef4444", group: "rejected" },
      cancelled: { emoji: "🚫", label: "Cancelled", color: "#6b7280", group: "rejected" },
    };
    return badges[status] || { emoji: "❓", label: status || "Unknown", color: "#6b7280", group: "other" };
  };

  const handleAction = (agreement, type) => {
    setSelectedAgreement(agreement);
    setModalType(type);
    setFormData({});
    setShowModal(true);
  };

  const handleViewDetails = async (agreement) => {
    await fetchAgreementDetails(agreement);
    setModalType("details");
    setShowModal(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedAgreement) return;

    setActionLoading(true);
    try {
      let endpoint = "";
      let method = "POST";
      let data = {};

      switch (modalType) {
        case "generate":
          endpoint = `/api/agreement-workflow/${selectedAgreement.id}/generate-agreement`;
          data = {
            admin_id: user.id,
            template_id: formData.template_id || 1,
          };
          break;

        case "payment":
          endpoint = `/api/agreement-workflow/${selectedAgreement.id}/submit-payment`;
          data = {
            customer_id: user.id,
            payment_method: formData.payment_method,
            payment_amount: formData.payment_amount,
            receipt_file_path: formData.receipt_file_path,
          };
          break;

        case "upload_receipt":
          endpoint = `/api/agreement-workflow/${selectedAgreement.id}/upload-receipt`;
          data = {
            user_id: user.id,
            receipt_file_path: formData.receipt_file_path,
            receipt_file_name: formData.receipt_file_name,
          };
          break;

        case "send_agreement":
          endpoint = `/api/agreement-workflow/${selectedAgreement.id}/send-agreement`;
          data = {
            admin_id: user.id,
            recipient_id: formData.recipient_id,
          };
          break;

        case "notify":
          endpoint = `/api/agreement-workflow/${selectedAgreement.id}/notify`;
          data = {
            user_id: user.id,
            notification_message: formData.notification_message,
          };
          break;

        default:
          return;
      }

      const response = await axios({
        method,
        url: `${API_BASE.replace('/api', '')}${endpoint}`,
        data,
      });

      alert(`✅ ${response.data.message}`);
      setShowModal(false);
      fetchAgreements();
    } catch (error) {
      alert(`❌ Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Compute counts per group
  const getCounts = () => {
    const counts = { all: agreements.length, pending: 0, accepted: 0, waiting_payment: 0, completed: 0, rejected: 0 };
    agreements.forEach(a => {
      const group = getStatusBadge(a.status).group;
      if (counts[group] !== undefined) counts[group]++;
    });
    return counts;
  };
  const counts = getCounts();

  // Filter agreements by group + search
  const filteredAgreements = agreements.filter(a => {
    // Group filter
    if (filter !== "all") {
      const group = getStatusBadge(a.status).group;
      if (group !== filter) return false;
    }
    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const idMatch = String(a.id).includes(term);
      const titleMatch = (a.property_title || "").toLowerCase().includes(term);
      const customerMatch = (a.customer_name || "").toLowerCase().includes(term);
      const ownerMatch = (a.owner_name || "").toLowerCase().includes(term);
      const locationMatch = (a.property_location || "").toLowerCase().includes(term);
      const statusMatch = (a.status || "").toLowerCase().includes(term);
      return idMatch || titleMatch || customerMatch || ownerMatch || locationMatch || statusMatch;
    }
    return true;
  });

  // Status step progress for visual timeline
  const getStepProgress = (status) => {
    const steps = [
      'pending_admin_review', 'forwarded_to_owner', 'owner_accepted',
      'agreement_generated', 'both_signed', 'payment_submitted',
      'payment_confirmed', 'completed'
    ];
    const idx = steps.indexOf(status);
    if (status === 'completed') return 100;
    if (status === 'owner_rejected' || status === 'rejected' || status === 'cancelled') return -1;
    if (idx === -1) return 15;
    return Math.round(((idx + 1) / steps.length) * 100);
  };

  return (
    <div className="agreement-management-page">
      {/* Clean header without duplicate profile/settings/logout */}
      {!hideHeader && (
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #3b82f6 100%)',
          padding: '28px 30px',
          borderRadius: '0 0 16px 16px',
          color: '#fff',
          marginBottom: '0'
        }}>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            📋 Agreements Tracker
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '0.9rem', opacity: 0.85 }}>
            Monitor and manage all property agreements, payments, and workflow progress
          </p>
        </div>
      )}

      <div className="management-container" style={{ padding: '20px 30px' }}>
        {/* Search Bar */}
        <div style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>🔍</span>
              <input
                type="text"
                placeholder="Search by Agreement ID, property name, customer, owner, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '14px',
                background: '#fff',
                cursor: 'pointer',
                minWidth: '200px',
                outline: 'none'
              }}
            >
              <option value="all">📋 All Agreements ({counts.all})</option>
              <option value="pending">⏳ Pending ({counts.pending})</option>
              <option value="accepted">✅ Accepted ({counts.accepted})</option>
              <option value="waiting_payment">💳 Waiting Payment ({counts.waiting_payment})</option>
              <option value="completed">🎉 Completed ({counts.completed})</option>
              <option value="rejected">❌ Rejected ({counts.rejected})</option>
            </select>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '15px',
          marginBottom: '25px'
        }}>
          {[
            { label: 'All', count: counts.all, color: '#3b82f6', bg: '#eff6ff', icon: '📋', filterVal: 'all' },
            { label: 'Pending', count: counts.pending, color: '#f59e0b', bg: '#fffbeb', icon: '⏳', filterVal: 'pending' },
            { label: 'Accepted', count: counts.accepted, color: '#10b981', bg: '#ecfdf5', icon: '✅', filterVal: 'accepted' },
            { label: 'Waiting Payment', count: counts.waiting_payment, color: '#f97316', bg: '#fff7ed', icon: '💳', filterVal: 'waiting_payment' },
            { label: 'Completed', count: counts.completed, color: '#059669', bg: '#ecfdf5', icon: '🎉', filterVal: 'completed' },
            { label: 'Rejected', count: counts.rejected, color: '#ef4444', bg: '#fef2f2', icon: '❌', filterVal: 'rejected' },
          ].map(stat => (
            <div
              key={stat.filterVal}
              onClick={() => setFilter(stat.filterVal)}
              style={{
                background: filter === stat.filterVal ? stat.color : stat.bg,
                color: filter === stat.filterVal ? '#fff' : stat.color,
                padding: '18px 16px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: `1px solid ${filter === stat.filterVal ? stat.color : '#e2e8f0'}`,
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>{stat.icon}</div>
              <div style={{ fontSize: '28px', fontWeight: '700' }}>{stat.count}</div>
              <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Agreements List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⏳</div>
            <p>Loading agreements...</p>
          </div>
        ) : filteredAgreements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📋</div>
            <h3>No agreements found</h3>
            <p>No agreements match your current search or filter</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {filteredAgreements.map((agreement, idx) => {
              const badge = getStatusBadge(agreement.status);
              const progress = getStepProgress(agreement.status);
              return (
                <div key={agreement.id || `agreement-${idx}`} style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s'
                }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>
                        Agreement #{agreement.id}
                      </h3>
                      <span style={{
                        background: badge.color + "15",
                        color: badge.color,
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        border: `1px solid ${badge.color}30`
                      }}>
                        {badge.emoji} {badge.label}
                      </span>
                      {agreement.agreement_type && (
                        <span style={{
                          background: agreement.agreement_type === 'rent' ? '#dbeafe' : '#fef3c7',
                          color: agreement.agreement_type === 'rent' ? '#1d4ed8' : '#92400e',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {agreement.agreement_type === 'rent' ? '🔑 Rental' : '🏷️ Sale'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      📅 {new Date(agreement.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {progress >= 0 && (
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Progress</span>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{progress}%</span>
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
                        <div style={{
                          background: progress === 100 ? '#059669' : progress > 60 ? '#10b981' : progress > 30 ? '#f59e0b' : '#3b82f6',
                          width: `${progress}%`,
                          height: '100%',
                          borderRadius: '10px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Card Body */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                    <div style={{ fontSize: '13px' }}>
                      <span style={{ color: '#94a3b8' }}>Property: </span>
                      <strong>{agreement.property_title || 'N/A'}</strong>
                    </div>
                    <div style={{ fontSize: '13px' }}>
                      <span style={{ color: '#94a3b8' }}>Customer: </span>
                      <strong>{agreement.customer_name || 'N/A'}</strong>
                    </div>
                    <div style={{ fontSize: '13px' }}>
                      <span style={{ color: '#94a3b8' }}>Owner: </span>
                      <strong>{agreement.owner_name || 'N/A'}</strong>
                    </div>
                    <div style={{ fontSize: '13px' }}>
                      <span style={{ color: '#94a3b8' }}>Location: </span>
                      <strong>{agreement.property_location || 'N/A'}</strong>
                    </div>
                    {agreement.property_price && (
                      <div style={{ fontSize: '13px' }}>
                        <span style={{ color: '#94a3b8' }}>Price: </span>
                        <strong style={{ color: '#059669' }}>
                          {Number(agreement.proposed_price || agreement.property_price).toLocaleString()} ETB
                        </strong>
                      </div>
                    )}
                    {agreement.commission_percentage && (
                      <div style={{ fontSize: '13px' }}>
                        <span style={{ color: '#94a3b8' }}>Commission: </span>
                        <strong>{agreement.commission_percentage}%</strong>
                      </div>
                    )}
                  </div>

                  {/* Payment Info (for waiting_payment states) */}
                  {(agreement.status === 'payment_submitted' || agreement.status === 'payment_pending' || agreement.status === 'payment_confirmed') && (
                    <div style={{
                      background: '#fff7ed',
                      border: '1px solid #fed7aa',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      marginBottom: '15px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div>
                        <span style={{ fontWeight: '600', color: '#9a3412' }}>💳 Payment Status: </span>
                        <span style={{ color: '#c2410c' }}>
                          {agreement.status === 'payment_submitted' ? 'Receipt Submitted — Awaiting Confirmation'
                            : agreement.status === 'payment_pending' ? 'Payment Pending'
                            : '✅ Payment Confirmed'}
                        </span>
                      </div>
                      {agreement.receipt_document && (
                        <span style={{ fontSize: '12px', color: '#9a3412', background: '#ffedd5', padding: '4px 10px', borderRadius: '6px' }}>
                          📄 Receipt attached
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                    {/* Customer Actions */}
                    {user.role === "user" &&
                      (agreement.status === "pending" ||
                        agreement.status === "pending_admin_review") && (
                        <>
                          <button
                            style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                            onClick={() => handleAction(agreement, "payment")}
                          >
                            💳 Submit Payment
                          </button>
                          <button
                            style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                            onClick={() =>
                              handleAction(agreement, "upload_receipt")
                            }
                          >
                            📄 Upload Receipt
                          </button>
                        </>
                      )}

                    {/* Admin Actions — Restricted to Property Admin */}
                    {user.role === "property_admin" && (
                      <>
                        {(agreement.status === "pending" ||
                          agreement.status === "pending_admin_review") && (
                          <>
                            <button
                              style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                              onClick={() =>
                                handleAction(agreement, "generate")
                              }
                            >
                              📄 Generate Agreement
                            </button>
                            <button
                              style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                              onClick={() =>
                                handleAction(agreement, "send_agreement")
                              }
                            >
                              📧 Send Agreement
                            </button>
                          </>
                        )}
                        <button
                          style={{ background: '#8b5cf6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                          onClick={() => handleAction(agreement, "notify")}
                        >
                          🔔 Notify
                        </button>
                      </>
                    )}

                    {/* View Details — always visible */}
                    <button
                      style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                      onClick={() => handleViewDetails(agreement)}
                    >
                      👁️ View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>
                {modalType === "details" && "📋 Agreement Details"}
                {modalType === "generate" && "📄 Generate Agreement"}
                {modalType === "payment" && "💳 Submit Payment"}
                {modalType === "upload_receipt" && "📄 Upload Receipt"}
                {modalType === "send_agreement" && "📧 Send Agreement"}
                {modalType === "notify" && "🔔 Send Notification"}
              </h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {modalType === "details" && selectedAgreementDetails && (
                <div className="details-view">
                  {/* Agreement Information */}
                  <div className="detail-section">
                    <h3>📋 Agreement Information</h3>
                    <div className="detail-grid">
                      <div>
                        <strong>Agreement ID:</strong>{" "}
                        {selectedAgreementDetails.id}
                      </div>
                      <div>
                        <strong>Status:</strong>{" "}
                        <span style={{ color: getStatusBadge(selectedAgreementDetails.status).color, fontWeight: '600' }}>
                          {getStatusBadge(selectedAgreementDetails.status).emoji} {getStatusBadge(selectedAgreementDetails.status).label}
                        </span>
                      </div>
                      <div>
                        <strong>Property:</strong>{" "}
                        {selectedAgreementDetails.property_title}
                      </div>
                      <div>
                        <strong>Location:</strong>{" "}
                        {selectedAgreementDetails.property_location}
                      </div>
                      <div>
                        <strong>Type:</strong>{" "}
                        {selectedAgreementDetails.agreement_type || 'Sale'}
                      </div>
                      <div>
                        <strong>Created:</strong>{" "}
                        {new Date(
                          selectedAgreementDetails.created_at,
                        ).toLocaleString()}
                      </div>
                      {selectedAgreementDetails.property_price && (
                        <div>
                          <strong>Property Price:</strong>{" "}
                          {Number(selectedAgreementDetails.property_price).toLocaleString()} ETB
                        </div>
                      )}
                      {selectedAgreementDetails.proposed_price && (
                        <div>
                          <strong>Proposed Price:</strong>{" "}
                          {Number(selectedAgreementDetails.proposed_price).toLocaleString()} ETB
                        </div>
                      )}
                      {selectedAgreementDetails.commission_percentage && (
                        <div>
                          <strong>Commission:</strong>{" "}
                          {selectedAgreementDetails.commission_percentage}%
                        </div>
                      )}
                      {selectedAgreementDetails.request_message && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <strong>Message:</strong>{" "}
                          {selectedAgreementDetails.request_message}
                        </div>
                      )}
                      {selectedAgreementDetails.customer_notes && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <strong>Customer Notes:</strong>{" "}
                          {selectedAgreementDetails.customer_notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="detail-section">
                    <h3>👤 Customer Information</h3>
                    <div className="detail-grid">
                      <div>
                        <strong>Full Name:</strong>{" "}
                        {selectedAgreementDetails.customer_name || "N/A"}
                      </div>
                      <div>
                        <strong>User ID:</strong>{" "}
                        {selectedAgreementDetails.customer_id}
                      </div>
                      {selectedAgreementDetails.customerProfile && (
                        <>
                          <div>
                            <strong>Email:</strong>{" "}
                            {selectedAgreementDetails.customerProfile.email ||
                              "N/A"}
                          </div>
                          <div>
                            <strong>Phone:</strong>{" "}
                            {selectedAgreementDetails.customerProfile.phone ||
                              "N/A"}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Owner Information */}
                  <div className="detail-section">
                    <h3>🏠 Owner Information</h3>
                    <div className="detail-grid">
                      <div>
                        <strong>Full Name:</strong>{" "}
                        {selectedAgreementDetails.owner_name || "N/A"}
                      </div>
                      <div>
                        <strong>User ID:</strong>{" "}
                        {selectedAgreementDetails.owner_id}
                      </div>
                      {selectedAgreementDetails.ownerProfile && (
                        <>
                          <div>
                            <strong>Email:</strong>{" "}
                            {selectedAgreementDetails.ownerProfile.email ||
                              "N/A"}
                          </div>
                          <div>
                            <strong>Phone:</strong>{" "}
                            {selectedAgreementDetails.ownerProfile.phone ||
                              "N/A"}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Payment Status Section */}
                  {(selectedAgreementDetails.status?.includes('payment') || selectedAgreementDetails.receipt_document) && (
                    <div className="detail-section">
                      <h3>💳 Payment Information</h3>
                      <div className="detail-grid">
                        <div>
                          <strong>Payment Status:</strong>{" "}
                          <span style={{ color: getStatusBadge(selectedAgreementDetails.status).color, fontWeight: '600' }}>
                            {getStatusBadge(selectedAgreementDetails.status).label}
                          </span>
                        </div>
                        {selectedAgreementDetails.receipt_document && (
                          <div>
                            <strong>Receipt:</strong> 📄 Attached
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Property Documents */}
                  {propertyDocuments.length > 0 && (
                    <div className="detail-section">
                      <h3>📄 Property Documents</h3>
                      <div className="documents-list">
                        {propertyDocuments.map((doc, idx) => (
                          <div key={doc.id || `prop-doc-${idx}`} className="document-item">
                            <span className="doc-icon">
                              {getDocumentIcon(doc.document_type)}
                            </span>
                            <span className="doc-name">
                              {doc.document_name}
                            </span>
                            <span className="doc-type">
                              ({doc.document_type})
                            </span>
                            <button
                              className="btn-view-doc"
                              onClick={() => handleViewDocument(doc)}
                              title="View document"
                            >
                              👁️ View
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Agreement Documents */}
                  {agreementDocuments.length > 0 && (
                    <div className="detail-section">
                      <h3>📋 Agreement Documents</h3>
                      <div className="documents-list">
                        {agreementDocuments.map((doc, idx) => (
                          <div key={doc.id || `agr-doc-${idx}`} className="document-item">
                            <span className="doc-icon">
                              {getDocumentIcon(doc.document_type)}
                            </span>
                            <span className="doc-name">
                              Agreement v{doc.version}
                            </span>
                            <span className="doc-type">
                              ({doc.document_type})
                            </span>
                            <button
                              className="btn-view-doc"
                              onClick={() => handleViewDocument(doc)}
                              title="View document"
                            >
                              👁️ View
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {modalType === "generate" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmitAction();
                  }}
                >
                  <div className="form-group">
                    <label>Template ID</label>
                    <input
                      type="number"
                      value={formData.template_id || 1}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          template_id: e.target.value,
                        })
                      }
                    />
                  </div>
                </form>
              )}

              {modalType === "payment" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmitAction();
                  }}
                >
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select
                      value={formData.payment_method || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          payment_method: e.target.value,
                        })
                      }
                      required
                    >
                      <option value="">Select method</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Payment Amount (ETB)</label>
                    <input
                      type="number"
                      value={formData.payment_amount || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          payment_amount: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Receipt File Path</label>
                    <input
                      type="text"
                      value={formData.receipt_file_path || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          receipt_file_path: e.target.value,
                        })
                      }
                      placeholder="/uploads/receipt.pdf"
                    />
                  </div>
                </form>
              )}

              {modalType === "upload_receipt" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmitAction();
                  }}
                >
                  <div className="form-group">
                    <label>Receipt File Path</label>
                    <input
                      type="text"
                      value={formData.receipt_file_path || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          receipt_file_path: e.target.value,
                        })
                      }
                      placeholder="/uploads/receipt.pdf"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Receipt File Name</label>
                    <input
                      type="text"
                      value={formData.receipt_file_name || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          receipt_file_name: e.target.value,
                        })
                      }
                      placeholder="receipt.pdf"
                    />
                  </div>
                </form>
              )}

              {modalType === "send_agreement" && selectedAgreement && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmitAction();
                  }}
                >
                  <div className="form-group">
                    <label>Send To</label>
                    <select
                      value={formData.recipient_id || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          recipient_id: e.target.value,
                        })
                      }
                      required
                    >
                      <option value="">Select recipient</option>
                      <option value={selectedAgreement.customer_id}>
                        Customer - {selectedAgreement.customer_name}
                      </option>
                      <option value={selectedAgreement.owner_id}>
                        Owner - {selectedAgreement.owner_name}
                      </option>
                    </select>
                  </div>
                </form>
              )}

              {modalType === "notify" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmitAction();
                  }}
                >
                  <div className="form-group">
                    <label>Notification Message</label>
                    <textarea
                      value={formData.notification_message || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          notification_message: e.target.value,
                        })
                      }
                      rows="4"
                      placeholder="Enter notification message..."
                      required
                    />
                  </div>
                </form>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              {modalType !== "details" && (
                <button
                  className="btn-primary"
                  onClick={handleSubmitAction}
                  disabled={actionLoading}
                >
                  {actionLoading ? "⏳ Processing..." : "✅ Confirm"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {showDocumentViewer && selectedDocument && (
        <div
          className="modal-overlay"
          onClick={() => setShowDocumentViewer(false)}
        >
          <div
            className="modal-content document-viewer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>👁️ Document Viewer</h2>
              <button
                className="close-btn"
                onClick={() => setShowDocumentViewer(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body document-body">
              <div className="document-info">
                <div>
                  <strong>Document Name:</strong>{" "}
                  {selectedDocument.document_name ||
                    `Agreement v${selectedDocument.version}`}
                </div>
                <div>
                  <strong>Type:</strong> {selectedDocument.document_type}
                </div>
                <div>
                  <strong>Uploaded:</strong>{" "}
                  {new Date(
                    selectedDocument.uploaded_at ||
                      selectedDocument.generated_date,
                  ).toLocaleString()}
                </div>
              </div>

              <div className="document-preview">
                {selectedDocument.document_path ? (
                  <>
                    {selectedDocument.document_path.match(
                      /\.(pdf|doc|docx)$/i,
                    ) ? (
                      <div className="document-file-preview">
                        <p>📄 Document File</p>
                        <p>{selectedDocument.document_path}</p>
                        <a
                          href={`${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}${selectedDocument.document_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary"
                        >
                          📥 Download
                        </a>
                      </div>
                    ) : selectedDocument.document_path.match(
                        /\.(jpg|jpeg|png|gif)$/i,
                      ) ? (
                      <div className="document-image-preview">
                        <img
                          src={`${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}${selectedDocument.document_path}`}
                          alt="Document"
                        />
                      </div>
                    ) : (
                      <div className="document-file-preview">
                        <p>📎 File: {selectedDocument.document_path}</p>
                        <a
                          href={`${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}${selectedDocument.document_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary"
                        >
                          📥 Open File
                        </a>
                      </div>
                    )}
                  </>
                ) : selectedDocument.document_content ? (
                  <div className="document-content-preview">
                    <pre>
                      {JSON.stringify(
                        JSON.parse(selectedDocument.document_content),
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                ) : (
                  <div className="document-empty">
                    <p>No document content available</p>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowDocumentViewer(false)}
              >
                Close
              </button>
              {selectedDocument.document_path && (
                <a
                  href={`${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}${selectedDocument.document_path}`}
                  download
                  className="btn-primary"
                >
                  📥 Download
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgreementManagement;
