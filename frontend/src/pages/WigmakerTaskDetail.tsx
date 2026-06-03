import toast from 'react-hot-toast';
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';


import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';

import StatusPill from '../components/StatusPill';
import LoadingScreen from '../components/LoadingScreen';
import { getPublicUrl } from '../lib/storage';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/WigmakerTaskDetail.css';

const WigmakerTaskDetail: React.FC = () => {
  const { taskCode } = useParams<{ taskCode: string }>();
  const [data, setData] = useState<{ task: any; histories: any[] } | null>(null);
  const [childWigs, setChildWigs] = useState<any[]>([]);
  const [showCreateAnotherModal, setShowCreateAnotherModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 16));
  const todayMin = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }, []);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showMaterialConfirm, setShowMaterialConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [donorOpen, setDonorOpen] = useState(false);
  const [wigLength, setWigLength] = useState<'short' | 'long' | ''>('');
  const [wigColor, setWigColor] = useState<'black' | 'brown' | 'light' | ''>('');

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await apiClient.get(`/internal-api/wigmaker/tasks/${taskCode}`);
        if (res.data.task) {
          setData(res.data);
          setChildWigs(res.data.childWigs || []);
        }
      } catch (err) {
        console.error('Failed to fetch task detail', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [taskCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    if (task.status !== 'completed' && !notes.trim()) {
      toast.success('Please add a progress note.');
      return;
    }
    setShowConfirm(true);
  };

  const requestStatusUpdate = (status: string) => {
    if (!notes) { toast.success('Please add a progress note before updating.'); return; }
    if (status === 'completed') {
      if (!wigLength || !wigColor) {
        toast.error('Please select the wig length and color before marking production as finished.');
        return;
      }
      setShowCreateAnotherModal(true);
      return;
    }
    setPendingStatus(status);
    setTargetStatus(status);
    setShowConfirm(true);
  };

  const submitWigCreation = async (createAnother: boolean) => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('wigLength', wigLength);
    formData.append('wigColor', wigColor);
    formData.append('progressNotes', notes.trim());
    formData.append('updatedAt', new Date(customDate).toISOString());
    if (file) formData.append('previewPhoto', file);

    const url = createAnother 
      ? `/internal-api/wigmaker/tasks/${taskCode}/create-wig` 
      : `/internal-api/wigmaker/tasks/${taskCode}/complete-task`;

    try {
      const res = await apiClient.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message);
      setShowCreateAnotherModal(false);
      
      if (createAnother) {
        // Reset form inputs
        setWigLength('');
        setWigColor('');
        setNotes('');
        setFile(null);
        setPreviewUrl(null);
        
        // Reload details
        const detailRes = await apiClient.get(`/internal-api/wigmaker/tasks/${taskCode}`);
        if (detailRes.data.task) {
          setData({ task: detailRes.data.task, histories: detailRes.data.histories });
          setChildWigs(detailRes.data.childWigs || []);
        }
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error('Wig creation failed:', err);
      toast.error(err.response?.data?.message || 'Failed to submit production status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const doSubmit = async () => {
    setShowConfirm(false);
    if (!data) return;
    setIsSubmitting(true);
    const formData = new FormData();
    const finalStatus = pendingStatus || targetStatus || nextStatus;

    formData.append('status', finalStatus);
    formData.append('progressNotes', notes.trim() || 'Progress update posted.');
    formData.append('updatedAt', new Date(customDate).toISOString());
    if (file) formData.append('previewPhoto', file);
    if (task.deliveryLink) formData.append('deliveryLink', task.deliveryLink);
    if (finalStatus === 'completed') {
      if (wigLength) formData.append('wigLength', wigLength);
      if (wigColor) formData.append('wigColor', wigColor);
    }

    try {
      await apiClient.post(`/internal-api/wigmaker/tasks/${taskCode}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      window.location.reload();
    } catch (err: any) {
      console.error('Update failed:', err);
      toast.error(err.response?.data?.message || err.message || 'Update failed');
    } finally {
      setIsSubmitting(false);
      setPendingStatus(null);
      setTargetStatus(null);
    }
  };

  const handleConfirmMaterial = () => {
    setShowMaterialConfirm(true);
  };

  const doConfirmMaterial = async () => {
    setShowMaterialConfirm(false);
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
  if (!data) return <div className="wigmaker-page staff-page task-detail-not-found">Task not found.</div>;

  const { task, histories } = data;
  const nextStatus = task.status === 'processing' ? 'completed' : 'shipped';

  const assignedHistory = (histories || []).find((h: any) => h.status === 'assigned');
  let staffNote = '';
  if (assignedHistory?.notes) {
    const match = assignedHistory.notes.match(/Staff note:\s*(.*)/i);
    if (match) {
      staffNote = match[1];
    }
  }

  return (
    <section className="wigmaker-page reveal active staff-page task-detail-section">
      {/* Header Row */}
      <div className="task-detail-header-card">
        <div className="task-detail-header-left">
          <div className="task-detail-header-icon-wrapper">
            <i className="bx bx-task task-detail-header-icon"></i>
          </div>
          <div>
            <h1 className="task-detail-header-title">Task: {task.taskCode}</h1>
            <p className="task-detail-header-sub">Batch Production &middot; <span className="task-detail-header-sub-ref">{(task.donations || []).length} Donors</span></p>
          </div>
        </div>
        <Link to="/wigmaker/dashboard" className="task-detail-back-btn">
          <i className="bx bx-left-arrow-alt"></i> Back to Dashboard
        </Link>
      </div>

      {/* Horizontal Roadmap */}
      <article className="task-detail-roadmap-card horizontal">
        <div className="task-detail-roadmap-steps horizontal">
          {[
            { stage: 'Assigned', desc: 'Material delivery confirmed', status: 'assigned' },
            { stage: 'In Progress', desc: 'Wig construction & styling', status: 'processing' },
            { stage: 'Completed', desc: 'Production finalized', status: 'completed' }
          ].map((step, idx) => {
            const statusOrder = ['assigned', 'processing', 'completed'];
            const currentIdx = task.status === 'shipped' || task.status === 'received' ? 2 : statusOrder.indexOf(task.status);
            const stepIdx = statusOrder.indexOf(step.status);
            const isActive = task.status === step.status;
            const isPast = stepIdx < currentIdx;
            const isDone = isActive || isPast;

            return (
              <div key={idx} className="task-detail-roadmap-step horizontal">
                <div className={`task-detail-roadmap-step-dot ${isPast ? 'past' : isActive ? 'active' : 'upcoming'}`}>
                  {isPast && <i className="bx bx-check task-detail-roadmap-step-dot-icon"></i>}
                </div>
                <div className="task-detail-roadmap-step-content">
                  <div className={`task-detail-roadmap-step-title ${isDone ? 'done' : ''}`}>{step.stage}</div>
                  <div className="task-detail-roadmap-step-desc">{step.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </article>

      <div className="task-detail-grid">
        {/* Main Column */}
        <div className="task-detail-main-col">

          {/* Details & Material Combined */}
          <article className="task-detail-assignment-card">
            <div>
              <div className="task-detail-card-title-row">
                <i className="bx bxs-info-circle task-detail-card-title-icon"></i>
                <h2 className="task-detail-card-title">Assignment Details</h2>
              </div>
              <div className="task-detail-info-grid">
                <div className="task-detail-info-block">
                  <span className="task-detail-info-block-label">Inventory Ref</span>
                  <strong className="task-detail-info-block-value highlight">{(task.donations || []).map((d: any) => d.reference).join(', ') || 'N/A'}</strong>
                </div>
                <div className="task-detail-info-block">
                  <span className="task-detail-info-block-label">Started On</span>
                  <strong className="task-detail-info-block-value">{new Date(task.createdAt).toLocaleDateString()}</strong>
                </div>
                <div className="task-detail-info-block">
                  <span className="task-detail-info-block-label">Due Date</span>
                  <strong className="task-detail-info-block-value">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'TBD'}</strong>
                </div>
              </div>
              {staffNote && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid #f2ebf4', paddingTop: '1rem' }}>
                  <span className="task-detail-info-block-label" style={{ display: 'block', marginBottom: '0.4rem', color: '#ad246d', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Note from Staff</span>
                  <div style={{ fontSize: '0.85rem', color: '#5d4d62', background: '#fdf7fb', border: '1px solid #ead7e8', padding: '0.85rem 1.25rem', borderRadius: '12px', lineHeight: '1.4' }}>
                    {staffNote}
                  </div>
                </div>
              )}
            </div>

            {/* Donor Dropdown Accordion */}
            {(task.donations || []).length > 0 && (
              <div className="task-detail-donor-accordion">
                <button
                  className="task-detail-donor-accordion-btn"
                  onClick={() => setDonorOpen(o => !o)}
                >
                  <i className="bx bx-group"></i>
                  <span>Compiled Donors &amp; References ({(task.donations || []).length})</span>
                  <i className={`bx ${donorOpen ? 'bx-chevron-up' : 'bx-chevron-down'} task-detail-donor-accordion-chevron`}></i>
                </button>
                {donorOpen && (
                  <div className="task-detail-donor-list">
                    {(task.donations as any[]).map((d: any, idx: number) => (
                      <div key={d.id || idx} className="task-detail-donor-item">
                        <div className="task-detail-donor-avatar">
                          {(d.user?.firstName?.[0] || '?')}{(d.user?.lastName?.[0] || '')}
                        </div>
                        <div className="task-detail-donor-info">
                          <span className="task-detail-donor-name">
                            {d.user?.firstName || 'Unknown'} {d.user?.lastName || ''}
                          </span>
                          <code className="task-detail-donor-ref">{d.reference}</code>
                        </div>
                        <div className="task-detail-donor-specs">
                          {d.hairLength && <span className="task-detail-donor-spec-pill">{d.hairLength}</span>}
                          {d.hairColor && <span className="task-detail-donor-spec-pill">{d.hairColor}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </article>

          {/* List of Wigs Produced */}
          {childWigs.length > 0 && (
            <article className="task-detail-assignment-card" style={{ marginTop: '1.25rem' }}>
              <div className="task-detail-card-title-row">
                <i className="bx bxs-crown task-detail-card-title-icon" style={{ color: '#ad246d' }}></i>
                <h2 className="task-detail-card-title">Wigs Produced ({childWigs.length})</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                {childWigs.map(w => (
                  <div key={w.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#fdf7fb', borderRadius: '12px', border: '1px solid #f8dceb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ead7e8', background: '#fff' }}>
                        {w.preview_photo ? (
                          <img src={getPublicUrl('hairlink', w.preview_photo) || undefined} alt="Wig" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#ecd8e8' }}>
                            <i className="bx bxs-crown"></i>
                          </div>
                        )}
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.85rem', color: '#3b2e43' }}>{w.taskCode}</strong>
                        <div style={{ fontSize: '0.72rem', color: '#8c7895', marginTop: '2px' }}>
                          Specs: {w.targetLength} &middot; {w.targetColor}
                        </div>
                      </div>
                    </div>
                    <StatusPill status={w.status} />
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* Hair Tracking Card (Staff -> Wigmaker) */}
          {task.status === 'assigned' && !task.isReceived && (
            <div className="task-detail-status-banner-blue">
              <div className="task-detail-status-banner-icon-box">
                <i className="bx bx-package task-detail-status-banner-icon-blue"></i>
              </div>
              <div className="task-detail-status-banner-content">
                <small className="task-detail-status-banner-label">Staff Sent Hair Package</small>
                {task.materialDeliveryLink ? (
                  <a href={task.materialDeliveryLink} target="_blank" rel="noreferrer" className="task-detail-status-banner-link">Track Incoming Hair Package</a>
                ) : (
                  <span className="task-detail-status-banner-link" style={{ textDecoration: 'none', cursor: 'default' }}>Hair ready for production</span>
                )}
              </div>
              <button
                onClick={handleConfirmMaterial}
                disabled={isSubmitting}
                className="task-detail-status-banner-btn-blue"
              >
                {isSubmitting ? '...' : 'Confirm Hair Received'}
              </button>
            </div>
          )}

          {/* Stage 2: Start Production / In Progress Updates */}
          {(task.status === 'processing' || (task.status === 'assigned' && task.isReceived)) && (
            <article className="task-detail-update-card">
              <div className="task-detail-card-title-row">
                <i className="bx bx-edit-alt task-detail-card-title-icon"></i>
                <h2 className="task-detail-card-title">Production Status Update</h2>
              </div>
              <form onSubmit={handleSubmit} className="task-detail-update-form">
                {/* Wig Specification selectors — only shown when status is processing (prior to completion) */}
                {task.status === 'processing' && (
                  <div className="task-detail-spec-selectors">
                    <div className="task-detail-spec-group">
                      <label className="task-detail-form-label">Wig Length <span className="task-detail-form-label-required">*</span></label>
                      <div className="task-detail-spec-options">
                        {[{ val: 'short', label: 'Short', sub: '10–14 inches' }, { val: 'long', label: 'Long', sub: '15+ inches' }].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            className={`task-detail-spec-option ${wigLength === opt.val ? 'selected' : ''}`}
                            onClick={() => setWigLength(opt.val as 'short' | 'long')}
                          >
                            <strong>{opt.label}</strong>
                            <small>{opt.sub}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="task-detail-spec-group">
                      <label className="task-detail-form-label">Wig Color <span className="task-detail-form-label-required">*</span></label>
                      <div className="task-detail-spec-options">
                        {[{ val: 'black', label: 'Black', color: '#1a1a1a' }, { val: 'brown', label: 'Brown', color: '#7B4F2A' }, { val: 'light', label: 'Light', color: '#C9A96E' }].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            className={`task-detail-spec-option ${wigColor === opt.val ? 'selected' : ''}`}
                            onClick={() => setWigColor(opt.val as 'black' | 'brown' | 'light')}
                          >
                            <span className="task-detail-spec-color-dot" style={{ background: opt.color }}></span>
                            <strong>{opt.label}</strong>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="task-detail-form-row-2col">
                  <div>
                    <label className="task-detail-form-label">Next Status</label>
                    <div className="task-detail-form-select-display">
                      <i className="bx bx-check-double task-detail-form-select-icon"></i> {task.status === 'assigned' ? 'In Progress' : 'Production Finished'}
                    </div>
                  </div>
                  <div>
                    <label className="task-detail-form-label">Update Photo (Optional)</label>
                    <div className="task-detail-form-photo-upload-wrapper">
                      {previewUrl && (
                        <div className="task-detail-form-photo-preview">
                          <img src={previewUrl} alt="Preview" className="task-detail-form-photo-preview-img" />
                          <button
                            type="button"
                            onClick={() => { setFile(null); setPreviewUrl(null); }}
                            className="task-detail-form-photo-preview-remove"
                          >
                            <i className="bx bx-x"></i>
                          </button>
                        </div>
                      )}
                      <label className="task-detail-form-photo-upload-label">
                        <i className="bx bx-camera task-detail-form-photo-upload-icon"></i>
                        <span className="task-detail-form-photo-upload-text">{file ? file.name : 'Upload Progress Photo'}</span>
                        <input
                          type="file"
                          accept="image/jpeg, image/png, image/webp"
                          onChange={e => {
                            const f = e.target.files?.[0] || null;
                            setFile(f);
                            if (f) setPreviewUrl(URL.createObjectURL(f));
                            else setPreviewUrl(null);
                          }}
                          className="task-detail-file-input"
                        />
                      </label>
                    </div>
                  </div>
                </div>
                <div className="task-detail-form-row-2col">
                  <div>
                    <label className="task-detail-form-label">Update Timestamp</label>
                    <input
                      type="datetime-local"
                      value={customDate}
                      onChange={e => setCustomDate(e.target.value)}
                      min={todayMin}
                      className="task-detail-form-input-text"
                    />
                  </div>
                  <div>
                    <label className="task-detail-form-label">Progress Message <span className="task-detail-form-label-required">*</span></label>
                    <textarea rows={2} placeholder="Briefly describe your current progress..." value={notes} onChange={e => setNotes(e.target.value)} required className="task-detail-form-textarea"></textarea>
                  </div>
                </div>
                <div className="task-detail-form-submit-container">
                  {task.status === 'assigned' ? (
                    <button
                      type="button"
                      onClick={() => requestStatusUpdate('processing')}
                      disabled={isSubmitting}
                      className="task-detail-form-submit-btn"
                    >
                      {isSubmitting && pendingStatus === 'processing' ? '...' : 'Start Production'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => requestStatusUpdate('completed')}
                      disabled={isSubmitting}
                      className="task-detail-form-submit-btn"
                      style={{ width: '100%' }}
                    >
                      {isSubmitting && pendingStatus === 'completed' ? '...' : 'Production Finished'}
                    </button>
                  )}
                </div>
              </form>
            </article>
          )}

          {/* Completed / Shipped / Received Banners */}
          {['completed', 'shipped', 'received'].includes(task.status) && (
            <div className="task-detail-success-banner">
              <div className="task-detail-success-banner-icon">
                <i className="bx bxs-check-circle task-detail-success-banner-icon-i"></i>
              </div>
              <div>
                <h3 className="task-detail-success-banner-title">Production Completed</h3>
                <p className="task-detail-success-banner-sub">
                  You have successfully completed production for this task. All produced wigs are available in your <Link to="/wigmaker/wig-inventory" style={{ color: '#ad246d', fontWeight: 800, textDecoration: 'underline' }}>Wig Inventory</Link> where you can batch and ship them back to staff.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wig Finished — 3-action prompt (Yes/No/Cancel).
          Rendered via portal as a fixed full-screen overlay so it actually
          sits above the page, with the same backdrop/animation language as
          the shared <ConfirmModal>. */}
      {showCreateAnotherModal && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) setShowCreateAnotherModal(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(30, 18, 36, 0.55)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
            animation: 'wfFadeIn 0.18s ease',
          }}
        >
          <style>{`
            @keyframes wfFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes wfSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes wfSpin { to { transform: rotate(360deg); } }
            .wf-card { animation: wfSlideUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1); }
            .wf-btn-primary:not(:disabled):hover { opacity: 0.9; transform: translateY(-1px); }
            .wf-btn-secondary:not(:disabled):hover { background: #fdf2f8; }
            .wf-btn-cancel:not(:disabled):hover { background: #f3e8f0; color: #5d4d62; }
          `}</style>

          <div
            className="wf-card"
            style={{
              background: '#fff',
              borderRadius: '24px',
              boxShadow: '0 32px 80px rgba(173, 36, 109, 0.18), 0 8px 24px rgba(0,0,0,0.12)',
              padding: '2rem',
              maxWidth: '440px',
              width: '100%',
              border: '1px solid #ead7e8',
            }}
          >
            {/* Icon */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #fdf2f8 0%, #fff0f8 100%)',
                display: 'grid', placeItems: 'center',
                border: '2px solid #f9cde8',
                boxShadow: '0 8px 20px rgba(173, 36, 109, 0.12)',
              }}>
                <i className="bx bxs-check-circle" style={{ fontSize: '2rem', color: '#ad246d' }} />
              </div>
            </div>

            {/* Title */}
            <h2 style={{
              textAlign: 'center', margin: '0 0 0.5rem 0',
              fontSize: '1.25rem', fontWeight: 800, color: '#3b2e43',
              fontFamily: 'Outfit',
            }}>
              Wig Finished! 🎉
            </h2>

            {/* Message */}
            <p style={{
              textAlign: 'center', margin: '0 0 1.75rem 0',
              fontSize: '0.875rem', color: '#8c7895', lineHeight: 1.6,
            }}>
              Would you like to produce another wig for this batch?
              <br />
              <span style={{ fontSize: '0.8rem', color: '#a89bb0' }}>
                <strong>Yes</strong> keeps the task in progress.
                <strong> No</strong> finalizes this production task.
              </span>
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <button
                type="button"
                className="wf-btn-primary"
                disabled={isSubmitting}
                onClick={() => submitWigCreation(true)}
                style={{
                  height: '46px',
                  borderRadius: '50px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ad246d 0%, #cf2f84 100%)',
                  color: '#fff',
                  fontWeight: 800, fontSize: '0.9rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  transition: 'opacity 0.15s, transform 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  boxShadow: '0 6px 16px rgba(173, 36, 109, 0.28)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <i className="bx bx-loader-alt" style={{ animation: 'wfSpin 0.8s linear infinite' }} />
                    Processing…
                  </>
                ) : (
                  <>
                    <i className="bx bx-plus-circle" /> Yes, Create Another Wig
                  </>
                )}
              </button>

              <button
                type="button"
                className="wf-btn-secondary"
                disabled={isSubmitting}
                onClick={() => submitWigCreation(false)}
                style={{
                  height: '46px',
                  borderRadius: '50px',
                  border: '1.5px solid #ad246d',
                  background: '#fff',
                  color: '#ad246d',
                  fontWeight: 800, fontSize: '0.9rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  transition: 'background 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}
              >
                <i className="bx bx-check-double" /> No, Finalize Task
              </button>

              <button
                type="button"
                className="wf-btn-cancel"
                disabled={isSubmitting}
                onClick={() => setShowCreateAnotherModal(false)}
                style={{
                  height: '38px',
                  borderRadius: '50px',
                  border: 'none',
                  background: 'transparent',
                  color: '#8c7895',
                  fontWeight: 700, fontSize: '0.8rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  marginTop: '0.25rem',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* History Table - Full Width */}
      <article className="task-detail-history-card">
        <div className="task-detail-card-title-row">
          <i className="bx bx-history task-detail-card-title-icon"></i>
          <h2 className="task-detail-card-title">Production Logs</h2>
        </div>
        <div className="task-detail-history-table-wrapper">
          <table className="task-detail-history-table">
            <thead>
              <tr className="task-detail-history-tr-head">
                <th className="task-detail-history-th">Timestamp</th>
                <th className="task-detail-history-th">Stage</th>
                <th className="task-detail-history-th">Update Details</th>
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
                  <tr key={i} className="task-detail-history-tr-body">
                    <td className="task-detail-history-td timestamp">{new Date(h.createdAt).toLocaleString()}</td>
                    <td className="task-detail-history-td"><StatusPill status={h.status} label={statusLabels[h.status]} /></td>
                    <td className="task-detail-history-td">
                      <div className="task-detail-history-notes-flex">
                        <div className="task-detail-history-notes-text">{h.notes || 'No message provided.'}</div>
                        {h.metadata?.preview_photo && (
                          <div
                            className="task-detail-history-photo-preview-box"
                            onClick={() => window.open(getPublicUrl('hairlink', h.metadata.preview_photo) || undefined, '_blank')}
                          >
                            <img src={getPublicUrl('hairlink', h.metadata.preview_photo) || undefined} alt="Log Attachment" className="task-detail-history-photo-img" />
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
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => { setShowConfirm(false); setPendingStatus(null); }}
        onConfirm={doSubmit}
        title={
          pendingStatus === 'completed'
            ? 'Production Finished?'
            : pendingStatus === 'processing'
              ? task.status === 'processing'
                ? 'Post Progress Update?'
                : 'Start Production?'
              : 'Submit Update?'
        }
        message={
          pendingStatus === 'completed'
            ? 'Mark this task as production finished and ready for the next stage?'
            : pendingStatus === 'processing'
              ? task.status === 'processing'
                ? 'Submit this progress update and photo? This will log your current progress without finishing production.'
                : 'Start production on this task? This will update the status for linked donors.'
              : 'Submit this tracking update and mark the wig as shipped?'
        }
        confirmText="Yes, Confirm"
        isConfirming={isSubmitting}
      />

      <ConfirmModal
        isOpen={showMaterialConfirm}
        onClose={() => setShowMaterialConfirm(false)}
        onConfirm={doConfirmMaterial}
        title="Confirm Hair Package Received"
        message="Confirm that you have received the hair package from staff? This action cannot be undone."
        confirmText="Yes, Hair Received"
        isConfirming={isSubmitting}
      />
    </section>
  );
};

export default WigmakerTaskDetail;
