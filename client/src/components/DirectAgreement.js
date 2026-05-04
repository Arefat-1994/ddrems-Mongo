import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import "./DirectAgreement.css";

// Fix missing marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API = "/api/agreement-workflow";

const STEP_LABELS = [
  "Negotiate","Admin Review","Agreement","Buyer Sign","Owner Sign",
  "Video Upload","Video Verify","Review Media","Payment","Verify Pay","Handover","Complete"
];

const STATUS_MAP = {
  price_negotiation:      { step:1, color:"#f59e0b", emoji:"💰", label:"Negotiating Price" },
  owner_counter_offered:  { step:2, color:"#f59e0b", emoji:"🔄", label:"Owner Counter Offer" },
  buyer_counter_offered:  { step:2, color:"#f59e0b", emoji:"🔄", label:"Buyer Counter Offer" },
  pending_admin_review:   { step:3, color:"#8b5cf6", emoji:"🔍", label:"Admin Review" },
  waiting_owner_response: { step:2, color:"#6366f1", emoji:"⏳", label:"Waiting Owner" },
  owner_accepted:         { step:3, color:"#22c55e", emoji:"✅", label:"Owner Accepted" },
  owner_rejected:         { step:3, color:"#ef4444", emoji:"❌", label:"Rejected" },
  counter_offer:          { step:3, color:"#f59e0b", emoji:"🔄", label:"Counter Offer" },
  agreement_generated:    { step:5, color:"#3b82f6", emoji:"📄", label:"Contract Ready" },
  buyer_signed:           { step:6, color:"#06b6d4", emoji:"✍️", label:"Buyer Signed" },
  pending_signatures:     { step:6, color:"#06b6d4", emoji:"✍️", label:"Pending Signatures" },
  fully_signed:           { step:7, color:"#8b5cf6", emoji:"🔒", label:"Fully Signed" },
  awaiting_video:         { step:8, color:"#f97316", emoji:"🎥", label:"Awaiting Video" },
  video_submitted:        { step:8, color:"#eab308", emoji:"🎬", label:"Video Submitted" },
  media_released:         { step:9, color:"#22d3ee", emoji:"🔑", label:"Media Released" },
  media_viewed:           { step:10,color:"#10b981", emoji:"👀", label:"Media Reviewed" },
  payment_submitted:      { step:11,color:"#f59e0b", emoji:"💳", label:"Payment Sent" },
  payment_rejected:       { step:11,color:"#ef4444", emoji:"❌", label:"Payment Rejected" },
  payment_verified:       { step:12,color:"#22c55e", emoji:"✅", label:"Payment Verified" },
  handover_confirmed:     { step:12,color:"#8b5cf6", emoji:"🔑", label:"Handover Done" },
  completed:              { step:12,color:"#22c55e", emoji:"🎉", label:"Completed" },
  cancelled:              { step:0, color:"#6b7280", emoji:"🚫", label:"Cancelled" },
  buyer_rejected:         { step:0, color:"#ef4444", emoji:"❌", label:"Buyer Rejected" },
};

const getBadge = (s) => STATUS_MAP[s] || { step:0, color:"#6b7280", emoji:"❓", label:s };
const isRental = (a) => a?.agreement_type === 'rent' || a?.agreement_type === 'rental';

