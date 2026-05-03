import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';

const DonorDonate: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    hairLength: '',
    hairColor: '',
    treatedHair: false,
    address: '',
    reason: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('File is too large. Please upload an image up to 10MB.');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hairLength || !formData.hairColor || !formData.address || !formData.reason || !file) {
      alert('Please fill in all required fields and upload a photo.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      const reference = `HD-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
      
      data.append('reference', reference);
      data.append('hair_length', formData.hairLength);
      data.append('hair_color', formData.hairColor);
      data.append('treated_hair', formData.treatedHair ? '1' : '0');
      data.append('address', formData.address);
      data.append('reason', formData.reason);
      data.append('dropoff_location', 'Manila Downtown YMCA, 945 Sabino Padilla St, Binondo, Manila');
      
      const apptAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      data.append('appointment_at', apptAt);
      
      data.append('photo_front', file);

      await apiClient.post('/internal-api/donations', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      navigate(`/donor/tracking/${reference}`);
    } catch (err: any) {
      const data = err.response?.data;
      const errorMsg = (data?.error ? `${data.error}: ` : '') + (data?.message || 'Failed to submit donation. Please try again.');
      alert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section-wrap donate-page reveal active">
      <div className="section-title-block center">
        <h1>Donate Hair</h1>
        <p>Your donation helps create wigs for people with medical hair loss.</p>
      </div>

      <article className="guidelines-box">
        <h2><i className='bx bxs-ribbon'></i> Donation Guidelines</h2>
        <ul>
          <li>Hair must be at least 10 inches long.</li>
          <li>Hair should be tied, sealed, and placed in a labeled non-plastic container.</li>
          <li>Colored hair is accepted.</li>
          <li>Hair must be clean and untangled.</li>
        </ul>
      </article>

      <article className="form-shell">
        <form onSubmit={handleSubmit}>
          <div className="form-head">
            <h2>Donation Details</h2>
            <i className='bx bxs-heart-circle'></i>
          </div>

          <div className="form-grid two-col">
            <label>
              Full Name <span>*</span>
              <input 
                type="text" 
                value={user?.firstName ? `${user.firstName} ${user.lastName}` : (user?.name || '')} 
                readOnly 
                style={{ background: '#f5f3f7', cursor: 'not-allowed' }} 
              />
            </label>
            <label>
              Email <span>*</span>
              <input 
                type="email" 
                value={user?.email || ''} 
                readOnly 
                style={{ background: '#f5f3f7', cursor: 'not-allowed' }} 
              />
            </label>
            <label>
              Phone Number <span>*</span>
              <input 
                type="tel" 
                value={user?.phone || ''} 
                readOnly 
                style={{ background: '#f5f3f7', cursor: 'not-allowed' }} 
              />
            </label>
            <label>
              Hair Length <span>*</span>
              <select 
                value={formData.hairLength} 
                onChange={e => setFormData({...formData, hairLength: e.target.value})}
                required
              >
                <option value="" disabled>Select hair length</option>
                <option>10 to 14 inches</option>
                <option>15 to 20 inches</option>
                <option>More than 20 inches</option>
              </select>
            </label>
            <label>
              Natural Hair Color <span>*</span>
              <select 
                value={formData.hairColor} 
                onChange={e => setFormData({...formData, hairColor: e.target.value})}
                required
              >
                <option value="" disabled>Select hair color</option>
                <option>Black</option>
                <option>Brown</option>
                <option>Light</option>
                <option>Other</option>
              </select>
            </label>
            <label className="checkbox-wrap">
              <input 
                type="checkbox" 
                checked={formData.treatedHair}
                onChange={e => setFormData({...formData, treatedHair: e.target.checked})}
              />
              <span>My hair has been chemically treated.</span>
            </label>
          </div>

          <div className="form-grid two-col">
            <label>
              Shipping Address <span>*</span>
              <textarea 
                rows={4} 
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                required
              ></textarea>
            </label>
            <label>
              Why are you donating? <span>*</span>
              <textarea 
                rows={4} 
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
                required
              ></textarea>
            </label>
          </div>

          <div className="upload-section-premium">
            <label className="upload-label-main">Upload a clear picture of the hair (max 10MB) <span>*</span></label>
            <div 
              className={`upload-box-premium ${file ? 'file-active' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('on-drag'); }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('on-drag'); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('on-drag');
                const droppedFile = e.dataTransfer.files?.[0];
                if (droppedFile) {
                  if (droppedFile.size > 10 * 1024 * 1024) {
                    alert('File is too large. Please upload an image up to 10MB.');
                    return;
                  }
                  setFile(droppedFile);
                }
              }}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                hidden 
                onChange={handleFileChange}
              />
              
              {!file ? (
                <div className="upload-init-state">
                  <div className="icon-sphere">
                    <i className='bx bx-camera'></i>
                  </div>
                  <div className="upload-instructions">
                    <h3>Click to upload photo</h3>
                    <p>or drag and drop your image here</p>
                    <span className="file-types">Supported: PNG, JPG, JPEG</span>
                  </div>
                </div>
              ) : (
                <div className="upload-success-state" onClick={e => e.stopPropagation()}>
                  <div className="preview-bubble">
                    <img src={URL.createObjectURL(file)} alt="Hair Preview" />
                  </div>
                  <div className="success-details">
                    <div className="file-main-info">
                      <strong>{file.name}</strong>
                      <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                    <button 
                      type="button" 
                      className="change-file-btn"
                      onClick={() => setFile(null)}
                    >
                      <i className='bx bx-refresh'></i> Change Photo
                    </button>
                  </div>
                  <div className="success-mark">
                    <i className='bx bxs-check-circle'></i>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="delivery-note">
            <h3>Delivery Details</h3>
            <p>Address: Manila Downtown YMCA, 945 Sabino Padilla St, Binondo, Manila</p>
            <p>Receiving Time: Monday to Sunday, 9:00 AM to 7:00 PM</p>
            <p>Contact: Venus May Alinsod | 0917-847-4270</p>
          </div>

          <div className="submit-wrap">
            <button className="soft-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Donation'}
            </button>
          </div>
        </form>
      </article>
    </section>
  );
};

export default DonorDonate;
