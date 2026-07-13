import toast from 'react-hot-toast';
import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';
import Pagination from '../components/Pagination';
import type { HairRequest } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import '../styles/RecipientTracking.css';

const PAGE_SIZE = 10;

const RecipientTracking: React.FC = () => {
  const [requests, setRequests] = useState<HairRequest[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await apiClient.get('/internal-api/requests');
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch requests', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useAutoRefresh(fetchRequests, 15_000, { enabled: !isConfirming });

  const filteredRequests = requests.filter(r =>
    r.reference.toLowerCase().includes(filter.toLowerCase()) ||
    r.status.toLowerCase().includes(filter.toLowerCase()) ||
    (r.user?.firstName + ' ' + r.user?.lastName).toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => { setCurrentPage(1); }, [filter]);
  const totalPages   = Math.ceil(filteredRequests.length / PAGE_SIZE);
  const pagedRequests = filteredRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const doConfirmReceived = async () => {
    if (!pendingRef) return;
    setShowConfirm(false);
    setIsConfirming(true);
    try {
      await apiClient.post(`/internal-api/requests/${pendingRef}/confirm-received`);
      await fetchRequests();
    } catch {
      toast.error('Failed to confirm receipt.');
    } finally {
      setIsConfirming(false);
      setPendingRef(null);
    }
  };

  return (
    <section className="section-wrap donor-module-page reveal active">
      <header className="module-head tracking-module-head">
        <h1 className="tracking-module-title">My Request Tracking</h1>
        <p className="tracking-module-subtitle">Monitor the status of your hair requests and coordination updates.</p>
        <div className="tracking-tools-row">
          <div className="tracking-search-wrapper">
            <i className="bx bx-search tracking-search-icon"></i>
            <input 
              type="text" 
              placeholder="Search reference, status..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="tracking-search-input"
            />
          </div>
          <Link to="/recipient/request" className="tracking-new-request-btn">
            Submit New Request
          </Link>
        </div>
      </header>

      <article className="module-card">
        <div className="table-wrap">
          <table className="tracking-table">
            <thead>
              <tr>
                <th className="tracking-table-th">Reference</th>
                <th className="tracking-table-th">Submitted</th>
                <th className="tracking-table-th">Status</th>
                <th className="tracking-table-th">Wig Length</th>
                <th className="tracking-table-th">Wig Color</th>
                <th className="tracking-table-th-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="tracking-td-loading">Loading requests...</td></tr>
              ) : pagedRequests.length > 0 ? (
                pagedRequests.map(r => (
                  <tr key={r.id}>
                    <td className="tracking-td-text"><strong>{r.reference}</strong></td>
                    <td className="tracking-td-text">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td><StatusPill status={r.status} /></td>
                    <td className="tracking-td-text">{r.wigLength}</td>
                    <td className="tracking-td-text">{r.wigColor}</td>
                    <td className="tracking-td-center">
                      <div className="tracking-actions-cell">
                        <Link to={`/recipient/tracking/${r.reference}`} className="tracking-details-btn">
                          Details
                        </Link>
                        {r.status === 'In Transit' && (
                          <button 
                            className="tracking-received-btn"
                            onClick={() => { setPendingRef(r.reference); setShowConfirm(true); }}
                            disabled={isConfirming}
                          >
                            {isConfirming && pendingRef === r.reference ? '...' : 'Received'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="tracking-td-empty">
                    {filter ? 'No matching requests found.' : 'No request records yet. Submit your first hair request to begin tracking.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </article>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => { setShowConfirm(false); setPendingRef(null); }}
        onConfirm={doConfirmReceived}
        title="Confirm Wig Received"
        message="Please confirm that you have received your wig. This action cannot be undone and will finalize your request."
        confirmText="Yes, I Received It"
        isConfirming={isConfirming}
      />
    </section>
  );
};

export default RecipientTracking;
