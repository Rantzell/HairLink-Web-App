import toast from 'react-hot-toast';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';

import StatusPill from '../components/StatusPill';
import LoadingScreen from '../components/LoadingScreen';
import { getPublicUrl } from '../lib/storage';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/WigmakerTaskDetail.css';

/** Returns the current date/time in Philippines Time (UTC+8) formatted for datetime-local (YYYY-MM-DDTHH:mm) */
function getPhilippinesDateTimeLocal(): string {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

const WigmakerTaskDetail: React.FC = () => {
  const { taskCode } = useParams<{ taskCode: string }>();
  const [data, setData] = useState<{ task: any; histories: any[] } | null>(null);
  const [donationStateMap, setDonationStateMap] = useState<Record<number, { wigmakerReceived: boolean; isMissing: boolean }>>({});
  const [showCreateAnotherModal, setShowCreateAnotherModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState(() => getPhilippinesDateTimeLocal());
  const todayMin = useMemo(() => {
    return getPhilippinesDateTimeLocal();
  }, []);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showMaterialConfirm, setShowMaterialConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [wigLength, setWigLength] = useState<'short' | 'long' | ''>('');
  const [wigColor, setWigColor] = useState<'black' | 'brown' | 'light' | ''>('');

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await apiClient.get(`/internal-api/wigmaker/tasks/${taskCode}`);
        if (res.data.task) {
          setData(res.data);
          setDonationStateMap(res.data.donationStateMap || {});
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

    try {
      // Auto-start production if task is still assigned
      if (task.status === 'assigned') {
        const startForm = new FormData();
        startForm.append('status', 'processing');
        startForm.append('progressNotes', 'Production started — adding wigs to inventory.');
        startForm.append('updatedAt', new Date().toISOString());
        await apiClient.post(`/internal-api/wigmaker/tasks/${encodeURIComponent(taskCode!)}`, startForm, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }); 
      }

      const formData = new FormData();
      formData.append('wigLength', wigLength);
      formData.append('wigColor', wigColor);
      formData.append('progressNotes', notes.trim());
      formData.append('updatedAt', new Date(customDate).toISOString());
      if (file) formData.append('previewPhoto', file);

      const url = createAnother
        ? `/internal-api/wigmaker/tasks/${encodeURIComponent(taskCode!)}/create-wig`
        : `/internal-api/wigmaker/tasks/${encodeURIComponent(taskCode!)}/complete-task`;

      const res = await apiClient.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message);
      setShowCreateAnotherModal(false);

      if (createAnother) {
        setWigLength('');
        setWigColor('');
        setNotes('');
        setFile(null);
        setPreviewUrl(null);

        const detailRes = await apiClient.get(`/internal-api/wigmaker/tasks/${encodeURIComponent(taskCode!)}`);
        if (detailRes.data.task) {
          setData({ task: detailRes.data.task, histories: detailRes.data.histories });
          setDonationStateMap(detailRes.data.donationStateMap || {});
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

    // "finalize" = Complete Task button — marks the entire task as completed
    if (pendingStatus === 'finalize') {
      try {
        const fd = new FormData();
        fd.append('status', 'completed');
        fd.append('progressNotes', 'Production task finalized by wigmaker.');
        fd.append('updatedAt', new Date().toISOString());
        await apiClient.post(`/internal-api/wigmaker/tasks/${encodeURIComponent(taskCode!)}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        window.location.reload();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to complete task');
      } finally {
        setIsSubmitting(false);
        setPendingStatus(null);
      }
      return;
    }

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
  const anyHairReceived = Object.values(donationStateMap).some(s => s.wigmakerReceived);
  const batchRef = task.batchHairReference || (() => {
    const d = new Date(task.createdAt);
    return `B${task.id}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  })();

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
            <h1 className="task-detail-header-title">Batch: {batchRef}</h1>
            <p className="task-detail-header-sub">{task.taskCode} &middot; <span className="task-detail-header-sub-ref">{(task.donations || []).length} Donors</span></p>
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
                  {/* Complete Task button — only on the Completed step, only when still processing */}
                  {step.status === 'completed' && task.status === 'processing' && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setPendingStatus('finalize');
                        setShowConfirm(true);
                      }}
                      style={{
                        marginTop: '0.6rem',
                        padding: '0.35rem 0.9rem',
                        borderRadius: '50px',
                        border: '1.5px solid #ad246d',
                        background: '#fff',
                        color: '#ad246d',
                        fontWeight: 800,
                        fontSize: '0.72rem',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <i className="bx bx-check-double"></i> Complete Task
                    </button>
                  )}
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

          </article>



          {/* Stage 2: Start Production / In Progress Updates — visible once any hair received */}
          {(task.status === 'processing' || (task.status === 'assigned' && anyHairReceived)) && (
            <article className="task-detail-update-card">
              <div className="task-detail-card-title-row">
                <i className="bx bx-edit-alt task-detail-card-title-icon"></i>
                <h2 className="task-detail-card-title">Wig Progress</h2>
              </div>
              <form onSubmit={handleSubmit} className="task-detail-update-form">
                {/* Wig Specification selectors — only shown when status is processing (prior to completion) */}
                {(task.status === 'processing' || (task.status === 'assigned' && anyHairReceived)) && (
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
                      <i className="bx bx-check-double task-detail-form-select-icon"></i> {task.status === 'assigned' ? 'Add to Inventory' : 'Production Finished'}
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
                  <button
                    type="button"
                    onClick={() => requestStatusUpdate('completed')}
                    disabled={isSubmitting}
                    style={{
                      padding: '0.55rem 1.5rem',
                      borderRadius: '50px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #ad246d 0%, #cf2f84 100%)',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '0.875rem',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting ? 0.7 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 4px 14px rgba(173,36,109,0.28)',
                    }}
                  >
                    {isSubmitting ? '…' : <><i className="bx bx-plus-circle"></i> Add Wig</>}
                  </button>
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

      <ConfirmModal
        isOpen={showCreateAnotherModal}
        onClose={() => setShowCreateAnotherModal(false)}
        onConfirm={() => submitWigCreation(true)}
        title="Confirm Add Wig"
        message="Are you sure you want to add this wig to your inventory?"
        confirmText="Yes, Add Wig"
        isConfirming={isSubmitting}
      />

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
          pendingStatus === 'finalize'
            ? 'Complete Task?'
            : pendingStatus === 'completed'
              ? 'Production Finished?'
              : pendingStatus === 'processing'
                ? task.status === 'processing'
                  ? 'Post Progress Update?'
                  : 'Start Production?'
                : 'Submit Update?'
        }
        message={
          pendingStatus === 'finalize'
            ? 'Mark this production task as completed? You will no longer be able to add wigs after this.'
            : pendingStatus === 'completed'
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
