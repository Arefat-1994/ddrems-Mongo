import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageHeader from './PageHeader';

const API = `http://${window.location.hostname}:5000/api`;
const CHAPA_GREEN = '#85BB65';

export default function ChapaDashboard({ user, onLogout, onSettingsClick, tx_ref, agreementId, sourceType, setCurrentPage }) {
  const [activeTab, setActiveTab] = useState(tx_ref ? 'receipt' : 'transactions');
  const [notification, setNotification] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  useEffect(() => {
    if (tx_ref) {
      verifyPayment(tx_ref);
    }
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx_ref]);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API}/chapa/transactions`);
      setTransactions(res.data || []);
    } catch (err) {
      console.warn('Could not load Chapa transactions:', err.message);
    }
  };

  const verifyPayment = async (ref) => {
    setReceiptLoading(true);
    try {
      const res = await axios.get(`${API}/chapa/verify/${ref}`);
      if (res.data.success) {
        setReceiptData(res.data.data);
        notify('Payment verified successfully!');
        fetchTransactions();
      } else {
        notify('Verification failed: ' + res.data.message, 'error');
      }
    } catch (err) {
      notify('Verification failed: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setReceiptLoading(false);
    }
  };

  const generateReceiptText = () => {
    if (!receiptData) return '';
    return `
=================================
     DDREMS PAYMENT RECEIPT
=================================
Transaction Ref: ${receiptData.tx_ref}
Date: ${new Date(receiptData.created_at).toLocaleString()}
Status: PAID ✓

Customer: ${receiptData.first_name} ${receiptData.last_name}
Email: ${receiptData.email}

