import React, { useState, useEffect } from 'react';
import '../styles/Admin.css';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';
import LoadingScreen from '../components/LoadingScreen';

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const res = await apiClient.get('/internal-api/admin/dashboard');
        setData(res.data);
      } catch (err: any) {
        console.error('Failed to fetch admin dashboard', err);
        setData({ error: true, message: err.response?.data?.message || err.message });
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  if (loading) return <LoadingScreen />;
  if (loading) return <LoadingScreen />;
  if (!data || data.error) return (
    <div className="section-wrap">
      <div className="admin-error-card">
        <i className="bx bx-error-circle admin-error-icon"></i>
        <h2 className="admin-error-title">Dashboard Load Error</h2>
        <p className="admin-error-desc">
          {data?.message || 'Could not load dashboard analytics. Please try again later.'}
        </p>
        <button onClick={() => window.location.reload()} className="admin-btn-primary">
          Retry Loading
        </button>
      </div>
    </div>
  );

  return (
    <section className="section-wrap reveal active admin-page admin-page-pad">
      <header className="admin-hero admin-surface admin-hero-header">
        <div className="admin-hero-copy">
          <p className="admin-kicker admin-page-kicker">Administrative Oversight</p>
          <h1 className="admin-hero-title">System Overview</h1>
          <p className="admin-hero-desc">Monitor operational flow, staff activity, and system health across all modules.</p>
        </div>

        <aside className="admin-hero-side admin-hero-side">
          <div className="admin-hero-badge admin-hero-badge">
            <i className='bx bxs-bar-chart-alt-2'></i>
            <span>Oversight Mode</span>
          </div>
          <div className="admin-hero-summary admin-hero-summary">
            <div className="admin-hero-info">
              <strong className="admin-hero-activity-label">RECENT STAFF ACTIVITY</strong>
              <span className="admin-hero-activity-value">{data.pendingVerifications} entries verified today</span>
            </div>
            <Link to="/admin/reports" className="admin-focus-link">
              View Full Logs
            </Link>
          </div>
        </aside>
      </header>

      <section className="admin-stat-grid admin-stat-grid-auto">
        <article className="quick-stat admin-page-pad">
          <small className="admin-stat-sm-label">Global Submissions</small>
          <h2 className="admin-stat-number">{data.donationsCount}</h2>
          <p className="admin-stat-desc">System-wide total</p>
        </article>
        <article className="quick-stat admin-page-pad">
          <small className="admin-stat-sm-label">Total System Users</small>
          <h2 className="admin-stat-number">{data.usersCount}</h2>
          <p className="admin-stat-desc">Across all categories</p>
        </article>
        <article className="quick-stat admin-page-pad">
          <small className="admin-stat-sm-label">Recipient Fulfillment</small>
          <h2 className="admin-stat-number">{data.requestsCount}</h2>
          <p className="admin-stat-desc">Requests processed</p>
        </article>
        <article className="quick-stat admin-page-pad">
          <small className="admin-stat-sm-label">Staff Output</small>
          <h2 className="admin-stat-number">{data.pendingVerifications}</h2>
          <p className="admin-stat-desc">Approvals this week</p>
        </article>
      </section>

      <div className="admin-toolbar admin-surface admin-toolbar-surface">
        <div className="admin-toolbar-copy">
          <h2 className="admin-toolbar-title">Oversight Shortcuts</h2>
        </div>
        <div className="admin-quick-actions admin-quick-links">
          <Link to="/admin/reports" className="admin-quick-link-btn"><i className='bx bx-history'></i> Approval Logs</Link>
          <Link to="/admin/matching" className="admin-quick-link-btn"><i className='bx bx-list-ul'></i> Matching Logs</Link>
          <Link to="/admin/inventory" className="admin-quick-link-btn"><i className='bx bx-package'></i> Stock Status</Link>
          <Link to="/admin/operations" className="admin-quick-link-btn"><i className='bx bx-line-chart'></i> Operational Logs</Link>
        </div>
      </div>

      <section className="admin-priority-grid admin-priority-grid">
        <article className="admin-focus-card admin-focus-card">
          <div className="admin-focus-head admin-focus-head">
            <div>
              <p className="admin-section-kicker">OPERATIONAL LOGS</p>
              <h2 className="admin-section-title"><i className='bx bx-transfer-alt'></i> Recent Donors</h2>
            </div>
            <Link to="/admin/reports" className="admin-focus-link">View summary</Link>
          </div>
          <div className="admin-queue-list">
            {data.recentDonations.map((d: any) => (
              <div key={d.id} className="admin-queue-item admin-queue-item">
                <div>
                  <strong className="admin-td-text">{d.reference} · {d.user?.firstName}</strong>
                  <p className="admin-queue-meta">{d.hairLength} · {d.hairColor} · Staff: {d.status}</p>
                </div>
                <StatusPill status={d.status} />
              </div>
            ))}
          </div>
        </article>

        <article className="admin-focus-card admin-focus-card">
          <div className="admin-focus-head admin-focus-head">
            <div>
              <p className="admin-section-kicker">OPERATIONAL LOGS</p>
              <h2 className="admin-section-title"><i className='bx bx-user-check'></i> Recipient Activity</h2>
            </div>
            <Link to="/admin/matching" className="admin-focus-link">View summary</Link>
          </div>
          <div className="admin-queue-list">
            {data.recentRequests.map((r: any) => (
              <div key={r.id} className="admin-queue-item admin-queue-item">
                <div>
                  <strong className="admin-td-text">{r.reference} · {r.user?.firstName}</strong>
                  <p className="admin-queue-meta">Status: {r.status} · Processed: {new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <StatusPill status={r.status} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <article className="admin-card admin-module-panel admin-card-module">
        <div className="admin-section-head-mb">
          <p className="admin-section-kicker">SYSTEM WORKSPACE</p>
          <h2 className="admin-section-title"><i className='bx bxs-dashboard'></i> Oversight Modules</h2>
        </div>
        <div className="admin-actions admin-auto-grid">
          {[
            { to: '/admin/users', icon: 'bx-group', title: 'User Oversight', desc: 'Monitor system account roles.' },
            { to: '/admin/verification/donor', icon: 'bx-history', title: 'Approval Logs', desc: 'Review staff verification history.' },
            { to: '/admin/matching', icon: 'bx-list-ul', title: 'Matching Records', desc: 'Track wig-to-recipient results.' },
            { to: '/admin/operations', icon: 'bx-line-chart', title: 'Operation Tracking', desc: 'Monitor production flow logs.' },
            { to: '/admin/inventory', icon: 'bx-package', title: 'Inventory Oversight', desc: 'Track global stock movements.' },
            { to: '/admin/reports', icon: 'bx-bar-chart', title: 'Full Reports', desc: 'Generate system-wide analytics.' },
            { to: '/admin/events', icon: 'bx-calendar-event', title: 'CMS Monitor', desc: 'Track announcements and events.' },
            { to: '/admin/community', icon: 'bxs-megaphone', title: 'Forum Oversight', desc: 'Monitor community engagement.' },
          ].map((item, i) => (
            <Link key={i} to={item.to} className="admin-action-link admin-action-link-card">
              <div className="admin-action-link-icon"><i className={`bx ${item.icon}`}></i></div>
              <div>
                <h3 className="admin-action-link-title">{item.title}</h3>
                <p className="admin-action-link-desc">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </article>
    </section>
  );
};

export default AdminDashboard;
