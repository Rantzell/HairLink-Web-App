import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';

const RecipientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/internal-api/requests/stats');
        setActiveCount(res.data.activeCount);
      } catch (err) {
        console.error('Failed to fetch request stats', err);
      }
    };
    fetchStats();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <section className="section-wrap reveal active">
      <div className="section-title-block">
        <h1>{getGreeting()}, {user?.firstName || user?.name}!</h1>
        <p>Your impact snapshots and reward progress are shown below.</p>
      </div>

      <div className="active-requests-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: '#fff', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid #ead7e8', marginBottom: '2rem' }}>
        <div className="card-icon" style={{ background: '#fdf2f8', width: '64px', height: '64px', borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#ad246d' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div className="card-content">
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ad246d' }}>Active Requests</h3>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#3b2e43' }}>{activeCount}</p>
        </div>
      </div>

      <div className="guidelines-actions-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="guidelines-box" style={{ background: '#fff', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #ead7e8' }}>
          <div className="guidelines-head" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#ad246d' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
            </svg>
            <h3 style={{ margin: 0 }}>Before You Request</h3>
          </div>
          <div className="guidelines-items" style={{ marginBottom: '2rem' }}>
            {[
              'Gather your medical documents (if applicable)',
              'Prepare your hair loss story and journey',
              'Prepare photos of yourself for reference',
              'Be ready to fill up the request form'
            ].map((text, i) => (
              <div key={i} className="guideline-item" style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span className="dot" style={{ color: '#ad246d' }}>•</span>
                <span style={{ color: '#5d4d62' }}>{text}</span>
              </div>
            ))}
          </div>
          <div className="guidelines-request-action">
            <Link to="/recipient/request" className="soft-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"></path>
              </svg>
              Request Hair
            </Link>
          </div>
        </div>

        <div className="recipient-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Link to="/recipient/tracking" className="ghost-btn" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '100px' }}>
            <i className='bx bx-map-pin' style={{ fontSize: '1.5rem' }}></i> View Status
          </Link>
          <Link to="/community" className="ghost-btn" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '100px' }}>
            <i className='bx bx-group' style={{ fontSize: '1.5rem' }}></i> Community Support
          </Link>
          <Link to="/recipient/haircare" className="ghost-btn" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '100px' }}>
            <i className='bx bx-heart' style={{ fontSize: '1.5rem' }}></i> Hair Care
          </Link>
          <Link to="/recipient/profile" className="ghost-btn" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '100px' }}>
            <i className='bx bx-user' style={{ fontSize: '1.5rem' }}></i> My Profile
          </Link>
          <Link to="/donate-monetary" className="ghost-btn" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gridColumn: 'span 2', height: '100px' }}>
            <i className='bx bx-donate-heart' style={{ fontSize: '1.5rem' }}></i> Monetary Donation
          </Link>
        </div>
      </div>
    </section>
  );
};

export default RecipientDashboard;
