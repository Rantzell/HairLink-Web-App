import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import ConfirmModal from '../components/ConfirmModal';

const DonorProfile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editData, setEditData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    age: user?.age?.toString() || '',
    gender: user?.gender || '',
  });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

  const initials = user ? (user.firstName?.[0] || user.name?.[0] || 'U').toUpperCase() + (user.lastName?.[0] || '').toUpperCase() : '??';
  const fullName = user ? (user.firstName ? `${user.firstName} ${user.lastName}` : user.name) : 'Donor';

  const referralCode = user?.referralCode || 'NOT-GENERATED';

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const doUpdate = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('first_name', editData.firstName);
      formData.append('last_name', editData.lastName);
      formData.append('phone', editData.phone);
      formData.append('bio', editData.bio);
      formData.append('age', editData.age);
      formData.append('gender', editData.gender);
      if (profilePhoto) {
        formData.append('profile_photo', profilePhoto);
      }

      const res = await apiClient.post('/internal-api/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      updateUser(res.data.user);
      setIsModalOpen(false);
      alert('Profile updated successfully!');
    } catch (err: any) {
      console.error('Profile update failed', err);
      alert(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode);
    alert('Referral code copied to clipboard!');
  };

  return (
    <section className="section-wrap profile-shell reveal active">
      <header className="profile-head" style={{ marginBottom: '0.5rem' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>My Profile</h1>
        <p style={{ fontSize: '0.8rem', color: '#8c7895', marginTop: '0.2rem' }}>View your donor account details and contact information.</p>
      </header>

      {/* Profile Hero Section */}
      <div className="profile-hero-wrap" style={{ marginBottom: '1rem' }}>
        <div className="profile-avatar-box">
          <div className="profile-avatar-main">
            {user?.profile_photo_url ? (
              <img 
                src={user.profile_photo_url} 
                alt="Profile" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerText = initials;
                }}
              />
            ) : (
              initials
            )}
          </div>
          <button className="avatar-edit-btn" onClick={() => setIsModalOpen(true)}>
            <i className='bx bxs-camera'></i>
          </button>
        </div>
        
        <div className="profile-info-main">
          <h2>{fullName}</h2>
          <span className="role-badge">
            {user?.role?.toUpperCase() || 'DONOR'}
          </span>
        </div>
        
        <div className="profile-hero-actions" style={{marginLeft: 'auto'}}>
          <button 
            className="flex items-center gap-2" 
            onClick={() => setIsModalOpen(true)}
            style={{ 
              background: '#ad246d', 
              color: '#fff', 
              border: 'none', 
              padding: '0.6rem 1.2rem', 
              borderRadius: '25px', 
              fontSize: '0.8rem', 
              fontWeight: 800, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(173, 36, 109, 0.2)'
            }}
          >
            <i className='bx bx-edit-alt'></i> Edit Profile
          </button>
        </div>
      </div>

      <div className="profile-grid-main">
        {/* Main Details Column */}
        <div className="profile-content-col">
          <article className="profile-details-card">
            <div className="card-title-row">
              <i className='bx bx-id-card'></i>
              <h2>Personal Details</h2>
            </div>

            <div className="details-grid">
              <div className="detail-item">
                <label className="detail-label">Email Address</label>
                <span className="detail-value">{user?.email}</span>
              </div>
              <div className="detail-item">
                <label className="detail-label">Phone Number</label>
                <span className="detail-value">{user?.phone || 'Not set'}</span>
              </div>
              <div className="detail-item">
                <label className="detail-label">Age</label>
                <span className="detail-value">{user?.age || 'Not set'}</span>
              </div>
              <div className="detail-item">
                <label className="detail-label">Gender</label>
                <span className="detail-value capitalize">{user?.gender || 'Not set'}</span>
              </div>
            </div>

            <div className="bio-section">
              <label className="detail-label">Short Bio</label>
              <p className="bio-text">
                {user?.bio || 'No bio provided. Tell us a bit about why you donate!'}
              </p>
            </div>
          </article>
        </div>

        {/* Sidebar Column */}
        <div className="profile-sidebar">
          {/* Referral Reward Card - Only for Donors */}
          {user?.role === 'donor' && (
            <article className="referral-card-new">
              <i className='bx bxs-gift bg-icon'></i>
              <h3 className="detail-label" style={{marginBottom: '1rem'}}>Referral Reward</h3>
              <div className="referral-code-box">
                <span className="referral-code-text">{referralCode}</span>
                <p className="referral-subtext">Share to earn 5 points per donor</p>
              </div>
              <button className="submit-code-btn w-full flex items-center justify-center gap-2" onClick={copyToClipboard}>
                <i className='bx bx-copy'></i> Copy Code
              </button>
            </article>
          )}

          {/* Impact Stats Card */}
          <article className="stats-card">
            <div className="stats-title-row">
              <i className='bx bxs-star-half'></i>
              <h3>Impact Stats</h3>
            </div>
            <div className="stats-list">
              <div className="stat-line">
                <span className="stat-label">Account Type</span>
                <span className="stat-value">{user?.role}</span>
              </div>
              <div className="stat-line">
                <span className="stat-label">Joined</span>
                <span className="stat-value">
                  {user ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-in zoom-in">
            <header className="modal-header">
              <h2>Edit Personal Information</h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <i className='bx bx-x'></i>
              </button>
            </header>
            
            <form onSubmit={handleUpdate} className="modal-body-scroll">
              <div className="details-grid-form">
                <div className="form-group">
                  <label className="detail-label">First Name</label>
                  <input 
                    type="text" 
                    value={editData.firstName} 
                    readOnly
                    className="form-input-premium"
                  />
                </div>
                <div className="form-group">
                  <label className="detail-label">Last Name</label>
                  <input 
                    type="text" 
                    value={editData.lastName} 
                    readOnly
                    className="form-input-premium"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="detail-label">Email Address</label>
                <input 
                  type="email" 
                  value={user?.email || ''} 
                  readOnly
                  className="form-input-premium"
                />
              </div>

              <div className="form-group">
                <label className="detail-label">Phone Number</label>
                <input 
                  type="text" 
                  value={editData.phone} 
                  onChange={e => setEditData({...editData, phone: e.target.value})}
                  className="form-input-premium"
                />
              </div>

              <div className="form-group">
                <label className="detail-label">Age</label>
                <input 
                  type="number" 
                  value={editData.age} 
                  onChange={e => setEditData({...editData, age: e.target.value})}
                  className="form-input-premium"
                  min="1"
                  max="120"
                />
              </div>

              <div className="form-group">
                <label className="detail-label">Gender</label>
                <select 
                  value={editData.gender} 
                  onChange={e => setEditData({...editData, gender: e.target.value})}
                  className="form-input-premium"
                  style={{ height: '42px' }}
                >
                  <option value="" disabled>Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="nonbinary">Non-binary</option>
                  <option value="prefer_not_say">Prefer not to say</option>
                </select>
              </div>

              <div className="form-group">
                <label className="detail-label">Quick Bio</label>
                <textarea 
                  rows={3} 
                  value={editData.bio} 
                  onChange={e => setEditData({...editData, bio: e.target.value})}
                  className="form-input-premium"
                  style={{resize: 'none'}}
                ></textarea>
              </div>

              <div className="form-group">
                <label className="detail-label">Profile Photo</label>
                <div className="upload-zone-premium">
                  <input 
                    type="file" 
                    accept="image/jpeg,image/png,image/webp"
                    onChange={e => setProfilePhoto(e.target.files?.[0] || null)}
                    className="upload-input-hidden"
                  />
                  <div className="upload-content-premium">
                    <i className='bx bx-cloud-upload'></i>
                    <span>
                      {profilePhoto ? profilePhoto.name : 'Select new image (JPG/PNG/WEBP)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-actions-premium">
                <button type="submit" disabled={isSubmitting} className="save-btn-premium">
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={doUpdate}
        title="Save Profile Changes"
        message="Save your updated profile information? Your name, photo, and contact details will be updated across HairLink."
        confirmText="Yes, Save Changes"
        isConfirming={isSubmitting}
      />
    </section>
  );
};

export default DonorProfile;
