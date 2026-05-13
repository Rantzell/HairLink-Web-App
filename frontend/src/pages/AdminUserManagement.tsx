import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import ConfirmModal from '../components/ConfirmModal';

const AdminUserManagement: React.FC = () => {
  const location = useLocation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    role: 'donor',
    firstName: '',
    lastName: '',
    name: '',
    isActive: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingToggleUser, setPendingToggleUser] = useState<any>(null);

  const fetchUsers = async (searchStr = filter, roleStr = roleFilter) => {
    try {
      setLoading(true);
      const res = await apiClient.get('/internal-api/admin/users', {
        params: { search: searchStr, role: roleStr }
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const role = params.get('role');
    if (role && role !== roleFilter) {
      setRoleFilter(role);
    }
  }, [location.search, roleFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(timer);
  }, [filter]);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleToggleActive = async (id: string) => {
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/internal-api/admin/users/${id}/toggle-active`);
      fetchUsers();
    } catch (err) {
      console.error('Toggle failed', err);
    } finally {
      setIsSubmitting(false);
      setPendingToggleUser(null);
    }
  };

  const requestToggle = (user: any) => {
    setPendingToggleUser(user);
    setShowToggleConfirm(true);
  };

  const handleOpenModal = (user: any = null) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        email: user.email,
        password: '', // Don't show password
        role: user.role,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        name: user.name || '',
        isActive: user.isActive
      });
    } else {
      setEditingUser(null);
      setUserForm({
        email: '',
        password: '',
        role: 'donor',
        firstName: '',
        lastName: '',
        name: '',
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSaveConfirm(true);
  };

  const doSaveUser = async () => {
    setShowSaveConfirm(false);
    setIsSubmitting(true);
    try {
      if (editingUser) {
        await apiClient.put(`/internal-api/admin/users/${editingUser.id}`, userForm);
      } else {
        await apiClient.post('/internal-api/admin/users', userForm);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="section-wrap">Loading user management...</div>;
  if (!data) return <div className="section-wrap">Error: Could not load user registry. Please verify your connection.</div>;

  const filteredUsers = data.users || [];

  return (
    <section className="section-wrap reveal active admin-page" style={{ padding: '1rem' }}>
      <header style={{ padding: '0.2rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
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
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          style={{ 
            padding: '0.5rem 1.25rem', 
            borderRadius: '8px', 
            background: '#ad246d', 
            color: '#fff', 
            border: 'none', 
            fontWeight: 800, 
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <i className='bx bx-user-plus'></i> Create User
        </button>
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
                <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user: any) => (
                <tr key={user.id}>
                  <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}><strong>{user.displayName}</strong></td>
                  <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}>{user.email}</td>
                  <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}><span className={`role-badge ${user.role}`} style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>{user.role.toUpperCase()}</span></td>
                  <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}>
                    <span className={`admin-chip ${user.isActive ? 'active' : 'inactive'}`} style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>
                      {user.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button 
                        onClick={() => handleOpenModal(user)}
                        style={{ 
                          padding: '0.35rem 0.8rem', 
                          fontSize: '0.7rem', 
                          background: '#fff', 
                          color: '#ad246d', 
                          border: '1.5px solid #ead7e8', 
                          borderRadius: '8px', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontWeight: 700,
                          transition: 'all 0.2s'
                        }}
                      >
                        <i className='bx bx-edit-alt' style={{ fontSize: '0.85rem' }}></i> Edit
                      </button>
                      <button 
                        onClick={() => requestToggle(user)}
                        disabled={isSubmitting}
                        style={{ 
                          padding: '0.35rem 0.8rem', 
                          fontSize: '0.7rem',
                          background: user.isActive ? '#fff' : '#ad246d',
                          border: `1.5px solid ${user.isActive ? '#ead7e8' : '#ad246d'}`,
                          color: user.isActive ? '#8c7895' : '#fff',
                          borderRadius: '8px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <i className={`bx ${user.isActive ? 'bx-user-x' : 'bx-user-check'}`} style={{ fontSize: '0.85rem' }}></i>
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {/* Create/Edit User Modal */}
      {isModalOpen && (
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0, zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', padding: '2rem', borderRadius: '20px', width: '450px', maxWidth: '90%' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#ad246d' }}>
              {editingUser ? 'Edit User Account' : 'Create New User Account'}
            </h2>
            <form onSubmit={handleSaveUser} style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>First Name</label>
                  <input type="text" value={userForm.firstName} onChange={e => setUserForm({...userForm, firstName: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Last Name</label>
                  <input type="text" value={userForm.lastName} onChange={e => setUserForm({...userForm, lastName: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Email Address</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} required />
              </div>
              {!editingUser && (
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Password</label>
                  <input type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} placeholder="Default: password123" />
                </div>
              )}
              <div className="form-group">
                <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Assigned Role</label>
                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ead7e8' }}>
                  <option value="donor">Donor</option>
                  <option value="recipient">Recipient</option>
                  <option value="staff">Internal Staff</option>
                  <option value="wigmaker">Wigmaker Partner</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    background: '#ad246d',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                >
                  {isSubmitting ? 'Saving...' : (editingUser ? 'Update Account' : 'Create Account')}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  style={{
                    flex: 1,
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    background: '#fff',
                    color: '#ad246d',
                    border: '1.5px solid #ead7e8',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={showToggleConfirm}
        onClose={() => { setShowToggleConfirm(false); setPendingToggleUser(null); }}
        onConfirm={() => { setShowToggleConfirm(false); if (pendingToggleUser) handleToggleActive(pendingToggleUser.id); }}
        title={pendingToggleUser?.isActive ? 'Deactivate Account' : 'Activate Account'}
        message={`Are you sure you want to ${pendingToggleUser?.isActive ? 'deactivate' : 'activate'} the account of ${pendingToggleUser?.displayName}? ${pendingToggleUser?.isActive ? 'They will no longer be able to log in.' : 'They will regain access to HairLink.'}`}
        confirmText={pendingToggleUser?.isActive ? 'Yes, Deactivate' : 'Yes, Activate'}
        variant={pendingToggleUser?.isActive ? 'danger' : undefined}
        isConfirming={isSubmitting}
      />

      <ConfirmModal
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={doSaveUser}
        title={editingUser ? 'Update User Account' : 'Create User Account'}
        message={editingUser ? `Save changes to ${userForm.firstName} ${userForm.lastName}'s account?` : `Create a new ${userForm.role} account for ${userForm.firstName} ${userForm.lastName}?`}
        confirmText={editingUser ? 'Yes, Update Account' : 'Yes, Create Account'}
        isConfirming={isSubmitting}
      />
    </section>
  );
};

export default AdminUserManagement;
