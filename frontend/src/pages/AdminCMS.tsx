import toast from 'react-hot-toast';
import React, { useState, useEffect, useCallback } from 'react';
import '../styles/Admin.css';
import apiClient from '../api/client';
import ConfirmModal from '../components/ConfirmModal';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExtendedHeroSettings { heading: string; subheading: string; ctaLabel: string; ghostLabel: string; pillText: string; floatBadgeText: string }
interface ServiceItem    { title: string; description: string; ctaLabel: string }
interface AboutSettings  { heading: string; body: string }
interface ExtendedFooterSettings { orgName: string; address: string; facebook: string; instagram: string; tagline: string }
interface BrandingSettings { primaryColor: string; primaryTextColor: string; btnRadius: string }
interface ImagesSettings   { heroLogo: string; aboutImg1: string; aboutImg2: string; partnerLogo1: string; partnerLogo2: string; partnerLogo3: string; eventImg1: string; eventImg2: string; eventImg3: string; eventImg4: string }
interface TypographySettings { headingFont: string; bodyFont: string }

const GOOGLE_FONTS = ['Inter','Poppins','Manrope','Nunito','Lato','Roboto','Playfair Display','Merriweather','Raleway','Montserrat'];

// ─── Section input components ─────────────────────────────────────────────────
const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; multiline?: boolean }> = ({ label, value, onChange, multiline }) => (
  <div className="admin-cms-field">
    <label className="admin-cms-field-label">{label}</label>
    {multiline
      ? <textarea rows={3} value={value} onChange={e => onChange(e.target.value)}
          className="admin-cms-textarea" />
      : <input type="text" value={value} onChange={e => onChange(e.target.value)}
          className="admin-cms-input" />}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const AdminCMS: React.FC = () => {
  type TabType = 'landing' | 'announcements' | 'partnerships';
  const [activeTab, setActiveTab] = useState<TabType>('landing');

  type LandingSection = 'hero' | 'services' | 'about' | 'footer' | 'branding' | 'images' | 'partners' | 'typography' | 'pastEvents';
  const [landingSection, setLandingSection] = useState<LandingSection>('hero');
  const [hero, setHero]         = useState<ExtendedHeroSettings>({ heading: '', subheading: '', ctaLabel: '', ghostLabel: '', pillText: '', floatBadgeText: '' });

  const [services, setServices] = useState<ServiceItem[]>([
    { title: '', description: '', ctaLabel: '' },
    { title: '', description: '', ctaLabel: '' },
    { title: '', description: '', ctaLabel: '' },
  ]);
  const [servicesHeader, setServicesHeader] = useState({ label: '', heading: '', subheading: '' });
  const [pastEventsHeader, setPastEventsHeader] = useState({ label: '', heading: '', subheading: '' });
  const [pastEvents, setPastEvents] = useState<any[]>([
    { title: '', description: '', date: '', imageKey: 'eventImg1' },
    { title: '', description: '', date: '', imageKey: 'eventImg2' },
    { title: '', description: '', date: '', imageKey: 'eventImg3' },
    { title: '', description: '', date: '', imageKey: 'eventImg4' }
  ]);
  const [about, setAbout]       = useState<AboutSettings>({ heading: '', body: '' });
  const [footer, setFooter]     = useState<ExtendedFooterSettings>({ orgName: '', address: '', facebook: '', instagram: '', tagline: '' });
  const [branding, setBranding] = useState<BrandingSettings>({ primaryColor: '#ad246d', primaryTextColor: '#ffffff', btnRadius: '8px' });
  const [images, setImages]     = useState<ImagesSettings>({ heroLogo: '', aboutImg1: '', aboutImg2: '', partnerLogo1: '', partnerLogo2: '', partnerLogo3: '', eventImg1: '', eventImg2: '', eventImg3: '', eventImg4: '' });
  const [typography, setTypography] = useState<TypographySettings>({ headingFont: 'Playfair Display', bodyFont: 'Inter' });
  const [partnerLogos, setPartnerLogos] = useState<{name: string, url: string}[]>([]);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  // Existing CMS state
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [partnerships, setPartnerships]   = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [saveSuccess, setSaveSuccess]     = useState(false);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', category: 'Care', author: 'Admin', target_audience: 'all' });
  const [partnershipForm, setPartnershipForm]   = useState({ name: '', type: 'Wigmaker', contact: '', email: '', description: '', status: 'Active' });
  
  const [showLandingConfirm, setShowLandingConfirm] = useState(false);
  const [showAnnouncementConfirm, setShowAnnouncementConfirm] = useState(false);
  const [showPartnershipConfirm, setShowPartnershipConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const DEFAULTS = {
    hero:     { heading: 'Every Strand,<br />a Story of <em>Hope.</em>', subheading: 'Supporting cancer patients through hair donation, wig crafting, and compassionate community.', ctaLabel: 'Donate Now', ghostLabel: 'Request a Wig', pillText: 'Strand Up for Cancer', floatBadgeText: '100% Free for Patients' },

    services: [
      { title: 'Donate Hair', description: 'Give the gift of confidence to someone in need by donating your hair.', ctaLabel: 'Donate' },
      { title: 'Request Hair', description: 'Apply for free wig with health certification.', ctaLabel: 'Request' },
      { title: 'Monetary', description: 'Support our mission financially and earn reward points.', ctaLabel: 'Give' },
    ],
    servicesHeader: { label: 'How It Works', heading: 'Simple steps,<br />lasting impact.', subheading: 'Whether you want to donate or receive, we make the process simple and transparent.' },
    pastEventsHeader: { label: 'Past Events', heading: 'Highlighting our community impact.', subheading: 'Take a look back at our past hair donation drives, volunteer campaigns, and charity events.' },
    pastEvents: [
      { title: 'Hair Donation Drive', description: 'Generous donor sharing hope by gifting her locks for wig crafting at Tau Lambda Alpha, Los Baños.', date: 'April 28, 2026', imageKey: 'eventImg1' },
      { title: 'Strand Up for Cancer Campaign', description: 'Community hair donation drive with our lovely volunteers and donors presenting their certificates of appreciation.', date: 'April 28, 2026', imageKey: 'eventImg2' },
      { title: 'Wig Crafting & Haircut Session', description: 'Professional stylists volunteering to cut and measure hair for custom medical-grade wigs.', date: 'Feb 25, 2026', imageKey: 'eventImg3' },
      { title: 'Donation Celebration', description: 'Donors showcasing their ponytails alongside certificates of appreciation for supporting cancer survivors.', date: 'Feb 2, 2026', imageKey: 'eventImg4' }
    ],
    about:  { heading: 'About Us', body: 'Strand Up for Cancer (SUFC) is a youth-led initiative dedicated to supporting cancer patients through hair donation and wig crafting. Our mission is to provide high-quality wigs to those experiencing hair loss, restoring their confidence and dignity during their recovery journey.' },
    footer: { orgName: 'STRAND UP FOR CANCER', address: 'Manila Downtown YMCA at 945 Sabino Padilla St,\nBinondo, Manila, 1006 Metro Manila', facebook: 'https://www.facebook.com/strandupforcancer', instagram: 'https://www.instagram.com/strandupforcancer/', tagline: 'Empowering cancer patients through hair donation, wig crafting, and community compassion.' },
    branding: { primaryColor: '#ad246d', primaryTextColor: '#ffffff', btnRadius: '8px' },
    typography: { headingFont: 'Playfair Display', bodyFont: 'Inter' },
    images: {
      heroLogo: '/assets/images/landing/logo.jpg',
      aboutImg1: '/assets/images/landing/sufc-team.jpg',
      aboutImg2: '/assets/images/landing/sufc-team2.jpg',
      partnerLogo1: '/assets/images/landing/pgh.png',
      partnerLogo2: '/assets/images/landing/wigmaker.png',
      partnerLogo3: '/assets/images/landing/YMCA_partner.jpg',
      eventImg1: '/assets/images/landing/past-event-1.jpg',
      eventImg2: '/assets/images/landing/past-event-2.jpg',
      eventImg3: '/assets/images/landing/past-event-3.jpg',
      eventImg4: '/assets/images/landing/past-event-4.jpg',
    },
    partnerLogos: [
      { name: 'Philippine General Hospital', url: '/assets/images/landing/pgh.png' },
      { name: 'Partner Wigmaker', url: '/assets/images/landing/wigmaker.png' },
      { name: 'Manila Downtown YMCA Youth Club', url: '/assets/images/landing/YMCA_partner.jpg' },
    ]
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
      
      setHero(s.hero             ? { ...DEFAULTS.hero, ...s.hero } : DEFAULTS.hero);
      setServices(s.services     ?? DEFAULTS.services);
      setServicesHeader(s.servicesHeader ? { ...DEFAULTS.servicesHeader, ...s.servicesHeader } : DEFAULTS.servicesHeader);
      setPastEventsHeader(s.pastEventsHeader ? { ...DEFAULTS.pastEventsHeader, ...s.pastEventsHeader } : DEFAULTS.pastEventsHeader);
      setPastEvents(s.pastEvents ?? DEFAULTS.pastEvents);
      setAbout(s.about           ? { ...DEFAULTS.about, ...s.about } : DEFAULTS.about);
      setFooter(s.footer         ? { ...DEFAULTS.footer, ...s.footer } : DEFAULTS.footer);
      setBranding(s.branding     ? { ...DEFAULTS.branding, ...s.branding } : DEFAULTS.branding);
      setTypography(s.typography ? { ...DEFAULTS.typography, ...s.typography } : DEFAULTS.typography);
      
      setImages({
        heroLogo:     s.images?.heroLogo     || DEFAULTS.images.heroLogo,
        aboutImg1:    s.images?.aboutImg1    || DEFAULTS.images.aboutImg1,
        aboutImg2:    s.images?.aboutImg2    || DEFAULTS.images.aboutImg2,
        partnerLogo1: s.images?.partnerLogo1 || DEFAULTS.images.partnerLogo1,
        partnerLogo2: s.images?.partnerLogo2 || DEFAULTS.images.partnerLogo2,
        partnerLogo3: s.images?.partnerLogo3 || DEFAULTS.images.partnerLogo3,
        eventImg1:    s.images?.eventImg1    || DEFAULTS.images.eventImg1,
        eventImg2:    s.images?.eventImg2    || DEFAULTS.images.eventImg2,
        eventImg3:    s.images?.eventImg3    || DEFAULTS.images.eventImg3,
        eventImg4:    s.images?.eventImg4    || DEFAULTS.images.eventImg4,
      });
      setPartnerLogos(s.partnerLogos ?? DEFAULTS.partnerLogos);
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
        { key: 'hero',             value: hero },
        { key: 'services',         value: services },
        { key: 'servicesHeader',   value: servicesHeader },
        { key: 'pastEventsHeader', value: pastEventsHeader },
        { key: 'pastEvents',       value: pastEvents },
        { key: 'about',            value: about },
        { key: 'footer',           value: footer },
        { key: 'branding',         value: branding },
        { key: 'images',           value: images },
        { key: 'typography',       value: typography },
        { key: 'partnerLogos',     value: partnerLogos },
      ]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings', err);
      toast.error('Save failed. Please try again.');
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
      setServices(DEFAULTS.services);
      setServicesHeader(DEFAULTS.servicesHeader);
      setPastEventsHeader(DEFAULTS.pastEventsHeader);
      setPastEvents(DEFAULTS.pastEvents);
      setAbout(DEFAULTS.about);
      setFooter(DEFAULTS.footer);
      setBranding(DEFAULTS.branding);
      setTypography(DEFAULTS.typography);
      setImages(DEFAULTS.images);
      setPartnerLogos(DEFAULTS.partnerLogos);

      await apiClient.put('/internal-api/admin/site-settings', [
        { key: 'hero',             value: DEFAULTS.hero },
        { key: 'services',         value: DEFAULTS.services },
        { key: 'servicesHeader',   value: DEFAULTS.servicesHeader },
        { key: 'pastEventsHeader', value: DEFAULTS.pastEventsHeader },
        { key: 'pastEvents',       value: DEFAULTS.pastEvents },
        { key: 'about',            value: DEFAULTS.about },
        { key: 'footer',           value: DEFAULTS.footer },
        { key: 'branding',         value: DEFAULTS.branding },
        { key: 'images',           value: DEFAULTS.images },
        { key: 'typography',       value: DEFAULTS.typography },
        { key: 'partnerLogos',     value: DEFAULTS.partnerLogos },
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
      setAnnouncementForm({ title: '', content: '', category: 'Care', author: 'Admin', target_audience: 'all' });
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
      toast.error('Upload failed');
    } finally {
      setUploadingKey(null);
    }
  };

  const addPartnerLogo = () => setPartnerLogos([...partnerLogos, { name: '', url: '' }]);
  const removePartnerLogo = (i: number) => setPartnerLogos(partnerLogos.filter((_, idx) => idx !== i));
  const updatePartnerLogo = (i: number, field: string, value: string) => {
    const updated = [...partnerLogos];
    updated[i] = { ...updated[i], [field]: value };
    setPartnerLogos(updated);
  };
  const handlePartnerLogoUpload = async (index: number, file: File) => {
    setUploadingKey(`partner-${index}`);
    try {
      const { supabase } = await import('../lib/supabase');
      const fileExt = file.name.split('.').pop();
      const fileName = `cms/partner-${index}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('hairlink').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('hairlink').getPublicUrl(fileName);
      updatePartnerLogo(index, 'url', publicUrl);
    } catch (err) {
      console.error('Upload failed', err);
      toast.error('Upload failed');
    } finally {
      setUploadingKey(null);
    }
  };

  if (loading) return <div className="section-wrap">Loading CMS...</div>;

  return (
    <section className="section-wrap reveal active admin-page admin-page-pad">
      <header className="admin-cms-page-header">
        <p className="admin-page-kicker">Admin · CMS</p>
        <h1 className="admin-page-title">Content Management</h1>
        <p className="admin-page-subtitle">Edit landing page content, announcements, and partnerships.</p>
      </header>

      <div className="admin-cms-tab-row">
        <button onClick={() => setActiveTab('landing')}       className={`admin-cms-page-tab${activeTab === 'landing' ? ' active' : ''}`}>🏠 Landing Page</button>
        <button onClick={() => setActiveTab('announcements')} className={`admin-cms-page-tab${activeTab === 'announcements' ? ' active' : ''}`}>📢 Announcements</button>
        <button onClick={() => setActiveTab('partnerships')}  className={`admin-cms-page-tab${activeTab === 'partnerships' ? ' active' : ''}`}>🤝 Partnerships</button>
      </div>

      {activeTab === 'landing' && (
        <div className="admin-cms-sidebar-grid">
          <aside className="admin-card-rounded admin-cms-sidebar-aside">
            <p className="admin-page-kicker">Sections</p>
            {(['hero', 'services', 'about', 'footer', 'branding', 'images', 'partners', 'typography', 'pastEvents'] as LandingSection[]).map(sec => (
              <button key={sec} onClick={() => setLandingSection(sec)} className={`admin-cms-section-pill${landingSection === sec ? ' active' : ''}`}>
                {{ 
                  hero: '🎯 Hero', 
                  services: '⚙️ How It Works', 
                  about: 'ℹ️ About', 
                  footer: '🔻 Footer',
                  branding: '🎨 Branding',
                  images: '🖼️ Images',
                  partners: '🤝 Partners',
                  typography: '🔡 Fonts',
                  pastEvents: '🎬 Past Highlights'
                }[sec]}
              </button>
            ))}

            <div className="admin-cms-reset-section">
              <button onClick={handleSaveLanding} disabled={saving} className={`admin-cms-save-btn${saveSuccess ? ' success' : ''}`}>
                <i className={`bx ${saveSuccess ? 'bx-check' : 'bx-save'}`}></i>
                {saving ? 'Saving…' : saveSuccess ? 'Saved!' : 'Save All'}
              </button>
              <button onClick={handleResetDefaults} disabled={saving} className="admin-cms-reset-btn">
                <i className='bx bx-rotate-left'></i> Reset to Default
              </button>
              <p className="admin-cms-note">Changes apply to the public landing page immediately.</p>
            </div>
          </aside>

          <div className="admin-card-rounded">
            {landingSection === 'hero' && (
              <>
                <h2 className="admin-cms-section-title">🎯 Hero Section</h2>
                <Field label="Main Heading (H1)" value={hero.heading} onChange={v => setHero({ ...hero, heading: v })} />
                <Field label="Subheading / Tagline" value={hero.subheading} onChange={v => setHero({ ...hero, subheading: v })} />
                <Field label="Pill Text (Top Label)" value={hero.pillText} onChange={v => setHero({ ...hero, pillText: v })} />
                <Field label="Floating Badge Text (Bottom Right)" value={hero.floatBadgeText} onChange={v => setHero({ ...hero, floatBadgeText: v })} />
                <Field label="Primary CTA Label" value={hero.ctaLabel} onChange={v => setHero({ ...hero, ctaLabel: v })} />
                <Field label="Ghost CTA Label" value={hero.ghostLabel} onChange={v => setHero({ ...hero, ghostLabel: v })} />
              </>
            )}

            {landingSection === 'services' && (
              <>
                <h2 className="admin-cms-section-title">⚙️ How It Works — Header & Cards</h2>
                <div className="admin-cms-item-card">
                  <p className="admin-cms-item-label">Section Header Info</p>
                  <Field label="Section Label" value={servicesHeader.label} onChange={v => setServicesHeader({ ...servicesHeader, label: v })} />
                  <Field label="Section Heading" value={servicesHeader.heading} onChange={v => setServicesHeader({ ...servicesHeader, heading: v })} />
                  <Field label="Section Subheading" value={servicesHeader.subheading} onChange={v => setServicesHeader({ ...servicesHeader, subheading: v })} multiline />
                </div>
                {services.map((svc, i) => (
                  <div key={i} className="admin-cms-item-card">
                    <p className="admin-cms-item-label">Card {i + 1}</p>
                    <Field label="Title" value={svc.title} onChange={v => { const s = [...services]; s[i] = { ...s[i], title: v }; setServices(s); }} />
                    <Field label="Description" value={svc.description} onChange={v => { const s = [...services]; s[i] = { ...s[i], description: v }; setServices(s); }} multiline />
                    <Field label="Button Label" value={svc.ctaLabel} onChange={v => { const s = [...services]; s[i] = { ...s[i], ctaLabel: v }; setServices(s); }} />
                  </div>
                ))}
              </>
            )}

            {landingSection === 'pastEvents' && (
              <>
                <h2 className="admin-cms-section-title">🎬 Past Events Highlights</h2>
                <div className="admin-cms-item-card">
                  <p className="admin-cms-item-label">Section Header Info</p>
                  <Field label="Section Label" value={pastEventsHeader.label} onChange={v => setPastEventsHeader({ ...pastEventsHeader, label: v })} />
                  <Field label="Section Heading" value={pastEventsHeader.heading} onChange={v => setPastEventsHeader({ ...pastEventsHeader, heading: v })} />
                  <Field label="Section Subheading" value={pastEventsHeader.subheading} onChange={v => setPastEventsHeader({ ...pastEventsHeader, subheading: v })} multiline />
                </div>
                {pastEvents.map((pe, i) => (
                  <div key={i} className="admin-cms-item-card">
                    <p className="admin-cms-item-label">Highlight Card {i + 1}</p>
                    <Field label="Title" value={pe.title} onChange={v => { const p = [...pastEvents]; p[i] = { ...p[i], title: v }; setPastEvents(p); }} />
                    <Field label="Date Text" value={pe.date} onChange={v => { const p = [...pastEvents]; p[i] = { ...p[i], date: v }; setPastEvents(p); }} />
                    <Field label="Description" value={pe.description} onChange={v => { const p = [...pastEvents]; p[i] = { ...p[i], description: v }; setPastEvents(p); }} multiline />
                  </div>
                ))}
              </>
            )}

            {landingSection === 'about' && (
              <>
                <h2 className="admin-cms-section-title">ℹ️ About Section</h2>
                <Field label="Section Heading" value={about.heading} onChange={v => setAbout({ ...about, heading: v })} />
                <Field label="Body Paragraph" value={about.body} onChange={v => setAbout({ ...about, body: v })} multiline />
              </>
            )}

            {landingSection === 'footer' && (
              <>
                <h2 className="admin-cms-section-title">🔻 Footer</h2>
                <Field label="Organization Name" value={footer.orgName} onChange={v => setFooter({ ...footer, orgName: v })} />
                <Field label="Address (use \\n for line break)" value={footer.address} onChange={v => setFooter({ ...footer, address: v })} multiline />
                <Field label="Tagline" value={footer.tagline} onChange={v => setFooter({ ...footer, tagline: v })} multiline />
                <Field label="Facebook URL" value={footer.facebook} onChange={v => setFooter({ ...footer, facebook: v })} />
                <Field label="Instagram URL" value={footer.instagram} onChange={v => setFooter({ ...footer, instagram: v })} />
              </>
            )}

            {landingSection === 'branding' && (
              <>
                <h2 className="admin-cms-section-title">🎨 Branding</h2>
                <div className="admin-two-col-grid">
                  <div>
                    <label className="admin-cms-field-label">Primary Color</label>
                    <div className="admin-cms-color-row">
                      <input type="color" value={branding.primaryColor} onChange={e => setBranding({ ...branding, primaryColor: e.target.value })} className="admin-cms-color-picker" />
                      <input type="text" value={branding.primaryColor} onChange={e => setBranding({ ...branding, primaryColor: e.target.value })} className="admin-cms-color-text" />
                    </div>
                  </div>
                  <div>
                    <label className="admin-cms-field-label">Button Text Color</label>
                    <div className="admin-cms-color-row">
                      <input type="color" value={branding.primaryTextColor} onChange={e => setBranding({ ...branding, primaryTextColor: e.target.value })} className="admin-cms-color-picker" />
                      <input type="text" value={branding.primaryTextColor} onChange={e => setBranding({ ...branding, primaryTextColor: e.target.value })} className="admin-cms-color-text" />
                    </div>
                  </div>
                </div>
                <div className="admin-cms-range-wrap">
                  <label className="admin-cms-field-label">Button Border Radius (px)</label>
                  <input type="range" min="0" max="30" value={parseInt(branding.btnRadius)} onChange={e => setBranding({ ...branding, btnRadius: `${e.target.value}px` })} className="admin-cms-range" />
                  <div className="admin-cms-range-value">{branding.btnRadius}</div>
                </div>
              </>
            )}

            {landingSection === 'images' && (
              <>
                <h2 className="admin-cms-section-title">🖼️ Images</h2>
                <div className="admin-cms-img-grid">
                  {(Object.keys(images) as (keyof ImagesSettings)[]).map(key => (
                    <div key={key} className="admin-hair-col">
                      <label className="admin-cms-field-label">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <div className="admin-cms-img-preview">
                        {images[key] ? (
                          <img src={images[key]} alt={key} className="admin-cms-img-preview-img" />
                        ) : (
                          <i className="bx bx-image admin-cms-img-placeholder-icon"></i>
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        id={`upload-${key}`} 
                        className="admin-hidden" 
                        onChange={e => e.target.files?.[0] && handleImageUpload(key, e.target.files[0])}
                      />
                      <div className="admin-cms-upload-row">
                        <button 
                          onClick={() => document.getElementById(`upload-${key}`)?.click()} 
                          disabled={uploadingKey === key}
                          className="admin-cms-upload-btn"
                        >
                          {uploadingKey === key ? 'Uploading...' : 'Change'}
                        </button>
                        <button 
                          onClick={() => setImages(prev => ({ ...prev, [key]: '' }))}
                          className="admin-cms-clear-btn"
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

            {landingSection === 'partners' && (
              <>
                <h2 className="admin-cms-section-title">🤝 Landing Page Partners</h2>
                <p style={{ fontSize: '0.85rem', color: '#78716C', marginBottom: '1.5rem' }}>
                  Manage partner logos displayed on the landing page carousel. Add, remove, or reorder your partners.
                </p>
                {partnerLogos.map((partner, i) => (
                  <div key={i} className="admin-cms-item-card" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p className="admin-cms-item-label">Partner {i + 1}</p>
                      {partnerLogos.length > 1 && (
                        <button
                          onClick={() => removePartnerLogo(i)}
                          className="admin-cms-clear-btn"
                          title="Remove this partner"
                          style={{ color: '#ef4444' }}
                        >
                          <i className='bx bx-trash'></i>
                        </button>
                      )}
                    </div>
                    <Field label="Partner Name" value={partner.name} onChange={v => updatePartnerLogo(i, 'name', v)} />
                    <div className="admin-cms-img-preview" style={{ height: 140, marginTop: '0.5rem' }}>
                      {partner.url ? (
                        <img src={partner.url} alt={partner.name} className="admin-cms-img-preview-img" />
                      ) : (
                        <i className="bx bx-image admin-cms-img-placeholder-icon"></i>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      id={`upload-partner-${i}`}
                      className="admin-hidden"
                      onChange={e => e.target.files?.[0] && handlePartnerLogoUpload(i, e.target.files[0])}
                    />
                    <div className="admin-cms-upload-row" style={{ marginTop: '0.5rem' }}>
                      <button
                        onClick={() => document.getElementById(`upload-partner-${i}`)?.click()}
                        disabled={uploadingKey === `partner-${i}`}
                        className="admin-cms-upload-btn"
                      >
                        {uploadingKey === `partner-${i}` ? 'Uploading...' : 'Change Image'}
                      </button>
                      <button
                        onClick={() => updatePartnerLogo(i, 'url', '')}
                        className="admin-cms-clear-btn"
                        title="Clear image"
                      >
                        <i className='bx bx-undo'></i>
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addPartnerLogo}
                  className="admin-btn-primary-full"
                  style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <i className='bx bx-plus'></i> Add New Partner
                </button>
              </>
            )}

            {landingSection === 'typography' && (
              <>
                <h2 className="admin-cms-section-title">🔡 Typography</h2>
                <div className="admin-cms-font-grid">
                  <div>
                    <label className="admin-cms-field-label">Headings Font</label>
                    <select 
                      value={typography.headingFont} 
                      onChange={e => setTypography({ ...typography, headingFont: e.target.value })}
                      className="admin-cms-font-select" style={{ fontFamily: typography.headingFont }}
                    >
                      {GOOGLE_FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="admin-cms-field-label">Body Font</label>
                    <select 
                      value={typography.bodyFont} 
                      onChange={e => setTypography({ ...typography, bodyFont: e.target.value })}
                      className="admin-cms-font-select" style={{ fontFamily: typography.bodyFont }}
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
        <div className="admin-sidebar-layout">
          <article className="admin-card-rounded">
            <h2 className="admin-card-subtitle"><i className='bx bx-news'></i> Published Announcements</h2>
            <div className="table-wrap">
              <table className="admin-table">
                <thead><tr><th>Title</th><th>Category</th><th>Audience</th><th>Author</th><th>Date</th></tr></thead>
                <tbody>
                  {announcements.map(a => {
                    const audienceMap: Record<string, string> = { all: 'All Users', donor: 'Donors', recipient: 'Recipients', staff: 'Staff' };
                    const audienceLabel = audienceMap[a.targetAudience ?? 'all'] ?? 'All Users';
                    return (
                    <tr key={a.id}>
                      <td><strong>{a.title}</strong></td>
                      <td>{a.category}</td>
                      <td>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: '#fdf2f8', color: '#ad246d', border: '1px solid #f9cde8' }}>
                          {audienceLabel}
                        </span>
                      </td>
                      <td>{a.author}</td>
                      <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
          <aside>
            <article className="admin-card-rounded">
              <h3 className="admin-cms-card-title">New Announcement</h3>
              <form onSubmit={handleCreateAnnouncement} className="admin-form-grid">
                <div className="form-group">
                  <label className="admin-form-label-sm">Title</label>
                  <input type="text" value={announcementForm.title} onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="admin-form-label-sm">Category</label>
                  <select value={announcementForm.category} onChange={e => setAnnouncementForm({...announcementForm, category: e.target.value})}>
                    <option value="Care">Wig Care</option>
                    <option value="Styling">Styling</option>
                    <option value="Advocacy">Advocacy</option>
                    <option value="Update">System Update</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="admin-form-label-sm">Target Audience</label>
                  <select value={announcementForm.target_audience} onChange={e => setAnnouncementForm({...announcementForm, target_audience: e.target.value})}>
                    <option value="all">All Users</option>
                    <option value="donor">Donors Only</option>
                    <option value="recipient">Recipients Only</option>
                    <option value="staff">Staff Only</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="admin-form-label-sm">Content</label>
                  <textarea rows={5} value={announcementForm.content} onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})} required></textarea>
                </div>
                <button type="submit" disabled={isSubmitting} className="admin-btn-primary-full">
                  {isSubmitting ? 'Publishing...' : 'Publish'}
                </button>
              </form>
            </article>
          </aside>
        </div>
      )}

      {activeTab === 'partnerships' && (
        <div className="admin-sidebar-layout">
          <article className="admin-card-rounded">
            <h2 className="admin-card-subtitle"><i className='bx bx-briefcase'></i> Active Partnerships</h2>
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
            <article className="admin-card-rounded">
              <h3 className="admin-cms-card-title">New Partnership</h3>
              <form onSubmit={handleCreatePartnership} className="admin-form-grid">
                <div className="form-group">
                  <label className="admin-form-label-sm">Organization Name</label>
                  <input type="text" value={partnershipForm.name} onChange={e => setPartnershipForm({...partnershipForm, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="admin-form-label-sm">Type</label>
                  <input type="text" value={partnershipForm.type} onChange={e => setPartnershipForm({...partnershipForm, type: e.target.value})} placeholder="e.g. Wigmaker, Logistics" />
                </div>
                <div className="form-group">
                  <label className="admin-form-label-sm">Email / Contact</label>
                  <input type="text" value={partnershipForm.email} onChange={e => setPartnershipForm({...partnershipForm, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="admin-form-label-sm">Status</label>
                  <select value={partnershipForm.status} onChange={e => setPartnershipForm({...partnershipForm, status: e.target.value})}>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <button type="submit" disabled={isSubmitting} className="admin-btn-primary-full">
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
