import React, { useState, useEffect } from 'react';
import '../styles/Admin.css';
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
    <section className="section-wrap reveal active admin-page admin-page-pad">
      <header className="admin-report-header-row">
        <div>
          <p className="admin-page-kicker">Admin · Users</p>
          <h1 className="admin-page-title">
            {roleFilter === 'all' ? 'User Management' : 
             roleFilter === 'donor' ? 'Donor Registry' : 
             roleFilter === 'recipient' ? 'Recipient Registry' : 
             roleFilter === 'staff' ? 'Staff Accounts' : 'Wigmaker Registry'}
          </h1>
          <p className="admin-page-subtitle">
            {roleFilter === 'all' ? 'View and manage all registered accounts across every role.' : 
             `Oversight and management for all registered ${roleFilter} accounts.`}
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="admin-btn-print"
        >
          <i className='bx bx-user-plus'></i> Create User
        </button>
      </header>

      <div className="inv-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "0.75rem", margin: "0.75rem 0" }}>
        {[
          { label: 'Donors', count: data.donorCount },
          { label: 'Recipients', count: data.recipientCount },
          { label: 'Staff', count: data.staffCount },
          { label: 'Wigmakers', count: data.wigmakerCount },
        ].map((item, i) => (
          <div key={i} className="inv-summary-item admin-mini-stat">
            <span className="admin-mini-stat-label">{item.label}</span>
            <strong className="admin-mini-stat-value">{item.count}</strong>
          </div>
        ))}
      </div>

      <article className="admin-card admin-card-white">
        <div className="admin-bar admin-bar">
          <h2 className="admin-bar-title">
            <i className={`bx ${
              roleFilter === 'all' ? 'bx-group' : 
              roleFilter === 'donor' ? 'bx-cut' : 
              roleFilter === 'recipient' ? 'bx-heart' : 
              roleFilter === 'staff' ? 'bx-shield-quarter' : 'bx-layer'
            } admin-icon-pink`}></i> {
              roleFilter === 'all' ? 'All Registered Users' : 
              roleFilter === 'donor' ? 'Donor Participants' : 
              roleFilter === 'recipient' ? 'Recipient Participants' : 
              roleFilter === 'staff' ? 'Internal Staff' : 'Wigmaker Partners'
            }
          </h2>
          <div className="admin-tools admin-tools">
            <input 
              type="text" 
              placeholder="Search users..." 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="admin-filter-input"
            />
          </div>
        </div>

        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="admin-compact-th">Name</th>
                <th className="admin-compact-th">Email</th>
                <th className="admin-compact-th">Role</th>
                <th className="admin-compact-th">Registered</th>
                <th className="admin-compact-th">Status</th>
                <th className="admin-compact-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user: any) => (
                <tr key={user.id}>
                  <td className="admin-compact-td"><strong>{user.displayName}</strong></td>
                  <td className="admin-compact-td">{user.email}</td>
                  <td className="admin-compact-td"><span className={`role-badge ${user.role} admin-chip-sm`}>{user.role.toUpperCase()}</span></td>
                  <td className="admin-compact-td">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="admin-compact-td">
                    <span className={`admin-chip ${user.isActive ? 'active' : 'inactive'} admin-chip-sm`}>
                      {user.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="admin-compact-td">
                    <div className="admin-user-actions">
                      <button 
                        onClick={() => handleOpenModal(user)}
                        className="admin-user-edit-btn"
                      >
                        <i className="bx bx-edit-alt admin-td-text"></i> Edit
                      </button>
                      <button 
                        onClick={() => requestToggle(user)}
                        disabled={isSubmitting}
                        className={`admin-user-toggle-btn ${user.isActive ? "deactivate" : "activate"}`}
                      >
                        <i className={`bx ${user.isActive ? 'bx-user-x' : 'bx-user-check'} admin-td-text`}></i>
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
        <div className="modal admin-modal-overlay">
          <div className="modal-content admin-modal-box">
            <h2 className="admin-modal-title">
              {editingUser ? 'Edit User Account' : 'Create New User Account'}
            </h2>
            <form onSubmit={handleSaveUser} className="admin-form-grid">
              <div className="admin-form-two-col-sm">
                <div className="form-group">
                  <label className="admin-form-label-sm">First Name</label>
                  <input type="text" value={userForm.firstName} onChange={e => setUserForm({...userForm, firstName: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="admin-form-label-sm">Last Name</label>
                  <input type="text" value={userForm.lastName} onChange={e => setUserForm({...userForm, lastName: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label className="admin-form-label-sm">Email Address</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} required />
              </div>
              {!editingUser && (
                <div className="form-group">
                  <label className="admin-form-label-sm">Password</label>
                  <input type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} placeholder="Default: password123" />
                </div>
              )}
              <div className="form-group">
                <label className="admin-form-label-sm">Assigned Role</label>
                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="admin-select">
                  <option value="donor">Donor</option>
                  <option value="recipient">Recipient</option>
                  <option value="staff">Internal Staff</option>
                  <option value="wigmaker">Wigmaker Partner</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>
              <div className="admin-modal-btns">
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
