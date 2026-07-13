import toast from 'react-hot-toast';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../styles/Admin.css';
import apiClient from '../api/client';
import ConfirmModal from '../components/ConfirmModal';
import PageLoader from '../components/PageLoader';

interface ExtendedHeroSettings { heading: string; subheading: string; ctaLabel: string; ghostLabel: string; pillText: string; floatBadgeText: string }
interface ServiceItem { title: string; description: string; ctaLabel: string }
interface AboutSettings { heading: string; body: string }
interface ExtendedFooterSettings { orgName: string; address: string; facebook: string; instagram: string; tagline: string }
interface BrandingSettings { primaryColor: string; primaryTextColor: string; btnRadius: string }
interface ImagesSettings { heroLogo: string; aboutImg1: string; aboutImg2: string; partnerLogo1: string; partnerLogo2: string; partnerLogo3: string; eventImg1: string; eventImg2: string; eventImg3: string; eventImg4: string }
interface TypographySettings { headingFont: string; bodyFont: string }

const GOOGLE_FONTS = ['Inter', 'Poppins', 'Manrope', 'Nunito', 'Lato', 'Roboto', 'Playfair Display', 'Merriweather', 'Raleway', 'Montserrat'];

// Selectable announcement audiences. An empty selection means "everyone".
const AUDIENCE_OPTIONS = [
  { value: 'donor', label: 'Donors' },
  { value: 'recipient', label: 'Recipients' },
  { value: 'staff', label: 'Staff' },
  { value: 'wigmaker', label: 'Wigmakers' },
];
const AUDIENCE_LABELS: Record<string, string> = { donor: 'Donors', recipient: 'Recipients', staff: 'Staff', wigmaker: 'Wigmakers' };

// Renders a stored targetAudience (comma-separated roles, or a legacy single
// value) into a human label for the published list.
const formatAudience = (raw?: string | null): string => {
  if (!raw || raw === 'all') return 'All Users';
  if (raw === 'donor_recipient') return 'Donors & Recipients';
  const roles = raw.split(',').map(r => r.trim()).filter(Boolean);
  if (roles.length === 0 || roles.length >= AUDIENCE_OPTIONS.length) return 'All Users';
  return roles.map(r => AUDIENCE_LABELS[r] || r).join(', ');
};

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

/**
 * Rich-text field for content that renders as HTML on the landing page.
 * Admins format text with toolbar buttons instead of typing tags like
 * <br> or <em>. The stored value is still HTML so the landing page renders
 * it unchanged.
 */
