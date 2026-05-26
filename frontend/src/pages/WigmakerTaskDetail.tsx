import React, { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 16));
  const [showConfirm, setShowConfirm] = useState(false);
  const [showMaterialConfirm, setShowMaterialConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !notes) return;
    setShowConfirm(true);
  };

  const requestStatusUpdate = (status: string) => {
    if (!notes) { alert('Please add a progress note before updating.'); return; }
    setPendingStatus(status);
    setTargetStatus(status);
    setShowConfirm(true);
  };

  const doSubmit = async () => {
    setShowConfirm(false);
    if (!data) return;
    setIsSubmitting(true);
    const formData = new FormData();
    const finalStatus = pendingStatus || targetStatus || nextStatus;

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
  const progressPercent = task.status === 'received' ? '100%' :
                         task.status === 'shipped' ? '90%' :
                         task.status === 'completed' ? '80%' :
                         task.status === 'processing' ? '30%' :
                         task.isReceived ? '10%' : '0%';

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
            <p className="task-detail-header-sub">Production ID: <span className="task-detail-header-sub-ref">{task.donation?.reference || 'N/A'}</span></p>
          </div>
        </div>
        <Link to="/wigmaker/dashboard" className="task-detail-back-btn">
          <i className="bx bx-left-arrow-alt"></i> Back to Dashboard
        </Link>
      </div>

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
                  <strong className="task-detail-info-block-value highlight">{task.donation?.reference || 'N/A'}</strong>
                </div>
                <div className="task-detail-info-block">
                  <span className="task-detail-info-block-label">Specification</span>
                  <strong className="task-detail-info-block-value">{task.targetLength} / {task.targetColor}</strong>
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
            </div>

            <div className="task-detail-materials-side">
              <div className="task-detail-card-title-row sub-title">
                <i className="bx bx-images task-detail-card-title-icon small"></i>
                <h2 className="task-detail-card-title small">Materials</h2>
              </div>
              <div className="task-detail-materials-grid">
                {[task.donation?.photoFront, task.donation?.photoSide].filter(Boolean).map((img, idx) => (
                  <div key={idx} className="task-detail-material-photo-box">
                    <img src={getPublicUrl('hairlink', img) || undefined} alt="Material" className="task-detail-material-photo" />
                  </div>
                ))}
                {![task.donation?.photoFront, task.donation?.photoSide].filter(Boolean).length && (
                  <div className="task-detail-material-no-photo">No photos</div>
                )}
              </div>
            </div>
          </article>

          {/* Material Tracking Card (Staff -> Wigmaker) */}
          {task.materialDeliveryLink && task.status === 'assigned' && !task.isReceived && (
            <div className="task-detail-status-banner-blue">
              <div className="task-detail-status-banner-icon-box">
                <i className="bx bx-package task-detail-status-banner-icon-blue"></i>
              </div>
              <div className="task-detail-status-banner-content">
                <small className="task-detail-status-banner-label">Staff Sent Materials</small>
                <a href={task.materialDeliveryLink} target="_blank" rel="noreferrer" className="task-detail-status-banner-link">Track Incoming Hair Package</a>
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
                      className="task-detail-form-input-text"
                    />
                  </div>
                  <div>
                    <label className="task-detail-form-label">Progress Message <span className="task-detail-form-label-required">*</span></label>
                    <textarea rows={2} placeholder="Briefly describe your current progress..." value={notes} onChange={e => setNotes(e.target.value)} required className="task-detail-form-textarea"></textarea>
                  </div>
                </div>
                <div className="task-detail-form-actions-flex">
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
                    <>
                      <button
                        type="button"
                        onClick={() => requestStatusUpdate('completed')}
                        disabled={isSubmitting}
                        className="task-detail-form-submit-btn"
                      >
                        {isSubmitting && pendingStatus === 'completed' ? '...' : 'Production Finished'}
                      </button>
                    </>
                  )}
                </div>
              </form>
            </article>
          )}

          {/* Completion Banner */}
          {task.status === 'received' && (
            <div className="task-detail-success-banner">
              <div className="task-detail-success-banner-icon">
                <i className="bx bxs-check-circle task-detail-success-banner-icon-i"></i>
              </div>
              <div>
                <h3 className="task-detail-success-banner-title">Production Fully Finalized</h3>
                <p className="task-detail-success-banner-sub">Staff has received the wig and finalized this task.</p>
              </div>
            </div>
          )}

          {/* Shipped Status Notice */}
          {task.status === 'shipped' && (
            <div className="task-detail-info-banner-blue">
              <div className="task-detail-info-banner-blue-icon">
                <i className="bx bx-paper-plane task-detail-info-banner-blue-icon-i"></i>
              </div>
              <div>
                <h3 className="task-detail-info-banner-blue-title">Wig Returned to Staff</h3>
                <p className="task-detail-info-banner-blue-sub">Awaiting staff confirmation of receipt.</p>
                {task.deliveryLink && (
                  <a href={task.deliveryLink} target="_blank" rel="noreferrer" className="task-detail-info-banner-blue-link">View Your Return Tracking</a>
                )}
              </div>
            </div>
          )}

          {/* Stage 3: Ready for Delivery (Completed Status) */}
          {task.status === 'completed' && (
            <article className="task-detail-update-card">
              <div className="task-detail-card-title-row">
                <i className="bx bx-package task-detail-card-title-icon"></i>
                <h2 className="task-detail-card-title">Wig Return Delivery</h2>
              </div>
              <p className="task-detail-header-sub task-detail-header-sub-margin">Production is finished! Please provide the tracking link for the finished wig being sent back to the staff.</p>
              <form onSubmit={handleSubmit} className="task-detail-update-form">
                <div className="task-detail-form-row-2col">
                  <div>
                    <label className="task-detail-form-label">Shipping Date</label>
                    <input
                      type="datetime-local"
                      value={customDate}
                      onChange={e => setCustomDate(e.target.value)}
                      className="task-detail-form-input-text"
                    />
                  </div>
                  <div>
                    <label className="task-detail-form-label">Return Tracking Link <span className="task-detail-form-label-required">*</span></label>
                    <div className="task-detail-tracking-input-wrapper">
                      <i className="bx bx-link task-detail-tracking-input-icon"></i>
                      <input
                        type="url"
                        placeholder="https://courier-tracking-link.com/..."
                        value={task.deliveryLink || ''}
                        onChange={e => setData(prev => ({ ...prev!, task: { ...prev!.task, deliveryLink: e.target.value } }))}
                        required
                        className="task-detail-tracking-input"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="task-detail-form-label">Final Message (Optional)</label>
                  <textarea rows={2} placeholder="Any final notes for the staff..." value={notes} onChange={e => setNotes(e.target.value)} className="task-detail-form-textarea"></textarea>
                </div>
                <button type="submit" disabled={isSubmitting} className="task-detail-form-submit-btn" onClick={(e) => { e.preventDefault(); setShowConfirm(true); }}>
                  {isSubmitting ? 'Processing...' : 'Submit Tracking & Mark as Shipped'}
                </button>
              </form>
            </article>
          )}
        </div>

        {/* Sidebar Roadmap */}
        <aside className="task-detail-sidebar">
          <article className="task-detail-roadmap-card">
            <div className="task-detail-card-title-row">
              <i className="bx bx-map-pin task-detail-card-title-icon small"></i>
              <h2 className="task-detail-card-title small">Task Roadmap</h2>
            </div>
            <div className="task-detail-roadmap-steps">
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
                  <div key={idx} className="task-detail-roadmap-step">
                    <div className={`task-detail-roadmap-step-dot ${isPast ? 'past' : isActive ? 'active' : 'upcoming'}`}>
                      {isPast && <i className="bx bx-check task-detail-roadmap-step-dot-icon"></i>}
                    </div>
                    <div className={`task-detail-roadmap-step-title ${isDone ? 'done' : ''}`}>{step.stage}</div>
                    <div className="task-detail-roadmap-step-desc">{step.desc}</div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="task-detail-progress-card">
            <span className="task-detail-progress-label">Current Progress</span>
            <div className="task-detail-progress-value">
              {progressPercent}
            </div>
            <div className="task-detail-progress-bar-bg">
              <div
                className="task-detail-progress-bar-fill"
                style={{ width: progressPercent }}
              ></div>
            </div>
          </article>
        </aside>
      </div>

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
        title={pendingStatus === 'completed' ? 'Production Finished?' : pendingStatus === 'processing' ? 'Start Production?' : 'Submit Update?'}
        message={pendingStatus === 'completed' ? 'Mark this task as production finished and ready for the next stage?' : pendingStatus === 'processing' ? 'Start production on this task? This will update the status for linked donors.' : 'Submit this tracking update and mark the wig as shipped?'}
        confirmText="Yes, Confirm"
        isConfirming={isSubmitting}
      />

      <ConfirmModal
        isOpen={showMaterialConfirm}
        onClose={() => setShowMaterialConfirm(false)}
        onConfirm={doConfirmMaterial}
        title="Confirm Hair Materials Received"
        message="Confirm that you have received the hair materials from staff? This action cannot be undone."
        confirmText="Yes, Materials Received"
        isConfirming={isSubmitting}
      />
    </section>
  );
};

export default WigmakerTaskDetail;
