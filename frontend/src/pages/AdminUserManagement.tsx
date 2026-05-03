import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';

const AdminUserManagement: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const filteredUsers = (data.users as any[]).filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(filter.toLowerCase()) ||
    u.email.toLowerCase().includes(filter.toLowerCase()) ||
    u.role.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <section className="section-wrap reveal active admin-page">
      <header style={{ padding: '0.6rem 0 0.2rem' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ad246d', marginBottom: '0.2rem' }}>Admin · Users</p>
        <h1 style={{ fontSize: '2.1rem', color: '#261d2b', margin: 0 }}>User Management</h1>
        <p style={{ color: '#665772', fontSize: '0.88rem', marginTop: '0.25rem' }}>View and manage all registered accounts across every role.</p>
      </header>

      <div className="inv-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
        {[
          { label: 'Donors', count: data.donorCount },
          { label: 'Recipients', count: data.recipientCount },
          { label: 'Staff', count: data.staffCount },
          { label: 'Wigmakers', count: data.wigmakerCount },
        ].map((item, i) => (
          <div key={i} className="inv-summary-item" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1.25rem', textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '0.8rem', color: '#8c7895', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</span>
            <strong style={{ fontSize: '1.75rem', color: '#ad246d' }}>{item.count}</strong>
          </div>
        ))}
      </div>

      <article className="admin-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '24px', padding: '1.5rem' }}>
        <div className="admin-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}><i className='bx bx-group' style={{ color: '#ad246d' }}></i> All Users</h2>
          <div className="admin-tools" style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Search users..." 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid #ead7e8' }}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Registered</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user: any) => (
                <tr key={user.id}>
                  <td><strong>{user.firstName} {user.lastName}</strong></td>
                  <td>{user.email}</td>
                  <td><span className={`role-badge ${user.role}`}>{user.role.toUpperCase()}</span></td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`admin-chip ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="ghost-btn" 
                      onClick={() => handleToggleActive(user.id)}
                      disabled={isSubmitting}
                      style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
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