const RichField: React.FC<{ label: string; value: string; onChange: (v: string) => void; hint?: string }> = ({ label, value, onChange, hint }) => {
  const ref = useRef<HTMLDivElement>(null);

  // Sync external value changes (e.g. async CMS load, or reset-to-defaults)
  // into the editor, but skip while the admin is actively typing in it —
  // otherwise re-writing innerHTML would reset the caret to the start.
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerHTML !== (value || '')) {
      el.innerHTML = value || '';
    }
  }, [value]);

  const sync = () => { if (ref.current) onChange(ref.current.innerHTML); };

  // Toggle a formatting tag (e.g. strong, em) on the current selection. If the
  // selection already sits inside that tag, the tag is removed (un-format);
  // otherwise the selection is wrapped. No-op if nothing is selected.
  const toggle = (tag: string) => {
    const editor = ref.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);

    // Walk up from a node to find an ancestor matching `tag`, stopping at the
    // editor root.
    const findTagAncestor = (node: Node | null): HTMLElement | null => {
      let n: Node | null = node;
      while (n && n !== editor) {
        if (n.nodeType === 1 && (n as HTMLElement).tagName.toLowerCase() === tag) return n as HTMLElement;
        n = n.parentNode;
      }
      return null;
    };

    // Consider the selection "already formatted" if any of its boundary nodes
    // (or their common ancestor) sits inside the tag. Selection boundaries land
    // on different nodes depending on how the text was selected, so we check
    // several points rather than requiring an exact match.
    const existing =
      findTagAncestor(range.commonAncestorContainer) ||
      findTagAncestor(range.startContainer) ||
      findTagAncestor(range.endContainer);

    if (existing) {
      // Unwrap it (remove formatting) — replace the tag element with its
      // children in place.
      const parent = existing.parentNode;
      if (parent) {
        while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
        parent.removeChild(existing);
        parent.normalize();
      }
    } else {
      // Wrap the selection in the tag (add formatting).
      const wrapper = document.createElement(tag);
      wrapper.appendChild(range.extractContents());
      range.insertNode(wrapper);
    }

    sel.removeAllRanges();
    editor.focus();
    sync();
  };

  const insertBreak = () => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    const br = document.createElement('br');
    if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(br);
      range.setStartAfter(br);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      el.appendChild(br);
    }
    sync();
  };

  return (
    <div className="admin-cms-field">
      <label className="admin-cms-field-label">{label}</label>
      <div className="admin-rt-toolbar">
        <button type="button" className="admin-rt-btn" title="Bold — select text to add or remove"
          onMouseDown={e => e.preventDefault()} onClick={() => toggle('strong')}><b>Bold</b></button>
        <button type="button" className="admin-rt-btn" title="Italic — select text to add or remove"
          onMouseDown={e => e.preventDefault()} onClick={() => toggle('em')}><em>Italic</em></button>
        <button type="button" className="admin-rt-btn" title="Insert a line break"
          onMouseDown={e => e.preventDefault()} onClick={insertBreak}>↵ Line break</button>
      </div>
      <div
        ref={ref}
        className="admin-cms-input admin-rt-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
      />
      <p className="admin-rt-hint">{hint || 'Select text, then use the buttons above to format it — no code needed.'}</p>
    </div>
  );
};

