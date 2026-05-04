import React, { useState, useEffect } from 'react';
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
      <div style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
        <i className='bx bx-error-circle' style={{ fontSize: '2rem', color: '#ad246d', marginBottom: '1rem', display: 'block' }}></i>
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>Dashboard Load Error</h2>
        <p style={{ color: '#8c7895', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {data?.message || 'Could not load dashboard analytics. Please try again later.'}
        </p>
        <button onClick={() => window.location.reload()} style={{ background: '#ad246d', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>
          Retry Loading
        </button>
      </div>
    </div>
  );

  return (
    <section className="section-wrap reveal active admin-page" style={{ padding: '1rem' }}>
      <header className="admin-hero admin-surface" style={{ 
        background: '#fff', 
        border: '1px solid #ead7e8', 
        borderRadius: '20px', 
        padding: '1.25rem 1.5rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem' 
      }}>
        <div className="admin-hero-copy">
          <p className="admin-kicker" style={{ color: '#ad246d', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Administrative Oversight</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 0.2rem 0' }}>System Overview</h1>
          <p style={{ color: '#8c7895', maxWidth: '500px', fontSize: '0.8rem', margin: 0 }}>Monitor operational flow, staff activity, and system health across all modules.</p>
        </div>

        <aside className="admin-hero-side" style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div className="admin-hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fdf2f8', color: '#ad246d', padding: '0.4rem 0.8rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.75rem' }}>
            <i className='bx bxs-bar-chart-alt-2'></i>
            <span>Oversight Mode</span>
          </div>
          <div className="admin-hero-summary" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'left' }}>
              <strong style={{ display: 'block', fontSize: '0.75rem', color: '#ad246d' }}>RECENT STAFF ACTIVITY</strong>
              <span style={{ fontSize: '0.8rem', color: '#3b2e43', fontWeight: 700 }}>{data.pendingVerifications} entries verified today</span>
            </div>
            <Link to="/admin/reports" style={{ 
              padding: '0 1rem', 
              fontSize: '0.75rem', 
              height: '32px', 
              display: 'flex', 
              alignItems: 'center',
              background: '#ad246d',
              color: '#fff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(173, 36, 109, 0.2)'
            }}>
              View Full Logs
            </Link>
          </div>
        </aside>
      </header>

      <section className="admin-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <article className="quick-stat" style={{ padding: '1rem' }}>
          <small style={{ fontSize: '0.7rem' }}>Global Submissions</small>
          <h2 style={{ fontSize: '1.5rem', margin: '0.2rem 0' }}>{data.donationsCount}</h2>
          <p style={{ fontSize: '0.75rem' }}>System-wide total</p>
        </article>
        <article className="quick-stat" style={{ padding: '1rem' }}>
          <small style={{ fontSize: '0.7rem' }}>Total System Users</small>
          <h2 style={{ fontSize: '1.5rem', margin: '0.2rem 0' }}>{data.usersCount}</h2>
          <p style={{ fontSize: '0.75rem' }}>Across all categories</p>
        </article>
        <article className="quick-stat" style={{ padding: '1rem' }}>
          <small style={{ fontSize: '0.7rem' }}>Recipient Fulfillment</small>
          <h2 style={{ fontSize: '1.5rem', margin: '0.2rem 0' }}>{data.requestsCount}</h2>
          <p style={{ fontSize: '0.75rem' }}>Requests processed</p>
        </article>
        <article className="quick-stat" style={{ padding: '1rem' }}>
          <small style={{ fontSize: '0.7rem' }}>Staff Output</small>
          <h2 style={{ fontSize: '1.5rem', margin: '0.2rem 0' }}>{data.pendingVerifications}</h2>
          <p style={{ fontSize: '0.75rem' }}>Approvals this week</p>
        </article>
      </section>

      <div className="admin-toolbar admin-surface" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '15px', padding: '0.8rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div className="admin-toolbar-copy">
          <h2 style={{ fontSize: '1rem', margin: 0 }}>Oversight Shortcuts</h2>
        </div>
        <div className="admin-quick-actions" style={{ display: 'flex', gap: '0.6rem' }}>
          <Link to="/admin/reports" style={{ 
            padding: '0.4rem 0.8rem', 
            fontSize: '0.75rem', 
            textDecoration: 'none', 
            color: '#ad246d', 
            border: '1px solid #ead7e8', 
            borderRadius: '8px', 
            background: '#fff',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}><i className='bx bx-history'></i> Approval Logs</Link>
          <Link to="/admin/matching" style={{ 
            padding: '0.4rem 0.8rem', 
            fontSize: '0.75rem', 
            textDecoration: 'none', 
            color: '#ad246d', 
            border: '1px solid #ead7e8', 
            borderRadius: '8px', 
            background: '#fff',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}><i className='bx bx-list-ul'></i> Matching Logs</Link>
          <Link to="/admin/inventory" style={{ 
            padding: '0.4rem 0.8rem', 
            fontSize: '0.75rem', 
            textDecoration: 'none', 
            color: '#ad246d', 
            border: '1px solid #ead7e8', 
            borderRadius: '8px', 
            background: '#fff',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}><i className='bx bx-package'></i> Stock Status</Link>
          <Link to="/admin/operations" style={{ 
            padding: '0.4rem 0.8rem', 
            fontSize: '0.75rem', 
            textDecoration: 'none', 
            color: '#ad246d', 
            border: '1px solid #ead7e8', 
            borderRadius: '8px', 
            background: '#fff',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}><i className='bx bx-line-chart'></i> Operational Logs</Link>
        </div>
      </div>

      <section className="admin-priority-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <article className="admin-focus-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '15px', padding: '1rem' }}>
          <div className="admin-focus-head" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 800, color: '#ad246d' }}>OPERATIONAL LOGS</p>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}><i className='bx bx-transfer-alt'></i> Recent Donors</h2>
            </div>
            <Link to="/admin/reports" style={{ color: '#ad246d', fontWeight: 800, fontSize: '0.75rem' }}>View summary</Link>
          </div>
          <div className="admin-queue-list">
            {data.recentDonations.map((d: any) => (
              <div key={d.id} className="admin-queue-item" style={{ padding: '0.75rem', borderBottom: '1px solid #f2ebf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.85rem' }}>{d.reference} · {d.user?.firstName}</strong>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#8c7895' }}>{d.hairLength} · {d.hairColor} · Staff: {d.status}</p>
                </div>
                <StatusPill status={d.status} />
              </div>
            ))}
          </div>
        </article>

        <article className="admin-focus-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '15px', padding: '1rem' }}>
          <div className="admin-focus-head" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 800, color: '#ad246d' }}>OPERATIONAL LOGS</p>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}><i className='bx bx-user-check'></i> Recipient Activity</h2>
            </div>
            <Link to="/admin/matching" style={{ color: '#ad246d', fontWeight: 800, fontSize: '0.75rem' }}>View summary</Link>
          </div>
          <div className="admin-queue-list">
            {data.recentRequests.map((r: any) => (
              <div key={r.id} className="admin-queue-item" style={{ padding: '0.75rem', borderBottom: '1px solid #f2ebf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.85rem' }}>{r.reference} · {r.user?.firstName}</strong>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#8c7895' }}>Status: {r.status} · Processed: {new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <StatusPill status={r.status} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <article className="admin-card admin-module-panel" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', padding: '1.25rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 800, color: '#ad246d' }}>SYSTEM WORKSPACE</p>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}><i className='bx bxs-dashboard'></i> Oversight Modules</h2>
        </div>
        <div className="admin-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
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
            <Link key={i} to={item.to} className="admin-action-link" style={{ display: 'flex', gap: '0.75rem', padding: '0.8rem', borderRadius: '12px', border: '1px solid #f2ebf4', background: '#fdf7fb' }}>
              <div style={{ fontSize: '1.5rem', color: '#ad246d' }}><i className={`bx ${item.icon}`}></i></div>
              <div>
                <h3 style={{ margin: '0 0 0.1rem 0', fontSize: '0.9rem' }}>{item.title}</h3>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#8c7895' }}>{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </article>
    </section>
  );
};

export default AdminDashboard;
