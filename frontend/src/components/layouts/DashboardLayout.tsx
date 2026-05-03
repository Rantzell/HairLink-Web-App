import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

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

  return (
    <div className="dash-container">
      <header className="dash-header">
        <nav className="dash-nav" aria-label="Dashboard navigation">
          <Link className="dash-brand" to="/" aria-label="HairLink home">
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
            <Link to="/" className={isActive('/') && location.pathname === '/' ? 'active' : ''}>Home</Link>

            {role === 'donor' && (
              <>
                <Link to="/donor/dashboard" className={isActive('/donor/dashboard') ? 'active' : ''}>Overview</Link>
                <Link to="/donor/donate" className={isActive('/donor/donate') ? 'active' : ''}>Donate Hair</Link>
                <Link to="/donor/tracking" className={isActive('/donor/tracking') ? 'active' : ''}>Tracking</Link>
                 <Link to="/donor/certificate" className={isActive('/donor/certificate') ? 'active' : ''}>Certificate</Link>
                 <Link to="/donor/profile" className={isActive('/donor/profile') ? 'active' : ''}>Profile</Link>
              </>
            )}

            {role === 'recipient' && (
              <>
                <Link to="/recipient/dashboard" className={isActive('/recipient/dashboard') ? 'active' : ''}>Overview</Link>
                <Link to="/recipient/request" className={isActive('/recipient/request') ? 'active' : ''}>Request Hair</Link>
                 <Link to="/recipient/tracking" className={isActive('/recipient/tracking') ? 'active' : ''}>Tracking</Link>
                 <Link to="/recipient/profile" className={isActive('/recipient/profile') ? 'active' : ''}>Profile</Link>
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
                <Link to="/staff/verification/donor" className={location.pathname === '/staff/verification/donor' ? 'active' : ''}>Donor</Link>
                <Link to="/staff/verification/recipient" className={location.pathname === '/staff/verification/recipient' ? 'active' : ''}>Recipient</Link>
                <Link to="/staff/verification/monetary" className={location.pathname === '/staff/verification/monetary' ? 'active' : ''}>Monetary</Link>
                <Link to="/staff/tracking" className={isActive('/staff/tracking') ? 'active' : ''}>Tracking</Link>
                <Link to="/staff/wig-stock" className={isActive('/staff/wig-stock') ? 'active' : ''}>Wigs</Link>
                <Link to="/staff/hair-stock" className={isActive('/staff/hair-stock') ? 'active' : ''}>Hair</Link>
                <Link to="/staff/matching" className={isActive('/staff/matching') ? 'active' : ''}>Matching</Link>
              </>
            )}

            {role === 'admin' && (
              <>
                <Link to="/admin/dashboard" className={isActive('/admin/dashboard') ? 'active' : ''}>Overview</Link>
                <Link to="/admin/verification/donor" className={isActive('/admin/verification') ? 'active' : ''}>Verify</Link>
                <Link to="/admin/matching" className={isActive('/admin/matching') ? 'active' : ''}>Matching</Link>
                <Link to="/admin/operations" className={isActive('/admin/operations') ? 'active' : ''}>Ops</Link>
                <Link to="/admin/inventory" className={isActive('/admin/inventory') ? 'active' : ''}>Inventory</Link>
                <Link to="/admin/users" className={isActive('/admin/users') ? 'active' : ''}>Users</Link>
                <Link to="/admin/reports" className={isActive('/admin/reports') ? 'active' : ''}>Reports</Link>
              </>
            )}

            <a href="#" className="logout-btn" onClick={handleLogout}>Logout</a>
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
