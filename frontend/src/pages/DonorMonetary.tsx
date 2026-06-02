import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const DonorMonetary: React.FC = () => {
  const { user: _user } = useAuth();
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('Wig Production');
  const [proof, setProof] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [donations, setDonations] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, points: 0 });

  const fetchHistory = async () => {
    try {
      const res = await apiClient.get('/internal-api/donor/monetary');
      setDonations(res.data.history || []);
      setStats({
        total: res.data.total_donated || 0,
        points: res.data.total_points || 0
      });
    } catch (err) {
      console.error('Failed to fetch monetary history', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !proof) return;
    setShowConfirm(true);
  };

  const doSubmit = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('amount', amount);
    formData.append('purpose', purpose);
    formData.append('proof', proof!);

    try {
      await apiClient.post('/internal-api/donor/monetary', formData);
      toast.success('Financial donation submitted for verification! Thank you for your support.');
      setAmount('');
      setProof(null);
      fetchHistory();
    } catch (err) {
      console.error('Submission failed', err);
      toast.error('Failed to submit donation. Please try again.');
    } finally {
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
            <strong>₱{stats.total.toLocaleString()}</strong>
          </div>
        </div>
        <div className="module-card">
          <div className="summary-item">
            <small>Reward Points</small>
            <strong>{stats.points} pts</strong>
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

            <div className="form-group">
              <label>Proof of Payment (Screenshot)</label>
              <input 
                type="file" 
                onChange={e => setProof(e.target.files?.[0] || null)}
                required
                accept="image/*"
                style={{ display: 'block', marginTop: '0.5rem' }}
              />
              <small style={{ color: '#8c7895', marginTop: '0.4rem', display: 'block' }}>
                Please send your donation via GCash (0912-345-6789) or Bank (BPI: 1234-5678-90) and upload the receipt.
              </small>
            </div>

            <button type="submit" className="soft-btn" disabled={isSubmitting || !amount || !proof} style={{ marginTop: '1rem', width: '100%' }}>
              {isSubmitting ? 'Submitting...' : 'Confirm Donation'}
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
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fdf7fb', borderRadius: '12px', border: '1px solid #f2ebf4' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#ad246d' }}>
              <i className='bx bxs-gift'></i> You earn 1 point for every ₱10 donated!
            </p>
          </div>
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
                  <td style={{ padding: '1rem' }}>₱{d.amount.toLocaleString()}</td>
                  <td style={{ padding: '1rem' }}>{new Date(d.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`status-pill status-${d.status.toLowerCase()}`}>{d.status}</span>
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
        message={`You are about to submit a donation of ₱${Number(amount).toLocaleString()}. This will be reviewed by our team. Proceed?`}
        confirmText="Yes, Submit Donation"
        isConfirming={isSubmitting}
      />
    </section>
  );
};

export default DonorMonetary;
