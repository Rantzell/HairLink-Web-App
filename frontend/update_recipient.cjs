const fs = require('fs');
const path = require('path');

const pagesDir = 'c:/Users/ACER/OneDrive - Far Eastern University/Desktop/HairLink-Web-App-1/frontend/src/pages';

// ─────────────── RecipientRequest.tsx ───────────────
const recipientRequestContent = `import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/RecipientRequest.css';

const RecipientRequest: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    story: '',
    wigLength: '',
    wigColor: '',
  });
  
  const [documents, setDocuments] = useState<File[]>([]);
  const [additionalPhoto, setAdditionalPhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const docsInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleDocsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024);
      if (validFiles.length < files.length) alert('Some files were too large and were skipped.');
      setDocuments(prev => [...prev, ...validFiles]);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert('Photo is too large. Max 10MB.');
        return;
      }
      setAdditionalPhoto(file);
    }
  };

  const removeDoc = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.story || !formData.wigLength || !formData.wigColor || documents.length === 0 || !additionalPhoto) {
      alert('Please fill all required fields and upload the necessary documents.');
      return;
    }
    setShowConfirm(true);
  };

  const doSubmit = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    try {
      const data = new FormData();
      const reference = \`REQ-\${Math.random().toString(36).substr(2, 5).toUpperCase()}-\${Date.now().toString().slice(-6)}\`;
      
      data.append('reference', reference);
      data.append('contact_number', user?.phone || '');
      data.append('gender', user?.gender || '');
      data.append('story', formData.story);
      data.append('wig_length', formData.wigLength);
      data.append('wig_color', formData.wigColor);
      data.append('appointment_at', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString());

      documents.forEach(doc => {
        data.append('documents', doc);
      });
      data.append('additional_photo', additionalPhoto!);

      await apiClient.post('/internal-api/requests', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      navigate(\`/recipient/tracking/\${reference}\`);
    } catch (err: any) {
      console.error('Request submission failed', err);
      alert(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section-wrap donate-page reveal active">
      <div className="section-title-block center">
        <h1>Request Hair</h1>
        <p>Let's boost your confidence. Request hair to support your journey of comfort and self-expression.</p>
      </div>

      <article className="guidelines-box">
        <h2><i className='bx bxs-info-circle'></i> Request Guidelines</h2>
        <ul>
          <li>Gather your medical documents (if applicable).</li>
          <li>Prepare your hair loss story and journey.</li>
          <li>Prepare photos of yourself for reference.</li>
          <li>Be ready to fill up the request form.</li>
        </ul>
      </article>

      <article className="form-shell">
        <form onSubmit={handleSubmit}>
          <div className="form-head">
            <h2>Request Details</h2>
            <i className='bx bxs-user-circle'></i>
          </div>

          <div className="form-grid two-col">
            <label>
              Full Name <span>*</span>
              <input type="text" value={user?.firstName ? \`\${user.firstName} \${user.lastName}\` : (user?.name || '')} readOnly className="field-readonly" />
            </label>
            <label>
              Contact Number <span>*</span>
              <input type="tel" value={user?.phone || ''} readOnly className="field-readonly" />
            </label>
            <label>
              Gender <span>*</span>
              <select value={user?.gender || ''} disabled className="field-readonly">
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="nonbinary">Non-binary</option>
                <option value="prefer_not_say">Prefer not to say</option>
              </select>
            </label>
            <label>
              Email Address <span>*</span>
              <input type="email" value={user?.email || ''} readOnly className="field-readonly" />
            </label>
          </div>

          <div className="form-head">
            <h2>Your Journey</h2>
            <i className='bx bxs-book-heart'></i>
          </div>

          <div className="form-grid">
            <label>
              Please share with us your story/journey <span>*</span>
              <textarea 
                placeholder="Tell us your story..." 
                rows={5}
                value={formData.story} 
                onChange={e => setFormData({...formData, story: e.target.value})}
                required
              ></textarea>
            </label>
          </div>

          <div className="form-grid two-col upload-grid-gap">
            {/* Ultra-Compact Multi-File Upload */}
            <div className="upload-section-mini">
              <label className="upload-label-main">Supporting Documents <span>*</span></label>
              <div 
                className={\`upload-box-mini \${documents.length > 0 ? 'has-content' : ''}\`}
                onClick={() => docsInputRef.current?.click()}
              >
                <input ref={docsInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" hidden onChange={handleDocsChange} />
                <div className="upload-mini-content">
                  <i className='bx bx-file-blank'></i>
                  <span>{documents.length > 0 ? \`\${documents.length} files added\` : 'Upload medical files'}</span>
                  <button type="button" className="mini-add-btn"><i className='bx bx-plus'></i></button>
                </div>
              </div>
              <div className="mini-file-list">
                {documents.map((doc, i) => (
                  <div key={i} className="mini-file-tag">
                    <span title={doc.name}>{doc.name}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeDoc(i); }}>×</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Ultra-Compact Single Photo Upload */}
            <div className="upload-section-mini">
              <label className="upload-label-main">Reference Picture <span>*</span></label>
              <div 
                className={\`upload-box-mini \${additionalPhoto ? 'has-content' : ''}\`}
                onClick={() => photoInputRef.current?.click()}
              >
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handlePhotoChange} />
                {!additionalPhoto ? (
                  <div className="upload-mini-content">
                    <i className='bx bx-image-add'></i>
                    <span>Upload reference photo</span>
                    <button type="button" className="mini-add-btn"><i className='bx bx-plus'></i></button>
                  </div>
                ) : (
                  <div className="upload-mini-success" onClick={e => e.stopPropagation()}>
                    <div className="mini-preview">
                      <img src={URL.createObjectURL(additionalPhoto)} alt="Preview" />
                    </div>
                    <div className="mini-details">
                      <strong>{additionalPhoto.name}</strong>
                      <button type="button" onClick={() => setAdditionalPhoto(null)}>Change</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-head">
            <h2>Wig Preferences</h2>
            <i className='bx bxs-palette'></i>
          </div>

          <div className="form-grid two-col">
            <label>
              Preferred Wig Length <span>*</span>
              <select value={formData.wigLength} onChange={e => setFormData({...formData, wigLength: e.target.value})} required>
                <option value="">Select Wig Length</option>
                <option value="short">Short (10-14 inches)</option>
                <option value="long">Long (More than 15)</option>
              </select>
            </label>
            <label>
              Preferred Hair Color <span>*</span>
              <select value={formData.wigColor} onChange={e => setFormData({...formData, wigColor: e.target.value})} required>
                <option value="">Select Hair Color</option>
                <option value="black">Black</option>
                <option value="brown">Brown</option>
                <option value="light">Light</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <div className="submit-wrap">
            <button className="soft-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </article>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={doSubmit}
        title="Submit Wig Request"
        message="Are you sure you want to submit your wig request? Please ensure all your information and documents are correct."
        confirmText="Yes, Submit Request"
        isConfirming={isSubmitting}
      />
    </section>
  );
};

export default RecipientRequest;
`;

