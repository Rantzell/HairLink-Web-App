import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.story || !formData.wigLength || !formData.wigColor || documents.length === 0 || !additionalPhoto) {
      alert('Please fill all required fields and upload the necessary documents.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      const reference = `REQ-${Math.random().toString(36).substr(2, 5).toUpperCase()}-${Date.now().toString().slice(-6)}`;
      
      data.append('reference', reference);
      data.append('contact_number', user?.phone || '');
      data.append('gender', user?.gender || '');
      data.append('story', formData.story);
      data.append('wig_length', formData.wigLength);
      data.append('wig_color', formData.wigColor);
      data.append('appointment_at', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString());

      documents.forEach(doc => {
        data.append('documents[]', doc);
      });
      data.append('additional_photo', additionalPhoto);

      await apiClient.post('/internal-api/requests', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      navigate(`/recipient/tracking/${reference}`);
    } catch (err: any) {
      console.error('Request submission failed', err);
      alert(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="section-wrap recipient-request-page reveal active">
      <div className="section-title-block center">
        <h1>Request Hair</h1>
        <p>Let's boost your confidence. Request hair to support your journey of comfort and self-expression.</p>
      </div>

      <div className="request-guidelines">
        <div className="guidelines-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#ad246d' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg>
          <h3 style={{ margin: 0 }}>Request Guidelines</h3>
        </div>
        <div className="guidelines-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <h4 style={{ color: '#3b2e43', marginBottom: '0.5rem' }}>Prepare the following:</h4>
            <ul style={{ color: '#5d4d62' }}>
              <li>Your story/journey</li>
              <li>Related documents</li>
              <li>Any photo of yourself</li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#3b2e43', marginBottom: '0.5rem' }}>Important:</h4>
            <ul style={{ color: '#5d4d62' }}>
              <li>Wait for us to coordinate details</li>
              <li>Fill up the wig request form</li>
            </ul>
          </div>
        </div>
      </div>

      <form className="request-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #ead7e8', paddingBottom: '0.75rem' }}>
            <i className='bx bx-user-circle' style={{ fontSize: '1.5rem', color: '#ad246d' }}></i>
            <h3 style={{ margin: 0 }}>Request Details</h3>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Full Name <span className="required">*</span></label>
              <input type="text" value={user?.firstName ? `${user.firstName} ${user.lastName}` : (user?.name || '')} readOnly style={{ background: '#f5f3f7', cursor: 'not-allowed' }} />
            </div>
            <div className="form-group">
              <label>Contact Number <span className="required">*</span></label>
              <input type="tel" value={user?.phone || ''} readOnly style={{ background: '#f5f3f7', cursor: 'not-allowed' }} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Gender <span className="required">*</span></label>
              <select value={user?.gender || ''} readOnly style={{ background: '#f5f3f7', cursor: 'not-allowed' }}>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="nonbinary">Non-binary</option>
                <option value="prefer_not_say">Prefer not to say</option>
              </select>
            </div>
            <div className="form-group">
              <label>Email Address <span className="required">*</span></label>
              <input type="email" value={user?.email || ''} readOnly style={{ background: '#f5f3f7', cursor: 'not-allowed' }} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #ead7e8', paddingBottom: '0.75rem' }}>
            <i className='bx bx-book-heart' style={{ fontSize: '1.5rem', color: '#ad246d' }}></i>
            <h3 style={{ margin: 0 }}>Your Journey</h3>
          </div>

          <div className="form-group">
            <label>Please share with us your story/journey <span className="required">*</span></label>
            <textarea 
              placeholder="Tell us your story..." 
              value={formData.story} 
              onChange={e => setFormData({...formData, story: e.target.value})}
              required
            ></textarea>
          </div>

          <div className="form-group">
            <label>Upload supporting document/s here <span className="required">*</span></label>
            <div className="file-upload">
              <input ref={docsInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" hidden onChange={handleDocsChange} />
              <button type="button" className="file-label" onClick={() => docsInputRef.current?.click()}>
                <i className='bx bx-upload'></i> Add Files
              </button>
              <div className="file-list">
                {documents.map((doc, i) => (
                  <div key={i} className="file-item">
                    <span>{doc.name} ({(doc.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <button type="button" onClick={() => removeDoc(i)}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Additional Picture for reference <span className="required">*</span></label>
            <div className="file-upload">
              <input ref={photoInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp" hidden onChange={handlePhotoChange} />
              <button type="button" className="file-label" onClick={() => photoInputRef.current?.click()}>
                <i className='bx bx-image-add'></i> Add Photo
              </button>
              {additionalPhoto && (
                <div className="file-list">
                  <div className="file-item">
                    <span>{additionalPhoto.name} ({(additionalPhoto.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <button type="button" onClick={() => setAdditionalPhoto(null)}>Remove</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #ead7e8', paddingBottom: '0.75rem' }}>
            <i className='bx bx-palette' style={{ fontSize: '1.5rem', color: '#ad246d' }}></i>
            <h3 style={{ margin: 0 }}>Wig Preferences</h3>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Preferred Wig Length <span className="required">*</span></label>
              <select value={formData.wigLength} onChange={e => setFormData({...formData, wigLength: e.target.value})} required>
                <option value="">Select Wig Length</option>
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </div>
            <div className="form-group">
              <label>Preferred Hair Color <span className="required">*</span></label>
              <select value={formData.wigColor} onChange={e => setFormData({...formData, wigColor: e.target.value})} required>
                <option value="">Select Hair Color</option>
                <option value="black">Black</option>
                <option value="dark-brown">Dark Brown</option>
                <option value="light-brown">Light Brown</option>
                <option value="blonde">Blonde</option>
                <option value="auburn">Auburn / Red</option>
                <option value="gray">Gray / White</option>
                <option value="no-preference">No Preference</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button type="submit" className="soft-btn" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit Request'}</button>
          <Link to="/recipient/dashboard" className="ghost-btn">Cancel</Link>
        </div>
      </form>
    </div>
  );
};

export default RecipientRequest;
