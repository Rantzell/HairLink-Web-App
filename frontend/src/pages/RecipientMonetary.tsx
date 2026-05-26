import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/RecipientMonetary.css';

const RecipientMonetary: React.FC = () => {
  const { user: _user } = useAuth();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !reason) return;
    setShowConfirm(true);
  };

  const doSubmit = async () => {
    setShowConfirm(false);
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

      <div className="recipient-monetary-layout">
        <div className="module-card">
          <h3 className="module-card-title">Request Assistance</h3>
          <form onSubmit={handleSubmit} className="monetary-form">
            <div className="form-group">
              <label>Requested Amount (PHP)</label>
              <input 
                type="number" 
                placeholder="Enter amount needed" 
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                className="monetary-form-input"
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
                className="monetary-form-textarea"
              ></textarea>
            </div>

            <button type="submit" className="soft-btn monetary-submit-btn" disabled={isSubmitting || !amount || !reason}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>

        <div className="module-card sidebar-help">
          <h3 className="module-card-title-sm">Aid Guidelines</h3>
          <ul className="guidelines-list">
            <li>Assistance is subject to available community funds.</li>
            <li>Priority is given to transport and logistical needs for wig fitting.</li>
            <li>Approval typically takes 3-5 business days.</li>
          </ul>
          <div className="guidelines-note">
            <p>
              <i className='bx bxs-info-circle'></i> Ensure your profile is fully verified before applying.
            </p>
          </div>
        </div>
      </div>

      <div className="module-card module-card-mt">
        <h3 className="module-card-title">Aid History</h3>
        <div className="table-wrap">
          <table className="monetary-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Amount</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r: any) => (
                <tr key={r.id}>
                  <td>#{r.reference}</td>
                  <td>₱{r.amount.toLocaleString()}</td>
                  <td>{r.reason.substring(0, 40)}...</td>
                  <td>
                    <span className={`status-pill status-${r.status.toLowerCase()}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={4} className="monetary-table-empty">No aid requests found.</td>
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
        title="Submit Aid Request"
        message={`You are requesting ₱${Number(amount).toLocaleString()} in financial assistance. Our team will review your request. Proceed?`}
        confirmText="Yes, Submit Request"
        isConfirming={isSubmitting}
      />
    </section>
  );
};

export default RecipientMonetary;
