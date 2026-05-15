import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageHeader from './PageHeader';

const API = `${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api`;
const GREEN = '#00a651';

export default function MpesaDashboard({ user, onLogout, onSettingsClick }) {
  const [activeTab, setActiveTab] = useState('connection');
  const [notification, setNotification] = useState(null);

  // Connection tab
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenResult, setTokenResult] = useState(null);

  // Payments tab
  const [agreements, setAgreements] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [adminNotes, setAdminNotes] = useState({});

  // Payout tab
  const [payoutForm, setPayoutForm] = useState({ phone: '251', amount: '', agreement_id: '', remarks: '' });
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutResult, setPayoutResult] = useState(null);

  // STK test tab
  const [stkForm, setStkForm] = useState({ phone: '251', amount: '', agreement_id: '' });
  const [stkLoading, setStkLoading] = useState(false);
  const [stkResult, setStkResult] = useState(null);
  const [stkStatus, setStkStatus] = useState(null);
  const [statusPolling, setStatusPolling] = useState(false);

  // Stats
  const [allAgreements, setAllAgreements] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchAgreements();
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAgreements = async () => {
    setPaymentsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/agreement-workflow/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data.agreements || res.data || [];
      setAllAgreements(data);
      setAgreements(data.filter(a => a.status === 'payment_submitted'));
    } catch (err) {
      notify('Failed to load agreements: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setPaymentsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API}/mpesa/transactions`);
      setTransactions(res.data.transactions || []);
    } catch (err) {
      console.warn('Could not load M-Pesa transactions:', err.message);
    }
  };

  // Poll payment status after STK push
  const pollPaymentStatus = async (agreementId) => {
    setStatusPolling(true);
    setStkStatus(null);
    let attempts = 0;
    const maxAttempts = 12; // poll for 60 seconds
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await axios.get(`${API}/mpesa/status/${agreementId}`);
        const data = res.data;
        setStkStatus(data);
        fetchTransactions();

        // Stop polling if payment confirmed or failed
        const mpesaStatus = data.mpesa_transaction?.status;
        if (mpesaStatus === 'completed' || mpesaStatus === 'failed' || data.payment_submitted) {
          clearInterval(interval);
          setStatusPolling(false);
          if (mpesaStatus === 'completed' || data.payment_submitted) {
            notify('✅ Payment confirmed! Agreement updated.');
            fetchAgreements();
          } else if (mpesaStatus === 'failed') {
            notify('❌ Payment failed or cancelled by user.', 'error');
          }
        }
      } catch (e) {
        console.warn('Status poll error:', e.message);
      }
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setStatusPolling(false);
        notify('⏰ Polling stopped. Check transactions tab for status.', 'error');
      }
    }, 5000); // every 5 seconds
  };

  const testConnection = async () => {
    setTokenLoading(true);
    setTokenResult(null);
    try {
      const res = await axios.get(`${API}/mpesa/token`);
      setTokenResult({ success: true, token: res.data.token, message: res.data.message });
      notify('M-Pesa connection successful!');
    } catch (err) {
      setTokenResult({ success: false, message: err.response?.data?.message || err.message });
      notify('Connection failed', 'error');
    } finally {
      setTokenLoading(false);
    }
  };

  const verifyPayment = async (agreementId) => {
    setVerifyingId(agreementId);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/agreement-workflow/${agreementId}/verify-payment`, {
        admin_id: user?.id,
        admin_notes: adminNotes[agreementId] || ''
      }, { headers: { Authorization: `Bearer ${token}` } });
      notify(`Payment verified for agreement #${agreementId}`);
      fetchAgreements();
    } catch (err) {
      notify('Verification failed: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  const sendPayout = async () => {
    if (!payoutForm.phone || !payoutForm.amount) {
      notify('Phone and amount are required', 'error');
      return;
    }
    setPayoutLoading(true);
    setPayoutResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/mpesa/b2c-payout`, {
        ...payoutForm,
        admin_id: user?.id
      }, { headers: { Authorization: `Bearer ${token}` } });
      setPayoutResult(res.data);
      notify(res.data.message || 'Payout initiated!');
    } catch (err) {
      const errData = err.response?.data;
      setPayoutResult(errData || { success: false, message: err.message });
      notify('Payout failed: ' + (errData?.message || err.message), 'error');
    } finally {
      setPayoutLoading(false);
    }
  };

  const sendStkPush = async () => {
    if (!stkForm.phone || !stkForm.amount || !stkForm.agreement_id) {
      notify('Phone, amount, and agreement ID are required', 'error');
      return;
    }
    setStkLoading(true);
    setStkResult(null);
    setStkStatus(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/mpesa/stk-push`, {
        ...stkForm,
        buyer_id: user?.id
      }, { headers: { Authorization: `Bearer ${token}` } });
      setStkResult(res.data);
      if (res.data.success) {
        notify('📱 STK Push sent! Waiting for payment on phone...');
        // Start polling for payment status
        pollPaymentStatus(stkForm.agreement_id);
      } else {
        notify('STK Push failed: ' + res.data.message, 'error');
      }
    } catch (err) {
      const errData = err.response?.data;
      setStkResult(errData || { success: false, message: err.message });
      notify('STK Push failed: ' + (errData?.message || err.message), 'error');
    } finally {
      setStkLoading(false);
    }
  };

  // Stats
  const totalAgreements = allAgreements.length;
  const pendingPayments = allAgreements.filter(a => a.status === 'payment_submitted').length;
  const verifiedPayments = allAgreements.filter(a => a.status === 'payment_verified' || a.status === 'completed').length;

  const tabs = [
    { id: 'connection', label: '🔌 Connection' },
    { id: 'payments', label: '💳 Payments' },
    { id: 'payout', label: '💸 B2C Payout' },
    { id: 'stk_test', label: '📱 STK Test' },
    { id: 'transactions', label: '📋 Transactions' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f9', fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Toast notification */}
      {notification && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: notification.type === 'error' ? '#e74c3c' : GREEN,
          color: '#fff', padding: '12px 20px', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)', fontWeight: 600,
          maxWidth: 340, animation: 'fadeIn 0.3s ease'
        }}>
          {notification.type === 'error' ? '❌ ' : '✅ '}{notification.msg}
        </div>
      )}

      <PageHeader
        user={user}
        onLogout={onLogout}
        onSettingsClick={onSettingsClick}
        title="M-Pesa Dashboard"
      />

      {/* M-Pesa branding banner */}
      <div style={{
        background: `linear-gradient(135deg, ${GREEN} 0%, #007a3d 100%)`,
        color: '#fff', padding: '18px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            background: '#fff', borderRadius: 10, padding: '6px 14px',
            fontWeight: 900, fontSize: 20, color: GREEN, letterSpacing: 1
          }}>M-PESA</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>Safaricom Ethiopia</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>Shortcode: 6564 &nbsp;|&nbsp; Sandbox Mode</div>
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.15)', borderRadius: 20,
          padding: '4px 16px', fontSize: 13, fontWeight: 600
        }}>
          🟡 SANDBOX
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, padding: '20px 32px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Agreements', value: totalAgreements, color: '#3498db' },
          { label: 'Pending Payments', value: pendingPayments, color: '#e67e22' },
          { label: 'Verified Payments', value: verifiedPayments, color: GREEN },
        ].map(stat => (
          <div key={stat.label} style={{
            flex: '1 1 160px', background: '#fff', borderRadius: 10,
            padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            borderLeft: `4px solid ${stat.color}`
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 32px' }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: `2px solid #e0e0e0`, marginBottom: 24 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? GREEN : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#555',
              fontWeight: activeTab === tab.id ? 700 : 500,
              borderRadius: '8px 8px 0 0', fontSize: 14,
              transition: 'all 0.2s'
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Connection Tab */}
        {activeTab === 'connection' && (
          <div style={{ maxWidth: 560 }}>
            <h3 style={{ marginTop: 0, color: '#333' }}>Test M-Pesa API Connection</h3>
            <p style={{ color: '#666', fontSize: 14 }}>
              Verify that the M-Pesa API credentials are working and a token can be generated.
            </p>
            <button onClick={testConnection} disabled={tokenLoading} style={{
              background: tokenLoading ? '#aaa' : GREEN, color: '#fff',
              border: 'none', borderRadius: 8, padding: '12px 28px',
              fontWeight: 700, fontSize: 15, cursor: tokenLoading ? 'not-allowed' : 'pointer'
            }}>
              {tokenLoading ? '⏳ Testing...' : '🔌 Test Connection'}
            </button>

            {tokenResult && (
              <div style={{
                marginTop: 20, padding: 20, borderRadius: 10,
                background: tokenResult.success ? '#e8f8ef' : '#fdecea',
                border: `1px solid ${tokenResult.success ? '#a8e6c3' : '#f5c6cb'}`
              }}>
                <div style={{ fontWeight: 700, color: tokenResult.success ? GREEN : '#c0392b', fontSize: 16, marginBottom: 8 }}>
                  {tokenResult.success ? '✅ Connection Successful' : '❌ Connection Failed'}
                </div>
                <div style={{ color: '#555', fontSize: 14 }}>{tokenResult.message}</div>
                {tokenResult.token && (
                  <div style={{ marginTop: 10, fontFamily: 'monospace', fontSize: 12, color: '#333',
                    background: '#fff', padding: '8px 12px', borderRadius: 6, wordBreak: 'break-all' }}>
                    <strong>Token preview:</strong> {tokenResult.token.substring(0, 40)}...
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#333' }}>Pending Payment Verifications</h3>
              <button onClick={fetchAgreements} disabled={paymentsLoading} style={{
                background: '#3498db', color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13
              }}>
                {paymentsLoading ? '⏳ Loading...' : '🔄 Refresh'}
              </button>
            </div>

            {paymentsLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading agreements...</div>
            ) : agreements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888', background: '#fff', borderRadius: 10 }}>
                No agreements with pending payment verification.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {agreements.map(agr => (
                  <div key={agr.id} style={{
                    background: '#fff', borderRadius: 10, padding: 20,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                    borderLeft: `4px solid ${GREEN}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#222' }}>
                          Agreement #{agr.id}
                        </div>
                        <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>
                          🏠 {agr.property_title || agr.title || 'N/A'}
                        </div>
                        <div style={{ color: '#555', fontSize: 13 }}>
                          👤 {agr.customer_name || agr.buyer_name || 'N/A'}
                        </div>
                        <div style={{ color: '#555', fontSize: 13 }}>
                          💰 ETB {Number(agr.amount || agr.payment_amount || 0).toLocaleString()}
                          &nbsp;|&nbsp; 📱 {agr.payment_method || 'M-Pesa'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
                        <input
                          type="text"
                          placeholder="Admin notes (optional)"
                          value={adminNotes[agr.id] || ''}
                          onChange={e => setAdminNotes(prev => ({ ...prev, [agr.id]: e.target.value }))}
                          style={{
                            padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd',
                            fontSize: 13, outline: 'none'
                          }}
                        />
                        <button
                          onClick={() => verifyPayment(agr.id)}
                          disabled={verifyingId === agr.id}
                          style={{
                            background: verifyingId === agr.id ? '#aaa' : GREEN,
                            color: '#fff', border: 'none', borderRadius: 8,
                            padding: '10px 16px', fontWeight: 700, cursor: verifyingId === agr.id ? 'not-allowed' : 'pointer',
                            fontSize: 14
                          }}
                        >
                          {verifyingId === agr.id ? '⏳ Verifying...' : '✅ Verify Payment'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payout Tab */}
        {activeTab === 'payout' && (
          <div style={{ maxWidth: 520 }}>
            <h3 style={{ marginTop: 0, color: '#333' }}>B2C Payout</h3>
            <p style={{ color: '#666', fontSize: 14 }}>Send funds directly to a phone number via M-Pesa B2C.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Phone Number (251...)', key: 'phone', placeholder: '251912345678' },
                { label: 'Amount (ETB)', key: 'amount', placeholder: '1000', type: 'number' },
                { label: 'Agreement ID (optional)', key: 'agreement_id', placeholder: 'e.g. 42' },
                { label: 'Remarks', key: 'remarks', placeholder: 'Property payout' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#444', marginBottom: 5 }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type || 'text'}
                    placeholder={field.placeholder}
                    value={payoutForm[field.key]}
                    onChange={e => setPayoutForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      border: '1px solid #ddd', fontSize: 14, outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              ))}

              <button onClick={sendPayout} disabled={payoutLoading} style={{
                background: payoutLoading ? '#aaa' : GREEN, color: '#fff',
                border: 'none', borderRadius: 8, padding: '12px 28px',
                fontWeight: 700, fontSize: 15, cursor: payoutLoading ? 'not-allowed' : 'pointer',
                marginTop: 4
              }}>
                {payoutLoading ? '⏳ Sending...' : '💸 Send Payout'}
              </button>
            </div>

            {payoutResult && (
              <div style={{
                marginTop: 20, padding: 16, borderRadius: 10,
                background: payoutResult.success ? '#e8f8ef' : '#fdecea',
                border: `1px solid ${payoutResult.success ? '#a8e6c3' : '#f5c6cb'}`
              }}>
                <div style={{ fontWeight: 700, color: payoutResult.success ? GREEN : '#c0392b', marginBottom: 8 }}>
                  {payoutResult.success ? '✅ ' : '❌ '}{payoutResult.message}
                </div>
                {payoutResult.data && (
                  <pre style={{ fontSize: 12, color: '#333', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(payoutResult.data, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* STK Test Tab */}
        {activeTab === 'stk_test' && (
          <div style={{ maxWidth: 520 }}>
            <h3 style={{ marginTop: 0, color: '#333' }}>STK Push Test</h3>
            <p style={{ color: '#666', fontSize: 14 }}>Trigger an M-Pesa STK Push prompt on a customer's phone.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Phone Number (251...)', key: 'phone', placeholder: '251912345678' },
                { label: 'Amount (ETB)', key: 'amount', placeholder: '1000', type: 'number' },
                { label: 'Agreement ID', key: 'agreement_id', placeholder: 'e.g. 42' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#444', marginBottom: 5 }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type || 'text'}
                    placeholder={field.placeholder}
                    value={stkForm[field.key]}
                    onChange={e => setStkForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      border: '1px solid #ddd', fontSize: 14, outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              ))}

              <button onClick={sendStkPush} disabled={stkLoading} style={{
                background: stkLoading ? '#aaa' : GREEN, color: '#fff',
                border: 'none', borderRadius: 8, padding: '12px 28px',
                fontWeight: 700, fontSize: 15, cursor: stkLoading ? 'not-allowed' : 'pointer',
                marginTop: 4
              }}>
                {stkLoading ? '⏳ Sending...' : '📱 Send STK Push'}
              </button>
            </div>

            {stkResult && (
              <div style={{
                marginTop: 20, padding: 16, borderRadius: 10,
                background: stkResult.success ? '#e8f8ef' : '#fdecea',
                border: `1px solid ${stkResult.success ? '#a8e6c3' : '#f5c6cb'}`
              }}>
                <div style={{ fontWeight: 700, color: stkResult.success ? GREEN : '#c0392b', marginBottom: 8 }}>
                  {stkResult.success ? '✅ ' : '❌ '}{stkResult.message}
                </div>
                <pre style={{ fontSize: 12, color: '#333', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {JSON.stringify(stkResult, null, 2)}
                </pre>
              </div>
            )}

            {/* Real-time payment status polling */}
            {(statusPolling || stkStatus) && (
              <div style={{
                marginTop: 16, padding: 16, borderRadius: 10,
                background: '#fff8e1', border: '1px solid #ffe082'
              }}>
                <div style={{ fontWeight: 700, color: '#f57f17', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {statusPolling ? '⏳ Waiting for payment confirmation...' : '📊 Payment Status'}
                  {statusPolling && <span style={{ fontSize: 12, color: '#888' }}>(checking every 5s)</span>}
                </div>
                {stkStatus && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
                    <div>📄 Agreement Status: <strong>{stkStatus.agreement_status}</strong></div>
                    <div>💰 Payment Submitted: <strong style={{ color: stkStatus.payment_submitted ? GREEN : '#e74c3c' }}>{stkStatus.payment_submitted ? 'YES ✅' : 'NO ⏳'}</strong></div>
                    {stkStatus.mpesa_transaction && (
                      <>
                        <div>📱 M-Pesa Status: <strong style={{
                          color: stkStatus.mpesa_transaction.status === 'completed' ? GREEN :
                                 stkStatus.mpesa_transaction.status === 'failed' ? '#e74c3c' : '#f57f17'
                        }}>{stkStatus.mpesa_transaction.status?.toUpperCase()}</strong></div>
                        {stkStatus.mpesa_transaction.result_code && (
                          <div>🔢 Result Code: <strong>{stkStatus.mpesa_transaction.result_code}</strong> — {stkStatus.mpesa_transaction.result_desc}</div>
                        )}
                        <div>📞 Phone: {stkStatus.mpesa_transaction.phone}</div>
                        <div>💵 Amount: ETB {Number(stkStatus.mpesa_transaction.amount || 0).toLocaleString()}</div>
                      </>
                    )}
                    {stkStatus.payment && (
                      <div>🏦 Payment Method: {stkStatus.payment.payment_method} | Status: {stkStatus.payment.payment_status}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#333' }}>M-Pesa Transaction History</h3>
              <button onClick={fetchTransactions} style={{
                background: '#3498db', color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13
              }}>🔄 Refresh</button>
            </div>
            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888', background: '#fff', borderRadius: 10 }}>
                No M-Pesa transactions yet. Send an STK Push to see results here.
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      {['#', 'Agreement', 'Property', 'Phone', 'Amount', 'Status', 'Result', 'Time'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', borderBottom: '2px solid #e0e0e0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, i) => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#888' }}>#{tx.id}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>AGR-{tx.agreement_id}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#555' }}>{tx.property_title || '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontFamily: 'monospace' }}>{tx.phone}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>ETB {Number(tx.amount || 0).toLocaleString()}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                            background: tx.status === 'completed' ? '#e8f8ef' : tx.status === 'failed' ? '#fdecea' : '#fff8e1',
                            color: tx.status === 'completed' ? GREEN : tx.status === 'failed' ? '#c0392b' : '#f57f17',
                            textTransform: 'uppercase'
                          }}>{tx.status}</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#666' }}>
                          {tx.result_code ? `${tx.result_code}: ${(tx.result_desc || '').substring(0, 30)}` : '—'}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#888' }}>
                          {tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
