import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import '../styles/RecipientDashboard.css';

interface HairRequest {
  id: number;
  reference: string;
  status: string;
  createdAt: string;
  wigLength: string;
  wigColor: string;
}

interface PickupNotification {
  id: number;
  title: string;
  message: string;
  created_at: string;
}

const RecipientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<HairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickupModal, setPickupModal] = useState<PickupNotification | null>(null);

  // Fetch requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await apiClient.get('/internal-api/requests');
        setRequests(res.data || []);
      } catch (err) {
        console.error('Failed to fetch requests for dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  // Check for unread pickup_ready notifications on mount
  useEffect(() => {
    const checkPickupNotifications = async () => {
      try {
        const res = await apiClient.get('/internal-api/notifications');
        const unreadPickup = (res.data as any[]).find(
          (n: any) => n.type === 'pickup_ready' && !n.is_read
        );
        if (unreadPickup) {
          setPickupModal(unreadPickup);
        }
      } catch (err) {
        // non-fatal
      }
    };
    checkPickupNotifications();
  }, []);

  const dismissPickupModal = async () => {
    if (!pickupModal) return;
    try {
      await apiClient.put(`/internal-api/notifications/${pickupModal.id}/read`);
    } catch {
      // non-fatal
    }
    setPickupModal(null);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Calculations
  const activeRequest = requests.find(r => r.status !== 'Delivered');
  const completedCount = requests.filter(r => r.status === 'Delivered').length;

  const totalRequests = requests.length;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="rc-dashboard-wrap">
      {pickupModal && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(38, 29, 43, 0.45)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
            animation: 'rcFadeIn 0.25s ease',
          }}
          onClick={dismissPickupModal}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '24px',
              boxShadow: '0 24px 60px rgba(173, 36, 109, 0.18)',
              border: '1px solid #ead7e8',
              maxWidth: '480px',
              width: '100%',
              overflow: 'hidden',
              animation: 'rcPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #ad246d, #cf2f84)', padding: '1.5rem 1.75rem 1.25rem', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <i className='bx bx-store' style={{ fontSize: '1.4rem', color: '#fff' }}></i>
                </div>
                <div>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pick-up Ready</p>
                  <h2 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>Your Wig is Ready! 🎉</h2>
                </div>
              </div>
              <button
                onClick={dismissPickupModal}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff', fontSize: '1.1rem' }}
              >
                <i className='bx bx-x'></i>
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem 1.75rem' }}>
              <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: '#4c3f54', lineHeight: 1.65 }}>
                {pickupModal.message}
              </p>
              <div style={{ background: '#fdf7fb', border: '1px solid #ead7e8', borderRadius: '12px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', color: '#665772' }}>
                <i className='bx bx-time-five' style={{ color: '#ad246d', fontSize: '1rem' }}></i>
                <span>Notified: {new Date(pickupModal.created_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '0 1.75rem 1.5rem', display: 'flex', gap: '0.75rem' }}>
              <Link
                to="/recipient/tracking"
                onClick={dismissPickupModal}
                style={{ flex: 1, background: 'linear-gradient(135deg, #ad246d, #cf2f84)', color: '#fff', border: 'none', borderRadius: '50px', padding: '0.7rem 1rem', fontSize: '0.875rem', fontWeight: 700, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <i className='bx bx-map-pin'></i> View My Request
              </Link>
              <button
                onClick={dismissPickupModal}
                style={{ flex: 1, background: '#fff', color: '#665772', border: '1.5px solid #ead7e8', borderRadius: '50px', padding: '0.7rem 1rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Got it, Dismiss
              </button>
            </div>
          </div>
          <style>{`
            @keyframes rcFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes rcPopIn { from { transform: scale(0.9) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
          `}</style>
        </div>,
        document.body
      )}
      {}
      <header className="rc-hero">
        <div className="rc-hero-left">
          <span className="rc-hero-badge">Welcome Back</span>
          <h1>{getGreeting()}, {user?.firstName || user?.name || 'Friend'}!</h1>
          <p>We are honored to walk with you on your journey of healing, comfort, and confidence.</p>
        </div>
        <div className="rc-hero-right">
          <div className="rc-hero-illus">
            <i className="bx bxs-heart-circle"></i>
          </div>
        </div>
      </header>

      {}
      <div className="rc-stats-grid">
        {/* Card 1: Active Request Status */}
        <div className="rc-stat-card">
          <div className="rc-stat-icon-wrap status">
            <i className="bx bx-map-pin"></i>
          </div>
          <div className="rc-stat-details">
            <small>Active Request</small>
            {loading ? (
              <span className="rc-stat-value loading" />
            ) : activeRequest ? (
              <>
                <strong className="rc-stat-value">{activeRequest.reference}</strong>
                <span className="rc-stat-sub">
                  Status: <span className="rc-status-text-pill">{activeRequest.status}</span>
                </span>
              </>
            ) : (
              <>
                <strong className="rc-stat-value none">No Active Request</strong>
                <span className="rc-stat-sub">Ready to request hair</span>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Completed Requests */}
        <div className="rc-stat-card">
          <div className="rc-stat-icon-wrap completed">
            <i className="bx bx-check-circle"></i>
          </div>
          <div className="rc-stat-details">
            <small>Completed Requests</small>
            {loading ? (
              <span className="rc-stat-value loading" />
            ) : (
              <>
                <strong className="rc-stat-value">{completedCount}</strong>
                <span className="rc-stat-sub">Wigs delivered to you</span>
              </>
            )}
          </div>
        </div>

        {/* Card 3: Total Requests Submitted */}
        <div className="rc-stat-card">
          <div className="rc-stat-icon-wrap profile">
            <i className="bx bx-file"></i>
          </div>
          <div className="rc-stat-details">
            <small>Total Requests</small>
            {loading ? (
              <span className="rc-stat-value loading" />
            ) : (
              <>
                <strong className="rc-stat-value">{totalRequests}</strong>
                <span className="rc-stat-sub">Member since {memberSince}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {}
      <div className="rc-action-section">
        <h2 className="rc-section-title">My Request Journey</h2>
        <div className="rc-action-grid">
          {/* Action 1: Request Hair Card */}
          <div className="rc-action-card highlight">
            <div className="rc-action-card-header">
              <div className="rc-action-icon pink">
                <i className="bx bx-plus-circle"></i>
              </div>
              <h3>Request a Custom Wig</h3>
            </div>
            <p>Let us help boost your confidence. Request a customized wig crafted with love specifically for your comfort and style.</p>
            <Link to="/recipient/request" className="rc-action-btn pink">
              Start Request <i className="bx bx-chevron-right"></i>
            </Link>
          </div>

          {/* Action 2: Track Progress Card */}
          <div className="rc-action-card">
            <div className="rc-action-card-header">
              <div className="rc-action-icon purple">
                <i className="bx bx-map-pin"></i>
              </div>
              <h3>Track Your Request</h3>
            </div>
            <p>Monitor your active hair requests and check real-time status updates from our verification desk and wigmakers.</p>
            <Link to="/recipient/tracking" className="rc-action-btn purple">
              Track Progress <i className="bx bx-chevron-right"></i>
            </Link>
          </div>

          {/* Action 3: Monetary Donation Card */}
          <div className="rc-action-card">
            <div className="rc-action-card-header">
              <div className="rc-action-icon teal">
                <i className="bx bx-donate-heart"></i>
              </div>
              <h3>Support the Cause</h3>
            </div>
            <p>Help keep HairLink free for everyone. Make a voluntary monetary contribution to fund wig-making and delivery materials.</p>
            <Link to="/recipient/monetary" className="rc-action-btn teal">
              Contribute Now <i className="bx bx-chevron-right"></i>
            </Link>
          </div>
        </div>
      </div>

      {}
      <div className="rc-action-section" style={{ marginTop: '1rem' }}>
        <h2 className="rc-section-title">Resources &amp; Community</h2>
        <div className="rc-action-grid">
          {/* Action 4: Community Support Card */}
          <div className="rc-action-card">
            <div className="rc-action-card-header">
              <div className="rc-action-icon gold">
                <i className="bx bx-group"></i>
              </div>
              <h3>Community Support</h3>
            </div>
            <p>Connect with other recipients and donors. Share stories, find support, and read positive encouragement messages.</p>
            <Link to="/recipient/community" className="rc-action-btn gold">
              Open Forum <i className="bx bx-chevron-right"></i>
            </Link>
          </div>

          {/* Action 5: Hair Care Card */}
          <div className="rc-action-card">
            <div className="rc-action-card-header">
              <div className="rc-action-icon blue">
                <i className="bx bx-spa"></i>
              </div>
              <h3>Hair Care Hub</h3>
            </div>
            <p>Access our curated resources on how to care for your scalp, choosing wig cap sizes, and maintain synthetic or natural wigs.</p>
            <Link to="/recipient/haircare" className="rc-action-btn blue">
              Read Guides <i className="bx bx-chevron-right"></i>
            </Link>
          </div>

          {/* Action 6: My Profile Card */}
          <div className="rc-action-card">
            <div className="rc-action-card-header">
              <div className="rc-action-icon pink">
                <i className="bx bx-user"></i>
              </div>
              <h3>My Profile</h3>
            </div>
            <p>Manage your contact details, view your profile photo, and update your personal information.</p>
            <Link to="/recipient/profile" className="rc-action-btn pink">
              Edit Profile <i className="bx bx-chevron-right"></i>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipientDashboard;
