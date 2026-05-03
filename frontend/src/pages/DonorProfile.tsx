import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';

const DonorProfile: React.FC = () => {
  const { user, setUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editData, setEditData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

  const initials = user ? (user.firstName?.[0] || user.name?.[0] || 'U').toUpperCase() + (user.lastName?.[0] || '').toUpperCase() : '??';
  const fullName = user ? (user.firstName ? `${user.firstName} ${user.lastName}` : user.name) : 'Donor';

  // Simple pseudo-hash for referral code (to match Blade's md5 logic if possible, or just similar format)
  const referralCode = `HL-${(user?.id || '0').toString().padStart(8, '0').slice(-8).toUpperCase()}`;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('first_name', editData.firstName);
      formData.append('last_name', editData.lastName);
      formData.append('phone', editData.phone);
      formData.append('bio', editData.bio);
      if (profilePhoto) {
        formData.append('profile_photo', profilePhoto);
      }

      const res = await apiClient.post('/internal-api/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUser(res.data.user);
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
      <header className="profile-head">
        <h1>My Profile</h1>
        <p>View your donor account details and contact information.</p>
      </header>

      {/* Profile Hero */}
      <div className="profile-hero flex items-center gap-6 p-6 bg-gradient-to-r from-[#fdf7fb] to-white rounded-2xl border border-[#f2ebf4] mb-8 shadow-sm transition-all hover:shadow-md">
        <div className="relative group">
          <div className="profile-avatar w-24 h-24 rounded-full bg-[#ad246d] text-white flex items-center justify-center text-3xl font-black shadow-inner border-4 border-white overflow-hidden">
            {user?.profilePhotoUrl ? (
              <img src={user.profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <button type="button" className="absolute bottom-0 right-0 bg-[#ad246d] text-white p-2 rounded-full shadow-lg border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setIsModalOpen(true)}>
            <i className='bx bxs-camera'></i>
          </button>
        </div>
        
        <div>
          <p className="profile-name text-2xl font-black text-[#ad246d] mb-1 leading-tight">{fullName}</p>
          <span className="profile-role inline-flex items-center px-3 py-1 bg-[#fdf7fb] text-[#ad246d] text-xs font-black rounded-full border border-[#f2ebf4] uppercase tracking-widest">
            {user?.role?.toUpperCase() || 'DONOR'}
          </span>
        </div>
        
        <div className="ml-auto">
          <button type="button" className="soft-btn flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
            <i className='bx bx-edit-alt'></i> Edit Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <article className="bg-white p-6 rounded-2xl border border-[#f2ebf4] shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-[#f2ebf4] pb-4">
              <i className='bx bx-id-card text-[#ad246d] text-2xl'></i>
              <h2 className="text-xl font-black text-gray-800 tracking-tight">Personal Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-widest font-black text-[#ad246d] mb-1">Email Address</label>
                <span className="text-gray-700 font-bold">{user?.email}</span>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-widest font-black text-[#ad246d] mb-1">Phone Number</label>
                <span className="text-gray-700 font-bold">{user?.phone || 'Not set'}</span>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-widest font-black text-[#ad246d] mb-1">Age</label>
                <span className="text-gray-700 font-bold">{user?.age || 'Not set'}</span>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-widest font-black text-[#ad246d] mb-1">Gender</label>
                <span className="text-gray-700 font-bold capitalize">{user?.gender || 'Not set'}</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#f2ebf4]">
              <label className="text-[10px] uppercase tracking-widest font-black text-[#ad246d] mb-2 block">Short Bio</label>
              <p className="text-[#5d4d62] text-sm leading-relaxed italic">
                {user?.bio || 'No bio provided. Tell us a bit about why you donate!'}
              </p>
            </div>
          </article>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <article className="bg-white p-6 rounded-2xl border border-[#f2ebf4] shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <i className='bx bxs-gift text-6xl text-[#ad246d]'></i>
            </div>
            <h3 className="text-sm font-black text-[#ad246d] uppercase tracking-widest mb-4">Referral Reward</h3>
            <div className="bg-[#fdf7fb] p-4 rounded-xl border border-[#ead7e8] mb-4">
              <span className="block text-2xl font-black text-[#ad246d] tracking-widest mb-1">{referralCode}</span>
              <p className="text-[10px] text-[#8c7895] font-bold uppercase tracking-widest leading-none">Share to earn 5 points per donor</p>
            </div>
            <button className="w-full py-3 bg-[#ad246d] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md hover:bg-[#cf2f84] transition-all flex items-center justify-center gap-2" onClick={copyToClipboard}>
              <i className='bx bx-copy'></i> Copy Code
            </button>
          </article>

          <article className="bg-gradient-to-br from-[#ad246d] to-[#cf2f84] p-6 rounded-2xl shadow-lg text-white">
            <div className="flex items-center gap-2 mb-4">
              <i className='bx bxs-star-half text-2xl'></i>
              <h3 className="text-sm font-black uppercase tracking-widest">Impact Stats</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-white/20 pb-2">
                <span className="text-xs font-bold text-white/80">Account Type</span>
                <span className="font-black tracking-widest uppercase text-xs">{user?.role}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-white/80">Joined</span>
                <span className="font-black text-xs">{user ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}</span>
              </div>
            </div>
          </article>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#2d1136]/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
            <header className="p-6 border-b border-[#f2ebf4] flex justify-between items-center bg-[#fdf7fb]">
              <h2 className="text-xl font-black text-[#ad246d] tracking-tight">Edit Your Profile</h2>
              <button type="button" className="text-[#8c7895] hover:text-[#ad246d]" onClick={() => setIsModalOpen(false)}>
                <i className='bx bx-x text-3xl'></i>
              </button>
            </header>
            
            <form onSubmit={handleUpdate} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group flex flex-col">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#ad246d] mb-1">First Name</label>
                  <input 
                    type="text" 
                    value={editData.firstName} 
                    onChange={e => setEditData({...editData, firstName: e.target.value})}
                    className="border-2 border-[#ead7e8] rounded-xl p-3 focus:border-[#ad246d] focus:outline-none font-bold text-gray-700" 
                  />
                </div>
                <div className="form-group flex flex-col">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#ad246d] mb-1">Last Name</label>
                  <input 
                    type="text" 
                    value={editData.lastName} 
                    onChange={e => setEditData({...editData, lastName: e.target.value})}
                    className="border-2 border-[#ead7e8] rounded-xl p-3 focus:border-[#ad246d] focus:outline-none font-bold text-gray-700" 
                  />
                </div>
              </div>

              <div className="form-group flex flex-col">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#ad246d] mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={editData.phone} 
                  onChange={e => setEditData({...editData, phone: e.target.value})}
                  className="border-2 border-[#ead7e8] rounded-xl p-3 focus:border-[#ad246d] focus:outline-none font-bold text-gray-700" 
                />
              </div>

              <div className="form-group flex flex-col">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#ad246d] mb-1">Quick Bio</label>
                <textarea 
                  rows={3} 
                  value={editData.bio} 
                  onChange={e => setEditData({...editData, bio: e.target.value})}
                  className="border-2 border-[#ead7e8] rounded-xl p-3 focus:border-[#ad246d] focus:outline-none font-medium text-gray-600 resize-none"
                ></textarea>
              </div>

              <div className="form-group flex flex-col">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#ad246d] mb-1">Profile Photo</label>
                <div className="relative">
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    onChange={e => setProfilePhoto(e.target.files?.[0] || null)}
                  />
                  <div className="p-4 border-2 border-dashed border-[#ead7e8] rounded-xl flex items-center justify-center gap-3 bg-[#fafafa]">
                    <i className='bx bx-cloud-upload text-2xl text-[#ad246d]'></i>
                    <span className="text-xs font-bold text-[#8c7895]">
                      {profilePhoto ? profilePhoto.name : 'Select new image (JPG/PNG/WEBP)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-gradient-to-r from-[#ad246d] to-[#cf2f84] text-white font-black uppercase tracking-widest rounded-2xl shadow-lg hover:shadow-xl transition-all">
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" className="px-8 py-4 bg-gray-100 text-gray-500 font-black uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default DonorProfile;
