import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/client';

const AdminUserManagement: React.FC = () => {
  const location = useLocation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const r = params.get('role');
    if (r) setRoleFilter(r);
  }, [location.search]);

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get('/internal-api/admin/users');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActive = async (userId: string) => {
    setIsSubmitting(true);
    try {
      await apiClient.post(`/internal-api/admin/users/${userId}/toggle`);
      fetchUsers();
    } catch (err) {
      console.error('Toggle failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="section-wrap">Loading user management...</div>;
  if (!data) return <div className="section-wrap">Error: Could not load user registry. Please verify your connection.</div>;

  const filteredUsers = (data.users as any[]).filter(u => {
    const matchesSearch = `${u.firstName} ${u.lastName}`.toLowerCase().includes(filter.toLowerCase()) ||
                        u.email.toLowerCase().includes(filter.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  return (
    <section className="section-wrap reveal active admin-page" style={{ padding: '1rem' }}>
      <header style={{ padding: '0.2rem 0' }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ad246d', marginBottom: '0.1rem' }}>Admin · Users</p>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#261d2b', margin: 0 }}>
          {roleFilter === 'all' ? 'User Management' : 
           roleFilter === 'donor' ? 'Donor Registry' : 
           roleFilter === 'recipient' ? 'Recipient Registry' : 
           roleFilter === 'staff' ? 'Staff Accounts' : 'Wigmaker Registry'}
        </h1>
        <p style={{ color: '#665772', fontSize: '0.75rem', marginTop: '0.1rem' }}>
          {roleFilter === 'all' ? 'View and manage all registered accounts across every role.' : 
           `Oversight and management for all registered ${roleFilter} accounts.`}
        </p>
      </header>

      <div className="inv-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', margin: '0.75rem 0' }}>
        {[
          { label: 'Donors', count: data.donorCount },
          { label: 'Recipients', count: data.recipientCount },
          { label: 'Staff', count: data.staffCount },
          { label: 'Wigmakers', count: data.wigmakerCount },
        ].map((item, i) => (
          <div key={i} className="inv-summary-item" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '0.65rem', color: '#8c7895', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</span>
            <strong style={{ fontSize: '1.3rem', color: '#ad246d' }}>{item.count}</strong>
          </div>
        ))}
      </div>

      <article className="admin-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1rem' }}>
        <div className="admin-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>
            <i className={`bx ${
              roleFilter === 'all' ? 'bx-group' : 
              roleFilter === 'donor' ? 'bx-cut' : 
              roleFilter === 'recipient' ? 'bx-heart' : 
              roleFilter === 'staff' ? 'bx-shield-quarter' : 'bx-layer'
            }`} style={{ color: '#ad246d' }}></i> {
              roleFilter === 'all' ? 'All Registered Users' : 
              roleFilter === 'donor' ? 'Donor Participants' : 
              roleFilter === 'recipient' ? 'Recipient Participants' : 
              roleFilter === 'staff' ? 'Internal Staff' : 'Wigmaker Partners'
            }
          </h2>
          <div className="admin-tools" style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Search users..." 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ padding: '0.3rem 0.8rem', borderRadius: '6px', border: '1px solid #ead7e8', fontSize: '0.8rem' }}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Name</th>
                <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Email</th>
                <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Role</th>
                <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Registered</th>
                <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Status</th>
                <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user: any) => (
                <tr key={user.id}>
                  <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}><strong>{user.firstName} {user.lastName}</strong></td>
                  <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}>{user.email}</td>
                  <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}><span className={`role-badge ${user.role}`} style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>{user.role.toUpperCase()}</span></td>
                  <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}>
                    <span className={`admin-chip ${user.isActive ? 'active' : 'inactive'}`} style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>
                      {user.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}>
                    <button 
                      onClick={() => handleToggleActive(user.id)}
                      disabled={isSubmitting}
                      style={{ 
                        padding: '0.3rem 0.7rem', 
                        fontSize: '0.7rem',
                        background: '#fff',
                        border: `1px solid ${user.isActive ? '#ead7e8' : '#ad246d'}`,
                        color: user.isActive ? '#8c7895' : '#ad246d',
                        borderRadius: '6px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
};

export default AdminUserManagement;