// ─────────────── RecipientMonetary.tsx ───────────────
const recipientMonetaryContent = `import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/RecipientMonetary.css';

const RecipientMonetary: React.FC = () => {
  const { user: _user } = useAuth();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({ approved: 0, pending: 0 });

  const fetchHistory = async () => {
    try {
      const res = await apiClient.get('/internal-api/recipient/monetary');
      setRequests(res.data.history || []);
      setStats({
        approved: res.data.approved_aid || 0,
        pending: res.data.pending_aid || 0
      });
    } catch (err) {
      console.error('Failed to fetch monetary aid history', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !reason) return;
    setShowConfirm(true);
  };

  const doSubmit = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    try {
      await apiClient.post('/internal-api/recipient/monetary', { amount, reason });
      alert('Your request for financial assistance has been submitted. Our team will review it shortly.');
      setAmount('');
      setReason('');
      fetchHistory();
    } catch (err) {
      console.error('Submission failed', err);
      alert('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section-wrap reveal active donor-module-page">
      <div className="module-head">
        <h1>Financial Assistance</h1>
        <p>Apply for medical or logistics aid to support your journey with HairLink.</p>
      </div>

      <div className="summary-grid">
        <div className="module-card">
          <div className="summary-item">
            <small>Approved Aid</small>
            <strong>₱{stats.approved.toLocaleString()}</strong>
          </div>
        </div>
        <div className="module-card">
          <div className="summary-item">
            <small>Pending Aid</small>
            <strong>₱{stats.pending.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      <div className="recipient-monetary-layout">
        <div className="module-card">
          <h3 className="module-card-title">Request Assistance</h3>
          <form onSubmit={handleSubmit} className="monetary-form">
            <div className="form-group">
              <label>Requested Amount (PHP)</label>
              <input 
                type="number" 
                placeholder="Enter amount needed" 
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                className="monetary-form-input"
              />
            </div>

            <div className="form-group">
              <label>Reason for Assistance</label>
              <textarea 
                placeholder="Briefly explain how this aid will help you (e.g., Hospital transportation, Medical fees)" 
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                rows={4}
                className="monetary-form-textarea"
              ></textarea>
            </div>

            <button type="submit" className="soft-btn monetary-submit-btn" disabled={isSubmitting || !amount || !reason}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>

        <div className="module-card sidebar-help">
          <h3 className="module-card-title-sm">Aid Guidelines</h3>
          <ul className="guidelines-list">
            <li>Assistance is subject to available community funds.</li>
            <li>Priority is given to transport and logistical needs for wig fitting.</li>
            <li>Approval typically takes 3-5 business days.</li>
          </ul>
          <div className="guidelines-note">
            <p>
              <i className='bx bxs-info-circle'></i> Ensure your profile is fully verified before applying.
            </p>
          </div>
        </div>
      </div>

      <div className="module-card module-card-mt">
        <h3 className="module-card-title">Aid History</h3>
        <div className="table-wrap">
          <table className="monetary-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Amount</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r: any) => (
                <tr key={r.id}>
                  <td>#{r.reference}</td>
                  <td>₱{r.amount.toLocaleString()}</td>
                  <td>{r.reason.substring(0, 40)}...</td>
                  <td>
                    <span className={\`status-pill status-\${r.status.toLowerCase()}\`}>{r.status}</span>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={4} className="monetary-table-empty">No aid requests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={doSubmit}
        title="Submit Aid Request"
        message={\`You are requesting ₱\${Number(amount).toLocaleString()} in financial assistance. Our team will review your request. Proceed?\`}
        confirmText="Yes, Submit Request"
        isConfirming={isSubmitting}
      />
    </section>
  );
};

export default RecipientMonetary;
`;

