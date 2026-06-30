import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';
import ConfirmModal from '../components/ConfirmModal';
import { getPublicUrl } from '../lib/storage';
import '../styles/WigmakerTaskDetail.css';
import '../styles/WigmakerDashboard.css';

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

const WigmakerWigInventory: React.FC = () => {
  const [wigs, setWigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWigIds, setSelectedWigIds] = useState<number[]>([]);
  const [deliveryLink, setDeliveryLink] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'shipped' | 'received'>('all');
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<number[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Add Wig Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [wigLength, setWigLength] = useState<'short' | 'long' | ''>('');
  const [wigColor, setWigColor] = useState<'black' | 'brown' | 'light' | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState(() => getPhilippinesDateTimeLocal());
  const [nextWigCode, setNextWigCode] = useState<string>('');
  const todayMin = React.useMemo(() => {
    return getPhilippinesDateTimeLocal();
  }, []);
  const yearMax = React.useMemo(() => {
    const year = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric' }).format(new Date());
    return `${year}-12-31T23:59`;
  }, []);

  const fetchWigs = async () => {
    try {
      const res = await apiClient.get('/internal-api/wigmaker/wigs');
      setWigs(res.data);
    } catch (err) {
      console.error('Failed to fetch wigs', err);
      toast.error('Failed to load wig inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWigs();
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isAddModalOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isAddModalOpen]);

  // Set custom date and fetch next code when modal opens
  useEffect(() => {
    if (isAddModalOpen) {
      setCustomDate(getPhilippinesDateTimeLocal());
      apiClient.get('/internal-api/wigmaker/wigs/next-code')
        .then(res => setNextWigCode(res.data.nextCode))
        .catch(err => console.error('Failed to fetch next wig code:', err));
    } else {
      setNextWigCode('');
    }
  }, [isAddModalOpen]);

  const toggleSelect = (id: number) => {
    setSelectedWigIds(prev =>
      prev.includes(id) ? prev.filter(wigId => wigId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (filteredWigs: any[]) => {
    const readyWigs = filteredWigs.filter(w => w.status === 'completed');
    if (selectedWigIds.length === readyWigs.length) {
      setSelectedWigIds([]);
    } else {
      setSelectedWigIds(readyWigs.map(w => w.id));
    }
  };

  const toggleDeleteSelect = (id: number) => {
    setSelectedDeleteIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllDelete = () => {
    if (selectedDeleteIds.length === filteredWigsForDelete.length) {
      setSelectedDeleteIds([]);
    } else {
      setSelectedDeleteIds(filteredWigsForDelete.map(w => w.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedDeleteIds.length === 0) return;
    setIsDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.delete('/internal-api/wigmaker/wigs/bulk-delete', { data: { wigIds: selectedDeleteIds } });
      toast.success(`${selectedDeleteIds.length} wig(s) deleted successfully.`);
      setSelectedDeleteIds([]);
      setDeleteMode(false);
      setIsDeleteConfirmOpen(false);
      fetchWigs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete wigs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShipBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWigIds.length === 0) {
      toast.error('Please select at least 1 wig to ship.');
      return;
    }
    if (!deliveryLink.trim()) {
      toast.error('Please enter a return tracking URL.');
      return;
    }
    try {
      new URL(deliveryLink);
    } catch (_) {
      toast.error('Please enter a valid absolute tracking URL (e.g. https://...).');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/internal-api/wigmaker/wigs/ship', {
        wigIds: selectedWigIds,
        deliveryLink: deliveryLink.trim(),
        notes: notes.trim()
      });
      toast.success('Selected wigs have been shipped back to staff!');
      setSelectedWigIds([]);
      setDeliveryLink('');
      setNotes('');
      fetchWigs();
    } catch (err: any) {
      console.error('Failed to ship batch', err);
      toast.error(err.response?.data?.message || 'Failed to process shipment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddWigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wigLength || !wigColor) {
      toast.error('Please select both length and color.');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const executeAddWig = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('wigLength', wigLength);
      formData.append('wigColor', wigColor);
      formData.append('updatedAt', new Date(customDate).toISOString());
      if (file) formData.append('previewPhoto', file);

      await apiClient.post('/internal-api/wigmaker/wigs/create-free', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Wig added to inventory successfully.');
      setIsConfirmModalOpen(false);
      setIsAddModalOpen(false);
      
      // Reset form
      setWigLength('');
      setWigColor('');
      setFile(null);
      setPreviewUrl(null);
      
      // Reload inventory
      fetchWigs();
    } catch (err: any) {
      console.error('Wig creation failed:', err);
      toast.error(err.response?.data?.message || 'Failed to add wig.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="wigmaker-page staff-page">Loading wig inventory...</div>;
  }

  const WIG_MAKER_STATUSES = ['completed', 'shipped', 'received'];
  // Wigs with any status beyond 'received' (e.g. matched, In Transit) are treated as 'received' for display
  const displayStatus = (status: string) => WIG_MAKER_STATUSES.includes(status) ? status : 'received';

  const filteredWigs = wigs.filter(w => {
    const ds = displayStatus(w.status);
    return filter === 'all' || ds === filter;
  });
  const filteredWigsForDelete = filteredWigs; // all visible rows are deletable
  const readyWigsCount = wigs.filter(w => w.status === 'completed').length;
  const shippedWigsCount = wigs.filter(w => w.status === 'shipped').length;
  const receivedWigsCount = wigs.filter(w => displayStatus(w.status) === 'received').length;

  return (
    <section className="wigmaker-page reveal active staff-page" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginBottom: '1.5rem',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Wig Inventory</h1>
          <p style={{ fontSize: '0.82rem', color: '#8c7895', marginTop: '0.2rem', marginBottom: 0 }}>
            Manage your completed wigs, batch ship them to the staff, and track return status.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #ad246d 0%, #cf2f84 100%)',
              color: '#fff',
              border: 'none',
              padding: '0.5rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 12px rgba(173, 36, 109, 0.15)',
              transition: 'all 0.2s ease'
            }}
          >
            <i className="bx bx-plus-circle"></i> Add Wig
          </button>
          <button
            type="button"
            onClick={() => { setDeleteMode(d => !d); setSelectedDeleteIds([]); }}
            style={{
              background: deleteMode ? '#ef4444' : '#fff',
              color: deleteMode ? '#fff' : '#ef4444',
              border: '1.5px solid #ef4444',
              padding: '0.5rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease'
            }}
          >
            <i className={`bx ${deleteMode ? 'bx-x' : 'bx-trash'}`}></i>
            {deleteMode ? 'Cancel' : 'Delete'}
          </button>
          <div style={{ background: '#fff', border: '1px solid #ead7e8', color: '#ad246d', fontWeight: 800, padding: '0.5rem 1.2rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '50px', textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(73, 20, 52, 0.04)', whiteSpace: 'nowrap' }}>
            <span className="tracking-active-dot"></span>
            {wigs.length} Total Wigs
          </div>
        </div>
      </div>

      {/* Shipping Bar (Sticky top) */}
      {selectedWigIds.length > 0 && (
        <form onSubmit={handleShipBatch} className="batch-action-bar" style={{
          position: 'sticky',
          top: '20px',
          zIndex: 100,
          background: '#ad246d',
          padding: '1.25rem 1.75rem',
          borderRadius: '16px',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          color: '#fff',
          boxShadow: '0 10px 30px rgba(173, 36, 109, 0.3)',
          animation: 'slideDown 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="batch-count-badge" style={{ background: '#fff', color: '#ad246d', width: '28px', height: '28px', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: '0.85rem' }}>
              {selectedWigIds.length}
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
              Wigs Selected for Shipment back to Staff
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <i className="bx bx-link" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#ad246d', fontSize: '1rem', zIndex: 10 }}></i>
              <input
                type="url"
                required
                placeholder="Return tracking link (https://...)*"
                value={deliveryLink}
                onChange={(e) => setDeliveryLink(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 1rem 0 2.2rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.8rem',
                  outline: 'none',
                  color: '#3b2e43'
                }}
              />
            </div>
            <input
              type="text"
              placeholder="Optional message / package details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                flex: 1.5,
                minWidth: '240px',
                height: '38px',
                padding: '0 1rem',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.8rem',
                outline: 'none',
                color: '#3b2e43'
              }}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                height: '38px',
                padding: '0 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: '#fff',
                color: '#ad246d',
                fontWeight: 900,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
              }}
            >
              {isSubmitting ? 'Shipping...' : 'Ship Selected Wigs'}
            </button>
          </div>
        </form>
      )}

      {/* Tabs / Filters */}
      <article className="task-board dashboard-task-board" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
        <div className="task-board-head dashboard-task-board-head" style={{ borderBottom: '1px solid #f2ebf4', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <h2 className="dashboard-task-board-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="bx bxs-crown" style={{ color: '#ad246d' }}></i> Wig Inventory Records
          </h2>
          <p className="dashboard-task-board-subtitle">Select finished wigs to bundle into batches and track returning deliveries.</p>
        </div>

        <div className="task-filters dashboard-task-filters" style={{ marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          <button className={`dashboard-filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')} style={{ flexShrink: 0, whiteSpace: 'nowrap', width: 'auto' }}>
            All ({wigs.length})
          </button>
          <button className={`dashboard-filter-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')} style={{ flexShrink: 0, whiteSpace: 'nowrap', width: 'auto' }}>
            Production Finished ({readyWigsCount})
          </button>
          <button className={`dashboard-filter-btn ${filter === 'shipped' ? 'active' : ''}`} onClick={() => setFilter('shipped')} style={{ flexShrink: 0, whiteSpace: 'nowrap', width: 'auto' }}>
            Shipping ({shippedWigsCount})
          </button>
          <button className={`dashboard-filter-btn ${filter === 'received' ? 'active' : ''}`} onClick={() => setFilter('received')} style={{ flexShrink: 0, whiteSpace: 'nowrap', width: 'auto' }}>
            Finalized ({receivedWigsCount})
          </button>
        </div>

        {/* Delete Action Bar */}
        {deleteMode && selectedDeleteIds.length > 0 && (
          <div style={{
            position: 'sticky',
            top: '20px',
            zIndex: 100,
            background: '#ef4444',
            padding: '1rem 1.5rem',
            borderRadius: '14px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            color: '#fff',
            boxShadow: '0 8px 24px rgba(239,68,68,0.3)',
            animation: 'slideDown 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: '#fff', color: '#ef4444', width: '28px', height: '28px', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: '0.85rem' }}>
                {selectedDeleteIds.length}
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Wig(s) selected for deletion</span>
            </div>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={isSubmitting}
              style={{ height: '38px', padding: '0 1.5rem', borderRadius: '8px', border: 'none', background: '#fff', color: '#ef4444', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              <i className="bx bx-trash"></i>
              {isSubmitting ? 'Deleting...' : 'Delete Selected'}
            </button>
          </div>
        )}

        <div className="task-table-wrap dashboard-task-table-wrap" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', overflowX: 'auto', width: '100%', boxSizing: 'border-box' }}>
          <table className="task-table dashboard-task-table">
            <thead>
              <tr className="dashboard-tr-head">
                <th className="dashboard-th" style={{ width: '50px', textAlign: 'center' }}>
                  {deleteMode ? (
                    <div
                      onClick={handleSelectAllDelete}
                      style={{
                        width: '20px', height: '20px', borderRadius: '4px', border: '2px solid #ef4444',
                        background: selectedDeleteIds.length === filteredWigsForDelete.length && filteredWigsForDelete.length > 0 ? '#ef4444' : '#fff',
                        display: 'grid', placeItems: 'center', cursor: 'pointer', margin: '0 auto'
                      }}
                    >
                      {selectedDeleteIds.length === filteredWigsForDelete.length && filteredWigsForDelete.length > 0 && (
                        <i className="bx bx-check" style={{ color: '#fff', fontSize: '0.9rem' }}></i>
                      )}
                    </div>
                  ) : filter === 'completed' ? (
                    <div
                      onClick={() => handleSelectAll(filteredWigs)}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: '2px solid #ead7e8',
                        background: selectedWigIds.length === filteredWigs.filter(w => w.status === 'completed').length && selectedWigIds.length > 0 ? '#ad246d' : '#fff',
                        borderColor: selectedWigIds.length === filteredWigs.filter(w => w.status === 'completed').length && selectedWigIds.length > 0 ? '#ad246d' : '#ead7e8',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                        margin: '0 auto'
                      }}
                    >
                      {selectedWigIds.length === filteredWigs.filter(w => w.status === 'completed').length && selectedWigIds.length > 0 && (
                        <i className="bx bx-check" style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 800 }}></i>
                      )}
                    </div>
                  ) : null}
                </th>
                <th className="dashboard-th" style={{ width: '80px' }}>Photo</th>
                <th className="dashboard-th">Wig Code</th>
                <th className="dashboard-th">Specifications</th>
                <th className="dashboard-th">Status</th>
                <th className="dashboard-th">Return Tracking</th>
                <th className="dashboard-th">Completed On</th>
              </tr>
            </thead>
            <tbody>
              {filteredWigs.length > 0 ? (
                filteredWigs.map(w => {
                  const isSelectable = w.status === 'completed';
                  const isChecked = selectedWigIds.includes(w.id);
                  const isDeleteChecked = selectedDeleteIds.includes(w.id);
                  const photoUrl = w.preview_photo ? getPublicUrl('hairlink', w.preview_photo) : null;

                  return (
                    <tr key={w.id} className="dashboard-tr-body" style={{ background: isDeleteChecked ? '#fff1f1' : isChecked ? '#fff5f9' : 'none' }}>
                      <td className="dashboard-td" style={{ textAlign: 'center' }}>
                        {deleteMode ? (
                          <div
                            onClick={() => toggleDeleteSelect(w.id)}
                            style={{
                              width: '20px', height: '20px', borderRadius: '4px',
                              border: `2px solid ${isDeleteChecked ? '#ef4444' : '#ead7e8'}`,
                              background: isDeleteChecked ? '#ef4444' : '#fff',
                              display: 'grid', placeItems: 'center', cursor: 'pointer', margin: '0 auto', transition: 'all 0.15s ease'
                            }}
                          >
                            {isDeleteChecked && <i className="bx bx-check" style={{ color: '#fff', fontSize: '0.9rem' }}></i>}
                          </div>
                        ) : isSelectable ? (
                          <div
                            onClick={() => toggleSelect(w.id)}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              border: '2px solid #ead7e8',
                              background: isChecked ? '#ad246d' : '#fff',
                              borderColor: isChecked ? '#ad246d' : '#ead7e8',
                              display: 'grid',
                              placeItems: 'center',
                              cursor: 'pointer',
                              margin: '0 auto',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isChecked && (
                              <i className="bx bx-check" style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 800 }}></i>
                            )}
                          </div>
                        ) : null}
                      </td>
                      <td className="dashboard-td">
                        <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid #ead7e8', background: '#fdf7fb' }}>
                          {photoUrl ? (
                            <img src={photoUrl} alt="Wig" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#ecd8e8' }}>
                              <i className="bx bxs-crown" style={{ fontSize: '1.2rem' }}></i>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="dashboard-td">
                        <strong style={{ color: '#2d2333', fontSize: '0.9rem' }}>{w.taskCode}</strong>
                      </td>
                      <td className="dashboard-td">
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{
                            background: '#fdf2f8',
                            color: '#ad246d',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '50px',
                            border: '1px solid #fbcfe8',
                            textTransform: 'capitalize'
                          }}>
                            {w.targetLength || 'N/A'}
                          </span>
                          <span style={{
                            background: '#f3f4f6',
                            color: '#374151',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '50px',
                            border: '1px solid #e5e7eb',
                            textTransform: 'capitalize',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {w.targetColor && (() => {
                              const dotColor = w.targetColor.toLowerCase() === 'black' ? '#000' :
                                               w.targetColor.toLowerCase() === 'brown' ? '#7B4F2A' :
                                               w.targetColor.toLowerCase() === 'light' ? '#C9A96E' : '#8c7895';
                              return <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, display: 'inline-block' }}></span>;
                            })()}
                            {w.targetColor || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="dashboard-td">
                        <StatusPill status={displayStatus(w.status)} />
                      </td>
                      <td className="dashboard-td">
                        {w.deliveryLink ? (
                          <a
                            href={w.deliveryLink}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: '0.75rem',
                              color: '#3b82f6',
                              textDecoration: 'none',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#eff6ff',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #dbeafe'
                            }}
                          >
                            <i className="bx bx-link-external"></i> Track Return
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#a19ba8', fontStyle: 'italic' }}>Not Shipped Yet</span>
                        )}
                      </td>
                      <td className="dashboard-td" style={{ fontSize: '0.8rem', color: '#5d4d62' }}>
                        {new Date(w.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="dashboard-empty-row" style={{ textAlign: 'center', padding: '3rem 0' }}>
                    <i className="bx bx-info-circle dashboard-empty-icon" style={{ fontSize: '2.5rem', opacity: 0.2, marginBottom: '0.5rem', display: 'block' }}></i>
                    <p style={{ margin: 0, color: '#8c7895', fontSize: '0.9rem' }}>No wigs found matching this status.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {isAddModalOpen && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}
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
          <style>{`
            @keyframes cmFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes cmSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
            #add-wig-modal-card { animation: cmSlideUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1); }
          `}</style>
          <div
            id="add-wig-modal-card"
            style={{
              background: '#fff',
              borderRadius: '24px',
              boxShadow: '0 32px 80px rgba(173, 36, 109, 0.18), 0 8px 24px rgba(0,0,0,0.12)',
              padding: '2rem',
              maxWidth: '520px',
              width: '100%',
              border: '1px solid #ead7e8',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f2ebf4', paddingBottom: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b2e43', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="bx bxs-crown" style={{ color: '#ad246d' }}></i> Add Wig
                </h2>
                {nextWigCode && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ad246d', background: '#fdf2f8', padding: '0.2rem 0.6rem', borderRadius: '50px', border: '1px dashed #fbcfe8' }}>
                    {nextWigCode}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8c7895', fontSize: '1.5rem', fontWeight: 300, lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddWigSubmit} style={{ display: 'grid', gap: '1.2rem' }}>
              <div className="task-detail-spec-selectors" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', display: 'grid' }}>
                <div className="task-detail-spec-group">
                  <label className="task-detail-form-label">Wig Length <span className="task-detail-form-label-required">*</span></label>
                  <div className="task-detail-spec-options" style={{ display: 'flex', gap: '0.5rem' }}>
                    {[{ val: 'short', label: 'Short', sub: '10–14 in' }, { val: 'long', label: 'Long', sub: '15+ in' }].map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        className={`task-detail-spec-option ${wigLength === opt.val ? 'selected' : ''}`}
                        onClick={() => setWigLength(opt.val as 'short' | 'long')}
                        style={{ padding: '0.4rem', flex: 1, minWidth: '80px', outline: 'none' }}
                      >
                        <strong>{opt.label}</strong>
                        <small style={{ display: 'block', fontSize: '0.65rem', fontWeight: 400 }}>{opt.sub}</small>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="task-detail-spec-group">
                  <label className="task-detail-form-label">Wig Color <span className="task-detail-form-label-required">*</span></label>
                  <div className="task-detail-spec-options" style={{ display: 'flex', gap: '0.5rem' }}>
                    {[{ val: 'black', label: 'Black', color: '#1a1a1a' }, { val: 'brown', label: 'Brown', color: '#7B4F2A' }, { val: 'light', label: 'Light', color: '#C9A96E' }].map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        className={`task-detail-spec-option ${wigColor === opt.val ? 'selected' : ''}`}
                        onClick={() => setWigColor(opt.val as 'black' | 'brown' | 'light')}
                        style={{ padding: '0.4rem 0.5rem', flex: 1, minWidth: '70px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', outline: 'none' }}
                      >
                        <span className="task-detail-spec-color-dot" style={{ background: opt.color, margin: 0 }}></span>
                        <strong>{opt.label}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="task-detail-form-row-2col">
                <div>
                  <label className="task-detail-form-label">Upload Photo (Optional)</label>
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
                      <span className="task-detail-form-photo-upload-text">{file ? file.name : 'Upload Photo'}</span>
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

                <div>
                  <label className="task-detail-form-label">Timestamp</label>
                  <input
                    type="datetime-local"
                    value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                    min={todayMin}
                    max={yearMax}
                    className="task-detail-form-input-text"
                  />
                </div>
              </div>



              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  style={{
                    height: '44px', borderRadius: '50px',
                    border: '1.5px solid #ead7e8', background: '#fff',
                    color: '#5d4d62', fontWeight: 700, fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    height: '44px', borderRadius: '50px',
                    border: 'none', background: 'linear-gradient(135deg, #ad246d 0%, #cf2f84 100%)',
                    color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.75 : 1,
                    boxShadow: '0 4px 12px rgba(173, 36, 109, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <i className="bx bx-plus-circle" />
                      Add Wig
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {isConfirmModalOpen && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) setIsConfirmModalOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999999,
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
              maxWidth: '420px',
              width: '100%',
              border: '1px solid #ead7e8',
              textAlign: 'center',
              animation: 'cmSlideUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#fdf2f8', color: '#ad246d', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.2rem',
              fontSize: '2rem'
            }}>
              <i className="bx bx-question-mark"></i>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3b2e43', margin: '0 0 0.5rem' }}>
              Confirm Add Wig
            </h2>
            <p style={{ color: '#5d4d62', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
              Are you sure you want to add this wig to the inventory?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                style={{
                  height: '44px', borderRadius: '50px',
                  border: '1.5px solid #ead7e8', background: '#fff',
                  color: '#5d4d62', fontWeight: 700, fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeAddWig}
                disabled={isSubmitting}
                style={{
                  height: '44px', borderRadius: '50px',
                  border: 'none', background: 'linear-gradient(135deg, #ad246d 0%, #cf2f84 100%)',
                  color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.75 : 1,
                  boxShadow: '0 4px 12px rgba(173, 36, 109, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                }}
              >
                {isSubmitting ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" />
                    Adding...
                  </>
                ) : 'Yes, Add Wig'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Delete Wigs"
        message={`Are you sure you want to delete ${selectedDeleteIds.length} wig(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isConfirming={isSubmitting}
      />
    </section>
  );
};

export default WigmakerWigInventory;
