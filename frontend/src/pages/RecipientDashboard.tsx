import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/RecipientDashboard.css';

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

      <section className="quick-actions quick-actions-mt">
        <div className="action-buttons action-buttons-span2">
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

      <section className="rewards-shell rewards-shell-mt">
        <div className="rewards-head">
          <h2>Recipient Actions</h2>
          <i className="bx bxs-heart rewards-head-icon"></i>
        </div>

        <div className="reward-grid reward-grid-single">
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


