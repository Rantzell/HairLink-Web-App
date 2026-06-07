import toast from 'react-hot-toast';
import React, { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<'bank' | 'instapay'>('bank');
  const [billingName, _setBillingName] = useState(user?.firstName ? `${user.firstName} ${user.lastName}` : user?.name || '');
  const [amountNumber, setAmountNumber] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [qrZoom, setQrZoom] = useState(false);

  const amountPills = [50, 100, 150, 200, 250];

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountNumber || !proofFile) {
      toast.error('Please fill in all required fields and upload proof of donation.');
      return;
    }
    setShowConfirm(true);
  };

  const doSubmit = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('amount', customAmount || activeAmount?.toString() || '0');
    formData.append('currency', currency);
    formData.append('payment_method', activeTab);
    formData.append('is_anonymous', isAnonymous ? '1' : '0');
    formData.append('proof', proofFile!);

    try {
      await apiClient.post('/internal-api/monetary/donate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Thank you for your donation! It has been successfully received and verified.');
      navigate(user?.role === 'recipient' ? '/recipient/dashboard' : '/donor/dashboard');
    } catch (err) {
      console.error('Donation failed', err);
      toast.error('Failed to submit donation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemo = () => {
    setCustomAmount('1000');
    setAmountNumber('1,000.00');
    setCurrency('PHP');
  };

  return (
    <div className="section-wrap reveal active monetary-page">
      <div className="section-title-block center">
        <h1>Monetary Donation</h1>
        <p>Your financial support helps HairLink continue providing wigs and care to those in need.</p>
      </div>

      {/* Guidelines */}
      <div className="request-guidelines" style={{ 
        background: '#fff', 
        border: '1px solid #ead7e8', 
        borderRadius: '20px', 
        padding: '1.5rem', 
        marginBottom: '2rem',
        boxShadow: '0 10px 25px rgba(73, 20, 52, 0.04)'
      }}>
        <div className="guidelines-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#ad246d' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
          </svg>
          <h3 style={{ margin: 0, fontWeight: 800 }}>Donation Guidelines</h3>
        </div>
        <div className="guidelines-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="guideline-col">
            <div className="guideline-group">
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#4a3452' }}>Prepare the following:</h4>
              <ul style={{ fontSize: '0.85rem', color: '#665772', paddingLeft: '1.2rem', lineHeight: '1.6' }}>
                <li>Your proof of donation (screenshot or receipt)</li>
                <li>Valid name matching your bank account</li>
                <li>Exact donation amount</li>
              </ul>
            </div>
          </div>
          <div className="guideline-col">
            <div className="guideline-group">
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#4a3452' }}>Important:</h4>
              <ul style={{ fontSize: '0.85rem', color: '#665772', paddingLeft: '1.2rem', lineHeight: '1.6' }}>
                <li>Transfer funds before completing this form</li>
                <li>Upload clear proof of your transaction</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="request-form">
        {/* Donation Details Section */}
        <div className="form-section module-card" style={{ marginBottom: '1.5rem' }}>
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#ad246d' }}>
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
              </svg>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Donation Details</h3>
            </div>
            <button type="button" onClick={fillDemo} className="soft-btn" style={{ minWidth: '120px', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Quick Fill Demo</button>
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

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group">
              <label htmlFor="custom-amount" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#ad246d', marginBottom: '0.5rem' }}>Or Enter A Custom Amount</label>
              <input 
                type="number" 
                id="custom-amount" 
                placeholder="0.00"
                value={customAmount}
                onChange={handleCustomAmountChange}
                className="form-input-premium"
                style={{ width: '100%', padding: '0.85rem 1rem', border: '2px solid #ead7e8', borderRadius: '12px', fontWeight: 600 }}
              />
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

        {/* Billing Information Section */}
        <div className="form-section module-card" style={{ marginBottom: '2rem' }}>
          <div className="section-header billing-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#ad246d' }}>
                <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
              </svg>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Billing Information</h3>
            </div>
            <div className="payment-tabs">
              <button 
                type="button" 
                className={`tab-btn ${activeTab === 'bank' ? 'active' : ''}`}
                onClick={() => setActiveTab('bank')}
              >
                Bank Transfer
              </button>
              <button 
                type="button" 
                className={`tab-btn ${activeTab === 'instapay' ? 'active' : ''}`}
                onClick={() => setActiveTab('instapay')}
              >
                InstaPay
              </button>
            </div>
          </div>

          <div className="billing-body">
            {/* Bank Card */}
            <div className={`bank-card ${activeTab === 'instapay' ? 'instapay-card' : ''}`}>
              <div className="bank-logo">{activeTab === 'bank' ? 'BDO' : 'InstaPay'}</div>
              <div className="bank-info">
                <p className="account-name">Venus Alinsod</p>
                <p className="account-number">{activeTab === 'bank' ? '004560025684' : '0917-847-4270'}</p>
              </div>
              {activeTab === 'instapay' && (
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setQrZoom(true)}
                    title="Click to enlarge"
                    style={{
                      background: '#fff',
                      border: '2px solid rgba(0,0,0,0.08)',
                      borderRadius: 14,
                      padding: 10,
                      width: 220,
                      height: 220,
                      cursor: 'zoom-in',
                      position: 'relative',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                    }}
                  >
                    <img
                      src="/instapay-qr.png"
                      alt="InstaPay QR"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        color: '#fff',
                        background: 'rgba(0,0,0,0.65)',
                        padding: '3px 8px',
                        borderRadius: 10,
                        letterSpacing: '0.3px',
                      }}
                    >
                      ⤢ Zoom
                    </span>
                  </button>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#8c7895', fontWeight: 600 }}>
                    Scan to donate via InstaPay
                  </p>
                </div>
              )}
            </div>

            {qrZoom && (
              <div
                onClick={() => setQrZoom(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.9)',
                  zIndex: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  cursor: 'zoom-out',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: 480,
                    background: '#fff',
                    borderRadius: 20,
                    padding: '1.5rem',
                    textAlign: 'center',
                  }}
                >
                  <img
                    src="/instapay-qr.png"
                    alt="InstaPay QR"
                    style={{ width: '100%', height: 'auto', maxHeight: '70vh', objectFit: 'contain' }}
                  />
                  <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: 700, color: '#444' }}>
                    InstaPay · Click anywhere to close
                  </p>
                </div>
              </div>
            )}

            <div className="billing-fields">
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#ad246d', marginBottom: '0.25rem' }}>Full Name *</label>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#8c7895' }}>Full Name matched from your profile</p>
                <input 
                  type="text" 
                  value={billingName}
                  readOnly 
                  className="form-input-premium"
                  style={{ width: '100%', background: '#f5f3f7', cursor: 'not-allowed', border: '2px solid #ead7e8', borderRadius: '12px', padding: '0.85rem 1rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#ad246d', marginBottom: '0.5rem' }}>Amount of Donation *</label>
                <input
                  type="text"
                  placeholder="Ex. 1,000.00"
                  value={amountNumber}
                  readOnly
                  className="form-input-premium"
                  style={{ width: '100%', background: '#f5f3f7', border: '2px solid #ead7e8', borderRadius: '12px', padding: '0.85rem 1rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#ad246d', marginBottom: '0.25rem' }}>Proof of Donation *</label>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#8c7895' }}>Upload 1 supported file: PDF, document, or image. Max 10 MB</p>
                <div className="file-upload-premium" style={{ 
                  border: '2px dashed #ead7e8', 
                  borderRadius: '12px', 
                  padding: '1.5rem', 
                  textAlign: 'center',
                  background: '#fdf7fb'
                }}>
                  <input 
                    type="file" 
                    id="proof-donation" 
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="proof-donation" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#ad246d' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span style={{ fontWeight: 700, color: '#4a3452' }}>{proofFile ? proofFile.name : 'Add File'}</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
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
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions monetary-actions">
          <button type="submit" className="donate-btn" disabled={isSubmitting}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span>{isSubmitting ? 'Processing...' : 'Donate it'}</span>
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
        message={`You are about to submit a donation of ${currency} ${amountNumber || customAmount}${isAnonymous ? ' (anonymously)' : ''}. Please ensure your proof of payment is correct before proceeding.`}
        confirmText="Yes, Submit Donation"
        isConfirming={isSubmitting}
      />
    </div>
  );
};

export default MonetaryDonation;
