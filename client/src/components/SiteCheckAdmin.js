import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Circle, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './SiteCheckAdmin.css';

const API_BASE = `http://${window.location.hostname}:5000/api`;

// Fix leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const inspectorIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: '<div style="background:#6366f1;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 6px rgba(99,102,241,0.5);"></div>',
  iconSize: [18, 18], iconAnchor: [9, 9]
});

const propertyIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: '<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 6px rgba(239,68,68,0.5);"></div>',
  iconSize: [18, 18], iconAnchor: [9, 9]
});

const SiteCheckAdmin = ({ user }) => {
  const [activeTab, setActiveTab] = useState('checks');
  const [checks, setChecks] = useState([]);
  const [legalDocs, setLegalDocs] = useState([]);
  const [stats, setStats] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [comments, setComments] = useState({});
  const [toast, setToast] = useState(null);
  const [auditPropertyId, setAuditPropertyId] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docComments, setDocComments] = useState({});

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [checksRes, statsRes, docsRes] = await Promise.all([
        axios.get(`${API_BASE}/site-check/all`, { params: { status: filterStatus !== 'all' ? filterStatus : undefined } }),
        axios.get(`${API_BASE}/site-check/stats`),
        axios.get(`${API_BASE}/site-check/legal-documents-all`, { params: { status: filterStatus !== 'all' ? filterStatus : undefined } })
      ]);
      setChecks(checksRes.data);
      setStats(statsRes.data);
      setLegalDocs(docsRes.data);
    } catch (err) {
      console.error('Fetch error:', err);
    }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Review site check
  const handleReview = async (checkId, status) => {
    try {
      await axios.put(`${API_BASE}/site-check/${checkId}/review`, {
        status,
        admin_comment: comments[checkId] || '',
        reviewed_by: user.id || user._id
      });
      showToast(`Site check ${status.replace('_', ' ')} successfully!`);
      setComments(prev => ({ ...prev, [checkId]: '' }));
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Review failed', 'error');
    }
  };

  // Review legal document
  const handleDocReview = async (docId, status) => {
    try {
      await axios.put(`${API_BASE}/site-check/legal-documents/${docId}/review`, {
        status,
        admin_comment: docComments[docId] || '',
        reviewed_by: user.id || user._id
      });
      showToast(`Document ${status} successfully!`);
      setDocComments(prev => ({ ...prev, [docId]: '' }));
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Review failed', 'error');
    }
  };

  // View audit log
  const viewAuditLog = async (propertyId) => {
    setAuditPropertyId(propertyId);
    try {
      const res = await axios.get(`${API_BASE}/site-check/audit-log/${propertyId}`);
      setAuditLogs(res.data);
      setActiveTab('audit');
    } catch (err) {
      console.error('Audit log error:', err);
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      site_check_started: '📍 Site Check Started',
      site_check_approved: '✅ Site Check Approved',
      site_check_rejected: '❌ Site Check Rejected',
      site_check_recheck_requested: '🔄 Re-check Requested',
      document_uploaded: '📄 Document Uploaded',
      document_verified: '✅ Document Verified',
      document_rejected: '❌ Document Rejected',
      property_fully_verified: '🎉 Property Fully Verified'
    };
    return labels[action] || action;
  };

  const typeLabels = { title_deed: 'Title Deed', ownership_document: 'Ownership Doc', id_card: 'ID Card' };

  return (
    <div className="site-check-admin">
      {toast && <div className={`sca-toast ${toast.type}`}>{toast.message}</div>}

      {/* Header */}
      <div className="sca-header">
        <h1>🛡️ Site Check Control Panel</h1>
        <p>Review GPS-verified site checks, legal documents, and manage property verification workflow</p>
      </div>

      {/* Stats */}
      <div className="sca-stats-grid">
        <div className="sca-stat-card" onClick={() => { setFilterStatus('all'); setActiveTab('checks'); }}>
          <div className="stat-icon">📋</div>
          <div className="stat-value">{stats.total || 0}</div>
          <div className="stat-label">Total Checks</div>
        </div>
        <div className="sca-stat-card" onClick={() => { setFilterStatus('pending'); setActiveTab('checks'); }}>
          <div className="stat-icon">⏳</div>
          <div className="stat-value">{stats.pending || 0}</div>
          <div className="stat-label">Pending Review</div>
        </div>
        <div className="sca-stat-card" onClick={() => { setFilterStatus('approved'); setActiveTab('checks'); }}>
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats.approved || 0}</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="sca-stat-card" onClick={() => { setFilterStatus('rejected'); setActiveTab('checks'); }}>
          <div className="stat-icon">❌</div>
          <div className="stat-value">{stats.rejected || 0}</div>
          <div className="stat-label">Rejected</div>
        </div>
        <div className="sca-stat-card" onClick={() => { setFilterStatus('all'); setActiveTab('documents'); }}>
          <div className="stat-icon">📄</div>
          <div className="stat-value">{stats.pending_documents || 0}</div>
          <div className="stat-label">Pending Documents</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sca-tabs">
        <button className={`sca-tab ${activeTab === 'checks' ? 'active' : ''}`} onClick={() => setActiveTab('checks')}>
          📍 Site Checks {stats.pending > 0 && <span className="badge">{stats.pending}</span>}
        </button>
        <button className={`sca-tab ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
          📄 Legal Documents {stats.pending_documents > 0 && <span className="badge">{stats.pending_documents}</span>}
        </button>
        <button className={`sca-tab ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
          📜 Audit Log
        </button>
      </div>

      {/* ═══ SITE CHECKS TAB ═══ */}
      {activeTab === 'checks' && (
        <div>
          <div className="sca-filter-row">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">⏳ Pending</option>
              <option value="approved">✅ Approved</option>
              <option value="rejected">❌ Rejected</option>
              <option value="recheck_requested">🔄 Re-check</option>
            </select>
            <span style={{ color: '#64748b', fontSize: '14px' }}>{checks.length} check(s) found</span>
          </div>

          {loading ? (
            <div className="sca-empty"><div className="empty-icon">⏳</div><h3>Loading...</h3></div>
          ) : checks.length === 0 ? (
            <div className="sca-empty">
              <div className="empty-icon">📍</div>
              <h3>No Site Checks Found</h3>
              <p>Site checks submitted by Property Admins will appear here for review.</p>
            </div>
          ) : (
            checks.map(check => (
              <div key={check.id} className="sca-check-card">
                <div className="sca-check-card-header">
                  <div>
                    <h4>🏠 {check.property_title || `Property #${check.property_id}`}</h4>
                    <p>📍 {check.property_location || 'N/A'} • Inspector: {check.inspector_name} • {new Date(check.created_at).toLocaleString()}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className={`sca-status ${check.status}`}>{check.status.replace('_', ' ')}</span>
                    <button onClick={() => viewAuditLog(check.property_id)} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                      📜 Audit Log
                    </button>
                  </div>
                </div>

                <div className="sca-check-card-body">
                  {/* Mini Map */}
                  <div className="sca-check-map-mini">
                    {check.property_lat && check.property_lng ? (
                      <MapContainer
                        center={[parseFloat(check.property_lat), parseFloat(check.property_lng)]}
                        zoom={17}
                        style={{ width: '100%', height: '100%' }}
                        zoomControl={false}
                        dragging={false}
                        scrollWheelZoom={false}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[parseFloat(check.property_lat), parseFloat(check.property_lng)]} icon={propertyIcon}>
                          <Popup>🏠 Property</Popup>
                        </Marker>
                        {check.inspector_gps_lat && check.inspector_gps_lng && (
                          <>
                            <Marker position={[parseFloat(check.inspector_gps_lat), parseFloat(check.inspector_gps_lng)]} icon={inspectorIcon}>
                              <Popup>📍 Inspector</Popup>
                            </Marker>
                            <Polyline
                              positions={[
                                [parseFloat(check.property_lat), parseFloat(check.property_lng)],
                                [parseFloat(check.inspector_gps_lat), parseFloat(check.inspector_gps_lng)]
                              ]}
                              pathOptions={{ color: check.within_radius ? '#10b981' : '#ef4444', weight: 2, dashArray: '5,5' }}
                            />
                          </>
                        )}
                        <Circle
                          center={[parseFloat(check.property_lat), parseFloat(check.property_lng)]}
                          radius={100}
                          pathOptions={{ color: check.within_radius ? '#10b981' : '#ef4444', fillOpacity: 0.08, weight: 1 }}
                        />
                      </MapContainer>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>No GPS data</div>
                    )}
                  </div>

                  {/* Photo */}
                  <div className="sca-check-photo">
                    {check.photo_url ? (
                      <>
                        <img src={check.photo_url.startsWith('http') ? check.photo_url : `http://${window.location.hostname}:5000${check.photo_url}`} alt="Site check" />
                        <div className="timestamp-overlay">
                          📅 {new Date(check.photo_timestamp || check.created_at).toLocaleString()}
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '40px' }}>📷</div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="sca-check-details">
                    <div className="sca-detail-item">
                      <label>Distance</label>
                      <span style={{ color: check.within_radius ? '#059669' : '#dc2626' }}>
                        {Math.round(check.distance_meters)}m {check.within_radius ? '✅' : '⚠️'}
                      </span>
                    </div>
                    <div className="sca-detail-item">
                      <label>Radius</label>
                      <span>{check.within_radius ? 'Within 100m' : 'Outside 100m'}</span>
                    </div>
                    <div className="sca-detail-item">
                      <label>Inspector</label>
                      <span>{check.inspector_name}</span>
                    </div>
                    <div className="sca-detail-item">
                      <label>Date</label>
                      <span>{new Date(check.created_at).toLocaleDateString()}</span>
                    </div>
                    {check.reviewer_name && (
                      <div className="sca-detail-item">
                        <label>Reviewed By</label>
                        <span>{check.reviewer_name}</span>
                      </div>
                    )}
                    {check.admin_comment && (
                      <div className="sca-detail-item" style={{ background: '#eff6ff' }}>
                        <label>Comment</label>
                        <span style={{ fontSize: '12px' }}>{check.admin_comment}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Actions (only for pending) */}
                {check.status === 'pending' && (
                  <div className="sca-review-actions">
                    <input
                      type="text"
                      placeholder="Add a comment (optional)..."
                      value={comments[check.id] || ''}
                      onChange={e => setComments(prev => ({ ...prev, [check.id]: e.target.value }))}
                    />
                    <button className="sca-action-btn approve" onClick={() => handleReview(check.id, 'approved')}>✅ Approve</button>
                    <button className="sca-action-btn reject" onClick={() => handleReview(check.id, 'rejected')}>❌ Reject</button>
                    <button className="sca-action-btn recheck" onClick={() => handleReview(check.id, 'recheck_requested')}>🔄 Re-check</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══ LEGAL DOCUMENTS TAB ═══ */}
      {activeTab === 'documents' && (
        <div>
          <div className="sca-filter-row">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">⏳ Pending</option>
              <option value="verified">✅ Verified</option>
              <option value="rejected">❌ Rejected</option>
            </select>
            <span style={{ color: '#64748b', fontSize: '14px' }}>{legalDocs.length} document(s) found</span>
          </div>

          {loading ? (
            <div className="sca-empty"><div className="empty-icon">⏳</div><h3>Loading...</h3></div>
          ) : legalDocs.length === 0 ? (
            <div className="sca-empty">
              <div className="empty-icon">📄</div>
              <h3>No Legal Documents</h3>
              <p>Legal documents uploaded by Property Admins will appear here for verification.</p>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <table className="sca-docs-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Document Type</th>
                    <th>Uploaded By</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {legalDocs.map(doc => (
                    <tr key={doc.id}>
                      <td>
                        <strong>{doc.property_title || `#${doc.property_id}`}</strong>
                        <br />
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{doc.property_location || ''}</span>
                      </td>
                      <td>{typeLabels[doc.document_type] || doc.document_type}</td>
                      <td>{doc.uploader_name || 'Unknown'}</td>
                      <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                      <td><span className={`sca-status ${doc.status}`}>{doc.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <a
                            href={doc.document_url?.startsWith('http') ? doc.document_url : `http://${window.location.hostname}:5000${doc.document_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sca-doc-preview-btn"
                          >
                            👁️ View
                          </a>
                          {doc.status === 'pending' && (
                            <>
                              <input
                                type="text"
                                placeholder="Comment..."
                                value={docComments[doc.id] || ''}
                                onChange={e => setDocComments(prev => ({ ...prev, [doc.id]: e.target.value }))}
                                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', width: '120px' }}
                              />
                              <button className="sca-action-btn approve" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleDocReview(doc.id, 'verified')}>✅</button>
                              <button className="sca-action-btn reject" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleDocReview(doc.id, 'rejected')}>❌</button>
                            </>
                          )}
                          <button onClick={() => viewAuditLog(doc.property_id)} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '11px' }}>
                            📜
                          </button>
                        </div>
                        {doc.admin_comment && (
                          <div style={{ marginTop: '6px', fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px' }}>
                            💬 {doc.admin_comment} — {doc.reviewer_name}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ AUDIT LOG TAB ═══ */}
      {activeTab === 'audit' && (
        <div>
          {!auditPropertyId ? (
            <div className="sca-empty">
              <div className="empty-icon">📜</div>
              <h3>Select a Property</h3>
              <p>Click "Audit Log" on any site check or document to view its full verification history.</p>
              {/* Show all unique property IDs from checks */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '20px' }}>
                {[...new Set(checks.map(c => c.property_id))].map(pid => {
                  const check = checks.find(c => c.property_id === pid);
                  return (
                    <button
                      key={pid}
                      onClick={() => viewAuditLog(pid)}
                      style={{
                        padding: '10px 18px', borderRadius: '10px', border: '1px solid #e2e8f0',
                        background: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '13px'
                      }}
                    >
                      🏠 {check?.property_title || `Property #${pid}`}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>📜 Audit Log — Property #{auditPropertyId}</h3>
                <button onClick={() => setAuditPropertyId(null)} style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: '600' }}>
                  ← All Properties
                </button>
              </div>

              {auditLogs.length === 0 ? (
                <div className="sca-empty">
                  <div className="empty-icon">📜</div>
                  <h3>No Audit History</h3>
                  <p>No verification activity recorded for this property yet.</p>
                </div>
              ) : (
                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
                  <div className="sca-audit-timeline">
                    {auditLogs.map(log => (
                      <div key={log.id} className="sca-audit-item">
                        <div className="audit-time">{new Date(log.created_at).toLocaleString()}</div>
                        <div className="audit-action">{getActionLabel(log.action)}</div>
                        <div className="audit-performer">
                          👤 {log.performer_name || 'System'} ({log.performer_role || 'system'})
                        </div>
                        {log.details && (
                          <div className="audit-details">
                            {(() => {
                              try {
                                const d = JSON.parse(log.details);
                                return Object.entries(d).map(([k, v]) => (
                                  <span key={k} style={{ marginRight: '12px' }}>
                                    <strong>{k}:</strong> {String(v)}
                                  </span>
                                ));
                              } catch {
                                return log.details;
                              }
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SiteCheckAdmin;
