import React, { useState, useEffect, useRef } from 'react';
import './Agreements.css';
import PageHeader from './PageHeader';
import axios from 'axios';

const Agreements = ({ user, onLogout, onSettingsClick }) => {
    const [agreements, setAgreements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showSignModal, setShowSignModal] = useState(false);
    const [selectedAgreement, setSelectedAgreement] = useState(null);
    const [documentHtml, setDocumentHtml] = useState('');
    const [properties, setProperties] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [actionLoading, setActionLoading] = useState(false);
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [signatureType, setSignatureType] = useState('draw'); // draw or type
    const [typedSignature, setTypedSignature] = useState('');
    const [editFields, setEditFields] = useState({
        duration: '', payment_terms: '', special_conditions: '', additional_terms: '', agreement_text: ''
    });
    const [formData, setFormData] = useState({
        property_id: '', customer_id: '', agreement_text: '', status: 'pending'
    });

    useEffect(() => {
        fetchAgreements();
        if (user.role === 'owner' || user.role === 'broker') {
            fetchFormData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchAgreements = async () => {
        try {
            const endpoint = user.role === 'user'
                ? `/api/agreements/customer/${user.id}`
                : `/api/agreements/owner/${user.id}`;
            const response = await axios.get(endpoint);
            setAgreements(response.data);
        } catch (error) {
            console.error('Error fetching agreements:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFormData = async () => {
        try {
            let currentBrokerId = user.id;
            if (user.role === 'broker') {
                try {
                    const brokerRes = await axios.get(`http://${window.location.hostname}:5000/api/brokers/user/${user.id}`);
                    currentBrokerId = brokerRes.data.id;
                } catch (err) { console.error('Error fetching broker record:', err); }
            }
            const propEndpoint = user.role === 'broker'
                ? `/api/properties`
                : `/api/properties/owner/${user.id}`;
            const propResponse = await axios.get(propEndpoint);
            setProperties(user.role === 'broker'
                ? (propResponse.data || []).filter(p => String(p.broker_id) === String(currentBrokerId))
                : (propResponse.data || []));
            const userResponse = await axios.get('/api/users');
            setCustomers((userResponse.data || []).filter(u => u.role === 'user'));
        } catch (error) { console.error('Error fetching form data:', error); }
    };

    const handleCreateAgreement = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/agreements', { ...formData, owner_id: user.id });
            alert('Agreement created successfully!');
            setShowCreateModal(false);
            fetchAgreements();
            setFormData({ property_id: '', customer_id: '', agreement_text: '', status: 'pending' });
        } catch (error) { alert('Failed to create agreement'); }
    };

    const handleViewDocument = async (agreement) => {
        setSelectedAgreement(agreement);
        setActionLoading(true);
        try {
            // Try to get existing document first
            const docRes = await axios.get(`/api/agreements/${agreement.id}/document`);
            if (docRes.data.success && docRes.data.html) {
                setDocumentHtml(docRes.data.html);
            } else {
                // Generate document if not exists
                const genRes = await axios.post(`/api/agreements/${agreement.id}/generate-document`);
                setDocumentHtml(genRes.data.html || '');
            }
        } catch (error) {
            // Auto-generate if not found
            try {
                const genRes = await axios.post(`/api/agreements/${agreement.id}/generate-document`);
                setDocumentHtml(genRes.data.html || '');
            } catch (genError) {
                setDocumentHtml('<div style="padding:40px;text-align:center;color:#ef4444;"><h3>Could not generate document</h3><p>' + (genError.response?.data?.message || genError.message) + '</p></div>');
            }
        } finally {
            setActionLoading(false);
            setShowDocumentModal(true);
        }
    };

    const handleEditFields = (agreement) => {
        setSelectedAgreement(agreement);
        setEditFields({
            duration: agreement.duration || '',
            payment_terms: agreement.payment_terms || '',
            special_conditions: agreement.special_conditions || '',
            additional_terms: agreement.additional_terms || '',
            agreement_text: agreement.agreement_text || agreement.terms || ''
        });
        setShowEditModal(true);
    };

    const handleSaveFields = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await axios.put(`/api/agreements/${selectedAgreement.id}/update-fields`, editFields);
            // Regenerate document with updated fields
            await axios.post(`/api/agreements/${selectedAgreement.id}/generate-document`);
            alert('✅ Agreement fields updated and document regenerated!');
            setShowEditModal(false);
            fetchAgreements();
        } catch (error) {
            alert('❌ Failed to update: ' + (error.response?.data?.message || error.message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleSignAgreement = (agreement) => {
        setSelectedAgreement(agreement);
        setSignatureType('draw');
        setTypedSignature('');
        setShowSignModal(true);
        setTimeout(() => initCanvas(), 100);
    };

    const initCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = 400;
        canvas.height = 150;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
    };

    const startDraw = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const stopDraw = () => setIsDrawing(false);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const handleSubmitSignature = async () => {
        setActionLoading(true);
        try {
            let signatureData;
            if (signatureType === 'draw') {
                const canvas = canvasRef.current;
                signatureData = canvas ? canvas.toDataURL('image/png') : null;
            } else {
                // Create typed signature as data URL
                const tmpCanvas = document.createElement('canvas');
                tmpCanvas.width = 400; tmpCanvas.height = 150;
                const ctx = tmpCanvas.getContext('2d');
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, 400, 150);
                ctx.font = 'italic 36px Georgia';
                ctx.fillStyle = '#1e293b';
                ctx.textAlign = 'center';
                ctx.fillText(typedSignature, 200, 90);
                signatureData = tmpCanvas.toDataURL('image/png');
            }

            if (!signatureData) {
                alert('Please provide a signature');
                setActionLoading(false);
                return;
            }

            await axios.put(`/api/agreements/${selectedAgreement.id}/sign`, {
                user_id: user.id,
                role: user.role,
                signature_data: signatureData
            });

            // Regenerate document with signature
            await axios.post(`/api/agreements/${selectedAgreement.id}/generate-document`);

            alert('✅ Agreement signed successfully!');
            setShowSignModal(false);
            fetchAgreements();
        } catch (error) {
            alert('❌ Failed to sign: ' + (error.response?.data?.message || error.message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleSendAgreement = async (agreement) => {
        if (!window.confirm('Send this agreement to the other party for review?')) return;
        setActionLoading(true);
        try {
            await axios.post(`/api/agreements/${agreement.id}/send`, { sender_id: user.id });
            alert('✅ Agreement sent successfully!');
            fetchAgreements();
        } catch (error) {
            alert('❌ Failed to send: ' + (error.response?.data?.message || error.message));
        } finally {
            setActionLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await axios.put(`/api/agreements/${id}/status`, { status });
            alert(`Agreement ${status} successfully`);
            fetchAgreements();
        } catch (error) { alert('Failed to update status'); }
    };

    const getStatusColor = (status) => {
        const colors = {
            draft: '#6b7280', pending: '#f59e0b', active: '#10b981',
            completed: '#3b82f6', cancelled: '#ef4444'
        };
        return colors[status] || '#6b7280';
    };

    return (
        <div className="agreements-page">
            <PageHeader
                title="Property Agreements"
                subtitle="Manage, sign, and view your property agreements"
                user={user}
                onLogout={onLogout}
                onSettingsClick={onSettingsClick}
                actions={
                    (user.role === 'owner' || user.role === 'broker') && (
                        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                            <span>➕</span> New Agreement
                        </button>
                    )
                }
            />

            <div className="agreements-container">
                {loading ? (
                    <div className="loading">Loading agreements...</div>
                ) : agreements.length === 0 ? (
                    <div className="no-data-card">
                        <div className="no-data-icon">🤝</div>
                        <h3>No agreements yet</h3>
                        <p>Once you initiate or receive an agreement, it will appear here.</p>
                    </div>
                ) : (
                    <div className="agreements-grid">
                        {agreements.map(agreement => (
                            <div key={agreement.id} className="agreement-card">
                                <div className="agreement-header">
                                    <div className="prop-info">
                                        <h4>{agreement.property_title}</h4>
                                        <span className="status-badge" style={{
                                            background: getStatusColor(agreement.status) + '20',
                                            color: getStatusColor(agreement.status),
                                            border: `1px solid ${getStatusColor(agreement.status)}40`
                                        }}>
                                            {agreement.status}
                                        </span>
                                    </div>
                                    <div className="agreement-date">
                                        📅 {new Date(agreement.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="agreement-body">
                                    <div className="party-info">
                                        <strong>{user.role === 'user' ? 'Owner:' : 'Customer:'}</strong>
                                        <span>{user.role === 'user' ? agreement.owner_name : agreement.customer_name}</span>
                                    </div>
                                    {agreement.property_location && (
                                        <div className="party-info">
                                            <strong>Location:</strong>
                                            <span>{agreement.property_location}</span>
                                        </div>
                                    )}
                                    {agreement.property_price && (
                                        <div className="party-info">
                                            <strong>Price:</strong>
                                            <span>{Number(agreement.property_price).toLocaleString()} ETB</span>
                                        </div>
                                    )}
                                    <div className="agreement-preview">
                                        <strong>Terms:</strong>
                                        <p>{agreement.agreement_text || agreement.terms || 'No terms specified.'}</p>
                                    </div>
                                    {/* Signature status */}
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                                        <span style={{
                                            fontSize: '12px', padding: '4px 8px', borderRadius: '12px',
                                            background: agreement.owner_signature ? '#dcfce7' : '#fef3c7',
                                            color: agreement.owner_signature ? '#166534' : '#92400e'
                                        }}>
                                            {agreement.owner_signature ? '✅ Owner Signed' : '⏳ Owner Pending'}
                                        </span>
                                        <span style={{
                                            fontSize: '12px', padding: '4px 8px', borderRadius: '12px',
                                            background: agreement.customer_signature ? '#dcfce7' : '#fef3c7',
                                            color: agreement.customer_signature ? '#166534' : '#92400e'
                                        }}>
                                            {agreement.customer_signature ? '✅ Customer Signed' : '⏳ Customer Pending'}
                                        </span>
                                    </div>
                                </div>
                                <div className="agreement-actions">
                                    {/* View Document */}
                                    <button className="btn-secondary" onClick={() => handleViewDocument(agreement)} disabled={actionLoading}>
                                        📄 View Document
                                    </button>
                                    {/* Edit Fields */}
                                    {(agreement.status === 'pending' || agreement.status === 'draft') && (
                                        <button className="btn-info" onClick={() => handleEditFields(agreement)}>
                                            ✏️ Edit
                                        </button>
                                    )}
                                    {/* Sign */}
                                    {(agreement.status === 'pending' || agreement.status === 'draft') && (
                                        (user.role === 'owner' && !agreement.owner_signature) ||
                                        (user.role === 'user' && !agreement.customer_signature)
                                    ) && (
                                            <button className="btn-success" onClick={() => handleSignAgreement(agreement)} disabled={actionLoading}>
                                                🖊️ Sign
                                            </button>
                                        )}
                                    {/* Send to other party */}
                                    {(user.role === 'owner' || user.role === 'broker') && (
                                        <button className="btn-primary" onClick={() => handleSendAgreement(agreement)} disabled={actionLoading}>
                                            📤 Send
                                        </button>
                                    )}
                                    {/* Mark Complete */}
                                    {(user.role === 'owner' || user.role === 'broker') && agreement.status === 'active' && (
                                        <button className="btn-primary" onClick={() => updateStatus(agreement.id, 'completed')}>
                                            ✅ Complete
                                        </button>
                                    )}
                                    {/* Decline */}
                                    {user.role === 'user' && agreement.status === 'pending' && (
                                        <button className="btn-danger" onClick={() => updateStatus(agreement.id, 'cancelled')}>
                                            ❌ Decline
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ===== VIEW DOCUMENT MODAL ===== */}
            {showDocumentModal && (
                <div className="modal-overlay" onClick={() => setShowDocumentModal(false)}>
                    <div className="modal-content document-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📄 Agreement Document</h2>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-secondary" onClick={() => {
                                    const w = window.open('', '_blank');
                                    w.document.write(documentHtml);
                                    w.document.close();
                                    w.print();
                                }}>🖨️ Print</button>
                                <button className="close-btn" onClick={() => setShowDocumentModal(false)}>✕</button>
                            </div>
                        </div>
                        <div className="document-viewer" dangerouslySetInnerHTML={{ __html: documentHtml }} />
                        <div className="modal-actions">
                            {selectedAgreement && (selectedAgreement.status === 'pending' || selectedAgreement.status === 'draft') && (
                                <>
                                    <button className="btn-info" onClick={() => { setShowDocumentModal(false); handleEditFields(selectedAgreement); }}>✏️ Edit Fields</button>
                                    {(
                                        (user.role === 'owner' && !selectedAgreement.owner_signature) ||
                                        (user.role === 'user' && !selectedAgreement.customer_signature)
                                    ) && (
                                            <button className="btn-success" onClick={() => { setShowDocumentModal(false); handleSignAgreement(selectedAgreement); }}>🖊️ Sign Agreement</button>
                                        )}
                                    <button className="btn-primary" onClick={() => { setShowDocumentModal(false); handleSendAgreement(selectedAgreement); }}>📤 Send to Other Party</button>
                                </>
                            )}
                            <button className="btn-secondary" onClick={() => setShowDocumentModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== EDIT FIELDS MODAL ===== */}
            {showEditModal && selectedAgreement && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>✏️ Edit Agreement Fields</h2>
                            <button className="close-btn" onClick={() => setShowEditModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSaveFields}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Agreement Duration</label>
                                    <input type="text" value={editFields.duration}
                                        onChange={(e) => setEditFields({ ...editFields, duration: e.target.value })}
                                        placeholder="e.g., 12 months, 2 years" />
                                </div>
                                <div className="form-group">
                                    <label>Payment Terms</label>
                                    <input type="text" value={editFields.payment_terms}
                                        onChange={(e) => setEditFields({ ...editFields, payment_terms: e.target.value })}
                                        placeholder="e.g., Monthly, Quarterly" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Agreement Terms & Text</label>
                                <textarea value={editFields.agreement_text}
                                    onChange={(e) => setEditFields({ ...editFields, agreement_text: e.target.value })}
                                    rows="5" placeholder="Full agreement terms..." />
                            </div>
                            <div className="form-group">
                                <label>Special Conditions</label>
                                <textarea value={editFields.special_conditions}
                                    onChange={(e) => setEditFields({ ...editFields, special_conditions: e.target.value })}
                                    rows="3" placeholder="Any special conditions..." />
                            </div>
                            <div className="form-group">
                                <label>Additional Terms</label>
                                <textarea value={editFields.additional_terms}
                                    onChange={(e) => setEditFields({ ...editFields, additional_terms: e.target.value })}
                                    rows="3" placeholder="Additional terms or notes..." />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={actionLoading}>
                                    {actionLoading ? '⏳ Saving...' : '💾 Save & Regenerate Document'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== SIGN MODAL ===== */}
            {showSignModal && selectedAgreement && (
                <div className="modal-overlay" onClick={() => setShowSignModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                        <div className="modal-header">
                            <h2>🖊️ Sign Agreement</h2>
                            <button className="close-btn" onClick={() => setShowSignModal(false)}>✕</button>
                        </div>
                        <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px' }}>
                            Sign agreement <strong>#{selectedAgreement.id}</strong> for <strong>{selectedAgreement.property_title}</strong>
                        </p>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <button className={`mode-btn ${signatureType === 'draw' ? 'active' : ''}`}
                                onClick={() => { setSignatureType('draw'); setTimeout(initCanvas, 50); }}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: signatureType === 'draw' ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: signatureType === 'draw' ? '#eff6ff' : '#fff', cursor: 'pointer' }}>
                                ✍️ Draw
                            </button>
                            <button className={`mode-btn ${signatureType === 'type' ? 'active' : ''}`}
                                onClick={() => setSignatureType('type')}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: signatureType === 'type' ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: signatureType === 'type' ? '#eff6ff' : '#fff', cursor: 'pointer' }}>
                                ⌨️ Type
                            </button>
                        </div>
                        {signatureType === 'draw' ? (
                            <div>
                                <canvas ref={canvasRef} style={{
                                    border: '2px solid #d1d5db', borderRadius: '8px', cursor: 'crosshair',
                                    width: '100%', maxWidth: '400px', height: '150px', display: 'block', margin: '0 auto'
                                }}
                                    onMouseDown={startDraw} onMouseMove={draw}
                                    onMouseUp={stopDraw} onMouseLeave={stopDraw} />
                                <button type="button" onClick={clearCanvas} style={{
                                    marginTop: '8px', padding: '6px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0',
                                    borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
                                }}>🗑️ Clear</button>
                            </div>
                        ) : (
                            <div>
                                <input type="text" value={typedSignature}
                                    onChange={(e) => setTypedSignature(e.target.value)}
                                    placeholder="Type your full name as signature"
                                    style={{
                                        width: '100%', padding: '16px', fontSize: '24px', fontFamily: 'Georgia, serif',
                                        fontStyle: 'italic', textAlign: 'center', border: '2px solid #d1d5db',
                                        borderRadius: '8px', background: '#fffbeb'
                                    }} />
                                {typedSignature && (
                                    <div style={{
                                        textAlign: 'center', padding: '20px', marginTop: '12px', border: '1px dashed #d1d5db',
                                        borderRadius: '8px', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '28px', color: '#1e293b'
                                    }}>
                                        {typedSignature}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="modal-actions" style={{ marginTop: '20px' }}>
                            <button type="button" className="btn-secondary" onClick={() => setShowSignModal(false)}>Cancel</button>
                            <button type="button" className="btn-success" onClick={handleSubmitSignature} disabled={actionLoading}>
                                {actionLoading ? '⏳ Signing...' : '✅ Confirm Signature'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== CREATE AGREEMENT MODAL ===== */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🤝 Create New Agreement</h2>
                            <button className="close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateAgreement}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Select Property</label>
                                    <select value={formData.property_id}
                                        onChange={(e) => setFormData({ ...formData, property_id: e.target.value })} required>
                                        <option value="">-- Choose Property --</option>
                                        {properties.map(p => (
                                            <option key={p.id} value={p.id}>{p.title} ({p.location})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Select Customer</label>
                                    <select value={formData.customer_id}
                                        onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })} required>
                                        <option value="">-- Choose Customer --</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Agreement Terms & Text</label>
                                <textarea value={formData.agreement_text}
                                    onChange={(e) => setFormData({ ...formData, agreement_text: e.target.value })}
                                    rows="10" required placeholder="Enter the full text of the agreement between the parties..." />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Create & Send Agreement</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Agreements;
