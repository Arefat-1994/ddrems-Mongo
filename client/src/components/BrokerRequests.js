import React, { useState, useEffect } from 'react';
import PageHeader from './PageHeader';
import axios from 'axios';

const BrokerRequests = ({ user, onLogout }) => {
    const [requests, setRequests] = useState([]);
    const [agreementRequests, setAgreementRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('property');

    useEffect(() => {
        fetchRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const [propRes, agrRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/property-requests/broker/${user.id}`).catch(() => ({ data: [] })),
                axios.get(`http://localhost:5000/api/agreement-requests/broker/${user.id}`).catch(() => ({ data: [] }))
            ]);
            setRequests(propRes.data);
            setAgreementRequests(agrRes.data);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRespondRequest = async (requestId, status, type) => {
        try {
            const endpoint = type === 'property'
                ? `http://localhost:5000/api/property-requests/${requestId}/respond`
                : `http://localhost:5000/api/agreement-requests/${requestId}/respond`;
            await axios.put(endpoint, { status, responded_by: user.id, response_message: status === 'accepted' ? 'Agreement approved by broker' : 'Agreement rejected by broker' });
            alert(`Request ${status} successfully!`);
            fetchRequests();
        } catch (error) {
            console.error('Error responding to request:', error);
            alert('Failed to respond to request');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: { background: '#fef3c7', color: '#92400e' },
            accepted: { background: '#d1fae5', color: '#065f46' },
            rejected: { background: '#fee2e2', color: '#991b1b' }
        };
        return styles[status] || styles.pending;
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

            {/* Property Requests */}
            {activeTab === 'property' && (
                <div className="dashboard-card" style={{ marginBottom: '20px' }}>
                    <div className="card-header">
                        <h3>🏠 Property Requests</h3>
                        <span>{requests.length} total</span>
                    </div>
                    {requests.length > 0 ? (
                        <div style={{ display: 'grid', gap: '15px' }}>
                            {requests.map(req => (
                                <div key={req.id} style={{
                                    padding: '20px', background: '#f9fafb', borderRadius: '12px',
                                    border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#1f2937' }}>
                                            {req.property_title}
                                        </h4>
                                        <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#6b7280' }}>
                                            📍 {req.property_location} • 💰 {req.property_price ? (req.property_price / 1000000).toFixed(2) + 'M ETB' : 'N/A'}
                                        </p>
                                        {req.owner_name && (
                                            <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#6b7280' }}>
                                                👤 Owner: {req.owner_name}
                                            </p>
                                        )}
                                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9ca3af' }}>
                                            Type: {req.request_type} • Created: {new Date(req.created_at).toLocaleDateString()}
                                        </p>
                                        {req.request_message && (
                                            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#4b5563', fontStyle: 'italic' }}>
                                                "{req.request_message}"
                                            </p>
                                        )}
                                        {req.response_message && (
                                            <p style={{ margin: '8px 0 0 0', padding: '8px', background: '#e0f2fe', borderRadius: '6px', fontSize: '13px', color: '#075985' }}>
                                                Response: {req.response_message}
                                            </p>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            padding: '4px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                                            ...getStatusBadge(req.status)
                                        }}>
                                            {req.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
                            <p>No property requests yet</p>
                        </div>
                    )}
                </div>
            )}

            {/* Agreement Requests */}
            {activeTab === 'agreement' && (
                <div className="dashboard-card" style={{ marginBottom: '20px' }}>
                    <div className="card-header">
                        <h3>📄 Agreement Requests</h3>
                        <span>{agreementRequests.length} total</span>
                    </div>
                    {agreementRequests.length > 0 ? (
                        <div style={{ display: 'grid', gap: '15px' }}>
                            {agreementRequests.map(req => (
                                <div key={req.id} style={{
                                    padding: '20px', background: '#f9fafb', borderRadius: '12px',
                                    border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#1f2937' }}>
                                            {req.property_title}
                                        </h4>
                                        <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#6b7280' }}>
                                            📍 {req.property_location} • 💰 {req.property_price ? (req.property_price / 1000000).toFixed(2) + 'M ETB' : 'N/A'}
                                        </p>
                                        <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#6b7280' }}>
                                            👤 Customer: {req.customer_name} ({req.customer_email})
                                        </p>
                                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9ca3af' }}>
                                            Created: {new Date(req.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            padding: '4px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                                            ...getStatusBadge(req.status)
                                        }}>
                                            {req.status}
                                        </span>
                                        {req.status === 'pending' && (
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button
                                                    onClick={() => handleRespondRequest(req.id, 'accepted', 'agreement')}
                                                    style={{
                                                        padding: '6px 14px', background: '#10b981', color: 'white',
                                                        border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                                                    }}
                                                >
                                                    ✅ Accept
                                                </button>
                                                <button
                                                    onClick={() => handleRespondRequest(req.id, 'rejected', 'agreement')}
                                                    style={{
                                                        padding: '6px 14px', background: '#ef4444', color: 'white',
                                                        border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                                                    }}
                                                >
                                                    ❌ Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📄</div>
                            <p>No agreement requests yet</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BrokerRequests;