const AdminCMS: React.FC = () => {
  type TabType = 'landing' | 'announcements' | 'partnerships';
  const [activeTab, setActiveTab] = useState<TabType>('landing');

  type LandingSection = 'hero' | 'services' | 'about' | 'footer' | 'branding' | 'images' | 'partners' | 'typography' | 'pastEvents';
  const [landingSection, setLandingSection] = useState<LandingSection>('hero');
  const [hero, setHero] = useState<ExtendedHeroSettings>({ heading: '', subheading: '', ctaLabel: '', ghostLabel: '', pillText: '', floatBadgeText: '' });

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
  const [about, setAbout] = useState<AboutSettings>({ heading: '', body: '' });
  const [footer, setFooter] = useState<ExtendedFooterSettings>({ orgName: '', address: '', facebook: '', instagram: '', tagline: '' });
  const [branding, setBranding] = useState<BrandingSettings>({ primaryColor: '#ad246d', primaryTextColor: '#ffffff', btnRadius: '8px' });
  const [images, setImages] = useState<ImagesSettings>({ heroLogo: '', aboutImg1: '', aboutImg2: '', partnerLogo1: '', partnerLogo2: '', partnerLogo3: '', eventImg1: '', eventImg2: '', eventImg3: '', eventImg4: '' });
  const [typography, setTypography] = useState<TypographySettings>({ headingFont: 'Playfair Display', bodyFont: 'Inter' });
  const [partnerLogos, setPartnerLogos] = useState<{ name: string, url: string }[]>([]);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  // Existing CMS state
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', category: 'Care', author: 'Admin', target_audience: [] as string[] });
  const [partnershipForm, setPartnershipForm] = useState({ name: '', type: 'Wigmaker', contact: '', email: '', description: '', status: 'Active' });

  const [showLandingConfirm, setShowLandingConfirm] = useState(false);
  const [showAnnouncementConfirm, setShowAnnouncementConfirm] = useState(false);
  const [showPartnershipConfirm, setShowPartnershipConfirm] = useState(false);
  const [showPartnerEditConfirm, setShowPartnerEditConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Announcements selection / deletion state
  const [selectedAnns, setSelectedAnns] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Partnerships selection / deletion state
  const [selectedPartners, setSelectedPartners] = useState<number[]>([]);
  const [showPartnerDeleteConfirm, setShowPartnerDeleteConfirm] = useState(false);
  const [isPartnerDeleting, setIsPartnerDeleting] = useState(false);

  // Partnership detail / edit state
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', type: '', contact: '', email: '', description: '', status: '' });
  const [editSaving, setEditSaving] = useState(false);

  const DEFAULTS = {
    hero: { heading: 'Every Strand,<br />a Story of <em>Hope.</em>', subheading: 'Supporting cancer patients through hair donation, wig crafting, and compassionate community.', ctaLabel: 'Donate Your Hair', ghostLabel: 'Request a Wig', pillText: 'Strand Up for Cancer', floatBadgeText: '100% Free for Patients' },

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
    about: { heading: 'About Us', body: 'Strand Up for Cancer (SUFC) is a youth-led initiative dedicated to supporting cancer patients through hair donation and wig crafting. Our mission is to provide high-quality wigs to those experiencing hair loss, restoring their confidence and dignity during their recovery journey.' },
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
      setSelectedAnns([]);
      setPartnerships(partRes.data);
      setSelectedPartners([]);
      const s = settingsRes.data;

      setHero(s.hero ? { ...DEFAULTS.hero, ...s.hero } : DEFAULTS.hero);
      setServices(s.services ?? DEFAULTS.services);
      setServicesHeader(s.servicesHeader ? { ...DEFAULTS.servicesHeader, ...s.servicesHeader } : DEFAULTS.servicesHeader);
      setPastEventsHeader(s.pastEventsHeader ? { ...DEFAULTS.pastEventsHeader, ...s.pastEventsHeader } : DEFAULTS.pastEventsHeader);
      setPastEvents(s.pastEvents ?? DEFAULTS.pastEvents);
      setAbout(s.about ? { ...DEFAULTS.about, ...s.about } : DEFAULTS.about);
      setFooter(s.footer ? { ...DEFAULTS.footer, ...s.footer } : DEFAULTS.footer);
      setBranding(s.branding ? { ...DEFAULTS.branding, ...s.branding } : DEFAULTS.branding);
      setTypography(s.typography ? { ...DEFAULTS.typography, ...s.typography } : DEFAULTS.typography);

      setImages({
        heroLogo: s.images?.heroLogo || DEFAULTS.images.heroLogo,
        aboutImg1: s.images?.aboutImg1 || DEFAULTS.images.aboutImg1,
        aboutImg2: s.images?.aboutImg2 || DEFAULTS.images.aboutImg2,
        partnerLogo1: s.images?.partnerLogo1 || DEFAULTS.images.partnerLogo1,
        partnerLogo2: s.images?.partnerLogo2 || DEFAULTS.images.partnerLogo2,
        partnerLogo3: s.images?.partnerLogo3 || DEFAULTS.images.partnerLogo3,
        eventImg1: s.images?.eventImg1 || DEFAULTS.images.eventImg1,
        eventImg2: s.images?.eventImg2 || DEFAULTS.images.eventImg2,
        eventImg3: s.images?.eventImg3 || DEFAULTS.images.eventImg3,
        eventImg4: s.images?.eventImg4 || DEFAULTS.images.eventImg4,
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
        { key: 'hero', value: hero },
        { key: 'services', value: services },
        { key: 'servicesHeader', value: servicesHeader },
        { key: 'pastEventsHeader', value: pastEventsHeader },
        { key: 'pastEvents', value: pastEvents },
        { key: 'about', value: about },
        { key: 'footer', value: footer },
        { key: 'branding', value: branding },
        { key: 'images', value: images },
        { key: 'typography', value: typography },
        { key: 'partnerLogos', value: partnerLogos },
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
        { key: 'hero', value: DEFAULTS.hero },
        { key: 'services', value: DEFAULTS.services },
        { key: 'servicesHeader', value: DEFAULTS.servicesHeader },
        { key: 'pastEventsHeader', value: DEFAULTS.pastEventsHeader },
        { key: 'pastEvents', value: DEFAULTS.pastEvents },
        { key: 'about', value: DEFAULTS.about },
        { key: 'footer', value: DEFAULTS.footer },
        { key: 'branding', value: DEFAULTS.branding },
        { key: 'images', value: DEFAULTS.images },
        { key: 'typography', value: DEFAULTS.typography },
        { key: 'partnerLogos', value: DEFAULTS.partnerLogos },
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
      setAnnouncementForm({ title: '', content: '', category: 'Care', author: 'Admin', target_audience: [] as string[] });
      fetchData();
    } catch (err) { console.error('Failed to create announcement', err); }
    finally { setIsSubmitting(false); }
  };

  const doDeleteAnnouncements = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      await apiClient.post('/internal-api/admin/announcements/bulk-delete', { ids: selectedAnns });
      toast.success('Successfully deleted selected announcements');
      setSelectedAnns([]);
      fetchData();
    } catch (err) {
      console.error('Failed to delete announcements', err);
      toast.error('Failed to delete selected announcements');
    } finally {
      setIsDeleting(false);
    }
  };

  const doDeletePartnerships = async () => {
    setShowPartnerDeleteConfirm(false);
    setIsPartnerDeleting(true);
    try {
      await apiClient.post('/internal-api/admin/partnerships/bulk-delete', { ids: selectedPartners });
      toast.success('Successfully deleted selected partnerships');
      setSelectedPartners([]);
      fetchData();
    } catch (err) {
      console.error('Failed to delete partnerships', err);
      toast.error('Failed to delete selected partnerships');
    } finally {
      setIsPartnerDeleting(false);
    }
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

  const openPartnerEdit = (p: any) => {
    setEditingPartner(p);
    setEditForm({ name: p.name || '', type: p.type || '', contact: p.contact || '', email: p.email || '', description: p.description || '', status: p.status || 'Active' });
  };

  const doPartnerEdit = async () => {
    if (!editingPartner) return;
    setShowPartnerEditConfirm(false);
    setEditSaving(true);
    try {
      await apiClient.put(`/internal-api/admin/partnerships/${editingPartner.id}`, editForm);
      toast.success('Partnership updated.');
      setEditingPartner(null);
      fetchData();
    } catch { toast.error('Failed to update.'); }
    finally { setEditSaving(false); }
  };

  const partnerStatusBadge = (status: string) => {
    const cfg: Record<string, { bg: string; color: string }> = {
      Active: { bg: '#d1fae5', color: '#065f46' },
      Pending: { bg: '#fef3c7', color: '#92400e' },
      Inactive: { bg: '#fee2e2', color: '#991b1b' },
    };
    const c = cfg[status] || { bg: '#f3f4f6', color: '#374151' };
    return (
      <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, background: c.bg, color: c.color }}>
        {status}
      </span>
    );
  };

  if (loading) return <PageLoader message="Loading CMS content..." />;

  return (
    <section className="section-wrap reveal active admin-page admin-page-pad">
      <header className="admin-cms-page-header">
        <p className="admin-page-kicker">Admin · CMS</p>
        <h1 className="admin-page-title">Content Management</h1>
        <p className="admin-page-subtitle">Edit landing page content, announcements, and partnerships.</p>
      </header>

      <div className="admin-cms-tab-row">
        <button onClick={() => setActiveTab('landing')} className={`admin-cms-page-tab${activeTab === 'landing' ? ' active' : ''}`}>Landing Page</button>
        <button onClick={() => setActiveTab('announcements')} className={`admin-cms-page-tab${activeTab === 'announcements' ? ' active' : ''}`}>Announcements</button>
        <button onClick={() => setActiveTab('partnerships')} className={`admin-cms-page-tab${activeTab === 'partnerships' ? ' active' : ''}`}>Partnerships</button>
      </div>

      {activeTab === 'landing' && (
        <div className="admin-cms-sidebar-grid">
          <aside className="admin-card-rounded admin-cms-sidebar-aside">
            <p className="admin-page-kicker">Sections</p>
            {(['hero', 'services', 'about', 'footer', 'branding', 'images', 'partners', 'typography', 'pastEvents'] as LandingSection[]).map(sec => (
              <button key={sec} onClick={() => setLandingSection(sec)} className={`admin-cms-section-pill${landingSection === sec ? ' active' : ''}`}>
                {{
                  hero: 'Hero',
                  services: 'How It Works',
                  about: 'About',
                  footer: 'Footer',
                  branding: 'Branding',
                  images: 'Images',
                  partners: 'Partners',
                  typography: 'Fonts',
                  pastEvents: 'Past Highlights'
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
                <h2 className="admin-cms-section-title">Hero Section</h2>
                <RichField label="Main Heading (H1)" value={hero.heading} onChange={v => setHero({ ...hero, heading: v })} />
                <Field label="Subheading / Tagline" value={hero.subheading} onChange={v => setHero({ ...hero, subheading: v })} />
                <Field label="Pill Text (Top Label)" value={hero.pillText} onChange={v => setHero({ ...hero, pillText: v })} />
                <Field label="Floating Badge Text (Bottom Right)" value={hero.floatBadgeText} onChange={v => setHero({ ...hero, floatBadgeText: v })} />
                <Field label="Primary CTA Label" value={hero.ctaLabel} onChange={v => setHero({ ...hero, ctaLabel: v })} />
                <Field label="Ghost CTA Label" value={hero.ghostLabel} onChange={v => setHero({ ...hero, ghostLabel: v })} />
              </>
            )}

            {landingSection === 'services' && (
              <>
                <h2 className="admin-cms-section-title">How It Works — Header & Cards</h2>
                <div className="admin-cms-item-card">
                  <p className="admin-cms-item-label">Section Header Info</p>
                  <Field label="Section Label" value={servicesHeader.label} onChange={v => setServicesHeader({ ...servicesHeader, label: v })} />
                  <RichField label="Section Heading" value={servicesHeader.heading} onChange={v => setServicesHeader({ ...servicesHeader, heading: v })} />
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
                <h2 className="admin-cms-section-title">Past Events Highlights</h2>
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
                <h2 className="admin-cms-section-title">About Section</h2>
                <Field label="Section Heading" value={about.heading} onChange={v => setAbout({ ...about, heading: v })} />
                <Field label="Body Paragraph" value={about.body} onChange={v => setAbout({ ...about, body: v })} multiline />
              </>
            )}

            {landingSection === 'footer' && (
              <>
                <h2 className="admin-cms-section-title">Footer</h2>
                <Field label="Organization Name" value={footer.orgName} onChange={v => setFooter({ ...footer, orgName: v })} />
                <Field label="Address (use \\n for line break)" value={footer.address} onChange={v => setFooter({ ...footer, address: v })} multiline />
                <Field label="Tagline" value={footer.tagline} onChange={v => setFooter({ ...footer, tagline: v })} multiline />
                <Field label="Facebook URL" value={footer.facebook} onChange={v => setFooter({ ...footer, facebook: v })} />
                <Field label="Instagram URL" value={footer.instagram} onChange={v => setFooter({ ...footer, instagram: v })} />
              </>
            )}

            {landingSection === 'branding' && (
              <>
                <h2 className="admin-cms-section-title">Branding</h2>
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

                {/* Live preview: reflects the picked colors on a mini landing hero
                    so admins see the effect before saving. */}
                <div className="admin-cms-preview">
                  <div className="admin-cms-preview-head">
                    <i className="bx bx-show" /> Live Preview — how it looks on the landing page
                  </div>
                  <div
                    className="admin-cms-preview-stage"
                    style={{ ['--pv-primary' as any]: branding.primaryColor }}
                  >
                    <span
                      className="admin-cms-pv-pill"
                      style={{ color: branding.primaryColor, borderColor: `${branding.primaryColor}55`, background: `${branding.primaryColor}14` }}
                    >
                      <span className="admin-cms-pv-dot" style={{ background: branding.primaryColor }} />
                      {hero.pillText || 'Strand Up for Cancer'}
                    </span>
                    <h3
                      className="admin-cms-pv-heading"
                      dangerouslySetInnerHTML={{ __html: hero.heading || 'Every Strand,<br />a Story of <em>Hope.</em>' }}
                    />
                    <p className="admin-cms-pv-copy">{hero.subheading || 'Supporting cancer patients through hair donation, wig crafting, and compassionate community.'}</p>
                    <div className="admin-cms-pv-btns">
                      <button
                        type="button"
                        className="admin-cms-pv-btn"
                        style={{ background: branding.primaryColor, color: branding.primaryTextColor, borderRadius: branding.btnRadius, border: 'none' }}
                      >
                        {hero.ctaLabel || 'Donate Your Hair'}
                      </button>
                      <button
                        type="button"
                        className="admin-cms-pv-btn"
                        style={{ background: 'transparent', color: branding.primaryColor, borderRadius: branding.btnRadius, border: `1.5px solid ${branding.primaryColor}` }}
                      >
                        {hero.ghostLabel || 'Request a Wig'}
                      </button>
                    </div>
                  </div>
                  <p className="admin-rt-hint">This is a preview only. Click “Save All” to apply these colors to the real landing page.</p>
                </div>
              </>
            )}

            {landingSection === 'images' && (
              <>
                <h2 className="admin-cms-section-title">Images</h2>
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
                <h2 className="admin-cms-section-title">Landing Page Partners</h2>
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
                <h2 className="admin-cms-section-title">Typography</h2>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2 className="admin-card-subtitle" style={{ margin: 0 }}><i className='bx bx-news'></i> Published Announcements</h2>
              {selectedAnns.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
                >
                  <i className='bx bx-trash' style={{ fontSize: '1rem' }}></i> Delete Selected ({selectedAnns.length})
                </button>
              )}
            </div>
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={announcements.length > 0 && selectedAnns.length === announcements.length}
                        onChange={() => {
                          if (selectedAnns.length === announcements.length) {
                            setSelectedAnns([]);
                          } else {
                            setSelectedAnns(announcements.map(a => a.id));
                          }
                        }}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Audience</th>
                    <th>Author</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                        No announcements published yet.
                      </td>
                    </tr>
                  ) : (
                    announcements.map(a => {
                      const audienceLabel = formatAudience(a.targetAudience);
                      const isSelected = selectedAnns.includes(a.id);
                      return (
                        <tr key={a.id} style={{ background: isSelected ? '#fff5f5' : 'transparent', transition: 'background 0.15s ease' }}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedAnns(prev =>
                                  prev.includes(a.id) ? prev.filter(id => id !== a.id) : [...prev, a.id]
                                );
                              }}
                              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                            />
                          </td>
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
                    })
                  )}
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
                  <input type="text" value={announcementForm.title} onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="admin-form-label-sm">Category</label>
                  <select value={announcementForm.category} onChange={e => setAnnouncementForm({ ...announcementForm, category: e.target.value })}>
                    <option value="Care">Wig Care</option>
                    <option value="Styling">Styling</option>
                    <option value="Advocacy">Advocacy</option>
                    <option value="Update">System Update</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="admin-form-label-sm">Target Audience</label>
                  <div className="admin-audience-checks">
                    {AUDIENCE_OPTIONS.map(opt => (
                      <label key={opt.value} className="admin-audience-check">
                        <input
                          type="checkbox"
                          checked={announcementForm.target_audience.includes(opt.value)}
                          onChange={e => {
                            const set = new Set(announcementForm.target_audience);
                            if (e.target.checked) set.add(opt.value); else set.delete(opt.value);
                            setAnnouncementForm({ ...announcementForm, target_audience: Array.from(set) });
                          }}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  <p className="admin-rt-hint">Leave all unchecked to send to everyone.</p>
                </div>
                <div className="form-group">
                  <label className="admin-form-label-sm">Content</label>
                  <textarea rows={5} value={announcementForm.content} onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })} required></textarea>
                </div>
                <button type="submit" disabled={isSubmitting} className="admin-btn-primary-full">
                  {isSubmitting ? 'Publishing...' : 'Publish'}
                </button>
              </form>
            </article>
          </aside>
        </div>
      )}

      {activeTab === 'partnerships' && (() => {
        const pendingInquiries = partnerships.filter(p => p.status === 'Pending');
        const otherPartners = partnerships.filter(p => p.status !== 'Pending');
        return (
          <div className="admin-sidebar-layout">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {selectedPartners.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowPartnerDeleteConfirm(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
                  >
                    <i className='bx bx-trash' style={{ fontSize: '1rem' }}></i> Delete Selected ({selectedPartners.length})
                  </button>
                </div>
              )}

              {/* ── Pending Inquiries ── */}
              {pendingInquiries.length > 0 && (
                <article className="admin-card-rounded" style={{ borderLeft: '4px solid #f59e0b' }}>
                  <h2 className="admin-card-subtitle" style={{ color: '#92400e' }}>
                    <i className='bx bx-time-five'></i> Pending Inquiries ({pendingInquiries.length})
                  </h2>
                  <div className="table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={pendingInquiries.length > 0 && pendingInquiries.every(p => selectedPartners.includes(p.id))}
                              onChange={() => {
                                const pendingIds = pendingInquiries.map(p => p.id);
                                const allPendingSelected = pendingIds.every(id => selectedPartners.includes(id));
                                if (allPendingSelected) {
                                  setSelectedPartners(prev => prev.filter(id => !pendingIds.includes(id)));
                                } else {
                                  setSelectedPartners(prev => [...new Set([...prev, ...pendingIds])]);
                                }
                              }}
                              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                            />
                          </th>
                          <th>Name</th>
                          <th>Organization / Type</th>
                          <th>Email</th>
                          <th>Status</th>
                          <th style={{ width: '32px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingInquiries.map(p => {
                          const isSelected = selectedPartners.includes(p.id);
                          return (
                            <tr key={p.id} style={{ cursor: 'pointer', background: isSelected ? '#fff5f5' : 'transparent', transition: 'background 0.15s ease' }} onClick={() => setSelectedPartner(p)}>
                              <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedPartners(prev =>
                                      prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                    );
                                  }}
                                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                />
                              </td>
                              <td><strong>{p.name}</strong></td>
                              <td>{p.type}</td>
                              <td>{p.email || p.contact || '—'}</td>
                              <td>{partnerStatusBadge(p.status)}</td>
                              <td style={{ color: '#d1d5db', fontSize: '1rem', textAlign: 'center' }}><i className='bx bx-chevron-right'></i></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </article>
              )}

              {}
              <article className="admin-card-rounded">
                <h2 className="admin-card-subtitle"><i className='bx bx-briefcase'></i> All Partnerships</h2>
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={otherPartners.length > 0 && otherPartners.every(p => selectedPartners.includes(p.id))}
                            onChange={() => {
                              const otherIds = otherPartners.map(p => p.id);
                              const allOtherSelected = otherIds.every(id => selectedPartners.includes(id));
                              if (allOtherSelected) {
                                setSelectedPartners(prev => prev.filter(id => !otherIds.includes(id)));
                              } else {
                                setSelectedPartners(prev => [...new Set([...prev, ...otherIds])]);
                              }
                            }}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </th>
                        <th>Partner</th>
                        <th>Type</th>
                        <th>Contact</th>
                        <th>Status</th>
                        <th style={{ width: '32px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {otherPartners.length === 0 && pendingInquiries.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No partnerships yet.</td></tr>
                      ) : (
                        otherPartners.map(p => {
                          const isSelected = selectedPartners.includes(p.id);
                          return (
                            <tr key={p.id} style={{ cursor: 'pointer', background: isSelected ? '#fff5f5' : 'transparent', transition: 'background 0.15s ease' }} onClick={() => setSelectedPartner(p)}>
                              <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedPartners(prev =>
                                      prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                    );
                                  }}
                                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                />
                              </td>
                              <td><strong>{p.name}</strong></td>
                              <td>{p.type}</td>
                              <td>{p.email || p.contact || '—'}</td>
                              <td>{partnerStatusBadge(p.status)}</td>
                              <td style={{ color: '#d1d5db', fontSize: '1rem', textAlign: 'center' }}><i className='bx bx-chevron-right'></i></td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>

            {}
            <aside>
              <article className="admin-card-rounded">
                <h3 className="admin-cms-card-title">New Partnership</h3>
                <form onSubmit={handleCreatePartnership} className="admin-form-grid">
                  <div className="form-group">
                    <label className="admin-form-label-sm">Organization Name</label>
                    <input type="text" value={partnershipForm.name} onChange={e => setPartnershipForm({ ...partnershipForm, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="admin-form-label-sm">Type</label>
                    <input type="text" value={partnershipForm.type} onChange={e => setPartnershipForm({ ...partnershipForm, type: e.target.value })} placeholder="e.g. Wigmaker, Logistics" />
                  </div>
                  <div className="form-group">
                    <label className="admin-form-label-sm">Email / Contact</label>
                    <input type="text" value={partnershipForm.email} onChange={e => setPartnershipForm({ ...partnershipForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="admin-form-label-sm">Status</label>
                    <select value={partnershipForm.status} onChange={e => setPartnershipForm({ ...partnershipForm, status: e.target.value })}>
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

            {}
            {selectedPartner && (
              <div
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'cmFadeIn 0.18s ease' }}
                onClick={() => setSelectedPartner(null)}
              >
                <div
                  style={{ background: '#fff', borderRadius: '16px', padding: '2rem', maxWidth: '520px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.25), 0 10px 20px rgba(0,0,0,0.12)', animation: 'adminModalPop 0.25s ease-out' }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1c1917' }}>{selectedPartner.name}</h3>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#78716c' }}>{selectedPartner.type} · {selectedPartner.email || selectedPartner.contact || '—'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {partnerStatusBadge(selectedPartner.status)}
                      <button onClick={() => setSelectedPartner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.25rem', lineHeight: 1 }}>×</button>
                    </div>
                  </div>
                  {selectedPartner.description && (
                    <div style={{ background: '#fafaf9', border: '1px solid #e7e5e4', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#44403c', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{selectedPartner.description}</p>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                      style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}
                      onClick={() => setSelectedPartner(null)}
                    >
                      Close
                    </button>
                    <button
                      style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#ad246d', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                      onClick={() => { openPartnerEdit(selectedPartner); setSelectedPartner(null); }}
                    >
                      <i className='bx bx-edit-alt'></i> Edit Status
                    </button>
                  </div>
                </div>
              </div>
            )}

            {}
            {editingPartner && (
              <div
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'cmFadeIn 0.18s ease' }}
                onClick={() => setEditingPartner(null)}
              >
                <div
                  style={{ background: '#fff', borderRadius: '16px', padding: '2rem', maxWidth: '440px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.25), 0 10px 20px rgba(0,0,0,0.12)', animation: 'adminModalPop 0.25s ease-out' }}
                  onClick={e => e.stopPropagation()}
                >
                  <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.05rem', fontWeight: 800 }}>Edit Partnership — {editingPartner.name}</h3>
                  <div className="admin-form-grid">
                    <div className="form-group">
                      <label className="admin-form-label-sm">Organization Name</label>
                      <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="admin-form-label-sm">Type</label>
                      <input type="text" value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="admin-form-label-sm">Email / Contact</label>
                      <input type="text" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="admin-form-label-sm">Status</label>
                      <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                    <button
                      style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}
                      onClick={() => setEditingPartner(null)}
                    >
                      Cancel
                    </button>
                    <button
                      style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#ad246d', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                      onClick={() => setShowPartnerEditConfirm(true)}
                      disabled={editSaving}
                    >
                      {editSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

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

      <ConfirmModal
        isOpen={showPartnerEditConfirm}
        onClose={() => setShowPartnerEditConfirm(false)}
        onConfirm={doPartnerEdit}
        title="Save Changes"
        message={`Save changes to ${editingPartner?.name || 'this partnership'}?`}
        confirmText="Yes, Save Changes"
        isConfirming={editSaving}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={doDeleteAnnouncements}
        variant="danger"
        title="Delete Announcements"
        message={`Are you sure you want to permanently delete the ${selectedAnns.length} selected announcement${selectedAnns.length > 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Yes, Delete"
        isConfirming={isDeleting}
      />

      <ConfirmModal
        isOpen={showPartnerDeleteConfirm}
        onClose={() => setShowPartnerDeleteConfirm(false)}
        onConfirm={doDeletePartnerships}
        variant="danger"
        title="Delete Partnerships"
        message={`Are you sure you want to permanently delete the ${selectedPartners.length} selected partnership${selectedPartners.length > 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Yes, Delete"
        isConfirming={isPartnerDeleting}
      />
    </section>
  );
};

export default AdminCMS;
