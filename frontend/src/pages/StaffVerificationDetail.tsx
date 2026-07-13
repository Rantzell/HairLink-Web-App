import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { getPublicUrl } from '../lib/storage';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/StaffVerificationDetail.css';
import PageLoader from '../components/PageLoader';

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  nonbinary: 'Non-binary',
  prefer_not_say: 'Prefer not to say',
};
const formatGender = (g?: string | null) => g ? (GENDER_LABELS[g] ?? g) : 'N/A';

const StaffVerificationDetail: React.FC = () => {
  const { type, reference } = useParams<{ type: 'donor' | 'recipient' | 'monetary'; reference: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [remarksError, setRemarksError] = useState('');
  const [decisionError, setDecisionError] = useState('');
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
      setRemarksError('Please provide validation remarks.');
      return;
    }
    setRemarksError('');
    setDecisionError('');
    setIsSubmitting(true);
    try {
      const endpoint = type === 'monetary'
        ? `/internal-api/staff/verification/monetary/${reference}/status`
        : `/internal-api/staff/verification/${type}/${reference}`;
      
      let finalStatus = status;
      if (type === 'donor') finalStatus = status === 'approve' ? 'Verified' : 'Rejected';
      if (type === 'recipient') finalStatus = status === 'approve' ? 'Validated' : 'Rejected';
      if (type === 'monetary') finalStatus = status === 'approve' ? 'Completed' : 'Rejected';

      await apiClient.post(endpoint, {
        status: finalStatus,
        remarks: remarks
      });

      navigate(`/staff/verification/${type}`);
    } catch (err: any) {
      console.error('Decision failed', err);
      setDecisionError(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <PageLoader message="Loading verification details..." />;
  if (!record) return <PageLoader message="Loading verification details..." />;

  const isDonor = type === 'donor';
  const isMonetary = type === 'monetary';
  const title = isMonetary ? 'Monetary Donation' : isDonor ? 'Donation Verification' : 'Request Verification';

  return (
    <section className="section-wrap reveal active staff-page">
      <div className="section-title-block detail-title-block">
        <h1 className="detail-title">{title}</h1>
        <p className="detail-reference-text">Reference: <strong className="detail-reference-strong">{reference}</strong></p>
      </div>

      <article className="staff-block verification-detail-shell detail-shell">
        <div className="verification-grid detail-grid">
          <section>
            <div className="detail-section-head">
              <i className="bx bx-notepad detail-section-icon"></i>
              <h2 className="detail-section-title">Submission Summary</h2>
            </div>
            
            <div className="summary-card detail-summary-card">
              <ul className="verification-list detail-list">
                {isDonor ? (
                  <>
                    <li className="detail-list-item">
                      <i className="bx bx-user detail-list-icon"></i>
                      <span><strong>Donor:</strong> {record.user?.firstName} {record.user?.lastName}</span>
                    </li>
                    <li className="detail-list-item">
                      <i className="bx bx-cut detail-list-icon"></i>
                      <span><strong>Hair Length:</strong> {record.hairLength}</span>
                    </li>
                    <li className="detail-list-item">
                      <i className="bx bx-palette detail-list-icon"></i>
                      <span><strong>Hair Color:</strong> {record.hairColor}</span>
                    </li>
                    <li className="detail-list-item-start">
                      <i className="bx bx-message-square-detail detail-list-icon-start"></i>
                      <span><strong>Reason:</strong> <span className="detail-italic-text">"{record.reason || 'No reason provided'}"</span></span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="detail-list-item">
                      <i className="bx bx-user-voice detail-list-icon"></i>
                      <span><strong>Recipient:</strong> {record.user?.firstName} {record.user?.lastName}</span>
                    </li>
                    <li className="detail-list-item">
                      <i className="bx bx-phone detail-list-icon"></i>
                      <span><strong>Contact:</strong> {record.contactNumber || 'N/A'}</span>
                    </li>
                    <li className="detail-list-item">
                      <i className="bx bx-male-female detail-list-icon"></i>
                      <span><strong>Gender:</strong> {formatGender(record.gender)}</span>
                    </li>
                    <li className="detail-list-item">
                      <i className="bx bx-ruler detail-list-icon"></i>
                      <span><strong>Preferred Wig Size:</strong> <strong>{record.wigLength || 'N/A'}</strong></span>
                    </li>
                    <li className="detail-list-item">
                      <i className="bx bx-paint detail-list-icon"></i>
                      <span><strong>Preferred Color:</strong> <strong>{record.wigColor || 'N/A'}</strong></span>
                    </li>
                    <li className="detail-list-item">
                      <i className="bx bx-package detail-list-icon"></i>
                      <span>
                        <strong>Delivery Method:</strong>{' '}
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: record.deliveryMethod === 'pickup' ? '#fdf2f8' : '#f0fdf4',
                          color: record.deliveryMethod === 'pickup' ? '#ad246d' : '#16a34a',
                          border: `1px solid ${record.deliveryMethod === 'pickup' ? '#f9cde8' : '#bbf7d0'}`,
                          borderRadius: '20px',
                          padding: '2px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                        }}>
                          <i className={`bx ${record.deliveryMethod === 'pickup' ? 'bx-store' : 'bx-car'}`}></i>
                          {record.deliveryMethod === 'pickup' ? 'Pick-up at Binondo Office' : 'Delivery'}
                        </span>
                      </span>
                    </li>
                    <li className="detail-list-item-start">
                      <i className="bx bx-book-content detail-list-icon-start"></i>
                      <span><strong>Applicant's Story:</strong> <span className="detail-italic-text">"{record.story || 'No story provided'}"</span></span>
                    </li>
                  </>
                )}
                <li className="detail-list-date">
                  <i className='bx bx-calendar-check'></i>
                  <span><strong>Submitted:</strong> {new Date(record.createdAt).toLocaleString()}</span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <div className="detail-section-head">
              <i className="bx bx-paperclip detail-section-icon"></i>
              <h2 className="detail-section-title">Attached Files</h2>
            </div>
            
            <div className="file-preview-grid detail-file-preview-grid">
              {isMonetary ? (
                record.proofPath && (
                  <div className="file-preview-item detail-file-preview-item">
                    <a href={getPublicUrl('hairlink', record.proofPath) || '#'} target="_blank" rel="noreferrer" className="file-thumbnail detail-file-thumbnail">
                      <img src={getPublicUrl('hairlink', record.proofPath) || ''} alt="Proof" className="detail-file-img" />
                    </a>
                    <span className="detail-file-label">Proof of Payment</span>
                  </div>
                )
              ) : isDonor ? (
                <>
                  {record.photoFront && (
                    <div className="file-preview-item detail-file-preview-item">
                      <a href={getPublicUrl('hairlink', record.photoFront) || '#'} target="_blank" rel="noreferrer" className="file-thumbnail detail-file-thumbnail">
                        <img src={getPublicUrl('hairlink', record.photoFront) || ''} alt="Front" className="detail-file-img" />
                      </a>
                      <span className="detail-file-label">Reference Photo</span>
                    </div>
                  )}
                  {record.photoSide && (
                    <div className="file-preview-item detail-file-preview-item">
                      <a href={getPublicUrl('hairlink', record.photoSide) || '#'} target="_blank" rel="noreferrer" className="file-thumbnail detail-file-thumbnail">
                        <img src={getPublicUrl('hairlink', record.photoSide) || ''} alt="Side" className="detail-file-img" />
                      </a>
                      <span className="detail-file-label">Hair Side</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {record.medicalCertificate && (
                    <div className="file-preview-item detail-file-preview-item-small">
                      <a href={getPublicUrl('hairlink', record.medicalCertificate) || '#'} target="_blank" rel="noreferrer" className="file-thumbnail detail-file-thumbnail-small">
                        <img src={getPublicUrl('hairlink', record.medicalCertificate) || ''} alt="Medical Cert" className="detail-file-img" />
                      </a>
                      <span className="detail-file-label-small">Medical Cert</span>
                    </div>
                  )}
                  {record.diagnosisPhoto && (
                    <div className="file-preview-item detail-file-preview-item-small">
                      <a href={getPublicUrl('hairlink', record.diagnosisPhoto) || '#'} target="_blank" rel="noreferrer" className="file-thumbnail detail-file-thumbnail-small">
                        <img src={getPublicUrl('hairlink', record.diagnosisPhoto) || ''} alt="Diagnosis" className="detail-file-img" />
                      </a>
                      <span className="detail-file-label-small">Diagnosis</span>
                    </div>
                  )}
                  {record.recipientPhoto && (
                    <div className="file-preview-item detail-file-preview-item-small">
                      <a href={getPublicUrl('hairlink', record.recipientPhoto) || '#'} target="_blank" rel="noreferrer" className="file-thumbnail detail-file-thumbnail-small">
                        <img src={getPublicUrl('hairlink', record.recipientPhoto) || ''} alt="Recipient" className="detail-file-img" />
                      </a>
                      <span className="detail-file-label-small">Recipient</span>
                    </div>
                  )}
                  {record.additionalPhoto && (
                    <div className="file-preview-item detail-file-preview-item-small">
                      <a href={getPublicUrl('hairlink', record.additionalPhoto) || '#'} target="_blank" rel="noreferrer" className="file-thumbnail detail-file-thumbnail-small">
                        <img src={getPublicUrl('hairlink', record.additionalPhoto) || ''} alt="Reference" className="detail-file-img" />
                      </a>
                      <span className="detail-file-label-small">Reference Picture</span>
                    </div>
                  )}
                  {record.documents?.map((path: string, i: number) => (
                    <div key={i} className="file-preview-item detail-file-preview-item-small">
                      <a href={getPublicUrl('hairlink', path) || '#'} target="_blank" rel="noreferrer" className="file-thumbnail detail-file-thumbnail-small">
                        {path.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) ? (
                          <img src={getPublicUrl('hairlink', path) || ''} className="detail-file-img" alt={`Doc ${i+1}`} />
                        ) : (
                          <div className="detail-doc-icon-wrapper"><i className="bx bxs-file-blank detail-section-icon"></i></div>
                        )}
                      </a>
                      <span className="detail-file-label-small">Document {i+1}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>
        </div>
      </article>

      <article className="staff-block detail-decision-block">
        <div className="detail-decision-head">
          <i className="bx bx-check-shield detail-section-icon"></i>
          <h2 className="detail-section-title">Verification Decision</h2>
        </div>
        
        <div className="verification-form">
          <div className="form-group detail-form-group">
            <label className="detail-form-label">Validation Remarks <span className="required">*</span></label>
            <textarea 
              rows={3} 
              placeholder="Explain the rationale for this decision..." 
              value={remarks}
              onChange={e => { setRemarks(e.target.value); if (e.target.value) setRemarksError(''); }}
              className="detail-form-textarea"
              style={remarksError ? { borderColor: '#e03c3c' } : {}}
            ></textarea>
            {remarksError && (
              <p style={{ color: '#e03c3c', fontSize: '0.8rem', marginTop: '4px' }}>
                <i className='bx bx-error-circle' style={{ marginRight: 4 }}></i>{remarksError}
              </p>
            )}
            {decisionError && (
              <p style={{ color: '#e03c3c', fontSize: '0.8rem', marginTop: '4px' }}>
                <i className='bx bx-error-circle' style={{ marginRight: 4 }}></i>{decisionError}
              </p>
            )}
          </div>

          <div className="form-actions detail-form-actions">
            <button 
              type="button" 
              className="soft-btn detail-btn detail-btn-approve" 
              disabled={isSubmitting}
              onClick={() => { setPendingDecision('approve'); setShowConfirm(true); }}
            >
              {isSubmitting ? 'Processing...' : isMonetary ? 'Confirm Donation' : 'Approve Submission'}
            </button>
            <button 
              type="button" 
              className="ghost-btn detail-btn detail-btn-reject" 
              disabled={isSubmitting}
              onClick={() => { setPendingDecision('reject'); setShowConfirm(true); }}
            >
              Reject Submission
            </button>
            <Link 
              to={`/staff/verification/${type}`} 
              className="detail-btn detail-btn-return"
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
        title={isMonetary ? "Confirm Donation" : "Approve Submission"}
        message={isMonetary ? "Are you sure you want to confirm this monetary donation? This will update the status to Completed." : "Are you sure you want to approve this submission? This will update the applicant's status."}
        confirmText={isMonetary ? "Yes, Confirm" : "Yes, Approve"}
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
