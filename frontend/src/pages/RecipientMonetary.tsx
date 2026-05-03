import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const RecipientMonetary: React.FC = () => {
  const { user: _user } = useAuth();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({ approved: 0, pending: 0 });

  const fetchHistory = async () => {
    try {
      const res = await apiClient.get('/internal-api/recipient/monetary');
      setRequests(res.data.history || []);
      setStats({
        approved: res.data.approved_aid || 0,
        pending: res.data.pending_aid || 0
      });
    } catch (err) {
      console.error('Failed to fetch monetary aid history', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !reason) return;

    setIsSubmitting(true);
    try {
      await apiClient.post('/internal-api/recipient/monetary', { amount, reason });
      alert('Your request for financial assistance has been submitted. Our team will review it shortly.');
      setAmount('');
      setReason('');
      fetchHistory();
    } catch (err) {
      console.error('Submission failed', err);
      alert('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section-wrap reveal active donor-module-page">
      <div className="module-head">
        <h1>Financial Assistance</h1>
        <p>Apply for medical or logistics aid to support your journey with HairLink.</p>
      </div>

      <div className="summary-grid">
        <div className="module-card">
          <div className="summary-item">
            <small>Approved Aid</small>
            <strong>₱{stats.approved.toLocaleString()}</strong>
          </div>
        </div>
        <div className="module-card">
          <div className="summary-item">
            <small>Pending Aid</small>
            <strong>₱{stats.pending.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      <div className="guidelines-actions-container" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div className="module-card">
          <h3 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Request Assistance</h3>
          <form onSubmit={handleSubmit} className="form-shell" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div className="form-group">
              <label>Requested Amount (PHP)</label>
              <input 
                type="number" 
                placeholder="Enter amount needed" 
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                className="form-input-premium"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ead7e8' }}
              />
            </div>

            <div className="form-group">
              <label>Reason for Assistance</label>
              <textarea 
                placeholder="Briefly explain how this aid will help you (e.g., Hospital transportation, Medical fees)" 
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                rows={4}
                className="form-input-premium"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ead7e8', resize: 'none' }}
              ></textarea>
            </div>

            <button type="submit" className="soft-btn" disabled={isSubmitting || !amount || !reason} style={{ marginTop: '1rem', width: '100%' }}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>

        <div className="module-card sidebar-help">
          <h3 style={{ marginBottom: '1rem', fontWeight: 800 }}>Aid Guidelines</h3>
          <ul style={{ paddingLeft: '1.2rem', color: '#665772', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <li style={{ marginBottom: '0.8rem' }}>Assistance is subject to available community funds.</li>
            <li style={{ marginBottom: '0.8rem' }}>Priority is given to transport and logistical needs for wig fitting.</li>
            <li style={{ marginBottom: '0.8rem' }}>Approval typically takes 3-5 business days.</li>
          </ul>
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fdf7fb', borderRadius: '12px', border: '1px solid #f2ebf4' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#ad246d' }}>
              <i className='bx bxs-info-circle'></i> Ensure your profile is fully verified before applying.
            </p>
          </div>
        </div>
      </div>

      <div className="module-card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Aid History</h3>
        <div className="table-wrap">
          <table className="tracking-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #f2ebf4' }}>
                <th style={{ padding: '1rem' }}>Reference</th>
                <th style={{ padding: '1rem' }}>Amount</th>
                <th style={{ padding: '1rem' }}>Reason</th>
                <th style={{ padding: '1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r: any) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f2ebf4' }}>
                  <td style={{ padding: '1rem' }}>#{r.reference}</td>
                  <td style={{ padding: '1rem' }}>₱{r.amount.toLocaleString()}</td>
                  <td style={{ padding: '1rem' }}>{r.reason.substring(0, 40)}...</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`status-pill status-${r.status.toLowerCase()}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#8c7895' }}>No aid requests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default RecipientMonetary;