const DirectAgreement = ({ user }) => {
  const [agreements, setAgreements] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [formData, setFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [contractHTML, setContractHTML] = useState("");
  const [history, setHistory] = useState([]);
  const [propertyMedia, setPropertyMedia] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const contractRef = useRef(null);

  const isCustomer = user?.role === "customer";
  const isOwner = user?.role === "property_owner";
  const isAdmin = user?.role === "property_admin";

  const fetchAgreements = useCallback(async () => {
    try {
      setLoading(true);
      let res;
      if (isAdmin) res = await axios.get(`${API}/admin/all`);
      else if (isOwner) res = await axios.get(`${API}/owner/${user.id}`);
      else res = await axios.get(`${API}/buyer/${user.id}`);
      setAgreements((res.data.agreements || []).filter(a => a.is_direct_agreement));
    } catch { setAgreements([]); }
    finally { setLoading(false); }
  }, [user, isAdmin, isOwner]);

  useEffect(() => { fetchAgreements(); }, [fetchAgreements]);
  useEffect(() => {
    if (isCustomer) {
      axios.get("/api/properties").then(r => setProperties(r.data.filter?.(p => p.status === "approved") || [])).catch(() => {});
    }
  }, [isCustomer]);

  const openModal = (type, agr) => {
    setModalType(type); setSelectedAgreement(agr || null); setFormData({});
    setShowModal(true); setContractHTML(""); setHistory([]); setPropertyMedia(null);
    if (type === "view_contract" && agr) {
      axios.get(`${API}/${agr.id}/view-agreement`).then(r => { if(r.data.success) setContractHTML(r.data.document?.document_content || ""); });
    }
    if (type === "details" && agr) {
      axios.get(`${API}/${agr.id}`).then(r => { if(r.data.success) setHistory(r.data.history || []); });
    }
    if (type === "view_property_media" && agr) {
      axios.get(`${API}/${agr.id}/property-media`).then(r => { if(r.data.success) setPropertyMedia(r.data); });
    }
  };
  const closeModal = () => { setShowModal(false); setModalType(""); setSelectedAgreement(null); setFormData({}); };

  const handleDownloadPDF = async () => {
    if (!selectedAgreement) return;
    try {
      setPdfLoading(true);
      const res = await axios.get(`${API}/${selectedAgreement.id}/view-agreement`);
      if (!res.data.success) { alert("No document found"); return; }
      const html = res.data.document?.document_content || "";
      const w = window.open("", "_blank");
      w.document.write(html); w.document.close(); w.focus();
      setTimeout(() => w.print(), 600);
    } catch { alert("Error generating PDF"); }
    finally { setPdfLoading(false); }
  };

  const handleAction = async () => {
    if (!selectedAgreement && modalType !== "request") return;
    setActionLoading(true);
    try {
      const id = selectedAgreement?.id;
      let res;
      switch (modalType) {
        case "request":
          if (!formData.property_id) { alert("Select a property"); return; }
          res = await axios.post(`${API}/request-direct`, {
            customer_id: user.id, property_id: formData.property_id,
            proposed_price: formData.proposed_price, customer_notes: formData.notes,
            agreement_type: formData.agreement_type || 'sale', system_fee_payer: formData.system_fee_payer || 'buyer',
            rental_duration_months: formData.rental_duration_months, payment_schedule: formData.payment_schedule,
            security_deposit: formData.security_deposit, move_in_date: formData.move_in_date,
          });
          break;
        case "owner_negotiate":
          res = await axios.put(`${API}/${id}/owner-negotiate-response`, {
            owner_id: user.id, decision: formData.decision,
            counter_price: formData.counter_price, owner_notes: formData.notes,
            system_fee_payer: formData.system_fee_payer,
          });
          break;
        case "buyer_counter":
          res = await axios.put(`${API}/${id}/buyer-counter-negotiate`, {
            buyer_id: user.id, decision: formData.decision,
            counter_price: formData.counter_price, buyer_notes: formData.notes,
            system_fee_payer: formData.system_fee_payer,
          });
          break;
        case "forward_to_owner":
          res = await axios.put(`${API}/${id}/forward-to-owner`, { admin_id: user.id, admin_notes: formData.notes });
          break;
        case "generate_contract":
          res = await axios.post(`${API}/${id}/generate-agreement`, { admin_id: user.id });
          break;
        case "buyer_sign":
          if (!formData.signature) { alert("Please provide signature"); return; }
          res = await axios.put(`${API}/${id}/buyer-sign`, { buyer_id: user.id, signature_data: formData.signature });
          break;
        case "owner_sign":
          if (!formData.signature) { alert("Please provide signature"); return; }
          res = await axios.put(`${API}/${id}/owner-sign`, { owner_id: user.id, signature_data: formData.signature });
          break;
        case "upload_video":
          if (!formData.video_url) { alert("Please provide video URL"); return; }
          res = await axios.put(`${API}/${id}/upload-video`, { owner_id: user.id, video_url: formData.video_url });
          break;
        case "verify_video":
          res = await axios.put(`${API}/${id}/verify-video`, { admin_id: user.id });
          break;
        case "submit_payment":
          if (!formData.payment_method) { alert("Select payment method"); return; }
          res = await axios.post(`${API}/${id}/submit-payment`, {
            buyer_id: user.id, payment_method: formData.payment_method,
            payment_amount: selectedAgreement.proposed_price || selectedAgreement.property_price,
            payment_reference: formData.transaction_reference,
          });
          break;
        case "verify_payment":
          res = await axios.put(`${API}/${id}/verify-payment`, { admin_id: user.id, admin_notes: formData.notes });
          break;
        case "reject_payment":
          if (!formData.reason) { alert("Provide rejection reason"); return; }
          res = await axios.put(`${API}/${id}/reject-payment`, { admin_id: user.id, reason: formData.reason });
          break;
        case "confirm_handover":
          res = await axios.put(`${API}/${id}/confirm-handover`, { buyer_id: user.id });
          break;
        case "release_funds":
          res = await axios.put(`${API}/${id}/release-funds`, {
            admin_id: user.id, commission_percentage: 5, admin_notes: formData.notes,
          });
          break;
        default: return;
      }
      if (res?.data?.success) { alert(`✅ ${res.data.message}`); closeModal(); fetchAgreements(); }
      else alert(`❌ ${res?.data?.message || "Action failed"}`);
    } catch (err) { alert(`❌ ${err.response?.data?.message || "Error"}`); }
    finally { setActionLoading(false); }
  };

  const renderActions = (agr) => {
    const s = agr.status;
    const btns = [];
    if (isOwner && (s === "price_negotiation" || s === "buyer_counter_offered" || s === "waiting_owner_response")) {
      btns.push(<button key="neg" className="direct-btn direct-btn-primary" onClick={() => openModal("owner_negotiate", agr)}>💰 Respond to Offer</button>);
    }
    if (isCustomer && s === "owner_counter_offered") {
      btns.push(<button key="cnt" className="direct-btn direct-btn-primary" onClick={() => openModal("buyer_counter", agr)}>🔄 Respond to Counter</button>);
    }
    if (isAdmin && s === "pending_admin_review") {
      btns.push(<button key="fwd" className="direct-btn direct-btn-primary" onClick={() => openModal("forward_to_owner", agr)}>➡️ Forward to Owner</button>);
    }
    if (isAdmin && s === "owner_accepted") {
      btns.push(<button key="gen" className="direct-btn direct-btn-success" onClick={() => openModal("generate_contract", agr)}>📄 Generate Contract</button>);
    }
    if (isCustomer && s === "agreement_generated") {
      btns.push(<button key="bs" className="direct-btn direct-btn-primary" onClick={() => openModal("buyer_sign", agr)}>✍️ Sign Contract</button>);
    }
    if (isOwner && s === "buyer_signed") {
      btns.push(<button key="os" className="direct-btn direct-btn-primary" onClick={() => openModal("owner_sign", agr)}>✍️ Sign Contract</button>);
    }
    if (isOwner && s === "fully_signed") {
      btns.push(<button key="vid" className="direct-btn direct-btn-primary" onClick={() => openModal("upload_video", agr)}>🎥 Upload Video</button>);
    }
    if (isAdmin && s === "video_submitted") {
      btns.push(<button key="vv" className="direct-btn direct-btn-success" onClick={() => openModal("verify_video", agr)}>✅ Verify Video</button>);
    }
    if ((isCustomer || isAdmin) && s === "media_released") {
      btns.push(<button key="vm" className="direct-btn direct-btn-primary" onClick={() => openModal("view_property_media", agr)}>🎥 Review Property Media</button>);
    }
    if (isCustomer && (s === "media_viewed" || s === "payment_rejected")) {
      btns.push(<button key="pay" className="direct-btn direct-btn-success" onClick={() => openModal("submit_payment", agr)}>💰 Submit Payment</button>);
    }
    if (isAdmin && s === "payment_submitted") {
      btns.push(<button key="vp" className="direct-btn direct-btn-success" onClick={() => openModal("verify_payment", agr)}>✅ Verify Payment</button>);
      btns.push(<button key="rp" className="direct-btn direct-btn-danger" onClick={() => openModal("reject_payment", agr)}>❌ Reject Payment</button>);
    }
    if ((isCustomer || isOwner) && s === "payment_verified") {
      btns.push(<button key="ho" className="direct-btn direct-btn-primary" onClick={() => openModal("confirm_handover", agr)}>🔑 Confirm Handover</button>);
    }
    if (isAdmin && s === "handover_confirmed") {
      btns.push(<button key="rf" className="direct-btn direct-btn-success" onClick={() => openModal("release_funds", agr)}>💸 Release Funds</button>);
    }
    if (["agreement_generated","buyer_signed","fully_signed","video_submitted","media_released","media_viewed","payment_submitted","payment_verified","handover_confirmed","completed"].includes(s)) {
      btns.push(<button key="vc" className="direct-btn direct-btn-outline" onClick={() => openModal("view_contract", agr)}>📄 View Contract</button>);
    }
    btns.push(<button key="dt" className="direct-btn direct-btn-outline" onClick={() => openModal("details", agr)}>👀 Details</button>);
    return btns;
  };

  const renderProgressBar = (agr) => {
    const info = getBadge(agr.status);
    const activeStep = info.step;
    return (
      <div className="direct-progress-bar">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className={`direct-step ${i < activeStep ? "completed" : i === activeStep ? "active" : ""}`}>
            <div className="step-dot">{i < activeStep ? "✓" : i + 1}</div>
            <div className="step-label">{label}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderCard = (agr) => {
    const info = getBadge(agr.status);
    const price = Number(agr.proposed_price || agr.property_price || 0);
    return (
      <div key={agr.id} className="direct-card">
        <div className="direct-card-header">
          <div className="direct-card-title">⚡ #{agr.id} — Direct Agreement</div>
          <span className="direct-badge" style={{ background: info.color + "22", color: info.color, border: `1px solid ${info.color}44` }}>
            {info.emoji} {info.label}
          </span>
        </div>
        {renderProgressBar(agr)}
        <div className="direct-card-body">
          <div className="direct-info-grid">
            <div className="direct-info-item"><span className="info-label">🏠 Property</span><span className="info-value">{agr.property_title || `Property #${agr.property_id}`}</span></div>
            <div className="direct-info-item"><span className="info-label">📍 Location</span><span className="info-value">{agr.property_location || "N/A"}</span></div>
            <div className="direct-info-item"><span className="info-label">💰 Price</span><span className="info-value">{price.toLocaleString()} ETB{isRental(agr) ? "/mo" : ""}</span></div>
            <div className="direct-info-item"><span className="info-label">🏷️ Fee Payer</span><span className="info-value" style={{textTransform:'capitalize'}}>{agr.system_fee_payer || 'buyer'}</span></div>
            <div className="direct-info-item"><span className="info-label">👤 Buyer</span><span className="info-value">{agr.customer_name || "N/A"}</span></div>
            <div className="direct-info-item"><span className="info-label">🏢 Owner</span><span className="info-value">{agr.owner_name || "N/A"}</span></div>
          </div>
          {agr.counter_offer_price > 0 && (
            <div className="direct-counter-badge">🔄 Counter Offer: {Number(agr.counter_offer_price).toLocaleString()} ETB</div>
          )}
        </div>
        <div className="direct-card-actions">{renderActions(agr)}</div>
      </div>
    );
  };

  const renderModalContent = () => {
    if (!showModal) return null;
    switch (modalType) {
      case "request": {
        const selProp = properties.find(p => p.id === Number(formData.property_id));
        const isRent = selProp?.listing_type === 'rent';
        return (<>
          <div className="direct-form-group"><label>Select Property *</label>
            <select value={formData.property_id || ""} onChange={e => { const p = properties.find(x => x.id === Number(e.target.value)); setFormData({...formData, property_id: e.target.value, agreement_type: p?.listing_type || 'sale'}); }}>
              <option value="">-- Choose --</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.title} — {Number(p.price).toLocaleString()} ETB ({p.location})</option>)}
            </select></div>
          <div className="direct-form-group"><label>Your Offer Price (ETB) *</label>
            <input type="number" value={formData.proposed_price||""} onChange={e=>setFormData({...formData,proposed_price:e.target.value})} placeholder="Enter your proposed price"/></div>
          <div className="direct-form-group"><label>System Fee (5%) Paid By *</label>
            <select value={formData.system_fee_payer||"buyer"} onChange={e=>setFormData({...formData,system_fee_payer:e.target.value})}>
              <option value="buyer">Buyer pays 5%</option><option value="owner">Owner pays 5%</option><option value="split">Split 50/50</option>
            </select></div>
          {isRent && (<><div className="direct-form-group"><label>Lease Duration (Months)</label>
            <input type="number" min="1" value={formData.rental_duration_months||12} onChange={e=>setFormData({...formData,rental_duration_months:e.target.value})}/></div>
          <div className="direct-form-group"><label>Payment Schedule</label>
            <select value={formData.payment_schedule||"monthly"} onChange={e=>setFormData({...formData,payment_schedule:e.target.value})}>
              <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select></div></>)}
          <div className="direct-form-group"><label>Message to Owner</label>
            <textarea value={formData.notes||""} onChange={e=>setFormData({...formData,notes:e.target.value})} placeholder="Tell the owner about your interest..." rows="3"/></div>
        </>);
      }
      case "owner_negotiate": return (<div style={{padding:16}}>
        <div style={{textAlign:'center',marginBottom:16}}><p style={{fontSize:48,margin:'0 0 8px'}}>💰</p>
          <h4 style={{margin:'0 0 4px',color:'#1e293b'}}>Step 1: Price Negotiation</h4>
          <p style={{color:'#64748b',fontSize:13}}>Buyer offered <strong>{Number(selectedAgreement?.proposed_price||0).toLocaleString()} ETB</strong></p>
          <p style={{color:'#64748b',fontSize:12}}>System fee (5%) paid by: <strong>{selectedAgreement?.system_fee_payer || 'buyer'}</strong></p></div>
        <div className="direct-form-group"><label>Your Decision *</label>
          <select value={formData.decision||""} onChange={e=>setFormData({...formData,decision:e.target.value})}>
            <option value="">-- Select --</option><option value="accept">✅ Accept Price</option>
            <option value="counter_offer">🔄 Counter Offer</option><option value="reject">❌ Reject</option></select></div>
        {formData.decision === "counter_offer" && (<div className="direct-form-group"><label>Your Counter Price (ETB)</label>
          <input type="number" value={formData.counter_price||""} onChange={e=>setFormData({...formData,counter_price:e.target.value})} placeholder="Enter counter price"/></div>)}
        <div className="direct-form-group"><label>System Fee Paid By</label>
          <select value={formData.system_fee_payer||selectedAgreement?.system_fee_payer||"buyer"} onChange={e=>setFormData({...formData,system_fee_payer:e.target.value})}>
            <option value="buyer">Buyer pays 5%</option><option value="owner">Owner pays 5%</option><option value="split">Split 50/50</option></select></div>
        <div className="direct-form-group"><label>Message</label>
          <textarea value={formData.notes||""} onChange={e=>setFormData({...formData,notes:e.target.value})} rows="2" placeholder="Optional message..."/></div>
      </div>);
      case "buyer_counter": return (<div style={{padding:16}}>
        <div style={{textAlign:'center',marginBottom:16}}><p style={{fontSize:48,margin:'0 0 8px'}}>🔄</p>
          <h4 style={{margin:'0 0 4px',color:'#1e293b'}}>Owner's Counter Offer</h4>
          <div style={{background:'#fef3c7',border:'2px solid #f59e0b',borderRadius:12,padding:16,margin:'12px 0'}}>
            <div style={{fontSize:12,color:'#92400e',fontWeight:600}}>COUNTER PRICE</div>
            <div style={{fontSize:28,fontWeight:800,color:'#b45309'}}>{Number(selectedAgreement?.counter_offer_price||0).toLocaleString()} ETB</div></div></div>
        <div className="direct-form-group"><label>Your Decision *</label>
          <select value={formData.decision||""} onChange={e=>setFormData({...formData,decision:e.target.value})}>
            <option value="">-- Select --</option><option value="accept">✅ Accept Counter</option>
            <option value="counter_offer">🔄 Send My Counter</option><option value="reject">❌ Reject & Cancel</option></select></div>
        {formData.decision === "counter_offer" && (<div className="direct-form-group"><label>Your Counter Price (ETB)</label>
          <input type="number" value={formData.counter_price||""} onChange={e=>setFormData({...formData,counter_price:e.target.value})}/></div>)}
        <div className="direct-form-group"><label>Message</label>
          <textarea value={formData.notes||""} onChange={e=>setFormData({...formData,notes:e.target.value})} rows="2"/></div>
      </div>);
      case "forward_to_owner": return (<div style={{textAlign:'center',padding:20}}>
        <p style={{fontSize:48}}>➡</p><h4>Forward to Owner for Review?</h4>
        <p style={{color:'#64748b',fontSize:13}}>Price agreed: <strong>{Number(selectedAgreement?.proposed_price||0).toLocaleString()} ETB</strong></p>
        <div className="direct-form-group" style={{textAlign:'left',marginTop:16}}><label>Admin Notes</label>
          <textarea value={formData.notes||""} onChange={e=>setFormData({...formData,notes:e.target.value})} rows="2"/></div></div>);
      case "generate_contract": return (<div style={{textAlign:'center',padding:20}}>
        <p style={{fontSize:48}}>📄</p><h4>Generate Agreement Contract</h4>
        <p style={{color:'#64748b',fontSize:13}}>This will create the official contract for <strong>{selectedAgreement?.property_title}</strong> at <strong>{Number(selectedAgreement?.proposed_price||0).toLocaleString()} ETB</strong></p></div>);
      case "buyer_sign": case "owner_sign": return (<>
        <div style={{textAlign:'center',marginBottom:20}}><p>Please review the contract and provide your digital signature.</p></div>
        <div className="direct-form-group"><label>Digital Signature *</label>
          <input type="text" value={formData.signature||""} onChange={e=>setFormData({...formData,signature:e.target.value})}
            placeholder="Type your full name as signature" style={{fontFamily:'cursive',fontSize:'18px',textAlign:'center'}}/></div></>);
      case "upload_video": return (<div style={{padding:16}}>
        <div style={{textAlign:'center',marginBottom:16}}><p style={{fontSize:48,margin:'0 0 8px'}}>🎥</p>
          <h4 style={{margin:'0 0 4px',color:'#1e293b'}}>Step 6: Upload Property Video</h4>
          <p style={{color:'#64748b',fontSize:13}}>Upload a timestamped video of the property for buyer verification</p></div>
        <div style={{padding:12,background:'#fef3c7',borderRadius:8,marginBottom:16,fontSize:12,color:'#92400e'}}>
          ⚠ <strong>Important:</strong> The video must show a visible timestamp (newspaper, phone screen) to verify it was recorded recently.</div>
        <div className="direct-form-group"><label>Video URL *</label>
          <input type="text" value={formData.video_url||""} onChange={e=>setFormData({...formData,video_url:e.target.value})} placeholder="https://... or /uploads/videos/..."/></div>
        <div className="direct-form-group"><label>Recording Date</label>
          <input type="date" value={formData.video_date||""} onChange={e=>setFormData({...formData,video_date:e.target.value})}/></div></div>);
      case "verify_video": return (<div style={{textAlign:'center',padding:20}}>
        <p style={{fontSize:48}}>✅</p><h4>Verify Property Video & Release Media</h4>
        <p style={{color:'#64748b',fontSize:13}}>Confirm the video is valid and release all property media to the buyer.</p>
        {selectedAgreement?.video_url && <div style={{margin:'16px 0',borderRadius:10,overflow:'hidden',border:'1px solid #e2e8f0'}}>
          <video controls style={{width:'100%',maxHeight:250}} src={selectedAgreement.video_url}>Video not supported</video></div>}</div>);
      case "view_property_media": return (<div style={{padding:16}}>
        <div style={{textAlign:'center',marginBottom:16}}><h4 style={{margin:'0 0 4px',color:'#1e293b',fontSize:16}}>🎥 Step 8: Property Review</h4>
          <p style={{color:'#64748b',fontSize:13}}>Review the property video, location map, and documents before payment</p></div>
        <div style={{marginBottom:20}}><h4 style={{fontSize:14,fontWeight:700,color:'#1e293b',marginBottom:8}}>🎥 Property Video Tour</h4>
          {propertyMedia?.video_url ? (<div style={{borderRadius:10,overflow:'hidden',border:'1px solid #e2e8f0'}}>
            <video controls style={{width:'100%',maxHeight:300}} src={propertyMedia.video_url}>Not supported</video>
            {propertyMedia.video_uploaded_at && <div style={{padding:6,background:'#f0fdf4',fontSize:11,color:'#166534',textAlign:'center'}}>📅 Uploaded: {new Date(propertyMedia.video_uploaded_at).toLocaleString()}</div>}
          </div>) : (<div style={{padding:24,textAlign:'center',background:'#f8fafc',borderRadius:10,border:'1px dashed #cbd5e1'}}><p style={{color:'#94a3b8',fontSize:13}}>🎥 No video available</p></div>)}</div>
        <div style={{marginBottom:20}}><h4 style={{fontSize:14,fontWeight:700,color:'#1e293b',marginBottom:8}}>🗺️ View on Map</h4>
          {propertyMedia?.latitude && propertyMedia?.longitude ? (<div style={{borderRadius:10,overflow:'hidden',border:'1px solid #e2e8f0'}}>
            <MapContainer center={[propertyMedia.latitude, propertyMedia.longitude]} zoom={15} style={{ width: '100%', height: '250px' }} scrollWheelZoom={false}>
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[propertyMedia.latitude, propertyMedia.longitude]} />
            </MapContainer>
            <div style={{padding:8,background:'#f8fafc',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:12,color:'#64748b'}}>📍 {propertyMedia.property?.location || selectedAgreement?.property_location}</span>
              <a href={`https://www.openstreetmap.org/?mlat=${propertyMedia.latitude}&mlon=${propertyMedia.longitude}#map=16/${propertyMedia.latitude}/${propertyMedia.longitude}`} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#3b82f6',fontWeight:600,textDecoration:'none'}}>🔗 Open Full Map</a></div>
          </div>) : (<div style={{padding:24,textAlign:'center',background:'#f8fafc',borderRadius:10,border:'1px dashed #cbd5e1'}}><p style={{color:'#94a3b8',fontSize:13}}>🗺️ Map coordinates not available</p></div>)}</div>
        <div style={{marginBottom:12}}><h4 style={{fontSize:14,fontWeight:700,color:'#1e293b',marginBottom:8}}>📄 Property Documents</h4>
          {propertyMedia?.documents?.length > 0 ? (<div style={{display:'flex',flexDirection:'column',gap:8}}>
            {propertyMedia.documents.map(doc => (<div key={doc.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'#f8fafc',borderRadius:8,border:'1px solid #e2e8f0'}}>
              <div><div style={{fontSize:13,fontWeight:600,color:'#1e293b'}}>📄 {doc.document_name||doc.document_type}</div>
                <div style={{fontSize:11,color:'#94a3b8'}}>{doc.document_type} • {new Date(doc.uploaded_at).toLocaleDateString()}</div></div>
              <a href={doc.document_path} target="_blank" rel="noopener noreferrer" className="direct-btn direct-btn-outline" style={{fontSize:11,padding:'4px 10px'}}>👁️ View</a>
            </div>))}
          </div>) : (<div style={{padding:24,textAlign:'center',background:'#f8fafc',borderRadius:10,border:'1px dashed #cbd5e1'}}><p style={{color:'#94a3b8',fontSize:13}}>📄 No documents uploaded</p></div>)}</div>
        {isCustomer && selectedAgreement?.status === "media_released" && (<div style={{marginTop:24,textAlign:'center'}}>
          <p style={{fontSize:13,color:'#64748b',marginBottom:12}}>After reviewing, confirm to proceed to payment.</p>
          <button className="direct-btn direct-btn-success" style={{width:'100%',padding:'12px'}} disabled={actionLoading}
            onClick={async()=>{if(!window.confirm("Confirm you have reviewed all property media?"))return;
              try{setActionLoading(true);const r=await axios.put(`${API}/${selectedAgreement.id}/mark-media-viewed`,{buyer_id:user.id});
                if(r.data.success){alert(`✅ ${r.data.message}`);closeModal();fetchAgreements();}}catch{alert("❌ Failed")}finally{setActionLoading(false)}}}>
            {actionLoading?"Processing...":"✅ I Have Reviewed All Information"}</button></div>)}</div>);
      case "submit_payment": {
        const price = Number(selectedAgreement?.proposed_price || 0);
        const payer = selectedAgreement?.system_fee_payer || 'buyer';
        const totalFee = price * 0.05;
        let expected = price;
        if (payer === 'buyer') expected = price + totalFee;
        else if (payer === 'split') expected = price + (totalFee / 2);

        return (<>
          <div style={{background:'#f8fafc',padding:12,borderRadius:8,marginBottom:16,border:'1px solid #e2e8f0'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}><span>Agreed Price:</span><strong>{price.toLocaleString()} ETB</strong></div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}><span>System Fee ({payer === 'split' ? 'Share' : 'Buyer'}):</span><strong>{(expected - price).toLocaleString()} ETB</strong></div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:15,marginTop:8,paddingTop:8,borderTop:'1px dashed #cbd5e1',color:'#1e40af'}}><span>Total to Pay:</span><strong>{expected.toLocaleString()} ETB</strong></div>
          </div>
          <div className="direct-form-group"><label>Payment Method *</label>
            <select value={formData.payment_method||""} onChange={e=>setFormData({...formData,payment_method:e.target.value})}>
              <option value="">-- Select --</option><option value="bank_transfer">🏦 Bank Transfer</option>
              <option value="cash">💵 Cash</option><option value="check">📝 Check</option><option value="online">💳 Online</option></select></div>
          <div className="direct-form-group"><label>Transaction Reference *</label>
            <input type="text" value={formData.transaction_reference||""} onChange={e=>setFormData({...formData,transaction_reference:e.target.value})} placeholder="Reference number"/></div></>);
      }
      case "verify_payment": {
        const price = Number(selectedAgreement?.proposed_price || 0);
        const payer = selectedAgreement?.system_fee_payer || 'buyer';
        const totalFee = price * 0.05;
        let expected = price;
        if (payer === 'buyer') expected = price + totalFee;
        else if (payer === 'split') expected = price + (totalFee / 2);

        return (<div style={{textAlign:'center',padding:20}}>
          <p style={{fontSize:48}}>✅</p><h4>Verify Payment Received?</h4>
          <div style={{background:'#f0fdf4',padding:12,borderRadius:10,margin:'16px 0',border:'1px solid #86efac'}}>
            <div style={{fontSize:11,color:'#166534',fontWeight:700}}>EXPECTED TOTAL AMOUNT</div>
            <div style={{fontSize:24,fontWeight:800,color:'#14532d'}}>{expected.toLocaleString()} ETB</div>
            <div style={{fontSize:11,color:'#166534',marginTop:4}}>(Price: {price.toLocaleString()} + Fee Share: {(expected-price).toLocaleString()})</div>
          </div>
          <div className="direct-form-group" style={{textAlign:'left',marginTop:16}}><label>Verification Notes</label>
            <textarea value={formData.notes||""} onChange={e=>setFormData({...formData,notes:e.target.value})} rows="2"/></div></div>);
      }
      case "reject_payment": return (<div style={{textAlign:'center',padding:20}}>
        <p style={{fontSize:48}}>❌</p><h4 style={{color:'#dc2626'}}>Reject Payment?</h4>
        <div className="direct-form-group" style={{textAlign:'left',marginTop:16}}><label>Rejection Reason *</label>
          <textarea value={formData.reason||""} onChange={e=>setFormData({...formData,reason:e.target.value})} rows="3" placeholder="Why is the payment being rejected?"/></div></div>);
      case "confirm_handover": return (<div style={{textAlign:'center',padding:20}}>
        <p style={{fontSize:48}}>🔑</p><h4>Confirm Property Handover</h4>
        <p style={{color:'#64748b',fontSize:13}}>Both buyer and owner must confirm the handover separately.</p></div>);
      case "release_funds": {
        const price = Number(selectedAgreement?.proposed_price || 0);
        const payer = selectedAgreement?.system_fee_payer || 'buyer';
        const totalFee = price * 0.05;
        let ownerDeduction = 0;
        if (payer === 'owner') ownerDeduction = totalFee;
        else if (payer === 'split') ownerDeduction = totalFee/2;

        return (<div style={{textAlign:'center',padding:20}}>
          <p style={{fontSize:48}}>💸</p><h4>Release Funds to Owner</h4>
          <p style={{color:'#64748b',fontSize:13}}>Fee handling: <strong style={{textTransform:'capitalize'}}>{payer} pays</strong></p>
          <div style={{display:'flex',gap:8,marginTop:16}}>
            <div style={{flex:1,background:'#eff6ff',borderRadius:10,padding:12,textAlign:'center',border:'1px solid #bfdbfe'}}>
              <div style={{fontSize:10,color:'#3b82f6',fontWeight:700}}>AGREED PRICE</div>
              <div style={{fontSize:18,fontWeight:800,color:'#1e40af'}}>{price.toLocaleString()} ETB</div></div>
            <div style={{flex:1,background:'#fef3c7',borderRadius:10,padding:12,textAlign:'center',border:'1px solid #fcd34d'}}>
              <div style={{fontSize:10,color:'#d97706',fontWeight:700}}>TOTAL FEE (5%)</div>
              <div style={{fontSize:18,fontWeight:800,color:'#92400e'}}>{totalFee.toLocaleString()} ETB</div></div>
            <div style={{flex:1,background:'#f0fdf4',borderRadius:10,padding:12,textAlign:'center',border:'1px solid #86efac'}}>
              <div style={{fontSize:10,color:'#16a34a',fontWeight:700}}>NET TO OWNER</div>
              <div style={{fontSize:18,fontWeight:800,color:'#065f46'}}>{(price - ownerDeduction).toLocaleString()} ETB</div></div></div>
          <div className="direct-form-group" style={{textAlign:'left',marginTop:16}}><label>Admin Notes</label>
            <textarea value={formData.notes||""} onChange={e=>setFormData({...formData,notes:e.target.value})} rows="2"/></div></div>);
      }
      case "details": return (<div className="agreement-details"><div className="details-section"><h4>📝 Agreement Information</h4>
        <div className="details-grid">
          <div className="detail-item"><span className="detail-label">ID:</span><span className="detail-value">#{selectedAgreement?.id}</span></div>
          <div className="detail-item"><span className="detail-label">Status:</span><span className="detail-value">{getBadge(selectedAgreement?.status).label}</span></div>
          <div className="detail-item"><span className="detail-label">Created:</span><span className="detail-value">{new Date(selectedAgreement?.created_at).toLocaleDateString()}</span></div>
          <div className="detail-item"><span className="detail-label">Type:</span><span className="detail-value">{isRental(selectedAgreement)?'Rental':'Purchase'} (Direct)</span></div></div></div>
        {history.length > 0 && (<div className="details-section"><h4>📜 Activity History</h4>
          <div className="history-list">{history.map(h => (<div key={h.id} className="history-item">
            <div className="history-action">{h.action?.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</div>
            <div className="history-meta">By {h.action_by_name||"System"} • {new Date(h.created_at).toLocaleString()}{h.previous_status && ` • ${h.previous_status} → ${h.new_status}`}</div>
            {h.notes && <div className="history-notes">{h.notes}</div>}</div>))}</div></div>)}</div>);
      case "view_contract": return (<div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginBottom:12,flexWrap:"wrap"}}>
          <button className="direct-btn direct-btn-success" style={{fontSize:12,padding:"8px 20px"}} onClick={handleDownloadPDF} disabled={pdfLoading}>{pdfLoading?"Generating...":"📥 Download PDF"}</button>
          <button className="direct-btn direct-btn-outline" style={{fontSize:12,padding:"6px 16px"}} onClick={()=>{const w=window.open("","_blank");w.document.write(contractHTML);w.document.close();}}>🔍 Full View</button></div>
        <div ref={contractRef} style={{border:"1px solid #e2e8f0",borderRadius:8,overflow:"auto",maxHeight:500,background:"#fff"}} dangerouslySetInnerHTML={{__html:contractHTML}}/></div>);
      default: return <p>Unknown action</p>;
    }
  };

  const getModalTitle = () => {
    const titles = {
      request:"⚡ Request Direct Agreement", owner_negotiate:"💰 Price Negotiation", buyer_counter:"🔄 Counter Offer Response",
      forward_to_owner:"➡ Forward to Owner", generate_contract:"📄 Generate Contract",
      buyer_sign:"✍️ Sign (Buyer)", owner_sign:"✍️ Sign (Owner)", upload_video:"🎥 Upload Video",
      verify_video:"✅ Verify Video", view_property_media:"🎥 Property Media Review",
      submit_payment:"💰 Submit Payment", verify_payment:"✅ Verify Payment", reject_payment:"❌ Reject Payment",
      confirm_handover:"🔑 Confirm Handover", release_funds:"💸 Release Funds",
      details:"👁️ Agreement Details", view_contract:"📄 Agreement Document",
    };
    return titles[modalType] || "Action";
  };

  const getActionButtonText = () => {
    const texts = {
      request:"Send Direct Offer", owner_negotiate:"Submit Response", buyer_counter:"Submit Response",
      forward_to_owner:"Forward", generate_contract:"Generate Contract",
      buyer_sign:"Sign Contract", owner_sign:"Sign Contract", upload_video:"Upload Video",
      verify_video:"Verify & Release", submit_payment:"Submit Payment",
      verify_payment:"Verify Payment", reject_payment:"Reject Payment",
      confirm_handover:"Confirm Handover", release_funds:"Release Funds",
    };
    return texts[modalType] || "Submit";
  };

  return (
    <div className="direct-agreement-page">
      <div className="direct-container">
        <div className="direct-header">
          <h1>⚡ Direct Agreements</h1>
          <p>Connect directly with property owners — 12-step verified workflow</p>
          {isCustomer && <button className="direct-btn direct-btn-primary" onClick={() => openModal("request")}>➕ Request Direct Agreement</button>}
        </div>
        {loading && <div className="direct-loading"><div className="spinner"></div><p>Loading...</p></div>}
        {!loading && (<div className="direct-agreements-grid">
          {agreements.length > 0 ? agreements.map(renderCard) : (
            <div className="direct-empty-state"><div className="empty-icon">⚡</div><h3>No Direct Agreements Yet</h3>
              <p>{isCustomer ? "Start by requesting a direct agreement." : "Direct agreements will appear here."}</p>
              {isCustomer && <button className="direct-btn direct-btn-primary" onClick={() => openModal("request")}>Create Your First Direct Agreement</button>}
            </div>)}
        </div>)}
        {showModal && (
          <div className="direct-modal-overlay" onClick={closeModal}>
            <div className="direct-modal-content" onClick={e => e.stopPropagation()}>
              <div className="direct-modal-header"><h2>{getModalTitle()}</h2><button className="direct-modal-close" onClick={closeModal}>✖</button></div>
              <div className="direct-modal-body">{renderModalContent()}</div>
              {!["details","view_contract","view_property_media"].includes(modalType) && (
                <div className="direct-modal-footer">
                  <button className="direct-btn direct-btn-outline" onClick={closeModal}>Cancel</button>
                  <button className="direct-btn direct-btn-primary" onClick={handleAction} disabled={actionLoading}>
                    {actionLoading ? "Processing..." : getActionButtonText()}</button>
                </div>)}
            </div>
          </div>)}
      </div>
    </div>
  );
};

export default DirectAgreement;
