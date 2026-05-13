import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../api/client';
import type { Donation, HairRequest, User, WigProduction } from '../types';
import { getPublicUrl, getProfilePhotoUrl } from '../lib/storage';
import StatusPill from '../components/StatusPill';
import ConfirmModal from '../components/ConfirmModal';

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
  const [materialLinks, setMaterialLinks] = useState<Record<string, string>>({});
  const [selectedDonations, setSelectedDonations] = useState<string[]>([]);
  const [batchWigmakerId, setBatchWigmakerId] = useState('');
  const [batchMaterialLink, setBatchMaterialLink] = useState('');
  const [showActionConfirm, setShowActionConfirm] = useState(false);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);
  type PendingAction = { reference: string; _type: 'donor' | 'recipient'; status: string; link?: string; label: string };
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const triggerAction = (ref: string, _type: 'donor' | 'recipient', status: string, label: string, link?: string) => {
    setPendingAction({ reference: ref, _type, status, label, link });
    setShowActionConfirm(true);
  };

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

  const handleUpdateStatus = async (reference: string, _type: 'donor' | 'recipient', status: string, deliveryTrackingLink?: string) => {
    setIsSubmitting(true);
    try {
      await apiClient.post(`/internal-api/staff/tracking/${reference}/status`, { 
        status, 
        delivery_tracking_link: deliveryTrackingLink 
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignBatch = () => {
    if (selectedDonations.length !== 6) {
      alert('You must select exactly 6 donations to create a batch.');
      return;
    }
    if (!batchWigmakerId) {
      alert('Please select a wigmaker.');
      return;
    }
    setShowBatchConfirm(true);
  };

  const doAssignBatch = async () => {
    setShowBatchConfirm(false);
    setIsSubmitting(true);
    try {
      await apiClient.post('/internal-api/staff/assign-batch', {
        wigmaker_id: batchWigmakerId,
        donation_references: selectedDonations,
        material_delivery_link: batchMaterialLink
      });
      alert('Batch assigned successfully!');
      setSelectedDonations([]);
      setBatchWigmakerId('');
      setBatchMaterialLink('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Assignment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelection = (ref: string) => {
    setSelectedDonations(prev => 
      prev.includes(ref) ? prev.filter(r => r !== ref) : [...prev, ref]
    );
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredDonations = (data.donations || []).filter(d => {
    const ref = d.reference || '';
    const name = `${d.user?.firstName || ''} ${d.user?.lastName || ''}`;
    return ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredRequests = (data.requests || []).filter(r => {
    const ref = r.reference || '';
    const name = `${r.user?.firstName || ''} ${r.user?.lastName || ''}`;
    return ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const isDonation = type === 'donation';

  // Add styles to the document head
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .tracking-row:hover {
        background: #fdf8fb !important;
        transform: scale(1.002);
        box-shadow: 0 4px 20px rgba(173, 36, 109, 0.05);
        z-index: 10;
        position: relative;
      }
      .tracking-row {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .avatar-preview:hover img {
        transform: scale(1.1);
      }
      .avatar-preview img {
        transition: transform 0.4s ease;
      }
      .tracking-table th {
        backdrop-filter: blur(8px);
        background: rgba(253, 247, 251, 0.9) !important;
        position: sticky;
        top: 0;
        z-index: 20;
      }
      .soft-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 15px rgba(173, 36, 109, 0.3) !important;
      }
      .soft-btn:active {
        transform: translateY(0);
      }
      .custom-select {
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ad246d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 0.8rem center;
        background-size: 1rem;
        padding-right: 2.5rem !important;
        transition: all 0.2s ease;
      }
      .custom-select:hover {
        border-color: #ad246d !important;
        box-shadow: 0 0 0 3px rgba(173, 36, 109, 0.1);
      }
      .custom-select:focus {
        outline: none;
        border-color: #ad246d !important;
        box-shadow: 0 0 0 3px rgba(173, 36, 109, 0.2);
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  if (loading) return <div className="section-wrap">Loading tracking data...</div>;

  return (
    <section className="section-wrap reveal active staff-page" style={{ maxWidth: '100%', margin: '0' }}>
      <div className="section-title-block" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit', fontSize: '2.2rem', fontWeight: 900, color: '#3b2e43', marginBottom: '0.2rem' }}>
            {type === 'donation' ? 'Donation Trackers' : 'Request Trackers'}
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#8c7895' }}>
            {type === 'donation' ? 'Monitor hair contributions and professional production stages.' : 'Monitor real-time status and manage workflow for wig requests.'}
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #ead7e8', color: '#ad246d', fontWeight: 800, padding: '0.5rem 1.2rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '50px', textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(73, 20, 52, 0.04)' }}>
          <span style={{ width: '8px', height: '8px', background: '#ad246d', borderRadius: '50%' }}></span>
          {isDonation ? filteredDonations.length : filteredRequests.length} Active {isDonation ? 'Donations' : 'Requests'}
        </div>
      </div>

      {isDonation && selectedDonations.length > 0 && (
        <div className="batch-action-bar" style={{ 
          position: 'sticky', 
          top: '20px', 
          zIndex: 100, 
          background: '#ad246d', 
          padding: '1rem 1.5rem', 
          borderRadius: '16px', 
          marginBottom: '1.5rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: '1rem',
          color: '#fff',
          boxShadow: '0 10px 30px rgba(173, 36, 109, 0.3)',
          animation: 'slideDown 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#fff', color: '#ad246d', width: '32px', height: '32px', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 900 }}>
              {selectedDonations.length}
            </div>
            <div style={{ fontWeight: 800 }}>
              {selectedDonations.length === 6 
                ? 'Batch ready to assign! 🚀' 
                : `Select ${6 - selectedDonations.length} more donations for a batch (6 required)`}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', flex: 1, maxWidth: '600px' }}>
            <input 
              type="text" 
              placeholder="Batch delivery link (optional)..." 
              value={batchMaterialLink}
              onChange={(e) => setBatchMaterialLink(e.target.value)}
              style={{ flex: 1, height: '36px', padding: '0 1rem', borderRadius: '8px', border: 'none', fontSize: '0.8rem', outline: 'none' }}
            />
            <select 
              value={batchWigmakerId}
              onChange={(e) => setBatchWigmakerId(e.target.value)}
              style={{ flex: 1, height: '36px', padding: '0 1rem', borderRadius: '8px', border: 'none', fontSize: '0.8rem', fontWeight: 700, color: '#ad246d', cursor: 'pointer' }}
            >
              <option value="">Select Wigmaker...</option>
              {data.wigmakers.map(wm => <option key={wm.id} value={wm.id}>{wm.firstName} {wm.lastName}</option>)}
            </select>
            <button 
              onClick={handleAssignBatch}
              disabled={selectedDonations.length !== 6 || !batchWigmakerId || isSubmitting}
              style={{ 
                height: '36px', 
                padding: '0 1.5rem', 
                borderRadius: '8px', 
                border: 'none', 
                background: selectedDonations.length === 6 ? '#fff' : 'rgba(255,255,255,0.3)', 
                color: selectedDonations.length === 6 ? '#ad246d' : '#fff', 
                fontWeight: 900, 
                cursor: selectedDonations.length === 6 ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease'
              }}
            >
              {isSubmitting ? '...' : 'Assign Batch'}
            </button>
          </div>
        </div>
      )}

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
        <div className="tracking-table-wrap" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(73, 20, 52, 0.05)' }}>
          <table className="tracking-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#fdf7fb' }}>
              <tr>
                <th style={{ padding: '1rem', textAlign: 'center', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {isDonation && <i className='bx bx-check-double'></i>}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Photo</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reference</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Donor/User</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spec / Details</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Stage</th>
                <th style={{ padding: '1rem', textAlign: 'center', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isDonation ? (
                filteredDonations.map((donation) => {
                  const wigProd = data.wigProductions[donation.id];
                  const isWigmakerControlled = !!wigProd || ['In Queue', 'In Progress', 'Processing'].includes(donation.status);
                  const stageIndex = ['Verified', 'Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received'].indexOf(donation.status);
                  const photoUrl = donation.photoFront ? getPublicUrl('hairlink', donation.photoFront) : null;

                  return (
                    <tr key={donation.id} style={{ borderTop: '1px solid #f2ebf4', transition: 'all 0.3s ease', cursor: 'default' }} className="tracking-row">
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {donation.status === 'Received Hair' && (
                          <div 
                            onClick={() => toggleSelection(donation.reference)}
                            style={{ 
                              width: '24px', 
                              height: '24px', 
                              borderRadius: '6px', 
                              border: `2px solid ${selectedDonations.includes(donation.reference) ? '#ad246d' : '#ead7e8'}`,
                              background: selectedDonations.includes(donation.reference) ? '#ad246d' : '#fff',
                              display: 'grid',
                              placeItems: 'center',
                              cursor: 'pointer',
                              margin: '0 auto',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {selectedDonations.includes(donation.reference) && <i className='bx bx-check' style={{ color: '#fff', fontSize: '1.1rem' }}></i>}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div className="avatar-preview" style={{ width: '56px', height: '56px', borderRadius: '14px', overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 4px 12px rgba(73, 20, 52, 0.08)', background: '#fdf7fb', position: 'relative' }}>
                          {photoUrl ? (
                            <img src={photoUrl} alt="Donation" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                              <i className='bx bx-image-alt' style={{ color: '#ecd8e8', fontSize: '1.4rem' }}></i>
                            </div>
                          )}
                          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '14px', height: '14px', background: '#10b981', border: '2px solid #fff', borderRadius: '50%' }}></div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#ad246d', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Ref: {(donation.reference || '').split('-')[0]}</span>
                          <strong style={{ color: '#2d2333', fontSize: '1rem', letterSpacing: '-0.01em' }}>{donation.reference || 'N/A'}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#8c7895', marginTop: '0.2rem' }}>
                            <i className='bx bx-time-five' style={{ marginRight: '4px', verticalAlign: 'middle' }}></i>
                            {donation.createdAt ? new Date(donation.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fff0f8', display: 'grid', placeItems: 'center', color: '#ad246d', fontWeight: 800, fontSize: '0.8rem', border: '1px solid #f8dceb', overflow: 'hidden' }}>
                            {donation.user?.profile_photo_url ? (
                              <img
                                src={getProfilePhotoUrl(donation.user.profile_photo_url) || ''}
                                alt="User"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              `${donation.user?.firstName?.[0] || ''}${donation.user?.lastName?.[0] || ''}`
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#3b2e43', fontSize: '0.9rem' }}>{donation.user?.firstName} {donation.user?.lastName}</div>
                            <div style={{ fontSize: '0.7rem', color: '#ad246d', fontWeight: 700, textTransform: 'uppercase' }}>Donor</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <span style={{ background: '#fdf7fb', border: '1px solid #f2ebf4', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', color: '#5d4d62', fontWeight: 600 }}>{donation.hairLength}</span>
                          <span style={{ background: '#fdf7fb', border: '1px solid #f2ebf4', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', color: '#5d4d62', fontWeight: 600 }}>{donation.hairColor}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <StatusPill status={donation.status} />
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ width: '160px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8c7895', textTransform: 'uppercase' }}>Workflow</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#ad246d' }}>{Math.round(((stageIndex + 1) / 6) * 100)}%</span>
                          </div>
                          <div style={{ height: '8px', background: '#f2f2f2', borderRadius: '10px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{
                              position: 'absolute', left: 0, top: 0, bottom: 0,
                              width: `${((stageIndex + 1) / 6) * 100}%`,
                              background: 'linear-gradient(90deg, #ad246d, #ff6bb5)',
                              borderRadius: '10px', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: '0 0 8px rgba(173, 36, 109, 0.3)'
                            }}></div>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#5d4d62', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className={`bx ${wigProd?.status === 'received' ? 'bx-check-circle' : (isWigmakerControlled ? 'bx-sync bx-spin' : 'bx-map-pin')}`} style={{ color: wigProd?.status === 'received' ? '#10b981' : '#ad246d' }}></i>
                            {isWigmakerControlled ? (
                              wigProd?.status === 'assigned' ? `Assigned to ${wigProd?.wigmaker?.firstName}` : 
                              wigProd?.status === 'processing' ? `Crafting by ${wigProd?.wigmaker?.firstName}` :
                              wigProd?.status === 'completed' ? `Wig Finished by ${wigProd?.wigmaker?.firstName}` :
                              wigProd?.status === 'shipped' ? 'Awaiting Wig Delivery' :
                              'Completed'
                            ) : donation.status}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        {donation.status === 'Verified' && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            {donation.donorDeliveryLink ? (
                              <>
                                <a
                                  href={donation.donorDeliveryLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ fontSize: '0.7rem', color: '#3b82f6', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', background: '#eff6ff', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #dbeafe' }}
                                >
                                  <i className='bx bx-link-external'></i> View Tracking
                                </a>
                                <button className="soft-btn" onClick={() => triggerAction(donation.reference, 'donor', 'Received Hair', 'Confirm Received')} disabled={isSubmitting} style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: 'linear-gradient(135deg, #ad246d, #8c1e58)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 800, boxShadow: '0 4px 10px rgba(173, 36, 109, 0.15)' }}>Confirm Received</button>
                              </>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: '#8c7895', fontStyle: 'italic', fontWeight: 600 }}>Awaiting Delivery Link...</span>
                            )}
                          </div>
                        )}
                        {donation.status === 'Received Hair' && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                             <span style={{ fontSize: '0.75rem', color: '#ad246d', fontWeight: 800 }}>Ready for Batching</span>
                             <span style={{ fontSize: '0.65rem', color: '#8c7895', fontWeight: 600 }}>Select 6 items above</span>
                          </div>
                        )}
                        {donation.status === 'Completed' && !isWigmakerControlled && (
                          <button className="soft-btn" onClick={() => triggerAction(donation.reference, 'donor', 'Wig Received', 'Confirm Receipt')} disabled={isSubmitting} style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: 'linear-gradient(135deg, #ad246d, #8c1e58)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 800, boxShadow: '0 4px 10px rgba(173, 36, 109, 0.15)' }}>Confirm Receipt</button>
                        )}
                        {wigProd?.status === 'shipped' && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            {wigProd.deliveryLink && (
                              <a 
                                href={wigProd.deliveryLink} 
                                target="_blank" 
                                rel="noreferrer" 
                                style={{ fontSize: '0.65rem', color: '#3b82f6', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', background: '#eff6ff', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #dbeafe' }}
                              >
                                <i className='bx bx-link-external'></i> Wig Tracking
                              </a>
                            )}
                            <button 
                              className="soft-btn" 
                              onClick={() => triggerAction(donation.reference, 'donor', 'Wig Received', 'Confirm Wig Received', wigProd.deliveryLink || undefined)} 
                              disabled={isSubmitting} 
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: 'linear-gradient(135deg, #ad246d, #8c1e58)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 800, boxShadow: '0 4px 10px rgba(173, 36, 109, 0.15)' }}
                            >
                              Confirm Wig Received
                            </button>
                          </div>
                        )}
                        {isWigmakerControlled && wigProd?.status === 'assigned' && <span style={{ color: '#8c7895', fontSize: '0.75rem', fontStyle: 'italic', fontWeight: 700 }}>Waiting to be received...</span>}
                        {isWigmakerControlled && wigProd?.status === 'processing' && <span style={{ color: '#8c7895', fontSize: '0.75rem', fontStyle: 'italic', fontWeight: 700 }}>Production in Progress...</span>}
                        {isWigmakerControlled && wigProd?.status === 'completed' && <span style={{ color: '#8c7895', fontSize: '0.75rem', fontStyle: 'italic', fontWeight: 700 }}>Wig Quality Checking...</span>}
                      </td>
                    </tr>
                  );
                })
              ) : (
                filteredRequests.map((request) => {
                  const stageIndex = ['Validated', 'Matched', 'In Transit', 'Completed'].indexOf(request.status);
                  const photoUrl = request.additionalPhoto ? getPublicUrl('hairlink', request.additionalPhoto) : null;

                  return (
                    <tr key={request.id} style={{ borderTop: '1px solid #f2ebf4', transition: 'all 0.3s ease', cursor: 'default' }} className="tracking-row">
                      <td style={{ padding: '1rem' }}></td>
                      <td style={{ padding: '1rem' }}>
                        <div className="avatar-preview" style={{ width: '56px', height: '56px', borderRadius: '14px', overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 4px 12px rgba(73, 20, 52, 0.08)', background: '#fdf7fb', position: 'relative' }}>
                          {photoUrl ? (
                            <img src={photoUrl} alt="Request" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                              <i className='bx bx-user-circle' style={{ color: '#ecd8e8', fontSize: '1.4rem' }}></i>
                            </div>
                          )}
                          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '14px', height: '14px', background: '#3b82f6', border: '2px solid #fff', borderRadius: '50%' }}></div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#ad246d', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Ref: {(request.reference || '').split('-')[0]}</span>
                          <strong style={{ color: '#2d2333', fontSize: '1rem', letterSpacing: '-0.01em' }}>{request.reference || 'N/A'}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#8c7895', marginTop: '0.2rem' }}>
                            <i className='bx bx-calendar' style={{ marginRight: '4px', verticalAlign: 'middle' }}></i>
                            {request.createdAt ? new Date(request.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'May 04, 2026'}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f0f7ff', display: 'grid', placeItems: 'center', color: '#3b82f6', fontWeight: 800, fontSize: '0.8rem', border: '1px solid #dbeafe', overflow: 'hidden' }}>
                            {request.user?.profile_photo_url ? (
                              <img
                                src={getProfilePhotoUrl(request.user.profile_photo_url) || ''}
                                alt="User"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              `${request.user?.firstName?.[0] || ''}${request.user?.lastName?.[0] || ''}`
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#3b2e43', fontSize: '0.9rem' }}>{request.user?.firstName} {request.user?.lastName}</div>
                            <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase' }}>Recipient</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <span style={{ background: '#f7faff', border: '1px solid #e0ebff', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', color: '#1e40af', fontWeight: 600 }}>{request.wigLength}</span>
                          <span style={{ background: '#f7faff', border: '1px solid #e0ebff', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', color: '#1e40af', fontWeight: 600 }}>{request.wigColor}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <StatusPill status={request.status} />
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ width: '160px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8c7895', textTransform: 'uppercase' }}>Progress</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#ad246d' }}>{Math.round(((stageIndex + 1) / 4) * 100)}%</span>
                          </div>
                          <div style={{ height: '8px', background: '#f2f2f2', borderRadius: '10px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{
                              position: 'absolute', left: 0, top: 0, bottom: 0,
                              width: `${((stageIndex + 1) / 4) * 100}%`,
                              background: 'linear-gradient(90deg, #ad246d, #ff6bb5)',
                              borderRadius: '10px', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: '0 0 8px rgba(173, 36, 109, 0.3)'
                            }}></div>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#5d4d62', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className='bx bx-map-pin' style={{ color: '#ad246d' }}></i>
                            {request.status}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        {request.status === 'Validated' && (
                          <Link to={`/staff/matching?reference=${request.reference}`} className="soft-btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: 'linear-gradient(135deg, #ad246d, #8c1e58)', color: '#fff', textDecoration: 'none', borderRadius: '50px', display: 'inline-block', fontWeight: 800, boxShadow: '0 4px 10px rgba(173, 36, 109, 0.15)' }}>Match Wig</Link>
                        )}
                        {request.status === 'Matched' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '180px' }}>
                            <div style={{ position: 'relative' }}>
                              <i className='bx bx-link' style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#ad246d', fontSize: '0.9rem' }}></i>
                              <input
                                type="text"
                                placeholder="Recipient tracking link..."
                                value={materialLinks[request.reference] || ''}
                                onChange={(e) => setMaterialLinks(prev => ({ ...prev, [request.reference]: e.target.value }))}
                                style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', borderRadius: '10px', border: '1px solid #ead7e8', fontSize: '0.7rem', outline: 'none' }}
                              />
                            </div>
                            <button 
                              className="soft-btn" 
                              onClick={() => {
                                const link = materialLinks[request.reference];
                                triggerAction(request.reference, 'recipient', 'In Transit', 'Ship Wig', link);
                              }} 
                              disabled={isSubmitting} 
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: 'linear-gradient(135deg, #ad246d, #8c1e58)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 800, boxShadow: '0 4px 10px rgba(173, 36, 109, 0.15)' }}
                            >
                              Ship Wig
                            </button>
                          </div>
                        )}
                        {request.status === 'In Transit' && (
                          <span style={{ color: '#8c7895', fontSize: '0.75rem', fontStyle: 'italic', fontWeight: 700 }}>Awaiting Recipient Confirmation...</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
              {((isDonation && data.donations.length === 0) || (!isDonation && data.requests.length === 0)) && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '4rem 0', color: '#8c7895' }}>
                    <i className='bx bx-search' style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '1rem' }}></i>
                    <p>No active {isDonation ? 'donation' : 'request'} trackers found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={showActionConfirm}
        onClose={() => { setShowActionConfirm(false); setPendingAction(null); }}
        onConfirm={() => {
          if (!pendingAction) return;
          setShowActionConfirm(false);
          handleUpdateStatus(pendingAction.reference, pendingAction._type, pendingAction.status, pendingAction.link);
          setPendingAction(null);
        }}
        title={pendingAction?.label || 'Confirm Action'}
        message={`Are you sure you want to ${pendingAction?.status === 'In Transit' ? 'mark this wig as shipped and notify the recipient' : pendingAction?.status === 'Received Hair' ? 'confirm receipt of this hair donation' : 'confirm receipt of this finished wig'}?`}
        confirmText={`Yes, ${pendingAction?.label || 'Confirm'}`}
        isConfirming={isSubmitting}
      />

      <ConfirmModal
        isOpen={showBatchConfirm}
        onClose={() => setShowBatchConfirm(false)}
        onConfirm={doAssignBatch}
        title="Assign Batch to Wigmaker"
        message={`Assign ${selectedDonations.length} selected donations to the chosen wigmaker? This will notify the wigmaker and update all donation statuses.`}
        confirmText="Yes, Assign Batch"
        isConfirming={isSubmitting}
      />
    </section>
  );
};

export default StaffRealtimeTracking;
