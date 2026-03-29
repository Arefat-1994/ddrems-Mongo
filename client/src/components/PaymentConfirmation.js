import React, { useState, useEffect } from 'react';
import './PaymentConfirmation.css';
import axios from 'axios';

const PaymentConfirmation = ({ agreementRequest, user, onConfirm, onCancel }) => {
  const [paymentForm, setPaymentForm] = useState({
    amount: agreementRequest?.property_price || 0,
    payment_method: 'bank_transfer',
    payment_reference: '',
    receipt_document: null
  });
  const [loading, setLoading] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPaymentForm({ ...paymentForm, receipt_document: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setReceiptPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload receipt if provided
      let receiptPath = null;
      if (paymentForm.receipt_document) {
        const formData = new FormData();
        formData.append('file', paymentForm.receipt_document);
        
        const uploadRes = await axios.post('http://localhost:5000/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        receiptPath = uploadRes.data.path;
      }

      // Create payment confirmation
      const confirmRes = await axios.post('http://localhost:5000/api/payment-confirmations', {
        agreement_request_id: agreementRequest.id,
        amount: paymentForm.amount,
        payment_method: paymentForm.payment_method,
        payment_reference: paymentForm.payment_reference,
        receipt_document: receiptPath,
        confirmed_by: user.id
      });

      // Update agreement request
      await axios.put(`http://localhost:5000/api/agreement-requests/${agreementRequest.id}`, {
        payment_confirmed: true,
        payment_receipt_id: confirmRes.data.id
      });

      alert('✅ Payment confirmed successfully!');
      onConfirm(confirmRes.data);
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('❌ Failed to confirm payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-confirmation">
      <div className="payment-header">
        <h2>💳 Payment Confirmation</h2>
        <p>Confirm payment before signing the agreement</p>
      </div>

      <div className="payment-content">
        {/* Property Summary */}
        <div className="payment-summary">
          <h3>Property Details</h3>
          <div className="summary-item">
            <span>Property:</span>
            <strong>{agreementRequest?.property_title}</strong>
          </div>
          <div className="summary-item">
            <span>Location:</span>
            <strong>{agreementRequest?.property_location}</strong>
          </div>
          <div className="summary-item">
            <span>Amount:</span>
            <strong className="amount">{agreementRequest?.property_price?.toLocaleString()}</strong>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="payment-form">
          <div className="form-group">
            <label>Payment Amount *</label>
            <div className="amount-input">
              <span className="currency">ETB</span>
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                required
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Payment Method *</label>
            <select
              value={paymentForm.payment_method}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
              required
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
            </select>
          </div>

          <div className="form-group">
            <label>Payment Reference / Transaction ID *</label>
            <input
              type="text"
              value={paymentForm.payment_reference}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_reference: e.target.value })}
              placeholder="e.g., TXN123456789"
              required
            />
          </div>

          <div className="form-group">
            <label>Receipt/Proof of Payment</label>
            <div className="file-upload">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                id="receipt-upload"
              />
              <label htmlFor="receipt-upload" className="file-label">
                📎 Upload Receipt
              </label>
            </div>
            {receiptPreview && (
              <div className="receipt-preview">
                <img src={receiptPreview} alt="Receipt Preview" />
              </div>
            )}
          </div>

          <div className="payment-terms">
            <h4>Payment Terms</h4>
            <ul>
              <li>✓ Payment must be confirmed before agreement signing</li>
              <li>✓ Receipt/proof of payment is required</li>
              <li>✓ Transaction reference must be provided</li>
              <li>✓ Payment confirmation is final and cannot be reversed</li>
            </ul>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-confirm" disabled={loading}>
              {loading ? 'Processing...' : '✅ Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentConfirmation;
