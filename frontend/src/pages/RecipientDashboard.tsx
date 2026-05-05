import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RecipientDashboard: React.FC = () => {
  const { user } = useAuth();

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
        <p>Your journey and impact snapshots are shown below.</p>
      </div>

      <section className="quick-actions" style={{ marginTop: '2rem' }}>
        <div className="action-buttons" style={{ gridColumn: 'span 2' }}>
          <Link className="action-item-btn" to="/recipient/tracking">
            <i className='bx bx-map-pin'></i> View Status
          </Link>
          <Link className="action-item-btn" to="/recipient/community">
            <i className='bx bx-group'></i> Community Support
          </Link>
          <Link className="action-item-btn" to="/recipient/profile">
            <i className='bx bx-user'></i> My Profile
          </Link>
          <Link className="action-item-btn" to="/recipient/haircare">
            <i className='bx bx-heart-circle'></i> Hair Care
          </Link>
        </div>
      </section>

      <section className="rewards-shell" style={{ marginTop: '3rem' }}>
        <div className="rewards-head">
          <h2>Recipient Actions</h2>
          <i className='bx bxs-heart' style={{ color: '#bc2f79' }}></i>
        </div>

        <div className="reward-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', maxWidth: '600px' }}>
          <article className="reward-card">
            <h3>Request Hair</h3>
            <p>Let's boost your confidence. Request hair to support your journey of comfort.</p>
            <Link className="action-filled-btn" to="/recipient/request">Request Hair</Link>
          </article>
        </div>
      </section>
    </section>
  );
};

export default RecipientDashboard;
