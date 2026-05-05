import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';

const AdminCMS: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'announcements' | 'partnerships'>('announcements');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', category: 'Care', author: 'Admin' });
  const [partnershipForm, setPartnershipForm] = useState({ name: '', type: 'Wigmaker', contact: '', email: '', description: '', status: 'Active' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [annRes, partRes] = await Promise.all([
        apiClient.get('/internal-api/admin/announcements'),
        apiClient.get('/internal-api/admin/partnerships')
      ]);
      setAnnouncements(annRes.data);
      setPartnerships(partRes.data);
    } catch (err) {
      console.error('Failed to fetch CMS data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/internal-api/admin/announcements', announcementForm);
      setAnnouncementForm({ title: '', content: '', category: 'Care', author: 'Admin' });
      fetchData();
    } catch (err) {
      console.error('Failed to create announcement', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePartnership = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/internal-api/admin/partnerships', partnershipForm);
      setPartnershipForm({ name: '', type: 'Wigmaker', contact: '', email: '', description: '', status: 'Active' });
      fetchData();
    } catch (err) {
      console.error('Failed to create partnership', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="section-wrap">Loading CMS...</div>;

  return (
    <section className="section-wrap reveal active admin-page" style={{ padding: '1rem' }}>
      <header style={{ padding: '0.2rem 0' }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ad246d', marginBottom: '0.1rem' }}>Admin · CMS</p>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#261d2b', margin: 0 }}>Content Management</h1>
        <p style={{ color: '#665772', fontSize: '0.75rem', marginTop: '0.1rem' }}>Manage announcements, advocacy materials, and partnership details.</p>
      </header>

      <div className="tabs-navigation" style={{ display: 'flex', gap: '1rem', margin: '1rem 0', borderBottom: '1px solid #ead7e8' }}>
        <button onClick={() => setActiveTab('announcements')} className={`tab-btn ${activeTab === 'announcements' ? 'active' : ''}`} style={{ padding: '0.5rem 1rem' }}>Announcements</button>
        <button onClick={() => setActiveTab('partnerships')} className={`tab-btn ${activeTab === 'partnerships' ? 'active' : ''}`} style={{ padding: '0.5rem 1rem' }}>Partnerships</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        <div>
          {activeTab === 'announcements' ? (
            <article className="admin-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1rem' }}>
              <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}><i className='bx bx-news'></i> Published Announcements</h2>
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Author</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {announcements.map(a => (
                      <tr key={a.id}>
                        <td><strong>{a.title}</strong></td>
                        <td>{a.category}</td>
                        <td>{a.author}</td>
                        <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ) : (
            <article className="admin-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1rem' }}>
              <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}><i className='bx bx-briefcase'></i> Active Partnerships</h2>
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Partner</th>
                      <th>Type</th>
                      <th>Contact</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partnerships.map(p => (
                      <tr key={p.id}>
                        <td><strong>{p.name}</strong></td>
                        <td>{p.type}</td>
                        <td>{p.email || p.contact}</td>
                        <td>{p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          )}
        </div>

        <aside>
          {activeTab === 'announcements' ? (
            <article className="admin-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1rem' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>New Announcement</h3>
              <form onSubmit={handleCreateAnnouncement} style={{ display: 'grid', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Title</label>
                  <input type="text" value={announcementForm.title} onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Category</label>
                  <select value={announcementForm.category} onChange={e => setAnnouncementForm({...announcementForm, category: e.target.value})}>
                    <option value="Care">Wig Care</option>
                    <option value="Styling">Styling</option>
                    <option value="Advocacy">Advocacy</option>
                    <option value="Update">System Update</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Content</label>
                  <textarea rows={5} value={announcementForm.content} onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})} required></textarea>
                </div>
                <button type="submit" className="soft-btn" disabled={isSubmitting}>Publish</button>
              </form>
            </article>
          ) : (
            <article className="admin-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1rem' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>New Partnership</h3>
              <form onSubmit={handleCreatePartnership} style={{ display: 'grid', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Organization Name</label>
                  <input type="text" value={partnershipForm.name} onChange={e => setPartnershipForm({...partnershipForm, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Type</label>
                  <input type="text" value={partnershipForm.type} onChange={e => setPartnershipForm({...partnershipForm, type: e.target.value})} placeholder="e.g. Wigmaker, Logistics" />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Email / Contact</label>
                  <input type="text" value={partnershipForm.email} onChange={e => setPartnershipForm({...partnershipForm, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Status</label>
                  <select value={partnershipForm.status} onChange={e => setPartnershipForm({...partnershipForm, status: e.target.value})}>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <button type="submit" className="soft-btn" disabled={isSubmitting}>Save Partner</button>
              </form>
            </article>
          )}
        </aside>
      </div>
    </section>
  );
};

export default AdminCMS;
