import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const DonorMonetary: React.FC = () => {
  const { user: _user } = useAuth();
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('Wig Production');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [donations, setDonations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const fetchHistory = async () => {
    try {
      const res = await apiClient.get('/internal-api/monetary');
      const rows: any[] = Array.isArray(res.data) ? res.data : [];
      setDonations(rows);
      setTotal(
        rows
          .filter((d) => d.status === 'Completed')
          .reduce((sum, d) => sum + Number(d.amount || 0), 0),
      );
    } catch (err) {
      console.error('Failed to fetch monetary history', err);
    }
  };

  useEffect(() => {
    fetchHistory();

    // Handle the redirect back from Xendit's hosted checkout.
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status === 'success') {
      toast.success('Payment received! Thank you for your generous donation.');
    } else if (status === 'failed') {
      toast.error('Payment was not completed. You can try again anytime.');
    }
    if (status) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) < 10) return;
    setShowConfirm(true);
  };

  const doSubmit = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/internal-api/monetary/create-invoice', {
        amount: Number(amount),
        purpose,
      });
      if (res.data?.invoiceUrl) {
        // Redirect to Xendit's secure hosted checkout.
        window.location.href = res.data.invoiceUrl;
      } else {
        toast.error('Could not start payment. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Submission failed', err);
      toast.error('Failed to start payment. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section-wrap reveal active donor-module-page">
      <div className="module-head">
        <h1>Financial Contribution</h1>
        <p>Support our mission to provide wigs for cancer warriors through monetary donations.</p>
      </div>

      <div className="summary-grid">
        <div className="module-card">
          <div className="summary-item">
            <small>Total Donated</small>
            <strong>₱{total.toLocaleString()}</strong>
          </div>
        </div>
        <div className="module-card">
          <div className="summary-item">
            <small>Donations</small>
            <strong>{donations.filter((d) => d.status === 'Completed').length}</strong>
          </div>
        </div>
      </div>

      <div className="guidelines-actions-container" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div className="module-card">
          <h3 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Donate Funds</h3>
          <form onSubmit={handleSubmit} className="form-shell" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div className="form-group">
              <label>Donation Amount (PHP)</label>
              <input
                type="number"
                min={10}
                placeholder="Enter amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                className="form-input-premium"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ead7e8' }}
              />
            </div>

            <div className="form-group">
              <label>Purpose</label>
              <select
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                className="form-input-premium"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ead7e8' }}
              >
                <option>Wig Production</option>
                <option>Logistics & Shipping</option>
                <option>Operational Support</option>
                <option>General Fund</option>
              </select>
            </div>

            <div style={{ padding: '1rem', background: '#fdf7fb', borderRadius: '12px', border: '1px solid #f2ebf4' }}>
              <small style={{ color: '#8c7895', display: 'block', lineHeight: 1.5 }}>
                <i className='bx bxs-lock-alt'></i> You'll be redirected to our secure payment partner (Xendit) to
                pay via GCash, card, or online banking. No screenshots needed — your donation is confirmed automatically.
              </small>
            </div>

            <button type="submit" className="soft-btn" disabled={isSubmitting || !amount || Number(amount) < 10} style={{ marginTop: '1rem', width: '100%' }}>
              {isSubmitting ? 'Redirecting to payment…' : 'Donate Securely'}
            </button>
          </form>
        </div>

        <div className="module-card sidebar-help">
          <h3 style={{ marginBottom: '1rem', fontWeight: 800 }}>Why Donate?</h3>
          <ul style={{ paddingLeft: '1.2rem', color: '#665772', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <li style={{ marginBottom: '0.8rem' }}><strong>₱500</strong> covers the specialized shipping cost for one wig.</li>
            <li style={{ marginBottom: '0.8rem' }}><strong>₱1,500</strong> funds the materials needed for a full custom wig.</li>
            <li style={{ marginBottom: '0.8rem' }}><strong>₱3,000</strong> supports a complete wig-making workshop for our partners.</li>
          </ul>
        </div>
      </div>

      <div className="module-card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Donation History</h3>
        <div className="table-wrap">
          <table className="tracking-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #f2ebf4' }}>
                <th style={{ padding: '1rem' }}>Reference</th>
                <th style={{ padding: '1rem' }}>Amount</th>
                <th style={{ padding: '1rem' }}>Date</th>
                <th style={{ padding: '1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d: any) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f2ebf4' }}>
                  <td style={{ padding: '1rem' }}>#{d.reference}</td>
                  <td style={{ padding: '1rem' }}>₱{Number(d.amount).toLocaleString()}</td>
                  <td style={{ padding: '1rem' }}>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`status-pill status-${String(d.status).toLowerCase()}`}>{d.status}</span>
                  </td>
                </tr>
              ))}
              {donations.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#8c7895' }}>No donations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={doSubmit}
        title="Confirm Monetary Donation"
        message={`You are about to donate ₱${Number(amount).toLocaleString()} via our secure payment partner. You'll be redirected to complete payment. Proceed?`}
        confirmText="Proceed to Payment"
        isConfirming={isSubmitting}
      />
    </section>
  );
};

export default DonorMonetary;
