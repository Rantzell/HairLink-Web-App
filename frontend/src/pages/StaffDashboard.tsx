import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

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
          <p>Monitor verification, inventory, production tracking, matching, and distribution workflows.</p>
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
          <p>Pending Hair Donations</p>
        </article>
        <article className="quick-stat">
          <small>Monetary</small>
          <h2>0</h2>
          <p>Pending Monetary</p>
        </article>
        <article className="quick-stat">
          <small>Inventory</small>
          <h2>{loading ? '...' : stats.totalStock}</h2>
          <p>Hair Inventory Records</p>
        </article>
        <article className="quick-stat">
          <small>Production</small>
          <h2>{loading ? '...' : stats.productionCount}</h2>
          <p>Wig Builds In Progress</p>
        </article>
        <article className="quick-stat">
          <small>Stock</small>
          <h2>{loading ? '...' : stats.wigStockCount}</h2>
          <p>Completed Wig Stock</p>
        </article>
        <article className="quick-stat">
          <small>Requests</small>
          <h2>{loading ? '...' : stats.pendingRequests}</h2>
          <p>Pending Recipient Requests</p>
        </article>
      </div>

      <article className="staff-card">
        <div className="staff-section-head">
          <h2>Verification Desk</h2>
          <span>Review and decision workflow</span>
        </div>
        <div className="staff-actions three-col">
          <Link className="staff-action-link" to="/staff/verification/donor">
            <h3>Donation Verification</h3>
            <p>Review hair donation submissions and approve or reject with remarks.</p>
          </Link>
          <Link className="staff-action-link" to="/staff/verification/recipient">
            <h3>Request Verification</h3>
            <p>Validate recipient requests and supporting medical documentation.</p>
          </Link>
          <Link className="staff-action-link" to="/staff/verification/monetary">
            <h3>Monetary Verification</h3>
            <p>Verify bank transfers and payment proofs for monetary donations.</p>
          </Link>
        </div>
      </article>

      <article className="staff-card">
        <div className="staff-section-head">
          <h2>Production and Inventory</h2>
          <span>Wigmaker tracking and stock control</span>
        </div>
        <div className="staff-actions four-col">
          <Link className="staff-action-link" to="/staff/tracking">
            <h3>Real-time Wigmaker Tracking</h3>
            <p>Monitor partner wigmaker progress and update stage movement.</p>
          </Link>
          <Link className="staff-action-link" to="/staff/batches">
            <h3>Delivery Per Batch</h3>
            <p>Track delivery batches and document processing status.</p>
          </Link>
          <Link className="staff-action-link" to="/staff/hair-stock">
            <h3>Hair Stock</h3>
            <p>View available stock by size and hair color categories.</p>
          </Link>
          <Link className="staff-action-link" to="/staff/wig-stock">
            <h3>Wig Stock</h3>
            <p>Maintain completed wig inventory records and statuses.</p>
          </Link>
        </div>
      </article>

      <article className="staff-card">
        <div className="staff-section-head">
          <h2>Matching and Allocation</h2>
          <span>Recipient pairing and release preparation</span>
        </div>
        <div className="staff-actions" style={{ gridTemplateColumns: '1fr' }}>
          <Link className="staff-action-link" to="/staff/matching">
            <h3>Recipient Matching List</h3>
            <p>Review matched wigs and release scheduling progress.</p>
          </Link>
        </div>
      </article>
    </section>
  );
};

export default StaffDashboard;
