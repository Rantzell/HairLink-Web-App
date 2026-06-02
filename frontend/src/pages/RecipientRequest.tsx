import toast from 'react-hot-toast';
import React, { useState, useRef } from 'react';
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
    deliveryMethod: 'delivery' as 'delivery' | 'pickup',
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
      if (validFiles.length < files.length) toast.error('Some files were too large and were skipped.');
      setDocuments(prev => [...prev, ...validFiles]);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Photo is too large. Max 10MB.');
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
    if (!formData.story || !formData.wigLength || !formData.wigColor || !formData.deliveryMethod || documents.length === 0 || !additionalPhoto) {
      toast.error('Please fill all required fields and upload the necessary documents.');
      return;
    }
    setShowConfirm(true);
  };

  const doSubmit = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    try {
      const data = new FormData();
      const currentYear = new Date().getFullYear();
      const randomId = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const reference = `WR-${currentYear}-${randomId}`;
      
      data.append('reference', reference);
      data.append('contact_number', user?.phone || '');
      data.append('gender', user?.gender || '');
      data.append('story', formData.story);
      data.append('wig_length', formData.wigLength);
      data.append('wig_color', formData.wigColor);
      data.append('delivery_method', formData.deliveryMethod);
      data.append('appointment_at', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString());

      documents.forEach(doc => {
        data.append('documents', doc);
      });
      data.append('additional_photo', additionalPhoto!);

      const res = await apiClient.post('/internal-api/requests', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const actualReference = res.data.reference || reference;
      navigate(`/recipient/tracking/${actualReference}`);
    } catch (err: any) {
      console.error('Request submission failed', err);
      toast.error(err.response?.data?.message || 'Failed to submit request.');
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
              <span>Full Name <span>*</span></span>
              <input type="text" value={user?.firstName ? `${user.firstName} ${user.lastName}` : (user?.name || '')} readOnly className="field-readonly" />
            </label>
            <label>
              <span>Contact Number <span>*</span></span>
              <input type="tel" value={user?.phone || ''} readOnly className="field-readonly" />
            </label>
            <label>
              <span>Gender <span>*</span></span>
              <select value={user?.gender || ''} disabled className="field-readonly">
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="nonbinary">Non-binary</option>
                <option value="prefer_not_say">Prefer not to say</option>
              </select>
            </label>
            <label>
              <span>Email Address <span>*</span></span>
              <input type="email" value={user?.email || ''} readOnly className="field-readonly" />
            </label>
          </div>

          <div className="form-head">
            <h2>Your Journey</h2>
            <i className='bx bxs-book-heart'></i>
          </div>

          <div className="form-grid">
            <label>
              <span>Please share with us your story/journey <span>*</span></span>
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
                className={`upload-box-mini ${documents.length > 0 ? 'has-content' : ''}`}
                onClick={() => docsInputRef.current?.click()}
              >
                <input ref={docsInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" hidden onChange={handleDocsChange} />
                <div className="upload-mini-content">
                  <i className='bx bx-file-blank'></i>
                  <span>{documents.length > 0 ? `${documents.length} files added` : 'Upload medical files'}</span>
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
                className={`upload-box-mini ${additionalPhoto ? 'has-content' : ''}`}
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
              <span>Preferred Wig Length <span>*</span></span>
              <select value={formData.wigLength} onChange={e => setFormData({...formData, wigLength: e.target.value})} required>
                <option value="">Select Wig Length</option>
                <option value="short">Short (10-14 inches)</option>
                <option value="long">Long (More than 15 inches)</option>
              </select>
            </label>
            <label>
              <span>Preferred Hair Color <span>*</span></span>
              <select value={formData.wigColor} onChange={e => setFormData({...formData, wigColor: e.target.value})} required>
                <option value="">Select Hair Color</option>
                <option value="black">Black</option>
                <option value="brown">Brown</option>
                <option value="light">Light</option>
              </select>
            </label>
          </div>

          <div className="form-head">
            <h2>Delivery Method</h2>
            <i className='bx bx-package'></i>
          </div>

          <div className="form-grid">
            <div className="delivery-method-group">
              <p className="delivery-method-hint">How would you like to receive your wig? <span>*</span></p>
              <div className="delivery-method-options">
                <label className={`delivery-method-option ${formData.deliveryMethod === 'delivery' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="delivery"
                    checked={formData.deliveryMethod === 'delivery'}
                    onChange={() => setFormData({...formData, deliveryMethod: 'delivery'})}
                  />
                  <div className="delivery-method-card">
                    <i className='bx bx-car'></i>
                    <strong>Delivery</strong>
                    <span>We will deliver the wig to your address.</span>
                  </div>
                </label>
                <label className={`delivery-method-option ${formData.deliveryMethod === 'pickup' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="pickup"
                    checked={formData.deliveryMethod === 'pickup'}
                    onChange={() => setFormData({...formData, deliveryMethod: 'pickup'})}
                  />
                  <div className="delivery-method-card">
                    <i className='bx bx-store'></i>
                    <strong>Pick-up at Binondo Office</strong>
                    <span>Collect your wig in person at our Binondo office.</span>
                  </div>
                </label>
              </div>
            </div>
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
