import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { getPublicUrl } from '../lib/storage';
import ConfirmModal from '../components/ConfirmModal';

const StaffVerificationDetail: React.FC = () => {
  const { type, reference } = useParams<{ type: 'donor' | 'recipient' | 'monetary'; reference: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const endpoint = type === 'monetary'
          ? `/internal-api/staff/verification/monetary/${reference}`
          : `/internal-api/staff/verification/${type}/${reference}`;
        
        const res = await apiClient.get(endpoint);
        setRecord(res.data);
      } catch (err) {
        console.error('Failed to fetch verification detail', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [type, reference]);

  const handleDecision = async (status: string) => {
    if (!remarks) {
      alert('Please provide validation remarks.');
      return;
    }
    setIsSubmitting(true);
    try {
      const endpoint = type === 'monetary'
        ? `/internal-api/staff/verification/monetary/${reference}/status`
        : `/internal-api/staff/verification/${type}/${reference}`;
      
      // The API expects 'Approved' or 'Rejected' (or 'Validated' for recipient)
      // I'll map them based on the type
      let finalStatus = status;
      if (type === 'donor') finalStatus = status === 'approve' ? 'Verified' : 'Rejected';
      if (type === 'recipient') finalStatus = status === 'approve' ? 'Validated' : 'Rejected';
      if (type === 'monetary') finalStatus = status === 'approve' ? 'Completed' : 'Rejected';

      await apiClient.post(endpoint, {
        status: finalStatus,
        remarks: remarks
      });

      alert(`Submission ${finalStatus} successfully!`);
      navigate(`/staff/verification/${type}`);
    } catch (err: any) {
      console.error('Decision failed', err);
      alert(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="section-wrap">Loading...</div>;
  if (!record) return <div className="section-wrap">Record not found.</div>;

  const isDonor = type === 'donor';
  const isMonetary = type === 'monetary';
  const title = isMonetary ? 'Monetary Donation Verification' : isDonor ? 'Donation Verification' : 'Request Verification';

  return (
    <section className="section-wrap reveal active staff-page">
      <div className="section-title-block" style={{ marginBottom: '1rem', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '0.2rem' }}>{title}</h1>
        <p style={{ marginTop: 0, color: '#8c7895' }}>Reference: <strong style={{ color: '#3b2e43' }}>{reference}</strong></p>
      </div>

      <article className="staff-block verification-detail-shell" style={{ marginTop: '0.5rem' }}>
        <div className="verification-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <i className='bx bx-notepad' style={{ color: '#ad246d', fontSize: '1.5rem' }}></i>
              <h2 style={{ margin: 0 }}>Submission Summary</h2>
            </div>
            
            <div className="summary-card" style={{ background: '#fdf7fb', border: '1px solid #f2ebf4', borderRadius: '12px', padding: '1.5rem' }}>
              <ul className="verification-list" style={{ listStyle: 'none', display: 'grid', gap: '0.8rem', padding: 0 }}>
                {isDonor ? (
                  <>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.95rem' }}>
                      <i className='bx bx-user' style={{ color: '#ad246d' }}></i>
                      <span><strong>Donor:</strong> {record.user?.firstName} {record.user?.lastName}</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.95rem' }}>
                      <i className='bx bx-cut' style={{ color: '#ad246d' }}></i>
                      <span><strong>Hair Length:</strong> {record.hairLength}</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.95rem' }}>
                      <i className='bx bx-palette' style={{ color: '#ad246d' }}></i>
                      <span><strong>Hair Color:</strong> {record.hairColor}</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem', fontSize: '0.95rem' }}>
                      <i className='bx bx-message-square-detail' style={{ color: '#ad246d', marginTop: '4px' }}></i>
                      <span><strong>Reason:</strong> <span style={{ fontStyle: 'italic', color: '#614f68' }}>"{record.reason || 'No reason provided'}"</span></span>
                    </li>
                  </>
                ) : (
                  <>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.95rem' }}>
                      <i className='bx bx-user-voice' style={{ color: '#ad246d' }}></i>
                      <span><strong>Recipient:</strong> {record.user?.firstName} {record.user?.lastName}</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.95rem' }}>
                      <i className='bx bx-phone' style={{ color: '#ad246d' }}></i>
                      <span><strong>Contact:</strong> {record.contactNumber || 'N/A'}</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.95rem' }}>
                      <i className='bx bx-male-female' style={{ color: '#ad246d' }}></i>
                      <span><strong>Gender:</strong> {record.gender || 'N/A'}</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.95rem' }}>
                      <i className='bx bx-ruler' style={{ color: '#ad246d' }}></i>
                      <span><strong>Preferred Wig Size:</strong> <strong>{record.wigLength || 'N/A'}</strong></span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.95rem' }}>
                      <i className='bx bx-paint' style={{ color: '#ad246d' }}></i>
                      <span><strong>Preferred Color:</strong> <strong>{record.wigColor || 'N/A'}</strong></span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem', fontSize: '0.95rem' }}>
                      <i className='bx bx-book-content' style={{ color: '#ad246d', marginTop: '4px' }}></i>
                      <span><strong>Applicant's Story:</strong> <span style={{ fontStyle: 'italic', color: '#614f68' }}>"{record.story || 'No story provided'}"</span></span>
                    </li>
                  </>
                )}
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.85rem', borderTop: '1px solid #f2ebf4', paddingTop: '0.8rem', marginTop: '0.5rem', color: '#8c7895' }}>
                  <i className='bx bx-calendar-check'></i>
                  <span><strong>Submitted:</strong> {new Date(record.createdAt).toLocaleString()}</span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
              <i className='bx bx-paperclip' style={{ color: '#ad246d', fontSize: '1.5rem' }}></i>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Attached Files</h2>
            </div>
            
            <div className="file-preview-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {isMonetary ? (
                record.proofPath && (
                  <div className="file-preview-item" style={{ width: '120px' }}>
                    <a href={getPublicUrl('hairlink', record.proofPath) || '#'} target="_blank" rel="noreferrer" className="file-thumbnail" style={{ width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', display: 'block', border: '1px solid #ead7e8' }}>
                      <img src={getPublicUrl('hairlink', record.proofPath) || ''} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                    <span style={{ fontSize: '0.7rem', textAlign: 'center', display: 'block', marginTop: '0.25rem' }}>Proof of Payment</span>
                  </div>
                )
              ) : isDonor ? (
                <>
                  {record.photoFront && (
                    <div className="file-preview-item" style={{ width: '120px' }}>
                      <a href={getPublicUrl('hairlink', record.photoFront) || '#'} target="_blank" rel="noreferrer" className="file-thumbnail" style={{ width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', display: 'block', border: '1px solid #ead7e8' }}>
                        <img src={getPublicUrl('hairlink', record.photoFront) || ''} alt="Front" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                      <span style={{ fontSize: '0.7rem', textAlign: 'center', display: 'block', marginTop: '0.25rem' }}>Reference Photo</span>
                    </div>
                  )}
                  {record.photoSide && (
                    <div className="file-preview-item" style={{ width: '120px' }}>
                      <a href={getPublicUrl('hairlink', record.photoSide) || '#'} target="_blank" rel="noreferrer" className="file-thumbnail" style={{ width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', display: 'block', border: '1px solid #ead7e8' }}>
                        <img src={getPublicUrl('hairlink', record.photoSide) || ''} alt="Side" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                      <span style={{ fontSize: '0.7rem', textAlign: 'center', display: 'block', marginTop: '0.25rem' }}>Hair Side</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {record.medicalCertificate && (
                    <div className="file-preview-item" style={{ width: '100px' }}>
                      <a href={getPublicUrl('hairlink', record.medicalCertificate) || '#'} target="_blank" rel="noreferrer" className="file-thumbnail" style={{ width: '100px', height: '100px', borderRadius: '10px', border: '1px solid #ead7e8', overflow: 'hidden', display: 'block' }}>
                        <img src={getPublicUrl('hairlink', record.medicalCertificate) || ''} alt="Medical Cert" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                      <span style={{ fontSize: '0.65rem', textAlign: 'center', display: 'block' }}>Medical Cert</span>
                    </div>
                  )}
                  {record.diagnosisPhoto && (
                    <div className="file-preview-item" style={{ width: '100px' }}>
                      <a href={getPublicUrl('hairlink', record.diagnosisPhoto) || '#'} target="_blank" rel="noreferrer" className="file-thumbnail" style={{ width: '100px', height: '100px', borderRadius: '10px', border: '1px solid #ead7e8', overflow: 'hidden', display: 'block' }}>
                        <img src={getPublicUrl('hairlink', record.diagnosisPhoto) || ''} alt="Diagnosis" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                      <span style={{ fontSize: '0.65rem', textAlign: 'center', display: 'block' }}>Diagnosis</span>
                    </div>
                  )}
                  {record.recipientPhoto && (
                    <div className="file-preview-item" style={{ width: '100px' }}>
                      <a href={getPublicUrl('hairlink', record.recipientPhoto) || '#'} target="_blank" rel="noreferrer" className="file-thumbnail" style={{ width: '100px', height: '100px', borderRadius: '10px', border: '1px solid #ead7e8', overflow: 'hidden', display: 'block' }}>
                        <img src={getPublicUrl('hairlink', record.recipientPhoto) || ''} alt="Recipient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                      <span style={{ fontSize: '0.65rem', textAlign: 'center', display: 'block' }}>Recipient</span>
                    </div>
                  )}
                  {record.additionalPhoto && (
                    <div className="file-preview-item" style={{ width: '100px' }}>
                      <a href={getPublicUrl('hairlink', record.additionalPhoto) || '#'} target="_blank" rel="noreferrer" className="file-thumbnail" style={{ width: '100px', height: '100px', borderRadius: '10px', border: '1px solid #ead7e8', overflow: 'hidden', display: 'block' }}>
                        <img src={getPublicUrl('hairlink', record.additionalPhoto) || ''} alt="Reference" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                      <span style={{ fontSize: '0.65rem', textAlign: 'center', display: 'block' }}>Reference Picture</span>
                    </div>
                  )}
                  {record.documents?.map((path: string, i: number) => (
                    <div key={i} className="file-preview-item" style={{ width: '100px' }}>
                      <a href={getPublicUrl('hairlink', path) || '#'} target="_blank" rel="noreferrer" className="file-thumbnail" style={{ width: '100px', height: '100px', borderRadius: '10px', border: '1px solid #ead7e8', overflow: 'hidden', display: 'block', background: '#fdf7fb' }}>
                        {path.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) ? (
                          <img src={getPublicUrl('hairlink', path) || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Doc ${i+1}`} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}><i className='bx bxs-file-blank' style={{ color: '#ad246d', fontSize: '1.5rem' }}></i></div>
                        )}
                      </a>
                      <span style={{ fontSize: '0.65rem', textAlign: 'center', display: 'block' }}>Doc #{i+1}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>
        </div>
      </article>

      <article className="staff-block" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <i className='bx bx-check-shield' style={{ color: '#ad246d', fontSize: '1.5rem' }}></i>
          <h2 style={{ margin: 0 }}>Verification Decision</h2>
        </div>
        
        <div className="verification-form">
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: 700, color: '#4d3f56', display: 'block', marginBottom: '0.5rem' }}>Validation Remarks <span className="required">*</span></label>
            <textarea 
              rows={3} 
              placeholder="Explain the rationale for this decision..." 
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              style={{ width: '100%', borderRadius: '12px', border: '1px solid #ead7e8', padding: '1rem' }}
            ></textarea>
          </div>

          <div className="form-actions" style={{ display: 'flex', gap: '1rem' }}>
            <button 
              type="button" 
              className="soft-btn" 
              disabled={isSubmitting}
              onClick={() => { setPendingDecision('approve'); setShowConfirm(true); }}
              style={{ 
                padding: '0 1rem', 
                height: '32px',
                minHeight: '32px',
                maxHeight: '32px',
                fontWeight: 800, 
                background: '#ad246d',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              {isSubmitting ? 'Processing...' : 'Approve Submission'}
            </button>
            <button 
              type="button" 
              className="ghost-btn" 
              disabled={isSubmitting}
              onClick={() => { setPendingDecision('reject'); setShowConfirm(true); }}
              style={{ 
                padding: '0 1rem', 
                height: '32px',
                minHeight: '32px',
                maxHeight: '32px',
                fontWeight: 800, 
                border: '1px solid #ad246d',
                color: '#ad246d',
                borderRadius: '8px',
                fontSize: '0.75rem',
                background: 'transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              Reject Submission
            </button>
            <Link 
              to={`/staff/verification/${type}`} 
              style={{ 
                marginLeft: 'auto', 
                color: '#8c7895', 
                fontWeight: 600, 
                fontSize: '0.75rem',
                padding: '0 1rem',
                height: '32px',
                minHeight: '32px',
                maxHeight: '32px',
                border: '1px solid #ead7e8',
                borderRadius: '8px',
                textDecoration: 'none',
                background: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              Return to Queue
            </Link>
          </div>
        </div>
      </article>

      <ConfirmModal
        isOpen={showConfirm && pendingDecision === 'approve'}
        onClose={() => { setShowConfirm(false); setPendingDecision(null); }}
        onConfirm={() => { setShowConfirm(false); handleDecision('approve'); }}
        title="Approve Submission"
        message="Are you sure you want to approve this submission? This will update the applicant's status."
        confirmText="Yes, Approve"
        isConfirming={isSubmitting}
      />

      <ConfirmModal
        isOpen={showConfirm && pendingDecision === 'reject'}
        onClose={() => { setShowConfirm(false); setPendingDecision(null); }}
        onConfirm={() => { setShowConfirm(false); handleDecision('reject'); }}
        title="Reject Submission"
        message="Are you sure you want to reject this submission? The applicant will be notified."
        confirmText="Yes, Reject"
        variant="danger"
        isConfirming={isSubmitting}
      />
    </section>
  );
};

export default StaffVerificationDetail;
