import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import LoadingScreen from '../components/LoadingScreen';

const DonorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const [referralStatus, setReferralStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [loading, setLoading] = useState(true);
  const goal = 100;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/internal-api/donations/stats');
        setPoints(res.data.totalPoints);
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <LoadingScreen />;

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
      // Refresh points
      const res = await apiClient.get('/internal-api/donations/stats');
      setPoints(res.data.totalPoints);
      setReferralCode('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Invalid code');
      setReferralStatus('idle');
    }
  };

  const percent = Math.min((points / goal) * 100, 100);
  const filledStars = Math.round((points / goal) * 11); // Original has 11 stars

  return (
    <section className="section-wrap reveal active">
      <div className="section-title-block">
        <h1>{getGreeting()}, {user?.firstName || user?.name}!</h1>
        <p>Your impact snapshots and reward progress are shown below.</p>
      </div>

      <article className="points-card">
        <p className="points-info">
          <i className='bx bx-info-circle'></i>
          10 stars for hair donation, 5 stars for referral and 1 star for every 100 pesos donated monetary.
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
            ? '🎉 Congratulations! You can now claim your free wig reward.' 
            : `Earn ${goal - points} more points for a free wig`}
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
          <Link className="action-item-btn" to="/donor/tracking">
            <i className='bx bx-home-alt'></i> Track Donations
          </Link>
          <Link className="action-item-btn" to="/donor/certificate">
            <i className='bx bx-book-content'></i> My Certificate
          </Link>
          <Link className="action-item-btn" to="/donor/community">
            <i className='bx bx-group'></i> Community Support
          </Link>
          <Link className="action-item-btn" to="/donor/profile">
            <i className='bx bx-user'></i> My Profile
          </Link>
        </div>
      </section>

      <section className="rewards-shell">
        <div className="rewards-head">
          <h2>Claimable Actions</h2>
          <i className='bx bxs-check-circle' style={{ color: '#bc2f79' }}></i>
        </div>

        <div className="reward-grid">
          <article className="reward-card">
            <h3>Donate Hair</h3>
            <p>Give confidence to someone in need by donating your hair.</p>
            <Link className="action-filled-btn" to="/donor/donate">Donate Hair</Link>
          </article>

          <article className="reward-card">
            <h3>Monetary Donation</h3>
            <p>Support the cause by making a financial contribution to HairLink.</p>
            <Link className="action-filled-btn" to="/donor/monetary">Support Now</Link>
          </article>
        </div>
      </section>
    </section>
  );
};

export default DonorDashboard;
