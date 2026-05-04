import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import type { WigProduction, StatusHistory } from '../types';
import StatusPill from '../components/StatusPill';

// Static data removed

const WigmakerTaskDetail: React.FC = () => {
  const { taskCode } = useParams<{ taskCode: string }>();
  const [data, setData] = useState<{ task: any; histories: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await apiClient.get(`/internal-api/wigmaker/tasks/${taskCode}`);
        if (res.data.task) {
          setData(res.data);
        }
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
    
    let nextStatus = 'processing';
    if (data.task.status === 'processing') nextStatus = 'completed';
    
    formData.append('status', nextStatus);
    formData.append('progressNotes', notes);
    if (file) formData.append('previewPhoto', file);

    try {
      await apiClient.post(`/internal-api/wigmaker/tasks/${taskCode}`, formData);
      alert('Task updated successfully!');
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!data) return <div className="wigmaker-page staff-page" style={{ padding: '2rem', textAlign: 'center' }}>Task not found.</div>;

  const { task, histories } = data;
  const isCompleted = task.status === 'completed';
  const nextLabel = task.status === 'assigned' ? 'In Progress' : 'Completed';

  return (
    <section className="wigmaker-page reveal active staff-page">
      <div className="section-title-block" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Task {task.taskCode}</h1>
          <p style={{ fontSize: '0.8rem', color: '#8c7895', marginTop: '0.2rem' }}>Review assignment details and update production progress.</p>
        </div>
        <Link to="/wigmaker/dashboard" style={{ height: '32px', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '8px', border: '1px solid #ead7e8', color: '#5d4d62', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none', background: '#fff' }}>
          <i className='bx bx-arrow-back'></i> Back to Dashboard
        </Link>
      </div>

      <div className="task-detail-shell">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Assignment Snapshot */}
          <article style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
              <i className='bx bxs-info-circle' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Assignment Snapshot</h2>
            </div>
            <div style={{ display: 'grid', gap: '0.8rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8c7895' }}>Inventory Ref:</span>
                <strong style={{ color: '#ad246d' }}>{task.donation?.reference || 'N/A'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8c7895' }}>Wig Specification:</span>
                <strong style={{ color: '#3b2e43' }}>{task.targetLength} / {task.targetColor}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8c7895' }}>Production Window:</span>
                <strong style={{ fontSize: '0.75rem', color: '#5d4d62' }}>{new Date(task.createdAt).toLocaleDateString()} — {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'TBD'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                <span style={{ color: '#8c7895' }}>Current Stage:</span>
                <StatusPill status={task.status} />
              </div>
            </div>
          </article>

          {/* Material Snapshot */}
          <article style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
              <i className='bx bx-images' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Original Hair Material</h2>
            </div>
            <div style={{ display: 'flex', gap: '1rem', background: '#fdf7fb', padding: '1rem', borderRadius: '15px', border: '1px solid #ead7e8' }}>
              {[task.donation?.photoFront, task.donation?.photoSide].filter(Boolean).map((img, idx) => (
                <div key={idx} style={{ width: '80px', height: '80px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #ead7e8', background: '#fff' }}>
                  <img src={img} alt="Material" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
              {![task.donation?.photoFront, task.donation?.photoSide].filter(Boolean).length && (
                <div style={{ fontSize: '0.75rem', color: '#8c7895', fontStyle: 'italic' }}>No material photos available.</div>
              )}
            </div>
          </article>

          {/* Task Roadmap */}
          <article style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
              <i className='bx bx-git-commit' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Task Roadmap</h2>
            </div>
            <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid #ead7e8', display: 'grid', gap: '1rem' }}>
              {[
                { stage: 'Stage 1: Assigned', desc: 'Material delivery confirmed', done: true },
                { stage: 'Stage 2: In Progress', desc: 'Wig construction & styling', done: task.status !== 'assigned' },
                { stage: 'Stage 3: Completed', desc: 'Quality check & delivery', done: task.status === 'completed' }
              ].map((step, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-1.9rem', top: '0.2rem', width: '10px', height: '10px', borderRadius: '50%', background: step.done ? '#ad246d' : '#ead7e8', border: '2px solid #fff', boxShadow: '0 0 0 2px ' + (step.done ? '#ad246d' : '#ead7e8') }}></div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: step.done ? '#3b2e43' : '#8c7895' }}>{step.stage}</div>
                  <div style={{ fontSize: '0.7rem', color: '#8c7895' }}>{step.desc}</div>
                </div>
              ))}
            </div>
          </article>
        </div>

        {/* Update Form */}
        {!isCompleted ? (
          <article style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', padding: '2rem', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
              <i className='bx bx-edit-alt' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Update Production Status</h2>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8c7895' }}>Transitioning To</label>
                  <input type="text" value={nextLabel} readOnly style={{ height: '40px', padding: '0 1rem', borderRadius: '10px', border: '1px solid #f1a8cf', background: '#fdf7fb', color: '#ad246d', fontWeight: 800, fontSize: '0.85rem' }} />
                </div>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8c7895' }}>Update Timestamp</label>
                  <input type="text" value={new Date().toLocaleString()} readOnly style={{ height: '40px', padding: '0 1rem', borderRadius: '10px', border: '1px solid #ead7e8', background: '#fdf7fb', color: '#5d4d62', fontSize: '0.85rem' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8c7895' }}>Progress Message <span style={{ color: '#ad246d' }}>*</span></label>
                <textarea rows={3} placeholder="Describe your current progress for staff review..." value={notes} onChange={e => setNotes(e.target.value)} required style={{ padding: '1rem', borderRadius: '10px', border: '1px solid #ead7e8', fontSize: '0.85rem', outline: 'none' }}></textarea>
              </div>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8c7895' }}>Attach Progress Photo (Optional)</label>
                <div style={{ border: '2px dashed #ead7e8', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', background: '#fafafa', cursor: 'pointer' }}>
                  <i className='bx bx-image-add' style={{ fontSize: '2rem', color: '#ad246d', marginBottom: '0.4rem', display: 'block' }}></i>
                  <span style={{ fontSize: '0.75rem', color: '#8c7895', fontWeight: 600 }}>Click to upload progress photo</span>
                  <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="submit" disabled={isSubmitting} style={{ height: '42px', padding: '0 2rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #ad246d 0%, #cf2f84 100%)', color: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                  {isSubmitting ? 'Saving...' : 'Save Production Update'}
                </button>
              </div>
            </form>
          </article>
        ) : (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '2rem', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <i className='bx bxs-check-circle' style={{ fontSize: '2.5rem' }}></i>
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#166534', margin: 0 }}>Production Completed</h3>
              <p style={{ fontSize: '0.85rem', color: '#166534', margin: '0.2rem 0 0 0', opacity: 0.8 }}>This task has been finalized and verified by the inventory system.</p>
            </div>
          </div>
        )}

        {/* Update History */}
        <article style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
            <i className='bx bx-history' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Production Update History</h2>
          </div>
          <div style={{ border: '1px solid #ead7e8', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fdf7fb', borderBottom: '1px solid #ead7e8' }}>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#ad246d', textTransform: 'uppercase' }}>Timestamp</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#ad246d', textTransform: 'uppercase' }}>Stage</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#ad246d', textTransform: 'uppercase' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {histories.map((h, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #ead7e8' }}>
                    <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#5d4d62' }}>{new Date(h.createdAt).toLocaleString()}</td>
                    <td style={{ padding: '1rem' }}><StatusPill status={h.status} /></td>
                    <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#8c7895' }}>{h.notes || 'No notes provided.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
};

export default WigmakerTaskDetail;
