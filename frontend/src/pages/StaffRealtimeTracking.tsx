import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../api/client';
import type { Donation, HairRequest, User, WigProduction } from '../types';

const StaffRealtimeTracking: React.FC = () => {
  const { type } = useParams<{ type: 'donation' | 'recipient' }>();
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

  const handleUpdateStatus = async (reference: string, _type: 'donor' | 'recipient', status: string) => {
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

  const [searchTerm, setSearchTerm] = useState('');

  const filteredDonations = data.donations.filter(d => 
    d.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${d.user?.firstName} ${d.user?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRequests = data.requests.filter(r => 
    r.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${r.user?.firstName} ${r.user?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="section-wrap">Loading tracking data...</div>;

  const isDonation = type === 'donation';

  return (
    <section className="section-wrap reveal active staff-page">
      <div className="section-title-block" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 900, color: '#3b2e43', marginBottom: '0.2rem' }}>
            {type === 'donation' ? 'Donation Trackers' : 'Request Trackers'}
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#8c7895', maxWidth: '600px' }}>
            {type === 'donation' ? 'Monitor hair contributions and professional production stages.' : 'Monitor real-time status and manage workflow for wig requests.'}
          </p>
        </div>
        <div className="status-pill" style={{ background: '#fff', border: '1px solid #ead7e8', color: '#ad246d', fontWeight: 800, padding: '0.35rem 0.9rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '50px', textTransform: 'uppercase' }}>
          <span style={{ width: '6px', height: '6px', background: '#ad246d', borderRadius: '50%' }}></span>
          {isDonation ? filteredDonations.length : filteredRequests.length} Active Trackers
        </div>
      </div>

      {/* Global Search Bar (Left Aligned) */}
      <div className="search-container" style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.2rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <i className='bx bx-search' style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#ad246d', fontSize: '1.1rem' }}></i>
          <input 
            type="text" 
            placeholder={`Search ${isDonation ? 'donors' : 'recipients'} or reference #...`} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', padding: '0.75rem 1.2rem 0.75rem 2.8rem', borderRadius: '12px', 
              border: '1px solid #ead7e8', background: '#fff', fontSize: '0.9rem',
              boxShadow: '0 4px 12px rgba(73, 20, 52, 0.04)', color: '#3b2e43',
              outline: 'none', transition: 'all 0.2s ease'
            }}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8c7895', cursor: 'pointer', fontSize: '1.1rem' }}
            >
              <i className='bx bx-x-circle'></i>
            </button>
          )}
        </div>
      </div>

      <div className="tracking-list-layout" style={{ marginTop: '0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1.2rem' }}>
          {isDonation ? (
            filteredDonations.map((donation) => {
              const wigProd = data.wigProductions[donation.id];
              const isWigmakerControlled = ['In Queue', 'In Progress'].includes(donation.status);
              
              return (
                <article key={donation.id} className="tracking-item" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1.2rem', boxShadow: '0 4px 15px rgba(73, 20, 52, 0.03)', position: 'relative', overflow: 'hidden' }}>
                  {/* Status Indicator Strip */}
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: donation.status === 'Completed' ? '#10b981' : '#ad246d' }}></div>
                  
                  <div className="tracking-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <strong style={{ fontSize: '1rem', color: '#3b2e43', display: 'block' }}>{donation.reference}</strong>
                      <small style={{ color: '#8c7895', fontSize: '0.7rem' }}>Last updated: Just now</small>
                    </div>
                    <span className={`status-pill status-${donation.status.toLowerCase().replace(' ', '-')}`} style={{ fontSize: '0.7rem', padding: '0.25rem 0.75rem', fontWeight: 800 }}>{donation.status}</span>
                  </div>
                  
                  {/* Identity Summary Grid (Based on Blade) */}
                  <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem', marginBottom: '1.25rem' }}>
                    <div style={{ background: '#fdf7fb', padding: '0.6rem', borderRadius: '10px', border: '1px solid #f2ebf4', textAlign: 'center' }}>
                      <small style={{ display: 'block', color: '#8c7895', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 800 }}>Submitted</small>
                      <strong style={{ color: '#3b2e43', fontSize: '0.75rem' }}>{new Date(donation.createdAt).toLocaleDateString()}</strong>
                    </div>
                    <div style={{ background: '#fdf7fb', padding: '0.6rem', borderRadius: '10px', border: '1px solid #f2ebf4', textAlign: 'center' }}>
                      <small style={{ display: 'block', color: '#8c7895', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 800 }}>Donor Name</small>
                      <strong style={{ color: '#3b2e43', fontSize: '0.75rem' }}>{donation.user?.firstName} {donation.user?.lastName}</strong>
                    </div>
                    <div style={{ background: '#fdf7fb', padding: '0.6rem', borderRadius: '10px', border: '1px solid #f2ebf4', textAlign: 'center' }}>
                      <small style={{ display: 'block', color: '#8c7895', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 800 }}>Hair Spec</small>
                      <strong style={{ color: '#3b2e43', fontSize: '0.75rem' }}>{donation.hairLength} / {donation.hairColor}</strong>
                    </div>
                  </div>

                  {/* Enhanced Timeline with Icons */}
                  <div className="stage-row-wrapper" style={{ position: 'relative', padding: '1.2rem 0', borderTop: '1px dashed #ead7e8', borderBottom: '1px dashed #ead7e8', marginBottom: '1.25rem' }}>
                    <div style={{ position: 'absolute', top: '26px', left: '5%', right: '5%', height: '3px', background: '#f2ebf4', zIndex: 1 }}></div>
                    {/* Progress Bar Filling */}
                    <div style={{ 
                      position: 'absolute', top: '26px', left: '5%', 
                      width: `${(['Verified', 'Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received'].indexOf(donation.status) / 5) * 90}%`, 
                      height: '3px', background: '#ad246d', zIndex: 2, transition: 'width 0.5s ease' 
                    }}></div>

                    <div className="stage-row" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 3 }}>
                      {[
                        { s: 'Verified', i: 'bxs-badge-check', l: 'Verified' },
                        { s: 'Received Hair', i: 'bxs-package', l: 'Hair Received' },
                        { s: 'In Queue', i: 'bx-time-five', l: 'Queued' },
                        { s: 'In Progress', i: 'bx-cog', l: 'Crafting' },
                        { s: 'Completed', i: 'bx-trophy', l: 'Finished' },
                        { s: 'Wig Received', i: 'bx-heart-circle', l: 'Wig' }
                      ].map((item, idx) => {
                        const stageIndex = ['Verified', 'Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received'].indexOf(donation.status);
                        const isActive = donation.status === item.s;
                        const isPast = stageIndex > idx;
                        
                        return (
                          <div key={idx} style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{ 
                              width: '28px', height: '28px', 
                              background: isActive || isPast ? '#ad246d' : '#fff', 
                              border: isActive || isPast ? 'none' : '2px solid #ead7e8', 
                              borderRadius: '50%', margin: '0 auto 6px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: isActive || isPast ? '#fff' : '#ead7e8',
                              boxShadow: isActive ? '0 0 0 4px rgba(173, 36, 109, 0.15)' : 'none',
                              transition: 'all 0.3s ease',
                              fontSize: '1rem'
                            }}>
                              <i className={`bx ${item.i} ${isActive ? 'bx-tada' : ''}`}></i>
                            </div>
                            <small style={{ display: 'block', fontSize: '0.58rem', fontWeight: isActive ? 900 : 600, color: isActive ? '#ad246d' : (isPast ? '#5d4d62' : '#8c7895') }}>{item.l}</small>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Context Info (Based on Blade) */}
                  <div className="card-details" style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                      <i className='bx bx-info-square' style={{ color: '#ad246d', fontSize: '1rem' }}></i>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#3b2e43' }}>Request Context</h4>
                    </div>
                    <div style={{ background: '#fff9fd', padding: '0.8rem', borderRadius: '10px', border: '1px solid #f2ebf4', fontSize: '0.8rem', color: '#5d4d62' }}>
                      <p style={{ margin: '0 0 0.4rem 0' }}><strong>Story:</strong> <span style={{ fontStyle: 'italic', color: '#665772' }}>"Donating hair in memory of my grandmother..."</span></p>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <span><strong>Contact:</strong> 09123456789</span>
                        <span><strong>Gender:</strong> Female</span>
                      </div>
                    </div>
                  </div>

                  <div className="track-actions" style={{ marginTop: 'auto' }}>
                    {donation.status === 'Verified' && (
                      <button 
                        className="soft-btn" 
                        onClick={() => handleUpdateStatus(donation.reference, 'donor', 'Received Hair')} 
                        disabled={isSubmitting} 
                        style={{ 
                          width: '100%', padding: '0.8rem', fontSize: '0.85rem', fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', 
                          borderRadius: '12px', border: 'none', cursor: 'pointer',
                          background: 'linear-gradient(135deg, #cf2f84, #a71f68)',
                          color: '#fff', boxShadow: '0 4px 12px rgba(207, 47, 132, 0.25)'
                        }}
                      >
                        <i className='bx bx-package' style={{ fontSize: '1.1rem' }}></i>
                        Confirm Hair Received
                      </button>
                    )}
                    {donation.status === 'Received Hair' && (
                      <div className="assignment-section" style={{ background: '#fdf7fb', padding: '1rem', borderRadius: '12px', border: '1px solid #f2ebf4' }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ad246d', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.6rem' }}>
                          <i className='bx bxs-user-pin'></i> Assign Workflow
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                          <div style={{ position: 'relative' }}>
                            <select 
                              className="search-input" 
                              onChange={(e) => {
                                // We'll store the selection in the element's data or a local state if this were a controlled component
                                // For this demo, we'll just enable the button below
                                const btn = document.getElementById(`assign-btn-${donation.reference}`);
                                if (btn) {
                                  btn.style.display = 'flex';
                                  (btn as any).dataset.wigmakerId = e.target.value;
                                }
                              }}
                              defaultValue=""
                              style={{ 
                                width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', 
                                border: '1px solid #ead7e8', fontSize: '0.85rem', background: '#fff',
                                appearance: 'none', cursor: 'pointer', color: '#5d4d62', fontWeight: 600
                              }}
                            >
                              <option value="" disabled>Select Partner Wigmaker...</option>
                              <option value="wm1">Emma Wilson (Expert)</option>
                              <option value="wm2">James Bond (Specialist)</option>
                            </select>
                            <i className='bx bx-chevron-down' style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#ad246d', fontSize: '1.2rem' }}></i>
                          </div>
                          
                          <button 
                            id={`assign-btn-${donation.reference}`}
                            className="soft-btn" 
                            onClick={(e) => {
                              const wigmakerId = (e.currentTarget as any).dataset.wigmakerId;
                              handleAssignWigmaker(donation.reference, wigmakerId);
                            }}
                            disabled={isSubmitting} 
                            style={{ 
                              width: '100%', padding: '0.7rem', fontSize: '0.8rem', fontWeight: 800,
                              display: 'none', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', 
                              borderRadius: '10px', border: 'none', cursor: 'pointer',
                              background: 'linear-gradient(135deg, #ad246d, #8c1e58)',
                              color: '#fff', boxShadow: '0 4px 10px rgba(173, 36, 109, 0.2)',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            <i className='bx bx-check-circle'></i>
                            Confirm Assignment
                          </button>
                        </div>
                      </div>
                    )}
                    {isWigmakerControlled && (
                      <div className="sync-notice" style={{ background: 'linear-gradient(to right, #eff6ff, #f8fafc)', padding: '1rem', borderRadius: '12px', border: '1px solid #dbeafe', fontSize: '0.85rem', color: '#1e40af', display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                        <div style={{ background: '#dbeafe', padding: '0.4rem', borderRadius: '8px' }}>
                          <i className='bx bx-sync bx-spin' style={{ fontSize: '1.2rem' }}></i>
                        </div>
                        <div>
                          <strong style={{ display: 'block', marginBottom: '0.1rem' }}>Processing by {wigProd?.wigmaker?.firstName}</strong>
                          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Wigmaker is currently crafting the hair batch.</span>
                          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ width: '6px', height: '6px', background: '#3b82f6', borderRadius: '50%' }}></span>
                            <small style={{ fontWeight: 700 }}>Est: 3-5 days</small>
                          </div>
                        </div>
                      </div>
                    )}
                    {donation.status === 'Completed' && (
                      <button 
                        className="soft-btn" 
                        onClick={() => handleUpdateStatus(donation.reference, 'donor', 'Wig Received')} 
                        disabled={isSubmitting} 
                        style={{ 
                          width: '100%', padding: '0.8rem', fontSize: '0.85rem', fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', 
                          borderRadius: '12px', border: 'none', cursor: 'pointer',
                          background: 'linear-gradient(135deg, #cf2f84, #a71f68)',
                          color: '#fff', boxShadow: '0 4px 12px rgba(207, 47, 132, 0.25)'
                        }}
                      >
                        <i className='bx bx-check-double' style={{ fontSize: '1.1rem' }}></i>
                        Confirm Receipt from Partner
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            data.requests.map((request) => (
              <article key={request.id} className="tracking-item" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(73, 20, 52, 0.03)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: '#ad246d' }}></div>
                
                <div className="tracking-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                  <strong style={{ fontSize: '1.1rem', color: '#3b2e43' }}>{request.reference}</strong>
                  <span className={`status-pill status-${request.status.toLowerCase().replace(' ', '-')}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.8rem', fontWeight: 800 }}>{request.status}</span>
                </div>

                {/* Identity Summary Grid (Based on Blade) */}
                <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem', marginBottom: '1.25rem' }}>
                    <div style={{ background: '#f7f2f8', padding: '0.6rem', borderRadius: '10px', border: '1px solid #f2ebf4', textAlign: 'center' }}>
                      <small style={{ display: 'block', color: '#8c7895', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 800 }}>Submitted</small>
                      <strong style={{ color: '#3b2e43', fontSize: '0.75rem' }}>May 04, 2026</strong>
                    </div>
                    <div style={{ background: '#f7f2f8', padding: '0.6rem', borderRadius: '10px', border: '1px solid #f2ebf4', textAlign: 'center' }}>
                      <small style={{ display: 'block', color: '#8c7895', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 800 }}>Recipient</small>
                      <strong style={{ color: '#3b2e43', fontSize: '0.75rem' }}>{request.user?.firstName} {request.user?.lastName}</strong>
                    </div>
                    <div style={{ background: '#f7f2f8', padding: '0.6rem', borderRadius: '10px', border: '1px solid #f2ebf4', textAlign: 'center' }}>
                      <small style={{ display: 'block', color: '#8c7895', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 800 }}>Wig Spec</small>
                      <strong style={{ color: '#3b2e43', fontSize: '0.75rem' }}>{request.wigLength} / {request.wigColor}</strong>
                    </div>
                </div>

                {/* Enhanced Request Timeline with Icons */}
                <div className="stage-row-wrapper" style={{ position: 'relative', padding: '1.2rem 0', borderTop: '1px dashed #ead7e8', borderBottom: '1px dashed #ead7e8', marginBottom: '1.25rem' }}>
                  <div style={{ position: 'absolute', top: '26px', left: '10%', right: '10%', height: '3px', background: '#f2ebf4', zIndex: 1 }}></div>
                  {/* Progress Bar Filling */}
                  <div style={{ 
                    position: 'absolute', top: '26px', left: '10%', 
                    width: `${(['Validated', 'Matched', 'In Transit', 'Completed'].indexOf(request.status) / 3) * 80}%`, 
                    height: '3px', background: '#ad246d', zIndex: 2, transition: 'width 0.5s ease' 
                  }}></div>

                  <div className="stage-row" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 3 }}>
                    {[
                      { s: 'Validated', i: 'bxs-badge-check', l: 'Validated' },
                      { s: 'Matched', i: 'bx-link-alt', l: 'Matched' },
                      { s: 'In Transit', i: 'bxs-truck', l: 'Shipping' },
                      { s: 'Completed', i: 'bx-home-heart', l: 'Delivered' }
                    ].map((item, idx) => {
                      const stageIndex = ['Validated', 'Matched', 'In Transit', 'Completed'].indexOf(request.status);
                      const isActive = request.status === item.s;
                      const isPast = stageIndex > idx;
                      
                      return (
                        <div key={idx} style={{ textAlign: 'center', flex: 1 }}>
                          <div style={{ 
                            width: '28px', height: '28px', 
                            background: isActive || isPast ? '#ad246d' : '#fff', 
                            border: isActive || isPast ? 'none' : '2px solid #ead7e8', 
                            borderRadius: '50%', margin: '0 auto 6px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: isActive || isPast ? '#fff' : '#ead7e8',
                            boxShadow: isActive ? '0 0 0 4px rgba(173, 36, 109, 0.15)' : 'none',
                            transition: 'all 0.3s ease',
                            fontSize: '1rem'
                          }}>
                            <i className={`bx ${item.i} ${isActive ? 'bx-tada' : ''}`}></i>
                          </div>
                          <small style={{ display: 'block', fontSize: '0.6rem', fontWeight: isActive ? 900 : 600, color: isActive ? '#ad246d' : (isPast ? '#5d4d62' : '#8c7895') }}>{item.l}</small>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Context Info (Based on Blade) */}
                <div className="card-details" style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                      <i className='bx bx-info-square' style={{ color: '#ad246d', fontSize: '1rem' }}></i>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#3b2e43' }}>Request Context</h4>
                    </div>
                    <div style={{ background: '#f7f2f8', padding: '0.8rem', borderRadius: '10px', border: '1px solid #f2ebf4', fontSize: '0.8rem', color: '#5d4d62' }}>
                      <p style={{ margin: '0 0 0.4rem 0' }}><strong>Story:</strong> <span style={{ fontStyle: 'italic', color: '#665772' }}>"I am currently undergoing chemotherapy..."</span></p>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <span><strong>Contact:</strong> 09876543210</span>
                        <span><strong>Gender:</strong> Female</span>
                      </div>
                    </div>
                </div>

                <div className="track-actions" style={{ marginTop: 'auto' }}>
                  {request.status === 'Validated' && (
                    <Link 
                      to="/staff/matching" 
                      className="soft-btn" 
                      style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', 
                        padding: '0.8rem', fontSize: '0.85rem', fontWeight: 800, borderRadius: '12px',
                        background: 'linear-gradient(135deg, #cf2f84, #a71f68)',
                        color: '#fff', boxShadow: '0 4px 12px rgba(207, 47, 132, 0.25)'
                      }}
                    >
                      <i className='bx bx-link-external' style={{ fontSize: '1.1rem' }}></i>
                      Proceed to Matching
                    </Link>
                  )}
                  {request.status === 'Matched' && (
                    <button 
                      className="soft-btn" 
                      onClick={() => handleUpdateStatus(request.reference, 'recipient', 'In Transit')} 
                      disabled={isSubmitting} 
                      style={{ 
                        width: '100%', padding: '0.8rem', fontSize: '0.85rem', fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', 
                        borderRadius: '12px', border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #cf2f84, #a71f68)',
                        color: '#fff', boxShadow: '0 4px 12px rgba(207, 47, 132, 0.25)'
                      }}
                    >
                      <i className='bx bx-truck' style={{ fontSize: '1.1rem' }}></i>
                      Confirm Shipment
                    </button>
                  )}
                  {request.status === 'In Transit' && (
                    <button 
                      className="soft-btn" 
                      onClick={() => handleUpdateStatus(request.reference, 'recipient', 'Completed')} 
                      disabled={isSubmitting} 
                      style={{ 
                        width: '100%', padding: '0.8rem', fontSize: '0.85rem', fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', 
                        borderRadius: '12px', border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #cf2f84, #a71f68)',
                        color: '#fff', boxShadow: '0 4px 12px rgba(207, 47, 132, 0.25)'
                      }}
                    >
                      <i className='bx bx-home-heart' style={{ fontSize: '1.1rem' }}></i>
                      Confirm Delivery
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
        
        {((isDonation && data.donations.length === 0) || (!isDonation && data.requests.length === 0)) && (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#8c7895' }}>
            <i className='bx bx-search' style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '1rem' }}></i>
            <p>No active {isDonation ? 'donation' : 'request'} trackers found.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default StaffRealtimeTracking;