Amount Paid: ${receiptData.amount} ${receiptData.currency}
Payment Method: Chapa Online Payment
=================================
Thank you for your payment!
Dire Dawa Real Estate Management System
    `.trim();
  };

  const handleDownloadReceipt = () => {
    if (!receiptData) return;
    const receiptContent = generateReceiptText();
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DDREMS-Receipt-${receiptData.tx_ref}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadReceiptToAgreement = async () => {
    if (!receiptData || !tx_ref) return;
    setUploadingReceipt(true);
    try {
      const receiptContent = generateReceiptText();
      const payload = {
        tx_ref,
        receipt_document: receiptContent,
        user_id: user.id,
      };
      if (sourceType === 'broker_engagement') {
        payload.engagementId = agreementId;
      } else {
        payload.agreementId = agreementId;
      }
      await axios.post(`${API}/chapa/upload-receipt`, payload);
      setReceiptUploaded(true);
      notify('Receipt uploaded to your agreement successfully!');
    } catch (err) {
      notify('Failed to upload receipt: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleGoToAgreement = () => {
    if (sourceType === 'broker_engagement') {
      setCurrentPage('broker-engagement');
    } else {
      setCurrentPage('agreement-workflow');
    }
  };

  const getStatusStyle = (status) => {
    if (status === 'confirmed') return { background: '#e8f8ef', color: CHAPA_GREEN, label: '✅ PAID' };
    if (status === 'failed') return { background: '#fdecea', color: '#c0392b', label: '❌ FAILED' };
    return { background: '#fff8e1', color: '#f57f17', label: '⏳ PENDING' };
  };

  const isAdmin = ['admin', 'system_admin', 'property_admin'].includes(user?.role);

  const tabs = [
    ...(tx_ref ? [{ id: 'receipt', label: '🧾 Receipt' }] : []),
    { id: 'transactions', label: '📋 Transactions' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f9', fontFamily: 'Segoe UI, sans-serif' }}>
      {notification && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: notification.type === 'error' ? '#e74c3c' : CHAPA_GREEN,
          color: '#fff', padding: '12px 20px', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)', fontWeight: 600,
          maxWidth: 340, animation: 'fadeIn 0.3s ease'
        }}>
          {notification.type === 'error' ? '❌ ' : '✅ '}{notification.msg}
        </div>
      )}

      <PageHeader user={user} onLogout={onLogout} onSettingsClick={onSettingsClick} title="Chapa Dashboard" />

      <div style={{
        background: `linear-gradient(135deg, ${CHAPA_GREEN} 0%, #619a46 100%)`,
        color: '#fff', padding: '18px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            background: '#fff', borderRadius: 10, padding: '6px 14px',
            fontWeight: 900, fontSize: 20, color: CHAPA_GREEN, letterSpacing: 1
          }}>CHAPA</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>Chapa Payment Gateway</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>Secure online payments</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 32px' }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e0e0e0', marginBottom: 24 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? CHAPA_GREEN : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#555',
              fontWeight: activeTab === tab.id ? 700 : 500,
              borderRadius: '8px 8px 0 0', fontSize: 14, transition: 'all 0.2s'
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Receipt Tab ── */}
        {activeTab === 'receipt' && (
          <div style={{ maxWidth: 600, margin: '0 auto', background: '#fff', borderRadius: 12, padding: 30, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', color: '#333', marginTop: 0 }}>Payment Receipt</h2>

            {receiptLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
                Verifying Payment... Please wait.
              </div>
            ) : receiptData ? (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ display: 'inline-block', width: 64, height: 64, borderRadius: '50%', background: '#e8f8ef', color: CHAPA_GREEN, fontSize: 32, lineHeight: '64px', marginBottom: 16 }}>✓</div>
                  <h3 style={{ margin: 0, color: CHAPA_GREEN }}>Payment Successful</h3>
                  <p style={{ color: '#666', marginTop: 8 }}>Your payment has been securely processed by Chapa.</p>
                </div>

                <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 20, marginBottom: 24 }}>
                  {[
                    ['Transaction Ref:', receiptData.tx_ref, true],
                    ['Date:', new Date(receiptData.created_at).toLocaleString()],
                    ['Amount Paid:', `${Number(receiptData.amount).toLocaleString()} ${receiptData.currency}`, false, true],
                    ['Paid By:', `${receiptData.first_name} ${receiptData.last_name}`],
                    ['Status:', 'PAID ✅', false, false, true],
                  ].map(([label, val, mono, green, bold], i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px dashed #ddd', marginBottom: 12 }}>
                      <span style={{ color: '#666' }}>{label}</span>
                      <span style={{
                        fontWeight: green || bold ? 700 : 600,
                        fontFamily: mono ? 'monospace' : 'inherit',
                        color: green ? CHAPA_GREEN : bold ? '#059669' : '#1e293b',
                        fontSize: green ? 18 : 14
                      }}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Download Receipt */}
                  <button onClick={handleDownloadReceipt} style={{
                    background: '#fff', color: CHAPA_GREEN, border: `2px solid ${CHAPA_GREEN}`, borderRadius: 10,
                    padding: '14px 24px', fontWeight: 700, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s'
                  }}>
                    📥 Download Receipt
                  </button>

                  {/* Upload Receipt to Agreement */}
                  {agreementId && !receiptUploaded && (
                    <button onClick={handleUploadReceiptToAgreement} disabled={uploadingReceipt} style={{
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', border: 'none', borderRadius: 10,
                      padding: '14px 24px', fontWeight: 700, cursor: uploadingReceipt ? 'wait' : 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      opacity: uploadingReceipt ? 0.7 : 1, transition: 'all 0.2s'
                    }}>
                      {uploadingReceipt ? '⏳ Uploading...' : '📤 Upload Receipt to Agreement'}
                    </button>
                  )}

                  {receiptUploaded && (
                    <div style={{ textAlign: 'center', padding: 12, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', color: '#166534', fontWeight: 600, fontSize: 14 }}>
                      ✅ Receipt uploaded to your agreement successfully!
                    </div>
                  )}

                  {/* Go to Agreement */}
                  {agreementId && (
                    <button onClick={handleGoToAgreement} style={{
                      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', border: 'none', borderRadius: 10,
                      padding: '14px 24px', fontWeight: 700, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}>
                      📋 Continue to {sourceType === 'broker_engagement' ? 'Broker Engagement' : 'Agreement Workflow'}
                    </button>
                  )}

                  <button onClick={() => setCurrentPage('dashboard')} style={{
                    background: CHAPA_GREEN, color: '#fff', border: 'none', borderRadius: 10,
                    padding: '14px 24px', fontWeight: 700, cursor: 'pointer', fontSize: 15
                  }}>
                    🏠 Return to Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#e74c3c' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
                <p>Failed to verify payment.</p>
                <button onClick={() => setCurrentPage('dashboard')} style={{
                  background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '10px 20px', marginTop: 16, cursor: 'pointer'
                }}>Return to Dashboard</button>
              </div>
            )}
          </div>
        )}

        {/* ── Transactions Tab ── */}
        {activeTab === 'transactions' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#333' }}>Transaction History</h3>
              <button onClick={fetchTransactions} style={{
                background: CHAPA_GREEN, color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13
              }}>🔄 Refresh</button>
            </div>

            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888', background: '#fff', borderRadius: 10 }}>
                No Chapa transactions yet.
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      {['Ref', isAdmin ? 'Source' : null, 'Amount', 'Status', 'Receipt', 'Date'].filter(Boolean).map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', borderBottom: '2px solid #e0e0e0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, i) => {
                      const st = getStatusStyle(tx.status);
                      return (
                        <tr key={tx.id || i} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '12px 14px', fontSize: 13, fontFamily: 'monospace' }}>{tx.payment_reference || tx.tx_ref}</td>
                          {isAdmin && (
                            <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>
                              {tx.agreement_request_id ? `AGR-${String(tx.agreement_request_id).slice(-6)}` : tx.broker_engagement_id ? `ENG-${String(tx.broker_engagement_id).slice(-6)}` : '—'}
                            </td>
                          )}
                          <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>ETB {Number(tx.amount || 0).toLocaleString()}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                              background: st.background, color: st.color, textTransform: 'uppercase'
                            }}>{st.label}</span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {tx.receipt_document ? (
                              <span style={{ color: '#059669', fontWeight: 600, fontSize: 12 }}>📄 Uploaded</span>
                            ) : tx.status === 'confirmed' ? (
                              <span style={{ color: '#f59e0b', fontSize: 12 }}>⏳ Pending</span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: '#888' }}>
                            {tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
