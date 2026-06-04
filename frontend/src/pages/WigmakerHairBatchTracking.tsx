import toast from 'react-hot-toast';
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';
import LoadingScreen from '../components/LoadingScreen';

const WigmakerHairBatchTracking: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [donationStateMap, setDonationStateMap] = useState<Record<number, { wigmakerReceived: boolean; isMissing: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'assigned' | 'processing' | 'completed'>('all');
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

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

  const filteredTasks = tasks.filter(t => filter === 'all' || t.status === filter);

  return (
    <section className="wigmaker-page reveal active staff-page">
      <div className="section-title-block dashboard-section-title-block">
        <div>
          <h1 className="dashboard-title">Hair Batch Tracking</h1>
          <p className="dashboard-subtitle">
            Track incoming hair materials per batch and confirm receipt of each donor's contribution.
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #ead7e8', color: '#ad246d', fontWeight: 800, padding: '0.5rem 1.2rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '50px', textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(73,20,52,0.04)' }}>
          <span className="tracking-active-dot"></span>
          {tasks.length} Batches
        </div>
      </div>

      {/* Filters */}
      <div className="task-filters dashboard-task-filters" style={{ marginBottom: '1.5rem' }}>
        {(['all', 'assigned', 'processing', 'completed'] as const).map(f => (
          <button key={f} className={`filter-btn dashboard-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
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

            return (
              <article key={task.id} style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(73,20,52,0.04)' }}>

                {/* Batch header */}
                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', borderBottom: donations.length ? '1px solid #f2ebf4' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFF0F8', color: '#ad246d', display: 'grid', placeItems: 'center', fontSize: '1.1rem' }}>
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                    <StatusPill status={task.status} />

                    {pendingCount > 0 && (
                      <button
                        onClick={() => handleReceiveAll(task.taskCode, donations)}
                        disabled={isReceiveAllBusy}
                        style={{ padding: '0.4rem 0.9rem', borderRadius: '50px', border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontWeight: 800, fontSize: '0.75rem', cursor: isReceiveAllBusy ? 'not-allowed' : 'pointer', opacity: isReceiveAllBusy ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', boxShadow: '0 2px 8px rgba(22,163,74,0.25)' }}
                      >
                        {isReceiveAllBusy ? '…' : <><i className="bx bx-check-double"></i> Mark All Received ({pendingCount})</>}
                      </button>
                    )}

                    <Link to={`/wigmaker/task/${task.taskCode}`} style={{ padding: '0.4rem 0.9rem', borderRadius: '50px', border: '1.5px solid #ad246d', color: '#ad246d', fontWeight: 800, fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      Open Task <i className="bx bx-chevron-right"></i>
                    </Link>
                  </div>
                </div>

                {/* Donor table — matches staff batch donation expanded view */}
                {donations.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
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
                                      onClick={() => handleReceive(task.taskCode, d.id)}
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
    </section>
  );
};

export default WigmakerHairBatchTracking;
