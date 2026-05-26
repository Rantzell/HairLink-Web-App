import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';
import type { HairRequest } from '../types';
import { getPublicUrl } from '../lib/storage';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/RecipientTrackingDetail.css';

const RecipientTrackingDetail: React.FC = () => {
  const { reference } = useParams<{ reference: string }>();
  const [requestData, setRequestData] = useState<HairRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWigConfirm, setShowWigConfirm] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await apiClient.get(`/internal-api/requests/${reference}`);
        setRequestData(res.data);
      } catch (err) {
        console.error('Failed to fetch request detail', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [reference]);

  const doConfirmReceived = async () => {
    setShowWigConfirm(false);
    setIsConfirming(true);
    try {
      await apiClient.post(`/internal-api/requests/${requestData?.reference}/confirm-received`);
      window.location.reload();
    } catch {
      alert('Failed to confirm receipt.');
    } finally {
      setIsConfirming(false);
    }
  };

  if (loading) return <div className="section-wrap">Loading...</div>;
  if (!requestData) return <div className="section-wrap">Request not found.</div>;

  const fullName = requestData.user ? `${requestData.user.firstName} ${requestData.user.lastName}` : 'Recipient';

  return (
    <section className="section-wrap donor-module-page reveal active">
      <header className="module-head detail-module-head">
        <h1 className="detail-module-title">Request Tracking Detail</h1>
        <p className="detail-module-subtitle">Reference: <strong>{requestData.reference}</strong></p>
        <div className="detail-action-row">
          <Link to="/recipient/tracking" className="detail-back-btn">
            Back to Tracking List
          </Link>
          {requestData.trackingLink && requestData.status === 'In Transit' && (
            <a 
              href={requestData.trackingLink} 
              target="_blank" 
              rel="noreferrer" 
              className="detail-track-btn"
            >
              <i className='bx bx-map-pin'></i> Track My Wig
            </a>
          )}
          {requestData.status === 'In Transit' && (
            <button 
              onClick={() => setShowWigConfirm(true)}
              disabled={isConfirming}
              className="detail-confirm-btn"
            >
              {isConfirming ? '...' : 'Confirm Wig Received'}
            </button>
          )}
        </div>
      </header>

      <div className="detail-summary-grid">
        <div className="detail-summary-card">
          <div className="detail-summary-icon-wrap">
            <i className="bx bx-hash detail-summary-icon"></i>
          </div>
          <div>
            <small className="detail-summary-label">Reference</small>
            <strong className="detail-summary-value">{requestData.reference}</strong>
          </div>
        </div>
        <div className="detail-summary-card">
          <div className="detail-summary-icon-wrap">
            <i className="bx bx-info-circle detail-summary-icon"></i>
          </div>
          <div>
            <small className="detail-summary-label">Status</small>
            <div className="detail-summary-pill-wrap"><StatusPill status={requestData.status} /></div>
          </div>
        </div>
        <div className="detail-summary-card">
          <div className="detail-summary-icon-wrap">
            <i className="bx bx-calendar detail-summary-icon"></i>
          </div>
          <div>
            <small className="detail-summary-label">Submitted</small>
            <strong className="detail-summary-value">{new Date(requestData.createdAt).toLocaleDateString()}</strong>
          </div>
        </div>
        <div className="detail-summary-card">
          <div className="detail-summary-icon-wrap">
            <i className="bx bx-user detail-summary-icon"></i>
          </div>
          <div>
            <small className="detail-summary-label">Recipient</small>
            <strong className="detail-summary-value">{fullName}</strong>
          </div>
        </div>
      </div>

      <div className="detail-layout">
        <div className="detail-roadmap-card">
          <div className="detail-roadmap-header">
            <i className="bx bx-git-commit detail-roadmap-icon"></i>
            <h3 className="detail-roadmap-title">Request Roadmap</h3>
          </div>
          <ul className="detail-timeline">
            {requestData.statusHistories?.map((history, i) => (
              <li key={i} className="detail-timeline-item">
                <div className="detail-timeline-dot"></div>
                <div className="detail-timeline-meta">
                  <strong className="detail-timeline-status">{history.status}</strong>
                  <time className="detail-timeline-time">{new Date(history.createdAt).toLocaleString()}</time>
                </div>
                <div className="detail-timeline-desc">
                  {history.notes || `Status changed to ${history.status}`}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="detail-side-box">
          <div className="detail-side-card">
            <div className="detail-side-card-header">
              <i className="bx bx-info-square detail-side-card-icon"></i>
              <h3 className="detail-side-card-title">Wig Info</h3>
            </div>
            <div className="detail-wig-info-grid">
              <p className="detail-wig-info-p"><strong>Wig Length:</strong> {requestData.wigLength?.toUpperCase()}</p>
              <p className="detail-wig-story"><strong>Wig Color:</strong> {requestData.wigColor?.toUpperCase()}</p>
              <div className="detail-wig-story-box">
                "{requestData.story || 'No story provided'}"
              </div>
            </div>
          </div>

          <div className="detail-photo-card">
            <small className="detail-photo-label">Reference Photo</small>
            <div className="detail-photo-frame">
              {requestData.additionalPhoto ? (
                <a href={getPublicUrl('hairlink', requestData.additionalPhoto) || '#'} target="_blank" rel="noreferrer" className="detail-photo-link">
                  <img 
                    src={getPublicUrl('hairlink', requestData.additionalPhoto) || ''} 
                    className="detail-photo-img"
                    alt="Recipient" 
                  />
                </a>
              ) : (
                <i className="bx bx-image detail-photo-placeholder"></i>
              )}
            </div>
          </div>

          {requestData.documents && requestData.documents.length > 0 && (
            <div className="detail-docs-card">
              <small className="detail-docs-label">Submitted Documents</small>
              <div className="detail-docs-grid">
                {requestData.documents.map((doc, i) => (
                  <a key={i} href={getPublicUrl('hairlink', doc) || '#'} target="_blank" rel="noreferrer" className="detail-doc-link">
                    <i className="bx bxs-file-pdf detail-doc-icon"></i>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showWigConfirm}
        onClose={() => setShowWigConfirm(false)}
        onConfirm={doConfirmReceived}
        title="Confirm Wig Received"
        message="Please confirm that you have received your wig. This action cannot be undone and will finalize your request."
        confirmText="Yes, I Received It"
        isConfirming={isConfirming}
      />
    </section>
  );
};

export default RecipientTrackingDetail;
