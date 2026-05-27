import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

const LandingPage: React.FC = () => {
  const [partnershipData, setPartnershipData] = useState({
    full_name: '',
    email: '',
    phone: '',
    organization: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // CMS & Dynamic Content State
  const [cms, setCms] = useState<any>(null);
  const [aboutIndex, setAboutIndex] = useState(0);
  const [partnerIndex, setPartnerIndex] = useState(0);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const fetchCMS = async () => {
      try {
        const res = await apiClient.get('/api/public/site-settings');
        setCms(res.data);
      } catch (err) {
        console.error('Failed to fetch CMS data', err);
      }
    };
    const fetchNextEvent = async () => {
      try {
        const res = await apiClient.get('/api/public/events/next');
        if (res.data) setNextEvent(res.data);
      } catch (err) {
        console.error('Failed to fetch next event', err);
      }
    };
    fetchCMS();
    fetchNextEvent();
  }, []);

  useEffect(() => {
    if (!nextEvent) return;
    const eventDate = new Date(nextEvent.date).getTime();
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = eventDate - now;
      if (distance < 0) {
        clearInterval(timer);
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setCountdown({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [nextEvent]);

  // Intersection Observer for "reveal" animation
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Auto-slides
  useEffect(() => {
    const pInt = setInterval(() => setPartnerIndex(prev => (prev + 1) % 2), 3000);
    const aInt = setInterval(() => setAboutIndex(prev => (prev + 1) % 2), 5000);
    return () => { clearInterval(pInt); clearInterval(aInt); };
  }, []);

  const handlePartnershipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/internal-api/partnerships', partnershipData);
      alert('Thank you! Your partnership inquiry has been received.');
      setPartnershipData({ full_name: '', email: '', phone: '', organization: '', message: '' });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to get CMS value with fallback
  const get = (key: string, field?: string, fallback?: any) => {
    if (!cms || !cms[key]) return fallback;
    if (field) return cms[key][field] ?? fallback;
    return cms[key] ?? fallback;
  };

  const footerDefault = {
    orgName: 'STRAND UP FOR CANCER',
    address: 'Manila Downtown YMCA at 945 Sabino Padilla St,\nBinondo, Manila, 1006 Metro Manila',
    facebook: 'https://www.facebook.com/strandupforcancer',
    instagram: 'https://www.instagram.com/strandupforcancer/'
  };
  const footer = { ...footerDefault, ...(cms?.footer || {}) };
  const branding = cms?.branding || { primaryColor: '#ad246d', primaryTextColor: '#ffffff', btnRadius: '8px' };
  const images = cms?.images || {};
  const typo = cms?.typography || { headingFont: 'Playfair Display', bodyFont: 'Inter' };

  const themeStyles = `
    :root {
      --primary: ${branding.primaryColor};
      --on-primary: ${branding.primaryTextColor};
      --radius: ${branding.btnRadius};
      --font-heading: "${typo.headingFont}", serif;
      --font-body: "${typo.bodyFont}", sans-serif;
    }
    h1, h2, h3, .brand span { font-family: var(--font-heading) !important; }
    body, p, span, a, button, input, textarea { font-family: var(--font-body) !important; }
    .btn { border-radius: var(--radius) !important; }
    .btn-primary { background: var(--primary) !important; color: var(--on-primary) !important; }
    .btn-outline { border-color: var(--primary) !important; color: var(--primary) !important; }
    .hero h1, .section-heading h2, .footer-brand h3 { color: var(--primary); }

    .pink-ribbon-text { color: var(--primary); }
    .footer-social-links { margin-top: 1rem; }
    .footer-social-links p { margin-bottom: 0.5rem; font-weight: 600; }
    .footer-social-row { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    .footer-social-link { display: inline-flex; align-items: center; gap: 0.65rem; padding: 0.8rem 1.1rem; border-radius: 999px; color: #fff; text-decoration: none; transition: transform 0.2s ease, filter 0.2s ease; box-shadow: 0 10px 25px rgba(0,0,0,0.12); }
    .footer-social-link:hover { transform: translateY(-1px); filter: brightness(1.05); }
    .footer-social-link i { font-size: 1.05rem; }
    .footer-social-facebook { background: #1877f2; }
    .footer-social-instagram { background: radial-gradient(circle at 30% 30%, #feda75 0%, #f58529 25%, #dd2a7b 50%, #8134af 75%, #515bd4 100%); }
  `;

  return (
    <div className="landing-root">
      <style>{themeStyles}</style>
      <header className="site-header" id="home">
        <nav className="navbar">
          <Link to="/" className="brand">
            <img src="/assets/images/landing/pink-ribbon.png" alt="HairLink ribbon" className="brand-ribbon" />
            <span>HairLink</span>
          </Link>
          <div className="menu">
            <a href="#home">Home</a>
            <a href="#services">How It Works</a>
            <a href="#about">About</a>
            <a href="#partners">Partnership</a>
            <a href="#contact">Contact</a>
            <div className="auth-actions">
              <Link to="/login" className="btn btn-outline">Login</Link>
              <Link to="/register" className="btn btn-primary">Register</Link>
            </div>
          </div>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-inner reveal">
          <div className="hero-logo-wrap">
            <img src={images.heroLogo || "/assets/images/landing/logo.jpg"} alt="Logo" className="hero-logo" />
          </div>
          <h1>{get('hero', 'heading', 'STRAND UP FOR CANCER')}</h1>
          <p className="hero-copy">{get('hero', 'subheading', 'Hope begins, one at the time')}</p>
          <div className="hero-actions">
            <Link to="/donor/donate" className="btn btn-primary">{get('hero', 'ctaLabel', 'Donate Now')}</Link>
          </div>

        </div>
      </section>

      <section className="services section" id="services">
        <div className="section-heading reveal">
          <h2>How It Works</h2>
          <p>Whether you want to donate or receive, we make the process simple and transparent.</p>
        </div>
        <div className="service-grid">
          {(get('services', undefined, []) as any[]).map((svc, i) => (
            <article key={i} className="service-card reveal">
              <h3>{svc.title}</h3>
              <p>{svc.description}</p>
              <Link to={i === 0 ? "/donor/donate" : i === 1 ? "/recipient/request" : "/donate-monetary"} className="btn btn-outline">{svc.ctaLabel}</Link>
            </article>
          )) || (
              <>
                <article className="service-card reveal"><h3>Donate Hair</h3><p>Give the gift of confidence to someone in need by donating your hair.</p><Link to="/donor/donate" className="btn btn-outline">Donate</Link></article>
                <article className="service-card reveal"><h3>Request Hair</h3><p>Apply for free wig with health certification.</p><Link to="/recipient/request" className="btn btn-outline">Request</Link></article>
                <article className="service-card reveal"><h3>Monetary</h3><p>Support our mission financially and earn reward points.</p><Link to="/donate-monetary" className="btn btn-outline">Give</Link></article>
              </>
            )}
        </div>

        <section className="event-panel-premium-compact reveal">
          <div className="premium-compact-inner">
            <div className="event-badge">
              <i className='bx bx-calendar'></i> {nextEvent
                ? `${new Date(nextEvent.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} | ${nextEvent.location}`
                : 'No upcoming events scheduled'}
            </div>
            <h2 className="event-title-serif-compact">{nextEvent ? nextEvent.title : 'Hearts of Hope Gala'}</h2>
            <div className="premium-countdown-mini">
              {['days', 'hours', 'minutes', 'seconds'].map(unit => (
                <React.Fragment key={unit}>
                  <div className="mini-count-item">
                    <div className="mini-box"><span>{(countdown as any)[unit].toString().padStart(2, '0')}</span></div>
                    <small>{unit.charAt(0).toUpperCase() + unit.slice(1, unit === 'minutes' ? 3 : 4)}</small>
                  </div>
                  {unit !== 'seconds' && <div className="mini-sep">:</div>}
                </React.Fragment>
              ))}
            </div>
            <Link to="/donate-monetary" className="premium-donate-btn-mini"><i className='bx bxs-heart'></i> Donate Now</Link>
          </div>
        </section>
      </section>

      <section className="about section" id="about">
        <div className="about-block reveal">
          <div className="about-hero-image">
            <div className="slider-track" style={{ transform: `translateX(-${aboutIndex * 100}%)` }}>
              <img src={images.aboutImg1 || "/assets/images/landing/sufc-team.jpg"} alt="Team" />
              <img src={images.aboutImg2 || "/assets/images/landing/sufc-team2.jpg"} alt="Team" />
            </div>
          </div>
          <div className="about-copy">
            <h2>{get('about', 'heading', 'About Us')} <img src="/assets/images/landing/pink-ribbon.png" alt="Pink ribbon" /></h2>
            <p>{get('about', 'body', 'Stand Up for Cancer is an MDYMCA Youth Club-sponsored project dedicated to helping financially disadvantaged women suffering from long-term hair loss caused by chemotherapy. We aim to inspire hope, raise awareness, and encourage community support for cancer patients and survivors.')}</p>
          </div>
        </div>
        <section className="partners" id="partners">
          <div className="section-heading reveal"><h2>Partnership</h2></div>
          <div className="partners-slider reveal">
            <div className="slider-track" style={{ transform: `translateX(-${partnerIndex * 100}%)` }}>
              <img src={images.partnerLogo1 || "/assets/images/landing/pgh.png"} alt="PGH" />
              <img src={images.partnerLogo2 || "/assets/images/landing/wigmaker.png"} alt="Wigmaker" />
            </div>
          </div>
        </section>
      </section>

      <section className="past-events section" id="past-events">
        <div className="section-heading reveal">
          <h2>Past Events</h2>
          <p>Highlighting our past hair donation drives, volunteer campaigns, and community impact.</p>
        </div>
        <div className="events-grid">
          <div className="event-card reveal">
            <div className="event-img-wrap">
              <img src={images.eventImg1 || "/assets/images/landing/past-event-1.jpg"} alt="Hair Donation Drive" />
              <div className="event-date">April 28, 2026</div>
            </div>
            <div className="event-info">
              <h3>Hair Donation Drive</h3>
              <p>Generous donor sharing hope by gifting her locks for wig crafting at Tau Lambda Alpha, Los Baños.</p>
            </div>
          </div>

          <div className="event-card reveal">
            <div className="event-img-wrap">
              <img src={images.eventImg2 || "/assets/images/landing/past-event-2.jpg"} alt="Strand Up for Cancer Campaign" />
              <div className="event-date">April 28, 2026</div>
            </div>
            <div className="event-info">
              <h3>Strand Up for Cancer Campaign</h3>
              <p>Community hair donation drive with our lovely volunteers and donors presenting their certificates.</p>
            </div>
          </div>

          <div className="event-card reveal">
            <div className="event-img-wrap">
              <img src={images.eventImg3 || "/assets/images/landing/past-event-3.jpg"} alt="Wig Crafting & Haircut Session" />
              <div className="event-date">Feb 25, 2026</div>
            </div>
            <div className="event-info">
              <h3>Wig Crafting & Haircut Session</h3>
              <p>Professional stylists volunteering to cut and measure hair for custom medical-grade wigs.</p>
            </div>
          </div>

          <div className="event-card reveal">
            <div className="event-img-wrap">
              <img src={images.eventImg4 || "/assets/images/landing/past-event-4.jpg"} alt="Donation Celebration" />
              <div className="event-date">Feb 2, 2026</div>
            </div>
            <div className="event-info">
              <h3>Donation Celebration</h3>
              <p>Donors showcasing their ponytails alongside certificates of appreciation for supporting cancer survivors.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="contact section" id="contact">
        <div className="contact-card reveal">
          <div className="section-heading section-heading-left">
            <h2>Want to partner with us?</h2>
            <p>Let's connect and grow together!</p>
          </div>
          <form className="contact-form" onSubmit={handlePartnershipSubmit}>
            <div className="form-row">
              <input type="text" placeholder="Full Name" value={partnershipData.full_name} onChange={e => setPartnershipData({ ...partnershipData, full_name: e.target.value })} required />
              <input type="email" placeholder="Email" value={partnershipData.email} onChange={e => setPartnershipData({ ...partnershipData, email: e.target.value })} required />
            </div>
            <input type="text" placeholder="Company Name" value={partnershipData.organization} onChange={e => setPartnershipData({ ...partnershipData, organization: e.target.value })} />
            <textarea placeholder="Message" rows={4} value={partnershipData.message} onChange={e => setPartnershipData({ ...partnershipData, message: e.target.value })} required></textarea>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Submit'}</button>
          </form>
        </div>
      </section>
      <footer className="site-footer">
        <div className="footer-container">
          {/* Social Icons at the top */}
          <div className="footer-social-row">
            <a href={footer.facebook} target="_blank" rel="noreferrer" className="footer-social-link footer-social-facebook" title="Facebook">
              <i className='bx bxl-facebook'></i>
            </a>
            <a href={footer.instagram} target="_blank" rel="noreferrer" className="footer-social-link footer-social-instagram" title="Instagram">
              <i className='bx bxl-instagram'></i>
            </a>
          </div>

          {/* Address (vertical design) */}
          <div className="footer-address">
            <p style={{ whiteSpace: 'pre-line' }}>{footer.address.replace(/\\n/g, '\n')}</p>
          </div>

          {/* Logo & Brand Name */}
          <div className="footer-logo-wrap">
            <img src="/assets/images/landing/logo.jpg" alt="HairLink logo" className="footer-logo-img" />
            <h3 className="footer-brand-title">{get('footer', 'orgName', 'STRAND UP FOR CANCER')}</h3>
          </div>

          {/* Copyright Bar at the absolute bottom */}
          {/* Copyright Bar at the absolute bottom */}
          <div className="footer-bottom-bar">
            <p>&copy; 2013 {get('footer', 'orgName', 'STRAND UP FOR CANCER')}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
