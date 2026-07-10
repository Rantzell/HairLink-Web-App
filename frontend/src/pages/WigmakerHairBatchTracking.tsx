import toast from 'react-hot-toast';
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';
import LoadingScreen from '../components/LoadingScreen';

const WigmakerHairBatchTracking: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [donationStateMap, setDonationStateMap] = useState<Record<number, { wigmakerReceived: boolean; isMissing: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [openBatches, setOpenBatches] = useState<Record<number, boolean>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ taskCode: string; batchRef: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewNoteModal, setViewNoteModal] = useState<{ note: string; batchRef: string } | null>(null);
  // Confirmation for marking hair as received, to prevent accidental clicks.
  type ReceiveConfirm =
    | { kind: 'one'; taskCode: string; donationId: number; batchRef: string }
    | { kind: 'all'; taskCode: string; donations: any[]; batchRef: string };
  const [receiveConfirm, setReceiveConfirm] = useState<ReceiveConfirm | null>(null);

  const toggleBatch = (taskId: number) =>
    setOpenBatches(prev => ({ ...prev, [taskId]: !prev[taskId] }));

  const fetchTasks = useCallback(async () => {
    try {
      const res = await apiClient.get('/internal-api/wigmaker/tasks');
      setTasks(res.data.tasks || []);
      setDonationStateMap(res.data.donationStateMap || {});
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleReceive = async (taskCode: string, donationId: number) => {
    const key = `receive-${donationId}`;
    setSubmitting(p => ({ ...p, [key]: true }));
    try {
      await apiClient.post(`/internal-api/wigmaker/tasks/${encodeURIComponent(taskCode)}/receive-hair/${donationId}`);
      toast.success('Hair marked as received.');
      await fetchTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to confirm receipt.');
    } finally {
      setSubmitting(p => ({ ...p, [key]: false }));
    }
  };

  const handleMissing = async (taskCode: string, donationId: number) => {
    const key = `missing-${donationId}`;
    setSubmitting(p => ({ ...p, [key]: true }));
    try {
      await apiClient.post(`/internal-api/wigmaker/tasks/${encodeURIComponent(taskCode)}/report-missing/${donationId}`);
      toast.success('Hair reported as missing. Staff has been notified.');
      await fetchTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to report missing.');
    } finally {
      setSubmitting(p => ({ ...p, [key]: false }));
    }
  };

  const handleDeleteBatch = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/internal-api/wigmaker/tasks/${encodeURIComponent(deleteConfirm.taskCode)}`);
      toast.success(`Batch ${deleteConfirm.batchRef} deleted.`);
      setDeleteConfirm(null);
      await fetchTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete batch.');
    } finally {
      setDeleting(false);
    }
  };

  const handleReceiveAll = async (taskCode: string, donations: any[]) => {
    const pending = donations.filter(d => !donationStateMap[d.id]?.wigmakerReceived && !donationStateMap[d.id]?.isMissing);
    if (!pending.length) return;
    const key = `receiveAll-${taskCode}`;
    setSubmitting(p => ({ ...p, [key]: true }));
    try {
      for (const d of pending) {
        await apiClient.post(`/internal-api/wigmaker/tasks/${encodeURIComponent(taskCode)}/receive-hair/${d.id}`);
      }
      toast.success(`All ${pending.length} hair donations marked as received.`);
      await fetchTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to mark all received.');
    } finally {
      setSubmitting(p => ({ ...p, [key]: false }));
    }
  };

  if (loading) return <LoadingScreen />;

  const filteredTasks = tasks;

  return (
    <section className="wigmaker-page reveal active staff-page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="dashboard-title">Hair Batch Tracking</h1>
          <p className="dashboard-subtitle">
            Track incoming hair materials per batch and confirm receipt of each donor's contribution.
          </p>
        </div>
        <span style={{ background: '#fdf2f8', border: '1px solid #ead7e8', color: '#ad246d', fontWeight: 700, padding: '0.25rem 0.75rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderRadius: '50px', whiteSpace: 'nowrap', alignSelf: 'center' }}>
          <span className="tracking-active-dot"></span>
          {tasks.length} Batches
        </span>
      </div>

      {filteredTasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#8c7895' }}>
          <i className="bx bx-package" style={{ fontSize: '2.5rem', opacity: 0.2, display: 'block', marginBottom: '0.75rem' }}></i>
          <p>No batches found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {filteredTasks.map(task => {
            const donations: any[] = task.donations || [];
            const receivedCount = donations.filter(d => donationStateMap[d.id]?.wigmakerReceived).length;
            const missingCount  = donations.filter(d => donationStateMap[d.id]?.isMissing).length;
            const pendingCount  = donations.length - receivedCount - missingCount;
            const isReceiveAllBusy = !!submitting[`receiveAll-${task.taskCode}`];

            const batchRef = task.batchHairReference || `B${task.id}-${String(new Date(task.createdAt).getMonth() + 1).padStart(2, '0')}-${new Date(task.createdAt).getFullYear()}`;

            const isOpen = !!openBatches[task.id]; // default collapsed

            return (
              <article key={task.id} style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(73,20,52,0.04)' }}>

                {/* Batch header — main row */}
                <div style={{ padding: '1.1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFF0F8', color: '#ad246d', display: 'grid', placeItems: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                      <i className="bx bx-package"></i>
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ad246d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Hair Donations in {batchRef}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#8c7895', marginTop: '2px' }}>
                        {task.taskCode} · {donations.length} donor{donations.length !== 1 ? 's' : ''} · Started {new Date(task.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* Status pill — stays Assigned even if some are missing */}
                    <StatusPill status={task.status} />

                    {pendingCount > 0 && (
                      <button
                        onClick={() => setReceiveConfirm({ kind: 'all', taskCode: task.taskCode, donations, batchRef })}
                        disabled={isReceiveAllBusy}
                        style={{ padding: '0.35rem 0.8rem', borderRadius: '50px', border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontWeight: 800, fontSize: '0.72rem', cursor: isReceiveAllBusy ? 'not-allowed' : 'pointer', opacity: isReceiveAllBusy ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', boxShadow: '0 2px 8px rgba(22,163,74,0.25)', whiteSpace: 'nowrap' }}
                      >
                        {isReceiveAllBusy ? '…' : <><i className="bx bx-check-double"></i> Mark All ({pendingCount})</>}
                      </button>
                    )}

                    {/* Delete batch button */}
                    <button
                      onClick={() => setDeleteConfirm({ taskCode: task.taskCode, batchRef })}
                      title="Delete batch"
                      style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #fecaca', background: '#fff5f5', color: '#dc2626', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: '1rem', flexShrink: 0 }}
                    >
                      <i className="bx bx-trash"></i>
                    </button>

                    {/* Collapse toggle */}
                    {donations.length > 0 && (
                      <button onClick={() => toggleBatch(task.id)}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #ead7e8', background: '#fff', color: '#ad246d', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: '1rem', flexShrink: 0 }}>
                        <i className={`bx ${isOpen ? 'bx-chevron-up' : 'bx-chevron-down'}`}></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Info bar — tracking link + staff note */}
                {(task.materialDeliveryLink || task.staffNote) && (() => {
                  const raw: string = task.staffNote || '';
                  const noteMatch = raw.match(/Staff note:\s*(.+)$/i);
                  const displayNote = noteMatch ? noteMatch[1].trim() : raw;
                  return (
                    <div style={{ padding: '0.6rem 1.5rem', background: '#fdfbfe', borderTop: '1px dashed #f2ebf4', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem' }}>
                      {task.materialDeliveryLink && (
                        <a href={task.materialDeliveryLink} target="_blank" rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 700, color: '#3b82f6', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '6px', padding: '0.2rem 0.6rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          <i className="bx bx-link-external"></i> Track Incoming Delivery
                        </a>
                      )}
                      {task.staffNote && displayNote && (
                        <div 
                          onClick={() => setViewNoteModal({ note: displayNote, batchRef })}
                          title="Click to view full note"
                          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.2rem 0.6rem', maxWidth: '480px', transition: 'all 0.2s ease' }}
                          onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.95)'}
                          onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                        >
                          <i className="bx bx-note" style={{ color: '#d97706', fontSize: '0.82rem', flexShrink: 0 }}></i>
                          <span style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 600, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ fontWeight: 800, color: '#b45309' }}>Staff Note: </span>{displayNote}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Collapsible donor table */}
                {donations.length > 0 && isOpen && (
                  <div style={{ borderTop: '1px solid #f2ebf4', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['Reference', 'Donor', 'Hair Details', 'Wigmaker Received'].map(col => (
                            <th key={col} style={{ background: '#fdf7fb', color: '#ad246d', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.75rem 1.25rem', borderBottom: '1px solid #f2ebf4', textAlign: 'left', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {donations.map((d: any, idx: number) => {
                          const state = donationStateMap[d.id];
                          const isReceived = state?.wigmakerReceived;
                          const isMissing  = state?.isMissing;
                          const isPending  = !isReceived && !isMissing;
                          const recvBusy   = !!submitting[`receive-${d.id}`];
                          const missBusy   = !!submitting[`missing-${d.id}`];

                          const displayName = d.user?.firstName
                            ? `${d.user.firstName} ${d.user.lastName || ''}`.trim()
                            : (d.user?.name || d.user?.email || 'Unknown');
                          const initials = (d.user?.firstName?.[0] || d.user?.name?.[0] || '?').toUpperCase();

                          return (
                            <tr key={d.id} style={{ background: isMissing ? '#fff5f5' : idx % 2 === 0 ? '#fff' : '#fdfbfe', borderBottom: '1px dashed #f2ebf4' }}>

                              {/* Reference */}
                              <td style={{ padding: '0.875rem 1.25rem', verticalAlign: 'middle' }}>
                                <span style={{ background: '#fdf2f8', color: '#ad246d', border: '1px solid #f9cde8', borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'monospace' }}>
                                  {d.reference}
                                </span>
                              </td>

                              {/* Donor */}
                              <td style={{ padding: '0.875rem 1.25rem', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#ad246d', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                                    {initials}
                                  </div>
                                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#2d2333' }}>{displayName}</span>
                                </div>
                              </td>

                              {/* Hair Details */}
                              <td style={{ padding: '0.875rem 1.25rem', verticalAlign: 'middle', fontSize: '0.875rem', color: '#5d4d62' }}>
                                {d.hairLength || 'N/A'} / {d.hairColor || 'N/A'}
                              </td>

                              {/* Wigmaker Received — status + action buttons */}
                              <td style={{ padding: '0.875rem 1.25rem', verticalAlign: 'middle' }}>
                                {isReceived && (
                                  <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '50px', padding: '0.3rem 0.75rem' }}>
                                    <i className="bx bx-check-circle"></i> Received
                                  </span>
                                )}
                                {isMissing && (
                                  <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '50px', padding: '0.3rem 0.75rem' }}>
                                    <i className="bx bx-error-circle"></i> Missing
                                  </span>
                                )}
                                {isPending && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <button
                                      onClick={() => setReceiveConfirm({ kind: 'one', taskCode: task.taskCode, donationId: d.id, batchRef })}
                                      disabled={recvBusy || missBusy}
                                      style={{ padding: '0.35rem 0.8rem', borderRadius: '50px', border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontWeight: 800, fontSize: '0.75rem', cursor: recvBusy ? 'not-allowed' : 'pointer', opacity: recvBusy ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 8px rgba(22,163,74,0.3)', whiteSpace: 'nowrap' }}
                                    >
                                      {recvBusy ? '…' : <><i className="bx bx-check"></i> Received</>}
                                    </button>
                                    <button
                                      onClick={() => handleMissing(task.taskCode, d.id)}
                                      disabled={recvBusy || missBusy}
                                      style={{ padding: '0.35rem 0.8rem', borderRadius: '50px', border: '1.5px solid #fecaca', background: '#fff', color: '#dc2626', fontWeight: 800, fontSize: '0.75rem', cursor: missBusy ? 'not-allowed' : 'pointer', opacity: missBusy ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                                    >
                                      {missBusy ? '…' : <><i className="bx bx-error-circle"></i> Missing</>}
                                    </button>
                                  </div>
                                )}
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Summary footer */}
                    {(receivedCount > 0 || missingCount > 0) && (
                      <div style={{ padding: '0.75rem 1.25rem', background: '#fdfbfe', borderTop: '1px solid #f2ebf4', display: 'flex', gap: '1rem', fontSize: '0.75rem', fontWeight: 700 }}>
                        <span style={{ color: '#16a34a' }}><i className="bx bx-check-circle" style={{ marginRight: '3px' }}></i>{receivedCount} Received</span>
                        {missingCount > 0 && <span style={{ color: '#dc2626' }}><i className="bx bx-error-circle" style={{ marginRight: '3px' }}></i>{missingCount} Missing</span>}
                        {pendingCount > 0 && <span style={{ color: '#8c7895' }}><i className="bx bx-time-five" style={{ marginRight: '3px' }}></i>{pendingCount} Pending</span>}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Delete confirm modal */}
      {receiveConfirm && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setReceiveConfirm(null); }}
          style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div style={{ background: '#fff', borderRadius: '20px', padding: '2rem', maxWidth: '400px', width: '100%', border: '1px solid #ead7e8', boxShadow: '0 24px 60px rgba(22,163,74,0.15)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.75rem' }}>
              <i className="bx bx-check-circle"></i>
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b2e43', margin: '0 0 0.5rem' }}>Confirm Hair Received?</h2>
            <p style={{ color: '#5d4d62', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
              {receiveConfirm.kind === 'all'
                ? <>Mark <strong>all pending hair donations</strong> in batch <strong>{receiveConfirm.batchRef}</strong> as received? This confirms the materials arrived and cannot be undone.</>
                : <>Confirm you have received this hair donation for batch <strong>{receiveConfirm.batchRef}</strong>? This cannot be undone.</>}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                onClick={() => setReceiveConfirm(null)}
                style={{ height: '42px', borderRadius: '50px', border: '1.5px solid #ead7e8', background: '#fff', color: '#5d4d62', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const c = receiveConfirm;
                  setReceiveConfirm(null);
                  if (c.kind === 'all') handleReceiveAll(c.taskCode, c.donations);
                  else handleReceive(c.taskCode, c.donationId);
                }}
                style={{ height: '42px', borderRadius: '50px', border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <i className="bx bx-check" /> Yes, Received
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteConfirm && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) setDeleteConfirm(null); }}
          style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div style={{ background: '#fff', borderRadius: '20px', padding: '2rem', maxWidth: '400px', width: '100%', border: '1px solid #ead7e8', boxShadow: '0 24px 60px rgba(173,36,109,0.15)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fff5f5', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.75rem' }}>
              <i className="bx bx-trash"></i>
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b2e43', margin: '0 0 0.5rem' }}>Delete Batch?</h2>
            <p style={{ color: '#5d4d62', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
              Are you sure you want to delete batch <strong>{deleteConfirm.batchRef}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                style={{ height: '42px', borderRadius: '50px', border: '1.5px solid #ead7e8', background: '#fff', color: '#5d4d62', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBatch}
                disabled={deleting}
                style={{ height: '42px', borderRadius: '50px', border: 'none', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.75 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {deleting ? <><i className="bx bx-loader-alt bx-spin" /> Deleting...</> : <><i className="bx bx-trash" /> Yes, Delete</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* View Note modal */}
      {viewNoteModal && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setViewNoteModal(null); }}
          style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}
        >
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                  <i className="bx bx-note"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Staff Note</h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Batch {viewNoteModal.batchRef}</div>
                </div>
              </div>
              <button 
                onClick={() => setViewNoteModal(null)}
                style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <i className="bx bx-x"></i>
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '1.5rem', color: '#334155', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {viewNoteModal.note}
            </div>

            {/* Footer */}
            <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setViewNoteModal(null)}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#475569'; }}
              >
                Close
              </button>
            </div>
            
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};

export default WigmakerHairBatchTracking;
