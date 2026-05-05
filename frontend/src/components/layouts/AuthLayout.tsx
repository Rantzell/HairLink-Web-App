import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="auth-container-root">
      <header className="site-header">
        <nav className="navbar">
          <Link className="brand" to="/" aria-label="HairLink home">
            <img src="/assets/images/landing/pink-ribbon.png" alt="Pink ribbon icon" className="brand-ribbon" />
            <span>HairLink</span>
          </Link>

          <div className="menu">
            <Link to="/">Home</Link>
            <Link to="/#services">How It Works</Link>
            <Link to="/#about">About</Link>
            <Link to="/#partners">Partnership</Link>
            <Link to="/#contact">Contact</Link>
            <div className="auth-actions">
              <Link to="/login" className={`btn btn-outline ${isActive('/login') ? 'active' : ''}`}>Login</Link>
              <Link to="/register" className={`btn btn-primary ${isActive('/register') ? 'active' : ''}`}>Register</Link>
            </div>
          </div>
        </nav>
      </header>

      {children}
    </div>
  );
};

export default AuthLayout;
