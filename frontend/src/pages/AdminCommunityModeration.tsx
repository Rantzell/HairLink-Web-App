import React, { useState, useEffect } from 'react';
import '../styles/Admin.css';
import apiClient from '../api/client';
import ConfirmModal from '../components/ConfirmModal';

const AdminCommunityModeration: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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

  const handleDelete = (postId: string) => {
    setPendingDeleteId(postId);
    setShowDeleteConfirm(true);
  };

  const doDelete = async () => {
    if (!pendingDeleteId) return;
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      await apiClient.delete(`/internal-api/admin/community/${pendingDeleteId}`);
      fetchData();
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
    }
  };

  if (loading) return <div className="section-wrap">Loading community moderation...</div>;

  return (
    <section className="section-wrap reveal active admin-page">
      <header className="admin-page-header">
        <p className="admin-page-kicker">Admin · Community</p>
        <h1 className="admin-page-title-lg">Community Moderation</h1>
        <p className="admin-page-subtitle-lg">Moderate posts, approve threads, and manage community announcements.</p>
      </header>

      <div className="inv-summary-grid admin-summary-grid">
        {[
          { label: 'Total Posts', count: data.posts.length },
          { label: 'Recent (7d)', count: data.recentCount },
          { label: 'Pinned', count: 3 },
          { label: 'Flagged', count: 0 },
        ].map((item, i) => (
          <div key={i} className="inv-summary-item admin-summary-item">
            <span className="admin-summary-label">{item.label}</span>
            <strong className="admin-summary-value">{item.count}</strong>
          </div>
        ))}
      </div>

      <article className="admin-card admin-card-rounded-mb">
        <h2 className="admin-card-title"><i className="bx bx-time-five admin-icon-pink"></i> Recent Community Posts</h2>
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
                  <td className="admin-td-ellipsis">{post.content}</td>
                  <td>{new Date(post.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button 
                      className="ghost-btn admin-delete-btn"
                      onClick={() => handleDelete(post.id)}
                      disabled={isDeleting}
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

      <article className="admin-card admin-card-rounded">
        <h2 className="admin-card-title"><i className="bx bx-pin admin-icon-pink"></i> Pinned Announcements</h2>
        <div className="event-list admin-form-grid">
          {[
            { title: 'New Hair Donation Policy', desc: 'Minimum length is now 10 inches.' },
            { title: 'Wig Request Portal Open', desc: 'Online submissions now accepted.' },
          ].map((pin, i) => (
            <div key={i} className="event-item admin-event-item">
              <div className="admin-pin-icon">
                <i className='bx bx-pin'></i>
              </div>
              <div>
                <h4 className="admin-event-title">{pin.title}</h4>
                <p className="admin-event-meta">{pin.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </article>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setPendingDeleteId(null); }}
        onConfirm={doDelete}
        title="Delete Community Post"
        message="Are you sure you want to permanently delete this post? This action cannot be undone."
        confirmText="Yes, Delete Post"
        variant="danger"
        isConfirming={isDeleting}
      />
    </section>
  );
};

export default AdminCommunityModeration;
