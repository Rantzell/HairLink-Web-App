import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';
import type { HairRequest } from '../types';
import { getPublicUrl } from '../lib/storage';

const RecipientTrackingDetail: React.FC = () => {
  const { reference } = useParams<{ reference: string }>();
  const [requestData, setRequestData] = useState<HairRequest | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="section-wrap">Loading...</div>;
  if (!requestData) return <div className="section-wrap">Request not found.</div>;

  const fullName = requestData.user ? `${requestData.user.firstName} ${requestData.user.lastName}` : 'Recipient';

  return (
    <section className="section-wrap donor-module-page reveal active">
      <header className="module-head">
        <h1>Request Tracking Detail</h1>
        <p>Reference: <strong>{requestData.reference}</strong></p>
        <div className="action-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link className="ghost-btn" to="/recipient/tracking">Back to Tracking List</Link>
          {requestData.trackingLink && requestData.status === 'In Transit' && (
            <a 
              href={requestData.trackingLink} 
              target="_blank" 
              rel="noreferrer" 
              className="submit-code-btn" 
              style={{ textDecoration: 'none', background: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <i className='bx bx-map-pin'></i> Track My Wig
            </a>
          )}
          {requestData.status === 'In Transit' && (
            <button 
              className="submit-code-btn" 
              onClick={async () => {
                if (!window.confirm('Confirm you have received your wig?')) return;
                try {
                  await apiClient.post(`/internal-api/requests/${requestData.reference}/confirm-received`);
                  window.location.reload();
                } catch (err) {
                  alert('Failed to confirm receipt.');
                }
              }}
              style={{ border: 'none', cursor: 'pointer' }}
            >
              Confirm Wig Received
            </button>
          )}
        </div>
      </header>

      <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem', marginBottom: '1rem' }}>
        <div className="summary-item" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '12px', padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#fdf2f8', width: '40px', height: '40px', borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
            <i className='bx bx-hash' style={{ color: '#ad246d', fontSize: '1.2rem' }}></i>
          </div>
          <div>
            <small style={{ display: 'block', color: '#8c7895', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800 }}>Reference</small>
            <strong style={{ color: '#3b2e43', fontSize: '0.85rem' }}>{requestData.reference}</strong>
          </div>
        </div>
        <div className="summary-item" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '12px', padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#fdf2f8', width: '40px', height: '40px', borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
            <i className='bx bx-info-circle' style={{ color: '#ad246d', fontSize: '1.2rem' }}></i>
          </div>
          <div>
            <small style={{ display: 'block', color: '#8c7895', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800 }}>Status</small>
            <div style={{ marginTop: '0.2rem' }}><StatusPill status={requestData.status} /></div>
          </div>
        </div>
        <div className="summary-item" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '12px', padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#fdf2f8', width: '40px', height: '40px', borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
            <i className='bx bx-calendar' style={{ color: '#ad246d', fontSize: '1.2rem' }}></i>
          </div>
          <div>
            <small style={{ display: 'block', color: '#8c7895', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800 }}>Submitted</small>
            <strong style={{ color: '#3b2e43', fontSize: '0.85rem' }}>{new Date(requestData.createdAt).toLocaleDateString()}</strong>
          </div>
        </div>
        <div className="summary-item" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '12px', padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#fdf2f8', width: '40px', height: '40px', borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
            <i className='bx bx-user' style={{ color: '#ad246d', fontSize: '1.2rem' }}></i>
          </div>
          <div>
            <small style={{ display: 'block', color: '#8c7895', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800 }}>Recipient</small>
            <strong style={{ color: '#3b2e43', fontSize: '0.85rem' }}>{fullName}</strong>
          </div>
        </div>
      </div>

      <div className="detail-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1rem', alignItems: 'start' }}>
        <div className="module-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <i className='bx bx-git-commit' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
            <h3 style={{ margin: 0 }}>Request Roadmap</h3>
          </div>
          <ul className="timeline" style={{ paddingLeft: '0.5rem', listStyle: 'none' }}>
            {requestData.statusHistories?.map((history, i) => (
              <li key={i} className="timeline-item" style={{ borderLeft: '2px solid #f2ebf4', paddingLeft: '1.5rem', paddingBottom: '1.25rem', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-7px', top: 0, width: '12px', height: '12px', background: '#ad246d', borderRadius: '50%', border: '2px solid #fff' }}></div>
                <div className="timeline-meta" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#ad246d' }}>{history.status}</strong>
                  <time style={{ fontSize: '0.75rem', color: '#8c7895' }}>{new Date(history.createdAt).toLocaleString()}</time>
                </div>
                <div className="timeline-desc" style={{ background: '#fdf7fb', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #f2ebf4', fontSize: '0.85rem', color: '#4d3f56' }}>
                  {history.notes || `Status changed to ${history.status}`}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="side-box" style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <i className='bx bx-info-square' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
              <h3 style={{ margin: 0 }}>Wig Info</h3>
            </div>
            <div style={{ display: 'grid', gap: '0.4rem', fontSize: '0.88rem' }}>
              <p style={{ margin: 0 }}><strong>Wig Length:</strong> {requestData.wigLength?.toUpperCase()}</p>
              <p style={{ margin: 0, marginBottom: '0.5rem' }}><strong>Wig Color:</strong> {requestData.wigColor?.toUpperCase()}</p>
              <div style={{ background: '#fdf7fb', padding: '0.5rem', borderRadius: '8px', border: '1px solid #f2ebf4', fontSize: '0.82rem', fontStyle: 'italic', color: '#665772' }}>
                "{requestData.story || 'No story provided'}"
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1rem', textAlign: 'center' }}>
            <small style={{ display: 'block', marginBottom: '0.5rem', color: '#ad246d', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>Reference Photo</small>
            <div style={{ width: '200px', height: '200px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden', background: '#fff5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(173, 36, 109, 0.05)', border: '1px solid #ead7e8' }}>
              {requestData.additionalPhoto ? (
                <a href={getPublicUrl('hairlink', requestData.additionalPhoto) || '#'} target="_blank" rel="noreferrer" style={{ width: '100%', height: '100%', display: 'block' }}>
                  <img 
                    src={getPublicUrl('hairlink', requestData.additionalPhoto) || ''} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    alt="Recipient" 
                  />
                </a>
              ) : (
                <i className='bx bx-image' style={{ fontSize: '3rem', color: '#ead7e8' }}></i>
              )}
            </div>
          </div>

          {requestData.documents && requestData.documents.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1rem' }}>
              <small style={{ display: 'block', marginBottom: '0.5rem', color: '#ad246d', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>Submitted Documents</small>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {requestData.documents.map((doc, i) => (
                  <a key={i} href={getPublicUrl('hairlink', doc) || '#'} target="_blank" rel="noreferrer" style={{ width: '45px', height: '45px', background: '#fdf7fb', border: '1px solid #ead7e8', borderRadius: '8px', display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
                    <i className='bx bxs-file-pdf' style={{ color: '#ad246d', fontSize: '1.2rem' }}></i>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default RecipientTrackingDetail;
