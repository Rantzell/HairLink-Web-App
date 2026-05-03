import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import type { WigProduction, StatusHistory } from '../types';
import StatusPill from '../components/StatusPill';

const WigmakerTaskDetail: React.FC = () => {
  const { taskCode } = useParams<{ taskCode: string }>();
  const [data, setData] = useState<{ task: WigProduction; histories: StatusHistory[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await apiClient.get(`/internal-api/wigmaker/tasks/${taskCode}`);
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch task detail', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [taskCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    if (!notes) { alert('Please provide progress notes.'); return; }

    setIsSubmitting(true);
    const formData = new FormData();
    
    // Linear transition logic
    let nextStatus = 'processing';
    if (data.task.status === 'processing') nextStatus = 'completed';
    
    formData.append('status', nextStatus);
    formData.append('progressNotes', notes);
    if (file) formData.append('previewPhoto', file);

    try {
      await apiClient.post(`/internal-api/wigmaker/tasks/${taskCode}`, formData);
      alert('Task updated successfully!');
      window.location.reload(); // Refresh to show new state
    } catch (err: any) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="section-wrap">Loading task...</div>;
  if (!data) return <div className="section-wrap">Task not found.</div>;

  const { task, histories } = data;
  const isCompleted = task.status === 'completed';
  const nextLabel = task.status === 'assigned' ? 'In Progress' : 'Completed';

  return (
    <section className="section-wrap reveal active wigmaker-page">
      <div className="section-title-block">
        <h1>Task {task.taskCode}</h1>
        <p>Update production progress and notes for this assigned wig build.</p>
      </div>

      <article className="task-detail-shell">
        <div className="task-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="assignment-snapshot-pane" style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #f2ebf4', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <i className='bx bxs-info-circle' style={{ color: '#ad246d', fontSize: '1.5rem' }}></i>
              <h2 style={{ margin: 0 }}>Assignment Snapshot</h2>
            </div>
            <ul className="task-meta-list" style={{ listStyle: 'none', padding: 0, fontSize: '0.9rem' }}>
              <li style={{ marginBottom: '0.5rem' }}><strong>Inventory Ref:</strong> <span style={{ color: '#ad246d', fontWeight: 800 }}>{task.donation?.reference || 'N/A'}</span></li>
              <li style={{ marginBottom: '0.5rem' }}><strong>Spec:</strong> {task.targetLength} / {task.targetColor}</li>
              <li style={{ marginBottom: '0.5rem' }}><strong>Window:</strong> {new Date(task.createdAt).toLocaleDateString()} — {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'TBD'}</li>
            </ul>
          </div>

          <div className="material-snapshot-pane" style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #f2ebf4', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <i className='bx bx-images' style={{ color: '#ad246d', fontSize: '1.5rem' }}></i>
              <h2 style={{ margin: 0 }}>Material Photos</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {task.donation?.photoFront && (
                <a href={task.donation.photoFront} target="_blank" rel="noreferrer" style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ead7e8' }}>
                  <img src={task.donation.photoFront} alt="Front" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </a>
              )}
              {task.donation?.photoSide && (
                <a href={task.donation.photoSide} target="_blank" rel="noreferrer" style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ead7e8' }}>
                  <img src={task.donation.photoSide} alt="Side" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </a>
              )}
            </div>
          </div>
        </div>
      </article>

      {!isCompleted ? (
        <article className="task-update-shell" style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #f2ebf4', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
            <i className='bx bx-edit-alt' style={{ color: '#ad246d', fontSize: '1.5rem' }}></i>
            <h2 style={{ margin: 0 }}>Update Production Status</h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Transitioning To</label>
              <input type="text" value={nextLabel} readOnly style={{ background: '#fdf7fb', border: '1px solid #f1a8cf', color: '#ad246d', fontWeight: 800, padding: '0.6rem 1rem', width: '100%', borderRadius: '8px' }} />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Progress Message</label>
              <textarea 
                rows={3} 
                placeholder="Describe your current progress..." 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ width: '100%', borderRadius: '12px', border: '1px solid #ead7e8', padding: '1rem' }}
              ></textarea>
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Attach Progress Photo (Optional)</label>
              <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="form-actions" style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="soft-btn" disabled={isSubmitting} style={{ padding: '0.8rem 2rem' }}>
                {isSubmitting ? 'Saving...' : 'Save Production Update'}
              </button>
              <Link to="/wigmaker/dashboard" className="ghost-btn">Cancel</Link>
            </div>
          </form>
        </article>
      ) : (
        <div className="completion-banner" style={{ background: '#f0fdf4', color: '#166534', padding: '2rem', borderRadius: '16px', border: '1px solid #bbf7d0', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <i className='bx bxs-check-circle' style={{ fontSize: '2.5rem', color: '#16a34a' }}></i>
          <div>
            <strong style={{ fontSize: '1.25rem', display: 'block' }}>Production Completed</strong>
            <p style={{ margin: 0 }}>This task has been finalized and synced with the inventory system.</p>
          </div>
        </div>
      )}

      <article className="task-history-shell">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <i className='bx bx-history' style={{ color: '#ad246d', fontSize: '1.5rem' }}></i>
          <h2 style={{ margin: 0 }}>Production History</h2>
        </div>
        <div className="table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th style={{ width: '70px', textAlign: 'center' }}>Photo</th>
                <th>Stage</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {histories.map((h, i) => (
                <tr key={i}>
                  <td>{new Date(h.createdAt).toLocaleString()}</td>
                  <td style={{ textAlign: 'center' }}>
                    {h.metadata?.preview_photo ? (
                      <a href={h.metadata.preview_photo} target="_blank" rel="noreferrer" style={{ width: '50px', height: '50px', display: 'block', margin: '0 auto' }}>
                        <img src={h.metadata.preview_photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                      </a>
                    ) : '---'}
                  </td>
                  <td><StatusPill status={h.status} /></td>
                  <td style={{ fontSize: '0.85rem' }}>{h.notes || '---'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
};

export default WigmakerTaskDetail;
