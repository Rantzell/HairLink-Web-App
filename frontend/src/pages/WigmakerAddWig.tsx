import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';
import LoadingScreen from '../components/LoadingScreen';

const WigmakerAddWig: React.FC = () => {
  const { taskCode } = useParams<{ taskCode?: string }>();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>(taskCode || '');
  const [wigLength, setWigLength] = useState<'short' | 'long' | ''>('');
  const [wigColor, setWigColor] = useState<'black' | 'brown' | 'light' | ''>('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [wigReference, setWigReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(!taskCode);

  useEffect(() => {
    if (taskCode) return;
    const fetchTasks = async () => {
      try {
        const res = await apiClient.get('/internal-api/wigmaker/tasks');
        const activeTasks = (res.data.tasks || []).filter(
          (t: any) => t.status === 'assigned' || t.status === 'processing'
        );
        setTasks(activeTasks);
      } catch (err) {
        console.error('Failed to fetch tasks', err);
        toast.error('Failed to load tasks.');
      } finally {
        setLoadingTasks(false);
      }
    };
    fetchTasks();
  }, [taskCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = taskCode || selectedTask;
    if (!code) { toast.error('Please select a production task.'); return; }
    if (!wigLength) { toast.error('Please select a wig length.'); return; }
    if (!wigColor) { toast.error('Please select a wig color.'); return; }
    if (!notes.trim()) { toast.error('Please add a production note.'); return; }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('wigLength', wigLength);
    formData.append('wigColor', wigColor);
    formData.append('progressNotes', notes.trim());
    formData.append('updatedAt', new Date().toISOString());
    if (wigReference.trim()) formData.append('wigReference', wigReference.trim());
    if (file) formData.append('previewPhoto', file);

    try {
      const res = await apiClient.post(
        `/internal-api/wigmaker/tasks/${code}/create-wig`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      toast.success(res.data.message || 'Wig added to inventory.');
      navigate(`/wigmaker/task/${code}`);
    } catch (err: any) {
      console.error('Failed to add wig', err);
      toast.error(err.response?.data?.message || 'Failed to add wig.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingTasks) return <LoadingScreen />;

  const backTo = taskCode ? `/wigmaker/task/${taskCode}` : '/wigmaker/wig-inventory';

  return (
    <section className="wigmaker-page reveal active staff-page">
      {/* Header */}
      <div className="task-detail-header-card" style={{ marginBottom: '1.5rem' }}>
        <div className="task-detail-header-left">
          <div className="task-detail-header-icon-wrapper">
            <i className="bx bxs-crown task-detail-header-icon" style={{ color: '#ad246d' }}></i>
          </div>
          <div>
            <h1 className="task-detail-header-title">Add Wig to Inventory</h1>
            <p className="task-detail-header-sub">
              {taskCode ? `Task: ${taskCode}` : 'Select a task and record a completed wig'}
            </p>
          </div>
        </div>
        <Link to={backTo} className="task-detail-back-btn">
          <i className="bx bx-left-arrow-alt"></i> Back
        </Link>
      </div>

      <div style={{ maxWidth: '640px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Task selector (only when no taskCode in URL) */}
          {!taskCode && (
            <article className="task-detail-assignment-card">
              <div className="task-detail-card-title-row">
                <i className="bx bx-task task-detail-card-title-icon"></i>
                <h2 className="task-detail-card-title">Production Task</h2>
              </div>
              {tasks.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#8c7895', margin: 0 }}>
                  No active tasks found. Open a task first to add a wig.
                </p>
              ) : (
                <select
                  value={selectedTask}
                  onChange={e => setSelectedTask(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem',
                    borderRadius: '10px',
                    border: '1.5px solid #ead7e8',
                    fontSize: '0.875rem',
                    color: '#2d2333',
                    background: '#fff',
                    outline: 'none',
                    marginTop: '0.5rem',
                  }}
                >
                  <option value="">— Select a task —</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.taskCode}>
                      {t.taskCode} ({t.status})
                    </option>
                  ))}
                </select>
              )}
            </article>
          )}

          {/* Wig Specifications */}
          <article className="task-detail-assignment-card">
            <div className="task-detail-card-title-row">
              <i className="bx bx-ruler task-detail-card-title-icon"></i>
              <h2 className="task-detail-card-title">Wig Specifications</h2>
            </div>

            <div className="task-detail-spec-selectors" style={{ marginTop: '0.75rem' }}>
              <div className="task-detail-spec-group">
                <label className="task-detail-form-label">
                  Wig Length <span className="task-detail-form-label-required">*</span>
                </label>
                <div className="task-detail-spec-options">
                  {[
                    { val: 'short', label: 'Short', sub: '10–14 inches' },
                    { val: 'long', label: 'Long', sub: '15+ inches' },
                  ].map(opt => (
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
                <label className="task-detail-form-label">
                  Wig Color <span className="task-detail-form-label-required">*</span>
                </label>
                <div className="task-detail-spec-options">
                  {[
                    { val: 'black', label: 'Black', color: '#1a1a1a' },
                    { val: 'brown', label: 'Brown', color: '#7B4F2A' },
                    { val: 'light', label: 'Light', color: '#C9A96E' },
                  ].map(opt => (
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

            {/* Optional custom wig reference */}
            <div style={{ marginTop: '1rem' }}>
              <label className="task-detail-form-label">Custom Wig Reference (Optional)</label>
              <input
                type="text"
                placeholder="e.g. WIG 2026-0001-W2 (leave blank to auto-generate)"
                value={wigReference}
                onChange={e => setWigReference(e.target.value)}
                className="task-detail-form-input-text"
                style={{ marginTop: '0.4rem' }}
              />
            </div>
          </article>

          {/* Photo & Notes */}
          <article className="task-detail-assignment-card">
            <div className="task-detail-card-title-row">
              <i className="bx bx-camera task-detail-card-title-icon"></i>
              <h2 className="task-detail-card-title">Photo &amp; Notes</h2>
            </div>

            {/* Photo upload */}
            <div style={{ marginTop: '0.75rem' }}>
              <label className="task-detail-form-label">Wig Photo (Optional)</label>
              <div className="task-detail-form-photo-upload-wrapper" style={{ marginTop: '0.4rem' }}>
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
                  <span className="task-detail-form-photo-upload-text">
                    {file ? file.name : 'Upload Wig Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={e => {
                      const f = e.target.files?.[0] || null;
                      setFile(f);
                      setPreviewUrl(f ? URL.createObjectURL(f) : null);
                    }}
                    className="task-detail-file-input"
                  />
                </label>
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginTop: '1rem' }}>
              <label className="task-detail-form-label">
                Production Notes <span className="task-detail-form-label-required">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Describe the wig produced (materials used, quality notes, etc.)..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                required
                className="task-detail-form-textarea"
                style={{ marginTop: '0.4rem' }}
              />
            </div>
          </article>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="task-detail-form-submit-btn"
            style={{ width: '100%', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
          >
            {isSubmitting ? (
              <><i className="bx bx-loader-alt" style={{ animation: 'spin 0.8s linear infinite' }}></i> Adding Wig...</>
            ) : (
              <><i className="bx bx-plus-circle"></i> Add Wig to Inventory</>
            )}
          </button>
        </form>
      </div>
    </section>
  );
};

export default WigmakerAddWig;
