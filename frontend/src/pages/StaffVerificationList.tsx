import toast from 'react-hot-toast';
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import { getPublicUrl } from '../lib/storage';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import '../styles/StaffVerificationList.css';

const PAGE_SIZE = 10;

interface MonetaryItem {
  id: number;
  referenceNumber: string | null;
  name: string | null;
  email: string | null;
  amount: string | number | null;
  currency: string | null;
  paymentMethod: string | null;
  proofPath: string | null;
  status: string | null;
  anonymous: boolean | null;
  createdAt: string | null;
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
}

function monetaryDisplayName(d: MonetaryItem): React.ReactNode {
  if (d.anonymous) return <span style={{ color: '#9b8a9e', fontStyle: 'italic' }}>Anonymous</span>;
  if (d.user?.firstName) return `${d.user.firstName} ${d.user.lastName || ''}`.trim();
  return d.name || <span style={{ color: '#9b8a9e' }}>—</span>;
}

function monetaryDisplayEmail(d: MonetaryItem): string {
  if (d.anonymous) return '—';
  return d.user?.email || d.email || '—';
}

const StaffVerificationList: React.FC = () => {
  const { type } = useParams<{ type: 'donor' | 'recipient' | 'monetary' }>();
  const [items, setItems]               = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [currentPage, setCurrentPage]   = useState(1);
  const [proofUrl, setProofUrl]         = useState<string | null>(null);
  const [selectedIds, setSelectedIds]   = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting]     = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isMonetary = type === 'monetary';

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, type]);

  useEffect(() => {
    if (!proofUrl) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setProofUrl(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [proofUrl]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = type === 'donor'
        ? '/internal-api/staff/donor-verification'
        : type === 'recipient'
          ? '/internal-api/staff/recipient-verification'
          : '/internal-api/staff/monetary-donations';
      const res = await apiClient.get(endpoint);
      setItems(res.data);
    } catch (err) {
      console.error('Failed to fetch verification items', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useAutoRefresh(fetchItems, 15_000, { deps: [type] });


  const filteredItems = items.filter(item => {
    const name = item.user ? `${item.user.firstName} ${item.user.lastName}` : (item.name || '');
    const ref  = (item.reference || item.referenceNumber || '').toLowerCase();
    const matchesSearch =
      ref.includes(searchTerm.toLowerCase()) ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (isMonetary && (item.paymentMethod || '').toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      statusFilter === 'All Status' ||
      (item.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const pagedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const title    = type === 'donor' ? 'Hair Donations' : type === 'recipient' ? 'Recipient Requests' : 'Monetary Donations';
  const hasReview = !isMonetary;

  const openProof = (path: string) => {
    const url = getPublicUrl('hairlink', path);
    if (url) setProofUrl(url);
  };

  const allPageIds = pagedItems.map((i: any) => i.id as number);
  const allPageSelected = allPageIds.length > 0 && allPageIds.every(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => { const n = new Set(prev); allPageIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); allPageIds.forEach(id => n.add(id)); return n; });
    }
  };

  const toggleRow = (id: number) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    try {
      await apiClient.delete('/internal-api/staff/monetary-donations', {
        data: { ids: Array.from(selectedIds) },
      });
      toast.success(`${selectedIds.size} record${selectedIds.size > 1 ? 's' : ''} deleted.`);
      setItems(prev => prev.filter((i: any) => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="section-wrap reveal active staff-page">
      <article className="staff-block">
        <div className="staff-bar staff-bar-flex">
          <div>
            <h2 className="staff-queue-title">
              {title}{hasReview ? ' Verification Queue' : ''}
            </h2>
            {isMonetary && (
              <p style={{ fontSize: '0.78rem', color: '#9b8a9e', margin: '0.2rem 0 0' }}>
                Read-only financial record of all monetary contributions.
              </p>
            )}
          </div>

          <div className="staff-tools staff-tools-flex">
            <div className="search-input-wrapper">
              <i className='bx bx-search search-input-icon'></i>
              <input
                type="text"
                placeholder={isMonetary ? 'Search name, reference, method…' : 'Search recipient or reference'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="search-input-field"
              />
            </div>
            {!isMonetary && (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="status-filter-select"
              >
                <option>All Status</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            )}
            {isMonetary && selectedIds.size > 0 && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  padding: '0.35rem 0.9rem',
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#dc2626',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                }}
              >
                <i className="bx bx-trash"></i>
                Delete ({selectedIds.size})
              </button>
            )}
          </div>
        </div>

        <div className="tracking-table-wrap tracking-table-container">
          <table className="tracking-table tracking-table-styled">
            <thead className="tracking-table-head">
              <tr>
                {isMonetary ? (
                  <>
                    <th className="tracking-table-th" style={{ width: '36px', paddingRight: 0 }}>
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleSelectAll}
                        style={{ cursor: 'pointer', accentColor: '#ad246d' }}
                        title="Select all on this page"
                      />
                    </th>
                    <th className="tracking-table-th">Reference</th>
                    <th className="tracking-table-th">Donor</th>
                    <th className="tracking-table-th">Email</th>
                    <th className="tracking-table-th">Amount</th>
                    <th className="tracking-table-th">Method</th>
                    <th className="tracking-table-th">Date</th>
                    <th className="tracking-table-th tracking-table-th-center">Proof</th>
                  </>
                ) : (
                  <>
                    <th className="tracking-table-th">Reference</th>
                    <th className="tracking-table-th">Date</th>
                    <th className="tracking-table-th">User</th>
                    <th className="tracking-table-th">Status</th>
                    {hasReview && <th className="tracking-table-th-center">Action</th>}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isMonetary ? 8 : hasReview ? 5 : 4} className="tracking-table-loading">
                    <i className='bx bx-loader-alt bx-spin tracking-table-loading-icon'></i>
                    Loading {isMonetary ? 'monetary records' : 'verification queue'}…
                  </td>
                </tr>
              ) : pagedItems.length > 0 ? (
                pagedItems.map((item: any) =>
                  isMonetary ? (
                    <tr key={item.id} className={`tracking-table-row${selectedIds.has(item.id) ? ' selected' : ''}`}>
                      <td className="tracking-table-td" style={{ width: '36px', paddingRight: 0 }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleRow(item.id)}
                          style={{ cursor: 'pointer', accentColor: '#ad246d' }}
                        />
                      </td>
                      <td className="tracking-table-td">
                        <strong className="tracking-table-td-bold">{item.referenceNumber || '—'}</strong>
                      </td>
                      <td className="tracking-table-td">{monetaryDisplayName(item as MonetaryItem)}</td>
                      <td className="tracking-table-td" style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                        {monetaryDisplayEmail(item as MonetaryItem)}
                      </td>
                      <td className="tracking-table-td">
                        <strong style={{ color: '#ad246d' }}>
                          ₱{Number(item.amount || 0).toLocaleString()}
                        </strong>
                        <span style={{ fontSize: '0.7rem', color: '#9b8a9e', marginLeft: '3px' }}>
                          {item.currency || 'PHP'}
                        </span>
                      </td>
                      <td className="tracking-table-td">{item.paymentMethod || '—'}</td>
                      <td className="tracking-table-td-date">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="tracking-table-td-center">
                        {item.proofPath ? (
                          <button
                            onClick={() => openProof(item.proofPath)}
                            className="soft-btn review-btn-styled"
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            <i className="bx bx-image-alt" style={{ marginRight: '4px' }}></i>
                            View Proof
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#c4b5c8', fontStyle: 'italic' }}>
                            No proof
                          </span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    <tr key={item.id} className="tracking-table-row">
                      <td className="tracking-table-td">
                        <strong className="tracking-table-td-bold">{item.reference || item.referenceNumber}</strong>
                      </td>
                      <td className="tracking-table-td-date">{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td className="tracking-table-td-user">
                        {item.user ? `${item.user.firstName} ${item.user.lastName}` : (item.name || 'Anonymous')}
                      </td>
                      <td className="tracking-table-td"><StatusPill status={item.status} /></td>
                      {hasReview && (
                        <td className="tracking-table-td-center">
                          <Link
                            to={`/staff/verification/${type}/${item.reference || item.referenceNumber}`}
                            className="soft-btn review-btn-styled"
                          >
                            Review
                          </Link>
                        </td>
                      )}
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td colSpan={isMonetary ? 8 : hasReview ? 5 : 4} className="tracking-table-empty">
                    <i className='bx bx-file-find tracking-table-empty-icon'></i>
                    No items match your search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </article>

      {/* Proof image lightbox — rendered via portal so it escapes overflow:hidden layout wrappers */}
      {proofUrl && ReactDOM.createPortal(
        <div
          onClick={() => setProofUrl(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(10, 5, 15, 0.88)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
            cursor: 'zoom-out',
          }}
        >
          <button
            onClick={() => setProofUrl(null)}
            style={{
              position: 'fixed', top: '1.2rem', right: '1.4rem',
              width: '42px', height: '42px', borderRadius: '50%',
              border: 'none', background: 'rgba(255,255,255,0.12)',
              color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)', zIndex: 2,
            }}
          >
            <i className="bx bx-x"></i>
          </button>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 'min(90vw, 900px)', maxHeight: '90vh', cursor: 'default' }}>
            <img
              src={proofUrl}
              alt="Proof of Donation"
              style={{
                maxWidth: '100%', maxHeight: '90vh',
                objectFit: 'contain', borderRadius: '12px',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6)', display: 'block',
              }}
              onError={e => { (e.target as HTMLImageElement).alt = 'Image could not be loaded'; }}
            />
          </div>
          <p style={{
            position: 'fixed', bottom: '1.25rem', left: '50%', transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', margin: 0, whiteSpace: 'nowrap',
          }}>
            Click outside or press ESC to close
          </p>
        </div>,
        document.body
      )}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteSelected}
        title="Delete Monetary Records"
        message={`Are you sure you want to permanently delete ${selectedIds.size} monetary donation record${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isConfirming={isDeleting}
      />
    </div>
  );
};

export default StaffVerificationList;
