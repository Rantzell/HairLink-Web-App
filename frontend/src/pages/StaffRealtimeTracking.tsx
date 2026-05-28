import '../styles/StaffRealtimeTracking.css';
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
  const [batchOpen, setBatchOpen] = useState<Record<number, boolean>>({});
  const [pendingBatchRefs, setPendingBatchRefs] = useState<string[]>([]);
  const [pendingBatchStatus, setPendingBatchStatus] = useState<{ status: string; link?: string } | null>(null);
  const [showBatchActionConfirm, setShowBatchActionConfirm] = useState(false);
  const [showDeliveryLinkModal, setShowDeliveryLinkModal] = useState(false);
  const [deliveryLinkTaskCode, setDeliveryLinkTaskCode] = useState('');
  const [deliveryLinkValue, setDeliveryLinkValue] = useState('');

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

  // Group batched donations by wigProductionId
  const batchGroups = new Map<number, { wp: any; donations: typeof filteredDonations }>();
  const soloDonations: typeof filteredDonations = [];
  for (const d of filteredDonations) {
    const wpId = (d as any).wigProductionId as number | null;
    if (wpId) {
      const wp = data.wigProductions[d.id];
      if (wp) {
        if (!batchGroups.has(wpId)) batchGroups.set(wpId, { wp, donations: [] });
        batchGroups.get(wpId)!.donations.push(d);
      } else {
        soloDonations.push(d);
      }
    } else {
      soloDonations.push(d);
    }
  }

  const triggerBatchAction = (refs: string[], status: string, link?: string) => {
    setPendingBatchRefs(refs);
    setPendingBatchStatus({ status, link });
    setShowBatchActionConfirm(true);
  };

  const doBatchStatusUpdate = async () => {
    setShowBatchActionConfirm(false);
    setIsSubmitting(true);
    try {
      for (const ref of pendingBatchRefs) {
        await apiClient.post(`/internal-api/staff/tracking/${ref}/status`, {
          status: pendingBatchStatus!.status,
          delivery_tracking_link: pendingBatchStatus!.link,
        });
      }
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Batch update failed');
    } finally {
      setIsSubmitting(false);
      setPendingBatchRefs([]);
      setPendingBatchStatus(null);
    }
  };

  const handleOpenDeliveryLinkModal = (taskCode: string, currentLink: string) => {
    setDeliveryLinkTaskCode(taskCode);
    setDeliveryLinkValue(currentLink || '');
    setShowDeliveryLinkModal(true);
  };

  const handleSaveDeliveryLink = async () => {
    if (!deliveryLinkValue) {
      alert('Please enter a tracking URL.');
      return;
    }
    try {
      new URL(deliveryLinkValue);
    } catch (_) {
      alert('Please enter a valid absolute URL (e.g., https://...).');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(`/internal-api/staff/batches/${deliveryLinkTaskCode}/delivery-link`, {
        material_delivery_link: deliveryLinkValue
      });
      setShowDeliveryLinkModal(false);
      setDeliveryLinkTaskCode('');
      setDeliveryLinkValue('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update material delivery link');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="section-wrap">Loading tracking data...</div>;

  return (
    <section className="section-wrap reveal active staff-page tracking-page">
      <div className="section-title-block tracking-title-block">
        <div>
          <h1 className="tracking-page-title">
            {type === 'donation' ? 'Donation Trackers' : 'Request Trackers'}
          </h1>
          <p className="tracking-page-subtitle">
            {type === 'donation' ? 'Monitor hair contributions and professional production stages.' : 'Monitor real-time status and manage workflow for wig requests.'}
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #ead7e8', color: '#ad246d', fontWeight: 800, padding: '0.5rem 1.2rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '50px', textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(73, 20, 52, 0.04)' }}>
          <span className="tracking-active-dot"></span>
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
          <div className="batch-action-left">
            <div className="batch-count-badge">
              {selectedDonations.length}
            </div>
            <div className="batch-status-text">
              {selectedDonations.length === 6 
                ? 'Batch ready to assign! 🚀' 
                : `Select ${6 - selectedDonations.length} more donations for a batch (6 required)`}
            </div>
          </div>
          
          <div className="batch-action-right">
            <input 
              type="text" 
              placeholder="Batch delivery link (optional)..." 
              value={batchMaterialLink}
              onChange={(e) => setBatchMaterialLink(e.target.value)}
              className="batch-input"
            />
            <select 
              value={batchWigmakerId}
              onChange={(e) => setBatchWigmakerId(e.target.value)}
              className="batch-select custom-select"
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
      <div className="search-container tracking-search-container">
        <div className="tracking-search-wrapper">
          <i className='bx bx-search tracking-search-icon'></i>
          <input
            type="text"
            placeholder={`Search ${isDonation ? 'donors' : 'recipients'} or reference #...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="tracking-search-input"
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

      <div className="tracking-list-layout tracking-list-layout-margin">
        <div className="tracking-table-wrap" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(73, 20, 52, 0.05)' }}>
          <table className="tracking-table tracking-table">
            <thead className="tracking-thead">
              <tr>
                <th className="tracking-th tracking-th-center">
                  {isDonation && <i className='bx bx-check-double'></i>}
                </th>
                <th className="tracking-th">Photo</th>
                <th className="tracking-th">Reference</th>
                <th className="tracking-th">Donor/User</th>
                <th className="tracking-th">Status</th>
                <th className="tracking-th">Current Stage</th>
                <th className="tracking-th tracking-th-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {isDonation ? (
                <>
                  {/* ── Batch Rows ── */}
                  {Array.from(batchGroups.entries()).map(([wpId, { wp, donations: bd }]) => {
                    const isOpen = !!batchOpen[wpId];
                    const stageLabel =
                      wp.status === 'assigned' ? `Assigned to ${wp.wigmaker?.firstName || 'Wigmaker'}` :
                      wp.status === 'processing' ? `Crafting by ${wp.wigmaker?.firstName || 'Wigmaker'}` :
                      wp.status === 'completed' ? `Finished by ${wp.wigmaker?.firstName || 'Wigmaker'}` :
                      wp.status === 'shipped' ? 'Awaiting Wig Delivery' : 'Completed';
                    return (
                      <React.Fragment key={`batch-${wpId}`}>
                        <tr className="tracking-row tracking-batch-main-row">
                          <td className="tracking-cell-center">
                            <div className="tracking-batch-layer-icon"><i className="bx bx-layer"></i></div>
                          </td>
                          <td className="tracking-cell">
                            <div className="tracking-batch-pkg-cell"><i className="bx bx-package"></i></div>
                          </td>
                          <td className="tracking-cell">
                            <div className="tracking-ref-col">
                              <span className="tracking-ref-prefix tracking-batch-ref-label">Batch Ref</span>
                              <strong className="tracking-ref-value">{wp.taskCode}</strong>
                              <div className="tracking-batch-count">{bd.length} donations merged</div>
                            </div>
                          </td>
                          <td className="tracking-cell">
                            <button
                              className="tracking-batch-toggle-btn"
                              onClick={() => setBatchOpen(prev => ({ ...prev, [wpId]: !isOpen }))}
                            >
                              <i className={`bx ${isOpen ? 'bx-chevron-up' : 'bx-chevron-down'}`}></i>
                              {isOpen ? 'Hide' : 'View'} {bd.length} Donors
                            </button>
                          </td>
                          <td className="tracking-cell"><StatusPill status={wp.status} /></td>
                          <td className="tracking-cell">
                            <div className="tracking-progress-col">
                              <div className="tracking-progress-status">
                                <i className={`bx ${wp.status === 'received' ? 'bx-check-circle' : 'bx-sync bx-spin'}`}
                                   style={{ color: wp.status === 'received' ? '#10b981' : '#ad246d' }}></i>
                                {stageLabel}
                              </div>
                            </div>
                          </td>
                          <td className="tracking-action-cell">
                            {wp.status === 'shipped' && (
                              <div className="tracking-action-col">
                                {wp.deliveryLink && (
                                  <a href={wp.deliveryLink} target="_blank" rel="noreferrer" className="tracking-link-btn">
                                    <i className='bx bx-link-external'></i> Wig Tracking
                                  </a>
                                )}
                                <button
                                  className="soft-btn"
                                  onClick={() => triggerBatchAction(bd.map(d => d.reference), 'Wig Received', wp.deliveryLink || undefined)}
                                  disabled={isSubmitting}
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: 'linear-gradient(135deg, #ad246d, #8c1e58)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 800 }}
                                >
                                  Confirm Batch Received
                                </button>
                              </div>
                            )}
                            {wp.status === 'assigned' && (
                              <div className="tracking-action-col-wide" style={{ gap: '0.4rem', minWidth: '180px', alignItems: 'center' }}>
                                {wp.materialDeliveryLink ? (
                                  <>
                                    <a href={wp.materialDeliveryLink} target="_blank" rel="noreferrer" className="tracking-link-btn" style={{ justifyContent: 'center', width: '100%' }}>
                                      <i className='bx bx-link-external'></i> Material Tracking
                                    </a>
                                    <button
                                      className="soft-btn"
                                      onClick={() => handleOpenDeliveryLinkModal(wp.taskCode, wp.materialDeliveryLink || '')}
                                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.65rem', background: '#fdf7fb', border: '1px solid #f1a8cf', color: '#ad246d', borderRadius: '50px', cursor: 'pointer', fontWeight: 700 }}
                                    >
                                      Update Link
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="tracking-awaiting-text" style={{ marginBottom: '0.2rem' }}>Ready for shipping</span>
                                    <button
                                      className="tracking-action-btn"
                                      onClick={() => handleOpenDeliveryLinkModal(wp.taskCode, '')}
                                      style={{ padding: '0.35rem 0.8rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                      <i className='bx bxs-ship'></i> Ship Materials
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                            {wp.status === 'processing' && <span className="tracking-awaiting-text">Production in Progress...</span>}
                            {wp.status === 'completed' && <span className="tracking-awaiting-text">Wig Quality Checking...</span>}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="tracking-batch-expanded-row">
                            <td colSpan={7} className="tracking-batch-expanded-cell">
                              <div className="tracking-batch-expanded-inner">
                                <div className="tracking-batch-expanded-header">
                                  <i className="bx bx-group"></i> Batch Donors — {wp.taskCode}
                                </div>
                                <table className="tracking-batch-inner-table">
                                  <thead>
                                    <tr>
                                      <th>Ref #</th>
                                      <th>Donor Name</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {bd.map(d => (
                                      <tr key={d.id}>
                                        <td><code className="tracking-inner-ref">{d.reference}</code></td>
                                        <td>
                                          <div className="tracking-inner-donor">
                                            <div className="tracking-inner-avatar">
                                              {(d.user?.firstName?.[0] || '') + (d.user?.lastName?.[0] || '')}
                                            </div>
                                            {d.user?.firstName} {d.user?.lastName}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* ── Solo (un-batched) Donation Rows ── */}
                  {soloDonations.map((donation) => {
                  const wigProd = data.wigProductions[donation.id];
                  const isWigmakerControlled = !!wigProd || ['In Queue', 'In Progress', 'Processing'].includes(donation.status);
                  const stageIndex = ['Verified', 'Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received'].indexOf(donation.status);
                  const photoUrl = donation.photoFront ? getPublicUrl('hairlink', donation.photoFront) : null;

                  return (
                    <tr key={donation.id} className="tracking-row tracking-row">
                      <td className="tracking-cell-center">
                        {donation.status === 'Received Hair' && (
                          <div 
                            onClick={() => toggleSelection(donation.reference)}
                            className={selectedDonations.includes(donation.reference) ? 'tracking-checkbox checked' : 'tracking-checkbox'}
                          >
                            {selectedDonations.includes(donation.reference) && <i className="bx bx-check tracking-checkbox-icon"></i>}
                          </div>
                        )}
                      </td>
                      <td className="tracking-cell">
                        <div className="avatar-preview" style={{ width: '56px', height: '56px', borderRadius: '14px', overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 4px 12px rgba(73, 20, 52, 0.08)', background: '#fdf7fb', position: 'relative' }}>
                          {photoUrl ? (
                            <img src={photoUrl} alt="Donation" className="tracking-avatar-img" />
                          ) : (
                            <div className="tracking-avatar-placeholder">
                              <i className="bx bx-image-alt tracking-avatar-icon"></i>
                            </div>
                          )}
                          <div className="tracking-status-dot green"></div>
                        </div>
                      </td>
                      <td className="tracking-cell">
                        <div className="tracking-ref-col">
                          <span className="tracking-ref-prefix">Ref: {(donation.reference || '').split('-')[0]}</span>
                          <strong className="tracking-ref-value">{donation.reference || 'N/A'}</strong>
                          <div className="tracking-ref-date">
                            <i className='bx bx-time-five' style={{ marginRight: '4px', verticalAlign: 'middle' }}></i>
                            {donation.createdAt ? new Date(donation.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="tracking-cell">
                        <div className="tracking-user-col">
                          <div className="tracking-user-avatar tracking-user-avatar-donor">
                            {donation.user?.profile_photo_url ? (
                              <img
                                src={getProfilePhotoUrl(donation.user.profile_photo_url) || ''}
                                alt="User"
                                className="tracking-avatar-img"
                              />
                            ) : (
                              `${donation.user?.firstName?.[0] || ''}${donation.user?.lastName?.[0] || ''}`
                            )}
                          </div>
                          <div>
                            <div className="tracking-user-name">{donation.user?.firstName} {donation.user?.lastName}</div>
                            <div className="tracking-user-role-donor">Donor</div>
                          </div>
                        </div>
                      </td>
                      <td className="tracking-cell">
                        <StatusPill status={donation.status} />
                      </td>
                      <td className="tracking-cell">
                        <div className="tracking-progress-col">
                          <div className="tracking-progress-head">
                            <span className="tracking-progress-label">Workflow</span>
                            <span className="tracking-progress-percent">{Math.round(((stageIndex + 1) / 6) * 100)}%</span>
                          </div>
                          <div className="tracking-progress-bar-bg">
                            <div style={{
                              position: 'absolute', left: 0, top: 0, bottom: 0,
                              width: `${((stageIndex + 1) / 6) * 100}%`,
                              background: 'linear-gradient(90deg, #ad246d, #ff6bb5)',
                              borderRadius: '10px', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: '0 0 8px rgba(173, 36, 109, 0.3)'
                            }}></div>
                          </div>
                          <div className="tracking-progress-status">
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
                      <td className="tracking-action-cell">
                        {donation.status === 'Verified' && (
                          <div className="tracking-action-col">
                            {donation.donorDeliveryLink ? (
                              <>
                                <a
                                  href={donation.donorDeliveryLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="tracking-link-btn"
                                >
                                  <i className='bx bx-link-external'></i> View Tracking
                                </a>
                                <button className="soft-btn" onClick={() => triggerAction(donation.reference, 'donor', 'Received Hair', 'Confirm Received')} disabled={isSubmitting} style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: 'linear-gradient(135deg, #ad246d, #8c1e58)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 800, boxShadow: '0 4px 10px rgba(173, 36, 109, 0.15)' }}>Confirm Received</button>
                              </>
                            ) : (
                              <span className="tracking-awaiting-text">Awaiting Delivery Link...</span>
                            )}
                          </div>
                        )}
                        {donation.status === 'Received Hair' && (
                          <div className="tracking-batch-ready-col">
                             <span className="tracking-batch-ready-title">Ready for Batching</span>
                             <span className="tracking-batch-ready-sub">Select 6 items above</span>
                          </div>
                        )}
                        {donation.status === 'Completed' && !isWigmakerControlled && (
                          <button className="soft-btn" onClick={() => triggerAction(donation.reference, 'donor', 'Wig Received', 'Confirm Receipt')} disabled={isSubmitting} style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: 'linear-gradient(135deg, #ad246d, #8c1e58)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 800, boxShadow: '0 4px 10px rgba(173, 36, 109, 0.15)' }}>Confirm Receipt</button>
                        )}
                        {wigProd?.status === 'shipped' && (
                          <div className="tracking-action-col">
                            {wigProd.deliveryLink && (
                              <a 
                                href={wigProd.deliveryLink} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="tracking-link-btn"
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
                        {isWigmakerControlled && wigProd?.status === 'assigned' && <span className="tracking-awaiting-text">Waiting to be received...</span>}
                        {isWigmakerControlled && wigProd?.status === 'processing' && <span className="tracking-awaiting-text">Production in Progress...</span>}
                        {isWigmakerControlled && wigProd?.status === 'completed' && <span className="tracking-awaiting-text">Wig Quality Checking...</span>}
                      </td>
                    </tr>
                  );
                })}
                </>
              ) : (
                filteredRequests.map((request) => {
                  const stageIndex = ['Validated', 'Matched', 'In Transit', 'Completed'].indexOf(request.status);
                  const photoUrl = request.additionalPhoto ? getPublicUrl('hairlink', request.additionalPhoto) : null;

                  return (
                    <tr key={request.id} className="tracking-row tracking-row">
                      <td className="tracking-cell"></td>
                      <td className="tracking-cell">
                        <div className="avatar-preview" style={{ width: '56px', height: '56px', borderRadius: '14px', overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 4px 12px rgba(73, 20, 52, 0.08)', background: '#fdf7fb', position: 'relative' }}>
                          {photoUrl ? (
                            <img src={photoUrl} alt="Request" className="tracking-avatar-img" />
                          ) : (
                            <div className="tracking-avatar-placeholder">
                              <i className="bx bx-user-circle tracking-avatar-icon"></i>
                            </div>
                          )}
                          <div className="tracking-status-dot blue"></div>
                        </div>
                      </td>
                      <td className="tracking-cell">
                        <div className="tracking-ref-col">
                          <span className="tracking-ref-prefix">Ref: {(request.reference || '').split('-')[0]}</span>
                          <strong className="tracking-ref-value">{request.reference || 'N/A'}</strong>
                          <div className="tracking-ref-date">
                            <i className='bx bx-calendar' style={{ marginRight: '4px', verticalAlign: 'middle' }}></i>
                            {request.createdAt ? new Date(request.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'May 04, 2026'}
                          </div>
                        </div>
                      </td>
                      <td className="tracking-cell">
                        <div className="tracking-user-col">
                          <div className="tracking-user-avatar tracking-user-avatar-recipient">
                            {request.user?.profile_photo_url ? (
                              <img
                                src={getProfilePhotoUrl(request.user.profile_photo_url) || ''}
                                alt="User"
                                className="tracking-avatar-img"
                              />
                            ) : (
                              `${request.user?.firstName?.[0] || ''}${request.user?.lastName?.[0] || ''}`
                            )}
                          </div>
                          <div>
                            <div className="tracking-user-name">{request.user?.firstName} {request.user?.lastName}</div>
                            <div className="tracking-user-role-recipient">Recipient</div>
                          </div>
                        </div>
                      </td>
                      <td className="tracking-cell">
                        <StatusPill status={request.status} />
                      </td>
                      <td className="tracking-cell">
                        <div className="tracking-progress-col">
                          <div className="tracking-progress-head">
                            <span className="tracking-progress-label">Progress</span>
                            <span className="tracking-progress-percent">{Math.round(((stageIndex + 1) / 4) * 100)}%</span>
                          </div>
                          <div className="tracking-progress-bar-bg">
                            <div style={{
                              position: 'absolute', left: 0, top: 0, bottom: 0,
                              width: `${((stageIndex + 1) / 4) * 100}%`,
                              background: 'linear-gradient(90deg, #ad246d, #ff6bb5)',
                              borderRadius: '10px', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: '0 0 8px rgba(173, 36, 109, 0.3)'
                            }}></div>
                          </div>
                          <div className="tracking-progress-status">
                            <i className='bx bx-map-pin' style={{ color: '#ad246d' }}></i>
                            {request.status}
                          </div>
                        </div>
                      </td>
                      <td className="tracking-action-cell">
                        {request.status === 'Validated' && (
                          <Link to={`/staff/matching?reference=${request.reference}`} className="soft-btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: 'linear-gradient(135deg, #ad246d, #8c1e58)', color: '#fff', textDecoration: 'none', borderRadius: '50px', display: 'inline-block', fontWeight: 800, boxShadow: '0 4px 10px rgba(173, 36, 109, 0.15)' }}>Match Wig</Link>
                        )}
                        {request.status === 'Matched' && (
                          <div className="tracking-action-col-wide">
                            <div className="tracking-input-wrapper">
                              <i className='bx bx-link' style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#ad246d', fontSize: '0.9rem' }}></i>
                              <input
                                type="text"
                                placeholder="Recipient tracking link..."
                                value={materialLinks[request.reference] || ''}
                                onChange={(e) => setMaterialLinks(prev => ({ ...prev, [request.reference]: e.target.value }))}
                                className="tracking-input"
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
                          <span className="tracking-awaiting-text">Awaiting Recipient Confirmation...</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
              {((isDonation && data.donations.length === 0) || (!isDonation && data.requests.length === 0)) && (
                <tr>
                  <td colSpan={6} className="tracking-empty-col">
                    <i className="bx bx-search tracking-empty-icon"></i>
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

      <ConfirmModal
        isOpen={showBatchActionConfirm}
        onClose={() => { setShowBatchActionConfirm(false); setPendingBatchRefs([]); setPendingBatchStatus(null); }}
        onConfirm={doBatchStatusUpdate}
        title="Confirm Batch Receipt"
        message={`Mark all ${pendingBatchRefs.length} donations in this batch as received? This will update all donor statuses.`}
        confirmText="Yes, Confirm All"
        isConfirming={isSubmitting}
      />

      {showDeliveryLinkModal && (
        <div
          id="delivery-link-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowDeliveryLinkModal(false); } }}
          style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(30, 18, 36, 0.55)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
            animation: 'cmFadeIn 0.18s ease',
          }}
        >
          <div
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
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: '#fdf2f8',
                display: 'grid', placeItems: 'center',
                border: '2px solid #f9cde8',
              }}>
                <i className='bx bx-package' style={{ fontSize: '1.75rem', color: '#ad246d' }} />
              </div>
            </div>

            <h2 style={{
              textAlign: 'center', margin: '0 0 0.5rem 0',
              fontSize: '1.1rem', fontWeight: 800, color: '#3b2e43',
            }}>
              Provide Delivery Link
            </h2>
            <p style={{
              textAlign: 'center', margin: '0 0 1.25rem 0',
              fontSize: '0.875rem', color: '#8c7895', lineHeight: 1.5,
            }}>
              Enter the tracking URL for the hair materials package (Batch <strong>{deliveryLinkTaskCode}</strong>) being shipped to the wigmaker.
            </p>

            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ position: 'relative' }}>
                <i className='bx bx-link' style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#ad246d', fontSize: '1.1rem' }} />
                <input
                  type="text"
                  placeholder="https://tracking-url.com/shipment/123..."
                  value={deliveryLinkValue}
                  onChange={(e) => setDeliveryLinkValue(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    borderRadius: '12px',
                    border: '1.5px solid #ead7e8',
                    fontSize: '0.875rem',
                    color: '#3b2e43',
                    outline: 'none',
                    background: '#fdfbfe',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                onClick={() => setShowDeliveryLinkModal(false)}
                disabled={isSubmitting}
                style={{
                  height: '44px', borderRadius: '50px',
                  border: '1.5px solid #ead7e8', background: '#fff',
                  color: '#5d4d62', fontWeight: 700, fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDeliveryLink}
                disabled={isSubmitting}
                style={{
                  height: '44px', borderRadius: '50px',
                  border: 'none', background: 'linear-gradient(135deg, #ad246d 0%, #cf2f84 100%)',
                  color: '#fff', fontWeight: 700, fontSize: '0.875rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.75 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
              >
                {isSubmitting ? 'Saving...' : 'Save & Ship'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default StaffRealtimeTracking;
