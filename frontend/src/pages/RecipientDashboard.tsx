import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';

const RecipientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const [referralStatus, setReferralStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const goal = 100;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/internal-api/requests/stats');
        setPoints(res.data.totalPoints || 0);
      } catch (err) {
        console.error('Failed to fetch stats', err);
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

  const handleReferralSubmit = async () => {
    if (!referralCode.trim()) return;
    setReferralStatus('submitting');
    try {
      await apiClient.post('/internal-api/referral', { referral_code: referralCode });
      setReferralStatus('success');
      const res = await apiClient.get('/internal-api/requests/stats');
      setPoints(res.data.totalPoints || 0);
      setReferralCode('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Invalid code');
      setReferralStatus('idle');
    }
  };

  const percent = Math.min((points / goal) * 100, 100);
  const filledStars = Math.round((points / goal) * 11);

  return (
    <section className="section-wrap reveal active">
      <div className="section-title-block">
        <h1>{getGreeting()}, {user?.firstName || user?.name}!</h1>
        <p>Your journey and impact snapshots are shown below.</p>
      </div>

      <article className="points-card">
        <p className="points-info">
          <i className='bx bx-info-circle'></i>
          Receive 5 stars for every successful referral. Support our community!
          Star Points <span className="star-inline">★</span> <span>{points}</span>
        </p>

        <div className="progress-wrap" aria-label="Reward progress">
          <div className="progress-bar">
            <span className="progress-fill" style={{ width: `${percent}%`, transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)' }}></span>
          </div>
          <span 
            className="progress-star" 
            style={{ 
              left: `calc(${percent}% + 0.8rem - 12px)`, 
              transition: 'left 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
              color: points >= goal ? '#f59e0b' : ''
            }}
          >★</span>
        </div>

        <div className="star-row" aria-hidden="true">
          {[...Array(11)].map((_, i) => (
            <span key={i} style={{ color: i < filledStars ? '#f59e0b' : '', transition: 'color 0.3s ease' }}>★</span>
          ))}
        </div>

        <p className="reward-line">
          {points >= goal 
            ? '🎉 Congratulations! You have reached your milestone goal.' 
            : `Earn ${goal - points} more points for a special recognition`}
        </p>
      </article>

      <section className="quick-actions">
        <div className="referral-box-wrap">
          <div className="referral-box">
            <label htmlFor="referralCode">Referral Code</label>
            <input 
              id="referralCode" 
              type="text" 
              placeholder="Enter code here" 
              value={referralCode}
              onChange={e => setReferralCode(e.target.value)}
              disabled={referralStatus !== 'idle'}
            />
            <button 
              className="submit-code-btn" 
              type="button" 
              onClick={handleReferralSubmit}
              disabled={referralStatus !== 'idle'}
            >
              {referralStatus === 'submitting' ? '...' : 'Submit Code'}
            </button>
          </div>
        </div>

        <div className="action-buttons">
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

      <section className="rewards-shell">
        <div className="rewards-head">
          <h2>Recipient Actions</h2>
          <i className='bx bxs-heart' style={{ color: '#bc2f79' }}></i>
        </div>

        <div className="reward-grid">
          <article className="reward-card">
            <h3>Request Hair</h3>
            <p>Let's boost your confidence. Request hair to support your journey of comfort.</p>
            <Link className="action-filled-btn" to="/recipient/request">Request Hair</Link>
          </article>

          <article className="reward-card">
            <h3>Monetary Donation</h3>
            <p>Support the cause by making a financial contribution to HairLink.</p>
            <Link className="action-filled-btn" to="/recipient/monetary">Support Now</Link>
          </article>
        </div>
      </section>
    </section>
  );
};

export default RecipientDashboard;
