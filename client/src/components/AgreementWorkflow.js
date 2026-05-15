import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./AgreementWorkflow.css";
import PageHeader from "./PageHeader";

const API = `http://${window.location.hostname}:5000/api/agreement-workflow`;

// Helper: detect rental agreement reliably
const isRental = (agr) => agr?.agreement_type === 'rent' || agr?.agreement_type === 'rental' || agr?.property_listing_type === 'rent';
const buyerOrTenant = (agr) => isRental(agr) ? 'Tenant' : 'Buyer';
const ownerOrLandlord = (agr) => isRental(agr) ? 'Landlord' : 'Owner';
const priceOrRent = (agr) => isRental(agr) ? 'Rent' : 'Price';

const getDocumentUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("data:") || path.startsWith("http")) return path;
  
  // If it's a long string and starts with known Base64 headers, it's data
  if (path.length > 200 && (
    path.startsWith('/9j/') || 
    path.startsWith('/QP7Z/') || 
    path.startsWith('iVBOR') || 
    path.startsWith('JVBER')
  )) {
    // Detect type from prefix
    if (path.startsWith('/9j/') || path.startsWith('/QP7Z/')) return `data:image/jpeg;base64,${path}`;
    if (path.startsWith('iVBOR')) return `data:image/png;base64,${path}`;
    if (path.startsWith('JVBER')) return `data:application/pdf;base64,${path}`;
    return `data:image/jpeg;base64,${path}`; // Fallback
  }

  return `http://${window.location.hostname}:5000${path.startsWith("/") ? "" : "/"}${path}`;
};





