import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const res = await apiClient.get('/internal-api/admin/dashboard');
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch admin dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  if (loading) return <div className="section-wrap">Loading admin workspace...</div>;

  return (
    <section className="section-wrap reveal active admin-page">
      <header className="admin-hero admin-surface" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '24px', padding: '2.5rem', display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div className="admin-hero-copy">
          <p className="admin-kicker" style={{ color: '#ad246d', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Administrative Dashboard</p>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>Admin Overview</h1>
          <p style={{ color: '#8c7895', maxWidth: '500px' }}>Monitor donor and recipient workflows, approvals, and operational activity from one clear workspace.</p>
        </div>

        <aside className="admin-hero-side" style={{ textAlign: 'right' }}>
          <div className="admin-hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#fdf2f8', color: '#ad246d', padding: '0.5rem 1rem', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem' }}>
            <i className='bx bxs-shield-alt-2'></i>
            <span>Admin View</span>
          </div>
          <div className="admin-hero-summary" style={{ marginTop: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ display: 'block' }}>Next priority</strong>
              <span style={{ fontSize: '0.9rem', color: '#8c7895' }}>{data.pendingVerifications} records awaiting review</span>
            </div>
            <Link className="soft-btn" to="/admin/verification/donor" style={{ padding: '0.8rem 1.5rem' }}>
              <i className='bx bx-right-arrow-alt'></i> Open Review Queue
            </Link>
          </div>
        </aside>
      </header>

      <section className="admin-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <article className="quick-stat">
          <small>Donor Submissions</small>
          <h2>{data.donationsCount}</h2>
          <p>Total recorded</p>
        </article>
        <article className="quick-stat">
          <small>Registered Users</small>
          <h2>{data.usersCount}</h2>
          <p>Across all roles</p>
        </article>
        <article className="quick-stat">
          <small>Recipient Requests</small>
          <h2>{data.requestsCount}</h2>
          <p>From portal</p>
        </article>
        <article className="quick-stat">
          <small>Pending Review</small>
          <h2>{data.pendingVerifications}</h2>
          <p>Immediate decision</p>
        </article>
      </section>

      <div className="admin-toolbar admin-surface" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div className="admin-toolbar-copy">
          <h2 style={{ margin: 0 }}>Quick Actions</h2>
          <p style={{ margin: 0, color: '#8c7895', fontSize: '0.9rem' }}>Most common tasks at your fingertips.</p>
        </div>
        <div className="admin-quick-actions" style={{ display: 'flex', gap: '0.8rem' }}>
          <Link className="ghost-btn" to="/admin/verification/donor"><i className='bx bx-check-shield'></i> Verification</Link>
          <Link className="ghost-btn" to="/admin/matching"><i className='bx bx-sort-alt-2'></i> Matching</Link>
          <Link className="ghost-btn" to="/admin/inventory"><i className='bx bx-cube'></i> Inventory</Link>
          <Link className="ghost-btn" to="/admin/operations"><i className='bx bx-pulse'></i> Operations</Link>
        </div>
      </div>

      <section className="admin-priority-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <article className="admin-focus-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', padding: '1.5rem' }}>
          <div className="admin-focus-head" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: '#ad246d' }}>PRIORITY QUEUE</p>
              <h2 style={{ margin: 0 }}><i className='bx bx-transfer-alt'></i> Donor Hair</h2>
            </div>
            <Link to="/admin/verification/donor" style={{ color: '#ad246d', fontWeight: 800 }}>View all</Link>
          </div>
          <div className="admin-queue-list">
            {data.recentDonations.map((d: any) => (
              <div key={d.id} className="admin-queue-item" style={{ padding: '1rem', borderBottom: '1px solid #f2ebf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{d.reference} · {d.user?.firstName}</strong>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#8c7895' }}>{d.hairLength} · {d.hairColor} · {new Date(d.createdAt).toLocaleDateString()}</p>
                </div>
                <StatusPill status={d.status} />
              </div>
            ))}
          </div>
        </article>

        <article className="admin-focus-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', padding: '1.5rem' }}>
          <div className="admin-focus-head" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: '#ad246d' }}>PRIORITY QUEUE</p>
              <h2 style={{ margin: 0 }}><i className='bx bx-user-check'></i> Recipient Requests</h2>
            </div>
            <Link to="/admin/matching" style={{ color: '#ad246d', fontWeight: 800 }}>View all</Link>
          </div>
          <div className="admin-queue-list">
            {data.recentRequests.map((r: any) => (
              <div key={r.id} className="admin-queue-item" style={{ padding: '1rem', borderBottom: '1px solid #f2ebf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{r.reference} · {r.user?.firstName}</strong>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#8c7895' }}>Request submitted {new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <StatusPill status={r.status} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <article className="admin-card admin-module-panel" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '24px', padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: '#ad246d' }}>WORKSPACE</p>
          <h2 style={{ margin: 0 }}><i className='bx bxs-dashboard'></i> Module Access</h2>
        </div>
        <div className="admin-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {[
            { to: '/admin/users', icon: 'bx-group', title: 'User Management', desc: 'Manage donors, recipients, staff, and wigmakers.' },
            { to: '/admin/verification/donor', icon: 'bx-check-shield', title: 'Verification Oversight', desc: 'Review donor and recipient approval queues.' },
            { to: '/admin/matching', icon: 'bx-sort-alt-2', title: 'Matching Oversight', desc: 'Track allocation readiness and final matching.' },
            { to: '/admin/operations', icon: 'bx-pulse', title: 'Operations Overview', desc: 'Watch staff, wigmaker, and stock movement.' },
            { to: '/admin/inventory', icon: 'bx-cube', title: 'Inventory Overview', desc: 'Review hair stock, wig stock, and delivery.' },
            { to: '/admin/reports', icon: 'bx-file-blank', title: 'Reports', desc: 'Open donation, production, and distribution summaries.' },
            { to: '/admin/events', icon: 'bx-calendar-event', title: 'Events', desc: 'Schedule public activities and donation drives.' },
            { to: '/admin/community', icon: 'bxs-megaphone', title: 'Community Forum', desc: 'Moderate announcements and discussions.' },
          ].map((item, i) => (
            <Link key={i} to={item.to} className="admin-action-link" style={{ display: 'flex', gap: '1rem', padding: '1.25rem', borderRadius: '16px', border: '1px solid #f2ebf4', background: '#fdf7fb' }}>
              <div style={{ fontSize: '2rem', color: '#ad246d' }}><i className={`bx ${item.icon}`}></i></div>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem' }}>{item.title}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#8c7895' }}>{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </article>
    </section>
  );
};

export default AdminDashboard;
