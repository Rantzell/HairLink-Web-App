import React, { useState, useEffect } from 'react';
import '../styles/Admin.css';
import apiClient from '../api/client';
import Pagination from '../components/Pagination';

interface AuditLog {
  id: number;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  description: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const ROLE_OPTIONS = [
  { value: 'all', label: 'All roles' },
  { value: 'donor', label: 'Donor' },
  { value: 'recipient', label: 'Recipient' },
  { value: 'staff', label: 'Staff' },
  { value: 'wigmaker', label: 'Wigmaker' },
  { value: 'admin', label: 'Admin' },
];

const ACTION_OPTIONS = [
  { value: 'all', label: 'All actions' },
  { value: 'auth.login', label: 'Login' },
  { value: 'auth.logout', label: 'Logout' },
  { value: 'request.status_changed', label: 'Request status changed' },
  { value: 'donation.status_changed', label: 'Donation status changed' },
  { value: 'staff.verification', label: 'Staff verification' },
  { value: 'staff.tracking_status_changed', label: 'Staff tracking update' },
  { value: 'staff.wigmaker_assigned', label: 'Wigmaker assigned' },
  { value: 'staff.wig_matched', label: 'Wig matched' },
  { value: 'wigmaker.task_updated', label: 'Wigmaker task update' },
  { value: 'admin.user_created', label: 'Admin created user' },
  { value: 'admin.user_updated', label: 'Admin updated user' },
  { value: 'admin.user_activated', label: 'Admin activated user' },
  { value: 'admin.user_deactivated', label: 'Admin deactivated user' },
];

const actionLabel = (action: string) =>
  ACTION_OPTIONS.find(a => a.value === action)?.label || action;

const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [action, setAction] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = async (page = currentPage) => {
    try {
      setLoading(true);
      const params: any = { page, pageSize: 25 };
      if (search) params.search = search;
      if (role !== 'all') params.role = role;
      if (action !== 'all') params.action = action;
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await apiClient.get('/internal-api/admin/audit-logs', { params });
      setLogs(res.data.logs || []);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced refetch on filter changes (resets to page 1).
  useEffect(() => {
    setCurrentPage(1);
    const timer = setTimeout(() => fetchLogs(1), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, role, action, from, to]);

  useEffect(() => {
    fetchLogs(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  return (
    <section className="admin-page">
      <header className="admin-report-header-row">
        <div>
          <p className="admin-page-kicker">Admin · System</p>
          <h1 className="admin-page-title">Audit Logs</h1>
          <p className="admin-page-subtitle">
            Activity trail of key actions across all roles — donors, recipients, staff, and wigmakers.
          </p>
        </div>
      </header>

      <article className="admin-card admin-card-white">
        <div className="admin-bar admin-bar">
          <h2 className="admin-bar-title">
            <i className="bx bx-history admin-icon-pink"></i> Activity Trail
            <span style={{ fontWeight: 400, color: '#8c7895', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
              ({total} entrie{total === 1 ? '' : 's'})
            </span>
          </h2>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            alignItems: 'flex-end',
          }}
        >
          <div className="admin-search-wrapper" style={{ position: 'relative', flex: '1 1 220px' }}>
            <i
              className="bx bx-search admin-search-icon"
              style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#ad246d', zIndex: 1 }}
            ></i>
            <input
              type="text"
              placeholder="Search actor, description, reference..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="admin-filter-input"
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>
          <select value={role} onChange={e => setRole(e.target.value)} className="admin-filter-input">
            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={action} onChange={e => setAction(e.target.value)} className="admin-filter-input">
            {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.7rem', color: '#8c7895' }}>
            From
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="admin-filter-input" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.7rem', color: '#8c7895' }}>
            To
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="admin-filter-input" />
          </label>
        </div>

        <div className="table-wrap">
          {loading && (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#8c7895', fontSize: '0.85rem' }}>
              <i className="bx bx-loader-alt bx-spin" style={{ marginRight: '6px' }}></i>Loading...
            </div>
          )}
          <table className="admin-table">
            <thead>
              <tr>
                <th className="admin-compact-th">Time</th>
                <th className="admin-compact-th">Actor</th>
                <th className="admin-compact-th">Role</th>
                <th className="admin-compact-th">Action</th>
                <th className="admin-compact-th">Details</th>
                <th className="admin-compact-th">Target</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#8c7895', fontSize: '0.85rem' }}>
                    No audit entries found.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id}>
                    <td className="admin-compact-td" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="admin-compact-td"><strong>{log.actorName || 'System'}</strong></td>
                    <td className="admin-compact-td">
                      {log.actorRole
                        ? <span className={`role-badge ${log.actorRole} admin-chip-sm`}>{log.actorRole.toUpperCase()}</span>
                        : '—'}
                    </td>
                    <td className="admin-compact-td">
                      <span className="admin-chip admin-chip-sm">{actionLabel(log.action)}</span>
                    </td>
                    <td className="admin-compact-td">{log.description || '—'}</td>
                    <td className="admin-compact-td">
                      {log.targetId
                        ? <span>{log.targetType ? `${log.targetType}: ` : ''}{log.targetId}</span>
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </article>
    </section>
  );
};

export default AdminAuditLogs;
