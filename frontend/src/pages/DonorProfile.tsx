import toast from 'react-hot-toast';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import apiClient from '../api/client';
import ConfirmModal from '../components/ConfirmModal';

const DonorProfile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otherReferral, setOtherReferral] = useState('');
  const [submittingReferral, setSubmittingReferral] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
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
    if (editData.phone) {
      const phoneDigits = editData.phone.replace('+63', '').replace(/\D/g, '');
      if (phoneDigits.length > 0) {
        if (phoneDigits.length !== 10) {
          toast.error('Mobile number must be exactly 10 digits.');
          return;
        }
        if (!phoneDigits.startsWith('9')) {
          toast.error('Mobile number must start with 9.');
          return;
        }
      }
    }
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
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      console.error('Profile update failed', err);
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success('Referral code copied to clipboard!');
  };

  const handleGenerateCode = async () => {
    if (isGeneratingCode) return;
    setIsGeneratingCode(true);
    try {
      const res = await apiClient.post('/internal-api/referral/generate');
      const newCode = res.data?.referralCode;
      if (newCode) {
        updateUser({ ...user!, referralCode: newCode });
        toast.success('Referral code generated!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate referral code.');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const shareCode = async () => {
    const text = `Join HairLink with my referral code: ${referralCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'HairLink Referral', text });
      } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Share message copied to clipboard!');
    }
  };

  const submitOtherReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otherReferral.trim()) return;
    setSubmittingReferral(true);
    try {
      const res = await apiClient.post('/internal-api/referral', { referral_code: otherReferral });
      toast.error(res.data.message || 'Referral code applied successfully!');

      const profileRes = await apiClient.get('/auth/me');
      updateUser(profileRes.data);
      setOtherReferral('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid referral code.');
    } finally {
      setSubmittingReferral(false);
    }
  };

  const doDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm.');
      return;
    }
    setIsDeleting(true);
    try {
      await apiClient.delete('/auth/account');
      await supabase.auth.signOut();
      toast.success('Your account has been permanently deleted.');
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
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

        <div className="profile-hero-actions" style={{ marginLeft: 'auto' }}>
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
              <h3 className="detail-label" style={{ marginBottom: '1rem' }}>Referral Reward</h3>
              <div className="referral-code-box">
                <span className="referral-code-text">{referralCode}</span>
                <p className="referral-subtext">Share to earn 5 stars per donor — they get 3 stars too</p>
              </div>
              <button
                className="submit-code-btn w-full flex items-center justify-center gap-2"
                onClick={() => setIsReferralModalOpen(true)}
              >
                <i className='bx bx-share-alt'></i> View &amp; Share Code
              </button>
            </article>
          )}

          {/* Redeem Referral Code - Only for Donors who haven't used one yet */}
          {user?.role === 'donor' && !user?.referredBy && (
            <article className="referral-card-new" style={{ marginTop: '1.5rem', background: '#fff', border: '1px solid #f2eef2' }}>
              <i className='bx bxs-coupon bg-icon' style={{ color: '#ad246d', opacity: 0.08 }}></i>
              <h3 className="detail-label" style={{ marginBottom: '0.8rem', color: '#3b2e43' }}>Redeem Referral</h3>
              <p style={{ fontSize: '0.85rem', color: '#6b5b6d', marginBottom: '1rem', lineHeight: '1.4' }}>
                Were you referred by another user? Enter their code below — they earn 3 stars and you earn 5.
              </p>
              <form onSubmit={submitOtherReferral} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="e.g. HL-XXXXXX"
                  value={otherReferral}
                  onChange={e => setOtherReferral(e.target.value.toUpperCase())}
                  disabled={submittingReferral}
                  style={{
                    flex: 1,
                    padding: '0.5rem 1.1rem',
                    borderRadius: '25px',
                    border: '1.5px solid #f2eef2',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#ad246d',
                    textTransform: 'uppercase'
                  }}
                />
                <button
                  type="submit"
                  disabled={submittingReferral || !otherReferral.trim()}
                  className="submit-code-btn"
                  style={{
                    background: '#ad246d',
                    color: '#fff',
                    border: 'none',
                    padding: '0 1.2rem',
                    borderRadius: '25px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {submittingReferral ? 'Applying...' : 'Apply'}
                </button>
              </form>
            </article>
          )}

          {user?.role === 'donor' && user?.referredBy && (
            <article className="referral-card-new" style={{ marginTop: '1.5rem', background: '#fdfafd', border: '1.5px dashed #ad246d' }}>
              <i className='bx bxs-check-circle bg-icon' style={{ color: '#ad246d', opacity: 0.12 }}></i>
              <h3 className="detail-label" style={{ marginBottom: '0.5rem', color: '#3b2e43' }}>Referral Status</h3>
              <p style={{ fontSize: '0.85rem', color: '#ad246d', fontWeight: 700, margin: 0 }}>
                ✓ Referral code applied!
              </p>
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

      {/* ── Delete Account Button ── */}
      <div style={{ marginTop: '1.5rem' }}>
        <button
          type="button"
          onClick={() => { setDeleteConfirmText(''); setShowDeleteConfirm(true); }}
          style={{
            background: 'transparent',
            color: '#dc2626',
            border: 'none',
            padding: '0',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            opacity: 0.75,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.75'; }}
        >
          <i className='bx bx-trash' />
          Delete My Account
        </button>
      </div>

      {/* ── Delete Account Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div
          onClick={e => { if (e.target === e.currentTarget && !isDeleting) { setShowDeleteConfirm(false); setDeleteConfirmText(''); } }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div style={{ background: '#fff', borderRadius: '20px', padding: '2rem', maxWidth: '440px', width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.8rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#fef2f2', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <i className='bx bxs-error-circle' style={{ fontSize: '1.5rem', color: '#dc2626' }} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>Delete Account</h2>
            </div>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', color: '#4b5563', lineHeight: 1.6 }}>
              This action is <strong>irreversible</strong>. Your account, all donations, history, and data will be permanently deleted.
            </p>
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.85rem', color: '#374151', fontWeight: 600 }}>
              Type <span style={{ color: '#dc2626', fontFamily: 'monospace' }}>DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE here"
              disabled={isDeleting}
              style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', border: `1.5px solid ${deleteConfirmText === 'DELETE' ? '#dc2626' : '#e5e7eb'}`, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', marginBottom: '1rem', fontFamily: 'monospace', letterSpacing: '0.05em' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                disabled={isDeleting}
                style={{ flex: 1, padding: '0.7rem', borderRadius: '50px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                style={{ flex: 2, padding: '0.7rem', borderRadius: '50px', border: 'none', background: deleteConfirmText === 'DELETE' ? '#dc2626' : '#f3f4f6', color: deleteConfirmText === 'DELETE' ? '#fff' : '#9ca3af', fontWeight: 800, fontSize: '0.875rem', cursor: (isDeleting || deleteConfirmText !== 'DELETE') ? 'not-allowed' : 'pointer', transition: 'all 0.18s' }}
              >
                {isDeleting ? 'Deleting…' : 'Yes, Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isModalOpen && (
        <div className="ep-overlay" onClick={e => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="ep-modal">

            {/* ── Top bar ── */}
            <div className="ep-topbar">
              <h2 className="ep-title">My profile</h2>
              <button className="ep-close" type="button" onClick={() => setIsModalOpen(false)} aria-label="Close">
                ×
              </button>
            </div>

            {/* ── Body: photo column + form column ── */}
            <form id="ep-form" onSubmit={handleUpdate} className="ep-body">

              {/* Photo column */}
              <div className="ep-photo-col">
                <div className="ep-avatar">
                  {profilePhoto ? (
                    <img src={URL.createObjectURL(profilePhoto)} alt="Preview" className="ep-avatar-img" />
                  ) : user?.profile_photo_url ? (
                    <img src={user.profile_photo_url} alt="Profile" className="ep-avatar-img"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <span className="ep-avatar-initials">{initials}</span>
                  )}
                </div>
                <label className="ep-edit-photo-btn">
                  <i className='bx bx-image-add'></i> Edit photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={e => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile) {
                        if (selectedFile.size > 10 * 1024 * 1024) {
                          toast.error('Profile photo is too large. Max 10MB.');
                          return;
                        }
                        setProfilePhoto(selectedFile);
                      } else {
                        setProfilePhoto(null);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
                {profilePhoto && (
                  <span className="ep-photo-name">{profilePhoto.name}</span>
                )}
              </div>

              {/* Form column */}
              <div className="ep-form-col">
                <div className="ep-field">
                  <label className="ep-label">Name</label>
                  <div className="ep-name-row">
                    <input type="text" value={editData.firstName} readOnly className="ep-input ep-input-readonly" placeholder="First name" />
                    <input type="text" value={editData.lastName} readOnly className="ep-input ep-input-readonly" placeholder="Last name" />
                  </div>
                </div>

                <div className="ep-field">
                  <label className="ep-label">Email</label>
                  <input type="email" value={user?.email || ''} readOnly className="ep-input ep-input-readonly" />
                </div>

                <div className="ep-field">
                  <label className="ep-label">Phone number</label>
                  <div style={{ display: 'flex', alignItems: 'stretch', border: '1.5px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', background: '#fff' }}>
                    <span style={{ padding: '0 0.75rem', fontSize: '0.82rem', fontWeight: 600, color: '#4b5563', borderRight: '1.5px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      🇵🇭 +63
                    </span>
                    <input
                      type="text"
                      value={editData.phone.replace('+63', '')}
                      onChange={e => {
                        let val = e.target.value.replace(/\D/g, '');
                        // Handle pasted/typed country code or leading zero prefixes
                        if (val.startsWith('639')) {
                          val = val.slice(2);
                        } else if (val.startsWith('09')) {
                          val = val.slice(1);
                        }
                        
                        // Enforce starting with 9
                        if (val.length > 0 && !val.startsWith('9')) {
                          val = '';
                        }
                        
                        const d = val.slice(0, 10);
                        setEditData({ ...editData, phone: d ? '+63' + d : '' });
                      }}
                      style={{ border: 'none', background: 'transparent', flex: 1, outline: 'none', padding: '0.65rem 0.9rem', fontSize: '0.9rem', color: '#111827', width: '100%', boxSizing: 'border-box' }}
                      placeholder="9171234567"
                      required
                      minLength={10}
                      pattern="9[0-9]{9}"
                      title="Mobile number must be exactly 10 digits starting with 9 (e.g. 9171234567)"
                    />
                  </div>
                </div>

                <div className="ep-two-col">
                  <div className="ep-field">
                    <label className="ep-label">Age</label>
                    <input
                      type="number"
                      value={editData.age}
                      onChange={e => setEditData({ ...editData, age: e.target.value })}
                      className="ep-input"
                      min="1" max="120"
                      placeholder="Age"
                    />
                  </div>
                  <div className="ep-field">
                    <label className="ep-label">Gender</label>
                    <select
                      value={editData.gender}
                      onChange={e => setEditData({ ...editData, gender: e.target.value })}
                      className="ep-input ep-select"
                    >
                      <option value="" disabled>Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="nonbinary">Non-binary</option>
                      <option value="prefer_not_say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div className="ep-field">
                  <label className="ep-label">Short bio</label>
                  <textarea
                    rows={3}
                    value={editData.bio}
                    onChange={e => setEditData({ ...editData, bio: e.target.value })}
                    className="ep-input ep-textarea"
                    placeholder="Tell us a bit about yourself..."
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>
            </form>

            {/* ── Footer ── */}
            <div className="ep-footer">
              <button type="button" className="ep-btn-close" onClick={() => setIsModalOpen(false)}>
                Close
              </button>
              <button type="submit" form="ep-form" disabled={isSubmitting} className="ep-btn-save">
                {isSubmitting ? 'Saving…' : 'Save'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Referral Code Modal */}
      {isReferralModalOpen && (
        <div
          className="ep-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setIsReferralModalOpen(false); }}
        >
          <div className="ep-modal" style={{ maxWidth: '480px' }}>
            <div className="ep-topbar">
              <h2 className="ep-title">My Referral Code</h2>
              <button
                className="ep-close"
                type="button"
                onClick={() => setIsReferralModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="ep-body" style={{ display: 'block', padding: '1.5rem 1.75rem' }}>
              <p style={{ fontSize: '0.88rem', color: '#6b5b6d', marginTop: 0, marginBottom: '1.25rem', lineHeight: 1.55 }}>
                Share this code with friends. You'll earn <strong>5 Star Points</strong> each time someone signs up using it.
              </p>

              <div
                style={{
                  background: '#fdf7fb',
                  border: '1.5px dashed #ad246d',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  textAlign: 'center',
                  marginBottom: '1.25rem'
                }}
              >
                <p style={{ margin: 0, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#8c7895', fontWeight: 700 }}>
                  Your code
                </p>
                <p
                  style={{
                    margin: '0.5rem 0 0',
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '1.8rem',
                    fontWeight: 800,
                    color: '#ad246d',
                    letterSpacing: '0.08em'
                  }}
                >
                  {referralCode === 'NOT-GENERATED' ? '— — — — — —' : referralCode}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  disabled={referralCode === 'NOT-GENERATED'}
                  style={{
                    flex: '1 1 120px',
                    padding: '0.65rem 1rem',
                    borderRadius: '12px',
                    border: '1.5px solid #ead7e8',
                    background: '#fff',
                    color: '#4a3452',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: referralCode === 'NOT-GENERATED' ? 'not-allowed' : 'pointer',
                    opacity: referralCode === 'NOT-GENERATED' ? 0.5 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <i className='bx bx-copy'></i> Copy
                </button>
                <button
                  type="button"
                  onClick={shareCode}
                  disabled={referralCode === 'NOT-GENERATED'}
                  style={{
                    flex: '1 1 120px',
                    padding: '0.65rem 1rem',
                    borderRadius: '12px',
                    border: '1.5px solid #ead7e8',
                    background: '#fff',
                    color: '#4a3452',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: referralCode === 'NOT-GENERATED' ? 'not-allowed' : 'pointer',
                    opacity: referralCode === 'NOT-GENERATED' ? 0.5 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <i className='bx bx-share-alt'></i> Share
                </button>
                {referralCode === 'NOT-GENERATED' && (
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    disabled={isGeneratingCode}
                    style={{
                      flex: '1 1 160px',
                      padding: '0.65rem 1rem',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#ad246d',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: isGeneratingCode ? 'not-allowed' : 'pointer',
                      opacity: isGeneratingCode ? 0.7 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 4px 12px rgba(173, 36, 109, 0.25)'
                    }}
                  >
                    <i className='bx bx-refresh'></i>
                    {isGeneratingCode ? 'Generating…' : 'Generate Code'}
                  </button>
                )}
              </div>
            </div>
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
