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
      <header className="auth-navbar">
        <nav className="auth-navbar-inner" aria-label="Auth navigation">
          <Link className="auth-brand" to="/" aria-label="HairLink home">
            <img src="/assets/images/landing/pink-ribbon.png" alt="Pink ribbon icon" />
            <span>HairLink</span>
          </Link>

          <div className="auth-nav-links">
            <Link to="/">Home</Link>
            <Link to="/login" className={isActive('/login') ? 'active' : ''}>Login</Link>
            <Link to="/register" className={isActive('/register') ? 'active' : ''}>Register</Link>
          </div>
        </nav>
      </header>

      {children}
    </div>
  );
};

export default AuthLayout;
