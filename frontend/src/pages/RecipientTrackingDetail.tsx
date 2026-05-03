import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';
import type { HairRequest } from '../types';

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
    <div className="section-wrap tracking-detail-page reveal active">
      <div className="module-head">
        <h1>Request Details</h1>
        <p>Reference #{requestData.reference}</p>
      </div>

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
            <small style={{ display: 'block', color: '#8c7895', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800 }}>Name</small>
            <strong style={{ color: '#3b2e43', fontSize: '0.85rem' }}>{fullName}</strong>
          </div>
        </div>
      </div>

      <div className="detail-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1rem', alignItems: 'start' }}>
        <div className="timeline-section" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <i className='bx bx-git-commit' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
            <h3 style={{ margin: 0 }}>Request Timeline</h3>
          </div>
          <div className="timeline" style={{ paddingLeft: '0.5rem' }}>
            {requestData.statusHistories?.map((history, i) => (
              <div key={i} className="timeline-item" style={{ borderLeft: '2px solid #f2ebf4', paddingLeft: '1.5rem', paddingBottom: '1.25rem', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-7px', top: 0, width: '12px', height: '12px', background: '#ad246d', borderRadius: '50%', border: '2px solid #fff' }}></div>
                <div className="timeline-meta" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#ad246d' }}>{history.status}</strong>
                  <time style={{ fontSize: '0.75rem', color: '#8c7895' }}>{new Date(history.createdAt).toLocaleString()}</time>
                </div>
                <div className="timeline-desc" style={{ background: '#fdf7fb', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #f2ebf4', fontSize: '0.85rem', color: '#4d3f56' }}>
                  {history.notes || `Status changed to ${history.status}`}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="details-box" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <i className='bx bx-info-square' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
            <h3 style={{ margin: 0 }}>Request Information</h3>
          </div>
          <div className="details-content" style={{ display: 'grid', gap: '0.5rem', fontSize: '0.88rem' }}>
            <p style={{ margin: 0 }}><strong>Contact Number:</strong> {requestData.contactNumber || 'N/A'}</p>
            <p style={{ margin: 0 }}><strong>Gender:</strong> {requestData.gender?.toUpperCase() || 'N/A'}</p>
            <p style={{ margin: 0 }}><strong>Story:</strong> <span style={{ fontStyle: 'italic', color: '#665772' }}>"{requestData.story || 'N/A'}"</span></p>
            <p style={{ margin: 0 }}><strong>Wig Size:</strong> {requestData.wigLength?.toUpperCase() || 'N/A'}</p>
            <p style={{ margin: 0, marginBottom: '0.5rem' }}><strong>Wig Color:</strong> {requestData.wigColor?.toUpperCase() || 'N/A'}</p>
          </div>

          <div style={{ marginTop: '1.25rem', borderTop: '1px dashed #ead7e8', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.8rem' }}>
              <i className='bx bx-paperclip' style={{ color: '#ad246d' }}></i>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Attachments</h3>
            </div>
            <div className="file-preview-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {requestData.diagnosisPhoto && (
                <div className="file-preview-item" style={{ width: '100px' }}>
                  <a href={requestData.diagnosisPhoto} target="_blank" rel="noreferrer" className="file-thumbnail" style={{ width: '100px', height: '100px', borderRadius: '10px', border: '1px solid #ead7e8', overflow: 'hidden', display: 'block', position: 'relative' }}>
                    <img src={requestData.diagnosisPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Diagnosis" />
                  </a>
                  <span style={{ display: 'block', textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#8c7895', marginTop: '0.25rem' }}>Medical Photo</span>
                </div>
              )}
              {requestData.additionalPhoto && (
                <div className="file-preview-item" style={{ width: '100px' }}>
                  <a href={requestData.additionalPhoto} target="_blank" rel="noreferrer" className="file-thumbnail" style={{ width: '100px', height: '100px', borderRadius: '10px', border: '1px solid #ead7e8', overflow: 'hidden', display: 'block', position: 'relative' }}>
                    <img src={requestData.additionalPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Reference" />
                  </a>
                  <span style={{ display: 'block', textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#8c7895', marginTop: '0.25rem' }}>Reference</span>
                </div>
              )}
              {requestData.documents?.map((url, index) => (
                <div key={index} className="file-preview-item" style={{ width: '100px' }}>
                  <a href={url} target="_blank" rel="noreferrer" className="file-thumbnail" style={{ width: '100px', height: '100px', borderRadius: '10px', border: '1px solid #ead7e8', overflow: 'hidden', display: 'block', position: 'relative' }}>
                    {url.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) ? (
                      <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Doc ${index + 1}`} />
                    ) : (
                      <div style={{ background: '#fdf7fb', width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}><i className='bx bxs-file-blank' style={{ color: '#ad246d', fontSize: '1.5rem' }}></i></div>
                    )}
                  </a>
                  <span style={{ display: 'block', textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#8c7895', marginTop: '0.25rem' }}>Doc #{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="action-row" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.8rem' }}>
        <Link to="/recipient/tracking" className="soft-btn" style={{ padding: '0.8rem 2rem', fontWeight: 800 }}>Back to My Request Tracking</Link>
      </div>
    </div>
  );
};

export default RecipientTrackingDetail;
