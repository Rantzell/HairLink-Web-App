import React, { useState, useEffect } from 'react';
import '../styles/Admin.css';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';

const AdminVerification: React.FC = () => {
  const location = useLocation();
  const [view, setView] = useState<'donor' | 'recipient' | 'monetary'>('donor');
  const [data, setData] = useState<{
    donor: any[];
    recipient: any[];
    monetary: any[];
  }>({
    donor: [],
    recipient: [],
    monetary: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const v = params.get('view');
    if (v === 'donor' || v === 'recipient' || v === 'monetary') setView(v as any);
  }, [location.search]);

  useEffect(() => {
    const fetchAllQueues = async () => {
      try {
        const [donorRes, recipientRes, monetaryRes] = await Promise.all([
          apiClient.get('/internal-api/staff/donor-verification'),
          apiClient.get('/internal-api/staff/recipient-verification'),
          apiClient.get('/internal-api/staff/monetary-verification')
        ]);
        
        setData({
          donor: donorRes.data,
          recipient: recipientRes.data,
          monetary: monetaryRes.data
        });
      } catch (err) {
        console.error('Failed to fetch verification queues', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllQueues();
  }, []);

  if (loading) return <div className="section-wrap">Aggregating verification queues...</div>;

  const currentItems = data[view];

  return (
    <section className="section-wrap reveal active admin-page admin-page-pad">
      <header className="admin-header-row-end">
        <div>
          <p className="admin-page-kicker">Admin · Oversight</p>
          <h1 className="admin-page-title">Verification Oversight</h1>
          <p className="admin-page-subtitle">Monitor the status of donor and recipient verification queues.</p>
        </div>
      </header>

      {/* Queue Health Row */}
      <div className="admin-three-col-grid">
        <div className="admin-mini-stat">
          <small className="admin-mini-stat-label">Donor Pending</small>
          <strong className="admin-mini-stat-value">{data.donor.filter(i => i.status === 'Pending').length}</strong>
        </div>
        <div className="admin-mini-stat">
          <small className="admin-mini-stat-label">Recipient Pending</small>
          <strong className="admin-mini-stat-value">{data.recipient.filter(i => i.status === 'Pending').length}</strong>
        </div>
        <div className="admin-mini-stat">
          <small className="admin-mini-stat-label">Monetary Pending</small>
          <strong className="admin-mini-stat-value">{data.monetary.filter(i => i.status === 'Pending').length}</strong>
        </div>
      </div>

      <div className="admin-ops-card">
        <div className="admin-ops-card-header">
          <div className="admin-ops-icon-wrap">
            <i className={`bx ${view === 'donor' ? 'bx-cut' : view === 'recipient' ? 'bx-heart' : 'bx-donate-heart'} admin-stat-icon`}></i>
          </div>
          <h2 className="admin-ops-card-title">
            {view === 'donor' ? 'Hair Donation Verification Queue' : view === 'recipient' ? 'Recipient Request Verification Queue' : 'Monetary Contribution Verification Queue'}
          </h2>
        </div>

        {currentItems.length > 0 ? (
          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="admin-compact-table">
              <thead>
                <tr className="admin-compact-table-head-row">
                  <th className="admin-compact-th">Reference</th>
                  <th className="admin-compact-th">Submission Date</th>
                  <th className="admin-compact-th">User / Participant</th>
                  <th className="admin-compact-th">Verification Status</th>
                  <th className="admin-compact-th">Admin Note</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item: any) => (
                  <tr key={item.id} className="admin-compact-tr">
                    <td className="admin-compact-td"><strong>{item.reference || item.reference_number}</strong></td>
                    <td className="admin-compact-td admin-td-muted">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="admin-compact-td">{item.user ? `${item.user.firstName} ${item.user.lastName}` : (item.name || 'Anonymous')}</td>
                    <td className="admin-compact-td"><StatusPill status={item.status} /></td>
                    <td className="admin-compact-td admin-td-note">
                      {['verified', 'approved', 'completed', 'accepted'].includes(item.status?.toLowerCase()) 
                        ? `Verified on ${new Date(item.updatedAt).toLocaleDateString()}` 
                        : ['rejected', 'declined'].includes(item.status?.toLowerCase()) 
                          ? `Rejected on ${new Date(item.updatedAt).toLocaleDateString()}` 
                          : 'Awaiting staff review'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <i className="bx bx-check-shield admin-icon-faded"></i>
            <p className="admin-empty-title">Queue Clear</p>
            <p className="admin-empty-subtitle">No verification requests in this category.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminVerification;
