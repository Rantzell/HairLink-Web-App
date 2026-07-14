import toast from 'react-hot-toast';
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import ConfirmModal from '../components/ConfirmModal';

const DROPOFF_LOCATION = 'Manila Downtown YMCA, 945 Sabino Padilla St, Binondo, Manila';

type TabKey = 'hair' | 'bundle';

interface Bundle {
  id: number;
  hairLength: string;
  hairColor: string;
  treatedHair: boolean;
  file: File | null;
}

const emptyBundle = (): Bundle => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  hairLength: '',
  hairColor: '',
  treatedHair: false,
  file: null,
});

const isValidSize = (f: File) => {
  if (f.size > 10 * 1024 * 1024) {
    toast.error('File is too large. Please upload an image up to 10MB.');
    return false;
  }
  return true;
};

// Hoisted to module scope so it is not remounted on every parent render.
const UploadBox: React.FC<{
  value: File | null;
  onSelect: (f: File) => void;
  onClear: () => void;
  inputId: string;
}> = ({ value, onSelect, onClear, inputId }) => {
  const localRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className={`upload-box-premium ${value ? 'file-active' : ''}`}
      onClick={() => localRef.current?.click()}
      onDragOver={e => {
        e.preventDefault();
        e.currentTarget.classList.add('on-drag');
      }}
      onDragLeave={e => {
        e.preventDefault();
        e.currentTarget.classList.remove('on-drag');
      }}
      onDrop={e => {
        e.preventDefault();
        e.currentTarget.classList.remove('on-drag');
        const dropped = e.dataTransfer.files?.[0];
        if (dropped && isValidSize(dropped)) onSelect(dropped);
      }}
    >
      <input
        id={inputId}
        ref={localRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={e => {
          const f = e.target.files?.[0];
          if (f && isValidSize(f)) onSelect(f);
        }}
      />
      {!value ? (
        <div className="upload-init-state">
          <div className="icon-sphere">
            <i className="bx bx-camera"></i>
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
            <img src={URL.createObjectURL(value)} alt="Hair Preview" />
          </div>
          <div className="success-details">
            <div className="file-main-info">
              <strong>{value.name}</strong>
              <span>{(value.size / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
            <button type="button" className="change-file-btn" onClick={onClear}>
              <i className="bx bx-refresh"></i> Change Photo
            </button>
          </div>
          <div className="success-mark">
            <i className="bx bxs-check-circle"></i>
          </div>
        </div>
      )}
    </div>
  );
};

const DonorDonate: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('hair');

  // ---- Hair Donation (single) ----
  const [formData, setFormData] = useState({
    hairLength: '',
    hairColor: '',
    treatedHair: false,
    address: '',
    reason: '',
  });
  const [file, setFile] = useState<File | null>(null);

  // ---- Certificate names (shared, used to generate certificate names) ----
  const [certNames, setCertNames] = useState<string[]>(['']);

  // ---- Bundle Donation (optional alternative path) ----
  const [bundles, setBundles] = useState<Bundle[]>([emptyBundle()]);
  const [bundleAddress, setBundleAddress] = useState('');
  const [bundleReason, setBundleReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Has the user started filling the Bundle tab at all?
  const bundleTouched =
    bundleAddress.trim() !== '' ||
    bundleReason.trim() !== '' ||
    bundles.some(b => b.hairLength || b.hairColor || b.treatedHair || b.file);

  // ---- Certificate name helpers ----
  const addName = () => setCertNames(prev => [...prev, '']);
  const updateName = (i: number, value: string) =>
    setCertNames(prev => prev.map((n, idx) => (idx === i ? value : n)));
  const removeName = (i: number) =>
    setCertNames(prev => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  // ---- Bundle helpers ----
  const addBundle = () => setBundles(prev => [...prev, emptyBundle()]);
  const removeBundle = (id: number) =>
    setBundles(prev => (prev.length === 1 ? prev : prev.filter(b => b.id !== id)));
  const updateBundle = (id: number, patch: Partial<Bundle>) =>
    setBundles(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)));

  const cleanNames = () => certNames.map(n => n.trim()).filter(Boolean);

  // ---- Validation ----
  const validate = (): boolean => {
    if (bundleTouched) {
      // Bundle path is active → validate bundle fields, Hair is NOT required.
      if (!bundleAddress.trim()) {
        toast.error('Please provide a shipping address for your bundle donation.');
        return false;
      }
      if (!bundleReason.trim()) {
        toast.error('Please tell us why you are donating.');
        return false;
      }
      for (let i = 0; i < bundles.length; i++) {
        const b = bundles[i];
        if (!b.hairLength || !b.hairColor || !b.file) {
          toast.error(`Please complete all fields and upload a photo for Bundle ${i + 1}.`);
          setActiveTab('bundle');
          return false;
        }
      }
      return true;
    }

    // Hair Donation path (default) → all fields required.
    if (!formData.hairLength || !formData.hairColor || !formData.address || !formData.reason || !file) {
      toast.error('Please fill in all required fields and upload a photo.');
      setActiveTab('hair');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setShowConfirm(true);
  };

  const buildReason = (baseReason: string) => {
    const names = cleanNames();
    if (names.length === 0) return baseReason;
    return `${baseReason}\n\nCertificate names: ${names.join(', ')}`;
  };

  const postDonation = (opts: {
    hairLength: string;
    hairColor: string;
    treatedHair: boolean;
    address: string;
    reason: string;
    photo: File;
  }) => {
    const data = new FormData();
    data.append('hair_length', opts.hairLength);
    data.append('hair_color', opts.hairColor);
    data.append('treated_hair', opts.treatedHair ? '1' : '0');
    data.append('address', opts.address);
    data.append('reason', buildReason(opts.reason));
    data.append('dropoff_location', DROPOFF_LOCATION);
    const apptAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    data.append('appointment_at', apptAt);
    data.append('photo_front', opts.photo);
    return apiClient.post('/internal-api/donations', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  const doSubmit = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    try {
      let firstReference: string | undefined;

      if (bundleTouched) {
        // Submit one donation per bundle.
        for (const b of bundles) {
          const res = await postDonation({
            hairLength: b.hairLength,
            hairColor: b.hairColor,
            treatedHair: b.treatedHair,
            address: bundleAddress,
            reason: bundleReason,
            photo: b.file!,
          });
          if (!firstReference) firstReference = res.data.reference;
        }
        toast.success(`Submitted ${bundles.length} bundle${bundles.length > 1 ? 's' : ''} successfully.`);
      } else {
        const res = await postDonation({
          hairLength: formData.hairLength,
          hairColor: formData.hairColor,
          treatedHair: formData.treatedHair,
          address: formData.address,
          reason: formData.reason,
          photo: file!,
        });
        firstReference = res.data.reference;
      }

      if (firstReference) navigate(`/donor/tracking/${firstReference}`);
      else navigate('/donor/tracking');
    } catch (err: any) {
      const data = err.response?.data;
      const errorMsg =
        (data?.error ? `${data.error}: ` : '') +
        (data?.message || 'Failed to submit donation. Please try again.');
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Certificate names block ----
  const CertificateNames = (
    <div className="cert-names-block">
      <div className="cert-names-head">
        <div>
          <h3>Names for Certificate</h3>
          <p>These names are used to generate the donation certificate. Add one per donor.</p>
        </div>
      </div>
      <div className="cert-names-list">
        {certNames.map((name, i) => (
          <div className="cert-name-row" key={i}>
            <input
              type="text"
              placeholder={`Name ${i + 1}`}
              value={name}
              onChange={e => updateName(i, e.target.value)}
            />
            {certNames.length > 1 && (
              <button
                type="button"
                className="cert-name-remove"
                aria-label="Remove name"
                onClick={() => removeName(i)}
              >
                <i className="bx bx-x"></i>
              </button>
            )}
          </div>
        ))}
      </div>
      <button type="button" className="add-name-btn" onClick={addName}>
        <i className="bx bx-plus"></i> Add Name
      </button>
    </div>
  );

  const DeliveryDetails = (
    <div className="delivery-note">
      <h3>Delivery Details</h3>
      <p>Address: {DROPOFF_LOCATION}</p>
      <p>Receiving Time: Monday to Sunday, 9:00 AM to 7:00 PM</p>
      <p>Contact: Venus May Alinsod | 0917-847-4270</p>
    </div>
  );

  return (
    <section className="section-wrap donate-page reveal active">
      <style>{`
        .checkbox-wrap {
          display: flex !important; flex-direction: row !important; align-items: center !important;
          justify-content: flex-start !important; gap: 0.5rem !important; grid-column: span 2 !important;
          margin-top: 0.5rem !important; margin-bottom: 0.8rem !important; cursor: pointer !important;
        }
        .checkbox-wrap input[type="checkbox"] {
          margin: 0 !important; width: 18px !important; height: 18px !important; flex-shrink: 0 !important;
          cursor: pointer !important; display: inline-block !important;
        }
        .checkbox-wrap span { display: inline-block !important; color: #d33f7f !important; font-weight: 600 !important; text-align: left !important; }

        /* Two-column layout: left nav + form */
        .donate-layout { display: flex; gap: 1.5rem; align-items: flex-start; }
        .donate-sidenav {
          flex: 0 0 220px; position: sticky; top: 1.5rem; display: flex; flex-direction: column; gap: 0.6rem;
          background: #fff; border: 1px solid #f0e6ee; border-radius: 16px; padding: 0.9rem;
          box-shadow: 0 6px 24px rgba(211,63,127,0.06);
        }
        .donate-sidenav .nav-title { font-size: 0.75rem; letter-spacing: .05em; text-transform: uppercase; color: #a98bb0; margin: 0.2rem 0.4rem 0.4rem; }
        .side-tab {
          display: flex; align-items: center; gap: 0.65rem; width: 100%; text-align: left;
          padding: 0.8rem 0.9rem; border-radius: 12px; border: 1px solid transparent; background: transparent;
          color: #6b5c72; font-weight: 600; cursor: pointer; transition: all .18s ease; font-size: 0.95rem;
        }
        .side-tab i { font-size: 1.15rem; }
        .side-tab:hover { background: #faf3f8; color: #d33f7f; }
        .side-tab.active { background: linear-gradient(135deg,#d33f7f,#b5306a); color: #fff; box-shadow: 0 6px 16px rgba(211,63,127,0.28); }
        .side-tab .side-tab-sub { display: block; font-size: 0.72rem; font-weight: 500; opacity: .8; margin-top: 2px; }
        .donate-form-col { flex: 1 1 auto; min-width: 0; }

        /* Circular multi-bundle prompt */
        .bundle-cta {
          display: flex; align-items: center; gap: 0.9rem; margin: 0.4rem 0 1.2rem;
          background: #faf3f8; border: 1px dashed #e7c3d9; border-radius: 14px; padding: 0.8rem 1rem;
        }
        .bundle-cta-circle {
          flex: 0 0 auto; width: 48px; height: 48px; border-radius: 50%; border: none; cursor: pointer;
          background: linear-gradient(135deg,#d33f7f,#b5306a); color: #fff; font-size: 1.4rem;
          display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(211,63,127,0.3);
          transition: transform .18s ease; animation: bundlePulse 2.4s ease-in-out infinite;
        }
        .bundle-cta-circle:hover { transform: scale(1.08); }
        @keyframes bundlePulse { 0%,100%{ box-shadow:0 6px 16px rgba(211,63,127,0.3);} 50%{ box-shadow:0 6px 22px rgba(211,63,127,0.55);} }
        .bundle-cta-text strong { display: block; color: #b5306a; font-size: 0.95rem; }
        .bundle-cta-text span { font-size: 0.82rem; color: #8a7a90; }

        /* Certificate names */
        .cert-names-block { margin: 1.4rem 0; padding: 1.1rem; border: 1px solid #f0e6ee; border-radius: 14px; background: #fffafd; }
        .cert-names-head h3 { margin: 0; color: #b5306a; font-size: 1.05rem; }
        .cert-names-head p { margin: 0.25rem 0 0.8rem; font-size: 0.85rem; color: #8a7a90; }
        .cert-names-list { display: flex; flex-direction: column; gap: 0.6rem; }
        .cert-name-row { display: flex; gap: 0.5rem; align-items: center; }
        .cert-name-row input { flex: 1 1 auto; }
        .cert-name-remove {
          flex: 0 0 auto; width: 40px; height: 40px; border-radius: 10px; border: 1px solid #f0d3e2;
          background: #fff; color: #d33f7f; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center;
        }
        .cert-name-remove:hover { background: #fdecf4; }
        .add-name-btn {
          margin-top: 0.8rem; display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1rem;
          border-radius: 10px; border: 1px dashed #d33f7f; background: #fff; color: #d33f7f; font-weight: 600; cursor: pointer;
        }
        .add-name-btn:hover { background: #fdecf4; }

        /* Bundle cards */
        .bundle-card { border: 1px solid #f0e6ee; border-radius: 16px; padding: 1.1rem; margin-bottom: 1.1rem; background: #fff; }
        .bundle-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.9rem; }
        .bundle-card-head h3 { margin: 0; color: #b5306a; font-size: 1.05rem; }
        .bundle-remove-btn { border: none; background: #fdecf4; color: #d33f7f; border-radius: 10px; padding: 0.4rem 0.7rem; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem; }
        .add-bundle-btn {
          width: 100%; padding: 0.8rem; border-radius: 12px; border: 1px dashed #d33f7f; background: #fff; color: #d33f7f;
          font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 1.2rem;
        }
        .add-bundle-btn:hover { background: #fdecf4; }
        .bundle-info-banner {
          display: flex; align-items: flex-start; gap: 0.6rem; background: #eef7f0; border: 1px solid #cfe8d6;
          color: #2f6b45; border-radius: 12px; padding: 0.8rem 1rem; margin-bottom: 1.2rem; font-size: 0.88rem;
        }
        .bundle-info-banner i { font-size: 1.2rem; margin-top: 1px; }

        @media (max-width: 860px) {
          .donate-layout { flex-direction: column; }
          .donate-sidenav { position: static; flex: none; width: 100%; flex-direction: row; overflow-x: auto; }
          .side-tab .side-tab-sub { display: none; }
        }
      `}</style>

      <div className="section-title-block center">
        <h1>Donate Hair</h1>
        <p>Your donation helps create wigs for people with medical hair loss.</p>
      </div>

      <article className="guidelines-box">
        <h2><i className="bx bxs-ribbon"></i> Donation Guidelines</h2>
        <ul>
          <li>Hair must be at least 10 inches long.</li>
          <li>Hair should be tied, sealed, and placed in a labeled non-plastic container.</li>
          <li>Colored hair is accepted.</li>
          <li>Hair must be clean and untangled.</li>
        </ul>
      </article>

      <div className="donate-layout">
        {/* Left navigation */}
        <nav className="donate-sidenav">
          <span className="nav-title">Donation Type</span>
          <button
            type="button"
            className={`side-tab ${activeTab === 'hair' ? 'active' : ''}`}
            onClick={() => setActiveTab('hair')}
          >
            <i className="bx bxs-heart-circle"></i>
            <span>
              Hair Donation
              <span className="side-tab-sub">Single donation</span>
            </span>
          </button>
          <button
            type="button"
            className={`side-tab ${activeTab === 'bundle' ? 'active' : ''}`}
            onClick={() => setActiveTab('bundle')}
          >
            <i className="bx bxs-layer"></i>
            <span>
              Bundle Donation
              <span className="side-tab-sub">Multiple bundles</span>
            </span>
          </button>
        </nav>

        {/* Form column */}
        <div className="donate-form-col">
          <article className="form-shell">
            <form onSubmit={handleSubmit}>
              {activeTab === 'hair' && (
                <>
                  <div className="form-head">
                    <h2>Donation Details</h2>
                    <i className="bx bxs-heart-circle"></i>
                  </div>

                  {/* Circular prompt to switch to Bundle Donation */}
                  <div className="bundle-cta">
                    <button
                      type="button"
                      className="bundle-cta-circle"
                      aria-label="Switch to Bundle Donation"
                      title="Donating multiple bundles?"
                      onClick={() => setActiveTab('bundle')}
                    >
                      <i className="bx bx-layer-plus"></i>
                    </button>
                    <div className="bundle-cta-text">
                      <strong>Donating multiple bundles?</strong>
                      <span>Tap the button to switch to Bundle Donation instead.</span>
                    </div>
                  </div>

                  <div className="form-grid two-col">
                    <label>
                      <span>First Name <span>*</span></span>
                      <input type="text" value={user?.firstName || ''} readOnly style={{ background: '#f5f3f7', cursor: 'not-allowed' }} />
                    </label>
                    <label>
                      <span>Last Name <span>*</span></span>
                      <input type="text" value={user?.lastName || ''} readOnly style={{ background: '#f5f3f7', cursor: 'not-allowed' }} />
                    </label>

                    <label>
                      <span>Email <span>*</span></span>
                      <input type="email" value={user?.email || ''} readOnly style={{ background: '#f5f3f7', cursor: 'not-allowed' }} />
                    </label>
                    <label>
                      <span>Phone Number <span>*</span></span>
                      <input type="tel" value={user?.phone || ''} readOnly style={{ background: '#f5f3f7', cursor: 'not-allowed' }} />
                    </label>

                    <label>
                      <span>Hair Length <span>*</span></span>
                      <select value={formData.hairLength} onChange={e => setFormData({ ...formData, hairLength: e.target.value })}>
                        <option value="" disabled>Select hair length</option>
                        <option value="short">Short (10-14 inches)</option>
                        <option value="long">Long (More than 15 inches)</option>
                      </select>
                    </label>
                    <label>
                      <span>Natural Hair Color <span>*</span></span>
                      <select value={formData.hairColor} onChange={e => setFormData({ ...formData, hairColor: e.target.value })}>
                        <option value="" disabled>Select hair color</option>
                        <option>Black</option>
                        <option>Brown</option>
                        <option>Light</option>
                        <option>Other</option>
                      </select>
                    </label>

                    <label className="checkbox-wrap">
                      <input type="checkbox" checked={formData.treatedHair} onChange={e => setFormData({ ...formData, treatedHair: e.target.checked })} />
                      <span>My hair has been chemically treated.</span>
                    </label>
                  </div>

                  <div className="form-grid two-col">
                    <label>
                      <span>Shipping Address <span>*</span></span>
                      <textarea rows={4} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}></textarea>
                    </label>
                    <label>
                      <span>Why are you donating? <span>*</span></span>
                      <textarea rows={4} value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })}></textarea>
                    </label>
                  </div>

                  <div className="upload-section-premium">
                    <label className="upload-label-main">Upload a clear picture of the hair (max 10MB) <span>*</span></label>
                    <UploadBox
                      inputId="hair-photo"
                      value={file}
                      onSelect={setFile}
                      onClear={() => setFile(null)}
                    />
                  </div>

                  {CertificateNames}

                  {DeliveryDetails}
                </>
              )}

              {activeTab === 'bundle' && (
                <>
                  <div className="form-head">
                    <h2>Bundle Donation</h2>
                    <i className="bx bxs-layer"></i>
                  </div>

                  <div className="bundle-info-banner">
                    <i className="bx bx-info-circle"></i>
                    <span>
                      This section is <strong>optional</strong>. Use it only if you're donating multiple bundles.
                      Once you fill in anything here, all bundle fields become required and you no longer need to
                      complete the Hair Donation tab.
                    </span>
                  </div>

                  <div className="form-grid two-col">
                    <label>
                      <span>Shipping Address {bundleTouched && <span>*</span>}</span>
                      <textarea rows={4} value={bundleAddress} onChange={e => setBundleAddress(e.target.value)}></textarea>
                    </label>
                    <label>
                      <span>Why are you donating? {bundleTouched && <span>*</span>}</span>
                      <textarea rows={4} value={bundleReason} onChange={e => setBundleReason(e.target.value)}></textarea>
                    </label>
                  </div>

                  {bundles.map((b, i) => (
                    <div className="bundle-card" key={b.id}>
                      <div className="bundle-card-head">
                        <h3>Bundle {i + 1}</h3>
                        {bundles.length > 1 && (
                          <button type="button" className="bundle-remove-btn" onClick={() => removeBundle(b.id)}>
                            <i className="bx bx-trash"></i> Remove
                          </button>
                        )}
                      </div>

                      <div className="form-grid two-col">
                        <label>
                          <span>Hair Length {bundleTouched && <span>*</span>}</span>
                          <select value={b.hairLength} onChange={e => updateBundle(b.id, { hairLength: e.target.value })}>
                            <option value="" disabled>Select hair length</option>
                            <option value="short">Short (10-14 inches)</option>
                            <option value="long">Long (More than 15 inches)</option>
                          </select>
                        </label>
                        <label>
                          <span>Hair Color {bundleTouched && <span>*</span>}</span>
                          <select value={b.hairColor} onChange={e => updateBundle(b.id, { hairColor: e.target.value })}>
                            <option value="" disabled>Select hair color</option>
                            <option>Black</option>
                            <option>Brown</option>
                            <option>Light</option>
                            <option>Other</option>
                          </select>
                        </label>

                        <label className="checkbox-wrap">
                          <input type="checkbox" checked={b.treatedHair} onChange={e => updateBundle(b.id, { treatedHair: e.target.checked })} />
                          <span>This bundle has been chemically treated.</span>
                        </label>
                      </div>

                      <div className="upload-section-premium">
                        <label className="upload-label-main">Upload a picture of this bundle (max 10MB) {bundleTouched && <span>*</span>}</label>
                        <UploadBox
                          inputId={`bundle-photo-${b.id}`}
                          value={b.file}
                          onSelect={f => updateBundle(b.id, { file: f })}
                          onClear={() => updateBundle(b.id, { file: null })}
                        />
                      </div>
                    </div>
                  ))}

                  <button type="button" className="add-bundle-btn" onClick={addBundle}>
                    <i className="bx bx-plus"></i> Add Another Bundle
                  </button>

                  {CertificateNames}

                  {DeliveryDetails}
                </>
              )}

              <div className="submit-wrap">
                <button className="soft-btn" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : bundleTouched ? 'Submit Bundle Donation' : 'Submit Donation'}
                </button>
              </div>
            </form>
          </article>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={doSubmit}
        title={bundleTouched ? 'Submit Bundle Donation' : 'Submit Donation'}
        message={
          bundleTouched
            ? `Are you sure you want to submit ${bundles.length} bundle${bundles.length > 1 ? 's' : ''}? Please make sure all details are correct before confirming.`
            : 'Are you sure you want to submit your hair donation? Please make sure all details are correct before confirming.'
        }
        confirmText="Yes, Submit"
        isConfirming={isSubmitting}
      />
    </section>
  );
};

export default DonorDonate;
