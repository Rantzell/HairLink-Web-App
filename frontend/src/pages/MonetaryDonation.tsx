import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const MonetaryDonation: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeAmount, setActiveAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [currency, setCurrency] = useState('PHP');
  const [amountNumber, setAmountNumber] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const amountPills = [50, 100, 150, 200, 250];

  // Handle the redirect back from Xendit's hosted checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status === 'success') {
      toast.success('Payment received! Thank you for your generous donation.');
      window.history.replaceState({}, '', window.location.pathname);
      navigate(user?.role === 'recipient' ? '/recipient/dashboard' : '/donor/dashboard');
    } else if (status === 'failed') {
      toast.error('Payment was not completed. You can try again anytime.');
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAmountPillClick = (amount: number) => {
    setActiveAmount(amount);
    setCustomAmount(amount.toString());
    setAmountNumber(amount.toLocaleString('en-US', { minimumFractionDigits: 2 }));
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomAmount(val);
    setActiveAmount(null);
    if (val) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        setAmountNumber(num.toLocaleString('en-US', { minimumFractionDigits: 2 }));
      }
    } else {
      setAmountNumber('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(customAmount || '0');
    if (!amt || amt < 10) {
      toast.error('Please enter a donation amount of at least 10.');
      return;
    }
    setShowConfirm(true);
  };

  const doSubmit = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/internal-api/monetary/create-invoice', {
        amount: parseFloat(customAmount || '0'),
        currency,
        is_anonymous: isAnonymous,
      });
      if (res.data?.invoiceUrl) {
        // Redirect to Xendit's secure hosted checkout.
        window.location.href = res.data.invoiceUrl;
      } else {
        toast.error('Could not start payment. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Donation failed', err);
      toast.error('Failed to start payment. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="section-wrap reveal active monetary-page">
      <div className="section-title-block center">
        <h1>Monetary Donation</h1>
        <p>Your financial support helps HairLink continue providing wigs and care to those in need.</p>
      </div>

      <form onSubmit={handleSubmit} className="request-form" style={{ maxWidth: '720px', margin: '0 auto' }}>
        {/* Donation Details Section */}
        <div className="form-section module-card" style={{ marginBottom: '1.5rem' }}>
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#ad246d' }}>
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
              </svg>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Donation Details</h3>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#ad246d', marginBottom: '0.75rem' }}>Select an amount</label>
            <div className="amount-pills">
              {amountPills.map(amount => (
                <button
                  key={amount}
                  type="button"
                  className={`pill-btn ${activeAmount === amount ? 'active' : ''}`}
                  onClick={() => handleAmountPillClick(amount)}
                >
                  &#8369; {amount}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'end' }}>
            <div className="form-group">
              <label htmlFor="custom-amount" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#ad246d', marginBottom: '0.5rem' }}>Or Enter A Custom Amount</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '1rem', color: '#4a3452', fontWeight: 700, fontSize: '1rem', pointerEvents: 'none' }}>&#8369;</span>
                <input
                  type="number"
                  id="custom-amount"
                  placeholder="0.00"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className="form-input-premium"
                  style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.2rem', border: '2px solid #ead7e8', borderRadius: '12px', fontWeight: 600 }}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="currency" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#ad246d', marginBottom: '0.5rem' }}>Currency *</label>
              <select
                id="currency"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="form-input-premium"
                style={{ width: '100%', padding: '0.85rem 1rem', border: '2px solid #ead7e8', borderRadius: '12px', fontWeight: 600 }}
              >
                <option value="PHP">&#8369; PHP</option>
                <option value="USD">$ USD</option>
              </select>
            </div>
          </div>
        </div>

        {/* Secure Payment Section */}
        <div className="form-section module-card" style={{ marginBottom: '2rem' }}>
          <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#ad246d' }}>
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
            <h3 style={{ margin: 0, fontWeight: 800 }}>Secure Online Payment</h3>
          </div>

          <p style={{ margin: '0 0 1rem', color: '#665772', fontSize: '0.92rem', lineHeight: 1.6 }}>
            You'll be redirected to our secure payment partner, <strong>Xendit</strong>, to complete your
            donation via <strong>GCash, credit/debit card, or online banking</strong>. No receipts or
            screenshots needed &mdash; your donation is confirmed automatically once payment succeeds.
          </p>

          <div style={{ padding: '0.85rem 1rem', background: '#fdf7fb', borderRadius: '10px', border: '1px solid #f5dceb', fontSize: '0.82rem', color: '#8c7895' }}>
            <strong style={{ color: '#ad246d' }}>Note:</strong> Payment provider fees may apply depending on the method you choose.
          </div>

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#cf2f84' }}
              />
              <span>Make this donation anonymous</span>
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions monetary-actions">
          <button type="submit" className="donate-btn" disabled={isSubmitting}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span>{isSubmitting ? 'Redirecting to payment…' : 'Donate Securely'}</span>
          </button>
          <button
            type="button"
            className="monetary-cancel-btn"
            onClick={() => navigate(user?.role === 'recipient' ? '/recipient/dashboard' : '/donor/dashboard')}
          >
            Cancel
          </button>
        </div>
      </form>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={doSubmit}
        title="Confirm Monetary Donation"
        message={`You are about to donate ${currency} ${amountNumber || customAmount}${isAnonymous ? ' (anonymously)' : ''} via our secure payment partner. You'll be redirected to complete payment. Proceed?`}
        confirmText="Proceed to Payment"
        isConfirming={isSubmitting}
      />
    </div>
  );
};

export default MonetaryDonation;
