import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./AgreementWorkflow.css";
import PageHeader from "./PageHeader";
import MpesaPayment from "./MpesaPayment";

const API = "http://localhost:5000/api/agreement-workflow";

// Helper: detect rental agreement reliably
const isRental = (agr) => agr?.agreement_type === 'rent' || agr?.property_listing_type === 'rent';
const buyerOrTenant = (agr) => isRental(agr) ? 'Tenant' : 'Buyer';
const ownerOrLandlord = (agr) => isRental(agr) ? 'Landlord' : 'Owner';
const priceOrRent = (agr) => isRental(agr) ? 'Rent' : 'Price';

const getSteps = (agr) => [
  { num: 1, label: "Request", icon: "📝" },
  { num: 2, label: "Negotiate", icon: "🤝" },
  { num: 3, label: "Finalize", icon: "⚖️" },
  { num: 4, label: "Review", icon: "🔍" },
  { num: 5, label: "Contract", icon: "📄" },
  { num: 6, label: "Buyer Sign", icon: "✍️" },
  { num: 7, label: "Owner Sign", icon: "✍️" },
  { num: 8, label: "Tour Upload", icon: "🎥" },
  { num: 9, label: "Property Review", icon: "👀" },
  { num: 10, label: "Payment", icon: "💰" },
  { num: 11, label: "Handover", icon: "🔑" },
  { num: 12, label: "Complete", icon: "🎉" },
];



