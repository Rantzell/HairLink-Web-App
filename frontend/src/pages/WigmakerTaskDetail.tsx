import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import type { WigProduction, StatusHistory } from '../types';
import StatusPill from '../components/StatusPill';
import LoadingScreen from '../components/LoadingScreen';
import { getPublicUrl } from '../lib/storage';

// Static data removed

const WigmakerTaskDetail: React.FC = () => {
  const { taskCode } = useParams<{ taskCode: string }>();
  const [data, setData] = useState<{ task: any; histories: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 16));

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
    if (!notes) return;

    setIsSubmitting(true);
    const formData = new FormData();
    const finalStatus = targetStatus || nextStatus;
    
    formData.append('status', finalStatus);
    formData.append('progressNotes', notes);
    formData.append('updatedAt', new Date(customDate).toISOString());
    if (file) formData.append('previewPhoto', file);
    if (task.deliveryLink) formData.append('deliveryLink', task.deliveryLink);

    try {
      await apiClient.post(`/internal-api/wigmaker/tasks/${taskCode}`, formData);
      window.location.reload();
    } catch (err: any) {
      console.error('Update failed:', err);
    } finally {
      setIsSubmitting(false);
      setTargetStatus(null);
    }
  };

  const handleConfirmMaterial = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.post(`/internal-api/wigmaker/tasks/${taskCode}/confirm-material`);
      window.location.reload();
    } catch (err: any) {
      console.error('Confirmation failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!data) return <div className="wigmaker-page staff-page" style={{ padding: '5rem', textAlign: 'center', color: '#8c7895' }}>Task not found.</div>;

  const { task, histories } = data;
  const isCompleted = task.status === 'received';
  const nextStatus = task.status === 'processing' ? 'completed' : 'shipped';
  const nextLabel = task.status === 'processing' ? 'Completed: Finished & Quality Check' : 'Shipping: Returning to staff';
  const currentLabel = task.status === 'processing' ? 'In Progress: Wig construction & styling' :
    task.status === 'completed' ? 'Completed: Finished & Quality Check' :
      task.status === 'shipped' ? 'Shipping: Returning to staff' : 'Assigned';

  return (
    <section className="wigmaker-page reveal active staff-page" style={{ maxWidth: '100%', margin: '0', padding: '1.5rem 2.5rem' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#fff', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid #ead7e8', boxShadow: '0 4px 15px rgba(173, 36, 109, 0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#fdf2f8', width: '42px', height: '42px', borderRadius: '10px', display: 'grid', placeItems: 'center' }}>
            <i className='bx bx-task' style={{ color: '#ad246d', fontSize: '1.3rem' }}></i>
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Task: {task.taskCode}</h1>
            <p style={{ fontSize: '0.75rem', color: '#8c7895', margin: 0 }}>Production ID: <span style={{ color: '#ad246d', fontWeight: 700 }}>{task.donation?.reference || 'N/A'}</span></p>
          </div>
        </div>
        <Link 
          to="/wigmaker/dashboard" 
          style={{ 
            padding: '0.35rem 0.8rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            borderRadius: '8px', 
            border: '1.5px solid #ead7e8', 
            color: '#ad246d', 
            fontSize: '0.7rem', 
            fontWeight: 800, 
            textDecoration: 'none', 
            background: '#fff' 
          }}
        >
          <i className='bx bx-left-arrow-alt'></i> Back to Dashboard
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Main Column */}
        <div style={{ display: 'grid', gap: '1.5rem' }}>

          {/* Details & Material Combined */}
          <article style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 200px', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
                <i className='bx bxs-info-circle' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Assignment Details</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.82rem' }}>
                <div style={{ background: '#fdf7fb', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #f8eaf1' }}>
                  <span style={{ display: 'block', color: '#8c7895', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, marginBottom: '2px' }}>Inventory Ref</span>
                  <strong style={{ color: '#ad246d', fontSize: '0.9rem' }}>{task.donation?.reference || 'N/A'}</strong>
                </div>
                <div style={{ background: '#fdf7fb', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #f8eaf1' }}>
                  <span style={{ display: 'block', color: '#8c7895', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, marginBottom: '2px' }}>Specification</span>
                  <strong style={{ color: '#3b2e43', fontSize: '0.9rem' }}>{task.targetLength} / {task.targetColor}</strong>
                </div>
                <div style={{ background: '#fdf7fb', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #f8eaf1' }}>
                  <span style={{ display: 'block', color: '#8c7895', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, marginBottom: '2px' }}>Started On</span>
                  <strong style={{ color: '#5d4d62' }}>{new Date(task.createdAt).toLocaleDateString()}</strong>
                </div>
                <div style={{ background: '#fdf7fb', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #f8eaf1' }}>
                  <span style={{ display: 'block', color: '#8c7895', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, marginBottom: '2px' }}>Due Date</span>
                  <strong style={{ color: '#5d4d62' }}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'TBD'}</strong>
                </div>
              </div>
            </div>

            <div style={{ borderLeft: '1px dashed #ead7e8', paddingLeft: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <i className='bx bx-images' style={{ color: '#ad246d', fontSize: '1.2rem' }}></i>
                <h2 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Materials</h2>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {[task.donation?.photoFront, task.donation?.photoSide].filter(Boolean).map((img, idx) => (
                  <div key={idx} style={{ width: '85px', height: '85px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #ead7e8', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                    <img src={getPublicUrl('hairlink', img)} alt="Material" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
                {![task.donation?.photoFront, task.donation?.photoSide].filter(Boolean).length && (
                  <div style={{ fontSize: '0.7rem', color: '#8c7895', fontStyle: 'italic' }}>No photos</div>
                )}
              </div>
            </div>
          </article>

          {/* Material Tracking Card (Staff -> Wigmaker) */}
          {task.materialDeliveryLink && task.status === 'assigned' && !task.isReceived && (
            <div style={{ padding: '1.25rem', background: '#f8fafc', border: '1.5px dashed #3b82f6', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ background: '#fff', width: '44px', height: '44px', borderRadius: '10px', display: 'grid', placeItems: 'center', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)', border: '1px solid #dbeafe' }}>
                <i className='bx bx-package' style={{ color: '#3b82f6', fontSize: '1.4rem' }}></i>
              </div>
              <div style={{ flex: 1 }}>
                <small style={{ display: 'block', color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Staff Sent Materials</small>
                <a href={task.materialDeliveryLink} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: '0.9rem', textDecoration: 'underline', fontWeight: 700 }}>Track Incoming Hair Package</a>
              </div>
              <button
                onClick={handleConfirmMaterial}
                disabled={isSubmitting}
                style={{ height: '36px', padding: '0 1rem', borderRadius: '50px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.2)' }}
              >
                {isSubmitting ? '...' : 'Confirm Hair Received'}
              </button>
            </div>
          )}

          {/* Stage 2: Start Production / In Progress Updates */}
          {(task.status === 'processing' || (task.status === 'assigned' && task.isReceived)) && (
            <article style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <i className='bx bx-edit-alt' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Production Status Update</h2>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.25rem' }}>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8c7895', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Current Status</label>
                    <div style={{ height: '42px', padding: '0 1rem', borderRadius: '10px', border: '1.5px solid #f1a8cf', background: '#fdf7fb', color: '#ad246d', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>
                      <i className='bx bx-check-double' style={{ marginRight: '6px' }}></i> {task.status === 'assigned' ? 'Assigned (Materials Received)' : 'In Progress'}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8c7895', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Update Photo (Optional)</label>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      {previewUrl && (
                        <div style={{ position: 'relative', width: '42px', height: '42px', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid #ad246d', flexShrink: 0 }}>
                          <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => { setFile(null); setPreviewUrl(null); }}
                            style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(173, 36, 109, 0.8)', color: '#fff', border: 'none', width: '16px', height: '16px', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: '10px' }}
                          >
                            <i className='bx bx-x'></i>
                          </button>
                        </div>
                      )}
                      <label style={{ flex: 1, minWidth: 0, height: '42px', padding: '0 1rem', borderRadius: '10px', border: '1px solid #ead7e8', background: '#fff', color: '#5d4d62', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', overflow: 'hidden' }}>
                        <i className='bx bx-camera' style={{ color: '#ad246d', flexShrink: 0 }}></i>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{file ? file.name : 'Upload Progress Photo'}</span>
                        <input
                          type="file"
                          accept="image/jpeg, image/png, image/webp"
                          onChange={e => {
                            const f = e.target.files?.[0] || null;
                            setFile(f);
                            if (f) setPreviewUrl(URL.createObjectURL(f));
                            else setPreviewUrl(null);
                          }}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8c7895', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Update Timestamp</label>
                    <input 
                      type="datetime-local" 
                      value={customDate} 
                      onChange={e => setCustomDate(e.target.value)} 
                      style={{ width: '100%', height: '42px', padding: '0 1rem', borderRadius: '12px', border: '1px solid #ead7e8', fontSize: '0.85rem', color: '#5d4d62' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8c7895', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Progress Message <span style={{ color: '#ad246d' }}>*</span></label>
                    <textarea rows={2} placeholder="Briefly describe your current progress..." value={notes} onChange={e => setNotes(e.target.value)} required style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #ead7e8', fontSize: '0.85rem', outline: 'none', background: '#fafafa' }}></textarea>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    type="submit" 
                    onClick={() => setTargetStatus('processing')}
                    disabled={isSubmitting} 
                    style={{ flex: 1, height: '42px', borderRadius: '50px', border: '1px solid #ad246d', background: 'transparent', color: '#ad246d', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    {isSubmitting && targetStatus === 'processing' ? '...' : (task.status === 'assigned' ? 'Start Production (30%)' : 'Save Progress Only')}
                  </button>
                  <button 
                    type="submit" 
                    onClick={() => setTargetStatus('completed')}
                    disabled={isSubmitting} 
                    style={{ flex: 1.5, height: '42px', borderRadius: '50px', border: 'none', background: 'linear-gradient(135deg, #ad246d 0%, #cf2f84 100%)', color: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(173, 36, 109, 0.2)' }}
                  >
                    {isSubmitting && targetStatus === 'completed' ? '...' : 'Complete & Quality Check (80%)'}
                  </button>
                </div>
              </form>
            </article>
          )}

          {/* Completion Banner */}
          {task.status === 'received' && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dcfce7', display: 'grid', placeItems: 'center', color: '#16a34a' }}>
                <i className='bx bxs-check-circle' style={{ fontSize: '2rem' }}></i>
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#166534', margin: 0 }}>Production Fully Finalized</h3>
                <p style={{ fontSize: '0.8rem', color: '#166534', margin: '0.1rem 0 0 0', opacity: 0.8 }}>Staff has received the wig and finalized this task.</p>
              </div>
            </div>
          )}

          {/* Shipped Status Notice */}
          {task.status === 'shipped' && (
            <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '20px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dbeafe', display: 'grid', placeItems: 'center', color: '#3b82f6' }}>
                <i className='bx bx-paper-plane' style={{ fontSize: '1.8rem' }}></i>
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e40af', margin: 0 }}>Wig Returned to Staff</h3>
                <p style={{ fontSize: '0.8rem', color: '#1e40af', margin: '0.1rem 0 0 0', opacity: 0.8 }}>Awaiting staff confirmation of receipt.</p>
                {task.deliveryLink && (
                  <a href={task.deliveryLink} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '0.5rem', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700 }}>View Your Return Tracking</a>
                )}
              </div>
            </div>
          )}

          {/* Stage 3: Ready for Delivery (Completed Status) */}
          {task.status === 'completed' && (
            <article style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <i className='bx bx-package' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Wig Return Delivery</h2>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#8c7895', marginBottom: '1.25rem' }}>Production is finished! Please provide the tracking link for the finished wig being sent back to the staff.</p>
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8c7895', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Shipping Date</label>
                    <input 
                      type="datetime-local" 
                      value={customDate} 
                      onChange={e => setCustomDate(e.target.value)} 
                      style={{ width: '100%', height: '42px', padding: '0 1rem', borderRadius: '12px', border: '1px solid #ead7e8', fontSize: '0.85rem', color: '#5d4d62' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8c7895', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Return Tracking Link <span style={{ color: '#ad246d' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <i className='bx bx-link' style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#ad246d' }}></i>
                      <input
                        type="url"
                        placeholder="https://courier-tracking-link.com/..."
                        value={task.deliveryLink || ''}
                        onChange={e => setData(prev => ({ ...prev!, task: { ...prev!.task, deliveryLink: e.target.value } }))}
                        required
                        style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', borderRadius: '12px', border: '1px solid #ead7e8', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8c7895', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Final Message (Optional)</label>
                  <textarea rows={2} placeholder="Any final notes for the staff..." value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #ead7e8', fontSize: '0.85rem', outline: 'none', background: '#fafafa' }}></textarea>
                </div>
                <button type="submit" disabled={isSubmitting} style={{ height: '42px', borderRadius: '50px', border: 'none', background: 'linear-gradient(135deg, #ad246d 0%, #cf2f84 100%)', color: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(173, 36, 109, 0.2)' }}>
                  {isSubmitting ? 'Processing...' : 'Submit Tracking & Mark as Shipped'}
                </button>
              </form>
            </article>
          )}
        </div>

        {/* Sidebar Roadmap */}
        <aside style={{ display: 'grid', gap: '1.5rem' }}>
          <article style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
              <i className='bx bx-map-pin' style={{ color: '#ad246d', fontSize: '1.2rem' }}></i>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Task Roadmap</h2>
            </div>
            <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2.5px dashed #f2ebf4', display: 'grid', gap: '1.5rem' }}>
              {[
                { stage: 'Assigned', desc: 'Material delivery confirmed', status: 'assigned' },
                { stage: 'In Progress', desc: 'Wig construction & styling', status: 'processing' },
                { stage: 'Production Finished', desc: 'Ready for shipping', status: 'completed' },
                { stage: 'Shipping', desc: 'Returning to staff', status: 'shipped' },
                { stage: 'Finalized', desc: 'Staff received wig', status: 'received' }
              ].map((step, idx) => {
                const statusOrder = ['assigned', 'processing', 'completed', 'shipped', 'received'];
                const currentIdx = statusOrder.indexOf(task.status);
                const stepIdx = statusOrder.indexOf(step.status);
                const isActive = task.status === step.status;
                const isPast = stepIdx < currentIdx;
                const isDone = isActive || isPast;

                return (
                  <div key={idx} style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute', left: '-2.05rem', top: '0.2rem', width: '16px', height: '16px', borderRadius: '50%',
                      background: isDone ? (isActive ? '#ad246d' : '#fff') : '#fff',
                      border: '3px solid ' + (isDone ? '#ad246d' : '#ead7e8'),
                      display: 'grid', placeItems: 'center',
                      boxShadow: isActive ? '0 0 0 4px rgba(173, 36, 109, 0.1)' : 'none'
                    }}>
                      {isPast && <i className='bx bx-check' style={{ color: '#ad246d', fontSize: '0.7rem', fontWeight: 900 }}></i>}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: isDone ? '#3b2e43' : '#8c7895' }}>{step.stage}</div>
                    <div style={{ fontSize: '0.7rem', color: '#8c7895', lineHeight: 1.4 }}>{step.desc}</div>
                  </div>
                );
              })}
            </div>
          </article>

          <article style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', padding: '1.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ad246d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Progress</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#3b2e43', margin: '0.5rem 0' }}>
              {
                task.status === 'received' ? '100%' :
                task.status === 'shipped' ? '90%' :
                task.status === 'completed' ? '80%' :
                task.status === 'processing' ? '30%' :
                task.isReceived ? '10%' : '0%'
              }
            </div>
            <div style={{ height: '6px', background: '#f2f2f2', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ 
                width: task.status === 'received' ? '100%' :
                       task.status === 'shipped' ? '90%' :
                       task.status === 'completed' ? '80%' :
                       task.status === 'processing' ? '30%' :
                       task.isReceived ? '10%' : '0%', 
                height: '100%', background: 'linear-gradient(90deg, #ad246d, #ff6bb5)', borderRadius: '10px', transition: 'width 0.8s ease'
              }}></div>
            </div>
          </article>
        </aside>
      </div>

      {/* History Table - Full Width */}
      <article style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', padding: '1.5rem', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <i className='bx bx-history' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Production Logs</h2>
        </div>
        <div style={{ borderRadius: '12px', border: '1px solid #f2ebf4', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fdf7fb', borderBottom: '1px solid #f2ebf4' }}>
                <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: '#ad246d', textTransform: 'uppercase' }}>Timestamp</th>
                <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: '#ad246d', textTransform: 'uppercase' }}>Stage</th>
                <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 800, color: '#ad246d', textTransform: 'uppercase' }}>Update Details</th>
              </tr>
            </thead>
            <tbody>
              {histories.map((h, i) => {
                const statusLabels: Record<string, string> = {
                  assigned: 'Assigned',
                  processing: 'In Progress',
                  completed: 'Production Finished',
                  shipped: 'Shipping',
                  received: 'Finalized'
                };
                return (
                  <tr key={i} style={{ borderBottom: i === histories.length - 1 ? 'none' : '1px solid #f8f8f8' }}>
                    <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#5d4d62' }}>{new Date(h.createdAt).toLocaleString()}</td>
                    <td style={{ padding: '1rem' }}><StatusPill status={h.status} label={statusLabels[h.status]} /></td>
                  <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#8c7895', lineHeight: 1.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>{h.notes || 'No message provided.'}</div>
                      {h.metadata?.preview_photo && (
                        <div
                          style={{ width: '60px', height: '40px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #ead7e8', flexShrink: 0, cursor: 'pointer' }}
                          onClick={() => window.open(getPublicUrl('hairlink', h.metadata.preview_photo), '_blank')}
                        >
                          <img src={getPublicUrl('hairlink', h.metadata.preview_photo)} alt="Log Attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                    </div>
                  </td>
                  </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
};

export default WigmakerTaskDetail;
