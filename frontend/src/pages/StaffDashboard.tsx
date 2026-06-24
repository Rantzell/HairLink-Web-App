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
  monetaryDonations: number;
}

const StaffDashboard: React.FC = () => {
  const [stats, setStats] = useState<StaffStats>({
    pendingDonations: 0,
    pendingRequests: 0,
    totalStock: 0,
    productionCount: 0,
    wigStockCount: 0,
    monetaryDonations: 0,
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

  const statCards = [
    {
      icon: 'bx bx-donate-heart',
      color: 'pink',
      label: 'Pending Donations',
      value: stats.pendingDonations,
      sub: 'Awaiting verification',
    },
    {
      icon: 'bx bx-user-check',
      color: 'purple',
      label: 'Pending Requests',
      value: stats.pendingRequests,
      sub: 'Recipient requests',
    },
    {
      icon: 'bx bx-box',
      color: 'teal',
      label: 'Hair Inventory',
      value: stats.totalStock,
      sub: 'Total stock units',
    },
    {
      icon: 'bx bx-cog',
      color: 'amber',
      label: 'In Production',
      value: stats.productionCount,
      sub: 'Wigs being made',
    },
    {
      icon: 'bx bxs-crown',
      color: 'blue',
      label: 'Wig Stock',
      value: stats.wigStockCount,
      sub: 'Ready for matching',
    },
    {
      icon: 'bx bx-money',
      color: 'green',
      label: 'Monetary Donations',
      value: stats.monetaryDonations,
      sub: 'Pending review',
    },
  ];

  return (
    <>
      <div className="sd-page-header">
        <h1>Operations Center</h1>
        <p>Key staff tasks and live status at a glance.</p>
      </div>

      {}
      <div className="sd-stats-grid">
        {statCards.map((card) => (
          <div key={card.label} className="sd-stat-card">
            <div className={`sd-stat-icon ${card.color}`}>
              <i className={card.icon} />
            </div>
            <div className="sd-stat-body">
              <div className="sd-stat-label">{card.label}</div>
              {loading ? (
                <span className="sd-stat-value loading" />
              ) : (
                <div className="sd-stat-value">{card.value}</div>
              )}
              <div className="sd-stat-sub">{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {}
      <div className="sd-section-card">
        <div className="sd-section-head">
          <div className="sd-section-head-left">
            <div className="sd-section-icon"><i className="bx bx-shield-quarter" /></div>
            <div>
              <h2>Verification Desk</h2>
              <p>Review and approve incoming submissions</p>
            </div>
          </div>
        </div>
        <div className="sd-action-grid cols-3">
          <Link className="sd-action-link" to="/staff/verification/donor">
            <div className="sd-action-link-icon"><i className="bx bx-donate-heart" /></div>
            <div className="sd-action-link-body">
              <h3>Donation Verification</h3>
              <p>Review hair donations</p>
            </div>
            <i className="bx bx-chevron-right sd-action-link-arrow" />
          </Link>
          <Link className="sd-action-link" to="/staff/verification/recipient">
            <div className="sd-action-link-icon"><i className="bx bx-user-check" /></div>
            <div className="sd-action-link-body">
              <h3>Request Verification</h3>
              <p>Validate recipient requests</p>
            </div>
            <i className="bx bx-chevron-right sd-action-link-arrow" />
          </Link>
          <Link className="sd-action-link" to="/staff/verification/monetary">
            <div className="sd-action-link-icon"><i className="bx bx-money" /></div>
            <div className="sd-action-link-body">
              <h3>Monetary Verification</h3>
              <p>Check payment proofs</p>
            </div>
            <i className="bx bx-chevron-right sd-action-link-arrow" />
          </Link>
        </div>
      </div>

      {}
      <div className="sd-section-card">
        <div className="sd-section-head">
          <div className="sd-section-head-left">
            <div className="sd-section-icon"><i className="bx bx-package" /></div>
            <div>
              <h2>Production &amp; Inventory</h2>
              <p>Monitor wig production and stock levels</p>
            </div>
          </div>
        </div>
        <div className="sd-action-grid cols-3">
          <Link className="sd-action-link" to="/staff/tracking/wigmaker">
            <div className="sd-action-link-icon"><i className="bx bx-radar" /></div>
            <div className="sd-action-link-body">
              <h3>Wigmaker Tracking</h3>
              <p>Monitor build status</p>
            </div>
            <i className="bx bx-chevron-right sd-action-link-arrow" />
          </Link>
          <Link className="sd-action-link" to="/staff/tracking/donation">
            <div className="sd-action-link-icon"><i className="bx bx-package" /></div>
            <div className="sd-action-link-body">
              <h3>Donation Trackers</h3>
              <p>Track incoming donations</p>
            </div>
            <i className="bx bx-chevron-right sd-action-link-arrow" />
          </Link>
          <Link className="sd-action-link" to="/staff/tracking/batch-donation">
            <div className="sd-action-link-icon"><i className="bx bx-layer" /></div>
            <div className="sd-action-link-body">
              <h3>Hair Batch Tracking</h3>
              <p>Manage grouped batches</p>
            </div>
            <i className="bx bx-chevron-right sd-action-link-arrow" />
          </Link>
          <Link className="sd-action-link" to="/staff/tracking/recipient">
            <div className="sd-action-link-icon"><i className="bx bx-transfer-alt" /></div>
            <div className="sd-action-link-body">
              <h3>Request Trackers</h3>
              <p>Track request progress</p>
            </div>
            <i className="bx bx-chevron-right sd-action-link-arrow" />
          </Link>
          <Link className="sd-action-link" to="/staff/hair-stock">
            <div className="sd-action-link-icon"><i className="bx bx-cut" /></div>
            <div className="sd-action-link-body">
              <h3>Hair Stock</h3>
              <p>View inventory counts</p>
            </div>
            <i className="bx bx-chevron-right sd-action-link-arrow" />
          </Link>
          <Link className="sd-action-link" to="/staff/wig-stock">
            <div className="sd-action-link-icon"><i className="bx bxs-crown" /></div>
            <div className="sd-action-link-body">
              <h3>Wig Stock</h3>
              <p>Review finished stock</p>
            </div>
            <i className="bx bx-chevron-right sd-action-link-arrow" />
          </Link>
        </div>
      </div>

      {}
      <div className="sd-section-card">
        <div className="sd-section-head">
          <div className="sd-section-head-left">
            <div className="sd-section-icon"><i className="bx bx-link" /></div>
            <div>
              <h2>Matching</h2>
              <p>Pair recipients with available wigs</p>
            </div>
          </div>
        </div>
        <div className="sd-action-grid cols-1">
          <Link className="sd-action-link" to="/staff/matching">
            <div className="sd-action-link-icon"><i className="bx bx-link" /></div>
            <div className="sd-action-link-body">
              <h3>Recipient Matching List</h3>
              <p>Review and manage matches</p>
            </div>
            <i className="bx bx-chevron-right sd-action-link-arrow" />
          </Link>
        </div>
      </div>

      {}
      <div className="sd-section-card">
        <div className="sd-section-head">
          <div className="sd-section-head-left">
            <div className="sd-section-icon"><i className="bx bx-user" /></div>
            <div>
              <h2>Account Settings</h2>
              <p>Manage your account profile and credentials</p>
            </div>
          </div>
        </div>
        <div className="sd-action-grid cols-1">
          <Link className="sd-action-link" to="/staff/profile">
            <div className="sd-action-link-icon"><i className="bx bx-user" /></div>
            <div className="sd-action-link-body">
              <h3>My Profile</h3>
              <p>View and edit your personal profile details</p>
            </div>
            <i className="bx bx-chevron-right sd-action-link-arrow" />
          </Link>
        </div>
      </div>
    </>
  );
};

export default StaffDashboard;
