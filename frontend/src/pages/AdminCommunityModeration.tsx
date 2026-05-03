import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';

const AdminCommunityModeration: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await apiClient.get('/internal-api/admin/community');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch community data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/internal-api/admin/community/${postId}`);
      fetchData();
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <div className="section-wrap">Loading community moderation...</div>;

  return (
    <section className="section-wrap reveal active admin-page">
      <header style={{ padding: '0.6rem 0 0.2rem' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ad246d', marginBottom: '0.2rem' }}>Admin · Community</p>
        <h1 style={{ fontSize: '2.1rem', color: '#261d2b', margin: 0 }}>Community Moderation</h1>
        <p style={{ color: '#665772', fontSize: '0.88rem', marginTop: '0.25rem' }}>Moderate posts, approve threads, and manage community announcements.</p>
      </header>

      <div className="inv-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
        {[
          { label: 'Total Posts', count: data.posts.length },
          { label: 'Recent (7d)', count: data.recentCount },
          { label: 'Pinned', count: 3 },
          { label: 'Flagged', count: 0 },
        ].map((item, i) => (
          <div key={i} className="inv-summary-item" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1.25rem', textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '0.8rem', color: '#8c7895', fontWeight: 700 }}>{item.label}</span>
            <strong style={{ fontSize: '1.75rem', color: '#ad246d' }}>{item.count}</strong>
          </div>
        ))}
      </div>

      <article className="admin-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '24px', padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 1.5rem 0' }}><i className='bx bx-time-five' style={{ color: '#ad246d' }}></i> Recent Community Posts</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Author</th>
                <th>Role</th>
                <th>Content Preview</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.posts.map((post: any) => (
                <tr key={post.id}>
                  <td>{post.user?.firstName} {post.user?.lastName}</td>
                  <td><span className={`role-badge ${post.user?.role}`}>{post.user?.role?.toUpperCase()}</span></td>
                  <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.content}</td>
                  <td>{new Date(post.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button 
                      className="ghost-btn" 
                      onClick={() => handleDelete(post.id)}
                      disabled={isDeleting}
                      style={{ color: '#ad246d', fontSize: '0.75rem' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="admin-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '24px', padding: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1.5rem 0' }}><i className='bx bx-pin' style={{ color: '#ad246d' }}></i> Pinned Announcements</h2>
        <div className="event-list" style={{ display: 'grid', gap: '1rem' }}>
          {[
            { title: 'New Hair Donation Policy', desc: 'Minimum length is now 10 inches.' },
            { title: 'Wig Request Portal Open', desc: 'Online submissions now accepted.' },
          ].map((pin, i) => (
            <div key={i} className="event-item" style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#fdf7fb', borderRadius: '12px' }}>
              <div style={{ background: '#ad246d', color: '#fff', padding: '0.5rem', borderRadius: '8px', display: 'grid', placeItems: 'center' }}>
                <i className='bx bx-pin'></i>
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0' }}>{pin.title}</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#8c7895' }}>{pin.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
};

export default AdminCommunityModeration;
