import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import type { Donation, HairRequest, User, WigProduction } from '../types';

const StaffRealtimeTracking: React.FC = () => {
  const [data, setData] = useState<{
    donations: Donation[];
    requests: HairRequest[];
    wigmakers: User[];
    wigProductions: Record<string, WigProduction>;
  }>({
    donations: [],
    requests: [],
    wigmakers: [],
    wigProductions: {},
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await apiClient.get('/internal-api/staff/realtime-tracking');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch tracking data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (reference: string, type: 'donor' | 'recipient', status: string) => {
    setIsSubmitting(true);
    try {
      await apiClient.post(`/internal-api/staff/tracking/${reference}/status`, { status });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignWigmaker = async (reference: string, wigmakerId: string) => {
    if (!wigmakerId) return;
    setIsSubmitting(true);
    try {
      await apiClient.post(`/internal-api/staff/assign-wigmaker/${reference}`, { wigmaker_id: wigmakerId });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Assignment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="section-wrap">Loading tracking data...</div>;

  return (
    <section className="section-wrap reveal active staff-page">
      <div className="section-title-block">
        <h1>Real-time Staff and Partner Wigmaker Tracking</h1>
        <p>Track each donation batch assigned to partner wigmakers and move workflow stages.</p>
      </div>

      <div className="tracking-split-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        
        {/* Column 1: Donation Trackers */}
        <article className="staff-block">
          <div className="batch-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #ad246d', paddingBottom: '0.5rem' }}>
            <strong>Donation Trackers</strong>
            <small style={{ color: '#8c7895' }}>{data.donations.length} active trackers</small>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.donations.map((donation) => {
              const wigProd = data.wigProductions[donation.id];
              const isWigmakerControlled = ['In Queue', 'In Progress'].includes(donation.status);
              
              return (
                <article key={donation.id} className="tracking-item" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 4px 12px rgba(173, 36, 109, 0.03)' }}>
                  <div className="tracking-head" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <strong>Donation # {donation.reference}</strong>
                    <span className={`status-chip status-${donation.status.toLowerCase().replace(' ', '-')}`}>{donation.status}</span>
                  </div>
                  <div className="tracking-meta" style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#5d4d62', marginBottom: '1rem' }}>
                    <span>Donor: <strong>{donation.user?.firstName} {donation.user?.lastName}</strong></span>
                    <span>Length: <strong>{donation.hairLength}</strong></span>
                    <span>Color: <strong>{donation.hairColor}</strong></span>
                  </div>

                  <div className="stage-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '1rem 0', borderTop: '1px dashed #f2ebf4' }}>
                    {['Verified', 'Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received'].map((s, i) => (
                      <div key={i} className={`stage ${donation.status === s ? 'active' : ''}`} style={{ textAlign: 'center', flex: 1, opacity: donation.status === s ? 1 : 0.4 }}>
                        <i className={`bx ${donation.status === s ? 'bxs-check-circle' : 'bx-circle'}`} style={{ fontSize: '1.2rem', color: '#ad246d' }}></i>
                        <small style={{ display: 'block', fontSize: '0.65rem' }}>{s.slice(0, 8)}</small>
                      </div>
                    ))}
                  </div>

                  <div className="track-actions" style={{ marginTop: '1rem' }}>
                    {donation.status === 'Verified' && (
                      <button className="soft-btn" onClick={() => handleUpdateStatus(donation.reference, 'donor', 'Received Hair')} disabled={isSubmitting}>
                        Confirm Hair Received
                      </button>
                    )}
                    {donation.status === 'Received Hair' && (
                      <div className="assignment-section" style={{ display: 'flex', gap: '0.5rem' }}>
                        <select 
                          className="search-input" 
                          onChange={(e) => handleAssignWigmaker(donation.reference, e.target.value)}
                          defaultValue=""
                          style={{ flex: 1 }}
                        >
                          <option value="" disabled>Assign Wigmaker...</option>
                          {data.wigmakers.map(wm => (
                            <option key={wm.id} value={wm.id}>{wm.firstName} {wm.lastName}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {isWigmakerControlled && (
                      <div className="sync-notice" style={{ background: '#fdf7fb', padding: '0.75rem', borderRadius: '12px', border: '1px solid #f2ebf4', fontSize: '0.8rem' }}>
                        <i className='bx bx-sync bx-spin' style={{ color: '#ad246d', marginRight: '0.5rem' }}></i>
                        Wigmaker <strong>{wigProd?.wigmaker?.firstName}</strong> is processing this wig.
                      </div>
                    )}
                    {donation.status === 'Completed' && (
                      <button className="soft-btn" onClick={() => handleUpdateStatus(donation.reference, 'donor', 'Wig Received')} disabled={isSubmitting}>
                        Confirm Wig Received from Wigmaker
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </article>

        {/* Column 2: Recipient Trackers */}
        <article className="staff-block">
          <div className="batch-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #ad246d', paddingBottom: '0.5rem' }}>
            <strong>Recipient Trackers</strong>
            <small style={{ color: '#8c7895' }}>{data.requests.length} active trackers</small>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.requests.map((request) => (
              <article key={request.id} className="tracking-item" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 4px 12px rgba(173, 36, 109, 0.03)' }}>
                <div className="tracking-head" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <strong>Request # {request.reference}</strong>
                  <span className={`status-chip status-${request.status.toLowerCase().replace(' ', '-')}`}>{request.status}</span>
                </div>
                <div className="tracking-meta" style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#5d4d62', marginBottom: '1rem' }}>
                  <span>Recipient: <strong>{request.user?.firstName} {request.user?.lastName}</strong></span>
                  <span>Wig: <strong>{request.wigLength} / {request.wigColor}</strong></span>
                </div>

                <div className="stage-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '1rem 0', borderTop: '1px dashed #f2ebf4' }}>
                  {['Validated', 'Matched', 'In Transit', 'Completed'].map((s, i) => (
                    <div key={i} className={`stage ${request.status === s ? 'active' : ''}`} style={{ textAlign: 'center', flex: 1, opacity: request.status === s ? 1 : 0.4 }}>
                      <i className={`bx ${request.status === s ? 'bxs-check-circle' : 'bx-circle'}`} style={{ fontSize: '1.2rem', color: '#ad246d' }}></i>
                      <small style={{ display: 'block', fontSize: '0.65rem' }}>{s}</small>
                    </div>
                  ))}
                </div>

                <div className="track-actions" style={{ marginTop: '1rem' }}>
                  {request.status === 'Validated' && (
                    <Link to="/staff/matching" className="soft-btn" style={{ display: 'block', textAlign: 'center' }}>Go to Matching Page</Link>
                  )}
                  {request.status === 'Matched' && (
                    <button className="soft-btn" onClick={() => handleUpdateStatus(request.reference, 'recipient', 'In Transit')} disabled={isSubmitting}>
                      Confirm Shipment (In Transit)
                    </button>
                  )}
                  {request.status === 'In Transit' && (
                    <button className="soft-btn" onClick={() => handleUpdateStatus(request.reference, 'recipient', 'Completed')} disabled={isSubmitting}>
                      Confirm Delivery (Completed)
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
};

export default StaffRealtimeTracking;