const STATUS_MAP = {
  price_negotiation: {
    emoji: "🤝", label: "Price Negotiation", color: "#3b82f6", step: 1
  },
  owner_counter_offered: {
    emoji: "🔄", label: "Owner Counter Offer", color: "#f97316", step: 2
  },
  buyer_counter_offered: {
    emoji: "🔄", label: "Buyer Counter Offer", color: "#8b5cf6", step: 2
  },
  waiting_owner_response: {
    emoji: "⏳", label: "Waiting Owner", color: "#6366f1", step: 2
  },
  owner_accepted: {
    emoji: "✅", label: "Price Agreed", color: "#10b981", step: 3
  },
  pending_admin_review: {
    emoji: "⏳", label: "Pending Admin Review", color: "#f59e0b", step: 3
  },
  owner_rejected: {
    emoji: "❌", label: "Owner Rejected", color: "#ef4444", step: 3
  },
  agreement_generated: {
    emoji: "📄", label: "Agreement Ready", color: "#0891b2", step: 5
  },
  buyer_signed: {
    emoji: "✍️", label: "Buyer Signed", color: "#8b5cf6", step: 6
  },
  fully_signed: {
    emoji: "🔒", label: "Fully Signed", color: "#059669", step: 7
  },
  video_submitted: {
    emoji: "🎥", label: "Video Uploaded", color: "#8b5cf6", step: 8
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
  const [formData, setFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [activeProperties, setActiveProperties] = useState([]);
  const [viewedAgreements, setViewedAgreements] = useState({});
  const [contractHTML, setContractHTML] = useState(null);
  const [contractError, setContractError] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [propertyMedia, setPropertyMedia] = useState(null);
  const contractRef = useRef(null);

  const isAdmin = user.role === "property_admin" || user.role === "system_admin" || user.role === "admin";
  const isOwner = user.role === "owner" || user.role === "landlord";
  const isBuyer = user.role === "user" || user.role === "customer";

  const fetchActiveProperties = useCallback(async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/properties/active",
      );
      setActiveProperties(res.data || []);
      return res.data || [];
    } catch (err) {
      console.error("Error fetching properties:", err);
      return [];
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
    setFormData({});
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
  }, [initialPropertyId, fetchAgreements, fetchActiveProperties, user.role]);


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
            customer_notes: formData.notes,
            counter_price: formData.counter_price,
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
        case "submit_payment":
          url = `${API}/${id}/submit-payment`;
          data = {
            buyer_id: user.id,
            payment_method: formData.payment_method,
            payment_amount: formData.payment_amount,
            payment_reference: formData.payment_reference,
            receipt_document: formData.receipt_document,
          };
          break;
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
              {agr.buyer_signed || agr.buyer_signed_date ? "Signed" : "Not Signed"}
            </span>
            <span className={agr.owner_signed || agr.owner_signed_date ? "signed" : "unsigned"}>
              {agr.owner_signed || agr.owner_signed_date ? "✅" : "⬜"} {ownerOrLandlord(agr)}{" "}
              {agr.owner_signed || agr.owner_signed_date ? "Signed" : "Not Signed"}
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
        {isAdmin && agr.status === "pending_admin_review" && (
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

        {/* ── Owner Actions ── */}
        {isOwner && (agr.status === "waiting_owner_response" || agr.status === "price_negotiation") && (
          <button
            className="btn-primary"
            onClick={() => openModal(agr, "decision")}
          >
            📋 Review & Decide
          </button>
        )}
        {isOwner && agr.status === "buyer_counter_offer_forwarded" && (
          <button
            className="btn-warning"
            onClick={() => openModal(agr, "decision")}
          >
            🔄 Respond to {buyerOrTenant(agr)} Counter Offer
          </button>
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
        {isOwner && agr.status === "payment_submitted" && (
          <div className="status-badge-inline" style={{ fontSize: '12px', padding: '12px', background: '#fff7ed', borderRadius: '10px', color: '#c2410c', fontWeight: 600, border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⏳ Buyer submitted payment. Waiting for Admin verification...</span>
          </div>
        )}

        {/* ── Tenant/Buyer Actions ── */}
        {isBuyer &&
          (agr.status === "counter_offer" ||
            agr.status === "counter_offer_forwarded") && (
            <button
              className="btn-warning"
              onClick={() => openModal(agr, "buyer_counter_response")}
            >
              🔄 Respond to Counter Offer
            </button>
          )}
        {isBuyer && agr.status === "agreement_generated" && (
          <button
            className="btn-success"
            onClick={() => openModal(agr, "buyer_sign")}
          >
            ✍️ Sign Agreement
          </button>
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
        {["agreement_generated", "buyer_signed", "fully_signed", "payment_submitted", "payment_verified", "handover_confirmed"].includes(agr.status) && (
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
            <span>Step {a.current_step} / 11</span>
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
              <strong>{buyerOrTenant(a)} Signed</strong>
              <span>{a.buyer_signed || a.buyer_signed_date ? "✅ Yes" : "❌ No"}</span>
            </div>
            <div>
              <strong>{ownerOrLandlord(a)} Signed</strong>
              <span>{a.owner_signed || a.owner_signed_date ? "✅ Yes" : "❌ No"}</span>
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
              <strong>Created</strong>
              <span>{new Date(a.created_at).toLocaleString()}</span>
            </div>
          </div>
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
                a.status === "counter_offer_forwarded")
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
              🔄 <strong>Counter Offer from Owner</strong>
            </p>
            <p>
              📋 <strong>Property:</strong> {selectedAgreement?.property_title}
            </p>
            <p>
              💰 <strong>Original Price:</strong>{" "}
              {Number(selectedAgreement?.property_price || 0).toLocaleString()}{" "}
              ETB
            </p>
            <p style={{ marginTop: "8px", fontWeight: 600, color: "#c2410c" }}>
              Owner's Terms:{" "}
              {selectedAgreement?.owner_notes || "No additional notes"}
            </p>
          </div>
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
        selectedAgreement?.status === "buyer_counter_offer_forwarded";
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
                💰 <strong>Price:</strong>{" "}
                {Number(
                  selectedAgreement?.proposed_price ||
                  selectedAgreement?.property_price ||
                  0,
                ).toLocaleString()}{" "}
                ETB
              </p>
            </div>
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
              sign, the owner will be notified to add their signature.
            </p>
            <div className="info-banner">
              <p>
                📋 <strong>Property:</strong>{" "}
                {selectedAgreement?.property_title}
              </p>
              <p>
                💰 <strong>Price:</strong>{" "}
                {Number(
                  selectedAgreement?.proposed_price ||
                  selectedAgreement?.property_price ||
                  0,
                ).toLocaleString()}{" "}
                ETB
              </p>
            </div>
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
            <h3>Sign as Owner</h3>
            <p>
              The buyer has already signed. By signing, the contract becomes
              legally binding and the buyer can proceed to make payment.
            </p>
            <div className="info-banner">
              <p>
                ✅ <strong>Buyer Signed:</strong>{" "}
                {selectedAgreement?.buyer_signed_date
                  ? new Date(
                    selectedAgreement.buyer_signed_date,
                  ).toLocaleDateString()
                  : "Yes"}
              </p>
              <p>
                💰 <strong>Price:</strong>{" "}
                {Number(
                  selectedAgreement?.proposed_price ||
                  selectedAgreement?.property_price ||
                  0,
                ).toLocaleString()}{" "}
                ETB
              </p>
            </div>
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
      // If M-Pesa selected, show the dedicated M-Pesa component
      if (formData.payment_method === "mpesa") {
        return (
          <MpesaPayment
            agreement={selectedAgreement}
            user={user}
            onSuccess={() => { closeModal(); fetchAgreements(); }}
            onCancel={() => setFormData({ ...formData, payment_method: "" })}
          />
        );
      }

      return (
        <div className="modal-form">
          <p className="form-desc">
            💰 The contract is signed. Submit your payment details below.
          </p>
          <div className="form-group">
            <label>Payment Method *</label>
            <select
              value={formData.payment_method || ""}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              required
            >
              <option value="">Select method</option>
              <option value="mpesa">📱 M-Pesa (Safaricom Ethiopia)</option>
              <option value="bank_transfer">🏦 Bank Transfer</option>
              <option value="chapa">� Chapa</option>
              <option value="cash">💵 Cash Deposit</option>
              <option value="check">📝 Check</option>
            </select>
          </div>
          {formData.payment_method && formData.payment_method !== "mpesa" && (
            <>
              <div className="form-group">
                <label>Payment Amount (ETB) *</label>
                <input
                  type="number"
                  value={formData.payment_amount || selectedAgreement?.proposed_price || selectedAgreement?.property_price || ""}
                  onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Transaction Reference / Receipt Number *</label>
                <input
                  type="text"
                  value={formData.payment_reference || ""}
                  onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                  required
                  placeholder="e.g. TXN-2026-001234"
                />
              </div>
              <div className="form-group">
                <label>Receipt Document / Proof of Payment</label>
                <input
                  type="file"
                  accept="image/*, application/pdf"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setFormData({ ...formData, receipt_document: reader.result });
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </>
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
              Confirm that the buyer's payment has been received in the DDREMS
              bank account.
            </p>
            <div className="info-banner">
              <p>
                👤 <strong>Buyer:</strong> {selectedAgreement?.customer_name}
              </p>
              <p>
                💰 <strong>Expected Amount:</strong>{" "}
                {Number(
                  selectedAgreement?.proposed_price ||
                  selectedAgreement?.property_price ||
                  0,
                ).toLocaleString()}{" "}
                ETB
              </p>
            </div>
            {selectedAgreement?.receipt_document && (
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>Uploaded Payment Proof</label>
                {selectedAgreement.receipt_document.startsWith('data:image') ? (
                  <img src={selectedAgreement.receipt_document} alt="Payment Proof" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                ) : selectedAgreement.receipt_document.startsWith('data:application/pdf') ? (
                  <iframe src={selectedAgreement.receipt_document} style={{ width: '100%', height: '400px', border: '1px solid #e2e8f0', borderRadius: '8px' }} title="Payment Proof PDF" />
                ) : (
                  <a href={selectedAgreement.receipt_document} target="_blank" rel="noopener noreferrer" className="btn-outline">
                    📎 View Document
                  </a>
                )}
              </div>
            )}
          </div>
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
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>🗺️ Location Preview (Will be released)</h4>
              {propertyMedia?.latitude && propertyMedia?.longitude ? (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <iframe
                    title="Property Location"
                    width="100%"
                    height="200"
                    frameBorder="0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${propertyMedia.longitude - 0.005},${propertyMedia.latitude - 0.005},${propertyMedia.longitude + 0.005},${propertyMedia.latitude + 0.005}&layer=mapnik&marker=${propertyMedia.latitude},${propertyMedia.longitude}`}
                  />
                </div>
              ) : (
                <div style={{ padding: 20, textAlign: 'center', background: '#fff1f2', borderRadius: 12, border: '1px dashed #fda4af' }}>
                  <p style={{ color: '#e11d48', fontSize: 13 }}>🗺️ Location coordinates missing!</p>
                </div>
              )}
            </div>

            {/* Documents Preview */}
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>📄 Documents (Will be released)</h4>
              {propertyMedia?.documents && propertyMedia.documents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {propertyMedia.documents.map((doc) => (
                    <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 13, color: '#475569' }}>📄 {doc.document_name || doc.document_type}</span>
                      <a href={doc.document_path} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>Preview</a>
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
              {propertyMedia?.latitude && propertyMedia?.longitude ? (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <iframe
                    title="Property Location"
                    width="100%"
                    height="300"
                    frameBorder="0"
                    scrolling="no"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${propertyMedia.longitude - 0.01},${propertyMedia.latitude - 0.01},${propertyMedia.longitude + 0.01},${propertyMedia.latitude + 0.01}&layer=mapnik&marker=${propertyMedia.latitude},${propertyMedia.longitude}`}
                  />
                </div>
              ) : (
                <div style={{ padding: 30, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#94a3b8', fontSize: 14 }}>🗺️ Map location not available</p>
                </div>
              )}
            </div>

            {/* Documents */}
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>📄 Property Documents</h4>
              {propertyMedia?.documents && propertyMedia.documents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {propertyMedia.documents.map((doc) => (
                    <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>📄 {doc.document_name || doc.document_type}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{doc.document_type} • {new Date(doc.uploaded_at).toLocaleDateString()}</div>
                      </div>
                      <a href={doc.document_path} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, padding: '6px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', textDecoration: 'none', color: '#475569', fontWeight: 600 }}>
                        👁️ View
                      </a>
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
        <div className="modal-form">
          <div className="confirm-box">
            <div className="confirm-icon">🎥</div>
            <h3>Upload Property Video Tour</h3>
            <p>Please upload a clear video tour of the property. Max file size: 10MB.</p>
            <div className="form-group" style={{ marginTop: 20 }}>
              <label>Video File (MP4, WebM) *</label>
              <input
                type="file"
                accept="video/*"
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
                required
              />
              {formData.video_file_name && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#059669', fontWeight: 600 }}>
                  ✅ Selected: {formData.video_file_name}
                </div>
              )}
            </div>
            <div className="warning-text">⚠️ Admins must verify this video before the buyer can proceed to payment.</div>
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
    </div>
  );
};

export default AgreementWorkflow;
