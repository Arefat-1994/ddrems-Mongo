import React, { useState } from 'react';
import axios from 'axios';

const API = `http://${window.location.hostname}:5000/api/mpesa`;

const MpesaPayment = ({ agreement, user, onSuccess, onCancel }) => {
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('form'); // form | waiting | confirmed | error
  const [message, setMessage] = useState('');
  const [txRef, setTxRef] = useState('');

  const amount = Number(agreement?.proposed_price || agreement?.property_price || 0);

  const normalizePhone = (p) => {
    let n = p.replace(/\s+/g, '').replace(/^\+/, '');
    if (n.startsWith('0')) n = '251' + n.slice(1);
    if (!n.startsWith('251')) n = '251' + n;
    return n;
  };

  const handleStkPush = async () => {
    if (!phone || phone.length < 9) {
      setMessage('❌ Please enter a valid phone number');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await axios.post(`${API}/stk-push`, {
        phone: normalizePhone(phone),
        amount,
        agreement_id: agreement.id,
        buyer_id: user.id,
        account_ref: `AGR-${agreement.id}`
      });

      if (res.data.success) {
        setTxRef(res.data.merchant_request_id || '');
        setStep('waiting');
        setMessage('📱 STK Push sent! Check your phone and enter your M-Pesa PIN to complete payment.');
      } else {
        setMessage('❌ ' + (res.data.message || 'STK Push failed'));
      }
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  const handleConfirmManually = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/confirm-payment`, {
        agreement_id: agreement.id,
        transaction_reference: txRef || `MPESA-${Date.now()}`
      });
      if (res.data.success) {
        setStep('confirmed');
        setMessage('✅ Payment confirmed! Awaiting admin verification.');
        if (onSuccess) onSuccess();
      } else {
        setMessage('❌ ' + res.data.message);
      }
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '0' }}>
      {step === 'form' && (
        <>
          <div style={{
            background: 'linear-gradient(135deg, #00a651, #007a3d)',
            borderRadius: '12px', padding: '20px', marginBottom: '20px',
            display: 'flex', alignItems: 'center', gap: '16px', color: 'white'
          }}>
            <div style={{ fontSize: '40px' }}>📱</div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700' }}>M-Pesa Payment</div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>Safaricom Ethiopia — Secure Mobile Payment</div>
            </div>
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: '#166534', marginBottom: '4px' }}>AMOUNT TO PAY</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#15803d' }}>
              {amount.toLocaleString()} ETB
            </div>
            <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
              Agreement #{agreement.id} — {agreement.property_title}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', marginBottom: '6px', color: '#1e293b' }}>
              📞 M-Pesa Phone Number *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0912345678 or 251912345678"
              style={{
                width: '100%', padding: '12px 14px', border: '2px solid #86efac',
                borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box',
                outline: 'none'
              }}
            />
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Enter your Safaricom Ethiopia number. You will receive a PIN prompt.
            </div>
          </div>

          {message && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px',
              background: message.startsWith('❌') ? '#fef2f2' : '#f0fdf4',
              color: message.startsWith('❌') ? '#dc2626' : '#166534',
              border: `1px solid ${message.startsWith('❌') ? '#fecaca' : '#86efac'}`
            }}>
              {message}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleStkPush}
              disabled={loading}
              style={{
                flex: 1, padding: '14px', background: loading ? '#9ca3af' : '#00a651',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '⏳ Sending...' : '📱 Send STK Push'}
            </button>
            <button onClick={onCancel} style={{
              padding: '14px 20px', background: 'white', border: '1px solid #e2e8f0',
              borderRadius: '8px', cursor: 'pointer', color: '#64748b', fontWeight: '600'
            }}>
              Cancel
            </button>
          </div>
        </>
      )}

      {step === 'waiting' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>📲</div>
          <h3 style={{ color: '#00a651', marginBottom: '12px' }}>Check Your Phone!</h3>
          <p style={{ color: '#475569', marginBottom: '20px', lineHeight: '1.6' }}>
            An M-Pesa payment request has been sent to <strong>{phone}</strong>.<br />
            Enter your M-Pesa PIN to complete the payment of <strong>{amount.toLocaleString()} ETB</strong>.
          </p>

          <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px', marginBottom: '20px', fontSize: '13px', color: '#92400e' }}>
            ⚠️ After completing payment on your phone, click <strong>"I've Paid"</strong> below to confirm.
          </div>

          {message && (
            <div style={{ padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px',
              background: '#f0fdf4', color: '#166534', border: '1px solid #86efac' }}>
              {message}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={handleConfirmManually}
              disabled={loading}
              style={{
                padding: '12px 28px', background: loading ? '#9ca3af' : '#00a651',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '⏳ Confirming...' : "✅ I've Paid"}
            </button>
            <button onClick={() => setStep('form')} style={{
              padding: '12px 20px', background: 'white', border: '1px solid #e2e8f0',
              borderRadius: '8px', cursor: 'pointer', color: '#64748b'
            }}>
              ← Back
            </button>
          </div>
        </div>
      )}

      {step === 'confirmed' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>🎉</div>
          <h3 style={{ color: '#00a651', marginBottom: '12px' }}>Payment Submitted!</h3>
          <p style={{ color: '#475569', lineHeight: '1.6' }}>
            Your M-Pesa payment of <strong>{amount.toLocaleString()} ETB</strong> has been submitted.<br />
            The property admin will verify the payment shortly.
          </p>
        </div>
      )}
    </div>
  );
};

export default MpesaPayment;
