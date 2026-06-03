import toast from 'react-hot-toast';
import '../styles/StaffRealtimeTracking.css';
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Pagination from '../components/Pagination';
import apiClient from '../api/client';
import type { Donation, HairRequest, User, WigProduction } from '../types';
import { getPublicUrl, getProfilePhotoUrl } from '../lib/storage';
import StatusPill from '../components/StatusPill';
import ConfirmModal from '../components/ConfirmModal';

const StaffRealtimeTracking: React.FC = () => {
  const { type } = useParams<{ type: 'donation' | 'recipient' | 'wigmaker' }>();
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
  const [batchStaffNote, setBatchStaffNote] = useState('');
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
      if (status === 'Ready for Pickup') {
        await apiClient.post(`/internal-api/staff/requests/${reference}/ready-for-pickup`);
      } else if (status === 'Completed' && _type === 'recipient') {
        // For pickup requests: recipient has confirmed pickup, staff marks complete
        await apiClient.post(`/internal-api/staff/requests/${reference}/complete-pickup`);
      } else {
        await apiClient.post(`/internal-api/staff/tracking/${reference}/status`, {
          status,
          delivery_tracking_link: deliveryTrackingLink,
        });
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignBatch = () => {
    if (selectedDonations.length === 0) {
      toast.error('Please select at least 1 donation to create a batch.');
      return;
    }
    if (!batchMaterialLink.trim()) {
      toast.error('Please provide a batch delivery tracking link.');
      return;
    }
    try {
      new URL(batchMaterialLink);
    } catch (_) {
      toast.error('Please enter a valid URL for the batch delivery link.');
      return;
    }
    if (!batchWigmakerId) {
      toast.error('Please select a wigmaker.');
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
        material_delivery_link: batchMaterialLink,
        staff_note: batchStaffNote || undefined
      });
      toast.success('Batch assigned successfully!');
      setSelectedDonations([]);
      setBatchWigmakerId('');
      setBatchMaterialLink('');
      setBatchStaffNote('');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Assignment failed');
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
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 10;

  // Reset page when view or search changes
  useEffect(() => { setCurrentPage(1); }, [type, searchTerm]);

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

  const isWigmaker = type === 'wigmaker';  // WIG-XXXXXX batch rows only
  const isDonation = type === 'donation';  // solo HD- donation rows only

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

  // Pagination slices — computed after grouping loop
  const batchGroupsArray = Array.from(batchGroups.entries());
  const batchTotalPages = Math.ceil(batchGroupsArray.length / PAGE_SIZE);
  const pagedBatchGroups = batchGroupsArray.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const donationTotalPages = Math.ceil(soloDonations.length / PAGE_SIZE);
  const pagedSoloDonations = soloDonations.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const requestTotalPages = Math.ceil(filteredRequests.length / PAGE_SIZE);
  const pagedRequests = filteredRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
      toast.error(err.response?.data?.message || 'Batch update failed');
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
      toast.error('Please enter a tracking URL.');
      return;
    }
    try {
      new URL(deliveryLinkValue);
    } catch (_) {
      toast.error('Please enter a valid absolute URL (e.g., https://...).');
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
      toast.error(err.response?.data?.message || 'Failed to update material delivery link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiveWig = async (wigId: number) => {
    setIsSubmitting(true);
    try {
      await apiClient.post(`/internal-api/staff/wigs/${wigId}/receive`);
      toast.success('Wig marked as received and added to stock!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update wig status');
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
            {isWigmaker ? 'Wigmaker Tracking' : isDonation ? 'Donation Trackers' : 'Request Trackers'}
          </h1>
          <p className="tracking-page-subtitle">
            {isWigmaker
              ? 'Monitor wig production batches assigned to wigmakers.'
              : isDonation
                ? 'Monitor received hair donations and batch assignment.'
                : 'Monitor real-time status and manage workflow for wig requests.'}
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #ead7e8', color: '#ad246d', fontWeight: 800, padding: '0.5rem 1.2rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '50px', textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(73, 20, 52, 0.04)' }}>
          <span className="tracking-active-dot"></span>
          {isWigmaker ? batchGroups.size : isDonation ? soloDonations.length : filteredRequests.length} Active {isWigmaker ? 'Batches' : isDonation ? 'Donations' : 'Requests'}
        </div>
      </div>

      {(isDonation || isWigmaker) && selectedDonations.length > 0 && (
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
              {selectedDonations.length > 0
                ? `${selectedDonations.length} donation${selectedDonations.length > 1 ? 's' : ''} selected — ready to assign! 🚀`
                : 'Select donations to create a batch'}
            </div>
          </div>

          <div className="batch-action-right">
            <input
              type="text"
              placeholder="Batch delivery link"
              value={batchMaterialLink}
              onChange={(e) => setBatchMaterialLink(e.target.value)}
              className="batch-input"
            />
            <input
              type="text"
              placeholder="Note to wigmaker (optional)..."
              value={batchStaffNote}
              onChange={(e) => setBatchStaffNote(e.target.value)}
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
              disabled={selectedDonations.length === 0 || !batchWigmakerId || isSubmitting}
              style={{
                height: '36px',
                padding: '0 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: selectedDonations.length > 0 ? '#fff' : 'rgba(255,255,255,0.3)',
                color: selectedDonations.length > 0 ? '#ad246d' : '#fff',
                fontWeight: 900,
                cursor: selectedDonations.length > 0 ? 'pointer' : 'not-allowed',
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
            placeholder={`Search ${isWigmaker ? 'batch/wigmaker' : isDonation ? 'donors' : 'recipients'} or reference #...`}
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
        <div className="tracking-table-wrap" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', overflowX: 'auto', boxShadow: '0 10px 30px rgba(73, 20, 52, 0.05)' }}>
          <table className="tracking-table tracking-table">
            <thead className="tracking-thead">
              <tr>
                <th className="tracking-th tracking-th-center">
                  {isDonation && <i className='bx bx-check-double'></i>}
                </th>
                <th className="tracking-th">Photo</th>
                <th className="tracking-th">Reference</th>
                <th className="tracking-th">{isWigmaker ? 'Wig Specification' : 'Donor/User'}</th>
                <th className="tracking-th">Status</th>
                <th className="tracking-th">Current Stage</th>
                <th className="tracking-th tracking-th-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {isWigmaker ? (
                <>
                  {/* ── Wigmaker view: Batch Rows ONLY (WIG-XXXXXX) ── */}
                  {pagedBatchGroups.map(([wpId, { wp, donations: bd }]) => {
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
                            {(() => {
                              const latestPhoto = (wp.statusHistories || [])
                                .find((h: any) => h.metadata?.preview_photo);
                              const photoUrl = latestPhoto ? getPublicUrl('hairlink', latestPhoto.metadata.preview_photo) : null;
                              return photoUrl ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <a href={photoUrl} target="_blank" rel="noreferrer"
                                    style={{
                                      display: 'block',
                                      borderRadius: '8px',
                                      overflow: 'hidden',
                                      width: '42px',
                                      height: '42px',
                                      border: wp.status === 'completed' ? '2px solid #10b981' : '2px solid #f1a8cf',
                                      boxShadow: wp.status === 'completed' ? '0 2px 6px rgba(16,185,129,0.15)' : '0 2px 6px rgba(173,36,109,0.15)',
                                      flexShrink: 0
                                    }}
                                  >
                                    <img src={photoUrl} alt="Progress" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </a>
                                </div>
                              ) : (
                                <div className="tracking-batch-pkg-cell"><i className="bx bx-package"></i></div>
                              );
                            })()}
                          </td>
                          <td className="tracking-cell">
                            <div className="tracking-ref-col">
                              <span className="tracking-ref-prefix tracking-batch-ref-label">Batch Ref</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <strong className="tracking-ref-value">{wp.taskCode}</strong>
                                <button
                                  type="button"
                                  onClick={() => setBatchOpen(prev => ({ ...prev, [wpId]: !isOpen }))}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ad246d',
                                    cursor: 'pointer',
                                    padding: '0 2px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    fontSize: '0.85rem'
                                  }}
                                  title={`${isOpen ? 'Hide' : 'View'} compiled donors`}
                                >
                                  <i className={`bx ${isOpen ? 'bx-chevron-up-circle' : 'bx-chevron-down-circle'}`}></i>
                                </button>
                              </div>

                            </div>
                          </td>
                          <td className="tracking-cell">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span className="tracking-ref-prefix" style={{ color: '#8c7895', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase' }}>Spec</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                <span style={{
                                  background: '#fdf2f8',
                                  color: '#ad246d',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '50px',
                                  border: '1px solid #fbcfe8',
                                  textTransform: 'capitalize'
                                }}>
                                  {wp.targetLength || 'N/A'}
                                </span>
                                <span style={{
                                  background: '#f3f4f6',
                                  color: '#374151',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '50px',
                                  border: '1px solid #e5e7eb',
                                  textTransform: 'capitalize',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  {wp.targetColor && (() => {
                                    const dotColor = wp.targetColor.toLowerCase() === 'black' ? '#000' :
                                      wp.targetColor.toLowerCase() === 'brown' ? '#7B4F2A' :
                                        wp.targetColor.toLowerCase() === 'light' ? '#C9A96E' : '#8c7895';
                                    return <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, display: 'inline-block' }}></span>;
                                  })()}
                                  {wp.targetColor || 'N/A'}
                                </span>
                              </div>
                            </div>
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
                                      <i className='bx bx-link-external'></i> Hair Tracking
                                    </a>
                                    <button
                                      onClick={() => handleOpenDeliveryLinkModal(wp.taskCode, wp.materialDeliveryLink || '')}
                                      style={{
                                        padding: '0.35rem 0.8rem',
                                        fontSize: '0.7rem',
                                        background: '#fff',
                                        border: '1.5px solid #ead7e8',
                                        color: '#ad246d',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 800,
                                        transition: 'all 0.2s ease',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
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
                                      <i className='bx bxs-ship'></i> Ship Hair
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                            {wp.status === 'processing' && (() => {
                              const latestPhoto = (wp.statusHistories || [])
                                .find((h: any) => h.metadata?.preview_photo);
                              const photoUrl = latestPhoto ? getPublicUrl('hairlink', latestPhoto.metadata.preview_photo) : null;
                              return photoUrl ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                  <a href={photoUrl} target="_blank" rel="noreferrer"
                                    style={{ display: 'block', borderRadius: '10px', overflow: 'hidden', width: '52px', height: '52px', border: '2px solid #f1a8cf', boxShadow: '0 2px 8px rgba(173,36,109,0.15)', flexShrink: 0 }}>
                                    <img src={photoUrl} alt="Progress" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </a>
                                  <span style={{ fontSize: '0.6rem', color: '#ad246d', fontWeight: 700 }}>View Photo</span>
                                </div>
                              ) : (
                                <span className="tracking-awaiting-text">Production in Progress...</span>
                              );
                            })()}
                            {wp.status === 'completed' && (() => {
                              const latestPhoto = (wp.statusHistories || [])
                                .find((h: any) => h.metadata?.preview_photo);
                              const photoUrl = latestPhoto ? getPublicUrl('hairlink', latestPhoto.metadata.preview_photo) : null;
                              return photoUrl ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                  <a href={photoUrl} target="_blank" rel="noreferrer"
                                    style={{ display: 'block', borderRadius: '10px', overflow: 'hidden', width: '52px', height: '52px', border: '2px solid #10b981', boxShadow: '0 2px 8px rgba(16,185,129,0.15)', flexShrink: 0 }}>
                                    <img src={photoUrl} alt="Completed" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </a>
                                  <span style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 700 }}>View Photo</span>
                                </div>
                              ) : (
                                <span className="tracking-awaiting-text">Wig Quality Checking...</span>
                              );
                            })()}
                          </td>
                        </tr>
                        {isOpen && (() => {
                          const assignmentHistory = (wp.statusHistories || []).find((h: any) => h.status === 'assigned');
                          let staffNote = '';
                          if (assignmentHistory?.notes) {
                            const match = assignmentHistory.notes.match(/Staff note:\s*(.*)/i);
                            if (match) staffNote = match[1];
                          }
                          return (
                            <tr className="tracking-batch-expanded-row">
                              <td colSpan={7} className="tracking-batch-expanded-cell">
                                <div className="tracking-batch-expanded-inner" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1.5rem' }}>
                                  {staffNote && (
                                    <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem', background: '#fdf7fb', border: '1px solid #ead7e8', borderRadius: '12px' }}>
                                      <strong style={{ fontSize: '0.75rem', color: '#ad246d', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Note to Wigmaker</strong>
                                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#5d4d62', lineHeight: '1.4' }}>{staffNote}</p>
                                    </div>
                                  )}
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                                    {/* Left Column: Batch Donors */}
                                    <div style={{ minWidth: 0 }}>
                                      <div className="tracking-batch-expanded-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#ad246d', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                                        <i className="bx bx-group" style={{ fontSize: '1.2rem' }}></i> Batch Donors — {wp.taskCode}
                                      </div>
                                      <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #f2ebf4', borderRadius: '12px' }}>
                                        <table className="tracking-batch-inner-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                          <thead>
                                            <tr>
                                              <th style={{ background: '#fdf7fb', color: '#ad246d', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.75rem 1rem', borderBottom: '1px solid #f2ebf4', textAlign: 'left' }}>Ref #</th>
                                              <th style={{ background: '#fdf7fb', color: '#ad246d', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.75rem 1rem', borderBottom: '1px solid #f2ebf4', textAlign: 'left' }}>Donor Name</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {bd.map(d => (
                                              <tr key={d.id}>
                                                <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: '#5d4d62', borderBottom: '1px dashed #f2ebf4' }}><code className="tracking-inner-ref">{d.reference}</code></td>
                                                <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: '#5d4d62', borderBottom: '1px dashed #f2ebf4' }}>
                                                  <div className="tracking-inner-donor" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, color: '#3b2e43' }}>
                                                    <div className="tracking-inner-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #ad246d, #cf2f84)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem' }}>
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
                                    </div>

                                    {/* Right Column: Wigs Produced */}
                                    <div style={{ minWidth: 0 }}>
                                      <div className="tracking-batch-expanded-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#ad246d', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                                        <i className="bx bxs-crown" style={{ fontSize: '1.2rem' }}></i> Wigs Produced ({(wp.childWigs || []).length})
                                      </div>
                                      <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #f2ebf4', borderRadius: '12px' }}>
                                        <table className="tracking-batch-inner-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                          <thead>
                                            <tr>
                                              <th style={{ background: '#fdf7fb', color: '#ad246d', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.75rem 1rem', borderBottom: '1px solid #f2ebf4', textAlign: 'left' }}>Photo</th>
                                              <th style={{ background: '#fdf7fb', color: '#ad246d', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.75rem 1rem', borderBottom: '1px solid #f2ebf4', textAlign: 'left' }}>Wig Code</th>
                                              <th style={{ background: '#fdf7fb', color: '#ad246d', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.75rem 1rem', borderBottom: '1px solid #f2ebf4', textAlign: 'left' }}>Specs</th>
                                              <th style={{ background: '#fdf7fb', color: '#ad246d', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.75rem 1rem', borderBottom: '1px solid #f2ebf4', textAlign: 'left' }}>Status</th>
                                              <th style={{ background: '#fdf7fb', color: '#ad246d', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.75rem 1rem', borderBottom: '1px solid #f2ebf4', textAlign: 'center' }}>Action</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {(!wp.childWigs || wp.childWigs.length === 0) ? (
                                              <tr>
                                                <td colSpan={5} style={{ padding: '2rem 1rem', textAlign: 'center', color: '#8c7895', fontSize: '0.85rem' }}>
                                                  <i className="bx bxs-crown" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem', color: '#ead7e8' }}></i>
                                                  No wigs produced for this batch yet.
                                                </td>
                                              </tr>
                                            ) : (
                                              wp.childWigs.map((w: any) => {
                                                const photoUrl = w.preview_photo ? getPublicUrl('hairlink', w.preview_photo) : null;
                                                return (
                                                  <tr key={w.id}>
                                                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px dashed #f2ebf4', verticalAlign: 'middle' }}>
                                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {photoUrl ? (
                                                          <a href={photoUrl} target="_blank" rel="noreferrer"
                                                            style={{
                                                              display: 'block',
                                                              borderRadius: '6px',
                                                              overflow: 'hidden',
                                                              width: '32px',
                                                              height: '32px',
                                                              border: w.status === 'received' ? '2px solid #10b981' : '2px solid #f1a8cf',
                                                              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                              flexShrink: 0
                                                            }}
                                                          >
                                                            <img src={photoUrl} alt="Wig" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                          </a>
                                                        ) : (
                                                          <div style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '6px',
                                                            background: '#fdf7fb',
                                                            border: '1px solid #ead7e8',
                                                            display: 'grid',
                                                            placeItems: 'center',
                                                            color: '#ad246d',
                                                            fontSize: '0.9rem'
                                                          }}>
                                                            <i className="bx bxs-crown"></i>
                                                          </div>
                                                        )}
                                                      </div>
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px dashed #f2ebf4', verticalAlign: 'middle' }}>
                                                      <code className="tracking-inner-ref" style={{ fontSize: '0.7rem' }}>{w.taskCode}</code>
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px dashed #f2ebf4', verticalAlign: 'middle' }}>
                                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem' }}>
                                                        <span style={{ fontWeight: 700, color: '#ad246d' }}>{w.targetLength || 'N/A'}</span>
                                                        <span style={{ color: '#5d4d62', fontSize: '0.7rem' }}>{w.targetColor || 'N/A'}</span>
                                                      </div>
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px dashed #f2ebf4', verticalAlign: 'middle' }}>
                                                      <StatusPill status={w.status} />
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px dashed #f2ebf4', verticalAlign: 'middle', textAlign: 'center' }}>
                                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                                                        {w.deliveryLink && (
                                                          <a
                                                            href={w.deliveryLink}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            style={{
                                                              display: 'inline-flex',
                                                              alignItems: 'center',
                                                              gap: '4px',
                                                              fontSize: '0.68rem',
                                                              color: '#ad246d',
                                                              textDecoration: 'none',
                                                              fontWeight: 700,
                                                              padding: '0.15rem 0.4rem',
                                                              borderRadius: '4px',
                                                              background: '#fdf2f8',
                                                              border: '1px solid #f9cde8'
                                                            }}
                                                          >
                                                            <i className='bx bx-link-external'></i> Tracking
                                                          </a>
                                                        )}
                                                        {w.status === 'shipped' && (
                                                          <button
                                                            className="soft-btn"
                                                            onClick={() => handleReceiveWig(w.id)}
                                                            disabled={isSubmitting}
                                                            style={{
                                                              padding: '0.3rem 0.6rem',
                                                              fontSize: '0.7rem',
                                                              background: 'linear-gradient(135deg, #ad246d, #8c1e58)',
                                                              color: '#fff',
                                                              border: 'none',
                                                              borderRadius: '50px',
                                                              cursor: 'pointer',
                                                              fontWeight: 800,
                                                              boxShadow: '0 4px 10px rgba(173, 36, 109, 0.15)',
                                                              whiteSpace: 'nowrap'
                                                            }}
                                                          >
                                                            Confirm Received
                                                          </button>
                                                        )}
                                                        {w.status === 'received' && (
                                                          <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                            <i className='bx bx-check-circle'></i> Received
                                                          </span>
                                                        )}
                                                        {w.status === 'completed' && (
                                                          <span style={{ fontSize: '0.7rem', color: '#8c7895', fontWeight: 700 }}>
                                                            Ready for Shipping
                                                          </span>
                                                        )}
                                                      </div>
                                                    </td>
                                                  </tr>
                                                );
                                              })
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })()}
                      </React.Fragment>
                    );
                  })}

                </>
              ) : isDonation ? (
                <>
                  {/* ── Donation view: Solo (un-batched) Rows ONLY (HD-XXXXXX) ── */}
                  {pagedSoloDonations.map((donation) => {
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
                pagedRequests.map((request) => {
                  const isPickup = (request as any).deliveryMethod === 'pickup';
                  const pickupStages = ['Validated', 'Matched', 'Ready for Pickup', 'Pickup Confirmed', 'Completed'];
                  const deliveryStages = ['Validated', 'Matched', 'In Transit', 'Completed'];
                  const stages = isPickup ? pickupStages : deliveryStages;
                  const stageIndex = stages.indexOf(request.status);
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
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              marginTop: '3px',
                              background: (request as any).deliveryMethod === 'pickup' ? '#fdf2f8' : '#f0fdf4',
                              color: (request as any).deliveryMethod === 'pickup' ? '#ad246d' : '#16a34a',
                              border: `1px solid ${(request as any).deliveryMethod === 'pickup' ? '#f9cde8' : '#bbf7d0'}`,
                              borderRadius: '20px',
                              padding: '1px 8px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                            }}>
                              <i className={`bx ${(request as any).deliveryMethod === 'pickup' ? 'bx-store' : 'bx-car'}`} style={{ fontSize: '0.75rem' }}></i>
                              {(request as any).deliveryMethod === 'pickup' ? 'Pick-up' : 'Delivery'}
                            </span>
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
                            <span className="tracking-progress-percent">{Math.round(((stageIndex + 1) / stages.length) * 100)}%</span>
                          </div>
                          <div className="tracking-progress-bar-bg">
                            <div style={{
                              position: 'absolute', left: 0, top: 0, bottom: 0,
                              width: `${((stageIndex + 1) / stages.length) * 100}%`,
                              background: request.status === 'Completed' ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #ad246d, #ff6bb5)',
                              borderRadius: '10px', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: '0 0 8px rgba(173, 36, 109, 0.3)'
                            }}></div>
                          </div>
                          <div className="tracking-progress-status">
                            <i className={`bx ${request.status === 'Completed' ? 'bx-check-circle' : request.status === 'Pickup Confirmed' ? 'bx-store' : 'bx-map-pin'}`} style={{ color: request.status === 'Completed' ? '#10b981' : '#ad246d' }}></i>
                            {request.status}
                          </div>
                        </div>
                      </td>
                      <td className="tracking-action-cell">
                        {request.status === 'Validated' && (
                          <Link to={`/staff/matching?reference=${request.reference}`} className="soft-btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: 'linear-gradient(135deg, #ad246d, #8c1e58)', color: '#fff', textDecoration: 'none', borderRadius: '50px', display: 'inline-block', fontWeight: 800, boxShadow: '0 4px 10px rgba(173, 36, 109, 0.15)' }}>Match Wig</Link>
                        )}
                        {request.status === 'Matched' && (request as any).deliveryMethod === 'pickup' && (
                          <button
                            className="soft-btn"
                            onClick={() => triggerAction(request.reference, 'recipient', 'Ready for Pickup', 'Mark as Ready for Pick-up')}
                            disabled={isSubmitting}
                            style={{ padding: '0.3rem 0.8rem', fontSize: '0.7rem', background: 'linear-gradient(135deg, #ad246d, #8c1e58)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 800, boxShadow: '0 4px 10px rgba(173, 36, 109, 0.15)', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <i className='bx bx-store'></i> Ready for Pick-up
                          </button>
                        )}
                        {request.status === 'Matched' && (request as any).deliveryMethod !== 'pickup' && (
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
                        {request.status === 'Ready for Pickup' && (
                          <span className="tracking-awaiting-text" style={{ color: '#ad246d', fontWeight: 700 }}>
                            <i className='bx bx-store' style={{ verticalAlign: 'middle', marginRight: '4px' }}></i>
                            Awaiting Recipient Pick-up
                          </span>
                        )}
                        {request.status === 'Pickup Confirmed' && (
                          <button
                            className="soft-btn"
                            onClick={() => triggerAction(request.reference, 'recipient', 'Completed', 'Mark Transaction Complete')}
                            disabled={isSubmitting}
                            style={{ padding: '0.3rem 0.8rem', fontSize: '0.7rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 800, boxShadow: '0 4px 10px rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <i className='bx bx-check-circle'></i> Mark Transaction Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
              {((isWigmaker && batchGroups.size === 0) || (isDonation && soloDonations.length === 0) || (!isDonation && !isWigmaker && data.requests.length === 0)) && (
                <tr>
                  <td colSpan={6} className="tracking-empty-col">
                    <i className="bx bx-search tracking-empty-icon"></i>
                    <p>No active {isWigmaker ? 'wigmaker batch' : isDonation ? 'donation' : 'request'} trackers found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={isWigmaker ? batchTotalPages : isDonation ? donationTotalPages : requestTotalPages}
        onPageChange={setCurrentPage}
      />

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
        message={`Are you sure you want to ${pendingAction?.status === 'In Transit' ? 'mark this wig as shipped and notify the recipient' :
          pendingAction?.status === 'Received Hair' ? 'confirm receipt of this hair donation' :
            pendingAction?.status === 'Ready for Pickup' ? 'mark this wig as Ready for Pick-up? The recipient will be notified to collect it at the Binondo office.' :
              pendingAction?.status === 'Completed' ? 'mark this transaction as Complete? This will close the hair request.' :
                'confirm receipt of this finished wig'
          }?`}
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
              Enter the tracking URL for the hair package (Batch <strong>{deliveryLinkTaskCode}</strong>) being shipped to the wigmaker.
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
