import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';

const StaffVerificationDetail: React.FC = () => {
  const { type, reference } = useParams<{ type: 'donor' | 'recipient' | 'monetary'; reference: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const endpoint = type === 'monetary'
          ? `/internal-api/staff/verification/monetary/${reference}` // Assuming this exists or works via generic
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
  const title = isMonetary ? 'Monetary Donation Verification' : isDonor ? 'Donor Hair Verification' : 'Recipient Request Verification';

  return (
    <section className="section-wrap reveal active staff-page">
      <div className="section-title-block">
        <h1>{title}</h1>
        <p>Reference: <strong>{reference}</strong></p>
      </div>

      <article className="staff-block verification-detail-shell">
        <div className="verification-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <i className='bx bx-notepad' style={{ color: '#ad246d', fontSize: '1.5rem' }}></i>
              <h2 style={{ margin: 0 }}>Submission Summary</h2>
            </div>
            
            <div className="summary-card" style={{ background: '#fdf7fb', border: '1px solid #f2ebf4', borderRadius: '12px', padding: '1rem' }}>
              <ul className="verification-list" style={{ listStyle: 'none', display: 'grid', gap: '0.5rem', padding: 0 }}>
                {isMonetary ? (
                  <>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                      <i className='bx bx-user' style={{ color: '#ad246d' }}></i>
                      <span><strong>Donor:</strong> {record.user?.firstName || record.name} {record.user?.lastName || ''}</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                      <i className='bx bx-money' style={{ color: '#ad246d' }}></i>
                      <span><strong>Amount:</strong> <strong style={{ color: '#ad246d' }}>{record.currency} {Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                      <i className='bx bx-credit-card' style={{ color: '#ad246d' }}></i>
                      <span><strong>Ref Number:</strong> {record.referenceNumber || record.reference_number}</span>
                    </li>
                  </>
                ) : isDonor ? (
                  <>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                      <i className='bx bx-user' style={{ color: '#ad246d' }}></i>
                      <span><strong>Donor:</strong> {record.user?.firstName} {record.user?.lastName}</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                      <i className='bx bx-cut' style={{ color: '#ad246d' }}></i>
                      <span><strong>Hair Length:</strong> {record.hairLength}</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                      <i className='bx bx-palette' style={{ color: '#ad246d' }}></i>
                      <span><strong>Hair Color:</strong> {record.hairColor}</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                      <i className='bx bx-user-voice' style={{ color: '#ad246d' }}></i>
                      <span><strong>Recipient:</strong> {record.user?.firstName} {record.user?.lastName}</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                      <i className='bx bx-ruler' style={{ color: '#ad246d' }}></i>
                      <span><strong>Preferred Wig Size:</strong> <strong>{record.wigLength || 'N/A'}</strong></span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                      <i className='bx bx-paint' style={{ color: '#ad246d' }}></i>
                      <span><strong>Preferred Color:</strong> <strong>{record.wigColor || 'N/A'}</strong></span>
                    </li>
                  </>
                )}
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', borderTop: '1px solid #f2ebf4', paddingTop: '0.5rem', marginTop: '0.2rem', color: '#8c7895' }}>
                  <i className='bx bx-calendar-check'></i>
                  <span><strong>Submitted:</strong> {new Date(record.createdAt).toLocaleString()}</span>
                </li>
              </ul>
            </div>
            
            {!isMonetary && (
              <div style={{ marginTop: '1rem', background: '#fff', border: '1px solid #ead7e8', borderRadius: '12px', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#ad246d', textTransform: 'uppercase' }}>{isDonor ? 'Reason' : "Recipient's Story"}</h4>
                <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.9rem', color: '#614f68' }}>"{isDonor ? record.reason : record.story}"</p>
              </div>
            )}
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
                    <a href={record.proofPath} target="_blank" rel="noreferrer" className="file-thumbnail" style={{ width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', display: 'block', border: '1px solid #ead7e8' }}>
                      <img src={record.proofPath} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                    <span style={{ fontSize: '0.7rem', textAlign: 'center', display: 'block', marginTop: '0.25rem' }}>Proof of Payment</span>
                  </div>
                )
              ) : isDonor ? (
                <>
                  {record.photoFront && (
                    <div className="file-preview-item" style={{ width: '120px' }}>
                      <a href={record.photoFront} target="_blank" rel="noreferrer" className="file-thumbnail" style={{ width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', display: 'block', border: '1px solid #ead7e8' }}>
                        <img src={record.photoFront} alt="Front" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                      <span style={{ fontSize: '0.7rem', textAlign: 'center', display: 'block', marginTop: '0.25rem' }}>Reference Photo</span>
                    </div>
                  )}
                  {record.photoSide && (
                    <div className="file-preview-item" style={{ width: '120px' }}>
                      <a href={record.photoSide} target="_blank" rel="noreferrer" className="file-thumbnail" style={{ width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', display: 'block', border: '1px solid #ead7e8' }}>
                        <img src={record.photoSide} alt="Side" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                      <span style={{ fontSize: '0.7rem', textAlign: 'center', display: 'block', marginTop: '0.25rem' }}>Hair Side</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {record.medicalCertificate && (
                    <div className="file-preview-item" style={{ width: '100px' }}>
                      <a href={record.medicalCertificate} target="_blank" rel="noreferrer" className="file-thumbnail" style={{ width: '100px', height: '100px', borderRadius: '10px', border: '1px solid #ead7e8', overflow: 'hidden', display: 'block' }}>
                        <img src={record.medicalCertificate} alt="Medical Cert" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                      <span style={{ fontSize: '0.65rem', textAlign: 'center', display: 'block' }}>Medical Cert</span>
                    </div>
                  )}
                  {record.diagnosisPhoto && (
                    <div className="file-preview-item" style={{ width: '100px' }}>
                      <a href={record.diagnosisPhoto} target="_blank" rel="noreferrer" className="file-thumbnail" style={{ width: '100px', height: '100px', borderRadius: '10px', border: '1px solid #ead7e8', overflow: 'hidden', display: 'block' }}>
                        <img src={record.diagnosisPhoto} alt="Diagnosis" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                      <span style={{ fontSize: '0.65rem', textAlign: 'center', display: 'block' }}>Diagnosis</span>
                    </div>
                  )}
                  {record.recipientPhoto && (
                    <div className="file-preview-item" style={{ width: '100px' }}>
                      <a href={record.recipientPhoto} target="_blank" rel="noreferrer" className="file-thumbnail" style={{ width: '100px', height: '100px', borderRadius: '10px', border: '1px solid #ead7e8', overflow: 'hidden', display: 'block' }}>
                        <img src={record.recipientPhoto} alt="Recipient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                      <span style={{ fontSize: '0.65rem', textAlign: 'center', display: 'block' }}>Recipient</span>
                    </div>
                  )}
                  {record.documents?.map((url: string, i: number) => (
                    <div key={i} className="file-preview-item" style={{ width: '100px' }}>
                      <a href={url} target="_blank" rel="noreferrer" className="file-thumbnail" style={{ width: '100px', height: '100px', borderRadius: '10px', border: '1px solid #ead7e8', overflow: 'hidden', display: 'block', background: '#fdf7fb' }}>
                        {url.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) ? (
                          <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Doc ${i+1}`} />
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
              onClick={() => handleDecision('approve')}
              style={{ padding: '0.8rem 2.5rem', fontWeight: 800 }}
            >
              {isSubmitting ? 'Processing...' : 'Approve Submission'}
            </button>
            <button 
              type="button" 
              className="ghost-btn" 
              disabled={isSubmitting}
              onClick={() => handleDecision('reject')}
              style={{ padding: '0.8rem 2.5rem', fontWeight: 800 }}
            >
              Reject Submission
            </button>
            <Link className="ghost-btn" to={`/staff/verification/${type}`} style={{ marginLeft: 'auto', color: '#8c7895' }}>Return to Queue</Link>
          </div>
        </div>
      </article>
    </section>
  );
};

export default StaffVerificationDetail;
