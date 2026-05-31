import React, { useState, useEffect } from 'react';
import '../styles/Admin.css';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;

const AdminOperations: React.FC = () => {
  const location = useLocation();
  const [view, setView] = useState<'production' | 'distribution'>('production');
  const [opsPage, setOpsPage] = useState(1);
  const [data, setData] = useState<{
    donations: any[];
    requests: any[];
    wigProductions: any[];
    stats: any;
  }>({
    donations: [],
    requests: [],
    wigProductions: [],
    stats: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const v = params.get('view');
    if (v === 'production' || v === 'distribution') setView(v);
    setOpsPage(1);
  }, [location.search]);

  useEffect(() => { setOpsPage(1); }, [view]);

  useEffect(() => {
    const fetchOps = async () => {
      try {
        const [trackingRes, opsRes] = await Promise.all([
          apiClient.get('/internal-api/staff/realtime-tracking'),
          apiClient.get('/internal-api/admin/operations')
        ]);
        
        setData({
          donations: trackingRes.data.donations,
          requests: trackingRes.data.requests,
          wigProductions: Object.values(trackingRes.data.wigProductions),
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

  const opsRows = view === 'production' ? data.donations : data.requests;
  const opsTotalPages = Math.ceil(opsRows.length / PAGE_SIZE);
  const opsPagedRows = opsRows.slice((opsPage - 1) * PAGE_SIZE, opsPage * PAGE_SIZE);

  return (
    <section className="section-wrap reveal active admin-page admin-page-pad">
      <header className="admin-header-row-end">
        <div>
          <p className="admin-page-kicker">Admin · Oversight</p>
          <h1 className="admin-page-title">Operational Command</h1>
          <p className="admin-page-subtitle">Monitor real-time system throughput and workflow status.</p>
        </div>
      </header>

      {/* Oversight Stats Row */}
      <div className="admin-ops-stat-grid">
        <div className="admin-mini-stat">
          <small className="admin-mini-stat-label">In Production</small>
          <strong className="admin-mini-stat-value">{data.stats?.activeWigTasks || 0}</strong>
        </div>
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
            <i className={`admin-stat-icon ${`bx ${view === 'production' ? 'bxs-cog' : 'bxs-truck'}`}`}></i>
          </div>
          <h2 className="admin-ops-card-title">
            {view === 'production' ? 'Active Production Timeline' : 'Active Distribution & Delivery Log'}
          </h2>
        </div>

        <table className="admin-compact-table">
          <thead>
            <tr className="admin-compact-table-head-row">
              <th className="admin-compact-th">Reference / ID</th>
              <th className="admin-compact-th">{view === 'production' ? 'Donor' : 'Recipient'}</th>
              <th className="admin-compact-th">Current Status</th>
              <th className="admin-compact-th">{view === 'production' ? 'Processing Stage' : 'Delivery Info'}</th>
              <th className="admin-compact-th">Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {opsPagedRows.map((row: any) => view === 'production' ? (
              <tr key={row.id} className="admin-compact-tr">
                <td className="admin-compact-td"><strong>{row.reference}</strong><br/><small className="admin-match-meta">Hair Batch</small></td>
                <td className="admin-compact-td">{row.user?.firstName} {row.user?.lastName}</td>
                <td className="admin-compact-td"><span className="admin-status-pill">{row.status}</span></td>
                <td className="admin-compact-td">{row.status === 'In Progress' ? 'Wigmaker Partner' : 'System Inventory'}</td>
                <td className="admin-compact-td admin-td-muted">{new Date(row.updatedAt).toLocaleDateString()}</td>
              </tr>
            ) : (
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
        <Pagination currentPage={opsPage} totalPages={opsTotalPages} onPageChange={setOpsPage} />

        {opsRows.length === 0 && (
          <div className="admin-empty-state">
            <i className={`admin-icon-faded bx ${view === 'production' ? 'bx-layer' : 'bx-package'}`}></i>
            <p className="admin-empty-title">
              {view === 'production' ? 'No Active Hair Batches in Production' : 'No Active Wig Deliveries in Progress'}
            </p>
            <p className="admin-empty-subtitle">
              {view === 'production' ? 'New production logs will appear here once hair is received.' : 'Distribution logs will appear here once wigs are matched.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminOperations;
