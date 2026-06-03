import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';
import { getPublicUrl } from '../lib/storage';

const WigmakerWigInventory: React.FC = () => {
  const [wigs, setWigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWigIds, setSelectedWigIds] = useState<number[]>([]);
  const [deliveryLink, setDeliveryLink] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'shipped' | 'received'>('all');

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

  if (loading) {
    return <div className="wigmaker-page staff-page">Loading wig inventory...</div>;
  }

  const filteredWigs = wigs.filter(w => filter === 'all' || w.status === filter);
  const readyWigsCount = wigs.filter(w => w.status === 'completed').length;
  const shippedWigsCount = wigs.filter(w => w.status === 'shipped').length;
  const receivedWigsCount = wigs.filter(w => w.status === 'received').length;

  return (
    <section className="wigmaker-page reveal active staff-page">
      <div className="section-title-block dashboard-section-title-block">
        <div>
          <h1 className="dashboard-title">Wig Inventory</h1>
          <p className="dashboard-subtitle">
            Manage your completed wigs, batch ship them to the staff, and track return status.
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #ead7e8', color: '#ad246d', fontWeight: 800, padding: '0.5rem 1.2rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '50px', textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(73, 20, 52, 0.04)' }}>
          <span className="tracking-active-dot"></span>
          {wigs.length} Total Wigs
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
              Wigs Selected for Shipment back to Staff 🚀
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
      <article className="task-board dashboard-task-board">
        <div className="task-board-head dashboard-task-board-head" style={{ borderBottom: '1px solid #f2ebf4', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <h2 className="dashboard-task-board-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="bx bxs-crown" style={{ color: '#ad246d' }}></i> Wig Inventory Records
          </h2>
          <p className="dashboard-task-board-subtitle">Select finished wigs to bundle into batches and track returning deliveries.</p>
        </div>

        <div className="task-filters dashboard-task-filters" style={{ marginBottom: '1.25rem' }}>
          <button className={`filter-btn dashboard-filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            All ({wigs.length})
          </button>
          <button className={`filter-btn dashboard-filter-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>
            Production Finished ({readyWigsCount})
          </button>
          <button className={`filter-btn dashboard-filter-btn ${filter === 'shipped' ? 'active' : ''}`} onClick={() => setFilter('shipped')}>
            Shipping ({shippedWigsCount})
          </button>
          <button className={`filter-btn dashboard-filter-btn ${filter === 'received' ? 'active' : ''}`} onClick={() => setFilter('received')}>
            Finalized ({receivedWigsCount})
          </button>
        </div>

        <div className="task-table-wrap dashboard-task-table-wrap" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', overflow: 'hidden' }}>
          <table className="task-table dashboard-task-table">
            <thead>
              <tr className="dashboard-tr-head">
                <th className="dashboard-th" style={{ width: '50px', textAlign: 'center' }}>
                  {filter === 'completed' && (
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
                  )}
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
                  const photoUrl = w.preview_photo ? getPublicUrl('hairlink', w.preview_photo) : null;

                  return (
                    <tr key={w.id} className="dashboard-tr-body" style={{ background: isChecked ? '#fff5f9' : 'none' }}>
                      <td className="dashboard-td" style={{ textAlign: 'center' }}>
                        {isSelectable && (
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
                        )}
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
                        <StatusPill status={w.status} />
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
    </section>
  );
};

export default WigmakerWigInventory;
