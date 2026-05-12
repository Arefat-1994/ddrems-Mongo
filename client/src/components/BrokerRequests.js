import React, { useState, useEffect } from 'react';
import PageHeader from './PageHeader';
import axios from 'axios';

const BrokerRequests = ({ user, onLogout }) => {
    const [requests, setRequests] = useState([]);
    const [agreementRequests, setAgreementRequests] = useState([]);
    const [hireRequests, setHireRequests] = useState([]);
    const [activeHires, setActiveHires] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('hire');
    
    // Modal states
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageData, setMessageData] = useState({ text: '', subject: '', recipientId: '' });
    const [sendingMessage, setSendingMessage] = useState(false);

    useEffect(() => {
        fetchRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const [propRes, agrRes, hireRes] = await Promise.all([
                axios.get(`http://${window.location.hostname}:5000/api/property-requests/broker/${user.id}`).catch(() => ({ data: [] })),
                axios.get(`http://${window.location.hostname}:5000/api/agreement-requests/broker/${user.id}`).catch(() => ({ data: [] })),
                axios.get(`http://${window.location.hostname}:5000/api/broker-engagement/broker/${user.id}`).catch(() => ({ data: { engagements: [] } }))
            ]);
            setRequests(propRes.data);
            setAgreementRequests(agrRes.data);
            
            const allEngagements = hireRes.data.engagements || [];
            // Pending Hire Requests
            setHireRequests(allEngagements.filter(e => e.status === 'pending_broker_acceptance'));
            // Active Hires (already accepted but pre-agreement/pre-booking)
            setActiveHires(allEngagements.filter(e => ['commission_negotiation', 'broker_accepted', 'broker_negotiating'].includes(e.status)));
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRespondRequest = async (requestId, status, type) => {
        try {
            let endpoint, method = 'put', data = { status, responded_by: user.id };
            
            if (type === 'property') {
                endpoint = `http://${window.location.hostname}:5000/api/property-requests/${requestId}/respond`;
                data.response_message = status === 'accepted' ? 'Agreement approved by broker' : 'Agreement rejected by broker';
            } else if (type === 'agreement') {
                endpoint = `http://${window.location.hostname}:5000/api/agreement-requests/${requestId}/respond`;
                data.response_message = status === 'accepted' ? 'Agreement approved by broker' : 'Agreement rejected by broker';
            } else if (type === 'hire') {
                endpoint = `http://${window.location.hostname}:5000/api/broker-engagement/${requestId}/broker-accept`;
                data = { broker_id: user.id, decision: status === 'accepted' ? 'accept' : 'decline' };
                if (status === 'rejected') data.decline_reason = 'Rejected by broker';
            }

            await axios({ method, url: endpoint, data });
            alert(`Request ${status} successfully!`);
            fetchRequests();
            
            // If accepted hire, maybe switch to active hires tab
            if (type === 'hire' && status === 'accepted') {
                setActiveTab('active-hires');
            }
        } catch (error) {
            console.error('Error responding to request:', error);
            alert('Failed to respond to request');
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageData.text.trim()) return;
        
        setSendingMessage(true);
        try {
            await axios.post(`http://${window.location.hostname}:5000/api/messages`, {
                sender_id: user.id,
                receiver_id: messageData.recipientId,
                subject: messageData.subject || 'Broker Message',
                message: messageData.text
            });
            alert('Message sent successfully!');
            setShowMessageModal(false);
            setMessageData({ text: '', subject: '', recipientId: '' });
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        } finally {
            setSendingMessage(false);
        }
    };

    const viewCustomerProfile = async (customerId) => {
        try {
            const res = await axios.get(`http://${window.location.hostname}:5000/api/users/${customerId}`);
            setSelectedCustomer(res.data);
            setShowProfileModal(true);
        } catch (error) {
            console.error('Error fetching customer profile:', error);
            alert('Could not load customer profile');
        }
    };

    const openMessageModal = (customerId, customerName, subject = '') => {
        setMessageData({ text: '', subject: subject || `Message regarding ${customerName}`, recipientId: customerId, recipientName: customerName });
        setShowMessageModal(true);
    };


    if (loading) {
        return (
            <div className="dashboard">
                <PageHeader title="My Requests" subtitle="Loading..." user={user} onLogout={onLogout} />
                <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>Loading requests...</div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <PageHeader
                title="My Requests"
                subtitle="View and manage your property and agreement requests"
                user={user}
                onLogout={onLogout}
            />

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button
                    onClick={() => setActiveTab('hire')}
                    style={{
                        padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        fontWeight: '600', fontSize: '14px',
                        background: activeTab === 'hire' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#f3f4f6',
                        color: activeTab === 'hire' ? 'white' : '#374151'
                    }}
                >
                    📩 Hire Requests ({hireRequests.length})
                </button>
                <button
                    onClick={() => setActiveTab('active-hires')}
                    style={{
                        padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        fontWeight: '600', fontSize: '14px',
                        background: activeTab === 'active-hires' ? 'linear-gradient(135deg, #10b981, #059669)' : '#f3f4f6',
                        color: activeTab === 'active-hires' ? 'white' : '#374151'
                    }}
                >
                    🤝 Active Hires ({activeHires.length})
                </button>
                <button
                    onClick={() => setActiveTab('property')}
                    style={{
                        padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        fontWeight: '600', fontSize: '14px',
                        background: activeTab === 'property' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#f3f4f6',
                        color: activeTab === 'property' ? 'white' : '#374151'
                    }}
                >
                    🏠 Property Requests ({requests.length})
                </button>
                <button
                    onClick={() => setActiveTab('agreement')}
                    style={{
                        padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        fontWeight: '600', fontSize: '14px',
                        background: activeTab === 'agreement' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#f3f4f6',
                        color: activeTab === 'agreement' ? 'white' : '#374151'
                    }}
                >
                    📄 Agreement Requests ({agreementRequests.length})
                </button>
            </div>

            {/* Hire Requests Tab */}
            {activeTab === 'hire' && (
                <div className="dashboard-card" style={{ marginBottom: '20px' }}>
                    <div className="card-header">
                        <h3>📩 New Hire Requests</h3>
                        <span>{hireRequests.length} pending</span>
                    </div>
                    {hireRequests.length > 0 ? (
                        <div style={{ display: 'grid', gap: '15px' }}>
                            {hireRequests.map(req => (
                                <div key={req.id} style={{
                                    padding: '20px', background: 'white', borderRadius: '12px',
                                    border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                            <h4 style={{ margin: 0, fontSize: '17px', color: '#1e293b' }}>
                                                {req.buyer_name}
                                            </h4>
                                            <span style={{ fontSize: '11px', background: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                                                NEW HIRE
                                            </span>
                                        </div>
                                        <p style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#64748b' }}>
                                            🏠 Interest: <strong>{req.property_title}</strong>
                                        </p>
                                        <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                                            <span style={{ fontSize: '13px', color: '#059669', fontWeight: '600' }}>
                                                💰 Offer: {Number(req.starting_offer).toLocaleString()} ETB
                                            </span>
                                            <span style={{ fontSize: '13px', color: '#6366f1', fontWeight: '600' }}>
                                                📊 Comm: {req.buyer_commission_offer}%
                                            </span>
                                        </div>
                                        {req.buyer_message && (
                                            <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #3b82f6', marginBottom: '10px' }}>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#334155', fontStyle: 'italic' }}>
                                                    "{req.buyer_message}"
                                                </p>
                                            </div>
                                        )}
                                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                                            Received: {new Date(req.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => viewCustomerProfile(req.buyer_id)}
                                            style={{
                                                padding: '8px 16px', background: '#f1f5f9', color: '#475569',
                                                border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                                            }}
                                        >
                                            👤 View Profile
                                        </button>
                                        <button
                                            onClick={() => handleRespondRequest(req.id, 'accepted', 'hire')}
                                            style={{
                                                padding: '8px 16px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white',
                                                border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                                                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
                                            }}
                                        >
                                            ✅ Accept Hire
                                        </button>
                                        <button
                                            onClick={() => handleRespondRequest(req.id, 'rejected', 'hire')}
                                            style={{
                                                padding: '8px 16px', background: '#fee2e2', color: '#ef4444',
                                                border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                                            }}
                                        >
                                            ❌ Decline
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📩</div>
                            <p>No pending hire requests at the moment.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Active Hires Tab */}
            {activeTab === 'active-hires' && (
                <div className="dashboard-card" style={{ marginBottom: '20px' }}>
                    <div className="card-header">
                        <h3>🤝 Active Client Engagements</h3>
                        <span>{activeHires.length} clients</span>
                    </div>
                    {activeHires.length > 0 ? (
                        <div style={{ display: 'grid', gap: '15px' }}>
                            {activeHires.map(hire => (
                                <div key={hire.id} style={{
                                    padding: '20px', background: 'white', borderRadius: '12px',
                                    border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: '0 0 5px 0', fontSize: '17px', color: '#1e293b' }}>{hire.buyer_name}</h4>
                                        <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#64748b' }}>
                                            Managing: <strong>{hire.property_title}</strong>
                                        </p>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <span style={{ 
                                                padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                                                background: '#ecfdf5', color: '#059669', border: '1px solid #bbf7d0'
                                            }}>
                                                ACTIVE HIRED
                                            </span>
                                            <span style={{ 
                                                padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                                                background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a'
                                            }}>
                                                STEP: {hire.status?.replace(/_/g, ' ').toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => openMessageModal(hire.buyer_id, hire.buyer_name)}
                                            style={{
                                                padding: '8px 16px', background: '#3b82f6', color: 'white',
                                                border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                                            }}
                                        >
                                            💬 Send Message
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Link to booking or engagement
                                                window.location.hash = '#broker-engagement'; // Or trigger parent navigation
                                                alert('Redirecting to Engagement Center to continue workflow...');
                                            }}
                                            style={{
                                                padding: '8px 16px', background: '#1e293b', color: 'white',
                                                border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                                            }}
                                        >
                                            🚀 Continue Workflow
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🤝</div>
                            <p>No active clients currently. Accept hire requests to see them here.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Profile Modal */}
            {showProfileModal && selectedCustomer && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '30px', borderRadius: '20px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ width: '100px', height: '100px', background: '#f1f5f9', borderRadius: '50%', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', overflow: 'hidden' }}>
                                {selectedCustomer.profile_image ? <img src={`http://${window.location.hostname}:5000${selectedCustomer.profile_image}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                            </div>
                            <h2 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>{selectedCustomer.name}</h2>
                            <p style={{ margin: '5px 0 0', color: '#64748b' }}>{selectedCustomer.email}</p>
                        </div>
                        
                        <div style={{ display: 'grid', gap: '15px', marginBottom: '25px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                                <span style={{ color: '#64748b' }}>Phone:</span>
                                <span style={{ fontWeight: '600' }}>{selectedCustomer.phone || 'N/A'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                                <span style={{ color: '#64748b' }}>Member Since:</span>
                                <span style={{ fontWeight: '600' }}>{new Date(selectedCustomer.created_at).toLocaleDateString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                                <span style={{ color: '#64748b' }}>Role:</span>
                                <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>{selectedCustomer.role}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={() => {
                                    setShowProfileModal(false);
                                    openMessageModal(selectedCustomer.id, selectedCustomer.name);
                                }}
                                style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Send Message
                            </button>
                            <button 
                                onClick={() => setShowProfileModal(false)}
                                style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Message Modal */}
            {showMessageModal && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ background: 'white', padding: '30px', borderRadius: '20px', maxWidth: '500px', width: '90%' }}>
                        <h2 style={{ margin: '0 0 5px 0', fontSize: '20px' }}>💬 Send Message to {messageData.recipientName}</h2>
                        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>Communicate directly with your potential client.</p>
                        
                        <form onSubmit={handleSendMessage}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>Subject</label>
                                <input 
                                    type="text"
                                    value={messageData.subject}
                                    onChange={(e) => setMessageData({...messageData, subject: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    placeholder="Message Subject"
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>Message</label>
                                <textarea 
                                    value={messageData.text}
                                    onChange={(e) => setMessageData({...messageData, text: e.target.value})}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '120px' }}
                                    placeholder="Type your message here..."
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button 
                                    type="submit"
                                    disabled={sendingMessage}
                                    style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', opacity: sendingMessage ? 0.7 : 1 }}
                                >
                                    {sendingMessage ? 'Sending...' : '🚀 Send Message'}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setShowMessageModal(false)}
                                    style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrokerRequests;
