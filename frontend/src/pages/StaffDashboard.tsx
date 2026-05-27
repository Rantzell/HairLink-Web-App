import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import '../styles/StaffDashboard.css';

interface StaffStats {
  pendingDonations: number;
  pendingRequests: number;
  totalStock: number;
  productionCount: number;
  wigStockCount: number;
}

const StaffDashboard: React.FC = () => {
  const [stats, setStats] = useState<StaffStats>({
    pendingDonations: 0,
    pendingRequests: 0,
    totalStock: 0,
    productionCount: 0,
    wigStockCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/internal-api/staff/dashboard');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch staff stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <section className="section-wrap reveal active staff-page">
      <header className="staff-hero">
        <div className="staff-hero-copy">
          <p className="staff-kicker">Operations Center</p>
          <h1>Staff Operations Workspace</h1>
          <p>Key staff tasks and status at a glance.</p>
        </div>
        <div className="staff-hero-badge">
          <i className='bx bxs-badge-check'></i>
          <span>Live Staff View</span>
        </div>
      </header>

      <div className="quick-stat-grid">
        <article className="quick-stat">
          <small>Donations</small>
          <h2>{loading ? '...' : stats.pendingDonations}</h2>
          <p>Pending</p>
        </article>
        <article className="quick-stat">
          <small>Monetary</small>
          <h2>0</h2>
          <p>Pending</p>
        </article>
        <article className="quick-stat">
          <small>Inventory</small>
          <h2>{loading ? '...' : stats.totalStock}</h2>
          <p>Total</p>
        </article>
        <article className="quick-stat">
          <small>Production</small>
          <h2>{loading ? '...' : stats.productionCount}</h2>
          <p>In progress</p>
        </article>
        <article className="quick-stat">
          <small>Stock</small>
          <h2>{loading ? '...' : stats.wigStockCount}</h2>
          <p>Ready</p>
        </article>
        <article className="quick-stat">
          <small>Requests</small>
          <h2>{loading ? '...' : stats.pendingRequests}</h2>
          <p>Waiting</p>
        </article>
      </div>

      <article className="staff-card">
        <div className="staff-section-head">
          <h2>Verification Desk</h2>
        </div>
        <div className="staff-actions three-col">
          <Link className="staff-action-link" to="/staff/verification/donor">
            <h3>Donation Verification</h3>
            <p>Review donations.</p>
          </Link>
          <Link className="staff-action-link" to="/staff/verification/recipient">
            <h3>Request Verification</h3>
            <p>Validate requests.</p>
          </Link>
          <Link className="staff-action-link" to="/staff/verification/monetary">
            <h3>Monetary Verification</h3>
            <p>Check payment proofs.</p>
          </Link>
        </div>
      </article>

      <article className="staff-card">
        <div className="staff-section-head">
          <h2>Production & Inventory</h2>
        </div>
        <div className="staff-actions four-col">
          <Link className="staff-action-link" to="/staff/tracking">
            <h3>Real-time Wigmaker Tracking</h3>
            <p>Monitor build status.</p>
          </Link>
          <Link className="staff-action-link" to="/staff/batches">
            <h3>Delivery Per Batch</h3>
            <p>Track batch progress.</p>
          </Link>
          <Link className="staff-action-link" to="/staff/hair-stock">
            <h3>Hair Stock</h3>
            <p>View inventory counts.</p>
          </Link>
          <Link className="staff-action-link" to="/staff/wig-stock">
            <h3>Wig Stock</h3>
            <p>Review finished stock.</p>
          </Link>
        </div>
      </article>

      <article className="staff-card">
        <div className="staff-section-head">
          <h2>Matching</h2>
        </div>
        <div className="staff-actions staff-actions-single-col">
          <Link className="staff-action-link" to="/staff/matching">
            <h3>Recipient Matching List</h3>
            <p>Review matches.</p>
          </Link>
        </div>
      </article>
    </section>
  );
};

export default StaffDashboard;
