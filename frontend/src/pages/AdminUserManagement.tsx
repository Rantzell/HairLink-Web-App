import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import '../styles/Admin.css';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';

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
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUsers = async (searchStr = filter, roleStr = roleFilter, page = currentPage) => {
    try {
      setLoading(true);
      const res = await apiClient.get('/internal-api/admin/users', {
        params: { search: searchStr, role: roleStr, page }
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
    setCurrentPage(1);
    const timer = setTimeout(() => {
      fetchUsers(filter, roleFilter, 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [filter]);

  useEffect(() => {
    setCurrentPage(1);
    fetchUsers(filter, roleFilter, 1);
  }, [roleFilter]);

  useEffect(() => {
    fetchUsers(filter, roleFilter, currentPage);
  }, [currentPage]);

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

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isModalOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

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

  if (loading && !data) return <div className="section-wrap">Loading user management...</div>;
  if (!data) return <div className="section-wrap">Error: Could not load user registry. Please verify your connection.</div>;

  const filteredUsers = data.users || [];
  const totalPages: number = data.totalPages || 1;

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
          style={{ alignSelf: 'flex-start' }}
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
            <div className="admin-search-wrapper" style={{ position: 'relative' }}>
              <i className="bx bx-search admin-search-icon" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#ad246d', zIndex: 1 }}></i>
              <input 
                type="text" 
                placeholder="Search users..." 
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="admin-filter-input"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>
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
                <th className="admin-compact-th">Name</th>
                <th className="admin-compact-th">Email</th>
                <th className="admin-compact-th">Role</th>
                <th className="admin-compact-th">Registered</th>
                <th className="admin-compact-th">Status</th>
                <th className="admin-compact-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#8c7895', fontSize: '0.85rem' }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user: any) => (
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

      {/* Create/Edit User Modal — portalled to document.body so it's always viewport-centered */}
      {isModalOpen && createPortal(
        <div
          onClick={e => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(10, 5, 18, 0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'amuFadeIn 0.2s ease',
          }}
        >
          <div className="amu-modal">

            {/* ── Branded top bar ── */}
            <div className="amu-topbar">
              <span className="amu-topbar-badge">
                <i className={`bx ${editingUser ? 'bx-user-check' : 'bx-user-plus'}`} />
                {editingUser ? 'Edit Account' : 'New Account'}
              </span>
              <button
                type="button"
                className="amu-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
              >
                <i className="bx bx-x" />
              </button>
            </div>

            {/* ── Identity strip ── */}
            <div className="amu-identity-strip">
              <div className="amu-avatar">
                {userForm.firstName
                  ? `${userForm.firstName[0]}${userForm.lastName?.[0] || ''}`.toUpperCase()
                  : <i className="bx bx-user" />
                }
              </div>
              <div>
                <p className="amu-identity-name">
                  {userForm.firstName || userForm.lastName
                    ? `${userForm.firstName} ${userForm.lastName}`.trim()
                    : 'New User'}
                </p>
                <p className="amu-identity-email">
                  {userForm.email || (editingUser ? editingUser.email : 'No email yet')}
                </p>
              </div>
              <span className={`amu-role-pill amu-role-${userForm.role}`}>
                {userForm.role === 'staff' ? 'Staff' :
                 userForm.role === 'admin' ? 'Admin' :
                 userForm.role === 'wigmaker' ? 'Wigmaker' :
                 userForm.role === 'recipient' ? 'Recipient' : 'Donor'}
              </span>
            </div>

            {/* ── Form body ── */}
            <form onSubmit={handleSaveUser} className="amu-form-body">

              <div className="amu-section-label">Personal Information</div>
              <div className="amu-row-2">
                <div className="amu-field">
                  <label className="amu-lbl">First Name</label>
                  <div className="amu-input-wrap">
                    <i className="bx bx-user amu-input-icon" />
                    <input
                      className="amu-input"
                      type="text"
                      placeholder="Maria"
                      value={userForm.firstName}
                      onChange={e => setUserForm({...userForm, firstName: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="amu-field">
                  <label className="amu-lbl">Last Name</label>
                  <div className="amu-input-wrap">
                    <i className="bx bx-user amu-input-icon" />
                    <input
                      className="amu-input"
                      type="text"
                      placeholder="Santos"
                      value={userForm.lastName}
                      onChange={e => setUserForm({...userForm, lastName: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="amu-field">
                <label className="amu-lbl">Email Address</label>
                <div className="amu-input-wrap">
                  <i className="bx bx-envelope amu-input-icon" />
                  <input
                    className="amu-input"
                    type="email"
                    placeholder="user@example.com"
                    value={userForm.email}
                    onChange={e => setUserForm({...userForm, email: e.target.value})}
                    required
                  />
                </div>
              </div>

              {!editingUser && (
                <div className="amu-field">
                  <label className="amu-lbl">Password</label>
                  <div className="amu-input-wrap">
                    <i className="bx bx-lock-alt amu-input-icon" />
                    <input
                      className="amu-input"
                      type="password"
                      placeholder="Leave blank to use: password123"
                      value={userForm.password}
                      onChange={e => setUserForm({...userForm, password: e.target.value})}
                    />
                  </div>
                </div>
              )}

              <div className="amu-divider" />
              <div className="amu-section-label">Access & Permissions</div>

              <div className="amu-field">
                <label className="amu-lbl">Assigned Role</label>
                <div className="amu-select-wrap">
                  <i className="bx bx-shield amu-input-icon" />
                  <select
                    className="amu-select"
                    value={userForm.role}
                    onChange={e => setUserForm({...userForm, role: e.target.value})}
                  >
                    <option value="donor">Donor</option>
                    <option value="recipient">Recipient</option>
                    <option value="staff">Internal Staff</option>
                    <option value="wigmaker">Wigmaker Partner</option>
                    <option value="admin">System Administrator</option>
                  </select>
                  <i className="bx bx-chevron-down amu-chevron" />
                </div>
              </div>

              {/* Role description card */}
              <div className="amu-role-card">
                <i className={`bx ${
                  userForm.role === 'admin' ? 'bx-crown' :
                  userForm.role === 'staff' ? 'bx-briefcase' :
                  userForm.role === 'wigmaker' ? 'bx-scissors' :
                  userForm.role === 'recipient' ? 'bx-heart' : 'bx-donate-heart'
                } amu-role-card-icon`} />
                <div>
                  <p className="amu-role-card-name">
                    {userForm.role === 'admin' ? 'System Administrator' :
                     userForm.role === 'staff' ? 'Internal Staff' :
                     userForm.role === 'wigmaker' ? 'Wigmaker Partner' :
                     userForm.role === 'recipient' ? 'Recipient' : 'Donor'}
                  </p>
                  <p className="amu-role-card-desc">
                    {userForm.role === 'admin' && 'Full system access — manages users, inventory, reports, and all operations.'}
                    {userForm.role === 'staff' && 'Verifies donations and requests, matches recipients, and oversees inventory.'}
                    {userForm.role === 'wigmaker' && 'Views and updates assigned wig production tasks and delivery status.'}
                    {userForm.role === 'donor' && 'Submits hair donations and tracks their donation journey.'}
                    {userForm.role === 'recipient' && 'Submits wig requests and monitors request status and delivery.'}
                  </p>
                </div>
              </div>

              {/* ── Footer actions ── */}
              <div className="amu-footer">
                <button
                  type="button"
                  className="amu-btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="amu-btn-save"
                >
                  {isSubmitting ? (
                    <><i className="bx bx-loader-alt bx-spin" /> Saving…</>
                  ) : editingUser ? (
                    <><i className="bx bx-save" /> Save Changes</>
                  ) : (
                    <><i className="bx bx-user-plus" /> Create Account</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
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
