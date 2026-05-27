import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from '../NotificationBell';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const role = user?.role;

  const getDashboardPath = () => {
    switch (role) {
      case 'admin': return '/admin/dashboard';
      case 'staff': return '/staff/dashboard';
      case 'donor': return '/donor/dashboard';
      case 'recipient': return '/recipient/dashboard';
      case 'wigmaker': return '/wigmaker/dashboard';
      default: return '/';
    }
  };

  return (
    <div className="dash-container">
      <style>{`
        .dash-links-middle {
          display: flex !important;
          align-items: center !important;
          gap: 0.5rem !important;
        }
        .dash-links-right {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: 1.25rem !important;
        }
        .dash-links-right .logout-btn {
          border: 1.5px solid rgba(180, 84, 84, 0.2) !important;
          background: #ffffff !important;
          color: #B45454 !important;
          padding: 0.45rem 1.1rem !important;
          border-radius: 999px !important;
          font-weight: 700 !important;
          font-size: 0.86rem !important;
          cursor: pointer !important;
          transition: all 0.18s ease !important;
          display: inline-flex !important;
          align-items: center !important;
          text-decoration: none !important;
          margin-left: 0.5rem !important;
        }
        .dash-links-right .logout-btn:hover {
          border-color: #B45454 !important;
          background: #F9EDED !important;
          color: #B45454 !important;
        }

        /* Admin/Staff Compact Logout Button Override */
        .dash-links-staff .dash-links-right .logout-btn {
          padding: 0.35rem 0.8rem !important;
          font-size: 0.8rem !important;
          margin-left: 0.3rem !important;
        }
        
        @media (max-width: 900px) {
          .dash-links-middle, .dash-links-right {
            flex-direction: column !important;
            align-items: stretch !important;
            width: 100% !important;
            gap: 0.5rem !important;
          }
          .dash-links-right .logout-btn {
            justify-content: center !important;
            margin-left: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
      <header className="dash-header">
        <nav className="dash-nav" aria-label="Dashboard navigation">
          <Link className="dash-brand" to={getDashboardPath()} aria-label="HairLink home">
            <img src="/assets/images/landing/pink-ribbon.png" alt="Pink ribbon icon" />
            <span>HairLink</span>
          </Link>

          <button
            className={`dash-burger ${isMenuOpen ? 'open' : ''}`}
            type="button"
            aria-label="Toggle menu"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className={`dash-links ${isMenuOpen ? 'open' : ''} ${['staff', 'admin'].includes(role || '') ? 'dash-links-staff' : ''}`}>
            <div className="dash-links-middle">
              {role === 'donor' && (
                <>
                  <Link to="/donor/dashboard" className={isActive('/donor/dashboard') ? 'active' : ''}>Overview</Link>
                  <Link to="/donor/donate" className={isActive('/donor/donate') ? 'active' : ''}>Donate Hair</Link>
                  <Link to="/donor/tracking" className={isActive('/donor/tracking') ? 'active' : ''}>Tracking</Link>
                  <Link to="/donor/certificate" className={isActive('/donor/certificate') ? 'active' : ''}>Certificate</Link>
                </>
              )}

              {role === 'recipient' && (
                <>
                  <Link to="/recipient/dashboard" className={isActive('/recipient/dashboard') ? 'active' : ''}>Overview</Link>
                  <Link to="/recipient/request" className={isActive('/recipient/request') ? 'active' : ''}>Request Hair</Link>
                  <Link to="/recipient/tracking" className={isActive('/recipient/tracking') ? 'active' : ''}>Tracking</Link>
                </>
              )}

              {role === 'wigmaker' && (
                <>
                  <Link to="/wigmaker/dashboard" className={isActive('/wigmaker/dashboard') ? 'active' : ''}>Overview</Link>
                  <Link to="/wigmaker/production-tasks" className={isActive('/wigmaker/production-tasks') ? 'active' : ''}>Production Tasks</Link>
                </>
              )}

              {role === 'staff' && (
                <>
                  <Link to="/staff/dashboard" className={isActive('/staff/dashboard') ? 'active' : ''}>Overview</Link>
                  <Link to="/staff/verification/donor" className={location.pathname === '/staff/verification/donor' ? 'active' : ''}>Donation</Link>
                  <Link to="/staff/verification/recipient" className={location.pathname === '/staff/verification/recipient' ? 'active' : ''}>Request</Link>
                  <Link to="/staff/verification/monetary" className={location.pathname === '/staff/verification/monetary' ? 'active' : ''}>Monetary</Link>
                  <div className="nav-dropdown">
                    <span className={`nav-dropdown-trigger ${location.pathname.includes('/staff/tracking') ? 'active' : ''}`}>Tracking <i className='bx bx-chevron-down'></i></span>
                    <div className="nav-dropdown-content">
                      <Link to="/staff/tracking/donation">Donation Trackers</Link>
                      <Link to="/staff/tracking/recipient">Request Trackers</Link>
                    </div>
                  </div>
                  <Link to="/staff/wig-stock" className={isActive('/staff/wig-stock') ? 'active' : ''}>Wigs</Link>
                  <Link to="/staff/hair-stock" className={isActive('/staff/hair-stock') ? 'active' : ''}>Hair</Link>
                  <Link to="/staff/matching" className={isActive('/staff/matching') ? 'active' : ''}>Matching</Link>
                </>
              )}

              {role === 'admin' && (
                <>
                  <Link to="/admin/dashboard" className={isActive('/admin/dashboard') ? 'active' : ''}>Overview</Link>
                  <div className="nav-dropdown">
                    <span className={`nav-dropdown-trigger ${isActive('/admin/verification') ? 'active' : ''}`}>Verify <i className='bx bx-chevron-down'></i></span>
                    <div className="nav-dropdown-content">
                      <Link to="/admin/verification?view=donor">Hair Donations</Link>
                      <Link to="/admin/verification?view=recipient">Recipient Requests</Link>
                    </div>
                  </div>
                  <Link to="/admin/matching" className={isActive('/admin/matching') ? 'active' : ''}>Matching</Link>
                  <div className="nav-dropdown">
                    <span className={`nav-dropdown-trigger ${isActive('/admin/operations') ? 'active' : ''}`}>Ops <i className='bx bx-chevron-down'></i></span>
                    <div className="nav-dropdown-content">
                      <Link to="/admin/operations?view=production">Production Oversight</Link>
                      <Link to="/admin/operations?view=distribution">Distribution Oversight</Link>
                    </div>
                  </div>
                  <div className="nav-dropdown">
                    <span className={`nav-dropdown-trigger ${isActive('/admin/inventory') ? 'active' : ''}`}>Inventory <i className='bx bx-chevron-down'></i></span>
                    <div className="nav-dropdown-content">
                      <Link to="/admin/inventory?view=overview">Global Overview</Link>
                      <Link to="/admin/inventory?view=hair">Hair Stock</Link>
                      <Link to="/admin/inventory?view=wigs">Wig Stock</Link>
                      <Link to="/admin/inventory?view=donations">Donation Records</Link>
                    </div>
                  </div>
                  <div className="nav-dropdown">
                    <span className={`nav-dropdown-trigger ${isActive('/admin/users') ? 'active' : ''}`}>Users <i className='bx bx-chevron-down'></i></span>
                    <div className="nav-dropdown-content">
                      <Link to="/admin/users?role=all">All Users</Link>
                      <Link to="/admin/users?role=donor">Donors</Link>
                      <Link to="/admin/users?role=recipient">Recipients</Link>
                      <Link to="/admin/users?role=staff">Staff Accounts</Link>
                      <Link to="/admin/users?role=wigmaker">Wigmakers</Link>
                    </div>
                  </div>
                  <div className="nav-dropdown">
                    <span className={`nav-dropdown-trigger ${isActive('/admin/reports') || isActive('/admin/cms') || isActive('/admin/events') ? 'active' : ''}`}>System <i className='bx bx-chevron-down'></i></span>
                    <div className="nav-dropdown-content">
                      <Link to="/admin/cms">Content (CMS)</Link>
                      <Link to="/admin/events">Events Schedule</Link>
                      <Link to="/admin/reports?type=full">System Reports</Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="dash-links-right">
              {['donor', 'recipient', 'staff', 'wigmaker', 'admin'].includes(role || '') && (
                <Link to={`/${role}/profile`} className={isActive(`/${role}/profile`) ? 'active' : ''}>Profile</Link>
              )}
              {['donor', 'recipient'].includes(role || '') && <NotificationBell />}
              <a href="#" className="logout-btn" onClick={handleLogout}>Logout</a>
            </div>
          </div>
        </nav>
      </header>

      <main className="dash-main">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
