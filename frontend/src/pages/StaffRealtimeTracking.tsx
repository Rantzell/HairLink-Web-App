import toast from 'react-hot-toast';
import '../styles/StaffRealtimeTracking.css';
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Pagination from '../components/Pagination';
import apiClient from '../api/client';
import type { Donation, HairRequest, User, WigProduction } from '../types';
import { getPublicUrl, getProfilePhotoUrl } from '../lib/storage';

import ConfirmModal from '../components/ConfirmModal';
import PageLoader from '../components/PageLoader';

const StaffRealtimeTracking: React.FC = () => {
  const { type } = useParams<{ type: 'donation' | 'recipient' | 'wigmaker' | 'batch-donation' }>();
  const [data, setData] = useState<{
    donations: Donation[];
    requests: HairRequest[];
    wigmakers: User[];
    wigProductions: Record<string, WigProduction>;
    batches: WigProduction[];
    donationStateMap: Record<number, { wigmakerReceived: boolean; isMissing: boolean }>;
  }>({
    donations: [],
    requests: [],
    wigmakers: [],
    wigProductions: {},
    batches: [],
    donationStateMap: {},
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [materialLinks, setMaterialLinks] = useState<Record<string, string>>({});
  const [selectedDonations, setSelectedDonations] = useState<string[]>([]);
  const [batchWigmakerId, setBatchWigmakerId] = useState('');
  const [batchMaterialLink, setBatchMaterialLink] = useState('');
  const [batchStaffNote, setBatchStaffNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
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

  const handleDeleteBatch = async (batchId: number) => {
    if (!window.confirm("Are you sure you want to delete this batch? All associated donations will be returned to the queue.")) {
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/internal-api/staff/batches/${batchId}`);
      toast.success('Batch deleted successfully!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete batch');
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
  const [sortBy, setSortBy] = useState<'recent' | 'oldest'>('recent');
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 10;
  const getBatchHairReference = (wp: any) => {
    if (wp?.batchHairReference) return wp.batchHairReference;
    const createdAt = wp?.createdAt ? new Date(wp.createdAt) : new Date();
    const month = String(createdAt.getMonth() + 1).padStart(2, '0');
    const year = createdAt.getFullYear();
    return `B${wp?.id || '0'}-${month}-${year}`;
  };

  // Reset page when view, search or sort changes
  useEffect(() => { setCurrentPage(1); }, [type, searchTerm, sortBy]);

  const filteredDonations = (data.donations || []).filter(d => {
    const ref = d.reference || '';
    const name = `${d.user?.firstName || ''} ${d.user?.lastName || ''}`;
    const wp = data.wigProductions[d.id];
    const batchRef = wp ? `${getBatchHairReference(wp)} ${wp.taskCode || ''} ${wp.wigmaker?.firstName || ''} ${wp.wigmaker?.lastName || ''}` : '';
    return ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batchRef.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredRequests = (data.requests || []).filter(r => {
    const ref = r.reference || '';
    const name = `${r.user?.firstName || ''} ${r.user?.lastName || ''}`;
    return ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const isWigmaker = type === 'wigmaker';  // WIG-XXXXXX batch rows only
  const isDonation = type === 'donation';  // solo HD- donation rows only
  const isBatchDonation = type === 'batch-donation';  // assigned hair batch rows only

  const sortedDonations = [...filteredDonations].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return sortBy === 'recent' ? timeB - timeA : timeA - timeB;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return sortBy === 'recent' ? timeB - timeA : timeA - timeB;
  });

  // Group batched donations by wigProductionId
  // Once a donation has a wigProductionId it has been batched and must NOT appear in Donation Trackers.
  const batchGroups = new Map<number, { wp: any; donations: typeof sortedDonations }>();
  const soloDonations: typeof sortedDonations = [];

  if (data.batches) {
    const sortedBatches = [...data.batches].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return sortBy === 'recent' ? timeB - timeA : timeA - timeB;
    });
    for (const wp of sortedBatches) {
      batchGroups.set(Number(wp.id), { wp, donations: [] });
    }
  }

  for (const d of sortedDonations) {
    const wpId = (d as any).wigProductionId as number | null;
    if (wpId) {
      // Batched — goes to batchGroups only, never to soloDonations
      if (batchGroups.has(wpId)) {
        batchGroups.get(wpId)!.donations.push(d);
      } else {
        const wp = data.wigProductions[d.id];
        if (wp) {
          batchGroups.set(wpId, { wp, donations: [d] });
        }
      }
      // If wp data isn't available yet, skip entirely (still batched, remove from Donation Trackers)
    } else {
      soloDonations.push(d);
    }
  }

  // All batches — used for Hair Batch Donation Tracking (shows all assigned batches)
  const allBatchGroupsArray = Array.from(batchGroups.entries());

  // Wigmaker tracking shows all batches that have at least one shipped wig (in transit or resolved)
  const batchGroupsArray = allBatchGroupsArray.filter(([, { wp }]) => {
    const children = wp.childWigs || [];
    // Show if any child wig has ever been shipped (in transit, received, or missing)
    const hasShipped = children.some((w: any) => ['shipped', 'received', 'missing'].includes(w.status));
    return hasShipped;
  });
  const batchTotalPages = Math.ceil(batchGroupsArray.length / PAGE_SIZE);
  const pagedBatchGroups = batchGroupsArray.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  type DonationTrackingRow =
    | { kind: 'batch'; wpId: number; wp: any; donations: typeof sortedDonations }
    | { kind: 'donation'; donation: Donation };
  // Hair Batch Donation Tracking uses all batches (monitoring all assigned batches)
  // Filter out standalone batches from Hair Batch Donation Tracking
  const batchDonationRows: DonationTrackingRow[] = allBatchGroupsArray
    .filter(([, group]) => group.donations.length > 0)
    .map(([wpId, group]) => ({ kind: 'batch', wpId, ...group }));
  const donationRows: DonationTrackingRow[] = soloDonations.map(donation => ({ kind: 'donation', donation }));
  const visibleDonationRows = isBatchDonation ? batchDonationRows : donationRows;
  const donationTotalPages = Math.ceil(visibleDonationRows.length / PAGE_SIZE);
  const pagedDonationRows = visibleDonationRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const requestTotalPages = Math.ceil(sortedRequests.length / PAGE_SIZE);
  const pagedRequests = sortedRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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

  const handleMissingWig = async (wigId: number) => {
    setIsSubmitting(true);
    try {
      await apiClient.post(`/internal-api/staff/wigs/${wigId}/missing`);
      toast.success('Wig reported as missing.');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to report wig as missing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiveAllWigs = async (batchId: number, deliveryLink?: string) => {
    setIsSubmitting(true);
    try {
      await apiClient.post(`/internal-api/staff/batches/${batchId}/receive-all`, {
        delivery_tracking_link: deliveryLink
      });
      toast.success('Batch and all wigs marked as received!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <PageLoader message="Loading tracking data..." />;

  return (
    <section className="section-wrap reveal active staff-page tracking-page">
      <div className="section-title-block tracking-title-block">
        <div>
          <h1 className="tracking-page-title">
            {isWigmaker ? 'Wigmaker Tracking' : isBatchDonation ? 'Hair Batch Donation Tracking' : isDonation ? 'Hair Donation Tracking' : 'Request Trackers'}
          </h1>
          <p className="tracking-page-subtitle">
            {isWigmaker
              ? 'Monitor wig production batches assigned to wigmakers.'
              : isBatchDonation
                ? 'Monitor assigned hair batches and wigmaker receipt status.'
                : isDonation
                  ? 'Monitor received hair donations and batch assignment.'
                  : 'Monitor real-time status and manage workflow for wig requests.'}
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #ead7e8', color: '#ad246d', fontWeight: 800, padding: '0.5rem 1.2rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '50px', textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(73, 20, 52, 0.04)' }}>
          <span className="tracking-active-dot"></span>
          {isWigmaker ? batchGroupsArray.length : (isDonation || isBatchDonation) ? visibleDonationRows.length : sortedRequests.length} Active {isWigmaker ? 'Batches' : isBatchDonation ? 'Hair Batches' : isDonation ? 'Donations' : 'Requests'}
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
            <button
              type="button"
              onClick={() => setShowNoteModal(true)}
              className={`batch-note-btn ${batchStaffNote.trim() ? 'has-note' : ''}`}
            >
              <i className={`bx ${batchStaffNote.trim() ? 'bx-note' : 'bx-message-square-edit'}`}></i>
              {batchStaffNote.trim() ? 'Note Added' : 'Note to Wigmaker'}
            </button>
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

      {/* Global Search Bar (Left Aligned) & Sort Dropdown */}
      <div className="search-container tracking-search-container" style={{ gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="tracking-search-wrapper">
          <i className='bx bx-search tracking-search-icon'></i>
          <input
            type="text"
            placeholder={`Search ${isWigmaker || isBatchDonation ? 'batch/wigmaker' : isDonation ? 'donors' : 'recipients'} or reference #...`}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#8c7895', fontWeight: 700, whiteSpace: 'nowrap' }}>
            <i className='bx bx-sort-alt-2' style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '4px' }}></i>
            Sort by:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'oldest')}
            style={{
              padding: '0.5rem 2.2rem 0.5rem 1rem',
              borderRadius: '12px',
              border: '1px solid #ead7e8',
              background: '#fff',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#ad246d',
              outline: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(73, 20, 52, 0.04)',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ad246d\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.8rem center',
              backgroundSize: '1rem',
              minWidth: '130px',
              transition: 'all 0.2s ease'
            }}
            className="custom-select"
          >
            <option value="recent">Most Recent</option>
            <option value="oldest">Oldest</option>
          </select>
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
                <th className="tracking-th">{isWigmaker ? 'Wig Specification' : isBatchDonation ? 'Wigmaker/Donations' : 'Donor/User'}</th>
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
                    const children = wp.childWigs || [];
                    const hasShipped = children.some((w: any) => w.status === 'shipped');
                    const allResolved = children.length > 0 && children.every((w: any) => ['received', 'missing'].includes(w.status));

                    let stageLabel = 'Completed';
                    let isReceivedStage = false;
                    let isShippedStage = false;

                    if (allResolved) {
                      stageLabel = 'Wig Received';
                      isReceivedStage = true;
                    } else if (hasShipped) {
                      stageLabel = 'Awaiting Wig Delivery';
                      isShippedStage = true;
                    } else if (wp.status === 'completed') {
                      stageLabel = `Finished by ${wp.wigmaker?.firstName || 'Wigmaker'}`;
                    } else if (wp.status === 'processing') {
                      stageLabel = `Crafting by ${wp.wigmaker?.firstName || 'Wigmaker'}`;
                    } else if (wp.status === 'assigned') {
                      stageLabel = `Assigned to ${wp.wigmaker?.firstName || 'Wigmaker'}`;
                    } else if (wp.status === 'received') {
                      stageLabel = 'Wig Received';
                      isReceivedStage = true;
                    }

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
                            {(() => {
                              // Prefer the actual produced wigs' specs over the batch's
                              // original target, since wigmakers sometimes adjust during
                              // production. Fall back to the target when no wigs exist yet.
                              const childSpecs: { length: string; color: string }[] = (wp.childWigs || [])
                                .filter((w: any) => w.targetLength || w.targetColor)
                                .map((w: any) => ({ length: w.targetLength || '', color: w.targetColor || '' }));
                              const uniqueKeys = new Set<string>();
                              const uniqueSpecs = childSpecs.filter((s) => {
                                const k = `${s.length}|${s.color}`.toLowerCase();
                                if (uniqueKeys.has(k)) return false;
                                uniqueKeys.add(k);
                                return true;
                              });
                              const displaySpecs = uniqueSpecs.length > 0
                                ? uniqueSpecs
                                : [{ length: wp.targetLength || '', color: wp.targetColor || '' }];
                              const isFromProduced = uniqueSpecs.length > 0;
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span className="tracking-ref-prefix" style={{ color: '#8c7895', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase' }}>
                                    {isFromProduced ? (uniqueSpecs.length > 1 ? 'Produced Specs' : 'Produced Spec') : 'Target Spec'}
                                  </span>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {displaySpecs.map((spec, idx) => {
                                      const lc = (spec.color || '').toLowerCase();
                                      const dotColor = lc === 'black' ? '#000' : lc === 'brown' ? '#7B4F2A' : lc === 'light' ? '#C9A96E' : '#8c7895';
                                      return (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
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
                                            {spec.length || 'N/A'}
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
                                            {spec.color && (
                                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, display: 'inline-block' }}></span>
                                            )}
                                            {spec.color || 'N/A'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="tracking-cell">
                            <div className="tracking-progress-col">
                              <div className="tracking-progress-status">
                                <i className={`bx ${isReceivedStage ? 'bx-check-circle' : 'bx-sync bx-spin'}`}
                                  style={{ color: isReceivedStage ? '#10b981' : '#ad246d' }}></i>
                                {stageLabel}
                              </div>
                              {wp.updatedAt && (
                                <div style={{ fontSize: '0.68rem', color: '#8c7895', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <i className='bx bx-time-five'></i>
                                  Updated {new Date(wp.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="tracking-action-cell">
                            {isShippedStage && !allResolved && (() => {
                              const deliveryLink = wp.deliveryLink || children.find((w: any) => w.deliveryLink)?.deliveryLink;
                              return (
                                <div className="tracking-action-col">
                                  {deliveryLink && (
                                    <a href={deliveryLink} target="_blank" rel="noreferrer" className="tracking-link-btn">
                                      <i className='bx bx-link-external'></i> Wig Tracking
                                    </a>
                                  )}
                                  <button
                                    className="soft-btn"
                                    onClick={() => handleReceiveAllWigs(wpId, deliveryLink || undefined)}
                                    disabled={isSubmitting}
                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: 'linear-gradient(135deg, #ad246d, #8c1e58)', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 800 }}
                                  >
                                    Confirm Batch Received All
                                  </button>
                                </div>
                              );
                            })()}
                            {wp.status === 'assigned' && (
                              <div className="tracking-action-col-wide" style={{ gap: '0.4rem', minWidth: '180px', alignItems: 'center' }}>
                                {wp.materialDeliveryLink ? (
                                  <span className="tracking-awaiting-text">Wig shipment in transit</span>
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
                            {/* Delete button — only shown when batch is fully resolved */}
                            {isReceivedStage && (
                              <button
                                type="button"
                                onClick={() => handleDeleteBatch(wpId)}
                                disabled={isSubmitting}
                                style={{
                                  background: 'none',
                                  border: '1px solid #fecaca',
                                  color: '#ef4444',
                                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                  fontSize: '0.72rem',
                                  padding: '0.3rem 0.65rem',
                                  borderRadius: '50px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  opacity: isSubmitting ? 0.5 : 1,
                                  transition: 'all 0.2s'
                                }}
                                title="Delete this completed batch"
                              >
                                <i className="bx bx-trash"></i> Delete Batch
                              </button>
                            )}
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
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                                    {/* Wigs Produced (Batch Donors column removed) */}
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
                                                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px dashed #f2ebf4', verticalAlign: 'middle', minWidth: '160px' }}>
                                                      {w.status === 'shipped' ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                          <div style={{ display: 'flex', gap: '6px' }}>
                                                            <button onClick={() => handleReceiveWig(w.id)} disabled={isSubmitting}
                                                              style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.72rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                                              <i className='bx bx-check'></i> Received
                                                            </button>
                                                            <button onClick={() => handleMissingWig(w.id)} disabled={isSubmitting}
                                                              style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.72rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                                              <i className='bx bx-x'></i> Missing
                                                            </button>
                                                          </div>
                                                        </div>
                                                      ) : w.status === 'received' ? (
                                                        <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                          <i className='bx bx-check-circle' style={{ fontSize: '0.9rem' }}></i> Received
                                                        </span>
                                                      ) : w.status === 'missing' ? (
                                                        <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                          <i className='bx bx-error-circle' style={{ fontSize: '0.9rem' }}></i> Missing
                                                        </span>
                                                      ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                          <span style={{ fontSize: '0.72rem', color: '#8c7895', fontWeight: 600 }}>Ready for Shipping</span>
                                                        </div>
                                                      )}
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
              ) : (isDonation || isBatchDonation) ? (
                <>
                  {/* Hair Donation Tracking: assigned batch rows plus unbatched donations */}
                  {pagedDonationRows.map((row) => {
                    if (row.kind === 'batch') {
                      const { wpId, wp, donations: bd } = row;
                      const isOpen = !!batchOpen[wpId];
                      const batchRef = getBatchHairReference(wp);
                      const wigmakerReceivedCount = bd.reduce((acc, d) => {
                        const dState = (data.donationStateMap as any)[d.id];
                        return acc + (dState?.wigmakerReceived ? 1 : 0);
                      }, 0);
                      const stageLabel =
                        wp.status === 'assigned' ? `Waiting for ${wp.wigmaker?.firstName || 'wigmaker'} to receive hair` :
                          wp.status === 'processing' ? `Hair received by ${wp.wigmaker?.firstName || 'wigmaker'}` :
                            wp.status === 'completed' ? `Wigs finished by ${wp.wigmaker?.firstName || 'wigmaker'}` :
                              wp.status === 'shipped' ? 'Finished wigs in transit' :
                                wp.status === 'received' ? 'Finished wigs received by staff' : 'Batch in progress';

                      return (
                        <React.Fragment key={`donation-batch-${wpId}`}>
                          <tr className="tracking-row tracking-batch-main-row">
                            <td className="tracking-cell-center">
                              <div className="tracking-batch-layer-icon"><i className="bx bx-layer"></i></div>
                            </td>
                            <td className="tracking-cell">
                              <div className="tracking-batch-pkg-cell"><i className="bx bx-package"></i></div>
                            </td>
                            <td className="tracking-cell">
                              <div className="tracking-ref-col">
                                <span className="tracking-ref-prefix tracking-batch-ref-label">Batch Hair Ref</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <strong className="tracking-ref-value">{batchRef}</strong>
                                  <button
                                    type="button"
                                    onClick={() => setBatchOpen(prev => ({ ...prev, [wpId]: !isOpen }))}
                                    style={{ background: 'none', border: 'none', color: '#ad246d', cursor: 'pointer', padding: '0 2px', display: 'inline-flex', alignItems: 'center', fontSize: '0.85rem' }}
                                    title={`${isOpen ? 'Hide' : 'View'} hair donations`}
                                  >
                                    <i className={`bx ${isOpen ? 'bx-chevron-up-circle' : 'bx-chevron-down-circle'}`}></i>
                                  </button>
                                </div>
                                <span className="tracking-ref-date">{wp.taskCode}</span>
                                {wp.createdAt && (
                                  <span className="tracking-ref-date" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <i className='bx bx-calendar'></i>
                                    {new Date(wp.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    {' · '}
                                    {new Date(wp.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="tracking-cell">
                              <div className="tracking-user-col">
                                <div className="tracking-user-avatar tracking-user-avatar-donor">
                                  {wp.wigmaker?.firstName?.[0] || 'W'}{wp.wigmaker?.lastName?.[0] || ''}
                                </div>
                                <div>
                                  <div className="tracking-user-name">{wp.wigmaker?.firstName || 'Assigned'} {wp.wigmaker?.lastName || 'Wigmaker'}</div>
                                  <div className="tracking-user-role-donor">{bd.length} hair donation{bd.length === 1 ? '' : 's'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="tracking-cell">
                              {(() => {
                                const allReceived = bd.length > 0 && wigmakerReceivedCount === bd.length;
                                const noneReceived = wigmakerReceivedCount === 0;
                                const isDone = wp.status === 'received';
                                const pillBg = isDone ? '#dcfce7' : allReceived ? '#dcfce7' : noneReceived ? '#fef9c3' : '#fdf2f8';
                                const pillColor = isDone ? '#15803d' : allReceived ? '#15803d' : noneReceived ? '#a16207' : '#ad246d';
                                const pillBorder = isDone ? '#bbf7d0' : allReceived ? '#bbf7d0' : noneReceived ? '#fde68a' : '#fbcfe8';
                                const iconName = isDone || allReceived ? 'bx-check-circle' : noneReceived ? 'bx-time-five' : 'bx-sync bx-spin';
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: pillBg,
                                        color: pillColor,
                                        border: `1px solid ${pillBorder}`,
                                        padding: '0.3rem 0.65rem',
                                        borderRadius: '999px',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        width: 'fit-content',
                                        maxWidth: '100%'
                                      }}
                                    >
                                      <i className={`bx ${iconName}`} style={{ fontSize: '0.95rem' }}></i>
                                      {stageLabel}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: '#5d4d62', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <i className='bx bx-package' style={{ color: '#ad246d' }}></i>
                                      Hair received: <strong style={{ color: '#ad246d' }}>{wigmakerReceivedCount}</strong> / {bd.length}
                                    </span>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="tracking-action-cell">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button
                                  type="button"
                                  className="tracking-batch-toggle-btn"
                                  onClick={() => setBatchOpen(prev => ({ ...prev, [wpId]: !isOpen }))}
                                >
                                  <i className={`bx ${isOpen ? 'bx-hide' : 'bx-show'}`}></i>
                                  {isOpen ? 'Hide Details' : 'View Details'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBatch(wpId)}
                                  disabled={isSubmitting}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    fontSize: '1.2rem',
                                    padding: '4px',
                                    opacity: isSubmitting ? 0.5 : 1
                                  }}
                                  title="Delete Batch"
                                >
                                  <i className="bx bx-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="tracking-batch-expanded-row">
                              <td colSpan={7} className="tracking-batch-expanded-cell">
                                <div className="tracking-batch-expanded-inner">
                                  <div className="tracking-batch-expanded-header">
                                    <i className="bx bx-package"></i> Hair Donations in {batchRef}
                                  </div>
                                  <table className="tracking-batch-inner-table">
                                    <thead>
                                      <tr>
                                        <th>Reference</th>
                                        <th>Donor</th>
                                        <th>Hair Details</th>
                                        <th>Wigmaker Received</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {bd.map(d => {
                                        const dState = (data.donationStateMap as any)[d.id];
                                        const dReceived = dState?.wigmakerReceived;
                                        const dMissing  = dState?.isMissing;
                                        const dPending  = !dReceived && !dMissing;
                                        return (
                                          <tr key={d.id} style={{ background: dMissing ? '#fff5f5' : 'transparent' }}>
                                            <td><code className="tracking-inner-ref">{d.reference}</code></td>
                                            <td>
                                              <div className="tracking-inner-donor">
                                                <span className="tracking-inner-avatar">{d.user?.firstName?.[0] || ''}{d.user?.lastName?.[0] || ''}</span>
                                                {d.user?.firstName} {d.user?.lastName}
                                              </div>
                                            </td>
                                            <td>{d.hairLength || 'N/A'} / {d.hairColor || 'N/A'}</td>
                                            <td>
                                              {dReceived && (
                                                <span style={{ color: '#10b981', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                  <i className="bx bx-check-circle"></i> Received
                                                </span>
                                              )}
                                              {dMissing && (
                                                <span style={{ color: '#dc2626', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                  <i className="bx bx-error-circle"></i> Missing
                                                </span>
                                              )}
                                              {dPending && (
                                                <span style={{ color: '#8c7895', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                  <i className="bx bx-time-five"></i> Pending
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    }

                    const donation = row.donation;
                    const wigProd = data.wigProductions[donation.id];
                    const isWigmakerControlled = !!wigProd || ['In Queue', 'In Progress', 'Processing'].includes(donation.status);
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
                          {(() => {
                            const stageLabel = isWigmakerControlled ? (
                              wigProd?.status === 'assigned' ? `Assigned to ${wigProd?.wigmaker?.firstName || 'Wigmaker'}` :
                                wigProd?.status === 'processing' ? `Crafting by ${wigProd?.wigmaker?.firstName || 'Wigmaker'}` :
                                  wigProd?.status === 'completed' ? `Finished by ${wigProd?.wigmaker?.firstName || 'Wigmaker'}` :
                                    wigProd?.status === 'shipped' ? 'Awaiting Wig Delivery' :
                                      wigProd?.status === 'received' ? 'Wig Received' :
                                        'Completed'
                            ) : donation.status;
                            const isDone = wigProd?.status === 'received';
                            const isInFlight = isWigmakerControlled && !isDone;
                            const pillBg = isDone ? '#dcfce7' : isInFlight ? '#fdf2f8' : '#fef9c3';
                            const pillColor = isDone ? '#15803d' : isInFlight ? '#ad246d' : '#a16207';
                            const pillBorder = isDone ? '#bbf7d0' : isInFlight ? '#fbcfe8' : '#fde68a';
                            const iconName = isDone ? 'bx-check-circle' : isInFlight ? 'bx-sync bx-spin' : 'bx-time-five';
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: pillBg,
                                    color: pillColor,
                                    border: `1px solid ${pillBorder}`,
                                    padding: '0.3rem 0.65rem',
                                    borderRadius: '999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    width: 'fit-content',
                                    maxWidth: '100%'
                                  }}
                                >
                                  <i className={`bx ${iconName}`} style={{ fontSize: '0.95rem' }}></i>
                                  {stageLabel}
                                </span>
                                {(wigProd?.updatedAt || donation.updatedAt) && (
                                  <div style={{ fontSize: '0.68rem', color: '#8c7895', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <i className='bx bx-time-five'></i>
                                    Updated {new Date(wigProd?.updatedAt || donation.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
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
                        {(() => {
                          const isDone = request.status === 'Completed';
                          const isReadyForPickup = request.status === 'Ready for Pickup' || request.status === 'Pickup Confirmed';
                          const isInTransit = request.status === 'In Transit';
                          const isEarly = request.status === 'Validated' || request.status === 'Matched';

                          const pillBg = isDone ? '#dcfce7' : isReadyForPickup ? '#dbeafe' : isInTransit ? '#fdf2f8' : isEarly ? '#fef9c3' : '#fdf2f8';
                          const pillColor = isDone ? '#15803d' : isReadyForPickup ? '#1d4ed8' : isInTransit ? '#ad246d' : isEarly ? '#a16207' : '#ad246d';
                          const pillBorder = isDone ? '#bbf7d0' : isReadyForPickup ? '#bfdbfe' : isInTransit ? '#fbcfe8' : isEarly ? '#fde68a' : '#fbcfe8';
                          const iconName = isDone ? 'bx-check-circle' : isReadyForPickup ? 'bx-store' : isInTransit ? 'bx-package bx-tada' : isEarly ? 'bx-time-five' : 'bx-map-pin';

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: pillBg,
                                  color: pillColor,
                                  border: `1px solid ${pillBorder}`,
                                  padding: '0.3rem 0.65rem',
                                  borderRadius: '999px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  width: 'fit-content',
                                  maxWidth: '100%'
                                }}
                              >
                                <i className={`bx ${iconName}`} style={{ fontSize: '0.95rem' }}></i>
                                {request.status}
                              </span>
                              {request.updatedAt && (
                                <div style={{ fontSize: '0.68rem', color: '#8c7895', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <i className='bx bx-time-five'></i>
                                  Updated {new Date(request.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                              )}
                            </div>
                          );
                        })()}
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
                          <span className="tracking-awaiting-text" style={{ color: '#10b981', fontWeight: 700 }}>
                            <i className='bx bx-time' style={{ verticalAlign: 'middle', marginRight: '4px' }}></i>
                            Awaiting Recipient Confirmation...
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
              {((isWigmaker && batchGroupsArray.length === 0) || ((isDonation || isBatchDonation) && visibleDonationRows.length === 0) || (!isDonation && !isBatchDonation && !isWigmaker && data.requests.length === 0)) && (
                <tr>
                  <td colSpan={7} className="tracking-empty-col">
                    <i className="bx bx-search tracking-empty-icon"></i>
                    <p>No active {isWigmaker ? 'wigmaker batch' : isBatchDonation ? 'hair batch donation' : isDonation ? 'donation' : 'request'} trackers found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={isWigmaker ? batchTotalPages : (isDonation || isBatchDonation) ? donationTotalPages : requestTotalPages}
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

      {showNoteModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowNoteModal(false); }}
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
              maxWidth: '520px',
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
                <i className='bx bx-message-square-edit' style={{ fontSize: '1.75rem', color: '#ad246d' }} />
              </div>
            </div>
            <h2 style={{ textAlign: 'center', margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#3b2e43' }}>
              Note to Wigmaker
            </h2>
            <p style={{ textAlign: 'center', margin: '0 0 1.25rem 0', fontSize: '0.875rem', color: '#8c7895', lineHeight: 1.5 }}>
              Add handling details or special reminders for the selected hair batch.
            </p>
            <textarea
              value={batchStaffNote}
              onChange={(e) => setBatchStaffNote(e.target.value.slice(0, 500))}
              className="batch-note-textarea"
              placeholder="Write a short note for the wigmaker..."
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', color: '#8c7895', fontSize: '0.75rem', fontWeight: 700 }}>
              <button
                type="button"
                onClick={() => setBatchStaffNote('')}
                style={{ background: 'none', border: 'none', color: '#ad246d', cursor: 'pointer', fontWeight: 800, padding: 0 }}
              >
                Clear note
              </button>
              <span>{batchStaffNote.length}/500</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => setShowNoteModal(false)}
                style={{ height: '44px', borderRadius: '50px', border: '1.5px solid #ead7e8', background: '#fff', color: '#5d4d62', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => setShowNoteModal(false)}
                style={{ height: '44px', borderRadius: '50px', border: 'none', background: 'linear-gradient(135deg, #ad246d 0%, #cf2f84 100%)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

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
