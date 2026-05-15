import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import "./BrokerEngagement.css";

const API = `${window.API_URL}/broker-engagement`;

// Helper: detect rental engagement
const isRentalEng = (eng) => eng?.engagement_type === 'rent';
const bt = (eng) => isRentalEng(eng) ? 'Tenant' : 'Buyer';
const ol = (eng) => isRentalEng(eng) ? 'Landlord' : 'Owner';

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

  return `${window.API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
};

// Commission & Fee Calculation Helpers
const calculateCommissionFees = (price, commPct, feePayer) => {
  const p = Number(price || 0);
  const c = Number(commPct || 0);
  const systemFee = p * 0.05;
  const brokerComm = p * (c / 100);
  
  let buyerTotal = p;
  let ownerPayout = p;
  
  if (feePayer === 'buyer') {
    buyerTotal = p + systemFee + brokerComm;
    ownerPayout = p;
  } else if (feePayer === 'owner') {
    buyerTotal = p;
    ownerPayout = p - systemFee - brokerComm;
  } else if (feePayer === 'split') {
    buyerTotal = p + (systemFee / 2) + (brokerComm / 2);
    ownerPayout = p - (systemFee / 2) - (brokerComm / 2);
  }
  
  return { systemFee, brokerComm, buyerTotal, ownerPayout };
};

const CommissionFinancialBreakdown = ({ price, commPct, feePayer, engagementType }) => {
  const { systemFee, brokerComm, buyerTotal, ownerPayout } = calculateCommissionFees(price, commPct, feePayer);
  const isRent = engagementType === 'rent';
  
  return (
    <div className="financial-breakdown-box" style={{
      background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '16px',
      marginTop: '16px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    }}>
      <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#475569', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
        📊 Estimated Financial Impact
        <span style={{ fontSize: '10px', fontWeight: 400, background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>
          Based on {isRent ? 'Rent' : 'Price'}: {Number(price).toLocaleString()} ETB
        </span>
      </h5>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ padding: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>System Fee (5%)</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{systemFee.toLocaleString()} ETB</div>
        </div>
        <div style={{ padding: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Broker Commission ({commPct}%)</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{brokerComm.toLocaleString()} ETB</div>
        </div>
      </div>
      
      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Total {isRent ? 'Tenant' : 'Buyer'} Pays:</span>
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#2563eb' }}>{buyerTotal.toLocaleString()} ETB</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Total {isRent ? 'Landlord' : 'Owner'} Payout:</span>
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#059669' }}>{ownerPayout.toLocaleString()} ETB</span>
        </div>
      </div>
      
      <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
        ⚠️ Final values will be confirmed during property price negotiation (Step 4+).
      </div>
    </div>
  );
};


const STATUS_MAP = {
  pending_broker_acceptance: { emoji: "⏳", label: "Pending Broker Acceptance", color: "#f59e0b", step: 1 },
  broker_declined: { emoji: "❌", label: "Broker Declined", color: "#ef4444", step: 2 },
  commission_negotiation: { emoji: "💰", label: "Commission Negotiation", color: "#f97316", step: 3 },
  broker_negotiating: { emoji: "🤝", label: "Broker Negotiating", color: "#3b82f6", step: 4 },
  pending_buyer_approval: { emoji: "⏳", label: "Pending Approval", color: "#f59e0b", step: 4 },
  pending_owner_response: { emoji: "📋", label: "Pending Owner Response", color: "#f97316", step: 5 },
  owner_counter_offered: { emoji: "🔄", label: "Owner Counter-Offered", color: "#f97316", step: 5 },
  broker_reviewing_counter: { emoji: "🔍", label: "Broker Reviewing Counter", color: "#8b5cf6", step: 5 },
  awaiting_buyer_authorization: { emoji: "🔔", label: "Awaiting Authorization", color: "#dc2626", step: 5 },
  broker_finalizing: { emoji: "✅", label: "Broker Finalizing", color: "#22c55e", step: 6 },
  agreement_generated: { emoji: "📄", label: "Contract Ready", color: "#0891b2", step: 7 },
  pending_signatures: { emoji: "✍️", label: "Pending Signatures", color: "#6366f1", step: 8 },
  fully_signed: { emoji: "🔒", label: "Fully Signed", color: "#059669", step: 8 },
  media_uploaded: { emoji: "🎥", label: "Media Uploaded", color: "#8b5cf6", step: 8 },
  media_released: { emoji: "🔑", label: "Media Released", color: "#0891b2", step: 9 },
  media_viewed: { emoji: "🎥", label: "Media Reviewed", color: "#14b8a6", step: 9 },
  payment_submitted: { emoji: "💰", label: "Payment Submitted", color: "#f59e0b", step: 10 },
  payment_rejected: { emoji: "❌", label: "Payment Rejected", color: "#dc2626", step: 10 },
  payment_verified: { emoji: "✅", label: "Payment Verified", color: "#22c55e", step: 11 },
  handover_confirmed: { emoji: "🔑", label: "Handover Confirmed", color: "#0891b2", step: 11 },
  completed: { emoji: "🎉", label: "Completed", color: "#059669", step: 12 },
  cancelled: { emoji: "🚫", label: "Cancelled", color: "#6b7280", step: 0 },
};

const STEP_LABELS = [
  { num: 1, label: "Hire", icon: "🤝" },
  { num: 2, label: "Accept", icon: "✅" },
  { num: 3, label: "Commission", icon: "💰" },
  { num: 4, label: "Offer", icon: "📝" },
  { num: 5, label: "Response", icon: "📋" },
  { num: 6, label: "Finalize", icon: "🎯" },
  { num: 7, label: "Contract", icon: "📄" },
  { num: 8, label: "Sign", icon: "✍️" },
  { num: 9, label: "Review", icon: "🎥" },
  { num: 10, label: "Payment", icon: "💳" },
  { num: 11, label: "Handover", icon: "🔑" },
  { num: 12, label: "Complete", icon: "🎉" },
];

const BrokerEngagement = ({ user, openEngagement, initialPropertyId, onLogout }) => {
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedEngagement, setSelectedEngagement] = useState(null);
  const [formData, setFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [brokers, setBrokers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [contractHTML, setContractHTML] = useState("");
  const [viewedEngagements, setViewedEngagements] = useState({});
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);
  const [userInfoData, setUserInfoData] = useState(null);
  const [propertyMedia, setPropertyMedia] = useState(null);
  const [bookingInfo, setBookingInfo] = useState(null);
  const [visibleKeys, setVisibleKeys] = useState({});
  const [enteredKeys, setEnteredKeys] = useState({});
  const contractRef = useRef(null);

  const isBuyer = user.role === "user" || user.role === "customer";
  const isBroker = user.role === "broker";
  const isOwner = user.role === "owner";
  const isAdmin = user.role === "property_admin" || user.role === "admin";
  const canViewAll = isAdmin || user.role === "system_admin";

  const toggleKey = (docId) => {
    setVisibleKeys(prev => ({ ...prev, [docId]: !prev[docId] }));
  };

  const fetchBrokers = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/available-brokers`);
      setBrokers(res.data.brokers || []);
    } catch (err) { console.error(err); }
  }, []);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await axios.get(`${window.API_URL}/properties/active`);
      setProperties(res.data || []);
    } catch (err) { console.error(err); }
  }, []);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const res = await axios.get(`${window.API_URL}/bank-accounts/active`);
      setBankAccounts(res.data || []);
    } catch (err) { console.error(err); }
  }, []);

  const fetchMessages = useCallback(async (engId) => {
    try {
      const res = await axios.get(`${API}/${engId}/messages?role=${user.role}`);
      setMessages(res.data.messages || []);
    } catch (err) { console.error(err); }
  }, [user.role]);

  const fetchDetails = useCallback(async (engId) => {
    try {
      const res = await axios.get(`${API}/${engId}?role=${user.role}`);
      setSignatures(res.data.signatures || []);
      setHistory(res.data.history || []);
    } catch (err) { console.error(err); }
  }, [user.role]);

  const fetchBookingInfo = useCallback(async (propertyId) => {
    try {
      const res = await axios.get(`${window.API_URL}/broker-bookings?property_id=${propertyId}&status=reserved`);
      if (res.data && res.data.length > 0) {
        setBookingInfo(res.data[0]);
      } else {
        setBookingInfo(null);
      }
    } catch (err) { console.error(err); }
  }, []);

  const fetchUserInfo = useCallback(async (userId) => {
    try {
      const res = await axios.get(`${window.API_URL}/users/${userId}`);
      setUserInfoData(res.data);
      setShowUserInfoModal(true);
    } catch (err) {
      console.error('Error fetching user info:', err);
      setUserInfoData({ id: userId, name: 'User', email: 'N/A' });
      setShowUserInfoModal(true);
    }
  }, []);

  const renderVideo = (videoUrl) => {
    if (!videoUrl) return (
      <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
        <p style={{ color: '#94a3b8', fontSize: 13 }}>🎥 No video available for this property</p>
      </div>
    );
    
    // Check if it's a YouTube link
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      let videoId = '';
      try {
        if (videoUrl.includes('v=')) videoId = videoUrl.split('v=')[1].split('&')[0];
        else if (videoUrl.includes('youtu.be/')) videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        else if (videoUrl.includes('embed/')) videoId = videoUrl.split('embed/')[1].split('?')[0];
      } catch (e) { console.error("Error parsing YouTube URL", e); }
      
      if (videoId) {
        return (
          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <iframe 
              title="Property Video"
              width="100%" 
              height="300" 
              src={`https://www.youtube.com/embed/${videoId}`} 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            />
          </div>
        );
      }
    }
    
    return (
      <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <video controls style={{ width: '100%', maxHeight: 300 }} src={videoUrl}>
          Your browser does not support video playback.
        </video>
      </div>
    );
  };

  const openModal = useCallback(async (type, engagement) => {
    setModalType(type);
    setSelectedEngagement(engagement);
    setFormData({
      system_fee_payer: engagement?.system_fee_payer || "buyer",
      offer_price: engagement?.current_offer || engagement?.starting_offer || "",
      counter_price: engagement?.owner_counter_price || "",
      decision: "",
      message: "",
      counter_commission: engagement?.agreed_commission_pct || 2.5
    });


    if (type === "hire") {
      await fetchBrokers();
      await fetchProperties();
      
      const targetPropId = initialPropertyId || localStorage.getItem('selectedPropertyId');
      if (targetPropId) {
        setFormData(prev => ({ ...prev, property_id: targetPropId }));
        const prop = properties.find(p => p.id === Number(targetPropId));
        if (prop) setFormData(prev => ({ ...prev, engagement_type: prop.listing_type }));
        localStorage.removeItem('selectedPropertyId');
      }
    }
    if (type === "details" || type === "messages") {
      await fetchMessages(engagement.id);
      await fetchDetails(engagement.id);
      if (engagement.property_id) {
        await fetchBookingInfo(engagement.property_id);
      }
    }
    if (type === "commission_respond" && engagement) {
      setFormData({ 
        system_fee_payer: engagement.system_fee_payer || 'buyer',
        decision: '',
        counter_commission: ''
      });
    }
    if (type === "view_contract") {
      try {
        const cRes = await axios.get(`${API}/${engagement.id}/view-contract`);
        setContractHTML(cRes.data.html || "");
        setViewedEngagements((prev) => ({ ...prev, [engagement.id]: true }));
      } catch (err) {
        console.error("Error fetching contract:", err);
        setContractHTML("<p>Contract not found or not yet generated.</p>");
      }
    }
    if (type === "view_property_media" || type === "release_media") {
      try {
        const mRes = await axios.get(`${API}/${engagement.id}/property-media`);
        setPropertyMedia(mRes.data);
      } catch (err) {
        console.error("Error fetching property media:", err);
        setPropertyMedia(null);
      }
    }
    setShowModal(true);
  }, [fetchBrokers, fetchProperties, fetchMessages, fetchDetails, fetchBookingInfo, initialPropertyId, properties]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedEngagement(null);
    setFormData({});
    setMessages([]);
    setHistory([]);
    setSignatures([]);
    setContractHTML("");
    setPropertyMedia(null);
  }, []);

  const [viewDocModal, setViewDocModal] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);

  const fetchEngagements = useCallback(async () => {
    try {
      setLoading(true);
      let endpoint;
      if (canViewAll) endpoint = `${API}/admin/all`;
      else if (isBroker) endpoint = `${API}/broker/${user.id}`;
      else if (isOwner) endpoint = `${API}/owner/${user.id}`;
      else endpoint = `${API}/buyer/${user.id}`;

      const res = await axios.get(endpoint);
      setEngagements(res.data.engagements || []);
    } catch (err) {
      console.error("Error fetching engagements:", err);
    } finally {
      setLoading(false);
    }
  }, [user.id, canViewAll, isBroker, isOwner]);

  useEffect(() => {
    fetchEngagements();
    fetchBankAccounts();
  }, [fetchEngagements, fetchBankAccounts]);

  const hasOpenedEngagement = useRef(false);
  useEffect(() => {
    if (openEngagement && engagements.length > 0) {
      const match = engagements.find(e => e.id === openEngagement.id);
      if (match && (!selectedEngagement || selectedEngagement.id !== match.id) && !hasOpenedEngagement.current) {
        hasOpenedEngagement.current = true;
        openModal("details", match);
      }
    }
  }, [openEngagement, engagements, selectedEngagement, openModal]);

  const hasOpenedInitial = useRef(false);
  useEffect(() => {
    if (initialPropertyId && !hasOpenedInitial.current) {
      hasOpenedInitial.current = true;
      openModal("hire", null);
      setFormData(prev => ({ ...prev, property_id: initialPropertyId }));
    }
  }, [initialPropertyId, openModal]);


  // ── Download PDF using jsPDF + html2canvas ──
  const handleDownloadPDF = async () => {
    if (!contractHTML) return;
    setPdfLoading(true);
    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.left = "-9999px";
      iframe.style.top = "0";
      iframe.style.width = "900px";
      iframe.style.height = "auto";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(contractHTML);
      iframeDoc.close();

      await new Promise((resolve) => {
        iframe.onload = resolve;
        setTimeout(resolve, 1500);
      });

      const body = iframeDoc.body;
      iframe.style.height = body.scrollHeight + "px";
      await new Promise((r) => setTimeout(r, 300));

      const canvas = await html2canvas(body, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 900,
        windowWidth: 900,
      });

      document.body.removeChild(iframe);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10; 

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 20); 

      while (heightLeft > 0) {
        position = -(imgHeight - heightLeft) + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 20);
      }

      const engId = selectedEngagement?.id || "contract";
      pdf.save(`DDREMS_Agreement_BA-${String(engId).padStart(5, "0")}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("❌ Failed to generate PDF. Falling back to browser print.");
      const win = window.open("", "_blank");
      win.document.write(contractHTML);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    } finally {
      setPdfLoading(false);
    }
  };

  const getBadge = (status) => STATUS_MAP[status] || { emoji: "❓", label: status, color: "#6b7280" };

  // ── Submit Actions ──
  const submitAction = async () => {
    setActionLoading(true);
    try {
      let url, method = "post", data = {};
      const id = selectedEngagement?.id;

      switch (modalType) {
        case "hire":
          url = `${API}/hire`;
          data = {
            buyer_id: user.id,
            broker_id: formData.broker_id,
            property_id: formData.property_id,
            starting_offer: formData.starting_offer,
            buyer_message: formData.message,
            engagement_type: formData.engagement_type,
            rental_duration_months: formData.rental_duration_months,
            payment_schedule: formData.payment_schedule,
            security_deposit: formData.security_deposit,
            buyer_commission_offer: formData.buyer_commission_offer || 2,
            system_fee_payer: formData.system_fee_payer || 'buyer',
          };
          if (!data.broker_id || !data.property_id) {
            alert("Please select a broker and property.");
            setActionLoading(false);
            return;
          }
          break;

        case "broker_accept":
          url = `${API}/${id}/broker-accept`;
          method = "put";
          data = { broker_id: user.id, decision: "accept" };
          break;

        case "broker_reject":
          url = `${API}/${id}/broker-accept`;
          method = "put";
          data = { broker_id: user.id, decision: "decline", decline_reason: formData.decline_reason };
          break;

        case "broker_negotiate":
          url = `${API}/${id}/broker-negotiate`;
          method = "put";
          data = { 
            broker_id: user.id, 
            offer_price: formData.offer_price, 
            message: formData.message,
            system_fee_payer: formData.system_fee_payer || selectedEngagement?.system_fee_payer || 'buyer'
          };
          break;


        case "buyer_review_draft":
          url = `${API}/${id}/buyer-approve-draft`;
          method = "put";
          data = { buyer_id: user.id, decision: formData.decision, reject_reason: formData.reject_reason };
          if (!data.decision) { alert("Please select Approve or Reject."); setActionLoading(false); return; }
          break;

        case "owner_respond":
          url = `${API}/${id}/owner-respond`;
          method = "put";
          data = {
            owner_id: user.id,
            decision: formData.decision,
            counter_price: formData.counter_price,
            message: formData.message,
            system_fee_payer: formData.system_fee_payer || selectedEngagement?.system_fee_payer || 'buyer'
          };
          break;


        case "broker_advise":
          url = `${API}/${id}/broker-advise`;
          method = "put";
          data = { broker_id: user.id, recommendation: formData.recommendation, advice_message: formData.message };
          break;

        case "buyer_authorize":
          url = `${API}/${id}/buyer-authorize`;
          method = "put";
          data = {
            buyer_id: user.id,
            authorization: formData.authorization,
            counter_price: formData.counter_price,
            message: formData.message,
            system_fee_payer: formData.system_fee_payer || selectedEngagement?.system_fee_payer || 'buyer'
          };
          break;


        case "broker_finalize":
          url = `${API}/${id}/broker-finalize`;
          method = "put";
          data = { broker_id: user.id };
          break;

        case "generate_contract":
          url = `${API}/${id}/generate-contract`;
          data = { admin_id: user.id };
          break;

        case "sign":
          url = `${API}/${id}/sign`;
          method = "put";
          data = {
            signer_id: user.id,
            signer_role: isBuyer ? "buyer" : isBroker ? "broker" : "owner",
            signature_data: "digital_signature_" + user.name + "_" + Date.now(),
          };
          break;

        case "owner_upload_media":
          url = `${API}/${id}/owner-submit-media`;
          method = "put";
          data = {
            owner_id: user.id,
            video_url: formData.video_url,
            video_file: formData.video_file,
            additional_docs: formData.additional_docs
          };
          // Optional: We removed the strict requirement for video_url or video_file.
          // If neither is provided, they can still proceed with just additional documents (or nothing, effectively moving status forward).
          break;

        case "commission_respond":
          url = `${API}/${id}/commission-respond`;
          method = "put";
          data = {
            user_id: user.id,
            user_role: isBuyer ? "buyer" : "broker",
            action: formData.decision,
            counter_commission: formData.counter_commission,
            system_fee_payer: formData.system_fee_payer || selectedEngagement?.system_fee_payer || 'buyer',
          };
          if (!data.action) { 
            alert("❌ Please select a decision (Accept, Counter, or Reject) before confirming."); 
            setActionLoading(false); 
            return; 
          }
          if (data.action === 'counter_commission' && !data.counter_commission) {
            alert("Please enter a counter commission percentage."); setActionLoading(false); return;
          }
          break;

        case "send_message":
          url = `${API}/${id}/messages`;
          data = {
            sender_id: user.id,
            sender_role: isBuyer ? "buyer" : isBroker ? "broker" : isOwner ? "owner" : "admin",
            message: formData.message,
            message_type: "general",
          };
          if (!data.message) { alert("Please enter a message."); setActionLoading(false); return; }
          break;

        case "mark_media_viewed":
          url = `${API}/${id}/mark-media-viewed`;
          method = "put";
          data = { buyer_id: user.id };
          break;

        case "release_media":
          url = `${API}/${id}/release-media`;
          method = "put";
          data = { admin_id: user.id };
          break;

        case "submit_payment": {
            const price = Number(selectedEngagement?.agreed_price || 0);
            const brkPct = Number(selectedEngagement?.agreed_commission_pct || 2);
            const feePayer = selectedEngagement?.system_fee_payer || 'buyer';
            const sysFee = price * 0.05;
            const brokerFee = price * (brkPct / 100);
            let buyerFee = 0;
            if (feePayer === 'buyer') buyerFee = sysFee + brokerFee;
            else if (feePayer === 'split') buyerFee = (sysFee + brokerFee) / 2;
            const totalAmount = price + buyerFee;

            // If Chapa is selected and amount is within limit, redirect to Chapa
            if (formData.payment_method === 'chapa' && totalAmount <= 100000) {
              try {
                const chapaRes = await axios.post(`${API.replace('/broker-engagement', '').replace('/api', '/api/chapa')}/initialize`, {
                  amount: totalAmount,
                  email: user.email || "payment@gmail.com",
                  first_name: user.first_name || user.name?.split(' ')[0] || 'Customer',
                  last_name: user.last_name || user.name?.split(' ')[1] || 'Name',
                  engagementId: id,
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
            method = "put";
            data = {
              buyer_id: user.id,
              payment_method: formData.payment_method,
              payment_reference: formData.payment_reference,
              payment_receipt: formData.payment_receipt,
            };
            break;
          }
        case "verify_payment":
          url = `${API}/${id}/verify-payment`;
          method = "put";
          data = { admin_id: user.id };
          break;

        case "reject_payment":
          url = `${API}/${id}/reject-payment`;
          method = "put";
          data = { admin_id: user.id, reason: formData.reason };
          if (!data.reason) { alert("Please provide a reason for rejection."); setActionLoading(false); return; }
          break;

        case "confirm_handover":
          url = `${API}/${id}/confirm-handover`;
          method = "put";
          data = { user_id: user.id };
          break;

        case "release_funds":
          url = `${API}/${id}/release-funds`;
          method = "put";
          data = {
            admin_id: user.id,
            system_commission_pct: 5,
            broker_commission_pct: formData.broker_commission_pct || selectedEngagement?.agreed_commission_pct || 2,
          };
          break;

        default:
          setActionLoading(false);
          return;
      }

      const res = await axios({ method, url, data });
      alert(`✅ ${res.data.message}`);
      closeModal();
      fetchEngagements();
    } catch (err) {
      alert(`❌ ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Render Action Buttons ──
  const renderActions = (eng) => {
    const btns = [];

    // Broker: accept/decline
    if (isBroker && eng.status === "pending_broker_acceptance") {
      btns.push(
        <button key="accept" className="eng-btn eng-btn-success" onClick={() => openModal("broker_accept", eng)}>
          ✅ Accept
        </button>,
        <button key="decline" className="eng-btn eng-btn-danger" onClick={() => openModal("broker_reject", eng)}>
          ❌ Reject
        </button>
      );
    }

    // Commission negotiation — buyer and broker
    if (eng.status === "commission_negotiation") {
      if (isBuyer || isBroker) {
        btns.push(
          <button key="commission" className="eng-btn eng-btn-warning" onClick={() => openModal("commission_respond", eng)}>
            💰 Negotiate Commission
          </button>
        );
      }
    }

    // Broker: draft offer for buyer/tenant approval
    if (isBroker && eng.status === "broker_negotiating") {
      btns.push(
        <button key="negotiate" className="eng-btn eng-btn-primary" onClick={() => openModal("broker_negotiate", eng)}>
          📝 Draft Offer for {bt(eng)}
        </button>
      );
    }

    // Buyer/Tenant: review broker's draft offer
    if (isBuyer && eng.status === "pending_buyer_approval") {
      btns.push(
        <button key="review_draft" className="eng-btn eng-btn-warning" onClick={() => openModal("buyer_review_draft", eng)}>
          📋 Review Draft Offer
        </button>
      );
    }

    // Broker: advise buyer/tenant
    if (isBroker && eng.status === "broker_reviewing_counter") {
      btns.push(
        <button key="advise" className="eng-btn eng-btn-warning" onClick={() => openModal("broker_advise", eng)}>
          📋 Advise {bt(eng)}
        </button>
      );
    }

    // Broker: finalize
    if (isBroker && eng.status === "broker_finalizing") {
      btns.push(
        <button key="finalize" className="eng-btn eng-btn-success" onClick={() => openModal("broker_finalize", eng)}>
          🎯 Finalize Deal
        </button>
      );
    }

    // Owner: respond to offer
    if (isOwner && eng.status === "pending_owner_response") {
      btns.push(
        <button key="respond" className="eng-btn eng-btn-primary" onClick={() => openModal("owner_respond", eng)}>
          📋 Respond to Offer
        </button>
      );
    }

    // Buyer/Tenant: authorize
    if (isBuyer && eng.status === "awaiting_buyer_authorization") {
      btns.push(
        <button key="authorize" className="eng-btn eng-btn-danger" onClick={() => openModal("buyer_authorize", eng)}>
          🔔 Authorize Action
        </button>
      );
    }

    // Admin: generate contract
    if (isAdmin && eng.status === "agreement_generated") {
      btns.push(
        <button key="gencontract" className="eng-btn eng-btn-primary" onClick={() => openModal("generate_contract", eng)}>
          📄 Generate Contract
        </button>
      );
    }

    // Admin: verify media and release documents key (Step 8 -> 9)
    if (isAdmin && eng.status === "media_uploaded") {
      btns.push(
        <button key="releasemedia" className="eng-btn eng-btn-primary" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }} onClick={() => openModal("release_media", eng)}>
          🔑 Verify & Release Documents Key
        </button>
      );
    }

    // Owner: upload media (Step 8)
    if (isOwner && eng.status === "fully_signed") {
      btns.push(
        <button key="uploadmedia" className="eng-btn eng-btn-primary" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }} onClick={() => openModal("owner_upload_media", eng)}>
          🎥 Upload Property Video Tour
        </button>
      );
    }

    // Any party: sign (when pending_signatures)
    if (eng.status === "pending_signatures") {
      const myRole = isBuyer ? "buyer" : isBroker ? "broker" : isOwner ? "owner" : null;
      if (myRole) {
        const hasSigned = eng.signed_roles && eng.signed_roles.includes(myRole);
        if (hasSigned) {
          btns.push(
            <button key="sign" className="eng-btn eng-btn-outline" disabled style={{ cursor: "not-allowed", opacity: 0.7, background: "#f8fafc" }}>
              ✅ Signed
            </button>
          );
        } else {
          btns.push(
            <button key="sign" className="eng-btn eng-btn-success" onClick={() => openModal("sign", eng)}>
              ✍️ Sign Contract
            </button>
          );
        }
      }
    }

    // Buyer/Tenant: view media
    if (isBuyer && eng.status === "media_released") {
      btns.push(
        <button key="viewmedia" className="eng-btn eng-btn-primary" onClick={() => openModal("view_property_media", eng)}>
          🎥 Review Property & Documents
        </button>
      );
    }

    // Buyer/Tenant: pay now (after media_viewed or if payment_rejected)
    if (isBuyer && (eng.status === "media_viewed" || eng.status === "payment_rejected")) {
      btns.push(
        <button key="pay" className="eng-btn eng-btn-success" onClick={() => openModal("submit_payment", eng)}>
          {eng.status === "payment_rejected" ? "🔄 Resubmit Payment" : "💰 Pay Now"}
        </button>
      );
    }

    // Admin: verify or reject payment
    if (isAdmin && eng.status === "payment_submitted") {
      btns.push(
        <button key="verifypay" className="eng-btn eng-btn-success" onClick={() => openModal("verify_payment", eng)}>
          ✅ Verify Payment
        </button>,
        <button key="rejectpay" className="eng-btn eng-btn-danger" onClick={() => openModal("reject_payment", eng)}>
          ❌ Reject Payment
        </button>
      );
    }

    // Buyer/Tenant or Owner/Landlord: confirm handover
    if ((isBuyer || isOwner) && eng.status === "payment_verified") {
      const hasConfirmed = isBuyer ? eng.buyer_handover_confirmed : eng.owner_handover_confirmed;
      
      if (hasConfirmed) {
        btns.push(
          <button key="handover" className="eng-btn eng-btn-outline" disabled style={{ cursor: "not-allowed", opacity: 0.7, background: "#f8fafc" }}>
            ✅ Handover Confirmed
          </button>
        );
      } else {
        btns.push(
          <button key="handover" className="eng-btn eng-btn-primary" onClick={() => openModal("confirm_handover", eng)}>
            🔑 Confirm Handover
          </button>
        );
      }
    }

    // Admin: release funds
    if (isAdmin && eng.status === "handover_confirmed") {
      btns.push(
        <button key="release" className="eng-btn eng-btn-warning" onClick={() => openModal("release_funds", eng)}>
          💸 Release Funds
        </button>
      );
    }

    // View Contract (available after generation)
    if (["pending_signatures", "fully_signed", "media_uploaded", "media_released", "media_viewed", "payment_submitted", "payment_rejected", "payment_verified", "handover_confirmed", "completed"].includes(eng.status)) {
      btns.push(
        <button key="viewcontract" className="eng-btn eng-btn-outline" onClick={() => openModal("view_contract", eng)}>
          📄 View Agreement
        </button>
      );
    }

    // View property media (available after signing)
    if (["fully_signed", "payment_submitted", "payment_rejected", "payment_verified", "handover_confirmed", "completed"].includes(eng.status)) {
      btns.push(
        <button key="viewmedia2" className="eng-btn eng-btn-outline" onClick={() => openModal("view_property_media", eng)} style={{ color: '#0891b2', borderColor: '#a5f3fc' }}>
          🗺️ Property Details
        </button>
      );
    }

    // Messages & Details always available
    btns.push(
      <button key="msgs" className="eng-btn eng-btn-outline" onClick={() => openModal("messages", eng)}>
        💬 Messages
      </button>,
      <button key="details" className="eng-btn eng-btn-outline" onClick={() => openModal("details", eng)}>
        👁️ Details
      </button>,
      !isBroker && eng.broker_id && (
        <button key="brokerinfo" className="eng-btn eng-btn-outline" onClick={() => fetchUserInfo(eng.broker_id)} style={{ color: '#7c3aed', borderColor: '#e9d5ff' }}>
          🧑‍💼 Broker Info
        </button>
      )
    );

    return btns;
  };

  // ── Render Engagement Card ──
  const renderCard = (eng) => {
    const badge = getBadge(eng.status);
    return (
      <div key={eng.id} className="engagement-card">
        <div className="card-header">
          <div>
            <h3>🤝 Engagement #{eng.id}</h3>
            <span className="eng-status-pill" style={{ background: "#ffffff", color: badge.color, borderColor: "transparent", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              {badge.emoji} {badge.label}
            </span>
          </div>
        </div>

        {/* Step Progress Bar */}
        {eng.status !== 'cancelled' && eng.status !== 'broker_declined' && (
          <div className="step-progress-bar">
            {STEP_LABELS.map((step) => {
              const currentStep = badge.step || 0;
              const isActive = step.num === currentStep;
              const isCompleted = step.num < currentStep;
              return (
                <div key={step.num} className={`step-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                  <div className="step-circle">
                    {isCompleted ? '✓' : step.num}
                  </div>
                  <div className="step-label">{step.label}</div>
                </div>
              );
            })}
          </div>
        )}
        {/* Booking Info Alert */}
        {bookingInfo && bookingInfo.property_id === eng.property_id && (
          <div className="booking-alert" style={{ 
            background: '#fffbeb', border: '1px solid #fef3c7', padding: '15px', 
            borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' 
          }}>
            <div style={{ fontSize: '24px' }}>⏱️</div>
            <div>
              <h4 style={{ margin: 0, color: '#92400e', fontSize: '14px' }}>Property Under Temporary Hold</h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#b45309' }}>
                This property is reserved for <strong>{bookingInfo.buyer_name}</strong> until {new Date(bookingInfo.hold_expiry_time).toLocaleTimeString()}.
              </p>
            </div>
          </div>
        )}

        <div className="eng-info-grid">
          <div className="info-item"><span className="info-label">🏠 Property</span><span className="info-value">{eng.property_title || "N/A"}</span></div>
          <div className="info-item"><span className="info-label">📍 Location</span><span className="info-value">{eng.property_location || "N/A"}</span></div>
          <div className="info-item">
            <span className="info-label">👤 {eng.engagement_type === 'rent' ? 'Tenant' : 'Buyer'}</span>
            <span className="info-value" 
              style={{ color: "#3b82f6", cursor: "pointer", fontWeight: "bold" }}
              onClick={() => fetchUserInfo(eng.buyer_id)}
            >
              {eng.buyer_name || "N/A"}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">🤵 Broker</span>
            <span className="info-value"
              style={{ color: "#3b82f6", cursor: "pointer", fontWeight: "bold" }}
              onClick={() => fetchUserInfo(eng.broker_id)}
            >
              {eng.broker_name || "N/A"}
            </span>
          </div>
          <div className="info-item"><span className="info-label">🏢 {eng.engagement_type === 'rent' ? 'Landlord' : 'Owner'}</span><span className="info-value">{eng.owner_name || "N/A"}</span></div>
          <div className="info-item"><span className="info-label">📆 Created</span><span className="info-value">{new Date(eng.created_at).toLocaleDateString()}</span></div>
          {eng.engagement_type === 'rent' && (
            <>
              <div className="info-item"><span className="info-label">🏷️ Type</span><span className="info-value" style={{color: '#065f46', fontWeight: 700}}>Rental</span></div>
              <div className="info-item"><span className="info-label">📅 Duration</span><span className="info-value">{eng.rental_duration_months} Months</span></div>
              <div className="info-item"><span className="info-label">🗓️ Schedule</span><span className="info-value" style={{textTransform:'capitalize'}}>{eng.payment_schedule || 'monthly'}</span></div>
              {eng.security_deposit > 0 && (
                <div className="info-item"><span className="info-label">🔒 Deposit</span><span className="info-value">{Number(eng.security_deposit).toLocaleString()} ETB</span></div>
              )}
            </>
          )}
        </div>

        {/* Offer comparison boxes */}
        <div className="offer-comparison">
          <div className="offer-box" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div className="offer-label">List Price</div>
            <div className="offer-value">{Number(eng.property_price || 0).toLocaleString()} ETB</div>
          </div>
          {!isOwner && (
            <div className="offer-box starting">
              <div className="offer-label">Starting Offer</div>
              <div className="offer-value">{Number(eng.starting_offer || 0).toLocaleString()} ETB</div>
            </div>
          )}
          {(!isOwner || !["pending_broker_acceptance", "broker_declined", "pending_buyer_approval"].includes(eng.status)) && (
            <div className="offer-box current">
              <div className="offer-label">Current Offer</div>
              <div className="offer-value">{Number(eng.current_offer || 0).toLocaleString()} ETB</div>
            </div>
          )}
          {eng.agreed_price && (
            <div className="offer-box agreed">
              <div className="offer-label">Agreed Price</div>
              <div className="offer-value">{Number(eng.agreed_price).toLocaleString()} ETB</div>
            </div>
          )}
          {eng.agreed_commission_pct && (
            <div className="offer-box" style={{ background: '#faf5ff', border: '1px solid #e9d5ff' }}>
              <div className="offer-label">Broker Commission</div>
              <div className="offer-value" style={{ color: '#7c3aed' }}>{eng.agreed_commission_pct}%</div>
            </div>
          )}
        </div>

        {/* Broker advice panel */}
        {eng.broker_recommendation && (
          <div className="advice-panel">
            <div className="advice-header">
              <h4>🧑‍💼 Broker Advice</h4>
              <span className={`rec-badge ${eng.broker_recommendation}`}>
                {eng.broker_recommendation === "accept" ? "✅ Accept" : eng.broker_recommendation === "counter" ? "🔄 Counter" : "🚫 Walk Away"}
              </span>
            </div>
            {eng.broker_advice && <p className="advice-text">{eng.broker_advice}</p>}
            {eng.owner_counter_price && (
              <p className="advice-text" style={{ marginTop: 8, fontWeight: 600 }}>
                Owner's counter: {Number(eng.owner_counter_price).toLocaleString()} ETB
              </p>
            )}
          </div>
        )}

        {/* Signature status */}
        {["pending_signatures", "fully_signed", "completed"].includes(eng.status) && (
          <div className="sig-section">
            <div className={`sig-item ${eng.status === "fully_signed" || eng.status === "completed" ? "signed" : "unsigned"}`}>
              ✍️ {bt(eng)}
            </div>
            <div className={`sig-item ${eng.status === "fully_signed" || eng.status === "completed" ? "signed" : "unsigned"}`}>
              ✍️ Broker
            </div>
            <div className={`sig-item ${eng.status === "fully_signed" || eng.status === "completed" ? "signed" : "unsigned"}`}>
              ✍️ {ol(eng)}
            </div>
          </div>
        )}

        <div className="card-actions">{renderActions(eng)}</div>
      </div>
    );
  };

  // ── Render Modal Content ──
  const renderModalContent = () => {
    if (!showModal) return null;

    switch (modalType) {
      case "hire": {
        const selectedProp = properties.find(p => p.id === Number(formData.property_id));
        const isRentalProp = selectedProp?.listing_type === 'rent' || formData.engagement_type === 'rent';
        return (
          <>
            <div className="eng-form-group">
              <label>Select Property *</label>
              <select value={formData.property_id || ""} onChange={(e) => {
                const prop = properties.find(p => p.id === Number(e.target.value));
                setFormData({ ...formData, property_id: e.target.value, engagement_type: prop?.listing_type || 'sale' });
              }}>
                <option value="">-- Choose a property --</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.title} — {Number(p.price).toLocaleString()} ETB ({p.location}) {p.listing_type === 'rent' ? '🔑 Rent' : '🏷️ Sale'}</option>
                ))}
              </select>
            </div>
            <div className="eng-form-group">
              <label>Select Broker *</label>
              <div className="broker-selection-grid">
                {brokers.map((b) => (
                  <div key={b.id}
                    className={`broker-select-card ${formData.broker_id === b.id ? "selected" : ""}`}
                    onClick={() => setFormData({ ...formData, broker_id: b.id })}
                  >
                    <div className="broker-avatar">{b.name?.charAt(0).toUpperCase()}</div>
                    <div className="broker-card-name">{b.name}</div>
                    <div className="broker-card-info">{b.license_number || b.email}</div>
                  </div>
                ))}
                {brokers.length === 0 && <p style={{ color: "#94a3b8", gridColumn: "1/-1", textAlign: "center" }}>No brokers available</p>}
              </div>
            </div>
            <div className="eng-form-group">
              <label>{isRentalProp ? 'Starting Monthly Rent Offer (ETB)' : 'Starting Offer Price (ETB)'}</label>
              <input type="number" value={formData.starting_offer || ""} onChange={(e) => setFormData({ ...formData, starting_offer: e.target.value })} placeholder={isRentalProp ? 'Enter your proposed monthly rent' : 'Enter your starting offer price'} />
            </div>
            {isRentalProp && (
              <>
                <div className="eng-form-group">
                  <label>Lease Duration (Months) *</label>
                  <input type="number" min="1" value={formData.rental_duration_months || 12} onChange={(e) => setFormData({ ...formData, rental_duration_months: e.target.value })} />
                </div>
                <div className="eng-form-group">
                  <label>Payment Schedule</label>
                  <select value={formData.payment_schedule || 'monthly'} onChange={(e) => setFormData({ ...formData, payment_schedule: e.target.value })}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi_annual">Semi-Annually</option>
                    <option value="annual">Annually</option>
                  </select>
                </div>
                <div className="eng-form-group">
                  <label>Security Deposit (ETB)</label>
                  <input type="number" value={formData.security_deposit || ""} onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })} placeholder="e.g. 50000" />
                </div>
              </>
            )}
            <div className="eng-form-group">
              <label>Proposed Broker Commission (%)</label>
              <input type="number" step="0.5" min="0.5" max="15" value={formData.buyer_commission_offer || 2} onChange={(e) => setFormData({ ...formData, buyer_commission_offer: e.target.value })} />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>ℹ️ The broker can accept, reject, or counter this commission offer</p>
            </div>
            <div className="eng-form-group">
              <label>System Service Fee (5%) Paid By</label>
              <select value={formData.system_fee_payer || 'buyer'} onChange={(e) => setFormData({ ...formData, system_fee_payer: e.target.value })}>
                <option value="buyer">Buyer pays 5% system fee</option>
                <option value="owner">Owner pays 5% system fee</option>
                <option value="split">Split 50/50 (2.5% each)</option>
              </select>
            </div>
            <div className="eng-form-group">
              <label>Message to Broker</label>
              <textarea value={formData.message || ""} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="Tell the broker about your requirements, budget, expectations..." rows="3" />
            </div>
          </>
        );
      }

      case "broker_accept":
        return (
          <div style={{ textAlign: "center", padding: 20 }}>
            <p style={{ fontSize: 48, margin: "0 0 12px" }}>🤝</p>
            <h4 style={{ margin: "0 0 8px", color: "#1e293b" }}>Accept Representation?</h4>
            <p style={{ color: "#64748b", fontSize: 14 }}>
              You will represent the {bt(selectedEngagement).toLowerCase()} in negotiations for <strong>{selectedEngagement?.property_title}</strong>.
            </p>
          </div>
        );

      case "broker_reject":
        return (
          <div style={{ textAlign: "center", padding: 20 }}>
            <p style={{ fontSize: 48, margin: "0 0 12px" }}>❌</p>
            <h4 style={{ margin: "0 0 8px", color: "#dc2626" }}>Reject Representation?</h4>
            <p style={{ color: "#64748b", fontSize: 14 }}>
              You are declining to represent the {bt(selectedEngagement).toLowerCase()} for <strong>{selectedEngagement?.property_title}</strong>.
            </p>
            <div className="eng-form-group" style={{ textAlign: "left", marginTop: 16 }}>
              <label>Reason for Rejecting (optional)</label>
              <textarea 
                value={formData.decline_reason || ""} 
                onChange={(e) => setFormData({ ...formData, decline_reason: e.target.value })} 
                placeholder="Why are you declining this engagement request?" 
                rows="3" 
              />
            </div>
          </div>
        );

      case "commission_respond": {
        const buyerOffer = Number(selectedEngagement?.buyer_commission_offer || 2);
        const brokerCounter = Number(selectedEngagement?.broker_commission_counter || 0);
        const commStatus = selectedEngagement?.commission_negotiation_status;
        
        // Determine whose turn it is for the info banner
        const isBrokerTurn = (commStatus === 'buyer_offered' || commStatus === 'pending');
        const isBuyerTurn = (commStatus === 'broker_countered');
        const isMyTurn = (isBuyer && isBuyerTurn) || (isBroker && isBrokerTurn);
        
        return (
          <div style={{ padding: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 48, margin: '0 0 8px' }}>💰</p>
              <h4 style={{ margin: '0 0 4px', color: '#1e293b' }}>Step 3/12: Commission Negotiation</h4>
              <p style={{ color: '#64748b', fontSize: 13 }}>Agree on the broker's commission before property negotiation begins</p>
            </div>

            {/* Commission Offer Summary Cards */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <div style={{ flex: 1, background: '#eff6ff', borderRadius: 10, padding: 12, textAlign: 'center', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase' }}>Buyer's Offer</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#1e40af' }}>{buyerOffer}%</div>
              </div>
              {brokerCounter > 0 && (
                <div style={{ flex: 1, background: '#fef3c7', borderRadius: 10, padding: 12, textAlign: 'center', border: '1px solid #fcd34d' }}>
                  <div style={{ fontSize: 10, color: '#d97706', fontWeight: 700, textTransform: 'uppercase' }}>Broker's Counter</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#92400e' }}>{brokerCounter}%</div>
                </div>
              )}
              <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 10, padding: 12, textAlign: 'center', border: '1px solid #86efac' }}>
                <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>System Fee</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#065f46' }}>5%</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>Paid by {selectedEngagement?.system_fee_payer || 'buyer'}</div>
              </div>
            </div>

            {/* Turn indicator banner */}
            {isMyTurn ? (
              <div style={{ padding: 10, background: '#eff6ff', borderRadius: 8, marginBottom: 12, fontSize: 12, color: '#1e40af', textAlign: 'center', border: '1px solid #bfdbfe', fontWeight: 600 }}>
                🔔 It's your turn! {isBuyer ? `The broker countered with ${brokerCounter}%.` : `The buyer offered ${buyerOffer}%.`} Please select your decision below.
              </div>
            ) : (
              <div style={{ padding: 10, background: 'linear-gradient(135deg, #fef3c7, #fef9c3)', borderRadius: 8, marginBottom: 12, fontSize: 12, color: '#92400e', textAlign: 'center', border: '1px solid #fde68a' }}>
                ⏳ Waiting for the {isBuyer ? 'broker' : 'buyer'} to respond. You can still submit a decision below.
              </div>
            )}

            {/* Decision Buttons — Accept / Counter / Reject — always visible */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Your Decision *</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, decision: 'accept_commission' })}
                  style={{
                    flex: 1, minWidth: '120px', padding: '14px 12px', borderRadius: 10, border: '2px solid',
                    borderColor: formData.decision === 'accept_commission' ? '#10b981' : '#e2e8f0',
                    background: formData.decision === 'accept_commission' ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : '#fff',
                    color: formData.decision === 'accept_commission' ? '#065f46' : '#475569',
                    cursor: 'pointer', fontWeight: 700, fontSize: 13, textAlign: 'center',
                    boxShadow: formData.decision === 'accept_commission' ? '0 4px 12px rgba(16,185,129,0.25)' : '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>✅</div>
                  Accept
                  <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2, color: '#6b7280' }}>
                    {isBuyer && brokerCounter > 0 ? `${brokerCounter}%` : `${buyerOffer}%`}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, decision: 'counter_commission' })}
                  style={{
                    flex: 1, minWidth: '120px', padding: '14px 12px', borderRadius: 10, border: '2px solid',
                    borderColor: formData.decision === 'counter_commission' ? '#f59e0b' : '#e2e8f0',
                    background: formData.decision === 'counter_commission' ? 'linear-gradient(135deg, #fffbeb, #fef3c7)' : '#fff',
                    color: formData.decision === 'counter_commission' ? '#92400e' : '#475569',
                    cursor: 'pointer', fontWeight: 700, fontSize: 13, textAlign: 'center',
                    boxShadow: formData.decision === 'counter_commission' ? '0 4px 12px rgba(245,158,11,0.25)' : '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>🔄</div>
                  Counter
                  <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2, color: '#6b7280' }}>New offer</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, decision: 'reject_commission' })}
                  style={{
                    flex: 1, minWidth: '120px', padding: '14px 12px', borderRadius: 10, border: '2px solid',
                    borderColor: formData.decision === 'reject_commission' ? '#ef4444' : '#e2e8f0',
                    background: formData.decision === 'reject_commission' ? 'linear-gradient(135deg, #fef2f2, #fee2e2)' : '#fff',
                    color: formData.decision === 'reject_commission' ? '#991b1b' : '#475569',
                    cursor: 'pointer', fontWeight: 700, fontSize: 13, textAlign: 'center',
                    boxShadow: formData.decision === 'reject_commission' ? '0 4px 12px rgba(239,68,68,0.25)' : '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>❌</div>
                  Reject
                  <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2, color: '#6b7280' }}>Cancel deal</div>
                </button>
              </div>
              {!formData.decision && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>⚠️ Please choose an action to proceed</p>}
            </div>

            {/* Counter Commission Input — only when Counter is selected */}
            {formData.decision === 'counter_commission' && (
              <div className="eng-form-group" style={{ background: '#fffbeb', padding: 14, borderRadius: 10, border: '1px solid #fde68a', marginBottom: 12 }}>
                <label style={{ fontWeight: 700, color: '#92400e' }}>Your Counter Commission (%) *</label>
                <input type="number" step="0.5" min="0.5" max="15" value={formData.counter_commission || ''}
                  onChange={(e) => setFormData({ ...formData, counter_commission: e.target.value })}
                  placeholder={`Counter the ${isBuyer ? 'broker\'s' : 'buyer\'s'} offer`}
                  style={{ borderColor: !formData.counter_commission ? '#ef4444' : '#fcd34d', fontWeight: 700, fontSize: 16 }}
                />
                <p style={{ fontSize: 11, color: '#a16207', marginTop: 4 }}>💡 Current {isBuyer ? 'broker' : 'buyer'} offer: {isBuyer ? brokerCounter : buyerOffer}%</p>
              </div>
            )}

            {/* Reject Confirmation Warning */}
            {formData.decision === 'reject_commission' && (
              <div style={{ padding: 12, background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca', marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: '#991b1b', fontWeight: 600, margin: 0 }}>⚠️ Warning: Rejecting will cancel this entire engagement permanently.</p>
              </div>
            )}

            {/* System Fee Payer */}
            <div className="eng-form-group">
              <label>System Fee (5%) Paid By</label>
              <select value={formData.system_fee_payer || selectedEngagement?.system_fee_payer || 'buyer'}
                onChange={(e) => setFormData({ ...formData, system_fee_payer: e.target.value })}>
                <option value="buyer">Buyer pays 5%</option>
                <option value="owner">Owner pays 5%</option>
                <option value="split">Split 50/50 (2.5% each)</option>
              </select>
            </div>

            {/* Financial Breakdown Preview */}
            <CommissionFinancialBreakdown 
              price={selectedEngagement?.current_offer || selectedEngagement?.starting_offer || 0}
              commPct={
                formData.decision === 'counter_commission' 
                  ? formData.counter_commission 
                  : (isBuyer && brokerCounter > 0 ? brokerCounter : buyerOffer)
              }
              feePayer={formData.system_fee_payer || selectedEngagement?.system_fee_payer || 'buyer'}
              engagementType={selectedEngagement?.engagement_type}
            />
          </div>
        );
      }

      case "view_property_media":
        return (
          <div style={{ padding: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 4px', color: '#1e293b', fontSize: 16 }}>🎥 Step 9/12: Property Review</h4>
              <p style={{ color: '#64748b', fontSize: 13 }}>Review the property video, location map, and documents before payment</p>
            </div>

            {/* Video Section */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>🎥 Property Video Tour</h4>
              {renderVideo(propertyMedia?.video_url)}
            </div>


            {/* Map Section */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>🗺️ View on Map</h4>
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

            {/* Documents Section */}
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>📄 Property Documents</h4>
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
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{doc.document_type} • {new Date(doc.uploaded_at).toLocaleDateString()}</div>
                          
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
                          {(!isBuyer || selectedEngagement?.status === 'media_released' || selectedEngagement?.status === 'completed') ? (
                            <button 
                              className="eng-btn eng-btn-outline" 
                              style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                              onClick={() => toggleKey(doc.id)}
                            >
                              {visibleKeys[doc.id] ? "🙈 Hide Key" : "🔑 Show Key"}
                            </button>
                          ) : null}

                           {(!isBuyer || enteredKeys[doc.id] === doc.access_key) ? (
                             <button 
                               className="eng-btn eng-btn-outline" 
                               style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                               onClick={() => {
                                 setViewingDoc(doc);
                                 setViewDocModal(true);
                               }}
                             >
                               👁️ View
                             </button>
                           ) : (
                             <button 
                               disabled 
                               className="eng-btn eng-btn-outline" 
                               style={{ fontSize: 11, padding: '4px 10px', opacity: 0.6, cursor: 'not-allowed' }}
                             >
                               🔒 Locked
                             </button>
                           )}
                        </div>
                      </div>

                      {visibleKeys[doc.id] && (
                        <div style={{ marginTop: 6, padding: '4px 8px', background: '#fffbeb', borderRadius: 4, border: '1px solid #fef3c7', fontSize: 11 }}>
                          <span style={{ color: '#92400e' }}>🔑 Access Key: </span>
                          <strong style={{ color: '#b45309', fontFamily: 'monospace' }}>{doc.access_key}</strong>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#94a3b8', fontSize: 13 }}>📄 No documents uploaded for this property</p>
                </div>
              )}
            </div>

            {/* Action to confirm media viewed */}
            {isBuyer && selectedEngagement?.status === "media_released" && (
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                  After reviewing the property, map, and documents, please confirm to proceed to payment.
                </p>
                <button
                  className="eng-btn eng-btn-success"
                  style={{ width: '100%', padding: '12px' }}
                  onClick={async () => {
                    if (!window.confirm("Confirm that you have reviewed the property media and documents?")) return;
                    try {
                      setActionLoading(true);
                      const res = await axios.put(`${API}/${selectedEngagement.id}/mark-media-viewed`, { buyer_id: user.id });
                      if (res.data.success) {
                        alert(`✅ ${res.data.message}`);
                        closeModal();
                        fetchEngagements();
                      }
                    } catch (err) {
                      alert("❌ Failed to mark media as viewed.");
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Processing..." : "✅ I Have Reviewed All Information"}
                </button>
              </div>
            )}
          </div>
        );

      case "broker_negotiate":
        return (
          <>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 12 }}>
              Current offer: <strong>{Number(selectedEngagement?.current_offer || 0).toLocaleString()} ETB{isRentalEng(selectedEngagement) ? " / month" : ""}</strong>
            </p>
            {isRentalEng(selectedEngagement) && (
              <div style={{ padding: "8px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", marginBottom: "12px", fontSize: "13px", color: "#166534" }}>
                <strong>⏳ Lease Duration:</strong> {selectedEngagement.rental_duration_months} Months<br/>
                <strong>🗓️ Payment Schedule:</strong> <span style={{textTransform: 'capitalize'}}>{selectedEngagement.payment_schedule || 'monthly'}</span>
              </div>
            )}
            <p style={{ color: "#f59e0b", fontSize: 12, marginBottom: 12, fontStyle: "italic" }}>
              ⚠️ This offer will be sent to the {bt(selectedEngagement).toLowerCase()} for approval before going to the {ol(selectedEngagement).toLowerCase()}.
            </p>
            <div className="eng-form-group">
              <label>Proposed Offer Price (ETB) *</label>
              <input type="number" value={formData.offer_price || ""} onChange={(e) => setFormData({ ...formData, offer_price: e.target.value })}
                placeholder={`e.g. ${selectedEngagement?.current_offer || ""}`} />
            </div>
            <div className="eng-form-group">
              <label>Message to Owner</label>
              <textarea value={formData.message || ""} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="Negotiation message..." rows="3" />
            </div>
            <div className="eng-form-group">
              <label>System Fee (5%) Paid By</label>
              <select value={formData.system_fee_payer || selectedEngagement?.system_fee_payer || "buyer"}
                onChange={(e) => setFormData({ ...formData, system_fee_payer: e.target.value })}>
                <option value="buyer">Buyer pays</option>
                <option value="owner">Owner pays</option>
                <option value="split">Split 50/50</option>
              </select>
            </div>

            <CommissionFinancialBreakdown 
              price={formData.offer_price || selectedEngagement?.current_offer || 0}
              commPct={selectedEngagement?.agreed_commission_pct || 2.5}
              feePayer={formData.system_fee_payer || selectedEngagement?.system_fee_payer || 'buyer'}
              engagementType={selectedEngagement?.engagement_type}
            />
          </>

        );

      case "buyer_review_draft":
        return (
          <div style={{ padding: 20 }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <p style={{ fontSize: 48, margin: "0 0 12px" }}>📋</p>
              <h4 style={{ margin: "0 0 8px", color: "#1e293b" }}>Review Broker's Draft Offer</h4>
              <p style={{ color: "#64748b", fontSize: 14 }}>
                Your broker has proposed the following offer to send to the property owner:
              </p>
            </div>
            <div style={{ background: "#fffbeb", border: "2px solid #f59e0b", borderRadius: 12, padding: 16, textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#92400e", fontWeight: 600, marginBottom: 4 }}>PROPOSED {isRentalEng(selectedEngagement) ? "RENT" : "OFFER"}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#b45309" }}>
                {Number(selectedEngagement?.draft_offer_price || 0).toLocaleString()} ETB{isRentalEng(selectedEngagement) ? " / month" : ""}
              </div>
              {isRentalEng(selectedEngagement) && (
                <div style={{ fontSize: 13, color: "#92400e", marginTop: 8 }}>
                  <strong>Duration:</strong> {selectedEngagement.rental_duration_months} Months &nbsp;|&nbsp; <strong>Schedule:</strong> <span style={{textTransform: 'capitalize'}}>{selectedEngagement.payment_schedule || 'monthly'}</span>
                </div>
              )}
              <div style={{ fontSize: 13, color: "#92400e", marginTop: 8 }}>
                <strong>System Fee Payer:</strong> <span style={{textTransform: 'capitalize'}}>{selectedEngagement?.system_fee_payer || 'Buyer'}</span>
              </div>

            </div>
            <div className="eng-form-group">
              <label>Your Decision *</label>
              <select value={formData.decision || ""} onChange={(e) => setFormData({ ...formData, decision: e.target.value })}>
                <option value="">-- Select --</option>
                <option value="approve">✅ Approve — Send to {ol(selectedEngagement)}</option>
                <option value="reject">❌ Reject — Ask Broker to Revise</option>
              </select>
            </div>
            {formData.decision === "reject" && (
              <div className="eng-form-group">
                <label>Reason for Rejection</label>
                <textarea 
                  value={formData.reject_reason || ""} 
                  onChange={(e) => setFormData({ ...formData, reject_reason: e.target.value })} 
                  placeholder="e.g. Price too high, I want to offer less..." 
                  rows="3" 
                />
              </div>
            )}
          </div>
        );

      case "owner_respond":
        return (
          <>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 12 }}>
              Broker's offer: <strong>{Number(selectedEngagement?.current_offer || 0).toLocaleString()} ETB{isRentalEng(selectedEngagement) ? " / month" : ""}</strong>
              <br/>
              System Fee Payer: <span style={{textTransform: 'capitalize', fontWeight: 600}}>{selectedEngagement?.system_fee_payer || 'buyer'}</span>
            </p>

            {isRentalEng(selectedEngagement) && (
              <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", color: "#166534" }}>
                <p style={{ margin: "0 0 4px" }}><strong>⏳ Lease Duration:</strong> {selectedEngagement.rental_duration_months} Months</p>
                <p style={{ margin: 0 }}><strong>🗓️ Payment Schedule:</strong> <span style={{textTransform: 'capitalize'}}>{selectedEngagement.payment_schedule || 'monthly'}</span></p>
              </div>
            )}
            <div className="eng-form-group">
              <label>Your Decision *</label>
              <select value={formData.decision || ""} onChange={(e) => setFormData({ ...formData, decision: e.target.value })}>
                <option value="">-- Select --</option>
                <option value="accept">✅ Accept Offer</option>
                <option value="counter">🔄 Counter-Offer</option>
                <option value="reject">❌ Reject Offer</option>
              </select>
            </div>
            {formData.decision === "counter" && (
              <div className="eng-form-group">
                <label>Your Counter Price (ETB) *</label>
                <input type="number" value={formData.counter_price || ""} onChange={(e) => setFormData({ ...formData, counter_price: e.target.value })} placeholder="Enter your counter price" />
              </div>
            )}
            <div className="eng-form-group">
              <label>Message</label>
              <textarea value={formData.message || ""} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="Message to the broker..." rows="3" />
            </div>
            {(formData.decision === "accept" || formData.decision === "counter") && (
              <div className="eng-form-group">
                <label>System Fee (5%) Paid By</label>
                <select value={formData.system_fee_payer || selectedEngagement?.system_fee_payer || "buyer"}
                  onChange={(e) => setFormData({ ...formData, system_fee_payer: e.target.value })}>
                  <option value="buyer">Buyer pays</option>
                  <option value="owner">Owner pays</option>
                  <option value="split">Split 50/50</option>
                </select>
              </div>
            )}

            <CommissionFinancialBreakdown 
              price={formData.decision === 'counter' ? formData.counter_price : (selectedEngagement?.current_offer || 0)}
              commPct={selectedEngagement?.agreed_commission_pct || 2.5}
              feePayer={formData.system_fee_payer || selectedEngagement?.system_fee_payer || 'buyer'}
              engagementType={selectedEngagement?.engagement_type}
            />
          </>

        );

      case "broker_advise":
        return (
          <>
            <div style={{ background: "#fef3c7", padding: 12, borderRadius: 10, marginBottom: 16, border: "1px solid #fcd34d" }}>
              <p style={{ margin: 0, fontSize: 13, color: "#92400e" }}>
                <strong>Owner's Counter-Offer:</strong> {Number(selectedEngagement?.owner_counter_price || 0).toLocaleString()} ETB
              </p>
              {selectedEngagement?.owner_counter_message && (
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#78350f" }}>"{selectedEngagement.owner_counter_message}"</p>
              )}
            </div>
            <div className="eng-form-group">
              <label>Your Recommendation *</label>
              <select value={formData.recommendation || ""} onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}>
                <option value="">-- Select Your Recommendation --</option>
                <option value="accept">✅ Recommend Accept — Good deal for the {bt(selectedEngagement).toLowerCase()}</option>
                <option value="counter">🔄 Recommend Counter — Suggest a different price</option>
                <option value="walk_away">🚫 Recommend Walk Away — Not worth it</option>
              </select>
            </div>
            <div className="eng-form-group">
              <label>Advice Message to {bt(selectedEngagement)} *</label>
              <textarea value={formData.message || ""} onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={`Explain your recommendation to the ${bt(selectedEngagement).toLowerCase()}...`} rows="4" />
            </div>
          </>
        );

      case "buyer_authorize":
        return (
          <>
            {/* Show counter-offer + broker advice */}
            {selectedEngagement?.owner_counter_price && (
              <div style={{ background: "#fef3c7", padding: 12, borderRadius: 10, marginBottom: 12, border: "1px solid #fcd34d" }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#92400e" }}>
                  🏢 Owner's Counter-Offer: {Number(selectedEngagement.owner_counter_price).toLocaleString()} ETB
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#92400e" }}>
                  <strong>System Fee Payer:</strong> <span style={{textTransform: 'capitalize'}}>{selectedEngagement?.system_fee_payer || 'buyer'}</span>
                </p>

                {selectedEngagement.owner_counter_message && (
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#78350f" }}>"{selectedEngagement.owner_counter_message}"</p>
                )}
              </div>
            )}
            {selectedEngagement?.broker_recommendation && (
              <div className="advice-panel" style={{ marginBottom: 16 }}>
                <div className="advice-header">
                  <h4>🧑‍💼 Broker's Recommendation</h4>
                  <span className={`rec-badge ${selectedEngagement.broker_recommendation}`}>
                    {selectedEngagement.broker_recommendation === "accept" ? "✅ Accept" :
                     selectedEngagement.broker_recommendation === "counter" ? "🔄 Counter" : "🚫 Walk Away"}
                  </span>
                </div>
                {selectedEngagement.broker_advice && <p className="advice-text">{selectedEngagement.broker_advice}</p>}
              </div>
            )}
            <div className="eng-form-group">
              <label>Your Authorization *</label>
              <select value={formData.authorization || ""} onChange={(e) => setFormData({ ...formData, authorization: e.target.value })}>
                <option value="">-- Select --</option>
                <option value="authorize_accept">✅ Authorize Acceptance — Accept the counter-offer</option>
                <option value="authorize_counter">🔄 Authorize Counter — Propose a different price</option>
                <option value="cancel">❌ Cancel Representation — End broker engagement</option>
              </select>
            </div>
            {formData.authorization === "authorize_counter" && (
              <div className="eng-form-group">
                <label>Your Counter Price (ETB) *</label>
                <input type="number" value={formData.counter_price || ""} onChange={(e) => setFormData({ ...formData, counter_price: e.target.value })}
                  placeholder="Enter your counter price" />
              </div>
            )}
            <div className="eng-form-group">
              <label>Message (optional)</label>
              <textarea value={formData.message || ""} onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Any message to your broker..." rows="3" />
            </div>
            {(formData.authorization === "authorize_accept" || formData.authorization === "authorize_counter") && (
              <div className="eng-form-group">
                <label>System Fee (5%) Paid By</label>
                <select value={formData.system_fee_payer || selectedEngagement?.system_fee_payer || "buyer"}
                  onChange={(e) => setFormData({ ...formData, system_fee_payer: e.target.value })}>
                  <option value="buyer">Buyer pays</option>
                  <option value="owner">Owner pays</option>
                  <option value="split">Split 50/50</option>
                </select>
              </div>
            )}

            <CommissionFinancialBreakdown 
              price={formData.authorization === 'authorize_counter' ? formData.counter_price : (selectedEngagement?.owner_counter_price || selectedEngagement?.current_offer || 0)}
              commPct={selectedEngagement?.agreed_commission_pct || 2.5}
              feePayer={formData.system_fee_payer || selectedEngagement?.system_fee_payer || 'buyer'}
              engagementType={selectedEngagement?.engagement_type}
            />
          </>

        );

      case "broker_finalize":
        return (
          <div style={{ textAlign: "center", padding: 20 }}>
            <p style={{ fontSize: 48, margin: "0 0 12px" }}>🎯</p>
            <h4 style={{ margin: "0 0 8px", color: "#1e293b" }}>Finalize the Deal</h4>
            <p style={{ color: "#64748b", fontSize: 14 }}>
              Agreed price: <strong style={{ color: "#059669" }}>{Number(selectedEngagement?.agreed_price || 0).toLocaleString()} ETB</strong>
            </p>
            <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 8 }}>
              Clicking "Finalize" will notify the admin to generate the contract for all three parties to sign.
            </p>
          </div>
        );

      case "generate_contract":
        return (
          <div style={{ textAlign: "center", padding: 20 }}>
            <p style={{ fontSize: 48, margin: "0 0 12px" }}>📄</p>
            <h4 style={{ margin: "0 0 8px", color: "#1e293b" }}>Generate PDF Contract</h4>
            <p style={{ color: "#64748b", fontSize: 14 }}>
              Agreed price: <strong>{Number(selectedEngagement?.agreed_price || 0).toLocaleString()} ETB</strong>
            </p>
            <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 8 }}>
              This will create the binding contract for: {bt(selectedEngagement)}, Broker, and {ol(selectedEngagement)}.
              All three parties will need to sign in order: {bt(selectedEngagement)} → Broker → {ol(selectedEngagement)}.
            </p>
          </div>
        );

      case "sign":
        const hasViewed = viewedEngagements[selectedEngagement?.id];
        return (
          <div style={{ textAlign: "center", padding: 20 }}>
            <p style={{ fontSize: 48, margin: "0 0 12px" }}>✍️</p>
            <h4 style={{ margin: "0 0 8px", color: "#1e293b" }}>Digital Signature</h4>
            <p style={{ color: "#64748b", fontSize: 14 }}>
              By signing, you agree to the terms of the contract for the agreed price of{" "}
              <strong>{Number(selectedEngagement?.agreed_price || 0).toLocaleString()} ETB</strong>.
            </p>
            <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 8 }}>
              Signing as: <strong>{user.name}</strong> ({isBuyer ? "Buyer" : isBroker ? "Broker" : "Owner"})
              <br />Timestamp will be recorded for legal purposes.
            </p>
            {!hasViewed && (
              <div style={{ color: "#ef4444", fontSize: 13, background: "#fee2e2", padding: 12, borderRadius: 8, marginTop: 16 }}>
                ⚠️ You must view/read the PDF agreement before you can sign.
              </div>
            )}
          </div>
        );

      case "submit_payment": {
        const price = Number(selectedEngagement?.agreed_price || 0);
        const brkPct = Number(selectedEngagement?.agreed_commission_pct || 2);
        const feePayer = selectedEngagement?.system_fee_payer || 'buyer';
        const sysFee = price * 0.05;
        const brokerFee = price * (brkPct / 100);
        let buyerFee = 0;
        if (feePayer === 'buyer') buyerFee = sysFee + brokerFee;
        else if (feePayer === 'split') buyerFee = (sysFee + brokerFee) / 2;
        const totalAmount = price + buyerFee;
        const chapaAvailable = totalAmount <= 100000;

        return (
          <div style={{ padding: "10px" }}>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>
              💰 The contract is signed. Submit your payment details below.
            </p>

            {/* Amount Summary */}
            <div style={{ background: "#d1fae5", padding: 14, borderRadius: 10, marginBottom: 16, border: "1px solid #6ee7b7", textAlign: "center" }}>
              <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#065f46" }}>
                💰 Total Amount Due: {totalAmount.toLocaleString()} ETB
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "#047857" }}>
                Agreed price: {price.toLocaleString()} ETB{buyerFee > 0 ? ` + fees: ${buyerFee.toLocaleString()} ETB` : ''}
              </p>
            </div>

            {/* Payment Method Selection */}
            <div className="eng-form-group">
              <label>Payment Method *</label>
              <select value={formData.payment_method || ""} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}>
                <option value="">-- Select Payment Method --</option>
                {chapaAvailable && <option value="chapa">📱 Chapa (Online Payment)</option>}
                <option value="bank_transfer">🏦 Bank Transfer</option>
                <option value="cash">💵 Cash Deposit</option>
              </select>
            </div>

            {/* Chapa Info */}
            {formData.payment_method === "chapa" && (
              <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: 10, padding: "16px", textAlign: "center", marginBottom: "12px" }}>
                <p style={{ fontSize: 14, color: "#065f46", margin: 0 }}>
                  📱 You will be redirected to <strong>Chapa's secure payment portal</strong> to complete payment.
                </p>
                {bankAccounts.filter(acc => acc.type === 'chapa_manual').map(acc => (
                  <div key={acc._id} style={{ marginTop: '10px', padding: '10px', background: '#d1fae5', borderRadius: '8px', fontSize: '13px', color: '#065f46', border: '1px solid #10b981' }}>
                    <strong>Manual / Mobile Alternative:</strong> {acc.bank_name} - {acc.account_number} ({acc.account_name})
                  </div>
                ))}
              </div>
            )}

            {/* Bank Transfer Info */}
            {formData.payment_method === "bank_transfer" && (
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

            {/* Cash Info */}
            {formData.payment_method === "cash" && (
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "14px", marginBottom: "12px" }}>
                <p style={{ fontSize: 13, color: "#1e40af", margin: 0 }}>
                  💵 Please make a cash deposit at any DDREMS-approved branch and provide the receipt number below.
                </p>
              </div>
            )}

            {/* Manual Payment Fields */}
            {(formData.payment_method === "bank_transfer" || formData.payment_method === "cash") && (
              <>

                <div className="eng-form-group">
                  <label>Transaction Reference / Receipt Number *</label>
                  <input type="text" value={formData.payment_reference || ""} onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                    placeholder={formData.payment_method === "bank_transfer" ? "e.g., TXN-2026-001234" : "e.g., CASH-REC-001234"} />
                </div>

                <div className="eng-form-group">
                  <label>Receipt / Proof of Payment *</label>
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
                        reader.onloadend = () => setFormData({ ...formData, payment_receipt: reader.result });
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ width: "100%", padding: "10px", border: "1px dashed #cbd5e1", borderRadius: 8, background: "#f8fafc" }}
                  />
                  {formData.payment_receipt && <p style={{ fontSize: 12, color: "#059669", marginTop: 4 }}>✅ Receipt uploaded successfully</p>}
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

      case "verify_payment":
        return (
          <div style={{ padding: "10px" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <p style={{ fontSize: 48, margin: "0 0 8px" }}>✅</p>
              <h4 style={{ margin: "0 0 8px", color: "#1e293b" }}>Verify Buyer Payment</h4>
              <p style={{ color: "#64748b", fontSize: 14 }}>
                Review the payment details and uploaded receipt below before confirming.
              </p>
            </div>

            {/* Payment Details Grid */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px", marginBottom: "16px" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: 14, color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>📋 Payment Details</h4>
              <div style={{ display: "grid", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#64748b" }}>💰 Amount:</span>
                  <strong style={{ color: "#059669" }}>{Number(selectedEngagement?.agreed_price || 0).toLocaleString()} ETB</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#64748b" }}>🏦 Method:</span>
                  <strong style={{ color: "#1e293b" }}>{(selectedEngagement?.payment_method || "N/A").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#64748b" }}>🔖 Reference:</span>
                  <strong style={{ color: "#1e293b" }}>{selectedEngagement?.payment_reference || "N/A"}</strong>
                </div>
              </div>
            </div>

            {/* Receipt Preview */}
            {selectedEngagement?.payment_receipt ? (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "#1e293b" }}>🧾 Uploaded Payment Receipt</h4>
                <div style={{ border: "2px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
                  {getDocumentUrl(selectedEngagement.payment_receipt).startsWith("data:application/pdf") || getDocumentUrl(selectedEngagement.payment_receipt).toLowerCase().endsWith(".pdf") ? (
                    <iframe src={getDocumentUrl(selectedEngagement.payment_receipt)} style={{ width: "100%", height: "400px", border: "none" }} title="Payment Receipt PDF" />
                  ) : getDocumentUrl(selectedEngagement.payment_receipt).startsWith("data:image") || getDocumentUrl(selectedEngagement.payment_receipt).match(/\.(jpeg|jpg|gif|png)$/i) ? (
                    <img src={getDocumentUrl(selectedEngagement.payment_receipt)} alt="Payment Receipt" style={{ width: "100%", maxHeight: "400px", objectFit: "contain", display: "block" }} />
                  ) : (
                    <div style={{ padding: "20px", textAlign: "center" }}>
                      <a href={getDocumentUrl(selectedEngagement.payment_receipt)} target="_blank" rel="noopener noreferrer"
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

            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px" }}>
              <p style={{ margin: 0, fontSize: 12, color: "#9a3412" }}>
                ⚠️ By clicking Confirm, you verify that the funds have been safely received into DDREMS accounts. This will advance the engagement to the handover stage.
              </p>
            </div>
          </div>
        );

      case "reject_payment":
        return (
          <div style={{ textAlign: "center", padding: 20 }}>
            <p style={{ fontSize: 48, margin: "0 0 12px" }}>❌</p>
            <h4 style={{ margin: "0 0 12px", color: "#dc2626" }}>Reject Payment</h4>
            <p style={{ color: "#64748b", fontSize: 14 }}>
              The payment will be rejected, and the buyer will need to submit payment again.
            </p>
            <div className="eng-form-group" style={{ textAlign: "left", marginTop: 16 }}>
              <label>Reason for Rejection *</label>
              <textarea 
                value={formData.reason || ""} 
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="e.g. Funds not received in account, invalid reference number..."
                required
                style={{ width: "100%", minHeight: "80px", padding: "10px", borderColor: "#dc2626" }}
              />
            </div>
          </div>
        );

      case "confirm_handover":
        return (
          <div style={{ textAlign: "center", padding: 20 }}>
            <p style={{ fontSize: 48, margin: "0 0 12px" }}>🔑</p>
            <h4 style={{ margin: "0 0 8px", color: "#1e293b" }}>Confirm Property Handover</h4>
            <p style={{ color: "#64748b", fontSize: 14 }}>
              By confirming handover, you acknowledge that the <strong>property keys</strong> and <strong>physical possession</strong> of the property have been transferred.
            </p>
            <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 8 }}>
              Property: <strong>{selectedEngagement?.property_title}</strong><br />
              This action cannot be undone. The admin will then release funds.
            </p>
          </div>
        );

      case "owner_upload_media":
        return (
          <div style={{ padding: '10px' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>📹</div>
              <h4 style={{ margin: '0 0 4px', color: '#1e293b', fontSize: 18 }}>Property Video Tour</h4>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button 
                onClick={() => setFormData({ ...formData, video_input_type: 'file' })}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, border: 'none',
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
                  flex: 1, padding: '10px', borderRadius: 8, border: 'none',
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
              <div className="eng-form-group">
                <label>Video Link (YouTube, Vimeo, or Drive URL) *</label>
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
                      reader.onloadend = () => setFormData({ ...formData, video_file: reader.result, video_file_name: file.name });
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

            <div className="eng-form-group" style={{ marginTop: 24 }}>
              <label style={{ fontWeight: 600 }}>Additional Property Documents (Ownership Proof, Photos)</label>
              <input 
                type="file" 
                multiple
                accept="application/pdf,image/*" 
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  const docPromises = files.map(file => {
                    return new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve({ name: file.name, content: reader.result });
                      reader.readAsDataURL(file);
                    });
                  });
                  Promise.all(docPromises).then(docs => {
                    setFormData({ ...formData, additional_docs: docs });
                  });
                }}
                style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", marginTop: 8 }}
              />
            </div>
          </div>
        );

      case "release_media":
        return (
          <div style={{ padding: 10 }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <p style={{ fontSize: 48, margin: "0 0 12px" }}>🔍</p>
              <h4 style={{ margin: "0 0 4px", color: "#1e293b" }}>Verify Property Media</h4>
              <p style={{ color: "#64748b", fontSize: 13 }}>Review the media uploaded by the owner before releasing it to the buyer.</p>
            </div>

            {/* Video Preview */}
            <div style={{ marginBottom: 20 }}>
              <h5 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>🎥 Video Tour Preview</h5>
              {renderVideo(propertyMedia?.video_url)}
            </div>

            {/* Documents Preview */}
            <div style={{ marginBottom: 20 }}>
              <h5 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>📄 Uploaded Documents</h5>
              {propertyMedia?.documents && propertyMedia.documents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {propertyMedia.documents.map((doc) => (
                    <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 12, color: '#1e293b' }}>📄 {doc.document_name || doc.document_type}</span>
                      <a href={doc.document_path} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>View</a>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: 12 }}>No additional documents</p>
              )}
            </div>

            <p style={{ color: "#64748b", fontSize: 13, background: "#f0f9ff", padding: "12px", borderRadius: "8px", border: "1px solid #bae6fd" }}>
              By clicking **Confirm**, you verify that this media accurately represents the property. The documents access key will be released to the buyer.
            </p>
          </div>
        );

      case "release_funds": {
        const price = Number(selectedEngagement?.agreed_price || 0);
        const brkPct = Number(formData.broker_commission_pct || selectedEngagement?.agreed_commission_pct || 2);
        const sysPct = 5;
        const sysAmt = Math.round(price * sysPct / 100 * 100) / 100;
        const brkAmt = Math.round(price * brkPct / 100 * 100) / 100;
        const feePayer = selectedEngagement?.system_fee_payer || 'buyer';
        let ownerAmt;
        if (feePayer === 'owner') {
          ownerAmt = Math.round((price - sysAmt - brkAmt) * 100) / 100;
        } else if (feePayer === 'split') {
          ownerAmt = Math.round((price - (sysAmt / 2) - brkAmt) * 100) / 100;
        } else {
          ownerAmt = Math.round((price - brkAmt) * 100) / 100;
        }
        return (
          <>
            <div style={{ background: "#d1fae5", padding: 14, borderRadius: 10, marginBottom: 16, border: "1px solid #6ee7b7" }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#065f46", textAlign: "center" }}>
                💰 Agreed Price: {price.toLocaleString()} ETB
              </p>
            </div>
            <div className="eng-form-group">
              <label>System Commission (DDREMS Platform Fee) — Fixed</label>
              <div style={{ padding: '10px 14px', background: '#f1f5f9', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#475569' }}>
                5% (Constant) — Paid by: <strong style={{ color: '#6366f1' }}>{feePayer === 'split' ? 'Split 50/50' : feePayer.charAt(0).toUpperCase() + feePayer.slice(1)}</strong>
              </div>
            </div>
            <div className="eng-form-group">
              <label>Broker Commission % (Negotiated)</label>
              <input type="number" step="0.5" min="0" max="20" value={formData.broker_commission_pct || selectedEngagement?.agreed_commission_pct || 2}
                onChange={(e) => setFormData({ ...formData, broker_commission_pct: e.target.value })} />
              {selectedEngagement?.agreed_commission_pct && (
                <p style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>✅ Negotiated rate: {selectedEngagement.agreed_commission_pct}%</p>
              )}
            </div>
            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "#1e293b" }}>💸 Fund Breakdown</h4>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: "#64748b" }}>System Fee (5% — {feePayer === 'split' ? 'Split 50/50' : `paid by ${feePayer}`})</span>
                <strong style={{ color: "#dc2626" }}>{sysAmt.toLocaleString()} ETB</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: "#64748b" }}>Broker Commission ({brkPct}%)</span>
                <strong style={{ color: "#8b5cf6" }}>{brkAmt.toLocaleString()} ETB</strong>
              </div>
              <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "8px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15 }}>
                <span style={{ color: "#1e293b", fontWeight: 700 }}>Owner Payout</span>
                <strong style={{ color: "#059669", fontSize: 16 }}>{ownerAmt.toLocaleString()} ETB</strong>
              </div>
            </div>
          </>
        );
      }

      case "messages":
      case "details":
        const eng = selectedEngagement;
        return (
          <div>
            {/* Detail section */}
            <div className="eng-detail-grid">
              <div className="detail-item"><span className="detail-label">Property</span><span className="detail-value">{eng?.property_title}</span></div>
              <div className="detail-item"><span className="detail-label">Location</span><span className="detail-value">{eng?.property_location}</span></div>
              <div className="detail-item"><span className="detail-label">{eng?.engagement_type === 'rent' ? 'Tenant' : 'Buyer'}</span><span className="detail-value">{eng?.buyer_name}</span></div>
              <div className="detail-item"><span className="detail-label">Broker</span><span className="detail-value">{eng?.broker_name}</span></div>
              <div className="detail-item"><span className="detail-label">{eng?.engagement_type === 'rent' ? 'Landlord' : 'Owner'}</span><span className="detail-value">{eng?.owner_name}</span></div>
              {eng?.engagement_type === 'rent' && (
                <div className="detail-item"><span className="detail-label">Transaction Type</span><span className="detail-value" style={{color: '#065f46', fontWeight: 700}}>🔑 Rental</span></div>
              )}
              {!isOwner && (
                <div className="detail-item"><span className="detail-label">Starting Offer</span><span className="detail-value">{Number(eng?.starting_offer || 0).toLocaleString()} ETB{eng?.engagement_type === 'rent' ? ' / month' : ''}</span></div>
              )}
              <div className="detail-item"><span className="detail-label">Current Offer</span><span className="detail-value">{Number(eng?.current_offer || 0).toLocaleString()} ETB{eng?.engagement_type === 'rent' ? ' / month' : ''}</span></div>
              {eng?.agreed_price && <div className="detail-item"><span className="detail-label">Agreed {eng?.engagement_type === 'rent' ? 'Rent' : 'Price'}</span><span className="detail-value" style={{ color: "#059669", fontWeight: 700 }}>{Number(eng.agreed_price).toLocaleString()} ETB{eng?.engagement_type === 'rent' ? ' / month' : ''}</span></div>}
              {eng?.engagement_type === 'rent' && (
                <>
                  <div className="detail-item"><span className="detail-label">Lease Duration</span><span className="detail-value">{eng.rental_duration_months} Months</span></div>
                  <div className="detail-item"><span className="detail-label">Payment Schedule</span><span className="detail-value" style={{textTransform:'capitalize'}}>{eng.payment_schedule || 'monthly'}</span></div>
                  {eng.security_deposit > 0 && (
                    <div className="detail-item"><span className="detail-label">Security Deposit</span><span className="detail-value">{Number(eng.security_deposit).toLocaleString()} ETB</span></div>
                  )}
                </>
              )}
            </div>

            {/* Signatures */}
            {signatures.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#1e293b" }}>✍️ Signatures</h4>
                <div className="sig-section">
                  {["buyer", "broker", "owner"].map((role) => {
                    const sig = signatures.find((s) => s.signer_role === role);
                    return (
                      <div key={role} className={`sig-item ${sig ? "signed" : "unsigned"}`}>
                        {sig ? "✅" : "⬜"} {role === 'buyer' ? bt(eng) : role === 'owner' ? ol(eng) : 'Broker'}
                        {sig && <div className="sig-time">{new Date(sig.signed_at).toLocaleString()}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Messages */}
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#1e293b" }}>💬 Message Thread</h4>
            <div className="eng-message-thread">
              {messages.length === 0 && <p style={{ color: "#94a3b8", textAlign: "center", fontSize: 13 }}>No messages yet</p>}
              {messages.map((msg) => {
                const isMine = msg.sender_id === user.id;
                const isSystem = msg.sender_role === "system";
                return (
                  <div key={msg.id} className={`eng-msg ${isSystem ? "system-msg" : isMine ? "sent" : "received"}`}>
                    <div className="eng-msg-bubble">
                      {msg.message_type && msg.message_type !== "general" && msg.message_type !== "system" && (
                        <span className={`eng-msg-type-badge ${msg.message_type}`}>{msg.message_type}</span>
                      )}
                      {msg.message}
                    </div>
                    <div className="eng-msg-meta">
                      <span className="sender-name">{isSystem ? "System" : msg.sender_name || "Unknown"}</span>
                      <span>{new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Send message */}
            {!["completed", "cancelled", "broker_declined"].includes(eng?.status) && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input type="text" value={formData.newMessage || ""} onChange={(e) => setFormData({ ...formData, newMessage: e.target.value })}
                  placeholder="Type a message..." style={{ flex: 1, padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }} />
                <button className="eng-btn eng-btn-primary" disabled={!formData.newMessage || actionLoading}
                  onClick={async () => {
                    if (!formData.newMessage) return;
                    try {
                      await axios.post(`${API}/${eng.id}/messages`, {
                        sender_id: user.id,
                        sender_role: isBuyer ? "buyer" : isBroker ? "broker" : isOwner ? "owner" : "admin",
                        message: formData.newMessage,
                        message_type: "general",
                      });
                      setFormData({ ...formData, newMessage: "" });
                      await fetchMessages(eng.id);
                    } catch (err) {
                      alert(`❌ ${err.response?.data?.message || err.message}`);
                    }
                  }}>
                  Send
                </button>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#1e293b" }}>📜 Audit History</h4>
                <div className="eng-history-timeline">
                  {history.map((h) => (
                    <div key={h.id} className="eng-history-item">
                      <div className="history-action">{h.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</div>
                      <div className="history-meta">
                        By {h.action_by_name || "System"} • {new Date(h.created_at).toLocaleString()}
                        {h.previous_status && ` • ${h.previous_status} → ${h.new_status}`}
                      </div>
                      {h.notes && <div className="history-notes">{h.notes}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "view_contract":
        return (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <button
                className="eng-btn eng-btn-success"
                style={{ fontSize: 12, padding: "8px 20px", fontWeight: 700, letterSpacing: 0.3 }}
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
              >
                {pdfLoading ? (
                  <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6, borderWidth: 2, display: "inline-block", verticalAlign: "middle" }} /> Generating PDF...</>
                ) : (
                  "📥 Download PDF"
                )}
              </button>
              <button
                className="eng-btn eng-btn-primary"
                style={{ fontSize: 12, padding: "6px 16px" }}
                onClick={() => {
                  const printWindow = window.open("", "_blank");
                  printWindow.document.write(contractHTML);
                  printWindow.document.close();
                  printWindow.focus();
                  setTimeout(() => { printWindow.print(); }, 500);
                }}
              >
                🖨️ Print
              </button>
              <button
                className="eng-btn eng-btn-outline"
                style={{ fontSize: 12, padding: "6px 16px" }}
                onClick={() => {
                  const printWindow = window.open("", "_blank");
                  printWindow.document.write(contractHTML);
                  printWindow.document.close();
                }}
              >
                🔎 Open Full View
              </button>
            </div>
            <div
              ref={contractRef}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                overflow: "auto",
                maxHeight: 500,
                background: "#fff",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)"
              }}
              dangerouslySetInnerHTML={{ __html: contractHTML }}
            />
          </div>
        );

      default:
        return <p>Unknown action</p>;
    }
  };

  const getModalTitle = () => {
    switch (modalType) {
      case "commission_respond": return "💰 Commission Negotiation";
      case "view_property_media": return "🎥 Property Review";
      case "hire": return "🤝 Hire a Broker";
      case "broker_accept": return "🤝 Accept Representation";
      case "broker_reject": return "❌ Reject Representation";
      case "broker_negotiate": return "📝 Draft Offer for Buyer Approval";
      case "buyer_review_draft": return "📋 Review Draft Offer";
      case "owner_respond": return "📋 Respond to Broker's Offer";
      case "broker_advise": return "📋 Advise the Buyer";
      case "owner_upload_media": return "🎥 Upload Property Media";
      case "view_contract": return "📄 View Agreement Contract";
      case "broker_finalize": return "🎯 Finalize Deal";
      case "generate_contract": return "📄 Generate Contract";
      case "sign": return "✍️ Sign Contract";
      case "submit_payment": return "💰 Submit Payment";
      case "verify_payment": return "✅ Verify Payment";
      case "reject_payment": return "❌ Reject Payment";
      case "confirm_handover": return "🔑 Confirm Handover";
      case "release_funds": return "💸 Release Funds";
      case "send_message": return "💬 Send Message";
      case "messages": return "💬 Engagement Thread";
      case "details": return "👁️ Engagement Details";
      default: return "Action";
    }
  };

  // Determine if the Confirm button should show:
  // Hide for view-only modals AND hide for commission_respond when it's NOT the user's turn
  const showSubmitButton = !["messages", "details", "view_contract", "view_property_media"].includes(modalType);

  // ── Main Render ──
  return (
    <div className="broker-engagement-page">
      <h2>🤝 Broker-Assisted Purchases</h2>
      <p className="page-subtitle">
        {isBuyer && "Hire a broker to negotiate property purchases on your behalf."}
        {isBroker && "Manage your buyer engagements and negotiate with property owners."}
        {isOwner && "View and respond to offers from brokers representing buyers."}
        {canViewAll && "Monitor all broker-assisted property purchase workflows."}
      </p>

      <div className="engagement-top-bar">
        <span style={{ color: "#64748b", fontSize: 14 }}>{engagements.length} engagement{engagements.length !== 1 ? "s" : ""}</span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!isBroker && engagements.some(e => e.broker_id) && (
            <button className="eng-btn eng-btn-outline" onClick={() => fetchUserInfo(engagements.find(e => e.broker_id).broker_id)} style={{ background: '#faf5ff', borderColor: '#e9d5ff', color: '#7c3aed', padding: '10px 20px', borderRadius: '10px', height: '40px', fontSize: '14px', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.15)', margin: 0, fontWeight: 600 }}>
              🧑‍💼 Broker Info
            </button>
          )}
          {isBuyer && (
            <button className="btn-hire-broker" onClick={() => openModal("hire", null)} style={{ height: '40px', margin: 0 }}>
              🤝 Hire a Broker
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="engagement-loading">
          <div className="spinner" />
          <p>Loading engagements...</p>
        </div>
      ) : engagements.length === 0 ? (
        <div className="engagement-empty">
          <div className="empty-icon">🤝</div>
          <p>
            {isBuyer && "No broker engagements yet. Click \"Hire a Broker\" to get started!"}
            {isBroker && "No engagement requests yet. Buyers will contact you when they need representation."}
            {isOwner && "No broker offers received yet."}
            {canViewAll && "No broker-assisted engagements in the system."}
          </p>
        </div>
      ) : (
        <div className="engagement-grid">
          {engagements.map(renderCard)}
        </div>
      )}

      
      {/* User Info Modal */}
      {showUserInfoModal && userInfoData && (
        <div className="eng-modal-overlay" onClick={() => setShowUserInfoModal(false)}>
          <div className="eng-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="eng-modal-header">
              <h3>👤 {userInfoData.role === 'broker' ? 'Broker Profile' : 'Customer Profile'}</h3>
              <button className="eng-modal-close" onClick={() => setShowUserInfoModal(false)}>✕</button>
            </div>
            <div className="eng-modal-body" style={{ textAlign: 'center' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: userInfoData.role === 'broker' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'linear-gradient(135deg, #10b981, #3b82f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px', fontWeight: 700, color: '#fff',
                margin: '0 auto 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', overflow: 'hidden'
              }}>
                {userInfoData.profile_image ? (
                  <img src={`${window.API_BASE}${userInfoData.profile_image}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (userInfoData.name?.charAt(0)?.toUpperCase() || 'U')}
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '18px', color: '#1e293b' }}>{userInfoData.name}</h3>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{userInfoData.role?.toUpperCase()}</p>
              
              <div style={{ textAlign: 'left', background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>📧 Email</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{userInfoData.email || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>📱 Phone</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{userInfoData.phone || 'N/A'}</span>
                </div>
                {userInfoData.role === 'broker' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>🏢 License</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{userInfoData.license_number || 'N/A'}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>📍 Since</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{new Date(userInfoData.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="eng-btn eng-btn-primary" 
                  style={{ flex: 1, justifyContent: 'center', padding: '10px' }}
                  onClick={() => {
                    setShowUserInfoModal(false);
                    if (selectedEngagement) openModal('send_message', selectedEngagement);
                  }}
                >
                  💬 Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="eng-modal-overlay" onClick={closeModal}>
          <div className="eng-modal" onClick={(e) => e.stopPropagation()}>
            <div className="eng-modal-header">
              <h3>{getModalTitle()}</h3>
              <button className="eng-modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="eng-modal-body">
              {renderModalContent()}
            </div>
            {showSubmitButton && (
              <div className="eng-modal-footer">
                <button className="eng-btn eng-btn-outline" onClick={closeModal}>Cancel</button>
                <button 
                  className="eng-btn eng-btn-primary" 
                  onClick={submitAction} 
                  disabled={actionLoading || (modalType === "sign" && !viewedEngagements[selectedEngagement?.id])}
                  style={modalType === 'commission_respond' && formData.decision ? {
                    background: formData.decision === 'accept_commission' ? 'linear-gradient(135deg, #10b981, #059669)' :
                                formData.decision === 'reject_commission' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                                formData.decision === 'counter_commission' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : undefined,
                    fontWeight: 700, fontSize: 14
                  } : {}}
                >
                  {actionLoading ? "Processing..." : 
                    modalType === 'commission_respond' ? (
                      formData.decision === 'accept_commission' ? '✅ Confirm Accept' :
                      formData.decision === 'reject_commission' ? '❌ Confirm Reject' :
                      formData.decision === 'counter_commission' ? '🔄 Send Counter Offer' :
                      '💰 Confirm Decision'
                    ) : "Confirm"
                  }
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewDocModal && viewingDoc && (
        <div className="eng-modal-overlay" onClick={() => setViewDocModal(false)} style={{ zIndex: 1200 }}>
          <div className="eng-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', width: '90%', maxHeight: '90vh' }}>
            <div className="eng-modal-header" style={{ borderBottom: '1px solid #e2e8f0', padding: '16px 20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>📄 {viewingDoc.document_name || viewingDoc.document_type}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                  {viewingDoc.document_type?.replace('_', ' ').toUpperCase()} • Uploaded: {new Date(viewingDoc.uploaded_at || viewingDoc.created_at).toLocaleDateString()}
                </p>
              </div>
              <button className="eng-modal-close" onClick={() => setViewDocModal(false)}>✕</button>
            </div>
            <div className="eng-modal-body" style={{ padding: 0, overflow: 'hidden', height: 'calc(90vh - 120px)', background: '#f1f5f9' }}>
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                  {getDocumentUrl(viewingDoc.document_path).startsWith('data:application/pdf') ? (
                    <iframe
                      src={getDocumentUrl(viewingDoc.document_path)}
                      style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#fff', minHeight: '600px' }}
                      title="Document Preview"
                    />
                  ) : getDocumentUrl(viewingDoc.document_path).startsWith('data:image') || getDocumentUrl(viewingDoc.document_path).includes('.jpg') || getDocumentUrl(viewingDoc.document_path).includes('.png') || getDocumentUrl(viewingDoc.document_path).includes('.jpeg') ? (
                    <img
                      src={getDocumentUrl(viewingDoc.document_path)}
                      alt="Document Preview"
                      style={{ maxWidth: '100%', height: 'auto', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: '#fff' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', background: '#fff', borderRadius: 12, width: '100%' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📄</div>
                      <p>Document preview not available for this file type.</p>
                      <a 
                        href={getDocumentUrl(viewingDoc.document_path)} 
                        download={viewingDoc.document_name}
                        className="eng-btn eng-btn-primary"
                        style={{ marginTop: 20, display: 'inline-flex' }}
                      >
                        📥 Download Document
                      </a>
                    </div>
                  )}
                </div>
                <div style={{ padding: '16px 20px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="eng-btn eng-btn-outline" onClick={() => setViewDocModal(false)}>Close Viewer</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrokerEngagement;
