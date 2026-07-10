import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from '../NotificationBell';
import ConfirmModal from '../ConfirmModal';
import apiClient from '../../api/client';
import '../../styles/StaffDashboard.css';
import '../../styles/RecipientDashboard.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [_staffStats, setStaffStats] = useState({ pendingDonations: 0, pendingRequests: 0 });

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoggingOut(false);
      setIsLogoutModalOpen(false);
    }
  };

  const renderLogoutModal = () => (
    <ConfirmModal
      isOpen={isLogoutModalOpen}
      onClose={() => setIsLogoutModalOpen(false)}
      onConfirm={confirmLogout}
      title="Log Out"
      message="Are you sure you want to log out of your account?"
      confirmText="Log Out"
      cancelText="Cancel"
      variant="danger"
      isConfirming={isLoggingOut}
    />
  );

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const role = user?.role;

  useEffect(() => {
    if (role !== 'staff') return;
    const fetchStaffStats = async () => {
      try {
        const res = await apiClient.get('/internal-api/staff/dashboard');
        setStaffStats({
          pendingDonations: res.data.pendingDonations || 0,
          pendingRequests: res.data.pendingRequests || 0
        });
      } catch (err) {
        console.error('Failed to fetch staff stats for topbar', err);
      }
    };
    fetchStaffStats();
  }, [role]);

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

  if (role === 'staff') {
    const initials = user
      ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'ST'
      : 'ST';

    const displayName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      : 'Staff';

    const NAV_SECTIONS = [
      {
        label: 'Overview',
        items: [
          { icon: 'bx bxs-dashboard',   label: 'Dashboard',           to: '/staff/dashboard' },
        ],
      },
      {
        label: 'Verification',
        items: [
          { icon: 'bx bx-donate-heart', label: 'Donation Verification',  to: '/staff/verification/donor' },
          { icon: 'bx bx-user-check',   label: 'Request Verification',   to: '/staff/verification/recipient' },
          { icon: 'bx bx-money',        label: 'Monetary Verification',  to: '/staff/verification/monetary' },
        ],
      },
      {
        label: 'Production & Stock',
        items: [
          { icon: 'bx bx-radar',        label: 'Wigmaker Tracking',          to: '/staff/tracking/wigmaker' },
          { icon: 'bx bx-package',      label: 'Donation Trackers',          to: '/staff/tracking/donation' },
          { icon: 'bx bx-layer',        label: 'Hair Batch Tracking',        to: '/staff/tracking/batch-donation' },
          { icon: 'bx bx-transfer-alt', label: 'Request Trackers',           to: '/staff/tracking/recipient' },
          { icon: 'bx bx-cut',          label: 'Hair Stock',             to: '/staff/hair-stock' },
          { icon: 'bx bxs-crown',       label: 'Wig Stock',              to: '/staff/wig-stock' },
        ],
      },
      {
        label: 'Matching',
        items: [
          { icon: 'bx bx-link',         label: 'Recipient Matching',     to: '/staff/matching' },
        ],
      },
      {
        label: 'Reports',
        items: [
          { icon: 'bx bx-bar-chart-alt-2', label: 'System Reports',      to: '/staff/reports' },
        ],
      },
    ];

    const getTopbarTitle = () => {
      if (location.pathname.startsWith('/staff/dashboard')) return 'Staff Operations Workspace';
      if (location.pathname.startsWith('/staff/verification/donor')) return 'Donation Verification Desk';
      if (location.pathname.startsWith('/staff/verification/recipient')) return 'Request Verification Desk';
      if (location.pathname.startsWith('/staff/verification/monetary')) return 'Monetary Verification Desk';
      if (location.pathname.startsWith('/staff/tracking/wigmaker')) return 'Wigmaker Production Trackers';
      if (location.pathname.startsWith('/staff/tracking/batch-donation')) return 'Hair Batch Donation Tracking';
      if (location.pathname.startsWith('/staff/tracking/donation')) return 'Donation Trackers';
      if (location.pathname.startsWith('/staff/tracking/recipient')) return 'Request Trackers';
      if (location.pathname.startsWith('/staff/hair-stock')) return 'Hair Stock Inventory';
      if (location.pathname.startsWith('/staff/wig-stock')) return 'Wig Stock Inventory';
      if (location.pathname.startsWith('/staff/matching')) return 'Recipient Matching Desk';
      if (location.pathname.startsWith('/staff/reports')) return 'System Reports';
      if (location.pathname.startsWith('/staff/profile')) return 'My Staff Profile';
      return 'Staff Workspace';
    };

    const isActiveItem = (path: string) => {
      if (path === '/staff/dashboard') return location.pathname === '/staff/dashboard';
      return location.pathname.startsWith(path);
    };

    return (
      <div className="sd-shell">
        {}
        <aside className={`sd-sidebar${sidebarOpen ? ' open' : ''}`}>
          {/* Brand */}
          <Link to="/staff/dashboard" className="sd-sidebar-brand" onClick={() => setSidebarOpen(false)}>
            <img src="/assets/images/landing/pink-ribbon.png" alt="HairLink" />
            <span>Hair<em>Link</em></span>
          </Link>

          {/* Navigation */}
          <nav className="sd-nav" aria-label="Staff navigation">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label} className="sd-nav-section">
                <p className="sd-nav-label">{section.label}</p>
                {section.items.map((item) => (
                  <Link
                    key={item.to + item.label}
                    to={item.to}
                    className={`sd-nav-item${isActiveItem(item.to) ? ' active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <i className={item.icon} />
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          {/* Sidebar footer — profile + logout */}
          <div className="sd-sidebar-footer">
            <div className="sd-sidebar-user">
              <Link to="/staff/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', textDecoration: 'none', color: 'inherit', flex: 1, overflow: 'hidden' }}>
                <div className="sd-sidebar-avatar">{initials}</div>
                <div className="sd-sidebar-userinfo">
                  <div className="sd-sidebar-username">{displayName}</div>
                  <div className="sd-sidebar-role">Staff</div>
                </div>
              </Link>
              <a href="#" onClick={handleLogout} title="Logout" style={{ color: '#B0ABC0', fontSize: '1.1rem', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                <i className="bx bx-log-out" />
              </a>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        <div
          className={`sd-sidebar-overlay${sidebarOpen ? ' open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {}
        <div className="sd-main">
          {/* Top header */}
          <header className="sd-topbar">
            <div className="sd-topbar-left">
              {/* Hamburger (mobile) */}
              <button
                className="sd-burger"
                type="button"
                aria-label="Open menu"
                onClick={() => setSidebarOpen(true)}
              >
                <i className="bx bx-menu" />
              </button>

              <span className="sd-topbar-title">{getTopbarTitle()}</span>

            </div>

            <div className="sd-topbar-right">
              {/* Notifications */}
              <NotificationBell />

              {/* Profile */}
              <Link to="/staff/profile" className="sd-topbar-avatar" title="My Profile">
                {initials}
              </Link>
            </div>
          </header>

          {}
          <main className="sd-content">
            {children}
          </main>
        </div>
        {renderLogoutModal()}
      </div>
    );
  }

  if (role === 'admin') {
    const initials = user
      ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'AD'
      : 'AD';

    const displayName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      : 'Admin';

    const NAV_SECTIONS = [
      {
        label: 'Overview',
        items: [
          { icon: 'bx bxs-dashboard',   label: 'Dashboard',           to: '/admin/dashboard' },
        ],
      },
      {
        label: 'Verification & Matching',
        items: [
          { icon: 'bx bx-donate-heart', label: 'Verify Donations',    to: '/admin/verification?view=donor' },
          { icon: 'bx bx-user-check',   label: 'Verify Requests',     to: '/admin/verification?view=recipient' },
          { icon: 'bx bx-link',         label: 'Recipient Matching',  to: '/admin/matching' },
        ],
      },
      {
        label: 'Oversight & Inventory',
        items: [
          { icon: 'bx bx-map-pin',      label: 'Distribution Oversight', to: '/admin/operations?view=distribution' },
          { icon: 'bx bx-package',      label: 'Global Overview',     to: '/admin/inventory?view=overview' },
          { icon: 'bx bx-cut',          label: 'Hair Stock',          to: '/admin/inventory?view=hair' },
          { icon: 'bx bxs-crown',       label: 'Wig Stock',           to: '/admin/inventory?view=wigs' },
          { icon: 'bx bx-history',      label: 'Donation Records',    to: '/admin/inventory?view=donations' },
        ],
      },
      {
        label: 'Users',
        items: [
          { icon: 'bx bx-group',        label: 'All Users',           to: '/admin/users?role=all' },
          { icon: 'bx bx-heart',        label: 'Donors',              to: '/admin/users?role=donor' },
          { icon: 'bx bx-smile',        label: 'Recipients',          to: '/admin/users?role=recipient' },
          { icon: 'bx bx-shield',       label: 'Staff Accounts',      to: '/admin/users?role=staff' },
          { icon: 'bx bx-wrench',       label: 'Wigmakers',           to: '/admin/users?role=wigmaker' },
        ],
      },
      {
        label: 'System',
        items: [
          { icon: 'bx bx-file',         label: 'Content (CMS)',       to: '/admin/cms' },
          { icon: 'bx bx-calendar',     label: 'Events Schedule',     to: '/admin/events' },
          { icon: 'bx bx-bar-chart-alt-2', label: 'System Reports',   to: '/admin/reports?type=donations' },
          { icon: 'bx bx-history',      label: 'Audit Logs',          to: '/admin/audit-logs' },
        ],
      },
    ];

    const getTopbarTitle = () => {
      const search = location.search;
      if (location.pathname.startsWith('/admin/dashboard')) return 'Admin Dashboard';
      if (location.pathname.startsWith('/admin/verification')) {
        if (search.includes('view=donor')) return 'Verify Hair Donations';
        if (search.includes('view=recipient')) return 'Verify Recipient Requests';
        return 'Verification Center';
      }
      if (location.pathname.startsWith('/admin/matching')) return 'Recipient Matching Oversight';
      if (location.pathname.startsWith('/admin/operations')) {
        if (search.includes('view=distribution')) return 'Distribution Oversight';
        return 'Operations Center';
      }
      if (location.pathname.startsWith('/admin/inventory')) {
        if (search.includes('view=overview')) return 'Global Inventory Overview';
        if (search.includes('view=hair')) return 'Hair Stock';
        if (search.includes('view=wigs')) return 'Wig Stock';
        if (search.includes('view=donations')) return 'Donation Records';
        return 'Inventory Management';
      }
      if (location.pathname.startsWith('/admin/audit-logs')) return 'Audit Logs';
      if (location.pathname.startsWith('/admin/users')) return 'User Account Management';
      if (location.pathname.startsWith('/admin/cms')) return 'Content Management System';
      if (location.pathname.startsWith('/admin/events')) return 'Events Scheduling Panel';
      if (location.pathname.startsWith('/admin/reports')) return 'System Reports & Analytics';
      if (location.pathname.startsWith('/admin/profile')) return 'My Admin Profile';
      return 'System Administrator Workspace';
    };

    const isActiveItem = (toPath: string) => {
      const toUrl = new URL(toPath, window.location.origin);
      if (location.pathname !== toUrl.pathname) return false;
      if (toUrl.search) {
        return location.search.includes(toUrl.search.substring(1));
      }
      return !location.search || toUrl.pathname === '/admin/dashboard';
    };

    return (
      <div className="sd-shell">
        {}
        <aside className={`sd-sidebar${sidebarOpen ? ' open' : ''}`}>
          {/* Brand */}
          <Link to="/admin/dashboard" className="sd-sidebar-brand" onClick={() => setSidebarOpen(false)}>
            <img src="/assets/images/landing/pink-ribbon.png" alt="HairLink" />
            <span>Hair<em>Link</em></span>
          </Link>

          {/* Navigation */}
          <nav className="sd-nav" aria-label="Admin navigation">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label} className="sd-nav-section">
                <p className="sd-nav-label">{section.label}</p>
                {section.items.map((item) => (
                  <Link
                    key={item.to + item.label}
                    to={item.to}
                    className={`sd-nav-item${isActiveItem(item.to) ? ' active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <i className={item.icon} />
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          {/* Sidebar footer — profile + logout */}
          <div className="sd-sidebar-footer">
            <div className="sd-sidebar-user">
              <Link to="/admin/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', textDecoration: 'none', color: 'inherit', flex: 1, overflow: 'hidden' }}>
                <div className="sd-sidebar-avatar">{initials}</div>
                <div className="sd-sidebar-userinfo">
                  <div className="sd-sidebar-username">{displayName}</div>
                  <div className="sd-sidebar-role">Admin</div>
                </div>
              </Link>
              <a href="#" onClick={handleLogout} title="Logout" style={{ color: '#B0ABC0', fontSize: '1.1rem', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                <i className="bx bx-log-out" />
              </a>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        <div
          className={`sd-sidebar-overlay${sidebarOpen ? ' open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {}
        <div className="sd-main">
          {/* Top header */}
          <header className="sd-topbar">
            <div className="sd-topbar-left">
              {/* Hamburger (mobile) */}
              <button
                className="sd-burger"
                type="button"
                aria-label="Open menu"
                onClick={() => setSidebarOpen(true)}
              >
                <i className="bx bx-menu" />
              </button>

              <span className="sd-topbar-title">{getTopbarTitle()}</span>
            </div>

            <div className="sd-topbar-right">
              {/* Notifications */}
              <NotificationBell />

              {/* Profile */}
              <Link to="/admin/profile" className="sd-topbar-avatar" title="My Profile">
                {initials}
              </Link>
            </div>
          </header>

          {}
          <main className="sd-content">
            {children}
          </main>
        </div>
        {renderLogoutModal()}
      </div>
    );
  }

  if (role === 'wigmaker') {
    const initials = user
      ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'WM'
      : 'WM';

    const displayName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      : 'Wigmaker';

    const NAV_SECTIONS = [
      {
        label: 'Overview',
        items: [
          { icon: 'bx bxs-dashboard',   label: 'Dashboard',           to: '/wigmaker/dashboard' },
        ],
      },
      {
        label: 'Production & Tasks',
        items: [
          { icon: 'bx bx-layer',        label: 'Hair Batch Tracking',   to: '/wigmaker/hair-batch-tracking' },
          { icon: 'bx bxs-crown',       label: 'Wig Inventory',         to: '/wigmaker/wig-inventory' },
        ],
      },
    ];

    const getTopbarTitle = () => {
      if (location.pathname.startsWith('/wigmaker/dashboard')) return 'Wigmaker Workspace';
      if (location.pathname.startsWith('/wigmaker/hair-batch-tracking')) return 'Hair Batch Tracking';

      if (location.pathname.startsWith('/wigmaker/wig-inventory')) return 'Wig Inventory';
      if (location.pathname.startsWith('/wigmaker/task/')) return 'Task Details & Progress';
      if (location.pathname.startsWith('/wigmaker/profile')) return 'My Profile';
      return 'Wigmaker Panel';
    };

    const isActiveItem = (path: string) => {
      if (path === '/wigmaker/dashboard') return location.pathname === '/wigmaker/dashboard';
      return location.pathname.startsWith(path);
    };

    return (
      <div className="sd-shell">
        {}
        <aside className={`sd-sidebar${sidebarOpen ? ' open' : ''}`}>
          {/* Brand */}
          <Link to="/wigmaker/dashboard" className="sd-sidebar-brand" onClick={() => setSidebarOpen(false)}>
            <img src="/assets/images/landing/pink-ribbon.png" alt="HairLink" />
            <span>Hair<em>Link</em></span>
          </Link>

          {/* Navigation */}
          <nav className="sd-nav" aria-label="Wigmaker navigation">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label} className="sd-nav-section">
                <p className="sd-nav-label">{section.label}</p>
                {section.items.map((item) => (
                  <Link
                    key={item.to + item.label}
                    to={item.to}
                    className={`sd-nav-item${isActiveItem(item.to) ? ' active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <i className={item.icon} />
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          {/* Sidebar footer — profile + logout */}
          <div className="sd-sidebar-footer">
            <div className="sd-sidebar-user">
              <Link to="/wigmaker/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', textDecoration: 'none', color: 'inherit', flex: 1, overflow: 'hidden' }}>
                <div className="sd-sidebar-avatar">{initials}</div>
                <div className="sd-sidebar-userinfo">
                  <div className="sd-sidebar-username">{displayName}</div>
                  <div className="sd-sidebar-role">Wigmaker</div>
                </div>
              </Link>
              <a href="#" onClick={handleLogout} title="Logout" style={{ color: '#B0ABC0', fontSize: '1.1rem', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                <i className="bx bx-log-out" />
              </a>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        <div
          className={`sd-sidebar-overlay${sidebarOpen ? ' open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {}
        <div className="sd-main">
          {/* Top header */}
          <header className="sd-topbar">
            <div className="sd-topbar-left">
              {/* Hamburger (mobile) */}
              <button
                className="sd-burger"
                type="button"
                aria-label="Open menu"
                onClick={() => setSidebarOpen(true)}
              >
                <i className="bx bx-menu" />
              </button>

              <span className="sd-topbar-title">{getTopbarTitle()}</span>
            </div>

            <div className="sd-topbar-right">
              {/* Notifications */}
              <NotificationBell />

              {/* Profile */}
              <Link to="/wigmaker/profile" className="sd-topbar-avatar" title="My Profile">
                {initials}
              </Link>
            </div>
          </header>

          {}
          <main className="sd-content">
            {children}
          </main>
        </div>
        {renderLogoutModal()}
      </div>
    );
  }

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
            <img src="/assets/images/landing/pink-ribbon.png" alt="HairLink" />
            <span>Hair<em>Link</em></span>
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
                  <Link to="/donor/dashboard" className={isActive('/donor/dashboard') ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Overview</Link>
                  <Link to="/donor/donate" className={isActive('/donor/donate') ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Donate Hair</Link>
                  <Link to="/donor/tracking" className={isActive('/donor/tracking') ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Tracking</Link>
                  <Link to="/donor/certificate" className={isActive('/donor/certificate') ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Certificate</Link>
                </>
              )}

              {role === 'recipient' && (
                <>
                  <Link to="/recipient/dashboard" className={isActive('/recipient/dashboard') ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Overview</Link>
                  <Link to="/recipient/request" className={isActive('/recipient/request') ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Request Hair</Link>
                  <Link to="/recipient/tracking" className={isActive('/recipient/tracking') ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Tracking</Link>
                </>
              )}

              {(role as string) === 'wigmaker' && (
                <>
                  <Link to="/wigmaker/dashboard" className={isActive('/wigmaker/dashboard') ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Overview</Link>
                  <Link to="/wigmaker/hair-batch-tracking" className={isActive('/wigmaker/hair-batch-tracking') ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Hair Batch Tracking</Link>
                  <Link to="/wigmaker/wig-inventory" className={isActive('/wigmaker/wig-inventory') ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Wig Inventory</Link>
                </>
              )}

              {(role as string) === 'staff' && (
                <>
                  <Link to="/staff/dashboard" className={isActive('/staff/dashboard') ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Overview</Link>
                  <Link to="/staff/verification/donor" className={location.pathname === '/staff/verification/donor' ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Donation</Link>
                  <Link to="/staff/verification/recipient" className={location.pathname === '/staff/verification/recipient' ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Request</Link>
                  <Link to="/staff/verification/monetary" className={location.pathname === '/staff/verification/monetary' ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Monetary</Link>
                  <div className="nav-dropdown">
                    <span className={`nav-dropdown-trigger ${location.pathname.includes('/staff/tracking') ? 'active' : ''}`}>Tracking <i className='bx bx-chevron-down'></i></span>
                    <div className="nav-dropdown-content">
                      <Link to="/staff/tracking/donation" onClick={() => setIsMenuOpen(false)}>Donation Trackers</Link>
                      <Link to="/staff/tracking/recipient" onClick={() => setIsMenuOpen(false)}>Request Trackers</Link>
                    </div>
                  </div>
                  <Link to="/staff/wig-stock" className={isActive('/staff/wig-stock') ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Wigs</Link>
                  <Link to="/staff/hair-stock" className={isActive('/staff/hair-stock') ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Hair</Link>
                  <Link to="/staff/matching" className={isActive('/staff/matching') ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Matching</Link>
                </>
              )}

              {(role as string) === 'admin' && (
                <>
                  <Link to="/admin/dashboard" className={isActive('/admin/dashboard') ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Overview</Link>
                  <div className="nav-dropdown">
                    <span className={`nav-dropdown-trigger ${isActive('/admin/verification') ? 'active' : ''}`}>Verify <i className='bx bx-chevron-down'></i></span>
                    <div className="nav-dropdown-content">
                      <Link to="/admin/verification?view=donor" onClick={() => setIsMenuOpen(false)}>Hair Donations</Link>
                      <Link to="/admin/verification?view=recipient" onClick={() => setIsMenuOpen(false)}>Recipient Requests</Link>
                    </div>
                  </div>
                  <Link to="/admin/matching" className={isActive('/admin/matching') ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Matching</Link>
                  <Link to="/admin/operations?view=distribution" className={isActive('/admin/operations') ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Distribution</Link>
                  <div className="nav-dropdown">
                    <span className={`nav-dropdown-trigger ${isActive('/admin/inventory') ? 'active' : ''}`}>Inventory <i className='bx bx-chevron-down'></i></span>
                    <div className="nav-dropdown-content">
                      <Link to="/admin/inventory?view=overview" onClick={() => setIsMenuOpen(false)}>Global Overview</Link>
                      <Link to="/admin/inventory?view=hair" onClick={() => setIsMenuOpen(false)}>Hair Stock</Link>
                      <Link to="/admin/inventory?view=wigs" onClick={() => setIsMenuOpen(false)}>Wig Stock</Link>
                      <Link to="/admin/inventory?view=donations" onClick={() => setIsMenuOpen(false)}>Donation Records</Link>
                    </div>
                  </div>
                  <div className="nav-dropdown">
                    <span className={`nav-dropdown-trigger ${isActive('/admin/users') ? 'active' : ''}`}>Users <i className='bx bx-chevron-down'></i></span>
                    <div className="nav-dropdown-content">
                      <Link to="/admin/users?role=all" onClick={() => setIsMenuOpen(false)}>All Users</Link>
                      <Link to="/admin/users?role=donor" onClick={() => setIsMenuOpen(false)}>Donors</Link>
                      <Link to="/admin/users?role=recipient" onClick={() => setIsMenuOpen(false)}>Recipients</Link>
                      <Link to="/admin/users?role=staff" onClick={() => setIsMenuOpen(false)}>Staff Accounts</Link>
                      <Link to="/admin/users?role=wigmaker" onClick={() => setIsMenuOpen(false)}>Wigmakers</Link>
                    </div>
                  </div>
                  <div className="nav-dropdown">
                    <span className={`nav-dropdown-trigger ${isActive('/admin/reports') || isActive('/admin/cms') || isActive('/admin/events') ? 'active' : ''}`}>System <i className='bx bx-chevron-down'></i></span>
                    <div className="nav-dropdown-content">
                      <Link to="/admin/cms" onClick={() => setIsMenuOpen(false)}>Content (CMS)</Link>
                      <Link to="/admin/events" onClick={() => setIsMenuOpen(false)}>Events Schedule</Link>
                      <Link to="/admin/reports?type=donations" onClick={() => setIsMenuOpen(false)}>System Reports</Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="dash-links-right">
              {['donor', 'recipient', 'staff', 'wigmaker', 'admin'].includes(role || '') && (
                <Link to={`/${role}/profile`} className={isActive(`/${role}/profile`) ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>Profile</Link>
              )}
              {['donor', 'recipient'].includes(role || '') && <NotificationBell />}
              <a href="#" className="logout-btn" onClick={(e) => { setIsMenuOpen(false); handleLogout(e); }}>Logout</a>
            </div>
          </div>
        </nav>
      </header>

      <main className="dash-main">
        {children}
      </main>
      {renderLogoutModal()}
    </div>
  );
};

export default DashboardLayout;
