import React, { useState, useEffect } from 'react';
import '../styles/Admin.css';
import apiClient from '../api/client';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;

const AdminOperations: React.FC = () => {
  const [opsPage, setOpsPage] = useState(1);
  const [data, setData] = useState<{
    requests: any[];
    stats: any;
  }>({
    requests: [],
    stats: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOps = async () => {
      try {
        const [trackingRes, opsRes] = await Promise.all([
          apiClient.get('/internal-api/staff/realtime-tracking'),
          apiClient.get('/internal-api/admin/operations')
        ]);

        setData({
          requests: trackingRes.data.requests,
          stats: opsRes.data
        });
      } catch (err: any) {
        console.error('Failed to fetch operational data', err);
        setError(err.response?.data?.message || 'Could not load operational tracking. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };
    fetchOps();
  }, []);

  if (loading) return <div className="section-wrap">Loading operational oversight...</div>;
  if (error) return <div className="section-wrap">Error: {error}</div>;
  if (!data || !data.stats) return <div className="section-wrap">Error: Could not load operational tracking. Please check your connection.</div>;

  const opsRows = data.requests;
  const opsTotalPages = Math.ceil(opsRows.length / PAGE_SIZE);
  const opsPagedRows = opsRows.slice((opsPage - 1) * PAGE_SIZE, opsPage * PAGE_SIZE);

  return (
    <section className="section-wrap reveal active admin-page admin-page-pad">
      <header className="admin-header-row-end">
        <div>
          <p className="admin-page-kicker">Admin · Oversight</p>
          <h1 className="admin-page-title">Operational Command</h1>
          <p className="admin-page-subtitle">Monitor distribution throughput and delivery workflow status.</p>
        </div>
      </header>

      <div className="admin-ops-stat-grid">
        <div className="admin-mini-stat">
          <small className="admin-mini-stat-label">Ready for Match</small>
          <strong className="admin-mini-stat-value">{data.stats?.pendingRequestsCount || 0}</strong>
        </div>
        <div className="admin-mini-stat">
          <small className="admin-mini-stat-label">In Transit</small>
          <strong className="admin-mini-stat-value">{data.stats?.transitCount || 0}</strong>
        </div>
        <div className="admin-mini-stat">
          <small className="admin-mini-stat-label">Active Wigmakers</small>
          <strong className="admin-mini-stat-value">{data.stats?.activeWigmakers || 0}</strong>
        </div>
      </div>

      <div className="admin-ops-card">
        <div className="admin-ops-card-header">
          <div className="admin-ops-icon-wrap">
            <i className="admin-stat-icon bx bxs-truck"></i>
          </div>
          <h2 className="admin-ops-card-title">Active Distribution &amp; Delivery Log</h2>
        </div>

        {opsRows.length > 0 ? (
          <>
            <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="admin-compact-table">
                <thead>
                  <tr className="admin-compact-table-head-row">
                    <th className="admin-compact-th">Reference / ID</th>
                    <th className="admin-compact-th">Recipient</th>
                    <th className="admin-compact-th">Current Status</th>
                    <th className="admin-compact-th">Delivery Info</th>
                    <th className="admin-compact-th">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {opsPagedRows.map((row: any) => (
                    <tr key={row.id} className="admin-compact-tr">
                      <td className="admin-compact-td"><strong>{row.reference}</strong><br/><small className="admin-match-meta">Wig Request</small></td>
                      <td className="admin-compact-td">{row.user?.firstName} {row.user?.lastName}</td>
                      <td className="admin-compact-td"><span className="admin-status-pill">{row.status}</span></td>
                      <td className="admin-compact-td">{row.status === 'In Transit' ? 'Out for Delivery' : 'In Fulfillment'}</td>
                      <td className="admin-compact-td admin-td-muted">{new Date(row.updatedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={opsPage} totalPages={opsTotalPages} onPageChange={setOpsPage} />
          </>
        ) : (
          <div className="admin-empty-state">
            <i className="admin-icon-faded bx bx-package"></i>
            <p className="admin-empty-title">No Active Wig Deliveries in Progress</p>
            <p className="admin-empty-subtitle">Distribution logs will appear here once wigs are matched.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminOperations;