// ─────────────── RecipientTracking.tsx ───────────────
const recipientTrackingContent = `import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';
import type { HairRequest } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/RecipientTracking.css';

const RecipientTracking: React.FC = () => {
  const [requests, setRequests] = useState<HairRequest[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await apiClient.get('/internal-api/requests');
        setRequests(res.data);
      } catch (err) {
        console.error('Failed to fetch requests', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const filteredRequests = requests.filter(r =>
    r.reference.toLowerCase().includes(filter.toLowerCase()) ||
    r.status.toLowerCase().includes(filter.toLowerCase()) ||
    (r.user?.firstName + ' ' + r.user?.lastName).toLowerCase().includes(filter.toLowerCase())
  );

  const doConfirmReceived = async () => {
    if (!pendingRef) return;
    setShowConfirm(false);
    setIsConfirming(true);
    try {
      await apiClient.post(\`/internal-api/requests/\${pendingRef}/confirm-received\`);
      window.location.reload();
    } catch {
      alert('Failed to confirm receipt.');
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
          <input 
            type="text" 
            placeholder="Search reference, status..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="tracking-search-input"
          />
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
              ) : filteredRequests.length > 0 ? (
                filteredRequests.map(r => (
                  <tr key={r.id}>
                    <td className="tracking-td-text"><strong>{r.reference}</strong></td>
                    <td className="tracking-td-text">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td><StatusPill status={r.status} /></td>
                    <td className="tracking-td-text">{r.wigLength}</td>
                    <td className="tracking-td-text">{r.wigColor}</td>
                    <td className="tracking-td-center">
                      <div className="tracking-actions-cell">
                        <Link to={\`/recipient/tracking/\${r.reference}\`} className="tracking-details-btn">
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
`;

// ─────────────── RecipientTrackingDetail.tsx ───────────────
const recipientTrackingDetailContent = `import React, { useState, useEffect } from 'react';
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
        const res = await apiClient.get(\`/internal-api/requests/\${reference}\`);
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
      await apiClient.post(\`/internal-api/requests/\${requestData?.reference}/confirm-received\`);
      window.location.reload();
    } catch {
      alert('Failed to confirm receipt.');
    } finally {
      setIsConfirming(false);
    }
  };

  if (loading) return <div className="section-wrap">Loading...</div>;
  if (!requestData) return <div className="section-wrap">Request not found.</div>;

  const fullName = requestData.user ? \`\${requestData.user.firstName} \${requestData.user.lastName}\` : 'Recipient';

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
                  {history.notes || \`Status changed to \${history.status}\`}
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
`;

fs.writeFileSync(path.join(pagesDir, 'RecipientRequest.tsx'), recipientRequestContent);
fs.writeFileSync(path.join(pagesDir, 'RecipientMonetary.tsx'), recipientMonetaryContent);
fs.writeFileSync(path.join(pagesDir, 'RecipientTracking.tsx'), recipientTrackingContent);
fs.writeFileSync(path.join(pagesDir, 'RecipientTrackingDetail.tsx'), recipientTrackingDetailContent);

console.log('All 4 Recipient TSX files updated successfully.');
