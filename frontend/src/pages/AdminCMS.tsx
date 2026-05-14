import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import ConfirmModal from '../components/ConfirmModal';

// ─── Types ────────────────────────────────────────────────────────────────────
interface HeroSettings   { heading: string; subheading: string; ctaLabel: string }
interface StatItem       { value: string; label: string }
interface ServiceItem    { title: string; description: string; ctaLabel: string }
interface AboutSettings  { heading: string; body: string }
interface FooterSettings { orgName: string; address: string }
interface BrandingSettings { primaryColor: string; primaryTextColor: string; btnRadius: string }
interface ImagesSettings   { heroLogo: string; aboutImg1: string; aboutImg2: string; partnerLogo1: string; partnerLogo2: string }
interface TypographySettings { headingFont: string; bodyFont: string }

const GOOGLE_FONTS = ['Inter','Poppins','Manrope','Nunito','Lato','Roboto','Playfair Display','Merriweather','Raleway','Montserrat'];

// ─── Section input components ─────────────────────────────────────────────────
const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; multiline?: boolean }> = ({ label, value, onChange, multiline }) => (
  <div style={{ marginBottom: '0.75rem' }}>
    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#8c7895', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</label>
    {multiline
      ? <textarea rows={3} value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid #ead7e8', fontSize: '0.82rem', outline: 'none', resize: 'vertical', background: '#fdf7fb' }} />
      : <input type="text" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid #ead7e8', fontSize: '0.82rem', outline: 'none', background: '#fdf7fb' }} />}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const AdminCMS: React.FC = () => {
  type TabType = 'landing' | 'announcements' | 'partnerships';
  const [activeTab, setActiveTab] = useState<TabType>('landing');

  type LandingSection = 'hero' | 'stats' | 'services' | 'about' | 'footer' | 'branding' | 'images' | 'typography';
  const [landingSection, setLandingSection] = useState<LandingSection>('hero');
  const [hero, setHero]         = useState<HeroSettings>({ heading: '', subheading: '', ctaLabel: '' });
  const [stats, setStats]       = useState<StatItem[]>([{ value: '', label: '' }, { value: '', label: '' }, { value: '', label: '' }]);
  const [services, setServices] = useState<ServiceItem[]>([
    { title: '', description: '', ctaLabel: '' },
    { title: '', description: '', ctaLabel: '' },
    { title: '', description: '', ctaLabel: '' },
  ]);
  const [about, setAbout]       = useState<AboutSettings>({ heading: '', body: '' });
  const [footer, setFooter]     = useState<FooterSettings>({ orgName: '', address: '' });
  const [branding, setBranding] = useState<BrandingSettings>({ primaryColor: '#ad246d', primaryTextColor: '#ffffff', btnRadius: '8px' });
  const [images, setImages]     = useState<ImagesSettings>({ heroLogo: '', aboutImg1: '', aboutImg2: '', partnerLogo1: '', partnerLogo2: '' });
  const [typography, setTypography] = useState<TypographySettings>({ headingFont: 'Playfair Display', bodyFont: 'Inter' });
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  // Existing CMS state
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [partnerships, setPartnerships]   = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [saveSuccess, setSaveSuccess]     = useState(false);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', category: 'Care', author: 'Admin' });
  const [partnershipForm, setPartnershipForm]   = useState({ name: '', type: 'Wigmaker', contact: '', email: '', description: '', status: 'Active' });
  
  const [showLandingConfirm, setShowLandingConfirm] = useState(false);
  const [showAnnouncementConfirm, setShowAnnouncementConfirm] = useState(false);
  const [showPartnershipConfirm, setShowPartnershipConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const DEFAULTS = {
    hero:     { heading: 'STRAND UP FOR CANCER', subheading: 'Hope begins, one at the time', ctaLabel: 'Donate Now' },
    stats:    [{ value: '2,500+', label: 'Hair Donations' }, { value: '2,500+', label: 'Wigs Created' }, { value: '2,500+', label: 'Lives Changed' }],
    services: [
      { title: 'Donate Hair', description: 'Give the gift of confidence to someone in need by donating your hair.', ctaLabel: 'Donate' },
      { title: 'Request Hair', description: 'Apply for free wig with health certification.', ctaLabel: 'Request' },
      { title: 'Monetary', description: 'Support our mission financially and earn reward points.', ctaLabel: 'Give' },
    ],
    about:  { heading: 'About Us', body: 'Strand Up for Cancer (SUFC) is a youth-led initiative dedicated to supporting cancer patients through hair donation and wig crafting. Our mission is to provide high-quality wigs to those experiencing hair loss, restoring their confidence and dignity during their recovery journey.' },
    footer: { orgName: 'STRAND UP FOR CANCER', address: 'Manila Downtown YMCA at 945 Sabino Padilla St,\nBinondo, Manila, 1006 Metro Manila' },
    branding: { primaryColor: '#ad246d', primaryTextColor: '#ffffff', btnRadius: '8px' },
    typography: { headingFont: 'Playfair Display', bodyFont: 'Inter' },
    images: {
      heroLogo: '/assets/images/landing/logo.jpg',
      aboutImg1: '/assets/images/landing/sufc-team.jpg',
      aboutImg2: '/assets/images/landing/sufc-team2.jpg',
      partnerLogo1: '/assets/images/landing/pgh.png',
      partnerLogo2: '/assets/images/landing/wigmaker.png',
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [annRes, partRes, settingsRes] = await Promise.all([
        apiClient.get('/internal-api/admin/announcements'),
        apiClient.get('/internal-api/admin/partnerships'),
        apiClient.get('/internal-api/admin/site-settings'),
      ]);
      setAnnouncements(annRes.data);
      setPartnerships(partRes.data);
      const s = settingsRes.data;
      setHero(s.hero             ?? DEFAULTS.hero);
      setStats(s.stats           ?? DEFAULTS.stats);
      setServices(s.services     ?? DEFAULTS.services);
      setAbout(s.about           ?? DEFAULTS.about);
      setFooter(s.footer         ?? DEFAULTS.footer);
      setBranding(s.branding     ?? DEFAULTS.branding);
      setTypography(s.typography ?? DEFAULTS.typography);
      
      setImages({
        heroLogo:     s.images?.heroLogo     || DEFAULTS.images.heroLogo,
        aboutImg1:    s.images?.aboutImg1    || DEFAULTS.images.aboutImg1,
        aboutImg2:    s.images?.aboutImg2    || DEFAULTS.images.aboutImg2,
        partnerLogo1: s.images?.partnerLogo1 || DEFAULTS.images.partnerLogo1,
        partnerLogo2: s.images?.partnerLogo2 || DEFAULTS.images.partnerLogo2,
      });
    } catch (err) {
      console.error('Failed to fetch CMS data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveLanding = () => {
    setShowLandingConfirm(true);
  };

  const doSaveLanding = async () => {
    setShowLandingConfirm(false);
    setSaving(true);
    setSaveSuccess(false);
    try {
      await apiClient.put('/internal-api/admin/site-settings', [
        { key: 'hero',       value: hero },
        { key: 'stats',      value: stats },
        { key: 'services',   value: services },
        { key: 'about',      value: about },
        { key: 'footer',     value: footer },
        { key: 'branding',   value: branding },
        { key: 'images',     value: images },
        { key: 'typography', value: typography },
      ]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings', err);
      alert('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setShowResetConfirm(true);
  };

  const doResetDefaults = async () => {
    setShowResetConfirm(false);
    setSaving(true);
    try {
      setHero(DEFAULTS.hero);
      setStats(DEFAULTS.stats);
      setServices(DEFAULTS.services);
      setAbout(DEFAULTS.about);
      setFooter(DEFAULTS.footer);
      setBranding(DEFAULTS.branding);
      setTypography(DEFAULTS.typography);
      setImages(DEFAULTS.images);

      await apiClient.put('/internal-api/admin/site-settings', [
        { key: 'hero',       value: DEFAULTS.hero },
        { key: 'stats',      value: DEFAULTS.stats },
        { key: 'services',   value: DEFAULTS.services },
        { key: 'about',      value: DEFAULTS.about },
        { key: 'footer',     value: DEFAULTS.footer },
        { key: 'branding',   value: DEFAULTS.branding },
        { key: 'images',     value: DEFAULTS.images },
        { key: 'typography', value: DEFAULTS.typography },
      ]);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to reset defaults', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    setShowAnnouncementConfirm(true);
  };

  const doCreateAnnouncement = async () => {
    setShowAnnouncementConfirm(false);
    setIsSubmitting(true);
    try {
      await apiClient.post('/internal-api/admin/announcements', announcementForm);
      setAnnouncementForm({ title: '', content: '', category: 'Care', author: 'Admin' });
      fetchData();
    } catch (err) { console.error('Failed to create announcement', err); }
    finally { setIsSubmitting(false); }
  };

  const handleCreatePartnership = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPartnershipConfirm(true);
  };

  const doCreatePartnership = async () => {
    setShowPartnershipConfirm(false);
    setIsSubmitting(true);
    try {
      await apiClient.post('/internal-api/admin/partnerships', partnershipForm);
      setPartnershipForm({ name: '', type: 'Wigmaker', contact: '', email: '', description: '', status: 'Active' });
      fetchData();
    } catch (err) { console.error('Failed to create partnership', err); }
    finally { setIsSubmitting(false); }
  };

  const handleImageUpload = async (key: keyof ImagesSettings, file: File) => {
    setUploadingKey(key);
    try {
      const { supabase } = await import('../lib/supabase');
      const fileExt = file.name.split('.').pop();
      const fileName = `cms/${key}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('hairlink')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('hairlink')
        .getPublicUrl(fileName);

      setImages(prev => ({ ...prev, [key]: publicUrl }));
    } catch (err) {
      console.error('Upload failed', err);
      alert('Upload failed');
    } finally {
      setUploadingKey(null);
    }
  };

  if (loading) return <div className="section-wrap">Loading CMS...</div>;

  const card: React.CSSProperties  = { background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1.5rem' };
  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '0.45rem 1rem', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
    fontWeight: 800, fontSize: '0.8rem',
    background: active ? '#fff' : 'transparent',
    color: active ? '#ad246d' : '#8c7895',
    borderBottom: active ? '2px solid #ad246d' : '2px solid transparent',
  });
  const sectionPill = (active: boolean): React.CSSProperties => ({
    padding: '0.35rem 0.9rem', borderRadius: '20px', border: '1px solid #ead7e8', cursor: 'pointer',
    fontWeight: 700, fontSize: '0.75rem',
    background: active ? '#ad246d' : '#fdf7fb',
    color: active ? '#fff' : '#8c7895',
  });
  const saveBtn: React.CSSProperties = {
    padding: '0.55rem 1.5rem', borderRadius: '10px', background: saveSuccess ? '#22c55e' : '#ad246d',
    color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.3s ease',
  };

  return (
    <section className="section-wrap reveal active admin-page" style={{ padding: '1rem' }}>
      <header style={{ padding: '0.2rem 0', marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ad246d', marginBottom: '0.1rem' }}>Admin · CMS</p>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#261d2b', margin: 0 }}>Content Management</h1>
        <p style={{ color: '#665772', fontSize: '0.75rem', marginTop: '0.1rem' }}>Edit landing page content, announcements, and partnerships.</p>
      </header>

      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid #ead7e8', marginBottom: '1.5rem' }}>
        <button onClick={() => setActiveTab('landing')}       style={tabBtn(activeTab === 'landing')}>🏠 Landing Page</button>
        <button onClick={() => setActiveTab('announcements')} style={tabBtn(activeTab === 'announcements')}>📢 Announcements</button>
        <button onClick={() => setActiveTab('partnerships')}  style={tabBtn(activeTab === 'partnerships')}>🤝 Partnerships</button>
      </div>

      {activeTab === 'landing' && (
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          <aside style={{ ...card, padding: '1rem', display: 'grid', gap: '0.5rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ad246d', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Sections</p>
            {(['hero', 'stats', 'services', 'about', 'footer', 'branding', 'images', 'typography'] as LandingSection[]).map(sec => (
              <button key={sec} onClick={() => setLandingSection(sec)} style={sectionPill(landingSection === sec)}>
                {{ 
                  hero: '🎯 Hero', 
                  stats: '📊 Stats', 
                  services: '⚙️ How It Works', 
                  about: 'ℹ️ About', 
                  footer: '🔻 Footer',
                  branding: '🎨 Branding',
                  images: '🖼️ Images',
                  typography: '🔡 Fonts'
                }[sec]}
              </button>
            ))}

            <div style={{ marginTop: '1rem', borderTop: '1px solid #f2ebf4', paddingTop: '1rem', display: 'grid', gap: '0.75rem' }}>
              <button onClick={handleSaveLanding} disabled={saving} style={saveBtn}>
                <i className={`bx ${saveSuccess ? 'bx-check' : 'bx-save'}`}></i>
                {saving ? 'Saving…' : saveSuccess ? 'Saved!' : 'Save All'}
              </button>
              <button onClick={handleResetDefaults} disabled={saving} style={{ padding: '0.5rem', borderRadius: '10px', background: 'transparent', color: '#8c7895', border: '1.5px solid #ead7e8', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <i className='bx bx-rotate-left'></i> Reset to Default
              </button>
              <p style={{ fontSize: '0.62rem', color: '#8c7895', marginTop: '0.2rem' }}>Changes apply to the public landing page immediately.</p>
            </div>
          </aside>

          <div style={card}>
            {landingSection === 'hero' && (
              <>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#3b2e43', marginBottom: '1.25rem' }}>🎯 Hero Section</h2>
                <Field label="Main Heading (H1)" value={hero.heading} onChange={v => setHero({ ...hero, heading: v })} />
                <Field label="Subheading / Tagline" value={hero.subheading} onChange={v => setHero({ ...hero, subheading: v })} />
                <Field label="CTA Button Label" value={hero.ctaLabel} onChange={v => setHero({ ...hero, ctaLabel: v })} />
              </>
            )}

            {landingSection === 'stats' && (
              <>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#3b2e43', marginBottom: '1.25rem' }}>📊 Hero Stats</h2>
                {stats.map((stat, i) => (
                  <div key={i} style={{ background: '#fdf7fb', border: '1px solid #f2ebf4', borderRadius: '12px', padding: '1rem', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ad246d', marginBottom: '0.5rem' }}>Stat {i + 1}</p>
                    <Field label="Value (e.g. 2,500+)" value={stat.value} onChange={v => { const s = [...stats]; s[i] = { ...s[i], value: v }; setStats(s); }} />
                    <Field label="Label (e.g. Hair Donations)" value={stat.label} onChange={v => { const s = [...stats]; s[i] = { ...s[i], label: v }; setStats(s); }} />
                  </div>
                ))}
              </>
            )}

            {landingSection === 'services' && (
              <>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#3b2e43', marginBottom: '1.25rem' }}>⚙️ How It Works — Service Cards</h2>
                {services.map((svc, i) => (
                  <div key={i} style={{ background: '#fdf7fb', border: '1px solid #f2ebf4', borderRadius: '12px', padding: '1rem', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ad246d', marginBottom: '0.5rem' }}>Card {i + 1}</p>
                    <Field label="Title" value={svc.title} onChange={v => { const s = [...services]; s[i] = { ...s[i], title: v }; setServices(s); }} />
                    <Field label="Description" value={svc.description} onChange={v => { const s = [...services]; s[i] = { ...s[i], description: v }; setServices(s); }} multiline />
                    <Field label="Button Label" value={svc.ctaLabel} onChange={v => { const s = [...services]; s[i] = { ...s[i], ctaLabel: v }; setServices(s); }} />
                  </div>
                ))}
              </>
            )}

            {landingSection === 'about' && (
              <>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#3b2e43', marginBottom: '1.25rem' }}>ℹ️ About Section</h2>
                <Field label="Section Heading" value={about.heading} onChange={v => setAbout({ ...about, heading: v })} />
                <Field label="Body Paragraph" value={about.body} onChange={v => setAbout({ ...about, body: v })} multiline />
              </>
            )}

            {landingSection === 'footer' && (
              <>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#3b2e43', marginBottom: '1.25rem' }}>🔻 Footer</h2>
                <Field label="Organization Name" value={footer.orgName} onChange={v => setFooter({ ...footer, orgName: v })} />
                <Field label="Address (use \\n for line break)" value={footer.address} onChange={v => setFooter({ ...footer, address: v })} multiline />
              </>
            )}

            {landingSection === 'branding' && (
              <>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#3b2e43', marginBottom: '1.25rem' }}>🎨 Branding</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#8c7895', textTransform: 'uppercase', marginBottom: '4px' }}>Primary Color</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input type="color" value={branding.primaryColor} onChange={e => setBranding({ ...branding, primaryColor: e.target.value })} style={{ width: '40px', height: '40px', border: 'none', borderRadius: '4px' }} />
                      <input type="text" value={branding.primaryColor} onChange={e => setBranding({ ...branding, primaryColor: e.target.value })} style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', border: '1px solid #ead7e8' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#8c7895', textTransform: 'uppercase', marginBottom: '4px' }}>Button Text Color</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input type="color" value={branding.primaryTextColor} onChange={e => setBranding({ ...branding, primaryTextColor: e.target.value })} style={{ width: '40px', height: '40px', border: 'none', borderRadius: '4px' }} />
                      <input type="text" value={branding.primaryTextColor} onChange={e => setBranding({ ...branding, primaryTextColor: e.target.value })} style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', border: '1px solid #ead7e8' }} />
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#8c7895', textTransform: 'uppercase', marginBottom: '4px' }}>Button Border Radius (px)</label>
                  <input type="range" min="0" max="30" value={parseInt(branding.btnRadius)} onChange={e => setBranding({ ...branding, btnRadius: `${e.target.value}px` })} style={{ width: '100%' }} />
                  <div style={{ fontSize: '0.7rem', color: '#8c7895', textAlign: 'right' }}>{branding.btnRadius}</div>
                </div>
              </>
            )}

            {landingSection === 'images' && (
              <>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#3b2e43', marginBottom: '1.25rem' }}>🖼️ Images</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  {(Object.keys(images) as (keyof ImagesSettings)[]).map(key => (
                    <div key={key} style={{ background: '#fdf7fb', border: '1px solid #f2ebf4', borderRadius: '12px', padding: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#8c7895', textTransform: 'uppercase', marginBottom: '8px' }}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <div style={{ width: '100%', height: '100px', background: '#fff', borderRadius: '8px', border: '1px dashed #ead7e8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: '10px' }}>
                        {images[key] ? (
                          <img src={images[key]} alt={key} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                          <i className='bx bx-image' style={{ fontSize: '2rem', color: '#ead7e8' }}></i>
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        id={`upload-${key}`} 
                        style={{ display: 'none' }} 
                        onChange={e => e.target.files?.[0] && handleImageUpload(key, e.target.files[0])}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => document.getElementById(`upload-${key}`)?.click()} 
                          disabled={uploadingKey === key}
                          style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', border: '1px solid #ad246d', background: 'transparent', color: '#ad246d', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          {uploadingKey === key ? 'Uploading...' : 'Change'}
                        </button>
                        <button 
                          onClick={() => setImages(prev => ({ ...prev, [key]: '' }))}
                          style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #ead7e8', background: '#fdf7fb', color: '#8c7895', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                          title="Reset to default"
                        >
                          <i className='bx bx-undo'></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {landingSection === 'typography' && (
              <>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#3b2e43', marginBottom: '1.25rem' }}>🔡 Typography</h2>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#8c7895', textTransform: 'uppercase', marginBottom: '4px' }}>Headings Font</label>
                    <select 
                      value={typography.headingFont} 
                      onChange={e => setTypography({ ...typography, headingFont: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #ead7e8', fontFamily: typography.headingFont }}
                    >
                      {GOOGLE_FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#8c7895', textTransform: 'uppercase', marginBottom: '4px' }}>Body Font</label>
                    <select 
                      value={typography.bodyFont} 
                      onChange={e => setTypography({ ...typography, bodyFont: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #ead7e8', fontFamily: typography.bodyFont }}
                    >
                      {GOOGLE_FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
          <article style={card}>
            <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}><i className='bx bx-news'></i> Published Announcements</h2>
            <div className="table-wrap">
              <table className="admin-table">
                <thead><tr><th>Title</th><th>Category</th><th>Author</th><th>Date</th></tr></thead>
                <tbody>
                  {announcements.map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.title}</strong></td>
                      <td>{a.category}</td>
                      <td>{a.author}</td>
                      <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          <aside>
            <article style={card}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>New Announcement</h3>
              <form onSubmit={handleCreateAnnouncement} style={{ display: 'grid', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Title</label>
                  <input type="text" value={announcementForm.title} onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Category</label>
                  <select value={announcementForm.category} onChange={e => setAnnouncementForm({...announcementForm, category: e.target.value})}>
                    <option value="Care">Wig Care</option>
                    <option value="Styling">Styling</option>
                    <option value="Advocacy">Advocacy</option>
                    <option value="Update">System Update</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Content</label>
                  <textarea rows={5} value={announcementForm.content} onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})} required></textarea>
                </div>
                <button type="submit" disabled={isSubmitting} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: '#ad246d', color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1, width: '100%', marginTop: '0.5rem' }}>
                  {isSubmitting ? 'Publishing...' : 'Publish'}
                </button>
              </form>
            </article>
          </aside>
        </div>
      )}

      {activeTab === 'partnerships' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
          <article style={card}>
            <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}><i className='bx bx-briefcase'></i> Active Partnerships</h2>
            <div className="table-wrap">
              <table className="admin-table">
                <thead><tr><th>Partner</th><th>Type</th><th>Contact</th><th>Status</th></tr></thead>
                <tbody>
                  {partnerships.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.type}</td>
                      <td>{p.email || p.contact}</td>
                      <td>{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          <aside>
            <article style={card}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>New Partnership</h3>
              <form onSubmit={handleCreatePartnership} style={{ display: 'grid', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Organization Name</label>
                  <input type="text" value={partnershipForm.name} onChange={e => setPartnershipForm({...partnershipForm, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Type</label>
                  <input type="text" value={partnershipForm.type} onChange={e => setPartnershipForm({...partnershipForm, type: e.target.value})} placeholder="e.g. Wigmaker, Logistics" />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Email / Contact</label>
                  <input type="text" value={partnershipForm.email} onChange={e => setPartnershipForm({...partnershipForm, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Status</label>
                  <select value={partnershipForm.status} onChange={e => setPartnershipForm({...partnershipForm, status: e.target.value})}>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <button type="submit" disabled={isSubmitting} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: '#ad246d', color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1, width: '100%', marginTop: '0.5rem' }}>
                  {isSubmitting ? 'Saving...' : 'Save Partner'}
                </button>
              </form>
            </article>
          </aside>
        </div>
      )}

      <ConfirmModal
        isOpen={showLandingConfirm}
        onClose={() => setShowLandingConfirm(false)}
        onConfirm={doSaveLanding}
        title="Save Landing Page Changes"
        message="Apply your changes to the public-facing landing page? All visitors will see the updated content immediately."
        confirmText="Yes, Publish Changes"
        isConfirming={saving}
      />

      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={doResetDefaults}
        variant="danger"
        title="Reset to Factory Defaults?"
        message="This will overwrite all your current landing page customizations, branding, and images with the original system defaults. This action cannot be undone."
        confirmText="Yes, Reset Everything"
        isConfirming={saving}
      />

      <ConfirmModal
        isOpen={showAnnouncementConfirm}
        onClose={() => setShowAnnouncementConfirm(false)}
        onConfirm={doCreateAnnouncement}
        title="Publish Announcement"
        message={`Publish "${announcementForm.title}" as a new announcement? It will be visible to all users immediately.`}
        confirmText="Yes, Publish"
        isConfirming={isSubmitting}
      />

      <ConfirmModal
        isOpen={showPartnershipConfirm}
        onClose={() => setShowPartnershipConfirm(false)}
        onConfirm={doCreatePartnership}
        title="Add Partnership"
        message={`Add ${partnershipForm.name || 'this organization'} as a new ${partnershipForm.type} partner?`}
        confirmText="Yes, Add Partner"
        isConfirming={isSubmitting}
      />
    </section>
  );
};

export default AdminCMS;