// ── Reusable Financial Breakdown Component ──
const FinancialBreakdown = ({ agr, formData = {}, compact = false }) => {
  const price = Number(
    formData.counter_price || 
    formData.proposed_price || 
    agr?.counter_offer_price || 
    agr?.proposed_price || 
    agr?.property_price || 
    0
  );
  const hasBroker = !!agr?.broker_id;
  const feePayer = formData.system_fee_payer || agr?.system_fee_payer || 'buyer';
  const sysRate = agr?.system_fee_percentage ? agr.system_fee_percentage / 100 : 0.05;
  const sysFee = price * sysRate;
  const brokerRate = hasBroker ? (agr?.commission_percentage || 2.5) / 100 : 0;
  const brokerFee = price * brokerRate;
  let buyerSys = 0, buyerBrk = 0, ownerSys = 0, ownerBrk = 0;
  if (feePayer === 'buyer') { buyerSys = sysFee; buyerBrk = brokerFee; }
  else if (feePayer === 'owner') { ownerSys = sysFee; ownerBrk = brokerFee; }
  else { buyerSys = sysFee / 2; buyerBrk = brokerFee / 2; ownerSys = sysFee / 2; ownerBrk = brokerFee / 2; }
  const buyerTotal = price + buyerSys + buyerBrk;
  const ownerNet = price - ownerSys - ownerBrk;
  const payerLabel = feePayer === 'buyer' ? 'Buyer pays' : feePayer === 'owner' ? 'Owner pays' : 'Split 50/50';

  const boxStyle = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: compact ? 10 : 14, marginTop: compact ? 8 : 12 };
  const rowStyle = { display: 'flex', justifyContent: 'space-between', fontSize: compact ? 12 : 13, padding: '3px 0' };
  const totalStyle = { ...rowStyle, fontWeight: 700, borderTop: '1px dashed #cbd5e1', paddingTop: 6, marginTop: 4, fontSize: compact ? 13 : 14 };
  return (
    <div style={boxStyle}>
      <div style={{ fontSize: compact ? 11 : 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>💰 Financial Summary</div>
      <div style={rowStyle}><span>Agreed {isRental(agr) ? 'Rent' : 'Price'}:</span><strong>{price.toLocaleString()} ETB</strong></div>
      <div style={rowStyle}><span>System Fee ({(sysRate * 100).toFixed(0)}%) — {payerLabel}:</span><strong>{sysFee.toLocaleString()} ETB</strong></div>
      {hasBroker && <div style={rowStyle}><span>Broker Commission ({(brokerRate * 100).toFixed(1)}%):</span><strong>{brokerFee.toLocaleString()} ETB</strong></div>}
      <div style={{ ...rowStyle, color: '#1e40af' }}><span>Buyer Total:</span><strong>{buyerTotal.toLocaleString()} ETB</strong></div>
      <div style={{ ...totalStyle, color: '#059669' }}><span>Net to {isRental(agr) ? 'Landlord' : 'Owner'}:</span><strong>{ownerNet.toLocaleString()} ETB</strong></div>
    </div>
  );
};


const getSteps = (agr) => [
  { num: 1, label: "Request", icon: "📝" },
  { num: 2, label: "Admin Review", icon: "⏳" },
  { num: 3, label: "Negotiation", icon: "🤝" },
  { num: 4, label: "Forwarded", icon: "➡️" },
  { num: 5, label: "Owner Decision", icon: "⚖️" },
  { num: 6, label: "Finalize Deal", icon: "✅" },
  { num: 7, label: "Generate Contract", icon: "📄" },
  { num: 8, label: "Sign Agreement", icon: "✍️" },
  { num: 9, label: "Property Review", icon: "🔍" },
  { num: 10, label: "Payment", icon: "💰" },
  { num: 11, label: "Handover", icon: "🔑" },
  { num: 12, label: "Complete", icon: "🎉" },
];



const STATUS_MAP = {
  price_negotiation: {
    emoji: "🤝", label: "Price Negotiation", color: "#3b82f6", step: 3
  },
  owner_counter_offered: {
    emoji: "🔄", label: "Owner Counter Offer", color: "#f97316", step: 5
  },
  buyer_counter_offered: {
    emoji: "🔄", label: "Buyer Counter Offer", color: "#8b5cf6", step: 5
  },
  waiting_owner_response: {
    emoji: "⏳", label: "Waiting Owner", color: "#6366f1", step: 5
  },
  owner_accepted: {
    emoji: "✅", label: "Price Agreed", color: "#10b981", step: 6
  },
  pending_admin_review: {
    emoji: "⏳", label: "Pending Admin Review", color: "#f59e0b", step: 2
  },
  owner_rejected: {
    emoji: "❌", label: "Owner Rejected", color: "#ef4444", step: 5
  },
  agreement_generated: {
    emoji: "📄", label: "Agreement Ready", color: "#0891b2", step: 7
  },
  buyer_signed: {
    emoji: "✍️", label: "Buyer Signed", color: "#8b5cf6", step: 8
  },
  fully_signed: {
    emoji: "🔒", label: "Fully Signed", color: "#059669", step: 8
  },
  video_submitted: {
    emoji: "🎥", label: "Video Uploaded", color: "#8b5cf6", step: 9
  },
  media_released: {
    emoji: "🔑", label: "Media Released", color: "#0891b2", step: 9
  },
  media_viewed: {
    emoji: "👀", label: "Media Reviewed", color: "#14b8a6", step: 10
  },
  payment_submitted: {
    emoji: "💰", label: "Payment Submitted", color: "#f59e0b", step: 10
  },
  payment_verified: {
    emoji: "✅", label: "Payment Verified", color: "#10b981", step: 11
  },
  handover_confirmed: {
    emoji: "🔑", label: "Handover Confirmed", color: "#0891b2", step: 11
  },
  completed: {
    emoji: "🎉", label: "Completed", color: "#059669", step: 12
  },
};

const AgreementWorkflow = ({ user, onLogout, initialPropertyId }) => {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [viewDocModal, setViewDocModal] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [viewingDoc, setViewingDoc] = useState(null);
  const [formData, setFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [activeProperties, setActiveProperties] = useState([]);
  const [viewedAgreements, setViewedAgreements] = useState({});
  const [contractHTML, setContractHTML] = useState(null);
  const [contractError, setContractError] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [propertyMedia, setPropertyMedia] = useState(null);
  const [enteredKeys, setEnteredKeys] = useState({});
  const [visibleKeys, setVisibleKeys] = useState({});
  const [bankAccounts, setBankAccounts] = useState([]);

  const contractRef = useRef(null);

  const isAdmin = user.role === "property_admin" || user.role === "system_admin" || user.role === "admin";
  const isOwner = user.role === "owner" || user.role === "landlord";
  const isBuyer = user.role === "user" || user.role === "customer";

  const toggleKey = (docId) => {
    setVisibleKeys(prev => ({ ...prev, [docId]: !prev[docId] }));
  };

  const fetchActiveProperties = useCallback(async () => {
    try {
      const res = await axios.get(
        `http://${window.location.hostname}:5000/api/properties/active`,
      );
      setActiveProperties(res.data || []);
      return res.data || [];
    } catch (err) {
      console.error("Error fetching properties:", err);
      return [];
    }
  }, []);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const res = await axios.get(`http://${window.location.hostname}:5000/api/bank-accounts/active`);
      setBankAccounts(res.data.accounts || res.data || []);
    } catch (err) {
      console.error("Error fetching bank accounts:", err);
    }
  }, []);

  const fetchAgreements = useCallback(async () => {
    try {
      setLoading(true);
      let endpoint = "";
      if (user.role === "property_admin" || user.role === "system_admin") {
        endpoint = `${API}/admin/all`;
      } else if (user.role === "owner") {
        endpoint = `${API}/owner/${user.id}`;
      } else {
        endpoint = `${API}/buyer/${user.id}`;
      }
      const res = await axios.get(endpoint);
      setAgreements(res.data.agreements || []);
    } catch (err) {
      console.error("Error fetching agreements:", err);
    } finally {
      setLoading(false);
    }
  }, [user.id, user.role]);

  const openModal = useCallback(async (agreement, type) => {
    setSelectedAgreement(agreement);
    setModalType(type);
    setFormData({
      system_fee_payer: agreement?.system_fee_payer || "buyer",
      proposed_price: agreement?.proposed_price || "",
      counter_price: agreement?.counter_offer_price || "",
      decision: "",
      notes: ""
    });

    if (type === "view_property_media" || type === "verify_video") {
      try {
        const mRes = await axios.get(`${API}/${agreement.id}/property-media`);
        setPropertyMedia(mRes.data);
      } catch (err) {
        console.error("Error fetching property media:", err);
        setPropertyMedia(null);
      }
    }
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedAgreement(null);
    setPropertyMedia(null);
  }, []);

  const handleViewContract = useCallback(async (id) => {
    setContractHTML(null);
    setContractError(null);
    try {
      const res = await axios.get(`${API}/${id}/view-agreement`);
      if (res.data.success) {
        setContractHTML(res.data.document.document_content);
        setViewedAgreements((prev) => ({ ...prev, [id]: true }));
      } else {
        setContractError(res.data.message || "Failed to load document");
      }
    } catch (err) {
      console.error("Error viewing contract:", err);
      setContractError(err.response?.data?.message || err.message || "Failed to load the contract document.");
    }
  }, []);

  const handleDownloadPDF = async () => {
    if (!contractRef.current) return;
    setDownloadingPdf(true);
    try {
      const canvas = await html2canvas(contractRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = pdfHeight;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      pdf.save(`Agreement_AGR_${selectedAgreement?.id}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Could not generate PDF. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  useEffect(() => {
    fetchAgreements();
    fetchBankAccounts();
    if (user.role === "user" || user.role === "customer") {
      fetchActiveProperties().then((properties) => {
        if (initialPropertyId && properties) {
          const prop = properties.find(p => p.id === initialPropertyId);
          if (prop) {
            setFormData({ property_id: initialPropertyId, agreement_type: prop.listing_type || 'sale', proposed_price: prop.price || '' });
            setModalType("request");
            setShowModal(true);
          }
        }
      });
    }
  }, [initialPropertyId, fetchAgreements, fetchBankAccounts, fetchActiveProperties, user.role]);


  const submitAction = async () => {
    if (!selectedAgreement && modalType !== "request") return;
    setActionLoading(true);

    try {
      let url,
        method = "post",
        data = {};
      const id = selectedAgreement?.id;

      switch (modalType) {
        case "request":
          url = `${API}/request-direct`;
          data = {
            customer_id: user.id,
            property_id: formData.property_id,
            proposed_price: formData.proposed_price,
            move_in_date: formData.move_in_date,
            customer_notes: formData.notes,
            agreement_type: formData.agreement_type || 'sale',
            rental_duration_months: formData.rental_duration_months,
            payment_schedule: formData.payment_schedule,
            security_deposit: formData.security_deposit,
            system_fee_payer: formData.system_fee_payer || 'buyer',
          };
          break;
        case "forward":
          url = `${API}/${id}/forward-to-owner`;
          method = "put";
          data = { admin_id: user.id, admin_notes: formData.notes };
          break;
        case "forward_counter":
          url = `${API}/${id}/forward-counter-offer`;
          method = "put";
          data = { admin_id: user.id, admin_notes: formData.notes };
          break;
        case "forward_buyer_counter":
          url = `${API}/${id}/forward-buyer-counter`;
          method = "put";
          data = { admin_id: user.id, admin_notes: formData.notes };
          break;
        case "buyer_counter_response":
          url = `${API}/${id}/buyer-counter-negotiate`;
          method = "put";
          data = {
            buyer_id: user.id,
            decision: formData.decision,
            buyer_notes: formData.notes,
            counter_price: formData.counter_price,
            system_fee_payer: formData.system_fee_payer,
          };
          break;
        case "decision":
          url = `${API}/${id}/owner-negotiate-response`;
          method = "put";
          data = {
            owner_id: user.id,
            decision: formData.decision,
            owner_notes: formData.notes,
            counter_price: formData.counter_price,
            system_fee_payer: formData.system_fee_payer,
          };
          break;
        case "generate":
          url = `${API}/${id}/generate-agreement`;
          data = { admin_id: user.id, template_id: 1 };
          break;
        case "buyer_sign":
          url = `${API}/${id}/buyer-sign`;
          method = "put";
          data = { buyer_id: user.id };
          break;
        case "owner_sign":
          url = `${API}/${id}/owner-sign`;
          method = "put";
          data = { owner_id: user.id };
          break;
        case "verify_video":
          url = `${API}/${id}/verify-video`;
          method = "put";
          data = { admin_id: user.id };
          break;
        case "view_property_media":
          url = `${API}/${id}/mark-media-viewed`;
          method = "put";
          data = { buyer_id: user.id };
          break;
        case "submit_payment": {
            const price = Number(selectedAgreement?.proposed_price || selectedAgreement?.property_price || 0);
            const hasBroker = !!selectedAgreement?.broker_id;
            const feePayer = selectedAgreement?.system_fee_payer || 'buyer';
            const sysRate = hasBroker ? 0.02 : 0.05;
            const sysFee = price * sysRate;
            const brokerRate = hasBroker ? (selectedAgreement?.commission_percentage || 2.5) / 100 : 0;
            const brokerFee = price * brokerRate;
            let buyerFee = 0;
            if (feePayer === 'buyer') buyerFee = sysFee + brokerFee;
            else if (feePayer === 'split') buyerFee = (sysFee + brokerFee) / 2;
            const totalAmount = price + buyerFee;

            // If Chapa is selected and amount is within limit, redirect to Chapa
            if (formData.payment_method === 'chapa' && totalAmount <= 100000) {
              try {
                const chapaRes = await axios.post(`${API.replace('/agreement-workflow', '').replace('/api', '/api/chapa')}/initialize`, {
                  amount: totalAmount,
                  email: user.email || "payment@gmail.com",
                  first_name: user.first_name || user.name?.split(' ')[0] || 'Customer',
                  last_name: user.last_name || user.name?.split(' ')[1] || 'Name',
                  agreementId: id,
                  returnUrl: `${window.location.origin}/?page=chapa`
                });
                if (chapaRes.data.success && chapaRes.data.checkout_url) {
                  window.location.href = chapaRes.data.checkout_url;
                  return;
                } else {
                  throw new Error(chapaRes.data.message || 'Failed to initialize Chapa');
                }
              } catch (err) {
                const errMsg = err.response?.data?.message || err.message;
                alert(`❌ ${typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg}`);
                setActionLoading(false);
                return;
              }
            }

            // Manual payment methods (bank_transfer, cash)
            if (!formData.payment_method) {
              alert("❌ Please select a payment method.");
              setActionLoading(false);
              return;
            }
            if (!formData.payment_reference) {
              alert("❌ Please enter a transaction reference number.");
              setActionLoading(false);
              return;
            }

            url = `${API}/${id}/submit-payment`;
            data = {
              buyer_id: user.id,
              payment_method: formData.payment_method,
              payment_amount: totalAmount,
              payment_reference: formData.payment_reference,
              receipt_document: formData.receipt_document,
            };
            break;
          }
        case "verify_payment":
          url = `${API}/${id}/verify-payment`;
          method = "put";
          data = { admin_id: user.id, admin_notes: formData.notes };
          break;
        case "upload_video":
          url = `${API}/${id}/upload-video`;
          method = "put";
          data = { owner_id: user.id, video_url: formData.video_url };
          break;
        case "confirm_handover":
          url = `${API}/${id}/confirm-handover`;
          method = "put";
          data = { buyer_id: user.id };
          break;
        case "release_funds":
          url = `${API}/${id}/release-funds`;
          method = "put";
          data = {
            admin_id: user.id,
            commission_percentage: formData.commission_percentage || 5,
            admin_notes: formData.notes,
          };
          break;
        default:
          return;
      }

      const res = await axios({ method, url, data });
      alert(`✅ ${res.data.message}`);
      closeModal();
      fetchAgreements();
    } catch (err) {
      alert(`❌ ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getBadge = (status) =>
    STATUS_MAP[status] || {
      emoji: "❓",
      label: status,
      color: "#6b7280",
      step: 0,
    };
  const getProgress = (step) => Math.min((step / 12) * 100, 100);

  // ── Render each agreement card ──
  const renderCard = (agr) => {
    const badge = getBadge(agr.status);
    return (
      <div key={agr.id} className="agreement-card">
        {/* ── Header ── */}
        <div className="card-top">
          <div className="card-top-left">
            <h3>Agreement #{agr.id}</h3>
            <span
              className="status-pill"
              style={{
                background: badge.color + "18",
                color: badge.color,
                borderColor: badge.color + "40",
              }}
            >
              {badge.emoji} {badge.label}
            </span>
          </div>
          <span className="step-chip" style={{ color: badge.color }}>
            Step {agr.current_step}/12
          </span>
        </div>

        {/* ── Step Progress ── */}
        <div className="step-dots">
          {getSteps(agr).map((s) => (
            <div
              key={s.num}
              className={`dot ${agr.current_step >= s.num ? "active" : ""} ${agr.current_step === s.num ? "current" : ""}`}
              title={s.label}
              style={
                agr.current_step >= s.num ? { background: badge.color } : {}
              }
            >
              <span>{s.icon}</span>
            </div>
          ))}
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${getProgress(agr.current_step)}%`,
              background: badge.color,
            }}
          />
        </div>

        {/* ── Info ── */}
        <div className="card-info">
          <div className="info-row">
            <span className="lbl">🏠 Property</span>
            <span className="val">{agr.property_title || "N/A"}</span>
          </div>
          {isRental(agr) && (
            <div className="info-row">
              <span className="lbl">🏷️ Type</span>
              <span className="val" style={{ color: '#065f46', fontWeight: 700 }}>🔑 Rental</span>
            </div>
          )}
          <div className="info-row">
            <span className="lbl">👤 {buyerOrTenant(agr)}</span>
            <span className="val">{agr.customer_name || "N/A"}</span>
          </div>
          <div className="info-row">
            <span className="lbl">🏢 {ownerOrLandlord(agr)}</span>
            <span className="val">{agr.owner_name || "N/A"}</span>
          </div>
          <div className="info-row">
            <span className="lbl">💰 {priceOrRent(agr)}</span>
            <span className="val">
              {Number(
                agr.proposed_price || agr.property_price || 0,
              ).toLocaleString()}{" "}
              ETB{isRental(agr) ? ' / month' : ''}
            </span>
          </div>
          {isRental(agr) && (
            <>
              <div className="info-row">
                <span className="lbl">📅 Duration</span>
                <span className="val">{agr.rental_duration_months || 12} Months</span>
              </div>
              <div className="info-row">
                <span className="lbl">🗓️ Schedule</span>
                <span className="val" style={{ textTransform: 'capitalize' }}>{agr.payment_schedule || 'monthly'}</span>
              </div>
            </>
          )}
          {agr.move_in_date && (
            <div className="info-row">
              <span className="lbl">📅 Move-in</span>
              <span className="val">
                {new Date(agr.move_in_date).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="info-row">
            <span className="lbl">📆 Requested</span>
            <span className="val">
              {new Date(agr.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* ── Signature Status ── */}
        {agr.current_step >= 4 && (
          <div className="sig-status">
            <span className={agr.buyer_signed || agr.buyer_signed_date ? "signed" : "unsigned"}>
              {agr.buyer_signed || agr.buyer_signed_date ? "✅" : "⬜"} {buyerOrTenant(agr)}{" "}
              {agr.buyer_signed || agr.buyer_signed_date ? "Digital Signature" : "Waiting Signature"}
            </span>
            <span className={agr.owner_signed || agr.owner_signed_date ? "signed" : "unsigned"}>
              {agr.owner_signed || agr.owner_signed_date ? "✅" : "⬜"} {ownerOrLandlord(agr)}{" "}
              {agr.owner_signed || agr.owner_signed_date ? "Digital Signature" : "Waiting Signature"}
            </span>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="card-actions">
          {renderActions(agr)}
          <button
            className="btn-outline"
            onClick={() => openModal(agr, "details")}
          >
            👁️ Details
          </button>
        </div>
      </div>
    );
  };

  // ── Role-based action buttons ──
  const renderActions = (agr) => {
    return (
      <>
        {/* ── Admin Actions ── */}
        {isAdmin && (agr.status === "pending_admin_review" || agr.status === "price_negotiation") && (
          <button
            className="btn-primary"
            onClick={() => openModal(agr, "forward")}
          >
            ➡️ Forward to Owner
          </button>
        )}
        {isAdmin && agr.status === "counter_offer" && (
          <button
            className="btn-warning"
            onClick={() => openModal(agr, "forward_counter")}
          >
            🔄 Forward Counter Offer to {buyerOrTenant(agr)}
          </button>
        )}
        {isAdmin && agr.status === "buyer_counter_offer" && (
          <button
            className="btn-warning"
            onClick={() => openModal(agr, "forward_buyer_counter")}
          >
            🔄 Forward {buyerOrTenant(agr)} Counter to {ownerOrLandlord(agr)}
          </button>
        )}
        {isAdmin && (agr.status === "owner_accepted" || agr.status === "pending_admin_review") && (
          <button
            className="btn-success"
            onClick={() => openModal(agr, "generate")}
          >
            📄 Generate Agreement
          </button>
        )}
        {isAdmin && agr.status === "video_submitted" && (
          <button
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
            onClick={() => openModal(agr, "verify_video")}
          >
            🔑 Verify Video & Release Media
          </button>
        )}
        {isAdmin && agr.status === "fully_signed" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#f0f9ff', borderRadius: '10px', color: '#0369a1', fontWeight: 600, border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⏳ Awaiting Owner to upload property video tour...</span>
          </div>
        )}
        {isAdmin && agr.status === "payment_submitted" && (
          <button
            className="btn-warning"
            onClick={() => openModal(agr, "verify_payment")}
          >
            ✅ Verify Payment
          </button>
        )}
        {isAdmin && agr.status === "handover_confirmed" && (
          <button
            className="btn-success"
            onClick={() => openModal(agr, "release_funds")}
          >
            💸 Release Funds
          </button>
        )}

        {isOwner && (
          agr.status === "waiting_owner_response" || 
          agr.status === "price_negotiation" || 
          agr.status === "buyer_counter_offer_forwarded" || 
          agr.status === "buyer_counter_offered"
        ) && (
          <button
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
            onClick={() => openModal(agr, "decision")}
          >
            👁️ View & Decide
          </button>
        )}
        {isOwner && agr.status === "pending_admin_review" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#fffbeb', borderRadius: '10px', color: '#92400e', fontWeight: 600, border: '1px solid #fef3c7', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⏳ Waiting for Admin to review the buyer's request...</span>
          </div>
        )}
        {isOwner && agr.status === "counter_offer" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#fffbeb', borderRadius: '10px', color: '#92400e', fontWeight: 600, border: '1px solid #fef3c7', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⏳ Waiting for Admin to forward your counter-offer...</span>
          </div>
        )}
        {isOwner && agr.status === "owner_counter_offered" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#f5f3ff', borderRadius: '10px', color: '#5b21b6', fontWeight: 600, border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⏳ Waiting for Buyer to respond to your counter-offer...</span>
          </div>
        )}
        {isOwner && agr.status === "owner_accepted" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#f0fdf4', borderRadius: '10px', color: '#166534', fontWeight: 600, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>✅ You accepted the offer! Waiting for Admin to generate the contract...</span>
          </div>
        )}
        {isOwner && agr.status === "agreement_generated" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#eff6ff', borderRadius: '10px', color: '#1e40af', fontWeight: 600, border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⏳ Contract generated. Waiting for Buyer to sign first...</span>
          </div>
        )}
        {isOwner && agr.status === "buyer_signed" && (
          <button
            className="btn-success"
            onClick={() => openModal(agr, "owner_sign")}
          >
            ✍️ Sign Agreement
          </button>
        )}
        {isOwner && agr.status === "fully_signed" && (
          <button
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
            onClick={() => openModal(agr, "upload_video")}
          >
            🎥 Upload Property Video Tour
          </button>
        )}
        {isOwner && agr.status === "video_submitted" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#fffbeb', borderRadius: '10px', color: '#92400e', fontWeight: 600, border: '1px solid #fef3c7', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⏳ Video submitted. Waiting for Admin to verify...</span>
          </div>
        )}
        {isOwner && agr.status === "media_released" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#f5f3ff', borderRadius: '10px', color: '#5b21b6', fontWeight: 600, border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⏳ Media released to Buyer. Waiting for Buyer to review...</span>
          </div>
        )}
        {isOwner && agr.status === "media_viewed" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#eff6ff', borderRadius: '10px', color: '#1e40af', fontWeight: 600, border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⏳ Buyer has reviewed the media. Waiting for payment submission...</span>
          </div>
        )}
        {isOwner && agr.status === "payment_submitted" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#fff7ed', borderRadius: '10px', color: '#c2410c', fontWeight: 600, border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⏳ Buyer submitted payment. Waiting for Admin verification...</span>
          </div>
        )}
        {isOwner && agr.status === "payment_verified" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className="btn-success"
              onClick={() => openModal(agr, "confirm_handover")}
              disabled={agr.owner_handover_confirmed}
            >
              {agr.owner_handover_confirmed ? "✅ Handover Confirmed" : "🔑 Confirm Key Handover"}
            </button>
            {agr.owner_handover_confirmed && !agr.buyer_handover_confirmed && (
              <div className="status-badge-inline" style={{ fontSize: '11px', background: '#fef9c3', color: '#854d0e' }}>
                <span>⏳ Waiting for Buyer to confirm key receipt...</span>
              </div>
            )}
            {agr.buyer_handover_confirmed && !agr.owner_handover_confirmed && (
              <div className="status-badge-inline" style={{ fontSize: '11px', background: '#f0fdf4', color: '#166534' }}>
                <span>👉 Buyer confirmed receipt! Please confirm handover.</span>
              </div>
            )}
          </div>
        )}
        {isOwner && agr.status === "handover_confirmed" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#f0fdf4', borderRadius: '10px', color: '#166534', fontWeight: 600, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🔑 Handover confirmed! Waiting for Admin to release funds.</span>
          </div>
        )}
        {isOwner && agr.status === "completed" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#f0fdf4', borderRadius: '10px', color: '#059669', fontWeight: 600, border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🎉 Agreement completed successfully! Funds released.</span>
          </div>
        )}

        {/* ── Tenant/Buyer Actions ── */}
        {isBuyer && agr.status === "price_negotiation" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#eff6ff', borderRadius: '10px', color: '#1e40af', fontWeight: 600, border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📝 Your agreement request has been submitted. Waiting for Admin to review and forward to the Owner...</span>
          </div>
        )}
        {isBuyer && agr.status === "pending_admin_review" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#fffbeb', borderRadius: '10px', color: '#92400e', fontWeight: 600, border: '1px solid #fef3c7', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⏳ Admin is reviewing your request...</span>
          </div>
        )}
        {isBuyer && agr.status === "waiting_owner_response" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#f5f3ff', borderRadius: '10px', color: '#5b21b6', fontWeight: 600, border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⏳ Your offer has been forwarded to the Owner. Waiting for their response...</span>
          </div>
        )}
        {isBuyer &&
          (agr.status === "counter_offer" ||
            agr.status === "counter_offer_forwarded" ||
            agr.status === "owner_counter_offered") && (
            <button
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
              onClick={() => openModal(agr, "buyer_counter_response")}
            >
              👁️ View & Decide
            </button>
          )}
        {isBuyer && agr.status === "owner_accepted" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#f0fdf4', borderRadius: '10px', color: '#166534', fontWeight: 600, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>✅ Owner accepted your offer! Admin will generate the contract shortly...</span>
          </div>
        )}
        {isBuyer && agr.status === "owner_rejected" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#fef2f2', borderRadius: '10px', color: '#991b1b', fontWeight: 600, border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>❌ Owner rejected your offer. You may submit a new agreement request.</span>
          </div>
        )}
        {isBuyer && agr.status === "agreement_generated" && (
          <button
            className="btn-success"
            onClick={() => openModal(agr, "buyer_sign")}
          >
            ✍️ Sign Agreement
          </button>
        )}
        {isBuyer && agr.status === "buyer_signed" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#eff6ff', borderRadius: '10px', color: '#1e40af', fontWeight: 600, border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>✍️ You have signed! Waiting for Owner to sign the agreement...</span>
          </div>
        )}
        {isBuyer && agr.status === "media_released" && (
          <button
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #0891b2, #0e7490)' }}
            onClick={() => openModal(agr, "view_property_media")}
          >
            🎥 Review Property Media
          </button>
        )}
        {isBuyer && agr.status === "fully_signed" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#fff7ed', borderRadius: '10px', color: '#c2410c', fontWeight: 600, border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⏳ Waiting for Owner to upload property video tour...</span>
          </div>
        )}
        {isBuyer && agr.status === "video_submitted" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#f0f9ff', borderRadius: '10px', color: '#0369a1', fontWeight: 600, border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⏳ Owner uploaded video. Waiting for Admin verification...</span>
          </div>
        )}
        {isBuyer && (agr.status === "media_viewed" || agr.status === "payment_rejected") && (
          <button
            className="btn-success"
            onClick={() => openModal(agr, "submit_payment")}
          >
            💰 Submit Payment
          </button>
        )}
        {isBuyer && agr.status === "payment_submitted" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#fffbeb', borderRadius: '10px', color: '#92400e', fontWeight: 600, border: '1px solid #fef3c7', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>💰 Payment submitted! Waiting for Admin to verify your payment...</span>
          </div>
        )}
        {isBuyer && agr.status === "payment_verified" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className="btn-success"
              onClick={() => openModal(agr, "confirm_handover")}
              disabled={agr.buyer_handover_confirmed}
            >
              {agr.buyer_handover_confirmed ? "✅ Handover Confirmed" : "🔑 Confirm Key Handover"}
            </button>
            {agr.buyer_handover_confirmed && !agr.owner_handover_confirmed && (
              <div className="status-badge-inline" style={{ fontSize: '11px', background: '#fef9c3', color: '#854d0e' }}>
                <span>⏳ Waiting for Owner to confirm handover...</span>
              </div>
            )}
            {!agr.buyer_handover_confirmed && agr.owner_handover_confirmed && (
              <div className="status-badge-inline" style={{ fontSize: '11px', background: '#f0fdf4', color: '#166534' }}>
                <span>👉 Owner has confirmed key handover! Please confirm receipt.</span>
              </div>
            )}
          </div>
        )}
        {isBuyer && agr.status === "handover_confirmed" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#f0fdf4', borderRadius: '10px', color: '#166534', fontWeight: 600, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🔑 Handover confirmed! Admin will release funds to complete the deal.</span>
          </div>
        )}
        {isBuyer && agr.status === "completed" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#f0fdf4', borderRadius: '10px', color: '#059669', fontWeight: 600, border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🎉 Agreement completed successfully! Congratulations on your new property.</span>
          </div>
        )}
        {["agreement_generated", "buyer_signed", "fully_signed", "video_submitted", "media_released", "media_viewed", "payment_submitted", "payment_verified", "handover_confirmed", "completed"].includes(agr.status) && (
          <button
            className="btn-outline"
            onClick={() => {
              handleViewContract(agr.id);
              openModal(agr, "view_agreement");
            }}
          >
            📄 View Agreement
          </button>
        )}
      </>
    );
  };

  // ── Modal Content ──
  const renderModalContent = () => {
    if (modalType === "details" && selectedAgreement) {
      const a = selectedAgreement;
      const badge = getBadge(a.status);
      return (
        <div className="details-view">
          <div className="detail-header">
            <span
              className="status-pill large"
              style={{ background: badge.color + "18", color: badge.color }}
            >
              {badge.emoji} {badge.label}
            </span>
            <span>Step {a.current_step} / 12</span>
          </div>
          <div className="detail-grid">
            <div>
              <strong>Agreement ID</strong>
              <span>#{a.id}</span>
            </div>
            <div>
              <strong>Property</strong>
              <span>{a.property_title}</span>
            </div>
            <div>
              <strong>Location</strong>
              <span>{a.property_location || "N/A"}</span>
            </div>
            <div>
              <strong>{buyerOrTenant(a)}</strong>
              <span>{a.customer_name}</span>
            </div>
            <div>
              <strong>{ownerOrLandlord(a)}</strong>
              <span>{a.owner_name}</span>
            </div>
            <div>
              <strong>Listed {priceOrRent(a)}</strong>
              <span>{Number(a.listed_price || 0).toLocaleString()} ETB{isRental(a) ? ' / month' : ''}</span>
            </div>
            <div>
              <strong>Proposed Price</strong>
              <span>
                {Number(
                  a.proposed_price || a.property_price || 0,
                ).toLocaleString()}{" "}
                ETB {isRental(a) ? '/ month' : ''}
              </span>
            </div>
            {isRental(a) && (
              <>
                <div>
                  <strong>Lease Duration</strong>
                  <span>{a.rental_duration_months || 12} Months</span>
                </div>
                <div>
                  <strong>Payment Schedule</strong>
                  <span style={{ textTransform: 'capitalize' }}>{a.payment_schedule || 'monthly'}</span>
                </div>
                {a.security_deposit > 0 && (
                  <div>
                    <strong>Security Deposit</strong>
                    <span>{Number(a.security_deposit).toLocaleString()} ETB</span>
                  </div>
                )}
              </>
            )}
            {a.move_in_date && (
              <div>
                <strong>Move-in Date</strong>
                <span>{new Date(a.move_in_date).toLocaleDateString()}</span>
              </div>
            )}
            <div>
              <strong>{buyerOrTenant(a)} Digital Signature</strong>
              <span>{a.buyer_signed || a.buyer_signed_date ? "✅ Confirmed" : "⏳ Waiting"}</span>
            </div>
            <div>
              <strong>{ownerOrLandlord(a)} Digital Signature</strong>
              <span>{a.owner_signed || a.owner_signed_date ? "✅ Confirmed" : "⏳ Waiting"}</span>
            </div>
            <div>
              <strong>Payment</strong>
              <span>
                {a.payment_submitted
                  ? a.payment_verified
                    ? "✅ Verified"
                    : "⏳ Pending Verification"
                  : "❌ Not Paid"}
              </span>
            </div>
            <div>
              <strong>Handover</strong>
              <span>
                {a.handover_confirmed ? "✅ Confirmed" : "❌ Not Yet"}
              </span>
            </div>
            {a.total_commission && (
              <div>
                <strong>Commission</strong>
                <span>
                  {Number(a.total_commission).toLocaleString()} ETB (
                  {a.commission_percentage}%)
                </span>
              </div>
            )}
            <div>
              <strong>System Fee Payer</strong>
              <span style={{ textTransform: 'capitalize', fontWeight: 600, color: '#1e40af' }}>
                {a.system_fee_payer === 'both' || a.system_fee_payer === 'split' ? '50/50 Split' : (a.system_fee_payer || 'buyer')}
              </span>
            </div>
            <div>
              <strong>Created</strong>
              <span>{new Date(a.created_at).toLocaleString()}</span>
            </div>
          </div>

          {/* ── Financial Breakdown ── */}
          <FinancialBreakdown agr={a} formData={formData} />

          {a.customer_notes && (
            <div className="note-box">
              <strong>{buyerOrTenant(a)} Notes:</strong> {a.customer_notes}
            </div>
          )}
          {a.owner_notes && (
            <div className="note-box">
              <strong>Owner Notes:</strong> {a.owner_notes}
            </div>
          )}
          {a.admin_notes && (
            <div className="note-box">
              <strong>Admin Notes:</strong> {a.admin_notes}
            </div>
          )}

          {/* ── Inline Actions inside Details ── */}
          {(() => {
            // Buyer/Tenant responding to a forwarded counter offer

            // Buyer/Tenant responding to a forwarded counter offer
            if (
              isBuyer &&
              (a.status === "counter_offer" ||
                a.status === "counter_offer_forwarded" ||
                a.status === "owner_counter_offered")
            ) {
              return (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "16px",
                    background: "#fff7ed",
                    borderRadius: "10px",
                    border: "1px solid #fed7aa",
                  }}
                >
                  <h4 style={{ margin: "0 0 12px", color: "#c2410c" }}>
                    🔄 {ownerOrLandlord(a)}'s Counter Offer — Your Response
                  </h4>
                  <div className="form-group" style={{ marginBottom: "12px" }}>
                    <label
                      style={{
                        display: "block",
                        fontWeight: 600,
                        marginBottom: "6px",
                        fontSize: "13px",
                      }}
                    >
                      Your Response *
                    </label>
                    <select
                      value={formData.decision || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, decision: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "14px",
                      }}
                    >
                      <option value="">Select your response</option>
                      <option value="accepted">
                        ✅ Accept — Agree to owner's terms
                      </option>
                      <option value="counter_offer">
                        🔄 Counter Offer — Propose different terms
                      </option>
                      <option value="rejected">
                        ❌ Reject — Decline this offer
                      </option>
                    </select>
                  </div>
                  {formData.decision === "counter_offer" && (
                    <div
                      className="form-group"
                      style={{ marginBottom: "12px" }}
                    >
                      <label
                        style={{
                          display: "block",
                          fontWeight: 600,
                          marginBottom: "6px",
                          fontSize: "13px",
                        }}
                      >
                        Your Counter Price (ETB) — optional
                      </label>
                      <input
                        type="number"
                        value={formData.counter_price || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            counter_price: e.target.value,
                          })
                        }
                        placeholder="e.g. 4200000"
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  )}
                  {formData.decision === "counter_offer" && (
                    <div className="form-group" style={{ marginBottom: "12px" }}>
                      <label style={{ display: "block", fontWeight: 600, marginBottom: "6px", fontSize: "13px" }}>
                        System Fee Payer (Total 5%)
                      </label>
                      <select
                        value={formData.system_fee_payer || a.system_fee_payer || "buyer"}
                        onChange={(e) => setFormData({ ...formData, system_fee_payer: e.target.value })}
                        style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px" }}
                      >
                        <option value="buyer">Buyer pays</option>
                        <option value="owner">Owner pays</option>
                        <option value="split">Split 50/50</option>
                      </select>
                    </div>
                  )}
                  <div className="form-group" style={{ marginBottom: "12px" }}>
                    <label
                      style={{
                        display: "block",
                        fontWeight: 600,
                        marginBottom: "6px",
                        fontSize: "13px",
                      }}
                    >
                      {formData.decision === "counter_offer"
                        ? "Counter Offer Message *"
                        : "Message (optional)"}
                    </label>
                    <textarea
                      value={formData.notes || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      rows="3"
                      placeholder={
                        formData.decision === "counter_offer"
                          ? "Explain your counter offer terms..."
                          : "Any message to the owner..."
                      }
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        resize: "vertical",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <button
                    disabled={!formData.decision || actionLoading}
                    onClick={async () => {
                      if (!formData.decision) {
                        alert("Please select a response.");
                        return;
                      }
                      setActionLoading(true);
                      try {
                        const res = await (
                          await import("axios")
                        ).default.put(`${API}/${a.id}/buyer-counter-response`, {
                          buyer_id: user.id,
                          response: formData.decision,
                          counter_price: formData.counter_price,
                          buyer_notes: formData.notes,
                          system_fee_payer: formData.system_fee_payer
                        });
                        alert(`✅ ${res.data.message}`);
                        closeModal();
                        fetchAgreements();
                      } catch (err) {
                        alert(
                          `❌ ${err.response?.data?.message || err.message}`,
                        );
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    style={{
                      padding: "9px 20px",
                      background: "linear-gradient(135deg,#f59e0b,#d97706)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                  >
                    {actionLoading ? "⏳ Submitting..." : "📤 Submit Response"}
                  </button>
                </div>
              );
            }

            // Admin forwarding owner counter offer to buyer
            if (isAdmin && a.status === "counter_offer") {
              return (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "16px",
                    background: "#fffbeb",
                    borderRadius: "10px",
                    border: "1px solid #fde68a",
                  }}
                >
                  <h4 style={{ margin: "0 0 8px", color: "#92400e" }}>
                    🔄 Forward {ownerOrLandlord(a)} Counter Offer to {buyerOrTenant(a)}
                  </h4>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      marginBottom: "12px",
                    }}
                  >
                    <strong>Owner's Terms:</strong>{" "}
                    {a.owner_notes || "No additional notes"}
                  </p>
                  <div className="form-group" style={{ marginBottom: "12px" }}>
                    <label
                      style={{
                        display: "block",
                        fontWeight: 600,
                        marginBottom: "6px",
                        fontSize: "13px",
                      }}
                    >
                      Admin Notes to {buyerOrTenant(a)} (optional)
                    </label>
                    <textarea
                      value={formData.notes || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      rows="2"
                      placeholder={`Add context for the ${buyerOrTenant(a).toLowerCase()}...`}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        resize: "vertical",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <button
                    disabled={actionLoading}
                    onClick={async () => {
                      setActionLoading(true);
                      try {
                        const res = await (
                          await import("axios")
                        ).default.put(`${API}/${a.id}/forward-counter-offer`, {
                          admin_id: user.id,
                          admin_notes: formData.notes,
                        });
                        alert(`✅ ${res.data.message}`);
                        closeModal();
                        fetchAgreements();
                      } catch (err) {
                        alert(
                          `❌ ${err.response?.data?.message || err.message}`,
                        );
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    style={{
                      padding: "9px 20px",
                      background: "linear-gradient(135deg,#f59e0b,#d97706)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                  >
                    {actionLoading ? "⏳ Forwarding..." : `🔄 Forward to ${buyerOrTenant(a)}`}
                  </button>
                </div>
              );
            }

            // Admin forwarding buyer counter offer to owner
            if (isAdmin && a.status === "buyer_counter_offer") {
              return (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "16px",
                    background: "#f5f3ff",
                    borderRadius: "10px",
                    border: "1px solid #ddd6fe",
                  }}
                >
                  <h4 style={{ margin: "0 0 8px", color: "#5b21b6" }}>
                    🔄 Forward {buyerOrTenant(a)} Counter Offer to {ownerOrLandlord(a)}
                  </h4>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      marginBottom: "12px",
                    }}
                  >
                    <strong>{buyerOrTenant(a)}'s Terms:</strong>{" "}
                    {a.customer_notes || "No additional notes"}
                  </p>
                  <div className="form-group" style={{ marginBottom: "12px" }}>
                    <label
                      style={{
                        display: "block",
                        fontWeight: 600,
                        marginBottom: "6px",
                        fontSize: "13px",
                      }}
                    >
                      Admin Notes to Owner (optional)
                    </label>
                    <textarea
                      value={formData.notes || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      rows="2"
                      placeholder="Add context for the owner..."
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        resize: "vertical",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <button
                    disabled={actionLoading}
                    onClick={async () => {
                      setActionLoading(true);
                      try {
                        const res = await (
                          await import("axios")
                        ).default.put(`${API}/${a.id}/forward-buyer-counter`, {
                          admin_id: user.id,
                          admin_notes: formData.notes,
                        });
                        alert(`✅ ${res.data.message}`);
                        closeModal();
                        fetchAgreements();
                      } catch (err) {
                        alert(
                          `❌ ${err.response?.data?.message || err.message}`,
                        );
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    style={{
                      padding: "9px 20px",
                      background: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                  >
                    {actionLoading ? "⏳ Forwarding..." : "🔄 Forward to Owner"}
                  </button>
                </div>
              );
            }

            // Redundant decision logic removed to favor the dedicated decision modal

            return null;
          })()}
        </div>
      );
    }

    if (modalType === "request") {
      return (
        <div className="modal-form">
          <p className="form-desc">
            Submit a request to begin the agreement process for a property.
          </p>
          <div className="form-group">
            <label>Property *</label>
            <select
              value={formData.property_id || ""}
              onChange={(e) => {
                const prop = activeProperties.find(p => p.id === Number(e.target.value));
                setFormData({ ...formData, property_id: e.target.value, agreement_type: prop?.listing_type || 'sale' });
              }}
              required
            >
              <option value="">— Select a property —</option>
              {activeProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} — 📍 {p.location} — {(p.price / 1000000).toFixed(2)}
                  M ETB {p.listing_type === 'rent' ? '🔑 Rent' : '🏷️ Sale'}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Proposed Price (ETB)</label>
            <input
              type="number"
              value={formData.proposed_price || ""}
              onChange={(e) =>
                setFormData({ ...formData, proposed_price: e.target.value })
              }
              placeholder="Leave blank for listed price"
            />
          </div>
          <div className="form-group">
            <label>Preferred Move-in Date</label>
            <input
              type="date"
              value={formData.move_in_date || ""}
              onChange={(e) =>
                setFormData({ ...formData, move_in_date: e.target.value })
              }
            />
          </div>
          {(() => {
            const selectedProp = activeProperties.find(p => p.id === Number(formData.property_id));
            const isRent = selectedProp?.listing_type === 'rent' || formData.agreement_type === 'rent';
            if (!isRent) return null;
            return (
              <>
                <div className="form-group">
                  <label>Lease Duration (Months) *</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.rental_duration_months || 12}
                    onChange={(e) =>
                      setFormData({ ...formData, rental_duration_months: e.target.value, agreement_type: 'rent' })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Payment Schedule</label>
                  <select
                    value={formData.payment_schedule || 'monthly'}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_schedule: e.target.value, agreement_type: 'rent' })
                    }
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi_annual">Semi-Annually</option>
                    <option value="annual">Annually</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Security Deposit (ETB)</label>
                  <input
                    type="number"
                    value={formData.security_deposit || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, security_deposit: e.target.value, agreement_type: 'rent' })
                    }
                    placeholder="e.g. 50000"
                  />
                </div>
              </>
            );
          })()}
          <div className="form-group">
            <label>System Fee (5%) Paid By *</label>
            <select
              value={formData.system_fee_payer || "buyer"}
              onChange={(e) =>
                setFormData({ ...formData, system_fee_payer: e.target.value })
              }
              required
            >
              <option value="buyer">Buyer pays 5%</option>
              <option value="owner">Owner pays 5%</option>
              <option value="split">Split 50/50 (2.5% each)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows="3"
              placeholder="Any additional information..."
            />
          </div>
        </div>
      );
    }

    if (modalType === "forward") {
      return (
        <div className="modal-form">
          <div className="info-banner">
            <p>
              📋 <strong>Property:</strong> {selectedAgreement?.property_title}
            </p>
            <p>
              👤 <strong>{buyerOrTenant(selectedAgreement)}:</strong> {selectedAgreement?.customer_name}
            </p>
            <p>
              💰 <strong>{isRental(selectedAgreement) ? "Proposed Rent" : "Price"}:</strong>{" "}
              {Number(
                selectedAgreement?.proposed_price ||
                selectedAgreement?.property_price ||
                0,
              ).toLocaleString()}{" "}
              ETB{isRental(selectedAgreement) ? " / month" : ""}
            </p>
            {isRental(selectedAgreement) && (
              <p style={{ marginTop: "8px", borderTop: "1px solid #e5e7eb", paddingTop: "8px" }}>
                ⏳ <strong>Duration:</strong> {selectedAgreement.rental_duration_months || 12} Months | 🗓️ <strong>Schedule:</strong> <span style={{ textTransform: 'capitalize' }}>{selectedAgreement.payment_schedule || 'monthly'}</span>
              </p>
            )}
          </div>
          <FinancialBreakdown agr={selectedAgreement} formData={formData} compact />
          <div className="form-group">
            <label>Admin Notes (optional)</label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows="3"
              placeholder="Notes for the property owner..."
            />
          </div>
        </div>
      );
    }

    if (modalType === "forward_counter") {
      return (
        <div className="modal-form">
          <div
            className="info-banner"
            style={{ borderLeft: "4px solid #f59e0b", background: "#fffbeb" }}
          >
            <p>
              🔄 <strong>Counter Offer from Owner</strong>
            </p>
            <p>
              📋 <strong>Property:</strong> {selectedAgreement?.property_title}
            </p>
            <p>
              👤 <strong>Buyer:</strong> {selectedAgreement?.customer_name}
            </p>
            <p style={{ marginTop: "8px", color: "#92400e" }}>
              <strong>Owner's Terms:</strong>{" "}
              {selectedAgreement?.owner_notes || "See owner notes"}
            </p>
          </div>
          <div className="form-group">
            <label>Admin Notes to Buyer (optional)</label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows="3"
              placeholder="Add context for the buyer..."
            />
          </div>
        </div>
      );
    }

    if (modalType === "forward_buyer_counter") {
      const buyerNotes = selectedAgreement?.customer_notes || "";
      // Parse price from notes if present e.g. "Buyer Counter Offer — Price: 4,200,000 ETB: message"
      const priceMatch = buyerNotes.match(/Price:\s*([\d,]+)\s*ETB/);
      const parsedPrice = priceMatch ? priceMatch[1] : null;
      const message = buyerNotes
        .replace(/Buyer Counter Offer.*?ETB:\s*/i, "")
        .replace(/Buyer Counter Offer:\s*/i, "");
      return (
        <div className="modal-form">
          <div
            className="info-banner"
            style={{ borderLeft: "4px solid #8b5cf6", background: "#f5f3ff" }}
          >
            <p>
              🔄 <strong>Counter Offer from Buyer</strong>
            </p>
            <p>
              📋 <strong>Property:</strong> {selectedAgreement?.property_title}
            </p>
            <p>
              👤 <strong>Buyer:</strong> {selectedAgreement?.customer_name}
            </p>
            {parsedPrice && (
              <p
                style={{
                  marginTop: "8px",
                  fontWeight: 700,
                  color: "#5b21b6",
                  fontSize: "15px",
                }}
              >
                💰 Buyer's Counter Price: {parsedPrice} ETB
              </p>
            )}
            {message && (
              <p style={{ marginTop: "6px", color: "#4c1d95" }}>
                <strong>Buyer's Message:</strong> {message}
              </p>
            )}
            {!parsedPrice && !message && (
              <p style={{ marginTop: "8px", color: "#6b7280" }}>
                <strong>Buyer's Notes:</strong>{" "}
                {buyerNotes || "No additional notes"}
              </p>
            )}
          </div>
          <div className="form-group">
            <label>Admin Notes to Owner (optional)</label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows="3"
              placeholder="Add context for the owner..."
            />
          </div>
        </div>
      );
    }

    if (modalType === "buyer_counter_response") {
      return (
        <div className="modal-form">
          <div
            className="info-banner"
            style={{ borderLeft: "4px solid #f97316", background: "#fff7ed" }}
          >
            <p>
              🏠 <strong>Property:</strong> {selectedAgreement?.property_title}
            </p>
            <p>
              👤 <strong>{ownerOrLandlord(selectedAgreement)}:</strong> {selectedAgreement?.owner_name}
            </p>
            <p>
              💰 <strong>Original Price:</strong>{" "}
              {Number(selectedAgreement?.property_price || 0).toLocaleString()}{" "}
              ETB
            </p>
            {selectedAgreement?.counter_offer_price && (
              <p style={{ fontWeight: 700, color: "#c2410c" }}>
                🔄 Owner's Counter: {Number(selectedAgreement.counter_offer_price).toLocaleString()} ETB
              </p>
            )}
            {selectedAgreement?.move_in_date && (
              <p>
                📅 <strong>Move-in:</strong>{" "}
                {new Date(selectedAgreement.move_in_date).toLocaleDateString()}
              </p>
            )}
            <p style={{ gridColumn: '1 / -1', marginTop: "4px", color: "#92400e", fontSize: '13px' }}>
              <strong>Owner's Note:</strong> {selectedAgreement?.owner_notes || "No additional terms."}
            </p>
          </div>
          <FinancialBreakdown agr={selectedAgreement} formData={formData} compact />
          <div className="form-group">
            <label>Your Response *</label>
            <select
              value={formData.decision || ""}
              onChange={(e) =>
                setFormData({ ...formData, decision: e.target.value })
              }
              required
            >
              <option value="">Select your response</option>
              <option value="accept">
                ✅ Accept — Agree to owner's terms
              </option>
              <option value="counter_offer">
                🔄 Counter Offer — Propose different terms
              </option>
              <option value="reject">❌ Reject — Decline this offer</option>
            </select>
          </div>
          {formData.decision === "counter_offer" && (
            <div className="form-group">
              <label>Your Counter Price (ETB) — optional</label>
              <input
                type="number"
                value={formData.counter_price || ""}
                onChange={(e) =>
                  setFormData({ ...formData, counter_price: e.target.value })
                }
                placeholder="e.g. 4200000"
              />
            </div>
          )}
          {(formData.decision === "accept" || formData.decision === "counter_offer") && (
            <div className="form-group">
              <label>System Fee Payer (Total 5%)</label>
              <select
                value={formData.system_fee_payer || selectedAgreement?.system_fee_payer || "buyer"}
                onChange={(e) =>
                  setFormData({ ...formData, system_fee_payer: e.target.value })
                }
              >
                <option value="buyer">Buyer pays</option>
                <option value="owner">Owner pays</option>
                <option value="split">Split 50/50</option>
              </select>
            </div>
          )}
          <div className="form-group">
            <label>
              {formData.decision === "counter_offer"
                ? "Counter Offer Message *"
                : "Message (optional)"}
            </label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows="3"
              placeholder={
                formData.decision === "counter_offer"
                  ? "Explain your counter offer terms..."
                  : "Any message to the owner..."
              }
            />
          </div>
        </div>
      );
    }

    if (modalType === "decision") {
      const isBuyerCounter =
        selectedAgreement?.status === "buyer_counter_offer_forwarded" ||
        selectedAgreement?.status === "buyer_counter_offered";
      const buyerNotes = selectedAgreement?.customer_notes || "";
      const priceMatch = buyerNotes.match(/Price:\s*([\d,]+)\s*ETB/);
      const buyerCounterPrice = priceMatch ? priceMatch[1] : null;
      const buyerMessage = buyerNotes
        .replace(/Buyer Counter Offer.*?ETB:\s*/i, "")
        .replace(/Buyer Counter Offer:\s*/i, "")
        .trim();

      return (
        <div className="modal-form">
          <div
            className="info-banner"
            style={
              isBuyerCounter
                ? { borderLeft: "4px solid #8b5cf6", background: "#f5f3ff" }
                : {}
            }
          >
            <p>
              📋 <strong>Property:</strong> {selectedAgreement?.property_title}
            </p>
            <p>
              👤 <strong>{buyerOrTenant(selectedAgreement)}:</strong> {selectedAgreement?.customer_name}
            </p>
            <p>
              💰{" "}
              <strong>
                {isBuyerCounter ? "Original Price" : `Proposed ${priceOrRent(selectedAgreement)}`}:
              </strong>{" "}
              {Number(
                selectedAgreement?.proposed_price ||
                selectedAgreement?.property_price ||
                0,
              ).toLocaleString()}{" "}
              ETB{isRental(selectedAgreement) ? ' / month' : ''}
            </p>
            {isBuyerCounter && buyerCounterPrice && (
              <p
                style={{
                  marginTop: "8px",
                  fontWeight: 700,
                  color: "#5b21b6",
                  fontSize: "15px",
                }}
              >
                🔄 {buyerOrTenant(selectedAgreement)}'s Counter Price: {buyerCounterPrice} ETB
              </p>
            )}
            {isBuyerCounter && buyerMessage && (
              <p style={{ marginTop: "6px", color: "#4c1d95" }}>
                <strong>{buyerOrTenant(selectedAgreement)}'s Message:</strong> {buyerMessage}
              </p>
            )}
            {isBuyerCounter &&
              !buyerCounterPrice &&
              !buyerMessage &&
              buyerNotes && (
                <p style={{ marginTop: "6px", color: "#4c1d95" }}>
                  <strong>{buyerOrTenant(selectedAgreement)}'s Terms:</strong> {buyerNotes}
                </p>
              )}
            {selectedAgreement?.move_in_date && (
              <p>
                📅 <strong>Move-in:</strong>{" "}
                {new Date(selectedAgreement.move_in_date).toLocaleDateString()}
              </p>
            )}
            {isRental(selectedAgreement) && (
              <>
                <p>
                  ⏳ <strong>Duration:</strong> {selectedAgreement.rental_duration_months} Months
                </p>
                <p style={{ textTransform: 'capitalize' }}>
                  🗓️ <strong>Schedule:</strong> {selectedAgreement.payment_schedule || "Monthly"}
                </p>
              </>
            )}
          </div>
          <FinancialBreakdown agr={selectedAgreement} formData={formData} compact />
          <div className="form-group">
            <label>Your Decision *</label>
            <select
              value={formData.decision || ""}
              onChange={(e) =>
                setFormData({ ...formData, decision: e.target.value })
              }
              required
            >
              <option value="">Select decision</option>
              <option value="accept">
                ✅ Accept — Proceed with Agreement
              </option>
              <option value="counter_offer">
                🔄 Counter Offer — Propose New Terms
              </option>
              <option value="reject">❌ Reject — Decline Request</option>
            </select>
          </div>
          {formData.decision === "counter_offer" && (
            <div className="form-group">
              <label>Counter Price (ETB) — optional</label>
              <input
                type="number"
                value={formData.counter_price || ""}
                onChange={(e) =>
                  setFormData({ ...formData, counter_price: e.target.value })
                }
                placeholder="e.g. 4500000"
              />
            </div>
          )}
          {(formData.decision === "accept" || formData.decision === "counter_offer") && (
            <div className="form-group">
              <label>System Fee Payer (Total 5%)</label>
              <select
                value={formData.system_fee_payer || selectedAgreement?.system_fee_payer || "buyer"}
                onChange={(e) =>
                  setFormData({ ...formData, system_fee_payer: e.target.value })
                }
              >
                <option value="buyer">Buyer pays</option>
                <option value="owner">Owner pays</option>
                <option value="split">Split 50/50</option>
              </select>
            </div>
          )}
          <div className="form-group">
            <label>
              {formData.decision === "counter_offer"
                ? "Counter Offer Message *"
                : "Notes"}
            </label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows="3"
              placeholder={
                formData.decision === "counter_offer"
                  ? "Explain your counter offer terms to the buyer..."
                  : ""
              }
            />
          </div>
        </div>
      );
    }

    if (modalType === "generate") {
      return (
        <div className="modal-form">
          <div className="confirm-box">
            <div className="confirm-icon">📄</div>
            <h3>Generate Agreement PDF</h3>
            <p>
              This will create a binding agreement document with all property
              details, buyer and owner information.
            </p>
            <div className="info-banner">
              <p>
                📋 <strong>Property:</strong>{" "}
                {selectedAgreement?.property_title}
              </p>
              <p>
                👤 <strong>{buyerOrTenant(selectedAgreement)}:</strong>{" "}
                {selectedAgreement?.customer_name}
              </p>
              <p>
                🏢 <strong>{ownerOrLandlord(selectedAgreement)}:</strong>{" "}
                {selectedAgreement?.owner_name}
              </p>
            </div>
            <FinancialBreakdown agr={selectedAgreement} formData={formData} />
          </div>
        </div>
      );
    }

    if (modalType === "buyer_sign") {
      return (
        <div className="modal-form">
          <div className="confirm-box">
            <div className="confirm-icon">✍️</div>
            <h3>Digitally Sign Agreement</h3>
            <p>
              By clicking confirm, you digitally sign this agreement. After you
              sign, the {ownerOrLandlord(selectedAgreement)} will be notified to add their signature.
            </p>
            <div className="info-banner">
              <p>
                📋 <strong>Property:</strong>{" "}
                {selectedAgreement?.property_title}
              </p>
            </div>
            <FinancialBreakdown agr={selectedAgreement} formData={formData} compact />
            {!viewedAgreements[selectedAgreement?.id] && (
              <div className="warning-text" style={{ color: '#dc2626' }}>
                ⚠️ You must view the PDF agreement before you can sign.
              </div>
            )}
            <div className="warning-text">⚠️ This action cannot be undone.</div>
          </div>
        </div>
      );
    }

    if (modalType === "owner_sign") {
      return (
        <div className="modal-form">
          <div className="confirm-box">
            <div className="confirm-icon">✍️</div>
            <h3>Sign as {ownerOrLandlord(selectedAgreement)}</h3>
            <p>
              The {buyerOrTenant(selectedAgreement)} has already signed. By signing, the contract becomes
              legally binding and the {buyerOrTenant(selectedAgreement)} can proceed to make payment.
            </p>
            <div className="info-banner">
              <p>
                ✅ <strong>{buyerOrTenant(selectedAgreement)} Signed:</strong>{" "}
                {selectedAgreement?.buyer_signed_date
                  ? new Date(
                    selectedAgreement.buyer_signed_date,
                  ).toLocaleDateString()
                  : "Yes"}
              </p>
            </div>
            <FinancialBreakdown agr={selectedAgreement} formData={formData} compact />
            <div className="warning-text">
              ⚠️ After both signatures, the contract is locked.
            </div>
            {!viewedAgreements[selectedAgreement?.id] && (
              <div className="warning-text" style={{ color: '#dc2626', marginTop: 8 }}>
                ⚠️ You must view the PDF agreement before you can sign.
              </div>
            )}
          </div>
        </div>
      );
    }

    if (modalType === "submit_payment") {
      // Calculate full amount for buyer (Price + System Fee + Broker Comm based on payer)
      const price = Number(selectedAgreement?.proposed_price || selectedAgreement?.property_price || 0);
      const hasBroker = !!selectedAgreement?.broker_id;
      const feePayer = selectedAgreement?.system_fee_payer || 'buyer';
      const sysRate = hasBroker ? 0.02 : 0.05;
      const sysFee = price * sysRate;
      const brokerRate = hasBroker ? (selectedAgreement?.commission_percentage || 2.5) / 100 : 0;
      const brokerFee = price * brokerRate;
      
      let buyerFee = 0;
      if (feePayer === 'buyer') buyerFee = sysFee + brokerFee;
      else if (feePayer === 'split') buyerFee = (sysFee + brokerFee) / 2;
      
      const totalAmount = price + buyerFee;
      const chapaAvailable = totalAmount <= 100000;

      return (
        <div className="modal-form">
          <p className="form-desc">
            💰 The contract is signed. Submit your payment details below.
          </p>

          {/* Amount Summary */}
          <div className="info-banner" style={{ textAlign: "center", padding: "16px", marginBottom: "16px" }}>
            <p style={{ fontSize: "18px", margin: "0 0 8px" }}>
              💰 <strong>Total Amount Due:</strong> <span style={{ color: "#059669" }}>{totalAmount.toLocaleString()} ETB</span>
            </p>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              Agreed {isRental(selectedAgreement) ? 'rent' : 'price'}: {price.toLocaleString()} ETB
              {buyerFee > 0 && ` + fees: ${buyerFee.toLocaleString()} ETB`}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="form-group">
            <label>Payment Method *</label>
            <select
              value={formData.payment_method || ""}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              required
            >
              <option value="">-- Select Payment Method --</option>
              {chapaAvailable && <option value="chapa">📱 Chapa (Online Payment)</option>}
              <option value="bank_transfer">🏦 Bank Transfer</option>
              <option value="cash">💵 Cash Deposit</option>
            </select>
          </div>

          {/* Chapa Info */}
          {formData.payment_method === "chapa" && (
            <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: 10, padding: "16px", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "#065f46", margin: 0 }}>
                📱 You will be redirected to <strong>Chapa's secure payment portal</strong> to complete payment.
              </p>
            </div>
          )}

          {/* Manual Payment Fields */}
          {(formData.payment_method === "bank_transfer" || formData.payment_method === "cash") && (
            <>
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "14px", marginBottom: "12px" }}>
                <p style={{ fontSize: 13, color: "#1e40af", margin: '0 0 10px 0', fontWeight: 'bold' }}>
                  {formData.payment_method === "bank_transfer" 
                    ? "🏦 Please transfer the total amount to one of the following DDREMS bank accounts:"
                    : "💵 Please make a cash deposit at any DDREMS-approved branch and provide the receipt number below."
                  }
                </p>
                {formData.payment_method === "bank_transfer" && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {bankAccounts.filter(acc => acc.type === 'bank' || acc.type === 'mobile').length > 0 ? (
                      bankAccounts.filter(acc => acc.type === 'bank' || acc.type === 'mobile').map(acc => (
                        <div key={acc.id || acc._id} style={{ padding: '10px', background: '#fff', borderRadius: '8px', fontSize: '13px', color: '#1e3a8a', border: '1px solid #93c5fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                )}
              </div>

              <div className="form-group">
                <label>Payment Amount (ETB)</label>
                <input
                  type="number"
                  value={totalAmount}
                  readOnly
                  style={{ background: '#f1f5f9', cursor: 'not-allowed', fontWeight: 'bold', color: '#1e293b' }}
                />
              </div>

              <div className="form-group">
                <label>Transaction Reference / Receipt Number *</label>
                <input
                  type="text"
                  value={formData.payment_reference || ""}
                  onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                  required
                  placeholder={formData.payment_method === "bank_transfer" ? "e.g., TXN-2026-001234" : "e.g., CASH-REC-001234"}
                />
              </div>

              <div className="form-group">
                <label>Receipt / Proof of Payment *</label>
                <input
                  type="file"
                  accept="image/*, application/pdf"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        alert("❌ File too large. Maximum size is 5MB.");
                        e.target.value = "";
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => setFormData({ ...formData, receipt_document: reader.result });
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {formData.receipt_document && (
                  <p style={{ fontSize: 12, color: "#059669", marginTop: 4 }}>✅ Receipt uploaded successfully</p>
                )}
              </div>
            </>
          )}

          {/* No Chapa warning for large amounts */}
          {!chapaAvailable && (
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px", marginTop: "8px" }}>
              <p style={{ fontSize: 12, color: "#9a3412", margin: 0 }}>
                ⚠️ Online payment (Chapa) is not available for amounts exceeding 100,000 ETB. Please use Bank Transfer or Cash Deposit.
              </p>
            </div>
          )}
        </div>
      );
    }

    if (modalType === "verify_payment") {
      return (
        <div className="modal-form">
          <div className="confirm-box">
            <div className="confirm-icon">✅</div>
            <h3>Verify Payment</h3>
            <p>
              Review the buyer's payment details and uploaded receipt below.
              After verification, confirm to proceed to the handover stage.
            </p>
          </div>

          {/* Payment Details */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px", marginBottom: "16px" }}>
            <h4 style={{ margin: "0 0 12px", fontSize: 14, color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>📋 Payment Details</h4>
            <div style={{ display: "grid", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#64748b" }}>👤 Buyer:</span>
                <strong style={{ color: "#1e293b" }}>{selectedAgreement?.customer_name || "N/A"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#64748b" }}>💰 Expected Amount:</span>
                <strong style={{ color: "#059669" }}>{Number(selectedAgreement?.proposed_price || selectedAgreement?.property_price || 0).toLocaleString()} ETB</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#64748b" }}>🏦 Payment Method:</span>
                <strong style={{ color: "#1e293b" }}>{(selectedAgreement?.payment_method || "N/A").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#64748b" }}>🔖 Reference Number:</span>
                <strong style={{ color: "#1e293b" }}>{selectedAgreement?.payment_reference || "N/A"}</strong>
              </div>
            </div>
          </div>

          {/* Receipt Document Preview */}
          {selectedAgreement?.receipt_document ? (
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "#1e293b" }}>🧾 Uploaded Payment Receipt</h4>
              <div style={{ border: "2px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
                {selectedAgreement.receipt_document.startsWith('data:image') ? (
                  <img src={selectedAgreement.receipt_document} alt="Payment Receipt" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
                ) : selectedAgreement.receipt_document.startsWith('data:application/pdf') ? (
                  <iframe src={selectedAgreement.receipt_document} style={{ width: '100%', height: '400px', border: 'none' }} title="Payment Receipt PDF" />
                ) : (
                  <div style={{ padding: "20px", textAlign: "center" }}>
                    <a href={selectedAgreement.receipt_document} target="_blank" rel="noopener noreferrer" 
                       style={{ display: "inline-block", padding: "10px 20px", background: "#3b82f6", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>
                      📎 Open Receipt Document
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px", marginBottom: "16px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 13, color: "#dc2626" }}>⚠️ No receipt document was uploaded by the buyer.</p>
            </div>
          )}

          <div className="form-group">
            <label>Verification Notes</label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows="3"
              placeholder="e.g. Payment received via CBE, ref #1234"
            />
          </div>

          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px", marginTop: "8px" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#9a3412" }}>
              ⚠️ By clicking Confirm, you verify that the payment has been received and the transaction is legitimate. This will advance the agreement to the handover stage.
            </p>
          </div>
        </div>
      );
    }

    if (modalType === "confirm_handover") {
      return (
        <div className="modal-form">
          <div className="confirm-box">
            <div className="confirm-icon">🔑</div>
            <h3>Confirm Key Handover</h3>
            {isBuyer ? (
              <p>
                By confirming, you acknowledge that the owner has handed over the
                property keys and you have received access to the property.
              </p>
            ) : (
              <p>
                By confirming, you acknowledge that you have handed over the
                property keys to the {buyerOrTenant(selectedAgreement)} and they have received access.
              </p>
            )}
            <div className="warning-text">
              {isBuyer 
                ? "⚠️ After both parties confirm, the admin will release funds to the owner."
                : "⚠️ Once the buyer also confirms, the admin will be notified to release your funds."
              }
            </div>
          </div>
        </div>
      );
    }

    if (modalType === "release_funds") {
      const price = Number(
        selectedAgreement?.proposed_price ||
        selectedAgreement?.property_price ||
        0,
      );
      // Determine default based on broker_id
      // 4% total if broker exists (2% system + 2% broker)
      // 5% total if no broker
      const hasBroker = !!selectedAgreement?.broker_id;
      const defaultCommPct = hasBroker ? 4 : 5;
      const commPct = formData.commission_percentage || defaultCommPct;
      const commission = (price * commPct) / 100;
      return (
        <div className="modal-form">
          <div className="confirm-box">
            <div className="confirm-icon">💸</div>
            <h3>Release Funds & Complete Transaction</h3>
            <p>
              The buyer has confirmed receiving the keys. Release the funds to
              complete the transaction.
            </p>
          </div>
          <div className="form-group">
            <label>Commission Percentage (%)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="20"
              value={commPct}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  commission_percentage: parseFloat(e.target.value),
                })
              }
            />
          </div>
          <div className="info-banner">
            <p>
              💰 <strong>Total Amount:</strong> {price.toLocaleString()} ETB
            </p>
            <p>
              📊 <strong>Commission ({commPct}%):</strong>{" "}
              {commission.toLocaleString()} ETB
            </p>
            <p>
              🏠 <strong>Net to Owner:</strong>{" "}
              {(price - commission).toLocaleString()} ETB
            </p>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows="2"
              placeholder="Payout reference or notes..."
            />
          </div>
        </div>
      );
    }

    if (modalType === "view_agreement") {
      return (
        <div className="modal-form" style={{ maxWidth: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <p className="form-desc" style={{ margin: 0 }}>Review the details of the agreement below.</p>
            <button
              className="btn-outline"
              onClick={handleDownloadPDF}
              disabled={downloadingPdf || !contractHTML}
              style={{ padding: '6px 12px', fontSize: 13 }}
            >
              {downloadingPdf ? "⏳ Generating PDF..." : "📥 Download PDF"}
            </button>
          </div>

          <div
            style={{
              background: '#f1f5f9', padding: '16px', borderRadius: 8,
              maxHeight: '600px', overflowY: 'auto', border: '1px solid #cbd5e1'
            }}
          >
            {contractHTML ? (
              <div
                ref={contractRef}
                style={{
                  background: '#fff', padding: '30px', margin: '0 auto',
                  maxWidth: '800px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
                dangerouslySetInnerHTML={{ __html: contractHTML }}
              />
            ) : contractError ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>❌ {contractError}</div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>⏳ Loading document...</div>
            )}
          </div>
        </div>
      );
    }

    if (modalType === "verify_video") {
      return (
        <div className="modal-form">
          <div style={{ padding: 10 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 4px', color: '#1e293b', fontSize: 18 }}>🛡️ Admin Verification</h4>
              <p style={{ color: '#64748b', fontSize: 14 }}>Verify the property video uploaded by the owner before releasing media to the buyer.</p>
            </div>

            {/* Video */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>🎥 Property Video Tour (Uploaded by Owner)</h4>
              {propertyMedia?.video_url ? (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <video controls style={{ width: '100%', maxHeight: 350 }} src={propertyMedia.video_url}>
                    Your browser does not support video playback.
                  </video>
                </div>
              ) : (
                <div style={{ padding: 30, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#dc2626', fontSize: 14, fontWeight: 600 }}>⚠️ No video uploaded yet!</p>
                </div>
              )}
            </div>

            {/* Map Preview */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>🗺️ View on Map</h4>
              {Number(propertyMedia?.latitude) && Number(propertyMedia?.longitude) ? (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <iframe
                    title="Property Location"
                    width="100%"
                    height="300"
                    frameBorder="0"
                    scrolling="no"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(propertyMedia.longitude) - 0.002},${Number(propertyMedia.latitude) - 0.002},${Number(propertyMedia.longitude) + 0.002},${Number(propertyMedia.latitude) + 0.002}&layer=mapnik&marker=${propertyMedia.latitude},${propertyMedia.longitude}`}
                  />
                  <div style={{ padding: '8px 12px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>📍 {propertyMedia.location_name || 'Dire Dawa, Ethiopia'}</span>
                    <a href={`https://www.openstreetmap.org/?mlat=${propertyMedia.latitude}&mlon=${propertyMedia.longitude}#map=18/${propertyMedia.latitude}/${propertyMedia.longitude}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none' }}>🔗 Open Full Map</a>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 30, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#94a3b8', fontSize: 13 }}>🗺️ Map location not available</p>
                </div>
              )}
            </div>

            {/* Documents Preview */}
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>📄 Property Documents</h4>
              {propertyMedia?.documents && propertyMedia.documents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {propertyMedia.documents.map((doc) => (
                    <div key={doc.id} style={{
                      padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0',
                      marginBottom: 10
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>📄 {doc.document_name || doc.document_type}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{doc.document_type} • {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'N/A'}</div>
                          
                          {isBuyer && (
                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11, color: '#64748b' }}>Enter Key:</span>
                              <input 
                                type="text"
                                placeholder="XXXX-XXXX"
                                style={{ padding: '4px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '100px', fontFamily: 'monospace', textTransform: 'uppercase' }}
                                value={enteredKeys[doc.id] || ''}
                                onChange={(e) => setEnteredKeys({...enteredKeys, [doc.id]: e.target.value.toUpperCase()})}
                              />
                              {enteredKeys[doc.id] === doc.access_key && (
                                <span style={{ fontSize: 11, color: '#10b981', fontWeight: 'bold' }}>✅ Matched</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          {(!isBuyer || selectedAgreement?.status === 'media_released' || selectedAgreement?.status === 'completed') ? (
                            <button 
                              type="button"
                              className="btn-outline" 
                              style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                              onClick={() => toggleKey(doc.id)}
                            >
                              {visibleKeys[doc.id] ? "🙈 Hide Key" : "🔑 Show Key"}
                            </button>
                          ) : null}

                           {( !isBuyer || 
                              selectedAgreement?.status === 'media_released' || 
                              selectedAgreement?.status === 'completed' || 
                              enteredKeys[doc.id] === doc.access_key
                            ) ? (
                             <button 
                               type="button"
                               className="btn-outline" 
                               style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                               onClick={() => { setViewingDoc(doc); setViewDocModal(true); }}
                             >
                               👁️ View
                             </button>
                           ) : (
                             <button 
                               type="button"
                               disabled 
                               className="btn-outline" 
                               style={{ fontSize: 11, padding: '4px 10px', opacity: 0.6, cursor: 'not-allowed' }}
                             >
                               🔒 Locked
                             </button>
                           )}
                        </div>
                      </div>
                      
                      {visibleKeys[doc.id] && (!isBuyer || selectedAgreement?.status === 'media_released' || selectedAgreement?.status === 'completed') && (
                        <div style={{ marginTop: 10, padding: 8, background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 4, textAlign: 'center' }}>
                          <span style={{ fontSize: 12, color: '#64748b' }}>Access Key:</span>
                          <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '2px', color: '#0f172a' }}>{doc.access_key}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 20, textAlign: 'center', background: '#fff1f2', borderRadius: 12, border: '1px dashed #fda4af' }}>
                  <p style={{ color: '#e11d48', fontSize: 13 }}>📄 No property documents found!</p>
                </div>
              )}
            </div>

            <div className="warning-text" style={{ marginTop: 24, background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', padding: '12px', borderRadius: '8px' }}>
              ⚠️ Releasing media allows the buyer to proceed to payment. Ensure the video matches the property description.
            </div>
          </div>
        </div>
      );
    }

    if (modalType === "view_property_media") {
      return (
        <div className="modal-form">
          <div style={{ padding: 10 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 4px', color: '#1e293b', fontSize: 18 }}>🎥 Property Review</h4>
              <p style={{ color: '#64748b', fontSize: 14 }}>Review the property video, location map, and documents before payment</p>
            </div>

            {/* Video */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>🎥 Property Video Tour</h4>
              {propertyMedia?.video_url ? (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <video controls style={{ width: '100%', maxHeight: 350 }} src={propertyMedia.video_url}>
                    Your browser does not support video playback.
                  </video>
                </div>
              ) : (
                <div style={{ padding: 30, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#94a3b8', fontSize: 14 }}>🎥 No video available</p>
                </div>
              )}
            </div>

            {/* Map */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>🗺️ View on Map</h4>
              {Number(propertyMedia?.latitude) && Number(propertyMedia?.longitude) ? (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <iframe
                    title="Property Location"
                    width="100%"
                    height="300"
                    frameBorder="0"
                    scrolling="no"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(propertyMedia.longitude) - 0.002},${Number(propertyMedia.latitude) - 0.002},${Number(propertyMedia.longitude) + 0.002},${Number(propertyMedia.latitude) + 0.002}&layer=mapnik&marker=${propertyMedia.latitude},${propertyMedia.longitude}`}
                  />
                  <div style={{ padding: '8px 12px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>📍 {propertyMedia.location_name || 'Dire Dawa, Ethiopia'}</span>
                    <a href={`https://www.openstreetmap.org/?mlat=${propertyMedia.latitude}&mlon=${propertyMedia.longitude}#map=18/${propertyMedia.latitude}/${propertyMedia.longitude}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none' }}>🔗 Open Full Map</a>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#94a3b8', fontSize: '14px' }}>🗺️ Map location not available</p>
                </div>
              )}
            </div>

            {/* Documents */}
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>📄 Property Documents</h4>
              {propertyMedia?.documents && propertyMedia.documents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {propertyMedia.documents.map((doc) => (
                    <div key={doc.id} style={{
                      padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0',
                      marginBottom: 10
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>📄 {doc.document_name || doc.document_type}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{doc.document_type} • {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'N/A'}</div>
                          
                          {isBuyer && (
                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11, color: '#64748b' }}>Enter Key:</span>
                              <input 
                                type="text"
                                placeholder="XXXX-XXXX"
                                style={{ padding: '4px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '100px', fontFamily: 'monospace', textTransform: 'uppercase' }}
                                value={enteredKeys[doc.id] || ''}
                                onChange={(e) => setEnteredKeys({...enteredKeys, [doc.id]: e.target.value.toUpperCase()})}
                              />
                              {enteredKeys[doc.id] === doc.access_key && (
                                <span style={{ fontSize: 11, color: '#10b981', fontWeight: 'bold' }}>✅ Matched</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          {(!isBuyer || selectedAgreement?.status === 'media_released' || selectedAgreement?.status === 'completed') ? (
                            <button 
                              type="button"
                              className="btn-outline" 
                              style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                              onClick={() => toggleKey(doc.id)}
                            >
                              {visibleKeys[doc.id] ? "🙈 Hide Key" : "🔑 Show Key"}
                            </button>
                          ) : null}

                           {( !isBuyer || 
                              selectedAgreement?.status === 'media_released' || 
                              selectedAgreement?.status === 'completed' || 
                              enteredKeys[doc.id] === doc.access_key
                            ) ? (
                             <button 
                               type="button"
                               className="btn-outline" 
                               style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                               onClick={() => { setViewingDoc(doc); setViewDocModal(true); }}
                             >
                               👁️ View
                             </button>
                           ) : (
                             <button 
                               type="button"
                               disabled 
                               className="btn-outline" 
                               style={{ fontSize: 11, padding: '4px 10px', opacity: 0.6, cursor: 'not-allowed' }}
                             >
                               🔒 Locked
                             </button>
                           )}
                        </div>
                      </div>
                      
                      {visibleKeys[doc.id] && (!isBuyer || selectedAgreement?.status === 'media_released' || selectedAgreement?.status === 'completed') && (
                        <div style={{ marginTop: 10, padding: 8, background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 4, textAlign: 'center' }}>
                          <span style={{ fontSize: 12, color: '#64748b' }}>Access Key:</span>
                          <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '2px', color: '#0f172a' }}>{doc.access_key}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 30, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#94a3b8', fontSize: 14 }}>📄 No documents available</p>
                </div>
              )}

            </div>
            
            <div className="warning-text" style={{ marginTop: 24 }}>
              ⚠️ Confirming review means you accept the property condition as shown.
            </div>
          </div>
        </div>
      );
    }

    if (modalType === "upload_video") {
      return (
        <div style={{ padding: '10px' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📹</div>
            <h4 style={{ margin: '0 0 4px', color: '#1e293b', fontSize: 18 }}>Property Video Tour</h4>
            <p style={{ color: '#64748b', fontSize: 14 }}>Upload a tour or provide a link for the buyer to review</p>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button 
              onClick={() => setFormData({ ...formData, video_input_type: 'file' })}
              style={{
                flex: 1, padding: '12px', borderRadius: 8, border: 'none',
                background: (formData.video_input_type !== 'link') ? '#3b82f6' : '#f1f5f9',
                color: (formData.video_input_type !== 'link') ? '#fff' : '#64748b',
                fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer'
              }}
            >
              📁 Upload File
            </button>
            <button 
              onClick={() => setFormData({ ...formData, video_input_type: 'link' })}
              style={{
                flex: 1, padding: '12px', borderRadius: 8, border: 'none',
                background: (formData.video_input_type === 'link') ? '#3b82f6' : '#f1f5f9',
                color: (formData.video_input_type === 'link') ? '#fff' : '#64748b',
                fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer'
              }}
            >
              🔗 Video Link
            </button>
          </div>

          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
            Select a video file from your computer. Max size: <strong>10MB</strong>.
          </p>

          {formData.video_input_type === 'link' ? (
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 600, color: '#1e293b' }}>Video Link (YouTube, Vimeo, or Drive) *</label>
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={formData.video_url || ''}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: 8 }}
              />
            </div>
          ) : (
            <div style={{ 
              border: '2px dashed #cbd5e1', borderRadius: 12, padding: '30px', textAlign: 'center', 
              background: '#f8fafc', marginBottom: 20, position: 'relative' 
            }}>
              <input 
                type="file" 
                accept="video/mp4,video/webm" 
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      alert("❌ Video file too large! Please upload a file smaller than 10MB.");
                      e.target.value = "";
                      return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => setFormData({ ...formData, video_url: reader.result, video_file_name: file.name });
                    reader.readAsDataURL(file);
                  }
                }} 
                style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13, fontWeight: 600 }}>
                  Choose File
                </div>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {formData.video_file_name || "No file chosen"}
                </span>
              </div>
            </div>
          )}

          <div style={{ 
            background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: 10, padding: '16px', 
            fontSize: 13, color: '#9a3412', lineHeight: 1.5, display: 'flex', gap: 10 
          }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <div>
              <strong>Note:</strong> This video will be used during the media release phase of agreements. Ensure it provides a clear tour of the property.
            </div>
          </div>

          <div className="warning-text" style={{ marginTop: 24, padding: 12, background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8 }}>
            ⚠️ Admins must verify this video before the buyer can proceed to payment.
          </div>
        </div>
      );
    }

    return null;
  };

  const getModalTitle = () => {
    const titles = {
      details: "📋 Agreement Details",
      request: "📝 New Agreement Request",
      forward: `➡️ Forward to ${selectedAgreement ? ownerOrLandlord(selectedAgreement) : "Owner"}`,
      forward_counter: `🔄 Forward Counter Offer to ${selectedAgreement ? buyerOrTenant(selectedAgreement) : "Buyer"}`,
      forward_buyer_counter: `🔄 Forward ${selectedAgreement ? buyerOrTenant(selectedAgreement) : "Buyer"} Counter Offer to ${selectedAgreement ? ownerOrLandlord(selectedAgreement) : "Owner"}`,
      buyer_counter_response: "🔄 Respond to Counter Offer",
      decision: `👤 ${selectedAgreement ? ownerOrLandlord(selectedAgreement) : "Owner"} Decision`,
      generate: "📄 Generate Agreement",
      buyer_sign: "✍️ Sign Agreement",
      owner_sign: `✍️ Sign as ${selectedAgreement ? ownerOrLandlord(selectedAgreement) : "Owner"}`,
      upload_video: "🎥 Upload Property Video",
      verify_video: "🔑 Verify Video & Release Media",
      view_property_media: "👀 Review Property Media",
      submit_payment: "💰 Submit Payment",
      verify_payment: "✅ Verify Payment",
      confirm_handover: "🔑 Confirm Handover",
      release_funds: "💸 Release Funds",
      view_agreement: "📄 View Agreement Document",
    };
    return titles[modalType] || "Agreement";
  };

  // ── Main Render ──
  return (
    <div className="agreement-workflow-page">
      <PageHeader
        title="Agreement Workflow"
        subtitle="Manage property agreements — 12-step safe workflow"
        user={user}
        onLogout={onLogout}
        actions={
          (user.role === "user" || user.role === "customer") && (
            <button
              className="btn-primary"
              onClick={() => openModal({}, "request")}
            >
              ➕ New Agreement Request
            </button>
          )
        }
      />

      <div className="workflow-container">
        {loading ? (
          <div className="loading-state">⏳ Loading agreements...</div>
        ) : agreements.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🤝</div>
            <h3>No agreements yet</h3>
            <p>
              {user.role === "user" || user.role === "customer"
                ? 'Click "New Agreement Request" to get started'
                : "Agreements will appear here when buyers submit requests"}
            </p>
          </div>
        ) : (
          <div className="agreements-grid">{agreements.map(renderCard)}</div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{getModalTitle()}</h2>
              <button className="close-btn" onClick={closeModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">{renderModalContent()}</div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              {modalType !== "details" && modalType !== "view_agreement" && (
                <button
                  className="btn-primary"
                  onClick={submitAction}
                  disabled={
                    actionLoading ||
                    ((modalType === "buyer_sign" || modalType === "owner_sign") && !viewedAgreements[selectedAgreement?.id])
                  }
                >
                  {actionLoading ? "⏳ Processing..." : "✅ Confirm"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewDocModal && viewingDoc && (
        <div className="modal-overlay" onClick={() => setViewDocModal(false)} style={{ zIndex: 1200 }}>
          <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', width: '90%', maxHeight: '90vh' }}>
            <div className="modal-header">
              <div>
                <h2>📄 {viewingDoc.document_name || viewingDoc.document_type}</h2>
                <p style={{ margin: '5px 0', color: '#64748b', fontSize: '14px' }}>
                  {viewingDoc.document_type?.replace('_', ' ').toUpperCase()} • Uploaded: {new Date(viewingDoc.uploaded_at || viewingDoc.created_at).toLocaleDateString()}
                </p>
              </div>
              <button className="close-btn" onClick={() => setViewDocModal(false)}>✕</button>
            </div>
            
            <div className="modal-body" style={{ padding: '0', maxHeight: 'calc(90vh - 120px)', overflow: 'hidden' }}>
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                <div style={{ flex: 1, padding: '20px', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
                  { (getDocumentUrl(viewingDoc.document_path).startsWith('data:application/pdf') || 
                     getDocumentUrl(viewingDoc.document_path).toLowerCase().includes('.pdf')) ? (
                    <iframe
                      src={getDocumentUrl(viewingDoc.document_path)}
                      style={{ width: '100%', height: '100%', minHeight: '600px', border: 'none', borderRadius: '8px', background: '#fff' }}
                      title="Document Preview"
                    />
                  ) : (getDocumentUrl(viewingDoc.document_path).startsWith('data:image') || 
                       getDocumentUrl(viewingDoc.document_path).toLowerCase().includes('.jpg') || 
                       getDocumentUrl(viewingDoc.document_path).toLowerCase().includes('.png') || 
                       getDocumentUrl(viewingDoc.document_path).toLowerCase().includes('.jpeg')) ? (
                    <img
                      src={getDocumentUrl(viewingDoc.document_path)}
                      alt="Document Preview"
                      style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: '#fff' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', background: '#fff', borderRadius: 12, width: '100%' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📄</div>
                      <p>Document preview not available for this file type.</p>
                      <a 
                        href={getDocumentUrl(viewingDoc.document_path)} 
                        download={viewingDoc.document_name}
                        className="btn btn-primary"
                        style={{ marginTop: '20px', display: 'inline-block' }}
                      >
                        📥 Download Document
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-actions" style={{ padding: '15px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setViewDocModal(false)}>Close Viewer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgreementWorkflow;
