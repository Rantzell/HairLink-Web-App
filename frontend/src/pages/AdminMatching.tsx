import React, { useState, useEffect } from 'react';
import '../styles/Admin.css';
import apiClient from '../api/client';
import { calculateCompatibility } from './StaffMatching';
import PageLoader from '../components/PageLoader';

const AdminMatching: React.FC = () => {
  const [data, setData] = useState<{
    recipients: any[];
    wigs: any[];
  }>({
    recipients: [],
    wigs: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatching = async () => {
      try {
        const res = await apiClient.get('/internal-api/staff/rule-matching');
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch matching oversight data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatching();
  }, []);

  if (loading) return <PageLoader message="Loading matching oversight..." />;

  // Analysis Logic
  const pendingRequests = data.recipients.length;
  const availableWigs = data.wigs.length;
  
  // Find Perfect Matches (≥ 90%)
  const highMatchOpportunities = data.recipients.map(r => {
    const bestWig = data.wigs
      .map(w => ({ ...w, score: calculateCompatibility(r, w) }))
      .sort((a, b) => b.score - a.score)[0];
    return { recipient: r, bestWig, score: bestWig?.score || 0 };
  }).filter(o => o.score >= 90);

  return (
    <section className="section-wrap reveal active admin-page admin-page-pad">
      <header className="admin-header-row-end">
        <div>
          <p className="admin-page-kicker">Admin · Oversight</p>
          <h1 className="admin-page-title">Matching Oversight</h1>
          <p className="admin-page-subtitle">Audit the recipient waitlist and inventory allocation throughput.</p>
        </div>

        <div className="admin-live-badge">
          <span className="admin-live-dot"></span>
          <span className="admin-live-text">{pendingRequests} PENDING RECIPIENTS</span>
        </div>
      </header>

      {/* Allocation Metrics */}
      <div className="admin-three-col-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap">
            <i className="bx bx-user-voice admin-stat-icon"></i>
          </div>
          <div>
            <small className="admin-stat-label">WAITLIST SIZE</small>
            <strong className="admin-stat-value">{pendingRequests} Recipients</strong>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap">
            <i className="bx bx-shopping-bag admin-stat-icon"></i>
          </div>
          <div>
            <small className="admin-stat-label">UNALLOCATED WIGS</small>
            <strong className="admin-stat-value">{availableWigs} Available</strong>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap">
            <i className="bx bx-check-double admin-stat-icon"></i>
          </div>
          <div>
            <small className="admin-stat-label">PERFECT MATCHES</small>
            <strong className="admin-stat-value">{highMatchOpportunities.length} Ready</strong>
          </div>
        </div>
      </div>

      <div className="admin-two-col-grid-lg">
        {/* Left: Waitlist Audit */}
        <div className="admin-card-white">
          <h3 className="admin-table-section-title">
            <i className="bx bx-list-ul admin-icon-pink"></i> Recipient Waitlist Audit
          </h3>
          <table className="admin-compact-table">
            <thead>
              <tr className="admin-compact-table-head-row">
                <th className="admin-compact-th">Recipient</th>
                <th className="admin-compact-th">Spec Requested</th>
                <th className="admin-compact-th">Wait Time</th>
              </tr>
            </thead>
            <tbody>
              {data.recipients.map((r: any) => (
                <tr key={r.id} className="admin-compact-tr">
                  <td className="admin-compact-td"><strong>{r.user?.firstName} {r.user?.lastName}</strong></td>
                  <td className="admin-compact-td">{r.wigLength} / {r.wigColor}</td>
                  <td className="admin-compact-td admin-td-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.recipients.length === 0 && <p className="admin-compact-table-empty">Waitlist is empty.</p>}
        </div>

        {/* Right: High-Match Opportunities */}
        <div className="admin-card-white">
          <h3 className="admin-table-section-title">
            <i className="bx bx-sparkles admin-icon-pink"></i> Top Match Opportunities
          </h3>
          <div className="admin-form-grid">
            {highMatchOpportunities.map((o: any, idx: number) => (
              <div key={idx} className="admin-match-opportunity">
                <div>
                  <strong className="admin-match-name">{o.recipient.user?.firstName} {o.recipient.user?.lastName}</strong>
                  <small className="admin-match-meta">Matched with Stock #{o.bestWig.taskCode}</small>
                </div>
                <div className="admin-match-score-wrap">
                  <span className="admin-match-score">{o.score}%</span>
                  <small className="admin-match-score-label">COMPATIBILITY</small>
                </div>
              </div>
            ))}
            {highMatchOpportunities.length === 0 && (
              <div className="admin-match-empty">
                <p className="admin-match-empty-p">No high-match opportunities found.</p>
                <small>Available inventory does not yet perfectly meet waitlist specs.</small>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminMatching;
