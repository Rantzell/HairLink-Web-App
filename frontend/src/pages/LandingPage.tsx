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
  
  // Sliders and Countdown State
  const [aboutIndex, _setAboutIndex] = useState(0);
  const [partnerIndex, _setPartnerIndex] = useState(0);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Countdown logic
    const eventDate = new Date('2024-04-18T00:00:00').getTime();
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = eventDate - now;
      if (distance < 0) {
        clearInterval(timer);
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
  }, []);

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

  const fillPartnershipDemo = () => {
    setPartnershipData({
      full_name: 'John Partner',
      email: 'john@partnership.com',
      phone: '+639171234567',
      organization: 'Global Charities Inc.',
      message: 'We are interested in collaborating on a hair donation drive for our employees. We would love to discuss how we can support your mission.'
    });
  };

  return (
    <div className="landing-root">
      <header className="site-header" id="home">
        <nav className="navbar">
          <a href="#" className="brand">
            <img src="/assets/images/landing/pink-ribbon.png" alt="HairLink ribbon" className="brand-ribbon" />
            <span>HairLink</span>
          </a>
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
            <img src="/assets/images/landing/logo.jpg" alt="Logo" className="hero-logo" />
          </div>
          <h1>STRAND UP FOR CANCER</h1>
          <p className="hero-copy">
            Hope begins, one at the time
          </p>
          <div className="hero-actions">
            <Link to="/donor/donate" className="btn btn-primary">Donate Now</Link>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <h3>2,500+</h3>
              <p>Hair Donations</p>
            </div>
            <div className="stat-item">
              <h3>2,500+</h3>
              <p>Wigs Created</p>
            </div>
            <div className="stat-item">
              <h3>2,500+</h3>
              <p>Lives Changed</p>
            </div>
          </div>
        </div>
      </section>

      <section className="services section" id="services">
        <div className="section-heading reveal">
          <h2>How It Works</h2>
          <p>Whether you want to donate or receive, we make the process simple and transparent.</p>
        </div>
        <div className="service-grid">
          <article className="service-card reveal">
            <h3>Donate Hair</h3>
            <p>Give the gift of confidence to someone in need by donating your hair.</p>
            <Link to="/donor/donate" className="btn btn-outline">Donate</Link>
          </article>
          <article className="service-card reveal">
            <h3>Request Hair</h3>
            <p>Apply for free wig with health certification.</p>
            <Link to="/recipient/request" className="btn btn-outline">Request</Link>
          </article>
          <article className="service-card reveal">
            <h3>Monetary</h3>
            <p>Support our mission financially and earn reward points.</p>
            <Link to="/donate-monetary" className="btn btn-outline">Give</Link>
          </article>
        </div>

        <section className="event-panel reveal">
          <div className="event-overlay"></div>
          <div className="event-top">
            <p className="event-meta">April 18, 2024 | Philippine General Hospital, Taft Ave.</p>
            <h3>Upcoming Event</h3>
            <a href="#about" className="btn btn-primary">Read More</a>
          </div>
          <div className="event-bottom">
            <div className="event-starts"><h4>The Event Starts at</h4></div>
            <div className="countdown">
              <div className="count-item"><span>{countdown.days.toString().padStart(2, '0')}</span><small>Days</small></div>
              <div className="count-item"><span>{countdown.hours.toString().padStart(2, '0')}</span><small>Hours</small></div>
              <div className="count-item"><span>{countdown.minutes.toString().padStart(2, '0')}</span><small>Minutes</small></div>
              <div className="count-item"><span>{countdown.seconds.toString().padStart(2, '0')}</span><small>Seconds</small></div>
            </div>
          </div>
        </section>
      </section>

      <section className="about section" id="about">
        <div className="about-block reveal">
          <div className="about-hero-image">
            <div className="slider-track" style={{ transform: `translateX(-${aboutIndex * 100}%)` }}>
              <img src="/assets/images/landing/sufc-team.jpg" alt="Team" />
              <img src="/assets/images/landing/sufc-team2.jpg" alt="Team" />
            </div>
          </div>
          <div className="about-copy">
            <h2>About Us <img src="/assets/images/landing/pink-ribbon.png" alt="Pink ribbon" /></h2>
            <p>
              Strand Up for Cancer (SUFC) is a youth-led initiative dedicated to supporting cancer patients 
              through hair donation and wig crafting. Our mission is to provide high-quality wigs to those 
              experiencing hair loss, restoring their confidence and dignity during their recovery journey.
            </p>
          </div>
        </div>

        <section className="partners" id="partners">
          <div className="section-heading reveal"><h2>Partnership</h2></div>
          <div className="partners-slider reveal">
            <div className="slider-track" style={{ transform: `translateX(-${partnerIndex * 100}%)` }}>
              <img src="/assets/images/landing/pgh.png" alt="PGH" />
              <img src="/assets/images/landing/wigmaker.png" alt="Wigmaker" />
            </div>
          </div>
        </section>
      </section>

      <section className="contact section" id="contact">
        <div className="contact-card reveal">
          <div className="section-heading section-heading-left" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2>Want to partner with us?</h2>
              <p>Let's connect and grow together!</p>
            </div>
            <button type="button" className="demo-fill-btn" onClick={fillPartnershipDemo}>Quick Fill Demo</button>
          </div>
          <form className="contact-form" onSubmit={handlePartnershipSubmit}>
            <div className="form-row">
              <input type="text" placeholder="Full Name" value={partnershipData.full_name} onChange={e => setPartnershipData({...partnershipData, full_name: e.target.value})} required />
              <input type="email" placeholder="Email" value={partnershipData.email} onChange={e => setPartnershipData({...partnershipData, email: e.target.value})} required />
              <input type="text" placeholder="Phone Number" value={partnershipData.phone} onChange={e => setPartnershipData({...partnershipData, phone: e.target.value})} />
            </div>
            <input type="text" placeholder="Company Name" value={partnershipData.organization} onChange={e => setPartnershipData({...partnershipData, organization: e.target.value})} />
            <textarea placeholder="Message" rows={4} value={partnershipData.message} onChange={e => setPartnershipData({...partnershipData, message: e.target.value})} required></textarea>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Submit'}</button>
          </form>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <img src="/assets/images/landing/logo.jpg" alt="HairLink logo" />
            <div>
              <h3>STRAND UP FOR CANCER</h3>
              <p>Manila Downtown YMCA at 945 Sabino Padilla St,<br />Binondo, Manila, 1006 Metro Manila</p>
            </div>
          </div>
          <div className="footer-subscribe">
            <p>Subscribe for the latest event updates</p>
            <div className="subscribe-row">
              <img src="/assets/images/landing/pink-ribbon.png" alt="ribbon" />
              <input type="email" placeholder="Your Email Address" />
              <button type="button">Sign Up</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
